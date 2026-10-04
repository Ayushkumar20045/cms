from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import PASSWORD, client_for, make_user


def login(c, user, portal, password=PASSWORD, **extra):
    return c.post('/api/v1/auth/login', json={'identifier': user.login_id, 'password': password, 'portal': portal, **extra})


def test_login_sets_http_only_cookies_and_routes_by_stored_role():
    u = make_user(['STUDENT'])
    c = TestClient(app)
    r = login(c, u, 'student')
    assert r.status_code == 200
    body = r.json()
    assert body['success'] is True and body['data']['redirectTo'] == '/student/dashboard'
    assert 'STUDENT' in body['data']['user']['roles']
    cookies = r.headers.get_list('set-cookie')
    assert any(h.startswith('gbu_access=') and 'HttpOnly' in h for h in cookies)
    assert any(h.startswith('gbu_refresh=') and 'HttpOnly' in h for h in cookies)
    assert 'accessToken' not in body['data']  # token never exposed to JavaScript
    assert c.get('/api/v1/auth/me').json()['data']['loginId'] == u.login_id


def test_wrong_password_gives_generic_error():
    u = make_user(['STUDENT'])
    r = login(TestClient(app), u, 'student', password='wrong-password')
    assert r.status_code == 401 and r.json() == {'success': False, 'message': 'Invalid ID or password'}
    r = TestClient(app).post('/api/v1/auth/login', json={'identifier': 'no-such-user', 'password': 'x', 'portal': 'student'})
    assert r.status_code == 401 and r.json()['message'] == 'Invalid ID or password'


def test_selected_portal_cannot_upgrade_a_student_to_admin():
    u = make_user(['STUDENT'])
    r = login(TestClient(app), u, 'admin')
    assert r.status_code == 403


def test_staff_role_must_match_stored_role():
    caretaker = make_user(['CARETAKER'])
    assert login(TestClient(app), caretaker, 'staff', staffRole='warden').status_code == 403
    r = login(TestClient(app), caretaker, 'staff', staffRole='caretaker')
    assert r.status_code == 200 and r.json()['data']['redirectTo'] == '/staff/caretaker/dashboard'


def test_login_is_rate_limited():
    u = make_user(['STUDENT'])
    c = TestClient(app)
    codes = [login(c, u, 'student', password='bad').status_code for _ in range(6)]
    assert codes[:5] == [401] * 5 and codes[5] == 429
    assert login(c, u, 'student').status_code == 429  # even the right password is held back during the window


def test_deactivated_user_is_locked_out_immediately(admin):
    _, admin_client = admin
    u = make_user(['STUDENT'])
    c = client_for(u, 'student')
    assert admin_client.post(f'/api/v1/admin/users/{u.id}/deactivate').status_code == 200
    assert c.get('/api/v1/auth/me').status_code == 401
    assert login(TestClient(app), u, 'student').status_code == 401


def test_refresh_rotates_and_reuse_revokes_the_session():
    u = make_user(['STUDENT'])
    c = client_for(u, 'student')
    old_refresh = c.cookies.get('gbu_refresh')
    assert c.post('/api/v1/auth/refresh').status_code == 200
    assert c.cookies.get('gbu_refresh') != old_refresh
    # An attacker replaying the old refresh token kills the whole session family
    thief = TestClient(app)
    thief.cookies.set('gbu_refresh', old_refresh, path='/api/v1/auth')
    assert thief.post('/api/v1/auth/refresh').status_code == 401
    assert c.post('/api/v1/auth/refresh').status_code == 401


def test_state_changing_request_without_csrf_header_is_rejected(student):
    _, c = student
    del c.headers['X-CSRF-Token']
    r = c.post('/api/v1/complaints', data={'title': 'Broken window latch', 'category': 'Civil'})
    assert r.status_code == 403
