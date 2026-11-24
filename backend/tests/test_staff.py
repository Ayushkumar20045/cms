"""Warden and caretaker dashboards, and the Waiting for Materials status."""
from tests.conftest import client_for, make_user, raise_complaint


def test_warden_dashboard_is_scoped_to_their_hostel(student):
    _, c = student
    d = raise_complaint(c).json()['data']
    warden = client_for(make_user(['WARDEN']), 'staff', 'warden')
    data = warden.get('/api/v1/staff/me/dashboard').json()['data']
    assert data['hostel']['hostel']['name'] == 'Gautam Buddha Hostel' and data['hostel']['students'] >= 1
    assert data['counts']['pending'] >= 1 and any(r['id'] == d['id'] for r in data['recent'])
    other = client_for(make_user(['WARDEN'], hostel_code='ASH'), 'staff', 'warden')
    assert all(r['id'] != d['id'] for r in other.get('/api/v1/staff/me/dashboard').json()['data']['recent'])


def test_caretaker_work_moves_through_waiting_for_materials(student, admin):
    _, c = student
    _, a = admin
    d = raise_complaint(c).json()['data']
    ct_user = make_user(['CARETAKER'])
    ct = client_for(ct_user, 'staff', 'caretaker')
    assert ct.get('/api/v1/staff/me/dashboard').json()['data']['counts']['total'] == 0
    a.post(f"/api/v1/admin/complaints/{d['id']}/assign", json={'assigneeId': str(ct_user.id)})
    url = f"/api/v1/admin/complaints/{d['id']}"
    for s in ('IN_PROGRESS', 'WAITING_FOR_MATERIALS'):
        assert a.patch(url, json={'status': s}).status_code == 200, s
    counts = ct.get('/api/v1/staff/me/dashboard').json()['data']['counts']
    assert counts['total'] == 1 and counts['waitingForMaterials'] == 1
    assert a.patch(url, json={'status': 'RESOLVED'}).status_code == 409  # must resume work first
    for s in ('IN_PROGRESS', 'RESOLVED'):
        assert a.patch(url, json={'status': s}).status_code == 200, s
    done = ct.get('/api/v1/complaints', params={'state': 'completed'}).json()['data']
    assert [x['id'] for x in done] == [d['id']]
    assert ct.get('/api/v1/complaints', params={'state': 'open'}).json()['data'] == []


def test_students_cannot_open_the_staff_dashboard(student):
    _, c = student
    assert c.get('/api/v1/staff/me/dashboard').status_code == 403
