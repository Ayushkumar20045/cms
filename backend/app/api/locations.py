"""Campus locations (zone -> building -> floor -> room) and service departments.

Read endpoints serve the location picker on the request form and are open to every signed-in user.
Admin endpoints maintain the data until the GBU GIS layers are imported.
"""
import json
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.authorization.deps import CurrentUser, require_permission
from app.authorization.scope import visible_complaints_clause
from app.db import get_db
from app.models import Building, BuildingType, Campus, Complaint, Department, Floor, Hostel, Room, Zone
from app.schemas import (BuildingDetail, BuildingIn, BuildingOut, BuildingSummary, BuildingUpdateIn, CampusMap, DepartmentIn,
                         DepartmentOut, DepartmentUpdateIn, Envelope, FloorIn, FloorOut, GisImportReport, MapBuilding, RoomIn, RoomOut,
                         RoomUpdateIn, ZoneIn, ZoneOut, ZoneUpdateIn)
from app.serializers import building_out, complaint_summary, hostel_brief
from app.services.audit import audit
from app.services.gis_import import CAMPUS_CODE, GisImportError, import_geojson
from app.services.workflow import IN_PROGRESS_GROUP, OPEN, PENDING, RESOLVED_SET

router = APIRouter(prefix='/api/v1', tags=['locations'])

GIS_MAX_BYTES = 5 * 1024 * 1024


def _hostels_by_building(db: Session) -> dict[int, Hostel]:
    return {h.building_id: h for h in db.scalars(select(Hostel).where(Hostel.building_id.is_not(None)))}


def _building_detail(db: Session, b: Building, active_only: bool) -> BuildingDetail:
    hostel = db.scalar(select(Hostel).where(Hostel.building_id == b.id))
    floors = db.scalars(select(Floor).where(Floor.building_id == b.id).options(selectinload(Floor.rooms)).order_by(Floor.level)).all()
    return BuildingDetail(**building_out(b, hostel).model_dump(), floors=[
        FloorOut(id=f.id, level=f.level, name=f.name,
                 rooms=[RoomOut.model_validate(r) for r in f.rooms if r.is_active or not active_only]) for f in floors])


def _get(db: Session, model, id_: int, label: str):
    row = db.get(model, id_)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f'{label} not found')
    return row


def _unique(db: Session, model, code: str | None, name: str | None, label: str, exclude_id: int | None = None):
    conds = []
    if code is not None:
        conds.append(func.lower(model.code) == code.lower())
    if name is not None:
        conds.append(func.lower(model.name) == name.lower())
    stmt = select(model.id).where(or_(*conds))
    if exclude_id is not None:
        stmt = stmt.where(model.id != exclude_id)
    if conds and db.scalar(stmt):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=f'A {label} with that code or name already exists')


def _zone_ok(db: Session, zone_id: int | None):
    if zone_id is not None and db.get(Zone, zone_id) is None:
        raise HTTPException(422, detail=[{'field': 'zoneId', 'message': 'Unknown zone'}])


def _floor_name(level: int) -> str:
    if level == 0:
        return 'Ground Floor'
    if level < 0:
        return f'Basement {-level}'
    suffix = 'th' if 10 <= level % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(level % 10, 'th')
    return f'{level}{suffix} Floor'


# ================================================================ read (every signed-in user)

@router.get('/locations/zones', response_model=Envelope[list[ZoneOut]])
def list_zones(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('LOCATION_VIEW'))):
    return Envelope(data=db.scalars(select(Zone).where(Zone.is_active.is_(True)).order_by(Zone.name)).all())


@router.get('/locations/buildings', response_model=Envelope[list[BuildingOut]])
def list_buildings(zone_id: int | None = Query(None, alias='zoneId'), building_type: BuildingType | None = Query(None, alias='type'),
                   search: str | None = Query(None, max_length=100), db: Session = Depends(get_db),
                   _: CurrentUser = Depends(require_permission('LOCATION_VIEW'))):
    stmt = select(Building).where(Building.is_active.is_(True))
    if zone_id:
        stmt = stmt.where(Building.zone_id == zone_id)
    if building_type:
        stmt = stmt.where(Building.building_type == building_type)
    if search:
        like = f'%{search.strip()}%'
        stmt = stmt.where(or_(Building.name.ilike(like), Building.code.ilike(like)))
    hostels = _hostels_by_building(db)
    return Envelope(data=[building_out(b, hostels.get(b.id)) for b in db.scalars(stmt.order_by(Building.name))])


