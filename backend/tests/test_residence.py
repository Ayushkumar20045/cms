"""Faculty and staff living on campus: their quarters fill in the location and the request goes to the department."""
from app.services.gis_import import infer_type
from app.models import BuildingType
from tests.conftest import client_for, make_user, raise_complaint
from tests.test_campus import dept_id, department_user, new_building


def test_faculty_quarters_fill_in_the_location_and_route_to_the_department(admin):
    _, a = admin
    quarters, _ = new_building(a, 'RESIDENTIAL')
    faculty = make_user(['FACULTY'], hostel_code=None)
    r = a.patch(f'/api/v1/admin/users/{faculty.id}', json={'residenceBuildingId': quarters['id'], 'residenceUnit': 'C-12'})
    assert r.status_code == 200, r.text
    assert r.json()['data']['residence']['id'] == quarters['id'] and r.json()['data']['residenceUnit'] == 'C-12'

    supervisor, sc = department_user(['SUPERVISOR'], 'CIVIL')
    fc = client_for(faculty, 'faculty')
    me = fc.get('/api/v1/auth/me').json()['data']
    assert me['residence']['name'] == quarters['name'] and me['residenceUnit'] == 'C-12' and me['hostel'] is None

    r = raise_complaint(fc, title='Kitchen tap leaking', category='Plumbing')
    assert r.status_code == 201, r.text
    d = r.json()['data']
    assert d['location']['building']['id'] == quarters['id'] and d['location']['details'] == 'House C-12'
    assert d['hostel'] is None and d['department']['id'] == dept_id('CIVIL')
    # Nobody from a hostel is involved: the plumbing supervisors are told and can see it
    assert any(n['complaintId'] == d['id'] for n in sc.get('/api/v1/notifications').json()['data']['items'])
    assert sc.get(f"/api/v1/complaints/{d['id']}").status_code == 200


def test_a_residence_must_be_campus_quarters(admin):
    _, a = admin
    academic, _ = new_building(a, 'ACADEMIC')
    faculty = make_user(['FACULTY'], hostel_code=None)
    r = a.patch(f'/api/v1/admin/users/{faculty.id}', json={'residenceBuildingId': academic['id']})
    assert r.status_code == 422 and r.json()['errors'][0]['field'] == 'residenceBuildingId'


def test_choosing_another_place_still_works_for_residents(admin):
    _, a = admin
    quarters, _ = new_building(a, 'RESIDENTIAL')
    school, room = new_building(a, 'ACADEMIC')
    faculty = make_user(['FACULTY'], hostel_code=None, residence_building_id=quarters['id'], residence_unit='A-3')
    fc = client_for(faculty, 'faculty')
    r = fc.post('/api/v1/complaints', data={'title': 'Projector not working', 'category': 'Electrical', 'roomId': room['id']})
    assert r.status_code == 201 and r.json()['data']['location']['building']['id'] == school['id']


def test_map_import_recognises_quarters():
    for name in ('Faculty Quarters Block A', 'Staff Residence', 'Faculty Housing', 'Teachers Colony', 'Type-III Flats'):
        assert infer_type(name) == BuildingType.RESIDENTIAL, name
    assert infer_type('Ashoka Hostel') == BuildingType.HOSTEL
    assert infer_type('Girls Residence Hall') == BuildingType.HOSTEL
