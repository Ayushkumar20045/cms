"""Caretaker popup + email on new complaints, accept/reject shown to student and admins, recurring-issue alerts
for wardens, notification privacy, staff work steps, and login for every staff portal."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.main import app
from app.models import Notification
from app.services import mailer
from tests.conftest import PASSWORD, client_for, make_user, raise_complaint


@pytest.fixture
def outbox(monkeypatch):
    """Capture emails instead of sending them."""
    sent: list[mailer.Email] = []
    monkeypatch.setattr(mailer, 'send_many', lambda emails: sent.extend(emails))
    return sent


def notifications_of(user, kind=None):
    with SessionLocal() as db:
        stmt = select(Notification).where(Notification.user_id == user.id)
        if kind:
            stmt = stmt.where(Notification.kind == kind)
        return list(db.scalars(stmt.order_by(Notification.id)))


def hostel_staff(code='VALMIKI-HOSTEL'):
    """A fresh caretaker (with email) and warden for a hostel."""
    import secrets
    caretaker = make_user(['CARETAKER'], hostel_code=code, email=f'ct-{secrets.token_hex(3)}@demo.gbu.local')
    warden = make_user(['WARDEN'], hostel_code=code, email=f'wd-{secrets.token_hex(3)}@demo.gbu.local')
    return caretaker, warden


def test_new_complaint_pops_up_and_emails_the_hostel_caretaker(student, outbox):
    caretaker, warden = hostel_staff()
    d = raise_complaint(student[1], title='Water leakage in washroom').json()['data']
    [n] = notifications_of(caretaker, 'COMPLAINT_RAISED')
    assert d['complaintNumber'] in n.title and n.emailed and n.link == '/staff/caretaker/assignments'
    assert any(e.to == caretaker.email and d['complaintNumber'] in e.subject for e in outbox)
    assert notifications_of(warden, 'COMPLAINT_RAISED')  # warden is informed in-app
    # The caretaker can see the new request and is offered it
    ct = client_for(caretaker, 'staff', 'caretaker')
    mine = ct.get('/api/v1/complaints').json()['data']
    assert d['id'] in {c['id'] for c in mine}
    bell = ct.get('/api/v1/notifications').json()['data']
    assert bell['unread'] >= 1 and bell['items'][0]['kind'] in ('COMPLAINT_RAISED', 'RECURRING_ISSUE')


def test_caretaker_accepts_and_student_and_admins_are_told(student, admin, outbox):
    student_user, sc = student
    caretaker, _ = hostel_staff()
    other_caretaker, _ = hostel_staff()
    d = raise_complaint(sc, title='Tube light flickering in corridor').json()['data']
    ct = client_for(caretaker, 'staff', 'caretaker')
    r = ct.post(f"/api/v1/complaints/{d['id']}/accept", json={})
    assert r.status_code == 200, r.text
    body = r.json()['data']
    assert body['status'] == 'ASSIGNED' and body['decision'] == 'ACCEPTED' and body['decidedBy']['id'] == str(caretaker.id)
    assert body['assignedTo'] == caretaker.full_name
    # The other caretaker's offer is withdrawn, so it no longer sees the request
    assert d['id'] not in {c['id'] for c in client_for(other_caretaker, 'staff', 'caretaker').get('/api/v1/complaints').json()['data']}
    # Student: popup + email, and the decision is on their list
    assert notifications_of(student_user, 'COMPLAINT_ACCEPTED')
    mine = sc.get('/api/v1/students/me/complaints').json()['data']
    assert next(c for c in mine if c['id'] == d['id'])['decision'] == 'ACCEPTED'
    # Admins: popup and the decision in the admin list
    assert notifications_of(admin[0], 'COMPLAINT_ACCEPTED')
    listed = admin[1].get('/api/v1/admin/complaints', params={'search': d['complaintNumber']}).json()['data'][0]
    assert listed['decision'] == 'ACCEPTED' and listed['decidedBy']['fullName'] == caretaker.full_name
    # A decision cannot be made twice once work is assigned
    assert ct.post(f"/api/v1/complaints/{d['id']}/reject", json={'reason': 'Changed my mind'}).status_code == 409


def test_reject_needs_a_reason_and_is_shown_to_the_student(student, admin, outbox):
    student_user, sc = student
    caretaker, _ = hostel_staff()
    d = raise_complaint(sc, title='Wall paint peeling in my room').json()['data']
    ct = client_for(caretaker, 'staff', 'caretaker')
    assert ct.post(f"/api/v1/complaints/{d['id']}/reject", json={'reason': 'no'}).status_code == 422
    r = ct.post(f"/api/v1/complaints/{d['id']}/reject", json={'reason': 'Repainting is scheduled for the whole block in December'})
    assert r.status_code == 200 and r.json()['data']['status'] == 'REJECTED'
    mine = next(c for c in sc.get('/api/v1/students/me/complaints').json()['data'] if c['id'] == d['id'])
    assert mine['decision'] == 'REJECTED' and 'December' in mine['decisionReason']
    [n] = notifications_of(student_user, 'COMPLAINT_REJECTED')
    # Emailed only when the student has an address on file (the test student has none)
    assert 'December' in n.body and n.emailed == bool(student_user.email)
    assert notifications_of(admin[0], 'COMPLAINT_REJECTED')


def test_only_responsible_staff_can_accept_or_reject(student):
    _, sc = student
    hostel_staff()
    d = raise_complaint(sc, title='Broken window latch here').json()['data']
    assert sc.post(f"/api/v1/complaints/{d['id']}/accept", json={}).status_code == 403
    other_hostel_caretaker = make_user(['CARETAKER'], hostel_code='TULSIDAS-BOYS-HOSTEL')
    r = client_for(other_hostel_caretaker, 'staff', 'caretaker').post(f"/api/v1/complaints/{d['id']}/accept", json={})
    assert r.status_code == 404  # outside their hostel: not even disclosed
    technician = make_user(['TECHNICIAN'], hostel_code=None)
    assert client_for(technician, 'staff', 'technician').post(f"/api/v1/complaints/{d['id']}/accept", json={}).status_code == 403


def test_warden_accepts_for_review_and_caretaker_can_still_take_it(student):
    _, sc = student
    caretaker, warden = hostel_staff()
    d = raise_complaint(sc, title='Door handle loose on entrance').json()['data']
    r = client_for(warden, 'staff', 'warden').post(f"/api/v1/complaints/{d['id']}/accept", json={'remarks': 'Valid'})
    assert r.json()['data']['status'] == 'UNDER_REVIEW' and r.json()['data']['decision'] == 'ACCEPTED'
    r = client_for(caretaker, 'staff', 'caretaker').post(f"/api/v1/complaints/{d['id']}/accept", json={})
    assert r.json()['data']['status'] == 'ASSIGNED' and r.json()['data']['assignedTo'] == caretaker.full_name


def test_caretaker_moves_work_forward_and_student_is_told(student, outbox):
    student_user, sc = student
    caretaker, _ = hostel_staff()
    d = raise_complaint(sc, title='Geyser not heating water').json()['data']
    ct = client_for(caretaker, 'staff', 'caretaker')
    url = f"/api/v1/complaints/{d['id']}"
    assert ct.post(f'{url}/status', json={'status': 'IN_PROGRESS'}).status_code == 409  # must accept first
    ct.post(f'{url}/accept', json={})
    assert ct.post(f'{url}/status', json={'status': 'CLOSED'}).status_code == 422  # closing is for admins
    for step in ('IN_PROGRESS', 'WAITING_FOR_MATERIALS', 'IN_PROGRESS', 'RESOLVED'):
        r = ct.post(f'{url}/status', json={'status': step})
        assert r.status_code == 200, (step, r.text)
    kinds = [n.title for n in notifications_of(student_user, 'STATUS_CHANGED')]
    assert any('Resolved' in t for t in kinds)


def test_repeated_complaints_pop_up_for_the_warden_once(outbox):
    _, warden = hostel_staff()
    room_students = [make_user(['STUDENT'], room_number='C-110', block='Block C') for _ in range(4)]
    titles = ['Water leaking from washroom ceiling', 'Washroom ceiling water leaking again', 'Ceiling leaking water in washroom',
              'Water leaking washroom ceiling badly']
    for u, t in zip(room_students, titles):
        assert raise_complaint(client_for(u, 'student'), title=t, category='Maintenance').status_code == 201
    alerts = notifications_of(warden, 'RECURRING_ISSUE')
    assert len(alerts) == 1  # third report triggers it; the fourth is inside the cooldown
    assert alerts[0].emailed and alerts[0].link == '/staff/warden/dashboard'
    issues = client_for(warden, 'staff', 'warden').get('/api/v1/staff/me/recurring').json()['data']
    leak = next(i for i in issues if 'washroom' in i['title'].lower())
    assert leak['count'] >= 4 and leak['category'] == 'Maintenance'
    # Staff see the similar complaints on the request itself; students do not
    latest = leak['complaints'][0]['id']
    detail = client_for(warden, 'staff', 'warden').get(f'/api/v1/complaints/{latest}').json()['data']
    assert len(detail['similar']) >= 3
    assert client_for(room_students[0], 'student').get('/api/v1/staff/me/recurring').status_code == 403


def test_notifications_are_private(student):
    caretaker, _ = hostel_staff()
    raise_complaint(student[1], title='Mirror cracked in washroom')
    mine = notifications_of(caretaker)[0]
    assert student[1].post(f'/api/v1/notifications/{mine.id}/read').status_code == 404
    ct = client_for(caretaker, 'staff', 'caretaker')
    assert ct.post(f'/api/v1/notifications/{mine.id}/read').json()['data']['items'][0]['read'] is True
    assert ct.post('/api/v1/notifications/read-all').json()['data']['unread'] == 0


@pytest.mark.parametrize('role, staff_role, home', [
    ('TECHNICIAN', 'technician', '/staff/technician/dashboard'),
    ('SUPERVISOR', 'supervisor', '/staff/supervisor/dashboard'),
    ('DEPARTMENT_HEAD', 'department_head', '/staff/department-head/dashboard'),
    ('STORE_MANAGER', 'store_manager', '/staff/store/dashboard'),
    ('AUTHORITY', 'authority', '/staff/authority/dashboard'),
    ('WARDEN', 'warden', '/staff/warden/dashboard'),
    ('CARETAKER', 'caretaker', '/staff/caretaker/dashboard'),
])
def test_every_staff_role_can_sign_in_to_its_portal(role, staff_role, home):
    u = make_user([role], hostel_code='VALMIKI-HOSTEL' if role in ('WARDEN', 'CARETAKER') else None)
    r = TestClient(app).post('/api/v1/auth/login', json={'identifier': u.login_id, 'password': PASSWORD, 'portal': 'staff',
                                                         'staffRole': staff_role})
    assert r.status_code == 200, r.text
    assert r.json()['data']['redirectTo'] == home
