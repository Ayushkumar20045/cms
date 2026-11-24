"""Requirements (material requests) and admin reports."""
from tests.conftest import client_for, make_user, raise_complaint


def caretaker(hostel='GBH'):
    u = make_user(['CARETAKER'], hostel_code=hostel)
    return u, client_for(u, 'staff', 'caretaker')


def test_caretaker_raises_and_admin_approves_then_fulfils(admin):
    _, a = admin
    _, ct = caretaker()
    r = ct.post('/api/v1/requirements', json={'item': 'LED bulbs', 'quantity': 20, 'reason': 'Common area lights are fused'})
    assert r.status_code == 201, r.text
    req = r.json()['data']
    assert req['requirementNumber'].startswith('REQ-') and req['status'] == 'PENDING'
    assert req['hostel']['code'] == 'GBH' and req['requestedByRole'] == 'Caretaker'

    assert ct.post(f"/api/v1/requirements/{req['id']}/decision", json={'decision': 'APPROVED'}).status_code == 403
    assert a.post(f"/api/v1/requirements/{req['id']}/decision", json={'decision': 'FULFILLED'}).status_code == 409
    d = a.post(f"/api/v1/requirements/{req['id']}/decision", json={'decision': 'APPROVED', 'remarks': 'Issue from store'}).json()['data']
    assert d['status'] == 'APPROVED' and d['decidedBy'] and d['decisionRemarks'] == 'Issue from store'
    assert a.post(f"/api/v1/requirements/{req['id']}/decision", json={'decision': 'FULFILLED'}).json()['data']['status'] == 'FULFILLED'
    assert a.get('/api/v1/admin/dashboard').json()['data']['pendingRequirements'] >= 0


def test_rejection_needs_a_reason(admin):
    _, a = admin
    _, ct = caretaker()
    req = ct.post('/api/v1/requirements', json={'item': 'Door locks', 'quantity': 3, 'reason': 'Locks are broken'}).json()['data']
    assert a.post(f"/api/v1/requirements/{req['id']}/decision", json={'decision': 'REJECTED'}).status_code == 422
    r = a.post(f"/api/v1/requirements/{req['id']}/decision", json={'decision': 'REJECTED', 'remarks': 'Already in stock'})
    assert r.json()['data']['status'] == 'REJECTED'


def test_requirements_are_scoped(admin):
    _, a = admin
    mine_u, mine = caretaker('GBH')
    _, other = caretaker('ASH')
    req = mine.post('/api/v1/requirements', json={'item': 'Brass taps', 'quantity': 4, 'reason': 'Leaking taps in Block B'}).json()['data']
    assert all(x['id'] != req['id'] for x in other.get('/api/v1/requirements').json()['data'])
    warden = client_for(make_user(['WARDEN']), 'staff', 'warden')
    assert any(x['id'] == req['id'] for x in warden.get('/api/v1/requirements').json()['data'])
    assert any(x['id'] == req['id'] for x in a.get('/api/v1/requirements', params={'search': 'Brass'}).json()['data'])
    student = client_for(make_user(['STUDENT']), 'student')
    assert student.get('/api/v1/requirements').status_code == 403


def test_requirement_can_reference_a_visible_complaint(student):
    _, c = student
    d = raise_complaint(c).json()['data']
    _, other = caretaker('ASH')
    r = other.post('/api/v1/requirements', json={'item': 'Fan', 'quantity': 1, 'reason': 'Replacement fan', 'complaintId': d['id']})
    assert r.status_code == 422  # not assigned to them, so they cannot see it


def test_reports(student, admin):
    _, c = student
    _, a = admin
    raise_complaint(c, category='Electrical')
    rep = a.get('/api/v1/admin/reports').json()['data']
    assert rep['total'] >= 1 and len(rep['byMonth']) == 6
    assert any(x['name'] == 'Electrical' for x in rep['byCategory'])
    assert any(x['name'] == 'Gautam Buddha Hostel' for x in rep['byHostel'])
    assert a.get('/api/v1/admin/reports', params={'days': 30}).json()['data']['days'] == 30
    assert c.get('/api/v1/admin/reports').status_code == 403
