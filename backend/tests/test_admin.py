import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db import SessionLocal
from tests.conftest import client_for, make_user, raise_complaint


def test_admin_dashboard_counts_and_recent(student, admin):
    _, c = student
    _, a = admin
    before = a.get('/api/v1/admin/dashboard').json()['data']['counts']
    raise_complaint(c)
    after = a.get('/api/v1/admin/dashboard').json()['data']
    assert after['counts']['total'] == before['total'] + 1 and after['counts']['pending'] == before['pending'] + 1
    assert after['recentComplaints'][0]['student']['loginId']
    assert any(h['hostel'] == 'Gautam Buddha Hostel' for h in after['byHostel'])


def test_admin_list_search_and_pagination(student, admin):
    u, c = student
    _, a = admin
    num = raise_complaint(c, title='Unique corridor light issue').json()['data']['complaintNumber']
    r = a.get('/api/v1/admin/complaints', params={'search': num}).json()
    assert r['pagination']['total'] == 1 and r['data'][0]['complaintNumber'] == num
    assert a.get('/api/v1/admin/complaints', params={'search': u.login_id}).json()['pagination']['total'] >= 1
    assert a.get('/api/v1/admin/complaints', params={'limit': 1}).json()['pagination']['limit'] == 1


def test_assignment_respects_hostel_and_moves_status(student, admin):
    _, c = student
    _, a = admin
    d = raise_complaint(c).json()['data']
    other_hostel = make_user(['CARETAKER'], hostel_code='ASH')
    r = a.post(f"/api/v1/admin/complaints/{d['id']}/assign", json={'assigneeId': str(other_hostel.id)})
    assert r.status_code == 422
    caretaker = make_user(['CARETAKER'])
    r = a.post(f"/api/v1/admin/complaints/{d['id']}/assign", json={'assigneeId': str(caretaker.id), 'remarks': 'Please check today'})
    assert r.status_code == 200 and r.json()['data']['status'] == 'ASSIGNED'
    assert r.json()['data']['assignedTo'] == caretaker.full_name
    # A second caretaker must go through reassign, which keeps the history
    second = make_user(['CARETAKER'])
    assert a.post(f"/api/v1/admin/complaints/{d['id']}/assign", json={'assigneeId': str(second.id)}).status_code == 409
    r = a.post(f"/api/v1/admin/complaints/{d['id']}/reassign", json={'assigneeId': str(second.id)})
    assignments = r.json()['data']['assignments']
    assert [x['isActive'] for x in assignments if x['assignmentType'] == 'CARETAKER'] == [False, True]
    # Student-facing view of the same complaint hides the inactive assignment trail
    student_view = c.get(f"/api/v1/complaints/{d['id']}").json()['data']
    assert all(x['isActive'] for x in student_view['assignments'])


def test_status_workflow_is_enforced(student, admin):
    _, c = student
    _, a = admin
    d = raise_complaint(c).json()['data']
    url = f"/api/v1/admin/complaints/{d['id']}"
    assert a.patch(url, json={'status': 'RESOLVED'}).status_code == 409
    assert a.patch(url, json={'status': 'RESOLVED', 'override': True}).status_code == 422  # remarks required
    r = a.patch(url, json={'status': 'RESOLVED', 'override': True, 'remarks': 'Fixed during inspection round'})
    assert r.status_code == 200 and r.json()['data']['resolvedAt'] is not None
    logs = a.get('/api/v1/admin/audit-logs', params={'action': 'COMPLAINT_STATUS_OVERRIDE', 'resourceId': d['complaintNumber']}).json()
    assert logs['pagination']['total'] == 1


def test_student_can_reopen_a_resolved_complaint(student, admin):
    _, c = student
    _, a = admin
    d = raise_complaint(c).json()['data']
    url = f"/api/v1/admin/complaints/{d['id']}"
    for s in ('UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'):
        assert a.patch(url, json={'status': s}).status_code == 200, s
    r = c.post(f"/api/v1/complaints/{d['id']}/reopen", json={'reason': 'Fan stopped again after a day'})
    assert r.status_code == 200 and r.json()['data']['status'] == 'REOPENED'
    assert c.post(f"/api/v1/complaints/{d['id']}/reopen", json={'reason': 'again'}).status_code == 409


def test_priority_and_overdue(student, admin):
    _, c = student
    _, a = admin
    d = raise_complaint(c).json()['data']
    r = a.patch(f"/api/v1/admin/complaints/{d['id']}", json={'priority': 'URGENT', 'expectedResolutionAt': '2020-01-01T00:00:00Z'})
    assert r.status_code == 200 and r.json()['data']['priority'] == 'URGENT' and r.json()['data']['isOverdue'] is True
    overdue = a.get('/api/v1/admin/complaints', params={'overdue': 'true'}).json()['data']
    assert d['id'] in {x['id'] for x in overdue}


def test_admin_cannot_create_or_promote_administrators(admin):
    u, a = admin
    body = {'loginId': 'NEW-ADMIN-1', 'password': 'a-long-password-1', 'firstName': 'New', 'roles': ['ADMIN']}
    assert a.post('/api/v1/admin/users', json=body).status_code == 403
    student = make_user(['STUDENT'])
    assert a.patch(f'/api/v1/admin/users/{student.id}', json={'roles': ['SUPER_ADMIN']}).status_code == 403
    assert a.patch(f'/api/v1/admin/users/{u.id}', json={'roles': ['STUDENT']}).status_code == 403  # nor change own roles
    superadmin = make_user(['SUPER_ADMIN'], hostel_code=None)
    assert client_for(superadmin, 'admin').post('/api/v1/admin/users', json=body).status_code == 201


def test_admin_creates_student_who_can_sign_in(admin):
    _, a = admin
    hostels = a.get('/api/v1/admin/hostels').json()['data']
    gbh = next(h for h in hostels if h['code'] == 'GBH')
    body = {'loginId': '235UCD777', 'password': 'a-long-password-2', 'firstName': 'Asha', 'lastName': 'Verma',
            'roles': ['student'], 'hostelId': gbh['id'], 'roomNumber': 'A-101', 'block': 'Block A'}
    r = a.post('/api/v1/admin/users', json=body)
    assert r.status_code == 201 and r.json()['data']['roles'] == ['STUDENT']
    assert a.post('/api/v1/admin/users', json=body).status_code == 409
    from fastapi.testclient import TestClient
    from app.main import app
    login = TestClient(app).post('/api/v1/auth/login', json={'identifier': '235ucd777', 'password': 'a-long-password-2', 'portal': 'student'})
    assert login.status_code == 200


def test_unknown_request_fields_are_rejected(admin):
    _, a = admin
    r = a.post('/api/v1/admin/hostels', json={'code': 'NEWH', 'name': 'New Hostel', 'isActive': False, 'id': 1})
    assert r.status_code == 422


def test_audit_log_is_append_only():
    with SessionLocal() as db:
        db.execute(text("INSERT INTO audit_logs (action, resource_type, result) VALUES ('TEST', 'test', 'SUCCESS')"))
        db.commit()
        for stmt in ("UPDATE audit_logs SET action = 'TAMPERED'", 'DELETE FROM audit_logs', 'TRUNCATE audit_logs'):
            with pytest.raises(DBAPIError):
                db.execute(text(stmt))
            db.rollback()
