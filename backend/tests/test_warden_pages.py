"""Warden Students and Hostel pages: only the warden's own hostel."""
from tests.conftest import client_for, make_user, raise_complaint


def test_warden_sees_only_students_of_their_hostel(student):
    me, sc = student
    raise_complaint(sc, title='Tube light flickering')
    other = make_user(['STUDENT'], hostel_code='TULSIDAS-BOYS-HOSTEL', room_number='T-9')
    warden = client_for(make_user(['WARDEN']), 'staff', 'warden')
    rows = warden.get('/api/v1/staff/me/students').json()['data']
    ids = {r['id'] for r in rows}
    assert str(me.id) in ids and str(other.id) not in ids
    mine = next(r for r in rows if r['id'] == str(me.id))
    assert mine['roomNumber'] == 'B-204' and mine['totalComplaints'] >= 1 and mine['openComplaints'] >= 1
    assert warden.get('/api/v1/staff/me/students', params={'search': 'B-204'}).json()['data'][0]['roomNumber'] == 'B-204'
    # Wardens and caretakers of the hostel are not listed as students
    assert all('Warden' not in r['fullName'] for r in rows)


def test_warden_hostel_overview(student):
    _, sc = student
    raise_complaint(sc, title='Water cooler not cooling', category='Plumbing')
    w = make_user(['WARDEN'])
    make_user(['CARETAKER'])
    data = client_for(w, 'staff', 'warden').get('/api/v1/staff/me/hostel').json()['data']
    assert data['hostel']['name'] == 'Valmiki Hostel' and data['students'] >= 1
    assert data['openComplaints'] >= 1 and data['totalComplaints'] >= data['openComplaints']
    assert any(x['id'] == str(w.id) for x in data['wardens']) and data['caretakers']
    assert any(c['name'] == 'Plumbing' for c in data['byCategory'])


def test_students_and_unassigned_staff_cannot_open_warden_pages(student):
    _, sc = student
    assert sc.get('/api/v1/staff/me/students').status_code == 403
    assert sc.get('/api/v1/staff/me/hostel').status_code == 403
    no_hostel = client_for(make_user(['WARDEN'], hostel_code=None), 'staff', 'warden')
    assert no_hostel.get('/api/v1/staff/me/hostel').status_code == 404
