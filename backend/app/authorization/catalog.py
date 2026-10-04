"""Permission catalogue and role mapping for the GBU Complaint Management System.

Roles follow the frontend handoff specification (Student, Warden, Caretaker, Authority, Admin) plus
Super Admin, the only role allowed to grant administrator access. Roles do not inherit from each other;
every permission a role has is listed explicitly.
"""

MODULE_PERMISSIONS: dict[str, list[str]] = {
    'COMPLAINT': [
        'COMPLAINT_CREATE', 'COMPLAINT_VIEW_OWN', 'COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_VIEW_ALL',
        'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_ATTACHMENT_UPLOAD', 'COMPLAINT_REOPEN_OWN',
        'COMPLAINT_UPDATE_STATUS', 'COMPLAINT_STATUS_OVERRIDE', 'COMPLAINT_ASSIGN', 'COMPLAINT_REASSIGN',
        'COMPLAINT_CHANGE_PRIORITY', 'COMPLAINT_SET_EXPECTED_RESOLUTION', 'COMPLAINT_ESCALATE'],
    'REQUIREMENT': ['REQUIREMENT_CREATE', 'REQUIREMENT_VIEW', 'REQUIREMENT_APPROVE'],
    'USER': ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_ACTIVATE', 'USER_DEACTIVATE', 'USER_RESET_PASSWORD'],
    'ROLE': ['ROLE_VIEW', 'ROLE_UPDATE'],
    'HOSTEL': ['HOSTEL_VIEW', 'HOSTEL_CREATE', 'HOSTEL_UPDATE'],
    'CATEGORY': ['CATEGORY_VIEW', 'CATEGORY_MANAGE'],
    'REPORT': ['DASHBOARD_VIEW_ALL', 'REPORT_VIEW_ALL'],
    'AUDIT': ['AUDIT_LOG_VIEW'],
    'PROFILE': ['PROFILE_VIEW', 'PROFILE_UPDATE'],
}

ALL_PERMISSIONS = [p for perms in MODULE_PERMISSIONS.values() for p in perms]
PERMISSION_MODULE = {p: m for m, perms in MODULE_PERMISSIONS.items() for p in perms}

_PROFILE = ['PROFILE_VIEW', 'PROFILE_UPDATE', 'CATEGORY_VIEW']

ROLE_PERMISSIONS: dict[str, list[str]] = {
    'STUDENT': ['COMPLAINT_CREATE', 'COMPLAINT_VIEW_OWN', 'COMPLAINT_COMMENT', 'COMPLAINT_ATTACHMENT_UPLOAD',
                'COMPLAINT_REOPEN_OWN'] + _PROFILE,
    'WARDEN': ['COMPLAINT_VIEW_HOSTEL', 'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_UPDATE_STATUS',
               'COMPLAINT_ASSIGN', 'COMPLAINT_REASSIGN', 'COMPLAINT_ESCALATE', 'COMPLAINT_ATTACHMENT_UPLOAD',
               'REQUIREMENT_CREATE', 'REQUIREMENT_VIEW'] + _PROFILE,
    'CARETAKER': ['COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_UPDATE_STATUS',
                  'COMPLAINT_ATTACHMENT_UPLOAD', 'REQUIREMENT_CREATE', 'REQUIREMENT_VIEW'] + _PROFILE,
    'AUTHORITY': ['COMPLAINT_VIEW_ASSIGNED', 'COMPLAINT_COMMENT', 'COMPLAINT_COMMENT_INTERNAL', 'COMPLAINT_UPDATE_STATUS',
                  'COMPLAINT_ESCALATE', 'COMPLAINT_ATTACHMENT_UPLOAD', 'REQUIREMENT_VIEW'] + _PROFILE,
    'ADMIN': [p for p in ALL_PERMISSIONS if p not in ('COMPLAINT_CREATE', 'COMPLAINT_VIEW_OWN', 'COMPLAINT_REOPEN_OWN', 'ROLE_UPDATE')],
    'SUPER_ADMIN': ALL_PERMISSIONS,
}

# Only a holder of ROLE_UPDATE (Super Admin) may grant these, so an Admin cannot create another Admin
PRIVILEGED_ROLES = {'ADMIN', 'SUPER_ADMIN'}
STAFF_ROLES = {'WARDEN', 'CARETAKER', 'AUTHORITY'}
ADMIN_ROLES = {'ADMIN', 'SUPER_ADMIN'}

ROLE_DESCRIPTIONS = {
    'STUDENT': 'Raises and tracks own complaints',
    'WARDEN': 'Manages and oversees complaints of assigned hostels',
    'CARETAKER': 'Handles hostel maintenance and assigned tasks',
    'AUTHORITY': 'Specialised authority handling relevant assigned complaints',
    'ADMIN': 'Full system authority: complaints, users, hostels, reports',
    'SUPER_ADMIN': 'Admin plus the right to grant administrator roles',
}

for _role, _perms in ROLE_PERMISSIONS.items():
    _unknown = set(_perms) - set(ALL_PERMISSIONS)
    assert not _unknown, f'{_role} has permissions missing from the catalogue: {_unknown}'
