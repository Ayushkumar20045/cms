import re

from tests.conftest import client_for, make_user, raise_complaint

PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 64


def test_student_raises_complaint_with_server_generated_id_and_hostel(student):
    u, c = student
    warden = make_user(['WARDEN'])
    r = raise_complaint(c, description='Fan in room B-204 stopped working last night.')
    assert r.status_code == 201, r.text
    d = r.json()['data']
    assert re.fullmatch(r'CMP-\d{4}-\d{4}', d['complaintNumber'])
    assert d['status'] == 'SUBMITTED' and d['category'] == 'Electrical'
    assert d['hostel']['code'] == 'GBH'  # derived from the account, not chosen by the student
    assert [h['newStatus'] for h in d['history']] == ['SUBMITTED']
    assert d['assignedTo'] is not None  # routed to a hostel warden
    assert warden.hostel_id == u.hostel_id


def test_student_cannot_choose_hostel_status_or_owner(student):
    _, c = student
    r = c.post('/api/v1/complaints', data={'title': 'Leaking tap in washroom', 'category': 'Maintenance', 'status': 'RESOLVED',
                                           'hostelId': '999', 'studentId': 'someone-else'})
    assert r.status_code == 201
    assert r.json()['data']['status'] == 'SUBMITTED' and r.json()['data']['hostel']['code'] == 'GBH'


def test_complaint_validation_errors(student):
    _, c = student
    r = raise_complaint(c, title='Fan', category='Nope', description='word ' * 201)
    assert r.status_code == 422
    fields = {e['field'] for e in r.json()['errors']}
    assert fields == {'title', 'category', 'description'}


def test_student_without_hostel_allocation_cannot_submit():
    u = make_user(['STUDENT'], hostel_code=None)
    r = raise_complaint(client_for(u, 'student'))
    assert r.status_code == 409


def test_attachments_are_checked_by_content(student):
    _, c = student
    ok = raise_complaint(c, files=[('files', ('fan.png', PNG, 'image/png'))])
    assert ok.status_code == 201 and len(ok.json()['data']['attachments']) == 1
    fake = raise_complaint(c, files=[('files', ('photo.png', b'<script>alert(1)</script>', 'image/png'))])
    assert fake.status_code == 422
    wrong_ext = raise_complaint(c, files=[('files', ('fan.exe', PNG, 'image/png'))])
    assert wrong_ext.status_code == 422


def test_attachment_download_is_scoped_to_the_owner(student):
    _, c = student
    d = raise_complaint(c, files=[('files', ('fan.png', PNG, 'image/png'))]).json()['data']
    url = f"/api/v1/complaints/{d['id']}/attachments/{d['attachments'][0]['id']}"
    r = c.get(url)
    assert r.status_code == 200 and r.content == PNG and 'attachment' in r.headers['content-disposition']
    other = client_for(make_user(['STUDENT']), 'student')
    assert other.get(url).status_code == 404


def test_students_only_see_their_own_complaints(student):
    _, c = student
    mine = raise_complaint(c, title='My own complaint here').json()['data']
    other = client_for(make_user(['STUDENT']), 'student')
    theirs = raise_complaint(other, title='Someone else complaint').json()['data']
    assert c.get(f"/api/v1/complaints/{theirs['id']}").status_code == 404
    listed = {x['id'] for x in c.get('/api/v1/students/me/complaints').json()['data']}
    assert mine['id'] in listed and theirs['id'] not in listed


def test_dashboard_profile_counts_and_list_filters(student):
    _, c = student
    raise_complaint(c, title='Water cooler not working', category='Maintenance')
    raise_complaint(c, title='Ethernet port dead in room', category='Ethernet')
    p = c.get('/api/v1/students/me').json()['data']
    assert p['summary'] == {'total': 2, 'active': 2, 'resolved': 0}
    assert p['user']['roomNumber'] == 'B-204' and p['user']['hostel']['name'] == 'Gautam Buddha Hostel'
    page = c.get('/api/v1/students/me/complaints', params={'category': 'Ethernet'}).json()
    assert page['pagination']['total'] == 1 and page['data'][0]['category'] == 'Ethernet'
    assert c.get('/api/v1/students/me/complaints', params={'search': 'cooler'}).json()['pagination']['total'] == 1
    assert len(c.get('/api/v1/students/me/activity').json()['data']) == 2


def test_student_cannot_use_admin_endpoints(student):
    u, c = student
    d = raise_complaint(c).json()['data']
    tech = make_user(['CARETAKER'])
    for method, url, body in [('get', '/api/v1/admin/dashboard', None), ('get', '/api/v1/admin/complaints', None),
                              ('get', '/api/v1/admin/users', None),
                              ('post', f"/api/v1/admin/complaints/{d['id']}/assign", {'assigneeId': str(tech.id)}),
                              ('patch', f"/api/v1/admin/complaints/{d['id']}", {'status': 'RESOLVED'}),
                              ('patch', f'/api/v1/admin/users/{u.id}', {'roles': ['ADMIN']})]:
        r = getattr(c, method)(url, json=body) if body else getattr(c, method)(url)
        assert r.status_code == 403, (url, r.status_code)


def test_internal_remarks_are_hidden_from_students(student, admin):
    _, c = student
    _, a = admin
    d = raise_complaint(c).json()['data']
    a.post(f"/api/v1/complaints/{d['id']}/comments", json={'comment': 'Check supplier invoice', 'visibility': 'INTERNAL'})
    a.post(f"/api/v1/complaints/{d['id']}/comments", json={'comment': 'Technician visiting tomorrow'})
    seen = [x['comment'] for x in c.get(f"/api/v1/complaints/{d['id']}").json()['data']['comments']]
    assert seen == ['Technician visiting tomorrow']
    assert c.post(f"/api/v1/complaints/{d['id']}/comments", json={'comment': 'x', 'visibility': 'INTERNAL'}).status_code == 403
