from app.authorization.deps import CurrentUser, load_principal
from app.authorization.scope import sees_internal
from app.models import CommentVisibility, Complaint, User
from app.schemas import (AssignmentOut, AttachmentOut, CommentOut, ComplaintDetail, ComplaintSummary, HistoryOut, HostelBrief,
                         Me, UserBrief, UserOut)
from app.services.workflow import TRANSITIONS, is_overdue


def hostel_brief(h) -> HostelBrief | None:
    return HostelBrief.model_validate(h) if h else None


def user_brief(u: User | None) -> UserBrief | None:
    return UserBrief(id=u.id, full_name=u.full_name, login_id=u.login_id) if u else None


def me(user: User) -> Me:
    p = load_principal(user)
    return Me(id=user.id, login_id=user.login_id, email=user.email, first_name=user.first_name, last_name=user.last_name,
              full_name=user.full_name, phone=user.phone, status=user.status, roles=sorted(p.roles),
              permissions=sorted(p.permissions), hostel=hostel_brief(user.hostel), room_number=user.room_number, block=user.block)


def user_out(u: User) -> UserOut:
    return UserOut(id=u.id, login_id=u.login_id, email=u.email, first_name=u.first_name, last_name=u.last_name,
                   full_name=u.full_name, phone=u.phone, status=u.status, roles=sorted(u.role_names),
                   hostel=hostel_brief(u.hostel), room_number=u.room_number, block=u.block,
                   last_login_at=u.last_login_at, created_at=u.created_at)


def _assignee_label(c: Complaint) -> str | None:
    active = c.active_assignments
    if not active:
        return None
    # Prefer the person doing the work (caretaker/authority) over the supervising warden
    for t in ('CARETAKER', 'AUTHORITY', 'ADMIN', 'WARDEN'):
        for a in reversed(active):
            if a.assignment_type.value == t:
                return a.assigned_to.full_name
    return active[-1].assigned_to.full_name


def complaint_summary(c: Complaint) -> ComplaintSummary:
    return ComplaintSummary(id=c.id, complaint_number=c.complaint_number, title=c.title, category=c.category.name,
                            status=c.status, priority=c.priority, hostel=hostel_brief(c.hostel), student=user_brief(c.student),
                            assigned_to=_assignee_label(c), is_overdue=is_overdue(c),
                            expected_resolution_at=c.expected_resolution_at, created_at=c.created_at, updated_at=c.updated_at)


def complaint_detail(c: Complaint, current: CurrentUser) -> ComplaintDetail:
    internal = sees_internal(current)
    comments = [x for x in c.comments if internal or x.visibility == CommentVisibility.STUDENT_VISIBLE]
    allowed = sorted(TRANSITIONS[c.status], key=lambda s: s.value) if current.has('COMPLAINT_UPDATE_STATUS') else []
    return ComplaintDetail(
        **complaint_summary(c).model_dump(),
        description=c.description, resolved_at=c.resolved_at, closed_at=c.closed_at,
        # Students see who is handling their complaint but not the internal assignment trail
        assignments=[AssignmentOut(id=a.id, assigned_to=user_brief(a.assigned_to), assignment_type=a.assignment_type,
                                   remarks=a.remarks if internal else None, is_active=a.is_active, assigned_at=a.assigned_at,
                                   unassigned_at=a.unassigned_at)
                     for a in c.assignments if internal or a.is_active],
        history=[HistoryOut(id=h.id, old_status=h.old_status, new_status=h.new_status, remarks=h.remarks,
                            changed_by=user_brief(h.changed_by) if internal else None, created_at=h.created_at) for h in c.history],
        comments=[CommentOut(id=x.id, comment=x.comment, visibility=x.visibility, author=user_brief(x.author), created_at=x.created_at)
                  for x in comments],
        attachments=[AttachmentOut.model_validate(a) for a in c.attachments],
        allowed_statuses=allowed,
    )
