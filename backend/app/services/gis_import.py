"""Import the GBU campus map from GeoJSON (for example a file drawn on geojson.io).

* The campus boundary is the polygon with `type: BOUNDARY`, or otherwise the largest polygon when it is far
  larger than everything else.
* Every other named polygon is a building. Properties used: `name` (required), `code` and `type` (optional).
  Without a `type`, one is inferred from the name; without a `code`, one is made from the name.
* Buildings are matched to existing ones by `code` when the file gives one, otherwise by name, so the file can be
  re-imported as it grows. A HOSTEL polygon whose name matches a hostel becomes that hostel's building.
* Buildings missing from the file are left alone; points, lines and unnamed polygons are skipped and reported.

Coordinates are never invented: every footprint comes from the file.
"""
import json
import math
import re
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Building, BuildingType, Campus, Hostel

CAMPUS_CODE = 'GBU'
MAX_FEATURES = 2000
# The boundary must be at least this many times larger than the next polygon to be picked without `type: BOUNDARY`
BOUNDARY_RATIO = 20

# First matching keyword wins
TYPE_KEYWORDS = [
    (BuildingType.HOSTEL, ('hostel', 'residence hall')),
    (BuildingType.LIBRARY, ('library',)),
    (BuildingType.MEDICAL, ('medical', 'health', 'hospital', 'dispensary', 'clinic')),
    (BuildingType.SPORTS, ('ground', 'stadium', 'sports', 'court', 'gym', 'pool', 'field')),
    (BuildingType.ADMINISTRATIVE, ('administrative', 'admin block', 'administration', 'registrar', 'office')),
    (BuildingType.RESIDENTIAL, ('quarters', 'quarter', 'residential', 'residence', 'guest house', 'housing', 'flats',
                                'apartment', 'bungalow', 'villa', 'colony')),
    (BuildingType.UTILITY, ('substation', 'pump', 'water tank', 'generator', 'utility', 'workshop')),
    (BuildingType.ACADEMIC, ('school of', 'department', 'academic', 'lecture', 'laboratory', ' lab', 'block')),
]


class GisImportError(ValueError):
    pass


@dataclass
class ImportReport:
    boundary: str | None = None
    created: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _clean(value) -> str:
    return re.sub(r'\s+', ' ', str(value)).strip() if isinstance(value, (str, int, float)) else ''


def infer_type(name: str) -> BuildingType:
    lower = f' {name.lower()} '
    for building_type, words in TYPE_KEYWORDS:
        if any(w in lower for w in words):
            return building_type
    return BuildingType.OTHER


def code_from_name(name: str) -> str:
    words = [w for w in re.findall(r'[A-Za-z0-9]+', name) if w.upper() != 'GBU'] or ['BUILDING']
    return '-'.join(w.upper() for w in words)[:30].strip('-')


def _area_m2(geometry: dict) -> float:
    """Approximate area, only used to tell the campus boundary apart from buildings."""
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    total = 0.0
    for poly in polygons:
        ring = poly[0]
        lat0 = math.radians(sum(p[1] for p in ring) / len(ring))
        xy = [(math.radians(p[0]) * 6371000 * math.cos(lat0), math.radians(p[1]) * 6371000) for p in ring]
        total += abs(sum(xy[i][0] * xy[i + 1][1] - xy[i + 1][0] * xy[i][1] for i in range(len(xy) - 1))) / 2
    return total


def _check_coordinates(geometry: dict) -> bool:
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    try:
        return all(-180 <= p[0] <= 180 and -90 <= p[1] <= 90 and len(ring) >= 4
                   for poly in polygons for ring in poly for p in ring)
    except (TypeError, IndexError):
        return False


def _geom(geometry: dict):
    return func.ST_MakeValid(func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(geometry)), 4326))


