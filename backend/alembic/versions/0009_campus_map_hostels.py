"""GBU campus map and real hostels

Brings every database to the same campus data:

* imports the team's campus map (backend/data/campus_map.geojson): the boundary and every building, with the
  names exactly as drawn. Existing buildings keep their code and only get the drawn outline;
* makes sure Valmiki Hostel exists as a hostel (the seed adds the other map hostels by code);
* removes the three starter hostels (Gautam Buddha, Ashoka, Ambedkar), which are not on the map, after moving
  their students, staff, complaints and requirements to Valmiki Hostel. The removal is written to the audit log.

Safe on any database: a fresh one (tests, new installs) only gets the map, and one that is already up to date is
left as it is. Plain SQL is used so the migration does not depend on later changes to the ORM models.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-28
"""
import json
from pathlib import Path

from alembic import op
import sqlalchemy as sa

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None

MAP_FILE = Path(__file__).resolve().parents[2] / 'data' / 'campus_map.geojson'
OLD_HOSTELS = ('GBH', 'ASH', 'AMB')
TARGET = ('VALMIKI-HOSTEL', 'Valmiki Hostel')


def _features() -> tuple[dict | None, list[dict]]:
    # Pure helpers only (no database access), so later model changes cannot break this migration
    from app.services.gis_import import BOUNDARY_RATIO, _area_m2, _check_coordinates, _clean

    data = json.loads(MAP_FILE.read_text(encoding='utf-8'))
    polygons = []
    for f in data['features']:
        geometry = (f or {}).get('geometry') or {}
        name = _clean(((f or {}).get('properties') or {}).get('name'))
        if geometry.get('type') in ('Polygon', 'MultiPolygon') and name and _check_coordinates(geometry):
            polygons.append({'name': name, 'geometry': geometry, 'area': _area_m2(geometry)})
    ranked = sorted(polygons, key=lambda p: p['area'], reverse=True)
    boundary = ranked[0] if len(ranked) >= 2 and ranked[0]['area'] >= BOUNDARY_RATIO * ranked[1]['area'] else None
    return boundary, [p for p in polygons if p is not boundary]


def _import_map(conn) -> None:
    from app.services.gis_import import code_from_name, infer_type

    geom = 'ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:g), 4326))'
    boundary, buildings = _features()
    if boundary is not None:
        params = {'name': boundary['name'], 'g': json.dumps(boundary['geometry'])}
        if conn.scalar(sa.text("SELECT id FROM campuses WHERE code = 'GBU'")):
            conn.execute(sa.text(f"UPDATE campuses SET name = :name, geom = {geom}, updated_at = now() WHERE code = 'GBU'"), params)
        else:
            conn.execute(sa.text(f"INSERT INTO campuses (code, name, geom) VALUES ('GBU', :name, {geom})"), params)

    for p in buildings:
        g = json.dumps(p['geometry'])
        building_id = conn.scalar(sa.text('SELECT id FROM buildings WHERE lower(name) = lower(:n)'), {'n': p['name']})
        if building_id is None:
            building_id = conn.scalar(sa.text('SELECT building_id FROM hostels WHERE lower(name) = lower(:n)'), {'n': p['name']})
        if building_id is not None:
            conn.execute(sa.text(f'UPDATE buildings SET geom = {geom}, updated_at = now() WHERE id = :id'), {'g': g, 'id': building_id})
            continue
        base = code = code_from_name(p['name'])
        n = 2
        while conn.scalar(sa.text('SELECT 1 FROM buildings WHERE upper(code) = :c'), {'c': code}):
            suffix = f'-{n}'
            code, n = base[:30 - len(suffix)] + suffix, n + 1
        conn.execute(sa.text(f'INSERT INTO buildings (code, name, building_type, geom) '
                             f'VALUES (:c, :n, CAST(:t AS building_type), {geom})'),
                     {'c': code, 'n': p['name'], 't': infer_type(p['name']).value, 'g': g})


def _ensure_target_hostel(conn) -> tuple[int | None, int | None]:
    code, name = TARGET
    row = conn.execute(sa.text('SELECT id, building_id FROM hostels WHERE lower(name) = lower(:n)'), {'n': name}).first()
    if row is not None:
        return row.id, row.building_id
    building_id = conn.scalar(sa.text("SELECT id FROM buildings WHERE lower(name) = lower(:n) AND building_type = 'HOSTEL' "
                                      'AND NOT EXISTS (SELECT 1 FROM hostels h WHERE h.building_id = buildings.id)'), {'n': name})
    if building_id is None:
        return None, None
    hostel_id = conn.scalar(sa.text('INSERT INTO hostels (code, name, building_id, is_active) VALUES (:c, :n, :b, true) RETURNING id'),
                            {'c': code, 'n': name, 'b': building_id})
    return hostel_id, building_id


def _retire_old_hostels(conn, hostel_id: int, building_id: int) -> None:
    old = conn.execute(sa.text('SELECT id, code, name, building_id FROM hostels WHERE code IN :codes')
                       .bindparams(sa.bindparam('codes', expanding=True)), {'codes': list(OLD_HOSTELS)}).all()
    for h in old:
        p = {'old': h.id, 'old_b': h.building_id, 'new': hostel_id, 'new_b': building_id}
        conn.execute(sa.text('UPDATE users SET hostel_id = :new WHERE hostel_id = :old'), p)
        conn.execute(sa.text('UPDATE requirements SET hostel_id = :new WHERE hostel_id = :old'), p)
        conn.execute(sa.text('UPDATE complaints SET hostel_id = :new WHERE hostel_id = :old'), p)
        if h.building_id is not None:
            conn.execute(sa.text('UPDATE complaints SET building_id = :new_b WHERE building_id = :old_b'), p)
            conn.execute(sa.text('UPDATE users SET residence_building_id = NULL WHERE residence_building_id = :old_b'), p)
            # Floors move with their rooms unless the new building already has that level
            conn.execute(sa.text('UPDATE floors f SET building_id = :new_b WHERE f.building_id = :old_b AND NOT EXISTS '
                                 '(SELECT 1 FROM floors x WHERE x.building_id = :new_b AND x.level = f.level)'), p)
        conn.execute(sa.text("INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value, result) "
                             "VALUES (NULL, 'HOSTEL_DELETED', 'hostel', :id, CAST(:old_v AS jsonb), CAST(:new_v AS jsonb), 'SUCCESS')"),
                     {'id': str(h.id), 'old_v': json.dumps({'code': h.code, 'name': h.name}),
                      'new_v': json.dumps({'reason': f'Not on the campus map; moved to {TARGET[1]} (migration 0009)'})})
        conn.execute(sa.text('DELETE FROM hostels WHERE id = :old'), p)
        if h.building_id is not None and not conn.scalar(sa.text(
                'SELECT EXISTS (SELECT 1 FROM floors WHERE building_id = :old_b) OR EXISTS '
                '(SELECT 1 FROM complaints WHERE building_id = :old_b)'), p):
            conn.execute(sa.text('DELETE FROM buildings WHERE id = :old_b'), p)


def upgrade() -> None:
    conn = op.get_bind()
    _import_map(conn)
    hostel_id, building_id = _ensure_target_hostel(conn)
    if hostel_id is not None and building_id is not None:
        _retire_old_hostels(conn, hostel_id, building_id)


def downgrade() -> None:
    # Data migration: the removed starter hostels are not recreated
    pass
