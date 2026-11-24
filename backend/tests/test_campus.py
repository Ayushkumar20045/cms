"""Phase 1: campus locations, departments, campus-wide requesters and department scoping."""
import secrets

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Building, Department, Hostel
from tests.conftest import client_for, make_user, raise_complaint


def dept_id(code: str) -> int:
    with SessionLocal() as db:
        return db.scalar(select(Department.id).where(Department.code == code))


def department_user(roles: list[str], code: str):
    u = make_user(roles, hostel_code=None, department_id=dept_id(code))
    return u, client_for(u, 'staff')


def new_building(admin_client, building_type='ACADEMIC'):
    code = f'B{secrets.token_hex(3)}'
    r = admin_client.post('/api/v1/admin/buildings', json={'code': code, 'name': f'Block {code}', 'buildingType': building_type})
    assert r.status_code == 201, r.text
    b = r.json()['data']
    r = admin_client.post(f"/api/v1/admin/buildings/{b['id']}/floors", json={'level': 1})
    assert r.status_code == 201 and r.json()['data']['floors'][0]['name'] == '1st Floor'
    floor = r.json()['data']['floors'][0]
    r = admin_client.post(f"/api/v1/admin/floors/{floor['id']}/rooms", json={'number': '101', 'roomType': 'LABORATORY'})
    assert r.status_code == 201, r.text
    return b, r.json()['data']


def test_every_hostel_is_a_building():
    with SessionLocal() as db:
        for h in db.scalars(select(Hostel)):
            b = db.get(Building, h.building_id)
            assert b is not None and b.building_type.value == 'HOSTEL' and b.name == h.name


def test_hostel_request_defaults_to_own_hostel_and_routes_to_department(student):
    _, c = student
    d = raise_complaint(c, category='Electrical').json()['data']
    assert d['location']['building']['name'] == 'Gautam Buddha Hostel'
    assert d['location']['label'] == 'Gautam Buddha Hostel, Block B, Room B-204'
    assert d['department']['code'] == 'ELEC'
    assert d['requester'] == d['student']


def test_faculty_reports_a_room_in_an_academic_building(admin):
    _, a = admin
    b, room = new_building(a)
    faculty = make_user(['FACULTY'], hostel_code=None)
    fc = client_for(faculty, 'student')
    assert raise_complaint(fc).status_code == 422  # no hostel, so a building is required
    r = fc.post('/api/v1/complaints', data={'title': 'Projector not working', 'category': 'Electrical', 'roomId': room['id'],
                                            'locationDetails': 'Near the front desk'})
    assert r.status_code == 201, r.text
    loc = r.json()['data']['location']
    assert loc['building']['id'] == b['id'] and loc['room'] == '101' and loc['floor'] == '1st Floor'
    assert r.json()['data']['hostel'] is None
    other, _ = new_building(a)
    r = fc.post('/api/v1/complaints', data={'title': 'Projector not working', 'category': 'Electrical',
                                            'buildingId': other['id'], 'roomId': room['id']})
    assert r.status_code == 422 and r.json()['errors'][0]['field'] == 'roomId'


def test_department_scope_for_supervisors(student, admin):
    _, c = student
    d = raise_complaint(c, category='Electrical').json()['data']
    _, elec = department_user(['SUPERVISOR'], 'ELEC')
    _, it = department_user(['SUPERVISOR'], 'IT')
    assert any(x['id'] == d['id'] for x in elec.get('/api/v1/complaints', params={'limit': 100}).json()['data'])
    assert elec.get(f"/api/v1/complaints/{d['id']}").status_code == 200
    assert all(x['id'] != d['id'] for x in it.get('/api/v1/complaints', params={'limit': 100}).json()['data'])
    assert it.get(f"/api/v1/complaints/{d['id']}").status_code == 404


