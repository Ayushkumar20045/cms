"""Labels, linked tickets and sub-tasks."""
from tests.conftest import client_for, make_user, raise_complaint


def warden_client(hostel='VALMIKI-HOSTEL'):
    u = make_user(['WARDEN'], hostel_code=hostel)
    return u, client_for(u, 'staff', 'warden')


def test_labels_add_remove_and_board_filter(student):
    _, sc = student
    _, w = warden_client()
    d = raise_complaint(sc, title='Label check water leak').json()['data']

    r = w.post(f"/api/v1/complaints/{d['id']}/labels", json={'name': '  Safety  Risk '})
    assert r.status_code == 200, r.text
    labels = r.json()['data']['labels']
    assert [x['name'] for x in labels] == ['safety risk'] and labels[0]['color']
    assert r.json()['data']['canOrganise'] is True
    # Adding it again is harmless; the shared list has it once
    assert w.post(f"/api/v1/complaints/{d['id']}/labels", json={'name': 'safety risk'}).status_code == 200
    assert [x['name'] for x in w.get('/api/v1/labels').json()['data']].count('safety risk') == 1

    board = w.get('/api/v1/board', params={'label': 'safety risk'}).json()['data']
    cards = [c for col in board['columns'] for c in col['cards']]
    assert [c['id'] for c in cards] == [d['id']] and cards[0]['labels'][0]['name'] == 'safety risk'

    # Students never see labels and cannot add them
    assert sc.get(f"/api/v1/complaints/{d['id']}").json()['data']['labels'] == []
    assert sc.post(f"/api/v1/complaints/{d['id']}/labels", json={'name': 'mine'}).status_code == 403

    r = w.delete(f"/api/v1/complaints/{d['id']}/labels/{labels[0]['id']}")
    assert r.status_code == 200 and r.json()['data']['labels'] == []
    assert w.post(f"/api/v1/complaints/{d['id']}/labels", json={'name': 'bad<label>'}).status_code == 422


def test_organising_is_scoped(student):
    _, sc = student
    _, other_warden = warden_client('TULSIDAS-BOYS-HOSTEL')
    d = raise_complaint(sc).json()['data']
    assert other_warden.post(f"/api/v1/complaints/{d['id']}/labels", json={'name': 'urgent'}).status_code == 404
    caretaker = client_for(make_user(['CARETAKER']), 'staff', 'caretaker')
    assert caretaker.post('/api/v1/labels', json={'name': 'urgent'}).status_code == 403


def test_links_read_both_ways_and_refuse_loops(student):
    _, sc = student
    _, w = warden_client()
    a = raise_complaint(sc, title='Main water pump failure').json()['data']
    b = raise_complaint(sc, title='No water on second floor').json()['data']

    r = w.post(f"/api/v1/complaints/{a['id']}/links", json={'targetKey': b['complaintNumber'].lower(), 'linkType': 'BLOCKS'})
    assert r.status_code == 201, r.text
    [link] = r.json()['data']['links']
    assert link['label'] == 'blocks' and link['ticket']['complaintNumber'] == b['complaintNumber']
    [back] = w.get(f"/api/v1/complaints/{b['id']}").json()['data']['links']
    assert back['label'] == 'is blocked by' and back['ticket']['id'] == a['id']

    # The same link again, or the reverse that would make a loop, is refused
    assert w.post(f"/api/v1/complaints/{b['id']}/links",
                  json={'targetKey': a['complaintNumber'], 'linkType': 'IS_BLOCKED_BY'}).status_code == 409
    loop = w.post(f"/api/v1/complaints/{b['id']}/links", json={'targetKey': a['complaintNumber'], 'linkType': 'BLOCKS'})
    assert loop.status_code == 422 and 'loop' in loop.json()['errors'][0]['message']
    assert w.post(f"/api/v1/complaints/{a['id']}/links",
                  json={'targetKey': a['complaintNumber'], 'linkType': 'RELATES_TO'}).status_code == 422

    # "is duplicated by" is stored the right way round
    c = raise_complaint(sc, title='Pump failure reported again').json()['data']
    r = w.post(f"/api/v1/complaints/{a['id']}/links", json={'targetKey': c['complaintNumber'], 'linkType': 'IS_DUPLICATED_BY'})
    assert {x['label'] for x in r.json()['data']['links']} == {'blocks', 'is duplicated by'}
    [dup] = w.get(f"/api/v1/complaints/{c['id']}").json()['data']['links']
    assert dup['label'] == 'duplicates'

    assert w.delete(f"/api/v1/complaints/{b['id']}/links/{back['id']}").status_code == 200
    assert [x['label'] for x in w.get(f"/api/v1/complaints/{a['id']}").json()['data']['links']] == ['is duplicated by']


