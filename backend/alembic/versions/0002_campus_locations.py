"""campus locations, departments and campus-wide service requests

Adds zones -> buildings -> floors -> rooms and service departments; turns every hostel into a HOSTEL building;
gives categories a responsible department and users a department; and extends complaints into service requests
(requester instead of student, building/room/location details, routed department).

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-18
"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

BUILDING_TYPES = ('ACADEMIC', 'HOSTEL', 'ADMINISTRATIVE', 'RESIDENTIAL', 'LIBRARY', 'SPORTS', 'MEDICAL', 'UTILITY', 'OTHER')
ROOM_TYPES = ('CLASSROOM', 'LABORATORY', 'OFFICE', 'HOSTEL_ROOM', 'WASHROOM', 'COMMON_AREA', 'STORE', 'OTHER')


def _geom():
    return sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='GEOMETRY', srid=4326, spatial_index=False), nullable=True)


def _timestamps(updated=True):
    cols = [sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)]
    if updated:
        cols.append(sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    return cols


def upgrade() -> None:
    building_type = sa.Enum(*BUILDING_TYPES, name='building_type')
    room_type = sa.Enum(*ROOM_TYPES, name='room_type')

    op.create_table('departments',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('code', sa.String(30), nullable=False, unique=True),
                    sa.Column('name', sa.String(120), nullable=False, unique=True),
                    sa.Column('description', sa.String(255)),
                    sa.Column('contact_email', sa.String(254)),
                    sa.Column('contact_phone', sa.String(20)),
                    sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
                    *_timestamps())
    op.create_table('zones',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('code', sa.String(30), nullable=False, unique=True),
                    sa.Column('name', sa.String(120), nullable=False, unique=True),
                    sa.Column('description', sa.String(255)),
                    sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
                    _geom(), *_timestamps())
    op.create_table('buildings',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('zone_id', sa.Integer(), sa.ForeignKey('zones.id')),
                    sa.Column('code', sa.String(30), nullable=False, unique=True),
                    sa.Column('name', sa.String(120), nullable=False, unique=True),
                    sa.Column('building_type', building_type, nullable=False, server_default='OTHER'),
                    sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
                    _geom(), *_timestamps())
    op.create_index('ix_buildings_zone_id', 'buildings', ['zone_id'])
    op.create_index('ix_buildings_building_type', 'buildings', ['building_type'])
    op.create_table('floors',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('building_id', sa.Integer(), sa.ForeignKey('buildings.id', ondelete='CASCADE'), nullable=False),
                    sa.Column('level', sa.Integer(), nullable=False),
                    sa.Column('name', sa.String(60), nullable=False),
                    *_timestamps(updated=False),
                    sa.UniqueConstraint('building_id', 'level'))
    op.create_index('ix_floors_building_id', 'floors', ['building_id'])
    op.create_table('rooms',
                    sa.Column('id', sa.Integer(), primary_key=True),
                    sa.Column('floor_id', sa.Integer(), sa.ForeignKey('floors.id', ondelete='CASCADE'), nullable=False),
                    sa.Column('number', sa.String(30), nullable=False),
                    sa.Column('name', sa.String(120)),
                    sa.Column('room_type', room_type, nullable=False, server_default='OTHER'),
                    sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
                    *_timestamps(updated=False),
                    sa.UniqueConstraint('floor_id', 'number'))
    op.create_index('ix_rooms_floor_id', 'rooms', ['floor_id'])
    for table in ('zones', 'buildings'):
        op.create_index(f'idx_{table}_geom', table, ['geom'], postgresql_using='gist')

    # Every hostel becomes a HOSTEL building, keeping any footprint already drawn for it
    op.add_column('hostels', sa.Column('building_id', sa.Integer(), sa.ForeignKey('buildings.id'), unique=True))
    op.execute("""INSERT INTO buildings (code, name, building_type, is_active, geom)
                  SELECT code, name, 'HOSTEL', is_active, geom FROM hostels""")
    op.execute('UPDATE hostels h SET building_id = b.id FROM buildings b WHERE b.code = h.code')
    op.drop_column('hostels', 'geom')

    op.add_column('users', sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id')))
    op.create_index('ix_users_department_id', 'users', ['department_id'])
    op.add_column('complaint_categories', sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id')))

    # Complaints become campus-wide service requests
    op.alter_column('complaints', 'student_id', new_column_name='requester_id')
    op.execute('ALTER INDEX ix_complaints_student_id RENAME TO ix_complaints_requester_id')
    op.execute('ALTER TABLE complaints RENAME CONSTRAINT complaints_student_id_fkey TO complaints_requester_id_fkey')
    op.add_column('complaints', sa.Column('building_id', sa.Integer(), sa.ForeignKey('buildings.id')))
    op.add_column('complaints', sa.Column('room_id', sa.Integer(), sa.ForeignKey('rooms.id')))
    op.add_column('complaints', sa.Column('location_details', sa.String(255)))
    op.add_column('complaints', sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id')))
    op.create_index('ix_complaints_building_id', 'complaints', ['building_id'])
    op.create_index('ix_complaints_department_id', 'complaints', ['department_id'])
    op.execute('UPDATE complaints c SET building_id = h.building_id FROM hostels h WHERE h.id = c.hostel_id')

    op.execute("ALTER TYPE assignment_type ADD VALUE IF NOT EXISTS 'TECHNICIAN'")


def downgrade() -> None:
    # Postgres cannot drop an enum value; TECHNICIAN stays in assignment_type, unused, after a downgrade
    op.drop_index('ix_complaints_department_id', table_name='complaints')
    op.drop_index('ix_complaints_building_id', table_name='complaints')
    for col in ('department_id', 'location_details', 'room_id', 'building_id'):
        op.drop_column('complaints', col)
    op.execute('ALTER TABLE complaints RENAME CONSTRAINT complaints_requester_id_fkey TO complaints_student_id_fkey')
    op.execute('ALTER INDEX ix_complaints_requester_id RENAME TO ix_complaints_student_id')
    op.alter_column('complaints', 'requester_id', new_column_name='student_id')

    op.drop_column('complaint_categories', 'department_id')
    op.drop_index('ix_users_department_id', table_name='users')
    op.drop_column('users', 'department_id')

    op.add_column('hostels', sa.Column('geom', geoalchemy2.types.Geometry(srid=4326, spatial_index=False), nullable=True))
    op.execute('UPDATE hostels h SET geom = b.geom FROM buildings b WHERE b.id = h.building_id')
    op.create_index('idx_hostels_geom', 'hostels', ['geom'], postgresql_using='gist')
    op.drop_column('hostels', 'building_id')

    op.drop_table('rooms')
    op.drop_table('floors')
    op.drop_table('buildings')
    op.drop_table('zones')
    op.drop_table('departments')
    for enum_name in ('room_type', 'building_type'):
        op.execute(f'DROP TYPE IF EXISTS {enum_name}')
