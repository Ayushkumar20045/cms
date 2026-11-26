"""Permission catalogue and role mapping for GBU Smart Campus.

The nine campus roles from the synopsis (Student, Faculty, Staff, Technician, Supervisor, Department Head,
Store Manager, Admin, Super Admin) plus the hostel roles Warden and Caretaker, and Authority from the original
hostel complaint system. Super Admin is the only role allowed to grant administrator access. Roles do not
inherit from each other; every permission a role has is listed explicitly.
"""

MODULE_PERMISSIONS: dict[str, list[str]] = {
    'COMPLAINT': [
        'COMPLAINT_CREATE', 'COMPLAINT_VIEW_OWN', 'COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_VIEW_DEPARTMENT',
        'COMPLAINT_VIEW_ALL',
        'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_ATTACHMENT_UPLOAD', 'COMPLAINT_REOPEN_OWN',
        'COMPLAINT_UPDATE_STATUS', 'COMPLAINT_STATUS_OVERRIDE', 'COMPLAINT_ASSIGN', 'COMPLAINT_REASSIGN',
        'COMPLAINT_CHANGE_PRIORITY', 'COMPLAINT_SET_EXPECTED_RESOLUTION', 'COMPLAINT_ESCALATE',
        # Accept or reject a newly raised request (caretaker, warden, supervisor, admin)
        'COMPLAINT_DECIDE',
        # Add labels, link tickets and break them into sub-tasks (warden, supervisor, department head, admin)
        'COMPLAINT_ORGANISE'],
    'REQUIREMENT': ['REQUIREMENT_CREATE', 'REQUIREMENT_VIEW', 'REQUIREMENT_APPROVE'],
    'USER': ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_ACTIVATE', 'USER_DEACTIVATE', 'USER_RESET_PASSWORD'],
    'ROLE': ['ROLE_VIEW', 'ROLE_UPDATE'],
    'HOSTEL': ['HOSTEL_VIEW', 'HOSTEL_CREATE', 'HOSTEL_UPDATE'],
    'LOCATION': ['LOCATION_VIEW', 'LOCATION_MANAGE'],
    'DEPARTMENT': ['DEPARTMENT_VIEW', 'DEPARTMENT_MANAGE'],
    'CATEGORY': ['CATEGORY_VIEW', 'CATEGORY_MANAGE'],
    'REPORT': ['DASHBOARD_VIEW_ALL', 'REPORT_VIEW_ALL'],
    'AUDIT': ['AUDIT_LOG_VIEW'],
    'PROFILE': ['PROFILE_VIEW', 'PROFILE_UPDATE'],
}

ALL_PERMISSIONS = [p for perms in MODULE_PERMISSIONS.values() for p in perms]
PERMISSION_MODULE = {p: m for m, perms in MODULE_PERMISSIONS.items() for p in perms}

# Every signed-in user can manage their profile and read the reference data needed to raise a request
_BASE = ['PROFILE_VIEW', 'PROFILE_UPDATE', 'CATEGORY_VIEW', 'LOCATION_VIEW', 'DEPARTMENT_VIEW']
_REQUESTER = ['COMPLAINT_CREATE', 'COMPLAINT_VIEW_OWN', 'COMPLAINT_COMMENT', 'COMPLAINT_ATTACHMENT_UPLOAD', 'COMPLAINT_REOPEN_OWN']
_WORKER = ['COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_UPDATE_STATUS',
           'COMPLAINT_ATTACHMENT_UPLOAD', 'REQUIREMENT_CREATE', 'REQUIREMENT_VIEW']
_DEPT_MANAGER = ['COMPLAINT_VIEW_DEPARTMENT', 'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_UPDATE_STATUS',
                 'COMPLAINT_ASSIGN', 'COMPLAINT_REASSIGN', 'COMPLAINT_CHANGE_PRIORITY', 'COMPLAINT_SET_EXPECTED_RESOLUTION',
                 'COMPLAINT_ESCALATE', 'COMPLAINT_ATTACHMENT_UPLOAD', 'REQUIREMENT_VIEW', 'COMPLAINT_DECIDE',
                 'COMPLAINT_ORGANISE']