@router.get('/locations/buildings/{building_id}', response_model=Envelope[BuildingDetail])
def get_building(building_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('LOCATION_VIEW'))):
    b = db.get(Building, building_id)
    if b is None or not b.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Building not found')
    return Envelope(data=_building_detail(db, b, active_only=True))


@router.get('/departments', response_model=Envelope[list[DepartmentOut]])
def list_departments(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('DEPARTMENT_VIEW'))):
    return Envelope(data=db.scalars(select(Department).where(Department.is_active.is_(True)).order_by(Department.name)).all())


# ================================================================ admin: departments

@router.get('/admin/departments', response_model=Envelope[list[DepartmentOut]])
def admin_departments(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('DEPARTMENT_MANAGE'))):
    return Envelope(data=db.scalars(select(Department).order_by(Department.name)).all())


@router.post('/admin/departments', response_model=Envelope[DepartmentOut], status_code=201)
def create_department(body: DepartmentIn, request: Request, db: Session = Depends(get_db),
                      current: CurrentUser = Depends(require_permission('DEPARTMENT_MANAGE'))):
    _unique(db, Department, body.code, body.name, 'department')
    d = Department(**body.model_dump())
    db.add(d)
    db.flush()
    audit(db, request, current.id, 'DEPARTMENT_CREATED', 'department', d.id, new_value=body.model_dump())
    db.commit()
    return Envelope(data=d, message='Department created')


@router.patch('/admin/departments/{department_id}', response_model=Envelope[DepartmentOut])
def update_department(department_id: int, body: DepartmentUpdateIn, request: Request, db: Session = Depends(get_db),
                      current: CurrentUser = Depends(require_permission('DEPARTMENT_MANAGE'))):
    d = _get(db, Department, department_id, 'Department')
    data = body.model_dump(exclude_unset=True)
    _unique(db, Department, None, data.get('name'), 'department', exclude_id=d.id)
    old = {k: getattr(d, k) for k in data}
    for k, v in data.items():
        setattr(d, k, v)
    audit(db, request, current.id, 'DEPARTMENT_UPDATED', 'department', d.id, old_value=old, new_value=data)
    db.commit()
    return Envelope(data=d, message='Department updated')


# ================================================================ admin: zones