def import_geojson(db: Session, data: dict) -> ImportReport:
    """Apply the file to the database (the caller commits or rolls back)."""
    if not isinstance(data, dict) or data.get('type') != 'FeatureCollection' or not isinstance(data.get('features'), list):
        raise GisImportError('The file must be a GeoJSON FeatureCollection')
    if len(data['features']) > MAX_FEATURES:
        raise GisImportError(f'The file has more than {MAX_FEATURES} features')

    report = ImportReport()
    polygons = []
    for i, f in enumerate(data['features'], 1):
        geometry = (f or {}).get('geometry') or {}
        props = (f or {}).get('properties') or {}
        name = _clean(props.get('name'))
        label = f'#{i}' + (f' "{name}"' if name else '')
        if geometry.get('type') not in ('Polygon', 'MultiPolygon'):
            report.skipped.append(f'{label}: a {geometry.get("type") or "missing"} shape; buildings must be drawn as polygons')
            continue
        if not _check_coordinates(geometry):
            report.skipped.append(f'{label}: invalid coordinates')
            continue
        polygons.append({'i': i, 'label': label, 'name': name, 'props': props, 'geometry': geometry, 'area': _area_m2(geometry)})

    explicit = [p for p in polygons if _clean(p['props'].get('type')).upper() == 'BOUNDARY']
    if len(explicit) > 1:
        raise GisImportError('Only one polygon can have type BOUNDARY')
    boundary = explicit[0] if explicit else None
    if boundary is None and len(polygons) >= 2:
        ranked = sorted(polygons, key=lambda p: p['area'], reverse=True)
        if ranked[0]['area'] >= BOUNDARY_RATIO * ranked[1]['area']:
            boundary = ranked[0]
    if boundary is not None:
        polygons.remove(boundary)
        campus = db.scalar(select(Campus).where(Campus.code == CAMPUS_CODE))
        name = boundary['name'] or 'Gautam Buddha University'
        if campus is None:
            db.add(Campus(code=CAMPUS_CODE, name=name, geom=_geom(boundary['geometry'])))
        else:
            campus.name, campus.geom = name, _geom(boundary['geometry'])
        db.flush()
        report.boundary = f'{name} ({boundary["area"] / 4046.86:,.0f} acres)'
    else:
        report.warnings.append('No campus boundary found: give the outline the property type = BOUNDARY')

    seen_codes, seen_names = set(), set()
    for p in polygons:
        props, name, label = p['props'], p['name'], p['label']
        if not name:
            report.skipped.append(f'{label}: no name; add a "name" property')
            continue
        explicit_code = _clean(props.get('code')).upper()
        if explicit_code and not re.fullmatch(r'[A-Z0-9_-]{1,30}', explicit_code):
            report.skipped.append(f'{label}: code "{explicit_code}" may only use letters, digits, - and _ (max 30)')
            continue
        type_value = _clean(props.get('type')).upper()
        if type_value and type_value not in BuildingType.__members__:
            report.skipped.append(f'{label}: unknown type "{type_value}"')
            continue
        building_type = BuildingType[type_value] if type_value else infer_type(name)
        if name.lower() in seen_names or (explicit_code and explicit_code in seen_codes):
            report.skipped.append(f'{label}: appears twice in the file')
            continue
        seen_names.add(name.lower())

        building = None
        if explicit_code:
            building = db.scalar(select(Building).where(func.upper(Building.code) == explicit_code))
        if building is None:
            building = db.scalar(select(Building).where(func.lower(Building.name) == name.lower()))
        if building is None and building_type == BuildingType.HOSTEL:
            hostel = db.scalar(select(Hostel).where(func.lower(Hostel.name) == name.lower()))
            building = hostel.building if hostel else None
        if building is not None and explicit_code and building.code.upper() != explicit_code:
            if db.scalar(select(Building.id).where(func.upper(Building.code) == explicit_code)):
                report.skipped.append(f'{label}: code {explicit_code} belongs to another building')
                continue

        if building is None:
            code = explicit_code or code_from_name(name)
            base, n = code, 2
            while code in seen_codes or db.scalar(select(Building.id).where(func.upper(Building.code) == code)):
                suffix = f'-{n}'
                code, n = base[:30 - len(suffix)] + suffix, n + 1
            if building_type == BuildingType.HOSTEL and not db.scalar(select(Hostel.id).where(func.lower(Hostel.name) == name.lower())):
                report.warnings.append(f'{label}: a hostel not yet set up in Hostel management; create it there to link wardens')
            building = Building(code=code, name=name, building_type=building_type, geom=_geom(p['geometry']))
            db.add(building)
            db.flush()
            report.created.append(f'{name} [{code}, {building_type.value}]')
        else:
            building.geom = _geom(p['geometry'])
            # A type or code written in the file wins; an inferred type never overrides one already set
            if type_value:
                building.building_type = building_type
            if explicit_code:
                building.code = explicit_code
            if building.name != name and not db.scalar(select(Hostel.id).where(Hostel.building_id == building.id)):
                if db.scalar(select(Building.id).where(func.lower(Building.name) == name.lower(), Building.id != building.id)):
                    report.warnings.append(f'{label}: not renamed, another building is already called "{name}"')
                else:
                    building.name = name
            db.flush()
            report.updated.append(f'{building.name} [{building.code}, {building.building_type.value}]')
        seen_codes.add(building.code.upper())

        if boundary is not None:
            campus_geom = select(Campus.geom).where(Campus.code == CAMPUS_CODE).scalar_subquery()
            point = select(func.ST_PointOnSurface(Building.geom)).where(Building.id == building.id).scalar_subquery()
            inside = db.scalar(select(func.ST_Contains(campus_geom, point)))
            if not inside:
                report.warnings.append(f'{label}: lies outside the campus boundary')
    return report