def test_links_to_hidden_tickets_stay_hidden(student):
    _, sc = student
    _, w = warden_client()
    admin_user = make_user(['ADMIN'], hostel_code=None)
    a_client = client_for(admin_user, 'admin')
    mine = raise_complaint(sc).json()['data']
    other_student = client_for(make_user(['STUDENT'], hostel_code='TULSIDAS-BOYS-HOSTEL'), 'student')
    elsewhere = raise_complaint(other_student, title='Lift stuck in Ashoka hostel').json()['data']

    # The warden cannot link to a ticket outside their hostel ...
    r = w.post(f"/api/v1/complaints/{mine['id']}/links", json={'targetKey': elsewhere['complaintNumber'], 'linkType': 'RELATES_TO'})
    assert r.status_code == 404
    # ... and when an admin links them, the warden does not see that link
    assert a_client.post(f"/api/v1/complaints/{mine['id']}/links",
                         json={'targetKey': elsewhere['complaintNumber'], 'linkType': 'RELATES_TO'}).status_code == 201
    assert w.get(f"/api/v1/complaints/{mine['id']}").json()['data']['links'] == []
    assert len(a_client.get(f"/api/v1/complaints/{mine['id']}").json()['data']['links']) == 1


def test_subtasks_assignment_status_and_notifications(student):
    _, sc = student
    w_user, w = warden_client()
    ct_user = make_user(['CARETAKER'])
    ct = client_for(ct_user, 'staff', 'caretaker')
    d = raise_complaint(sc, title='Replace corridor tube lights').json()['data']
    assert ct.post(f"/api/v1/complaints/{d['id']}/accept", json={}).status_code == 200  # now assigned to the caretaker

    picks = w.get(f"/api/v1/complaints/{d['id']}/subtask-assignees").json()['data']
    ids = {p['id'] for p in picks}
    assert str(ct_user.id) in ids and str(w_user.id) in ids

    r = w.post(f"/api/v1/complaints/{d['id']}/subtasks", json={'title': 'Buy 6 tube lights', 'assigneeId': str(ct_user.id)})
    assert r.status_code == 201, r.text
    [s] = r.json()['data']['subtasks']
    assert s['status'] == 'TODO' and s['assignee']['id'] == str(ct_user.id)
    w.post(f"/api/v1/complaints/{d['id']}/subtasks", json={'title': 'Fit the lights'})

    notes = ct.get('/api/v1/notifications').json()['data']
    items = notes['items'] if isinstance(notes, dict) else notes
    assert any(n['kind'] == 'SUBTASK_ASSIGNED' and n['link'] == f"/tickets/{d['complaintNumber']}" for n in items)

    # The caretaker may move their own sub-task, but nothing else
    r = ct.patch(f"/api/v1/subtasks/{s['id']}", json={'status': 'DONE'})
    assert r.status_code == 200 and r.json()['data']['subtasks'][0]['completedAt']
    assert ct.patch(f"/api/v1/subtasks/{s['id']}", json={'title': 'Something else'}).status_code == 403
    second = r.json()['data']['subtasks'][1]
    assert second['canUpdate'] is False
    assert ct.patch(f"/api/v1/subtasks/{second['id']}", json={'status': 'DONE'}).status_code == 403

    board = w.get('/api/v1/board').json()['data']
    card = next(c for col in board['columns'] for c in col['cards'] if c['id'] == d['id'])
    assert card['subtasks'] == {'done': 1, 'total': 2}

    # Only staff who can see the ticket can be given a sub-task
    assert w.post(f"/api/v1/complaints/{d['id']}/subtasks",
                  json={'title': 'Check wiring', 'assigneeId': str(make_user(['STUDENT']).id)}).status_code == 422
    assert w.delete(f"/api/v1/subtasks/{second['id']}").status_code == 200
    assert ct.delete(f"/api/v1/subtasks/{s['id']}").status_code == 403
    assert sc.get(f"/api/v1/complaints/{d['id']}").json()['data']['subtasks'] == []