@router.get('/admin/zones', response_model=Envelope[list[ZoneOut]])
def admin_zones(db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    return Envelope(data=db.scalars(select(Zone).order_by(Zone.name)).all())


@router.post('/admin/zones', response_model=Envelope[ZoneOut], status_code=201)
def create_zone(body: ZoneIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    _unique(db, Zone, body.code, body.name, 'zone')
    z = Zone(**body.model_dump())
    db.add(z)
    db.flush()
    audit(db, request, current.id, 'ZONE_CREATED', 'zone', z.id, new_value=body.model_dump())
    db.commit()
    return Envelope(data=z, message='Zone created')


@router.patch('/admin/zones/{zone_id}', response_model=Envelope[ZoneOut])
def update_zone(zone_id: int, body: ZoneUpdateIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    z = _get(db, Zone, zone_id, 'Zone')
    data = body.model_dump(exclude_unset=True)
    _unique(db, Zone, None, data.get('name'), 'zone', exclude_id=z.id)
    old = {k: getattr(z, k) for k in data}
    for k, v in data.items():
        setattr(z, k, v)
    audit(db, request, current.id, 'ZONE_UPDATED', 'zone', z.id, old_value=old, new_value=data)
    db.commit()
    return Envelope(data=z, message='Zone updated')


# ================================================================ admin: buildings, floors, rooms

@router.get('/admin/buildings/{building_id}', response_model=Envelope[BuildingDetail])
def admin_building(building_id: int, db: Session = Depends(get_db), _: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    """Includes inactive rooms, unlike the public view."""
    return Envelope(data=_building_detail(db, _get(db, Building, building_id, 'Building'), active_only=False))


@router.post('/admin/buildings', response_model=Envelope[BuildingDetail], status_code=201)
def create_building(body: BuildingIn, request: Request, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    if body.building_type == BuildingType.HOSTEL:
        raise HTTPException(422, detail=[{'field': 'buildingType', 'message': 'Create hostels from Hostel management; '
                                                                              'their building is added automatically'}])
    _unique(db, Building, body.code, body.name, 'building')
    _zone_ok(db, body.zone_id)
    b = Building(**body.model_dump())
    db.add(b)
    db.flush()
    audit(db, request, current.id, 'BUILDING_CREATED', 'building', b.id, new_value=body.model_dump(mode='json'))
    db.commit()
    return Envelope(data=_building_detail(db, b, active_only=False), message='Building created')


@router.patch('/admin/buildings/{building_id}', response_model=Envelope[BuildingDetail])
def update_building(building_id: int, body: BuildingUpdateIn, request: Request, db: Session = Depends(get_db),
                    current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    b = _get(db, Building, building_id, 'Building')
    data = body.model_dump(exclude_unset=True)
    is_hostel = db.scalar(select(Hostel.id).where(Hostel.building_id == b.id)) is not None
    if 'building_type' in data and (data['building_type'] == BuildingType.HOSTEL) != is_hostel:
        raise HTTPException(422, detail=[{'field': 'buildingType', 'message': 'Hostel buildings are managed from Hostel management'}])
    if is_hostel and 'name' in data:
        raise HTTPException(422, detail=[{'field': 'name', 'message': 'Rename a hostel from Hostel management'}])
    _unique(db, Building, None, data.get('name'), 'building', exclude_id=b.id)
    if 'zone_id' in data:
        _zone_ok(db, data['zone_id'])
    old = {k: getattr(b, k) for k in data}
    for k, v in data.items():
        setattr(b, k, v)
    audit(db, request, current.id, 'BUILDING_UPDATED', 'building', b.id,
          old_value={k: getattr(v, 'value', v) for k, v in old.items()}, new_value=body.model_dump(mode='json', exclude_unset=True))
    db.commit()
    return Envelope(data=_building_detail(db, b, active_only=False), message='Building updated')


@router.post('/admin/buildings/{building_id}/floors', response_model=Envelope[BuildingDetail], status_code=201)
def create_floor(building_id: int, body: FloorIn, request: Request, db: Session = Depends(get_db),
                 current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    b = _get(db, Building, building_id, 'Building')
    if db.scalar(select(Floor.id).where(Floor.building_id == b.id, Floor.level == body.level)):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='That floor already exists in this building')
    f = Floor(building_id=b.id, level=body.level, name=body.name or _floor_name(body.level))
    db.add(f)
    db.flush()
    audit(db, request, current.id, 'FLOOR_CREATED', 'building', b.id, new_value={'level': f.level, 'name': f.name})
    db.commit()
    return Envelope(data=_building_detail(db, b, active_only=False), message='Floor added')


@router.post('/admin/floors/{floor_id}/rooms', response_model=Envelope[RoomOut], status_code=201)
def create_room(floor_id: int, body: RoomIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    f = _get(db, Floor, floor_id, 'Floor')
    if db.scalar(select(Room.id).where(Room.floor_id == f.id, func.lower(Room.number) == body.number.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, detail='That room number already exists on this floor')
    r = Room(floor_id=f.id, **body.model_dump())
    db.add(r)
    db.flush()
    audit(db, request, current.id, 'ROOM_CREATED', 'room', r.id, new_value={'buildingId': f.building_id, **body.model_dump(mode='json')})
    db.commit()
    return Envelope(data=r, message='Room added')


@router.patch('/admin/rooms/{room_id}', response_model=Envelope[RoomOut])
def update_room(room_id: int, body: RoomUpdateIn, request: Request, db: Session = Depends(get_db),
                current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    r = _get(db, Room, room_id, 'Room')
    data = body.model_dump(exclude_unset=True)
    old = {k: getattr(getattr(r, k), 'value', getattr(r, k)) for k in data}
    for k, v in data.items():
        setattr(r, k, v)
    audit(db, request, current.id, 'ROOM_UPDATED', 'room', r.id, old_value=old, new_value=body.model_dump(mode='json', exclude_unset=True))
    db.commit()
    return Envelope(data=r, message='Room updated')


# ================================================================ private campus map

def _visible_requests(current: CurrentUser):
    stmt = select(Complaint)
    scope = visible_complaints_clause(current)
    return stmt.where(scope) if scope is not None else stmt


@router.get('/map', response_model=Envelope[CampusMap])
def campus_map(db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('LOCATION_VIEW'))):
    """Campus boundary and building footprints. Open-request counts only include requests the viewer may see."""
    campus = db.scalar(select(Campus).where(Campus.code == CAMPUS_CODE))
    boundary = json.loads(db.scalar(select(func.ST_AsGeoJSON(Campus.geom, 7)).where(Campus.id == campus.id))) if campus else None
    visible = _visible_requests(current).where(Complaint.status.in_(OPEN)).subquery()
    open_counts = dict(db.execute(select(visible.c.building_id, func.count()).group_by(visible.c.building_id)).all())
    rows = db.execute(select(Building, func.ST_AsGeoJSON(Building.geom, 7))
                      .where(Building.is_active.is_(True), Building.geom.is_not(None)).order_by(Building.name)).all()
    hostels = _hostels_by_building(db)
    buildings = [MapBuilding(id=b.id, code=b.code, name=b.name, building_type=b.building_type, hostel=hostel_brief(hostels.get(b.id)),
                             geometry=json.loads(g), open_requests=open_counts.get(b.id, 0)) for b, g in rows]
    extent = db.scalar(select(func.ST_Extent(Campus.geom)).where(Campus.code == CAMPUS_CODE)) if campus else None
    if extent is None and buildings:
        extent = db.scalar(select(func.ST_Extent(Building.geom)).where(Building.is_active.is_(True)))
    # ST_Extent returns 'BOX(minLng minLat,maxLng maxLat)'
    bounds = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', extent)] if extent else None
    return Envelope(data=CampusMap(name=campus.name if campus else None, boundary=boundary, bounds=bounds, buildings=buildings))


@router.get('/map/buildings/{building_id}', response_model=Envelope[BuildingSummary])
def building_summary(building_id: int, db: Session = Depends(get_db),
                     current: CurrentUser = Depends(require_permission('LOCATION_VIEW'))):
    b = db.get(Building, building_id)
    if b is None or not b.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='Building not found')
    here = _visible_requests(current).where(Complaint.building_id == b.id)
    sub = here.subquery()
    by_status = dict(db.execute(select(sub.c.status, func.count()).group_by(sub.c.status)).all())
    count = lambda group: sum(n for s, n in by_status.items() if s in group)  # noqa: E731
    recent = db.scalars(here.order_by(Complaint.created_at.desc()).limit(5)).unique().all()
    hostel = db.scalar(select(Hostel).where(Hostel.building_id == b.id))
    return Envelope(data=BuildingSummary(building=building_out(b, hostel), pending=count(PENDING), in_progress=count(IN_PROGRESS_GROUP),
                                         resolved=count(RESOLVED_SET), recent=[complaint_summary(c) for c in recent]))


@router.post('/admin/gis/import', response_model=Envelope[GisImportReport])
def gis_import(request: Request, file: UploadFile = File(...), dry_run: bool = Form(False, alias='dryRun'),
               db: Session = Depends(get_db), current: CurrentUser = Depends(require_permission('LOCATION_MANAGE'))):
    """Upload the campus GeoJSON (for example exported from geojson.io). Use dryRun to preview the changes."""
    raw = file.file.read(GIS_MAX_BYTES + 1)
    if len(raw) > GIS_MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail='The map file must be under 5 MB')
    try:
        data = json.loads(raw.decode('utf-8-sig'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(422, detail=[{'field': 'file', 'message': 'The file is not valid GeoJSON'}])
    try:
        report = import_geojson(db, data)
    except GisImportError as exc:
        db.rollback()
        raise HTTPException(422, detail=[{'field': 'file', 'message': str(exc)}])
    out = GisImportReport(dry_run=dry_run, boundary=report.boundary, created=report.created, updated=report.updated,
                          skipped=report.skipped, warnings=report.warnings)
    if dry_run:
        db.rollback()
    else:
        audit(db, request, current.id, 'GIS_IMPORTED', 'campus', CAMPUS_CODE,
              new_value={'file': file.filename, 'created': len(report.created), 'updated': len(report.updated),
                         'skipped': len(report.skipped)})
        db.commit()
    return Envelope(data=out, message='Preview only, nothing saved' if dry_run else 'Campus map imported')