ROLE_PERMISSIONS: dict[str, list[str]] = {
    'STUDENT': _REQUESTER + _BASE,
    'FACULTY': _REQUESTER + _BASE,
    'STAFF': _REQUESTER + _BASE,
    'WARDEN': ['COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_UPDATE_STATUS',
               'COMPLAINT_ASSIGN', 'COMPLAINT_REASSIGN', 'COMPLAINT_ESCALATE', 'COMPLAINT_ATTACHMENT_UPLOAD',
               'REQUIREMENT_CREATE', 'REQUIREMENT_VIEW', 'COMPLAINT_DECIDE', 'COMPLAINT_ORGANISE'] + _BASE,
    # New hostel requests are routed to the hostel's caretakers, who accept or reject them
    'CARETAKER': _WORKER + ['COMPLAINT_DECIDE'] + _BASE,
    'TECHNICIAN': _WORKER + _BASE,
    'AUTHORITY': ['COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_UPDATE_STATUS',
                  'COMPLAINT_ESCALATE', 'COMPLAINT_ATTACHMENT_UPLOAD', 'REQUIREMENT_VIEW', 'COMPLAINT_DECIDE'] + _BASE,
    'SUPERVISOR': _DEPT_MANAGER + _BASE,
    'DEPARTMENT_HEAD': _DEPT_MANAGER + ['REQUIREMENT_APPROVE'] + _BASE,
    'STORE_MANAGER': ['REQUIREMENT_VIEW', 'REQUIREMENT_APPROVE'] + _BASE,
    'ADMIN': [p for p in ALL_PERMISSIONS if p not in ('COMPLAINT_CREATE', 'COMPLAINT_VIEW_OWN', 'COMPLAINT_REOPEN_OWN', 'ROLE_UPDATE')],
    'SUPER_ADMIN': ALL_PERMISSIONS,
}

# Only a holder of ROLE_UPDATE (Super Admin) may grant these, so an Admin cannot create another Admin
PRIVILEGED_ROLES = {'ADMIN', 'SUPER_ADMIN'}
ADMIN_ROLES = {'ADMIN', 'SUPER_ADMIN'}
# Roles that work can be assigned to
ASSIGNABLE_ROLES = {'WARDEN', 'CARETAKER', 'AUTHORITY', 'TECHNICIAN'}
# Roles whose access is limited to one department, so they must belong to one
DEPARTMENT_ROLES = {'TECHNICIAN', 'SUPERVISOR', 'DEPARTMENT_HEAD'}

ROLE_DESCRIPTIONS = {
    'STUDENT': 'Raises and tracks own requests',
    'FACULTY': 'Raises requests for offices, classrooms and laboratories',
    'STAFF': 'Raises operational and infrastructure requests',
    'WARDEN': 'Manages and oversees requests of assigned hostels',
    'CARETAKER': 'Handles hostel maintenance and assigned tasks',
    'TECHNICIAN': 'Carries out assigned jobs and records work and materials',
    'AUTHORITY': 'Specialised authority handling relevant assigned requests',
    'SUPERVISOR': 'Reviews, assigns and escalates requests of their department',
    'DEPARTMENT_HEAD': 'Oversees department operations and approves escalations',
    'STORE_MANAGER': 'Manages inventory, stock transactions and material requests',
    'ADMIN': 'Full system authority: complaints, users, hostels, reports',
    'SUPER_ADMIN': 'Admin plus the right to grant administrator roles',
}

for _role, _perms in ROLE_PERMISSIONS.items():
    _unknown = set(_perms) - set(ALL_PERMISSIONS)
    assert not _unknown, f'{_role} has permissions missing from the catalogue: {_unknown}'
    assert len(_perms) == len(set(_perms)), f'{_role} lists a permission twice'
