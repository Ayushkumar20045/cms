"""Phase 2 (initial): campus GeoJSON import and the private campus map."""
import json
import secrets

from tests.conftest import make_user, client_for, raise_complaint


def square(lng, lat, d):
    return {'type': 'Polygon', 'coordinates': [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]]}


def feature(geometry, **props):
    return {'type': 'Feature', 'properties': props, 'geometry': geometry}


def campus_file(tag: str) -> dict:
    return {'type': 'FeatureCollection', 'features': [
        feature(square(77.515, 28.412, 0.02), name='Gautam Buddha University'),
        feature(square(77.520, 28.415, 0.0005), name=f'School of Testing {tag}'),
        feature(square(77.522, 28.416, 0.0004), name=f'Test Library {tag}', code=f'LIB-{tag}'),
        feature(square(77.524, 28.417, 0.0004), name='Valmiki Hostel'),
        feature(square(77.526, 28.418, 0.0003)),
        feature({'type': 'Point', 'coordinates': [77.52, 28.42]}, name='A point'),
    ]}


def upload(client, data, dry_run=False):
    return client.post('/api/v1/admin/gis/import', data={'dryRun': str(dry_run).lower()},
                       files={'file': ('map.geojson', json.dumps(data).encode(), 'application/geo+json')})


def test_import_preview_then_apply_then_reimport(admin):
    _, a = admin
    tag = secrets.token_hex(3).upper()
    data = campus_file(tag)
    preview = upload(a, data, dry_run=True).json()['data']
    assert preview['dryRun'] and preview['boundary'].startswith('Gautam Buddha University')
    assert not any(tag in b['name'] for b in a.get('/api/v1/map').json()['data']['buildings'])  # nothing saved

    r = upload(a, data).json()['data']
    created = ' '.join(r['created'])
    assert f'School of Testing {tag} [SCHOOL-OF-TESTING-{tag}, ACADEMIC]' in created
    assert f'LIB-{tag}, LIBRARY' in created
    # The hostel polygon becomes the existing hostel's building rather than a new one
    assert any(u.startswith('Valmiki Hostel') for u in r['updated'])
    assert any('no name' in s for s in r['skipped']) and any('Point' in s for s in r['skipped'])

    again = upload(a, data).json()['data']
    assert again['created'] == [] and len(again['updated']) == 3


def test_map_shows_buildings_and_counts_only_visible_requests(student, admin):
    su, sc = student
    _, a = admin
    upload(a, campus_file(secrets.token_hex(3).upper()))
    raise_complaint(sc)  # lands in the student's hostel building
    hostel = next(b for b in sc.get('/api/v1/map').json()['data']['buildings'] if b['name'] == 'Valmiki Hostel')
    assert hostel['openRequests'] >= 1 and hostel['geometry']['type'] == 'Polygon'
    other = make_user(['STUDENT'])
    other_view = next(b for b in client_for(other, 'student').get('/api/v1/map').json()['data']['buildings']
                      if b['id'] == hostel['id'])
    assert other_view['openRequests'] == 0  # another student's requests are not counted
    summary = sc.get(f"/api/v1/map/buildings/{hostel['id']}").json()['data']
    assert summary['pending'] >= 1 and summary['recent'][0]['requester']['loginId'] == su.login_id
    m = sc.get('/api/v1/map').json()['data']
    assert m['boundary']['type'] == 'Polygon' and len(m['bounds']) == 4


def test_only_location_managers_can_import(student):
    _, c = student
    assert upload(c, campus_file('X')).status_code == 403


def test_import_rejects_bad_files(admin):
    _, a = admin
    r = a.post('/api/v1/admin/gis/import', files={'file': ('map.geojson', b'not json', 'application/json')})
    assert r.status_code == 422
    assert upload(a, {'type': 'Feature'}).status_code == 422


def test_hostel_drawn_on_the_map_is_adopted_by_hostel_management(admin):
    _, a = admin
    tag = secrets.token_hex(3).upper()
    name = f'Drawn Hostel {tag}'
    data = {'type': 'FeatureCollection', 'features': [feature(square(77.515, 28.412, 0.02), name='Gautam Buddha University'),
                                                      feature(square(77.527, 28.427, 0.0005), name=name)]}
    r = upload(a, data).json()['data']
    assert any(name in c and 'HOSTEL' in c for c in r['created'])
    h = a.post('/api/v1/admin/hostels', json={'code': f'D{tag}', 'name': name})
    assert h.status_code == 201, h.text
    b = a.get(f"/api/v1/admin/buildings/{h.json()['data']['buildingId']}").json()['data']
    assert b['name'] == name and b['hostel']['code'] == f'D{tag}'
