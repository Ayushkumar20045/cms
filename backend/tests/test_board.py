"""Jira-style board and ticket lookup by key."""
from tests.conftest import client_for, make_user, raise_complaint


def card(board: dict, complaint_id: str):
    for col in board['columns']:
        for c in col['cards']:
            if c['id'] == complaint_id:
                return col['status'], c
    return None, None


def test_caretaker_board_follows_the_workflow(student):
    _, sc = student
    ct_user = make_user(['CARETAKER'])  # must exist before the complaint is raised, so it is offered to them
    ct = client_for(ct_user, 'staff', 'caretaker')
    d = raise_complaint(sc).json()['data']

    col, c = card(ct.get('/api/v1/board').json()['data'], d['id'])
    assert col == 'SUBMITTED' and c['needsDecision'] and c['allowedMoves'] == []  # accept or reject first

    assert ct.post(f"/api/v1/complaints/{d['id']}/accept", json={}).status_code == 200
    col, c = card(ct.get('/api/v1/board', params={'assignee': 'me'}).json()['data'], d['id'])
    assert col == 'ASSIGNED' and not c['needsDecision']
    assert 'IN_PROGRESS' in c['allowedMoves'] and 'ESCALATED' not in c['allowedMoves']  # caretakers cannot escalate

    assert ct.post(f"/api/v1/complaints/{d['id']}/status", json={'status': 'IN_PROGRESS'}).status_code == 200
    col, c = card(ct.get('/api/v1/board').json()['data'], d['id'])
    assert col == 'IN_PROGRESS' and {'RESOLVED', 'WAITING_FOR_MATERIALS'} <= set(c['allowedMoves'])


def test_board_columns_and_counts(student, admin):
    _, sc = student
    _, a = admin
    d = raise_complaint(sc, title='Board count check fan').json()['data']
    b = a.get('/api/v1/board', params={'search': 'Board count check'}).json()['data']
    titles = [c['title'] for c in b['columns']]
    assert titles[0] == 'To do' and titles[-1] == 'Resolved' and len(titles) == 8
    todo = b['columns'][0]
    assert todo['total'] >= 1 and any(c['id'] == d['id'] for c in todo['cards'])


def test_students_cannot_open_the_board(student):
    _, sc = student
    assert sc.get('/api/v1/board').status_code == 403


def test_ticket_lookup_by_key_respects_scope(student):
    _, sc = student
    d = raise_complaint(sc).json()['data']
    key = d['complaintNumber']
    r = sc.get(f'/api/v1/tickets/{key.lower()}')
    assert r.status_code == 200 and r.json()['data']['id'] == d['id']
    other = client_for(make_user(['STUDENT']), 'student')
    assert other.get(f'/api/v1/tickets/{key}').status_code == 404
    assert sc.get('/api/v1/tickets/CMP-1999-9999').status_code == 404