def test_supervisor_assigns_only_technicians_of_their_department(student):
    _, c = student
    d = raise_complaint(c, category='Electrical').json()['data']
    _, sup = department_user(['SUPERVISOR'], 'ELEC')
    wrong_dept = make_user(['TECHNICIAN'], hostel_code=None, department_id=dept_id('IT'))
    r = sup.post(f"/api/v1/admin/complaints/{d['id']}/assign", json={'assigneeId': str(wrong_dept.id)})
    assert r.status_code == 422
    tech = make_user(['TECHNICIAN'], hostel_code=None, department_id=dept_id('ELEC'))
    r = sup.post(f"/api/v1/admin/complaints/{d['id']}/assign", json={'assigneeId': str(tech.id)})
    assert r.status_code == 200 and r.json()['data']['status'] == 'ASSIGNED'
    tc = client_for(tech, 'staff', 'technician')
    assert any(x['id'] == d['id'] for x in tc.get('/api/v1/complaints').json()['data'])
    # A supervisor of another department cannot act on it at all
    _, it = department_user(['SUPERVISOR'], 'IT')
    assert it.post(f"/api/v1/admin/complaints/{d['id']}/escalate", json={'reason': 'Taking too long'}).status_code == 404


def test_warden_cannot_assign_another_hostels_request(student):
    _, c = student
    d = raise_complaint(c).json()['data']
    warden = make_user(['WARDEN'], hostel_code='ASH')
    caretaker = make_user(['CARETAKER'], hostel_code='GBH')
    r = client_for(warden, 'staff', 'warden').post(f"/api/v1/admin/complaints/{d['id']}/assign",
                                                    json={'assigneeId': str(caretaker.id)})
    assert r.status_code == 404


def test_department_roles_require_a_department(admin):
    _, a = admin
    body = {'loginId': f'TEC-{secrets.token_hex(3)}', 'password': secrets.token_urlsafe(12), 'firstName': 'New', 'roles': ['TECHNICIAN']}
    r = a.post('/api/v1/admin/users', json=body)
    assert r.status_code == 422 and r.json()['errors'][0]['field'] == 'departmentId'
    r = a.post('/api/v1/admin/users', json={**body, 'departmentId': dept_id('CARP')})
    assert r.status_code == 201 and r.json()['data']['department']['code'] == 'CARP'


def test_location_management_is_admin_only(student, admin):
    _, c = student
    _, a = admin
    assert c.post('/api/v1/admin/buildings', json={'code': 'X1', 'name': 'Nope'}).status_code == 403
    r = a.post('/api/v1/admin/buildings', json={'code': 'HX1', 'name': 'Fake Hostel', 'buildingType': 'HOSTEL'})
    assert r.status_code == 422
    b, _ = new_building(a)
    listed = c.get('/api/v1/locations/buildings', params={'type': 'ACADEMIC'}).json()['data']
    assert any(x['id'] == b['id'] for x in listed)
    detail = c.get(f"/api/v1/locations/buildings/{b['id']}").json()['data']
    assert detail['floors'][0]['rooms'][0]['number'] == '101'
    assert any(dep['code'] == 'ELEC' for dep in c.get('/api/v1/departments').json()['data'])


def test_new_hostel_gets_a_building(admin):
    _, a = admin
    code = f'H{secrets.token_hex(3)}'
    r = a.post('/api/v1/admin/hostels', json={'code': code, 'name': f'Hostel {code}'})
    assert r.status_code == 201 and r.json()['data']['buildingId']
    b = a.get(f"/api/v1/admin/buildings/{r.json()['data']['buildingId']}").json()['data']
    assert b['buildingType'] == 'HOSTEL' and b['hostel']['code'] == code


def test_new_roles_land_in_the_right_portal():
    faculty = make_user(['FACULTY'], hostel_code=None)
    assert client_for(faculty, 'student') is not None
    sup = make_user(['SUPERVISOR'], hostel_code=None, department_id=dept_id('ELEC'))
    c = client_for(sup, 'staff', 'supervisor')
    assert c.get('/api/v1/auth/me').json()['data']['department']['code'] == 'ELEC'
