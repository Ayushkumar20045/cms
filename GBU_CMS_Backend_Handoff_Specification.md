# GBU Complaint Management System

## Complete Frontend-to-Backend Handoff & System Specification

**Project:** Gautam Buddha University Complaint & Grievance Management
System\
**Purpose:** Backend development reference for the existing frontend and
complete system workflow\
**Document type:** Technical handoff / system specification\
**Frontend status:** UI/UX foundation completed with mock/static data\
**Backend status:** To be implemented

------------------------------------------------------------------------

# 1. Document Purpose

This document is the single reference document for the backend
developer.

It explains:

-   What the system contains
-   How the system is structured
-   How users enter the system
-   How authentication should work
-   What each role can and cannot do
-   How complaints move through the system
-   How hostel-based routing works
-   How requirements/resource requests work
-   How work history, materials, expenses and bills are recorded
-   How escalations work
-   What notifications are required
-   What database entities are required
-   What backend APIs are expected
-   What should remain frontend-only
-   What is planned for future phases
-   What the backend must eventually connect to

The backend developer should use this document together with the
existing frontend code.

------------------------------------------------------------------------

# 2. Project Overview

The GBU Complaint Management System is a centralized university platform
for managing:

-   Student complaints and grievances
-   Hostel-related complaints
-   Complaint assignment and routing
-   Warden and caretaker work
-   Specialized authority involvement
-   Complaint escalation
-   Hostel resource/requirement requests
-   Maintenance work records
-   Material usage
-   Maintenance expenditure
-   Bills and receipts
-   Complaint history
-   User and hostel management
-   Administrative monitoring
-   Notifications and email communication
-   Reports and analytics

The main objective is:

> **One platform → less paperwork → faster communication → better
> tracking → centralized records → easier hostel management.**

The system should eventually replace scattered/manual complaint handling
with a structured digital workflow.

------------------------------------------------------------------------

# 3. High-Level System Architecture

The project uses a **modular monolith** architecture.

Do NOT build microservices for the initial version.

Recommended stack:

``` text
Frontend
    |
    | HTTPS / REST API
    v
NestJS Backend
    |
    +-------------------+
    |                   |
    v                   v
Prisma ORM          Background Jobs
    |               (optional initially)
    v                   |
PostgreSQL              +---- Email
                        +---- Notifications
                        +---- Future scheduled tasks

External/Supporting Services
    |
    +---- Hostel Allocation Portal
    +---- University SSO (future)
    +---- Email Provider
    +---- S3-compatible File Storage
```

Recommended technologies:

  Layer              Technology
  ------------------ -----------------------------------------------
  Frontend           Next.js + TypeScript
  UI                 Tailwind CSS + shadcn/ui style
  Backend            NestJS + TypeScript
  Database           PostgreSQL
  ORM                Prisma
  Authentication     Backend-managed authentication/session system
  Email              Resend or equivalent provider
  File Storage       S3-compatible object storage
  Containerization   Docker
  Testing            Vitest/Jest + Playwright
  Background Jobs    Redis + BullMQ when required

------------------------------------------------------------------------

# 4. Important Architecture Decision

## Modular Monolith

The backend should be one NestJS application divided into logical
modules.

Suggested structure:

``` text
backend/
├── src/
│   ├── auth/
│   ├── users/
│   ├── students/
│   ├── staff/
│   ├── hostels/
│   ├── complaints/
│   ├── assignments/
│   ├── requirements/
│   ├── work-history/
│   ├── escalations/
│   ├── notifications/
│   ├── emails/
│   ├── files/
│   ├── reports/
│   ├── audit/
│   ├── authorities/
│   ├── common/
│   └── prisma/
│
├── test/
├── prisma/
└── Dockerfile
```

Each module should own its business logic instead of placing everything
inside one controller/service.

------------------------------------------------------------------------

# 5. Main User Roles

The system has three top-level portal choices on the landing/login page:

``` text
GBU COMPLAINT MANAGEMENT SYSTEM
            |
     +------+------+------+
     |             |      |
  STUDENT     HOSTEL STAFF ADMIN
                  |
             +----+----+
             |         |
          WARDEN   CARETAKER
```

There is also the concept of specialized authorities.

## Role hierarchy

``` text
ADMIN
  |
  +-- Full system control
  |
  +-- Warden
  |      |
  |      +-- Caretaker / Hostel Staff
  |
  +-- Specialized Authority
```

However, **Admin is a completely separate top-level portal role** from
Hostel Staff.

The frontend login currently presents:

``` text
[ Admin ] [ Hostel Staff ] [ Student ]
```

When Hostel Staff is selected:

``` text
Staff Role

[ Warden ] [ Caretaker ]
```

The selected role in the frontend is only a UX/routing choice.

The backend MUST verify the actual role stored for the authenticated
account.

Never trust a role supplied by the frontend.

------------------------------------------------------------------------

# 6. Admin Has Full System Authority

Admin is the highest-privilege role.

Admin can:

-   View all complaints
-   View complaints from every hostel
-   Assign complaints
-   Reassign complaints
-   Assign/reassign staff
-   Assign relevant authorities
-   Change complaint priority
-   Monitor complaint status
-   Override status where business rules permit
-   Handle escalations
-   Manage users
-   Manage students
-   Manage wardens
-   Manage caretakers
-   Manage authorities
-   Manage hostels
-   Assign staff to hostels
-   Review requirements
-   Approve requirements
-   Reject requirements
-   Track requirement fulfillment
-   View maintenance work records
-   View material usage
-   View expenditure
-   View bills/receipts
-   View reports
-   Manage complaint categories
-   Manage authority/contact information
-   View audit/activity records
-   Handle exceptional/correction cases

------------------------------------------------------------------------

# 7. Landing Page

The landing page is the entry point to the system.

Visual direction:

-   Professional university interface
-   GBU branding
-   Deep burgundy/maroon primary accent
-   White cards
-   Subtle borders and shadows
-   Clean typography
-   Responsive layout
-   Desktop split-screen presentation
-   University/campus visual
-   Login panel
-   Role selector

The design should avoid:

-   Excessive gradients
-   Glowing effects
-   Overdone glassmorphism
-   Flashy AI-dashboard styling
-   Unnecessary animations

The goal is a real university administration product.

------------------------------------------------------------------------

# 8. Login Flow

Top-level role selector:

``` text
[ Admin ] [ Hostel Staff ] [ Student ]
```

## Student

Student selects:

``` text
Student
    |
University Login ID
    |
Password
    |
Remember Me
    |
Sign In as Student
```

Expected backend result:

``` text
Authenticated Student
        |
        v
/student/dashboard
```

## Hostel Staff

Staff selects:

``` text
Hostel Staff
      |
      v
Staff Role
  +-------+-------+
  |               |
Warden        Caretaker
  |               |
Staff ID       Staff ID
Password       Password
```

Backend verifies actual account role.

Routing:

``` text
role = WARDEN
    -> /staff/warden/dashboard

role = CARETAKER
    -> /staff/caretaker/dashboard
```

## Admin

``` text
Admin
  |
Admin ID
  |
Password
  |
Sign In as Admin
  |
  v
/admin/dashboard
```

------------------------------------------------------------------------

# 9. Authentication Requirements

The backend must implement real authentication.

Minimum requirements:

-   Secure password hashing
-   Login endpoint
-   Session/token management
-   Logout
-   Authentication guards
-   Role-based authorization
-   Account status/active checks
-   Password reset flow
-   Optional remember-me behavior
-   Rate limiting for login
-   Input validation
-   Secure cookie/token handling

Important:

``` text
Frontend role selection
        |
        v
Backend authentication
        |
        v
Database account lookup
        |
        v
Actual stored role
        |
        v
Authorization
        |
        v
Allowed dashboard
```

The backend must NOT do:

``` text
Frontend says "admin"
       ->
Trust frontend
       ->
Give admin access
```

------------------------------------------------------------------------

# 10. Student Portal

Current frontend routes:

``` text
/student/dashboard
/student/complaints
/student/complaints/new
```

## Student Dashboard

The dashboard provides:

-   Complaint summary
-   Active complaints
-   Recent complaints
-   Complaint status
-   Raise Complaint CTA
-   My Complaints navigation
-   Profile information in top bar

Student sidebar:

``` text
MAIN
├── Dashboard
└── My Complaints
```

The Raise Complaint action is in the main dashboard area.

------------------------------------------------------------------------

# 11. Student Complaint Submission

Student can submit:

-   Complaint category
-   Complaint title
-   Description
-   Attachments

Frontend validation currently includes:

-   Required category
-   Required title
-   Optional description
-   200-word description limit
-   Multiple attachments
-   Allowed file types:
    -   Images
    -   PDF
    -   DOC
    -   DOCX
-   File validation
-   File removal before submission

Backend MUST repeat validation.

Never rely only on frontend validation.

------------------------------------------------------------------------

# 12. Student Complaint Submission Workflow

``` text
Student Login
     |
     v
Student Dashboard
     |
     v
Raise Complaint
     |
     v
Select Category
     |
     v
Enter Title + Description
     |
     v
Upload Attachments
     |
     v
Submit
     |
     v
Backend Validation
     |
     +---- invalid ----> Return validation errors
     |
     v
Create Complaint
     |
     v
Generate Complaint ID
     |
     v
Identify Student
     |
     v
Identify Student Hostel
     |
     v
Determine Initial Routing
     |
     v
Create Assignment / Routing Record
     |
     v
Send Confirmation Email
     |
     v
Return Complaint Details
```

------------------------------------------------------------------------

# 13. Hostel Information

The student's hostel should ultimately come from the university Hostel
Allocation Portal.

The student should NOT manually select their hostel during complaint
submission.

Target workflow:

``` text
Student Account
      |
      v
Hostel Allocation Information
      |
      v
Student Hostel
      |
      v
Complaint
      |
      v
Hostel-based routing
```

For MVP/backend development, actual external integration may initially
be represented by an internal mapping or placeholder integration.

Actual Hostel Allocation Portal integration is a later integration task
if API access is not available.

------------------------------------------------------------------------

# 14. Complaint ID

Every complaint must receive a unique Complaint ID.

Example:

``` text
CMP-2026-0148
```

Requirements:

-   Globally unique
-   Human-readable
-   Never reused
-   Generated server-side
-   Stored permanently
-   Used in emails and tracking

Do NOT generate official complaint IDs only on the frontend.

------------------------------------------------------------------------

# 15. Complaint Status Lifecycle

Primary lifecycle:

``` text
SUBMITTED
    |
    v
UNDER REVIEW
    |
    v
ASSIGNED
    |
    v
IN PROGRESS
    |
    v
WAITING FOR INFORMATION
    |
    v
RESOLVED
    |
    v
CLOSED
```

Exceptional states:

``` text
REJECTED
DUPLICATE
ESCALATED
REOPENED
```

The backend should enforce valid transitions.

Example:

``` text
SUBMITTED -> UNDER REVIEW
UNDER REVIEW -> ASSIGNED
ASSIGNED -> IN PROGRESS
IN PROGRESS -> WAITING FOR INFORMATION
WAITING FOR INFORMATION -> IN PROGRESS
IN PROGRESS -> RESOLVED
RESOLVED -> CLOSED
RESOLVED -> REOPENED
```

Admin may have controlled override capability.

------------------------------------------------------------------------

# 16. Complaint Routing

Core routing principle:

``` text
Student
  |
  v
Complaint
  |
  v
Student's Hostel
  |
  v
Assigned Warden
  |
  v
Assigned Caretaker / Staff
  |
  +---- specialized issue ----> Relevant Authority
```

Examples:

### Broken fan

``` text
Student
 -> Hostel
 -> Warden
 -> Caretaker
 -> Electrical Authority
```

### Dirty washroom

``` text
Student
 -> Hostel
 -> Warden
 -> Cleaning Staff
```

### Network issue

``` text
Student
 -> Hostel
 -> Warden
 -> IT / Network Authority
```

Admin can intervene/reassign at any point where permissions allow.

------------------------------------------------------------------------

# 17. Warden Responsibilities

Warden is responsible for hostel-level operations.

Warden can:

-   View hostel complaints
-   Review complaints
-   Coordinate staff
-   Assign operational work
-   Update status
-   Add remarks
-   Request additional information
-   Set expected resolution date
-   Escalate unresolved complaints
-   Verify completion
-   Raise hostel requirements
-   Monitor hostel students
-   View hostel overview
-   View complaint history

Warden should NOT see all university complaints unless Admin grants a
special capability.

------------------------------------------------------------------------

# 18. Caretaker Responsibilities

Caretaker handles operational/physical hostel work.

Caretaker can:

-   View assigned work
-   Process assigned maintenance complaints
-   Update progress
-   Add remarks
-   Request additional information
-   Request materials/equipment
-   Mark work completed
-   Submit completion information
-   Maintain work history
-   Record materials used
-   Record expenditure
-   Record bill/receipt information

Caretaker sidebar:

``` text
MAIN
├── Dashboard
├── My Assignments
├── Requirements
└── Work History
```

There is NO separate "Work History" concept to remove; it is
intentionally included because it is required for records, budget and
bills.

------------------------------------------------------------------------

# 19. Caretaker Dashboard

Current route:

``` text
/staff/caretaker/dashboard
```

Dashboard focuses on:

-   Assigned work
-   Active work
-   Waiting work
-   Completed work
-   Requirements
-   Recent assignments

Backend will eventually replace all mock data.

------------------------------------------------------------------------

# 20. My Assignments

Current route:

``` text
/staff/caretaker/assignments
```

Purpose:

> Show current and active operational work assigned to the caretaker.

Example assignment statuses:

``` text
ASSIGNED
IN PROGRESS
WAITING FOR MATERIALS
COMPLETED
```

Important distinction:

``` text
My Assignments
    =
Current / active operational work

Work History
    =
Completed work + materials + costs + bills
```

------------------------------------------------------------------------

# 21. Requirement / Resource Management

Requirements allow hostel staff to request resources.

Examples:

-   Taps
-   LED tube lights
-   Electrical equipment
-   Fans
-   Lights
-   Door locks
-   Furniture
-   PVC pipes
-   Maintenance supplies
-   Other hostel materials

Workflow:

``` text
Warden / Caretaker
        |
        v
Create Requirement
        |
        v
Item + Quantity + Reason + Hostel
        |
        v
Admin Review
        |
    +---+---+
    |       |
 Approve  Reject
    |
    v
Procurement / Fulfillment
    |
    v
FULFILLED
    |
    v
CLOSED
```

Requirement statuses:

``` text
REQUESTED
UNDER REVIEW
APPROVED
REJECTED
ORDERED
FULFILLED
CLOSED
```

------------------------------------------------------------------------

# 22. Requirement Data

A requirement should contain at least:

-   Requirement ID
-   Requested by
-   Requesting role
-   Hostel
-   Item
-   Quantity
-   Reason
-   Optional urgency
-   Status
-   Admin remarks
-   Approval/rejection reason
-   Estimated cost
-   Actual cost
-   Vendor/supplier where applicable
-   Bill/receipt
-   Created date
-   Updated date
-   Fulfilled date

Priority/urgency should NOT be automatically decided using ML.

Admin controls priority when needed.

------------------------------------------------------------------------

# 23. Work History

Current route:

``` text
/staff/caretaker/history
```

Purpose:

> Preserve completed maintenance records for operational history,
> expenditure tracking, budgeting and audit.

Each work record may contain:

``` text
Work ID
Complaint ID
Work Description
Category
Hostel
Room
Assigned Caretaker
Completed Date
Material Used
Quantity
Unit Cost
Material Cost
Other Cost
Actual Total Cost
Vendor
Bill Number
Bill/Receipt
Remarks
Completion Proof
Warden Verification
```

Example:

``` text
WRK-2026-0024
CMP-2026-0134
LED tube light replacement
Electrical
Room A-102
LED Tube Light
Quantity: 1
Material Cost: ₹420
Other Cost: ₹0
Total: ₹420
Bill: BILL-1024
```

This data is important for:

-   Maintenance records
-   Hostel expenditure
-   Budget tracking
-   Material consumption
-   Bills
-   Receipts
-   Audit
-   Monthly reports
-   Yearly reports

------------------------------------------------------------------------

# 24. Specialized Authorities

Authorities may include:

-   Electrical
-   Civil
-   Plumbing
-   IT / Network
-   Sanitation / Cleaning
-   Estate / Maintenance
-   Academic/Administrative authorities where applicable

Authority responsibilities:

-   Receive assigned specialized complaints
-   Review complaint
-   Add remarks
-   Request information
-   Update progress
-   Set expected resolution date
-   Mark work completed
-   Upload proof/documents
-   Return incorrectly assigned complaint
-   Escalate when required

For the initial architecture, authorities can be represented as staff
users with a specialized authority type/department rather than requiring
an entirely separate application.

------------------------------------------------------------------------

# 25. Escalation Workflow

Initial escalation should be manual.

Example:

``` text
Complaint
   |
   v
Warden
   |
   | Cannot resolve
   v
Escalate
   |
   v
Admin
   |
   v
Relevant Authority
   |
   v
Resolution
```

Automatic due-date escalation is a future feature.

Escalation record should contain:

-   Escalation ID
-   Complaint ID
-   Raised by
-   Escalated from
-   Escalated to
-   Reason
-   Remarks
-   Date/time
-   Status
-   Resolution information

Possible statuses:

``` text
OPEN
IN REVIEW
ASSIGNED
RESOLVED
CLOSED
```

------------------------------------------------------------------------

# 26. Admin Portal

Current route:

``` text
/admin/dashboard
```

Admin sidebar:

``` text
MAIN
├── Dashboard
├── Complaints
├── Requirements
└── Escalations

MANAGEMENT
├── Users
├── Hostels
└── Reports
```

Admin dashboard contains:

-   Total complaints
-   Pending complaints
-   In-progress complaints
-   Resolved complaints
-   Overdue complaints
-   Recent complaints
-   Active escalations
-   Pending requirements
-   Hostel overview
-   Complaint distribution
-   Quick management links
-   Recent requirement requests
-   Backend data integration notice during prototype stage

------------------------------------------------------------------------

# 27. Admin Dashboard Responsibilities

The dashboard is primarily a monitoring and governance dashboard.

Admin should be able to eventually:

``` text
View
  |
Manage
  |
Assign
  |
Reassign
  |
Approve
  |
Reject
  |
Escalate
  |
Monitor
  |
Report
```

The frontend currently uses mock values.

The backend must provide live values.

------------------------------------------------------------------------

# 28. Admin Complaint Management

Admin complaint capabilities:

-   View all complaints
-   Search
-   Filter
-   View complaint history
-   View attachments
-   View current assignment
-   Assign Warden
-   Assign Caretaker/Staff
-   Assign authority
-   Reassign
-   Change priority
-   Update status
-   Add administrative remarks
-   Escalate
-   Close where appropriate
-   Reopen where appropriate
-   View expected resolution
-   View actual resolution
-   View all activity

------------------------------------------------------------------------

# 29. Admin User Management

Admin should eventually manage:

``` text
Students
Wardens
Caretakers
Hostel Staff
Authorities
Administrators
```

User operations:

-   Create
-   View
-   Update
-   Activate
-   Deactivate
-   Assign role
-   Assign hostel
-   Assign department/authority
-   Reset password where permitted

Do not allow users to elevate their own role.

------------------------------------------------------------------------

# 30. Hostel Management

Admin manages:

-   Hostel records
-   Hostel name
-   Hostel code
-   Hostel capacity where required
-   Hostel status
-   Warden assignment
-   Caretaker/staff assignment
-   Student allocation references
-   Hostel contact details

Relationship:

``` text
Hostel
 |
 +---- Warden
 |
 +---- Caretakers / Staff
 |
 +---- Students
 |
 +---- Complaints
 |
 +---- Requirements
 |
 +---- Work History
```

------------------------------------------------------------------------

# 31. Complaint History

Complaint history must not be stored only as one mutable status.

Use a separate history table.

Example:

``` text
Complaint
   |
   +-- Status History
   +-- Comments
   +-- Assignments
   +-- Attachments
   +-- Notifications
   +-- Escalations
```

Every important change should create a history/activity record.

Example:

``` text
02 Oct 10:00
Complaint submitted

02 Oct 10:03
Complaint assigned to Warden

02 Oct 11:10
Warden assigned caretaker

02 Oct 13:20
Caretaker marked In Progress

03 Oct 09:30
Expected resolution updated

03 Oct 16:00
Complaint marked Resolved
```

------------------------------------------------------------------------

# 32. Notification System

Required notification events:

## Student

-   Complaint registered
-   Complaint ID generated
-   Complaint assigned
-   Status changed
-   Additional information requested
-   Follow-up reminder
-   Expected resolution reminder
-   Overdue notice
-   Complaint resolved
-   Complaint closed
-   Complaint reopened

## Warden

-   New hostel complaint
-   Reassignment
-   Student added information
-   Caretaker update
-   Overdue complaint
-   Escalation
-   Requirement request

## Caretaker

-   New assignment
-   Additional information
-   Requirement approved/rejected
-   Warden remarks
-   Reassignment

## Authority

-   New specialized complaint
-   Additional information
-   Escalation
-   Expected resolution reminder

## Admin

-   Escalation
-   Overdue complaint
-   Requirement requiring approval
-   Important system events

------------------------------------------------------------------------

# 33. Email Events

Email should eventually be sent for:

``` text
Complaint Created
Complaint Assigned
Status Changed
Information Requested
Reminder
Expected Resolution Reminder
Overdue
Resolved
Closed
Reopened
Requirement Approved
Requirement Rejected
Escalation
```

Email logs should be stored.

Recommended email log fields:

-   Email ID
-   Recipient
-   Subject
-   Event type
-   Related entity
-   Status
-   Provider message ID
-   Sent timestamp
-   Failure reason if failed

------------------------------------------------------------------------

# 34. File Attachments

Attachments are required for complaints and may later be required for:

-   Bills
-   Receipts
-   Completion proof
-   Supporting documents
-   Requirement documents

Recommended architecture:

``` text
Frontend
   |
   v
NestJS
   |
   v
File validation
   |
   v
S3-compatible object storage
   |
   v
File metadata in PostgreSQL
```

Database stores metadata, not large binary files.

File metadata:

-   File ID
-   Original filename
-   Stored key/path
-   MIME type
-   Size
-   Uploaded by
-   Related entity
-   Related entity ID
-   Created timestamp

Backend must validate:

-   MIME type
-   File extension
-   File size
-   Number of files
-   Authorization

------------------------------------------------------------------------

# 35. Core Database Entities

Recommended initial entities:

``` text
User
Student
Staff
Hostel
Department
Authority
Complaint
ComplaintCategory
ComplaintAssignment
ComplaintStatusHistory
ComplaintComment
ComplaintAttachment
Notification
EmailLog
Feedback
Escalation
RequirementTicket
RequirementItem / RequirementRecord
WorkHistory
WorkMaterial
Expense
Bill / Receipt
AuditLog
```

Some of these can be merged if the final Prisma design makes more sense,
but the relationships must remain available.

------------------------------------------------------------------------

# 36. Suggested Core Relationships

``` text
User
 |
 +---- Student
 |
 +---- Staff
        |
        +---- Warden
        +---- Caretaker
        +---- Authority
        +---- Admin


Hostel
 |
 +---- Students
 +---- Staff
 +---- Complaints
 +---- Requirements
 +---- Work History


Student
 |
 +---- Complaints


Complaint
 |
 +---- Category
 +---- Student
 +---- Hostel
 +---- Assignments
 +---- Status History
 +---- Comments
 +---- Attachments
 +---- Notifications
 +---- Escalations
 +---- Work History


Requirement
 |
 +---- Hostel
 +---- Requested By
 +---- Approval
 +---- Fulfillment
 +---- Expenses
 +---- Bills


Work History
 |
 +---- Complaint
 +---- Caretaker
 +---- Materials
 +---- Expenses
 +---- Bills
```

------------------------------------------------------------------------

# 37. Suggested User Model

A central `User` entity is recommended.

Example conceptual fields:

``` text
id
email / login identifier
passwordHash
role
status
firstName
lastName
phone
createdAt
updatedAt
lastLoginAt
```

Role enum may contain:

``` text
ADMIN
STUDENT
WARDEN
CARETAKER
AUTHORITY
```

If authority specialization is required, keep it as a separate
department/type rather than creating dozens of roles.

------------------------------------------------------------------------

# 38. Suggested Student Entity

``` text
id
userId
studentId
departmentId
hostelId
roomNumber
universityEmail
phone
createdAt
updatedAt
```

Hostel should be linked from allocation data.

------------------------------------------------------------------------

# 39. Suggested Staff Entity

``` text
id
userId
staffId
staffType
hostelId
departmentId
isActive
createdAt
updatedAt
```

Possible staff types:

``` text
WARDEN
CARETAKER
AUTHORITY
```

Admin should be represented by the User role.

------------------------------------------------------------------------

# 40. Suggested Complaint Entity

Conceptual fields:

``` text
id
complaintNumber
studentId
hostelId
categoryId
title
description
status
priority
expectedResolutionAt
resolvedAt
closedAt
createdAt
updatedAt
```

Priority is controlled by Admin.

Possible priority:

``` text
LOW
MEDIUM
HIGH
URGENT
```

Do not automatically assign priority using AI/ML in the MVP.

------------------------------------------------------------------------

# 41. Complaint Assignment Entity

A complaint can have multiple assignment records over its lifetime.

Fields:

``` text
id
complaintId
assignedBy
assignedTo
assignmentType
assignedAt
unassignedAt
remarks
isActive
```

Assignment type could represent:

``` text
WARDEN
CARETAKER
AUTHORITY
ADMIN
```

This preserves assignment history.

------------------------------------------------------------------------

# 42. Complaint Status History

Fields:

``` text
id
complaintId
oldStatus
newStatus
changedBy
remarks
createdAt
```

This is required for audit/history.

------------------------------------------------------------------------

# 43. Complaint Comments

Fields:

``` text
id
complaintId
authorId
comment
visibility
createdAt
updatedAt
```

Possible visibility:

``` text
INTERNAL
STUDENT_VISIBLE
```

The exact visibility model can be finalized during backend
implementation.

------------------------------------------------------------------------

# 44. Complaint Categories

Examples:

``` text
Electrical
Plumbing
Maintenance
Furniture
Cleaning
Water Supply
Internet / Network
Security
Other
```

Categories should ideally be database-managed by Admin rather than
hard-coded permanently.

------------------------------------------------------------------------

# 45. Requirement Entity

Conceptual fields:

``` text
id
requirementNumber
hostelId
requestedBy
item
quantity
reason
status
estimatedCost
approvedCost
actualCost
adminRemarks
rejectionReason
requestedAt
approvedAt
fulfilledAt
closedAt
```

------------------------------------------------------------------------

# 46. Work History Entity

Conceptual fields:

``` text
id
workNumber
complaintId
hostelId
caretakerId
description
category
roomNumber
startedAt
completedAt
remarks
wardenVerifiedAt
wardenVerifiedBy
createdAt
updatedAt
```

Related tables:

``` text
WorkMaterial
Expense
Bill
Attachment
```

------------------------------------------------------------------------

# 47. Work Material Entity

``` text
id
workHistoryId
itemName
quantity
unit
unitCost
totalCost
createdAt
```

Example:

``` text
LED Tube Light
Quantity: 2
Unit Cost: ₹420
Total: ₹840
```

------------------------------------------------------------------------

# 48. Expense Entity

``` text
id
workHistoryId
requirementId
description
amount
expenseType
incurredAt
createdBy
```

Expense type examples:

``` text
MATERIAL
TRANSPORT
LABOUR
OTHER
```

------------------------------------------------------------------------

# 49. Bill / Receipt Entity

``` text
id
workHistoryId
requirementId
billNumber
vendor
amount
purchaseDate
attachmentId
createdAt
```

This supports future budget and audit reporting.

------------------------------------------------------------------------

# 50. Escalation Entity

``` text
id
complaintId
raisedBy
fromUserId
toUserId
reason
status
remarks
createdAt
resolvedAt
```

------------------------------------------------------------------------

# 51. Notification Entity

``` text
id
userId
type
title
message
relatedEntityType
relatedEntityId
isRead
createdAt
readAt
```

This supports future in-app notifications.

The current frontend intentionally does not require a notification icon
on every portal. Backend should still support notifications because the
system requires event communication.

------------------------------------------------------------------------

# 52. Audit Log

Admin-level systems should maintain an audit trail.

Record:

``` text
id
actorUserId
action
entityType
entityId
oldValue
newValue
ipAddress
userAgent
createdAt
```

Examples:

``` text
ADMIN_CHANGED_PRIORITY
ADMIN_REASSIGNED_COMPLAINT
WARDEN_ASSIGNED_CARETAKER
CARETAKER_UPDATED_STATUS
ADMIN_APPROVED_REQUIREMENT
ADMIN_CHANGED_HOSTEL_ASSIGNMENT
```

Do not store sensitive credentials in audit logs.

------------------------------------------------------------------------

# 53. Permission Matrix

  Capability                 Admin         Warden       Caretaker   Authority       Student
  ------------------------ ------- -------------- --------------- ----------- -------------
  View all complaints          Yes             No              No          No            No
  View hostel complaints       Yes            Yes        Assigned    Relevant           Own
  Submit complaint           Yes\*             No              No          No           Yes
  Change priority              Yes             No              No          No            No
  Assign staff                 Yes        Limited              No          No            No
  Update status                Yes            Yes             Yes         Yes            No
  Add remarks                  Yes            Yes             Yes         Yes       Limited
  Request information          Yes            Yes             Yes         Yes       Respond
  Resolve complaint            Yes            Yes   Work complete         Yes            No
  Escalate                     Yes            Yes         Limited         Yes            No
  Manage users                 Yes             No              No          No            No
  Manage hostels               Yes             No              No          No            No
  Requirement request          Yes            Yes             Yes    Relevant            No
  Approve requirements         Yes             No              No          No            No
  View work history            Yes         Hostel    Own/assigned    Relevant            No
  View expenditure             Yes         Hostel     Own records    Relevant            No
  Manage categories            Yes             No              No          No            No
  Manage authorities           Yes             No              No          No            No
  Reports                      Yes   Hostel-level         Limited     Limited   Own history

`*` Admin may create records for administrative purposes if the final
business rules allow it.

------------------------------------------------------------------------

# 54. API Design

Use REST APIs initially.

Suggested prefix:

``` text
/api/v1
```

## Authentication

``` text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

------------------------------------------------------------------------

# 55. Student APIs

``` text
GET    /api/v1/students/me
GET    /api/v1/students/me/complaints

POST   /api/v1/complaints
GET    /api/v1/complaints/:id

POST   /api/v1/complaints/:id/attachments
POST   /api/v1/complaints/:id/comments
POST   /api/v1/complaints/:id/reopen
```

------------------------------------------------------------------------

# 56. Staff APIs

``` text
GET    /api/v1/staff/me
GET    /api/v1/staff/me/assignments
GET    /api/v1/staff/me/work-history

PATCH  /api/v1/complaints/:id/status
POST   /api/v1/complaints/:id/comments
POST   /api/v1/complaints/:id/request-information

POST   /api/v1/requirements
GET    /api/v1/requirements
GET    /api/v1/requirements/:id
```

Warden-specific operations:

``` text
POST   /api/v1/complaints/:id/assign
POST   /api/v1/complaints/:id/escalate
```

------------------------------------------------------------------------

# 57. Admin APIs

``` text
GET    /api/v1/admin/dashboard

GET    /api/v1/admin/complaints
GET    /api/v1/admin/complaints/:id
PATCH  /api/v1/admin/complaints/:id
POST   /api/v1/admin/complaints/:id/assign
POST   /api/v1/admin/complaints/:id/reassign

GET    /api/v1/admin/requirements
PATCH  /api/v1/admin/requirements/:id
POST   /api/v1/admin/requirements/:id/approve
POST   /api/v1/admin/requirements/:id/reject

GET    /api/v1/admin/escalations
PATCH  /api/v1/admin/escalations/:id

GET    /api/v1/admin/users
POST   /api/v1/admin/users
PATCH  /api/v1/admin/users/:id

GET    /api/v1/admin/hostels
POST   /api/v1/admin/hostels
PATCH  /api/v1/admin/hostels/:id

GET    /api/v1/admin/reports
```

These are suggested API contracts; exact endpoints can be refined during
implementation.

------------------------------------------------------------------------

# 58. API Response Pattern

Use a consistent response structure.

Successful response example:

``` json
{
  "success": true,
  "data": {},
  "message": "Complaint created successfully"
}
```

Error response:

``` json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

Use proper HTTP status codes.

Examples:

``` text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

------------------------------------------------------------------------

# 59. Backend Validation

Every important request must be validated on the backend.

Validate:

-   Required fields
-   String lengths
-   Allowed enum values
-   File size/type
-   IDs
-   Authorization
-   Ownership
-   Status transitions
-   Quantity
-   Monetary amounts
-   Dates
-   Duplicate actions

Use NestJS DTOs and validation pipes.

Recommended:

``` text
class-validator
class-transformer
```

------------------------------------------------------------------------

# 60. Business Rules

Important rules:

### Complaint

-   Student can only view their own complaints.
-   Student cannot modify another student's complaint.
-   Complaint ID is server-generated.
-   Hostel is derived from authenticated student/allocation data.
-   Student cannot manually assign staff.
-   Student cannot change official complaint status.
-   Backend validates all status changes.
-   Admin can perform controlled overrides.

### Staff

-   Warden can access complaints belonging to assigned hostel(s).
-   Caretaker can access assigned work.
-   Caretaker cannot see every university complaint.
-   Authority can access relevant assigned complaints.
-   Staff cannot elevate their own privileges.

### Admin

-   Admin has full system visibility.
-   Admin controls user/staff/hostel mappings.
-   Admin controls priority.
-   Admin approves requirements.
-   Admin can intervene in escalations.

### Requirements

-   Requirement must have a requester and hostel.
-   Approval should record approving admin.
-   Rejection should record reason.
-   Fulfillment should record actual quantity/cost where applicable.

### Work History

-   Work history should normally be created from completed operational
    work.
-   Material usage must be linked to a work record.
-   Expenses must be auditable.
-   Bills/receipts must be linked to the corresponding
    expense/work/requirement.

------------------------------------------------------------------------

# 61. Transactions

Use PostgreSQL transactions through Prisma for multi-step operations.

Example complaint submission:

``` text
BEGIN TRANSACTION

Create complaint
Create complaint number
Create assignment/routing
Create initial status history
Create notification record

COMMIT
```

If one critical step fails, rollback the transaction.

Do not create a complaint successfully while silently failing to create
essential routing/history records.

------------------------------------------------------------------------

# 62. Complaint Submission Transaction

Recommended backend sequence:

``` text
1. Authenticate user
2. Verify student role
3. Load student
4. Load current hostel
5. Validate complaint payload
6. Validate category
7. Generate complaint number
8. Create complaint
9. Determine warden
10. Create initial assignment
11. Create status history
12. Create attachment metadata
13. Create notification
14. Commit
15. Queue email
16. Return complaint
```

Email sending should preferably happen asynchronously after the database
transaction succeeds.

------------------------------------------------------------------------

# 63. Automatic Hostel Routing

Initial routing should be deterministic.

``` text
Student
  |
  v
Student.hostelId
  |
  v
Hostel
  |
  v
Assigned Warden
  |
  v
Warden / Staff
```

Admin must be able to maintain:

``` text
Hostel -> Warden
Hostel -> Caretaker(s)
```

If no warden/staff is assigned, the complaint should not disappear.

Instead:

``` text
No active assignment
       |
       v
Admin attention queue
       |
       v
Admin assigns
```

------------------------------------------------------------------------

# 64. Authority Routing

Authority routing should initially be rule/configuration based.

Example:

``` text
Category = Electrical
        |
        v
Electrical Authority

Category = Plumbing
        |
        v
Plumbing Authority

Category = IT
        |
        v
IT / Network Authority
```

Do not implement AI categorization in the MVP.

------------------------------------------------------------------------

# 65. Notifications Architecture

Recommended:

``` text
Business Event
     |
     v
Notification Service
     |
     +---- Database notification
     |
     +---- Email job
     |
     +---- Future real-time notification
```

Redis/BullMQ can be introduced when asynchronous jobs become necessary.

------------------------------------------------------------------------

# 66. Email Architecture

``` text
Business Event
      |
      v
Email Service
      |
      v
Queue
      |
      v
Resend / Email Provider
      |
      v
Email Log
```

Do not block the main complaint API request unnecessarily while waiting
for an external email provider.

------------------------------------------------------------------------

# 67. Frontend vs Backend Responsibilities

## Frontend

Responsible for:

-   UI
-   Navigation
-   Form presentation
-   Client-side validation for user experience
-   Loading states
-   Error presentation
-   Responsive design
-   Role-specific layout
-   API calls
-   Displaying backend data

## Backend

Responsible for:

-   Authentication
-   Authorization
-   Database
-   Business rules
-   Validation
-   Complaint routing
-   Assignment
-   Status transitions
-   Priority control
-   Requirements
-   Work history
-   Expenses
-   Bills
-   Notifications
-   Emails
-   Audit logs
-   File authorization
-   Reports
-   Data integrity

Never implement security-critical rules only in the frontend.

------------------------------------------------------------------------

# 68. Current Frontend State

The frontend has already established these screens.

## Student

``` text
/student/dashboard
/student/complaints
/student/complaints/new
```

## Caretaker

``` text
/staff/caretaker/dashboard
/staff/caretaker/assignments
/staff/caretaker/requirements
/staff/caretaker/history
```

## Admin

``` text
/admin/dashboard
```

The other Admin/Warden pages are intentionally not being fully
implemented with mock behavior yet.

------------------------------------------------------------------------

# 69. Why Remaining Pages Should Wait

The frontend should NOT create dozens of static pages before the
backend.

Reason:

``` text
Mock frontend
    |
    v
Backend design
    |
    v
API mismatch
    |
    v
Rewrite frontend
```

Instead:

``` text
Frontend foundation
    |
    v
Backend
    |
    v
Real APIs
    |
    v
Remaining pages
    |
    v
Connect directly to real data
```

This reduces duplicate work.

------------------------------------------------------------------------

# 70. Current Mock Data Rule

The current frontend contains demonstration data such as:

``` text
CMP-2026-0148
CMP-2026-0147
REQ-2026-0042
WRK-2026-0024
```

These are UI demonstration records only.

They are NOT the actual database records.

Backend developer must not assume these records exist in production.

------------------------------------------------------------------------

# 71. Future Features

The following are intentionally deferred:

-   Chatbot
-   Authority chatbot/search assistant
-   RAG over university documents
-   AI complaint categorization
-   AI priority prediction
-   Automated escalation rules
-   SMS notifications
-   Advanced real-time notifications
-   Actual Hostel Allocation Portal integration
-   University SSO
-   PWA/mobile application
-   Advanced analytics
-   Advanced reporting
-   Automated budget forecasting

Architecture should leave room for these without implementing them now.

------------------------------------------------------------------------

# 72. Chatbot Future Architecture

Future:

``` text
Student
  |
  v
Chatbot
  |
  +---- Authority directory
  |
  +---- University documents
  |
  +---- RAG
  |
  v
Relevant authority/contact information
```

The current backend should therefore maintain clean authority/contact
data.

------------------------------------------------------------------------

# 73. Reporting Requirements

Admin reports can eventually include:

### Complaints

-   Total complaints
-   Complaints by hostel
-   Complaints by category
-   Complaints by status
-   Average resolution time
-   Overdue complaints
-   Escalated complaints

### Requirements

-   Requests by hostel
-   Approved/rejected requests
-   Fulfillment status
-   Requirement expenditure

### Maintenance

-   Completed work
-   Materials used
-   Expenditure
-   Bills
-   Monthly expenditure
-   Hostel-wise expenditure

------------------------------------------------------------------------

# 74. Budget / Expenditure Architecture

The project should eventually support:

``` text
Hostel
  |
  +-- Requirements
  |
  +-- Work History
          |
          +-- Materials
          +-- Expenses
          +-- Bills
```

This enables:

``` text
Monthly Hostel Expenditure
Yearly Hostel Expenditure
Category-wise Spending
Material Consumption
Budget vs Actual
```

Do not build sophisticated accounting software in the MVP.

The first goal is reliable record keeping.

------------------------------------------------------------------------

# 75. Security Requirements

Minimum security requirements:

-   Password hashing
-   Secure authentication
-   Role-based authorization
-   Resource-level authorization
-   Input validation
-   Rate limiting
-   CORS configuration
-   Secure cookies/tokens
-   File upload restrictions
-   SQL injection protection through Prisma
-   Audit logs
-   No password logging
-   No sensitive data in URLs unnecessarily
-   Proper error handling
-   Environment variables for secrets
-   Production HTTPS
-   Secure database credentials

------------------------------------------------------------------------

# 76. Environment Variables

Example:

``` env
DATABASE_URL=
AUTH_SECRET=
APP_URL=
FRONTEND_URL=

RESEND_API_KEY=
EMAIL_FROM=

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

REDIS_URL=
```

Never commit real credentials.

Use `.env.example`.

------------------------------------------------------------------------

# 77. Prisma

Prisma should be used for:

-   Schema
-   Migrations
-   Relations
-   Queries
-   Transactions
-   Type-safe database access

Suggested:

``` text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
```

Do not manually maintain SQL schema separately from Prisma unless a
specific migration requires it.

------------------------------------------------------------------------

# 78. PostgreSQL

PostgreSQL is the actual relational database.

Important distinction:

``` text
SQL
=
Database query language

PostgreSQL
=
Database management system

Prisma
=
ORM used by NestJS to communicate with PostgreSQL
```

The project should use:

``` text
NestJS
   |
Prisma
   |
PostgreSQL
```

------------------------------------------------------------------------

# 79. Suggested Backend Module Breakdown

``` text
AuthModule
UserModule
StudentModule
StaffModule
HostelModule
ComplaintModule
AssignmentModule
RequirementModule
WorkHistoryModule
EscalationModule
AuthorityModule
NotificationModule
EmailModule
FileModule
ReportModule
AuditModule
PrismaModule
```

Avoid unnecessary modules if they add complexity without business value.

------------------------------------------------------------------------

# 80. Suggested NestJS Request Flow

``` text
HTTP Request
     |
     v
Controller
     |
     v
DTO Validation
     |
     v
Auth Guard
     |
     v
Role / Permission Guard
     |
     v
Service
     |
     v
Business Rules
     |
     v
Prisma
     |
     v
PostgreSQL
     |
     v
Response
```

------------------------------------------------------------------------

# 81. Error Handling

Use centralized exception handling.

Do not expose:

-   Stack traces
-   Database errors
-   Secrets
-   Internal paths
-   Password information

Production response should be understandable and safe.

------------------------------------------------------------------------

# 82. Testing Requirements

Backend should eventually have tests for:

## Authentication

-   Valid login
-   Invalid password
-   Disabled account
-   Role authorization
-   Unauthorized access

## Complaints

-   Create complaint
-   Generate complaint number
-   Hostel routing
-   Assignment
-   Status transitions
-   Reopen
-   Escalation
-   Access control

## Requirements

-   Create
-   Approve
-   Reject
-   Fulfill
-   Permission checks

## Work History

-   Create completed work
-   Add material
-   Add expense
-   Add bill
-   Calculate totals
-   Access control

## Admin

-   User management
-   Hostel management
-   Assignment
-   Priority
-   Reports

------------------------------------------------------------------------

# 83. Development Phases

## Phase 1 --- Backend Foundation

``` text
NestJS setup
PostgreSQL
Prisma
Environment configuration
Docker
Global validation
Error handling
Logging
```

## Phase 2 --- Authentication

``` text
Users
Passwords
Login
Logout
Sessions/tokens
Roles
Authorization
```

## Phase 3 --- Hostel/User Management

``` text
Students
Staff
Hostels
Warden mappings
Caretaker mappings
Authorities
```

## Phase 4 --- Complaint System

``` text
Categories
Create complaint
Complaint ID
Routing
Assignments
Status history
Comments
Attachments
```

## Phase 5 --- Requirements

``` text
Create requirement
Admin review
Approval/rejection
Fulfillment
Costs
Bills
```

## Phase 6 --- Work History

``` text
Completed work
Materials
Expenses
Bills
Warden verification
```

## Phase 7 --- Escalations

``` text
Manual escalation
Admin intervention
Authority assignment
History
```

## Phase 8 --- Notifications

``` text
Notification records
Email service
Email templates
Email logs
Background jobs
```

## Phase 9 --- Reports

``` text
Complaint analytics
Hostel analytics
Maintenance expenditure
Requirement reports
```

## Phase 10 --- Frontend Integration

Replace frontend mock data with real API calls.

------------------------------------------------------------------------

# 84. Frontend Integration Strategy

Do not rewrite the frontend pages.

Instead:

``` text
Current mock data
      |
      v
Replace with API service
      |
      v
Backend response
      |
      v
Existing UI
```

For example:

Current:

``` tsx
const complaints = [...]
```

Eventually:

``` text
GET /api/v1/students/me/complaints
```

Then map response to the existing UI model.

------------------------------------------------------------------------

# 85. API Client Recommendation

Frontend should eventually centralize API calls.

Example:

``` text
frontend/src/lib/api/
├── client.ts
├── auth.ts
├── complaints.ts
├── requirements.ts
├── staff.ts
├── admin.ts
└── reports.ts
```

Do not scatter raw `fetch()` calls throughout every component.

------------------------------------------------------------------------

# 86. Backend-to-Frontend Mapping

``` text
Student Dashboard
    -> GET student summary

My Complaints
    -> GET student complaints

Raise Complaint
    -> POST complaint

Caretaker Dashboard
    -> GET assigned work summary

My Assignments
    -> GET caretaker assignments

Requirements
    -> GET/create requirements

Work History
    -> GET caretaker work history

Admin Dashboard
    -> GET admin dashboard summary

Admin Complaints
    -> GET admin complaints

Admin Requirements
    -> GET admin requirements

Admin Escalations
    -> GET admin escalations

Admin Users
    -> GET/manage users

Admin Hostels
    -> GET/manage hostels

Admin Reports
    -> GET report data
```

------------------------------------------------------------------------

# 87. Important Status Ownership

Status changes must depend on role.

Example:

``` text
Student
    -> submits
    -> responds to information request
    -> can request reopen

Warden
    -> review
    -> assign
    -> progress
    -> escalate
    -> verify

Caretaker
    -> work progress
    -> work completed

Authority
    -> specialized progress
    -> resolution

Admin
    -> full oversight
    -> controlled override
```

Backend must enforce this.

------------------------------------------------------------------------

# 88. Complaint Resolution Flow

Complete example:

``` text
Student reports water leakage
            |
            v
CMP-2026-XXXX created
            |
            v
Student hostel identified
            |
            v
Warden assigned
            |
            v
Warden reviews
            |
            v
Caretaker assigned
            |
            v
Caretaker starts work
            |
            v
IN PROGRESS
            |
            v
Pipe/material required
            |
            v
Requirement created
            |
            v
Admin reviews requirement
            |
            v
Approved
            |
            v
Material received
            |
            v
Caretaker completes repair
            |
            v
Work History record created
            |
            +---- Material record
            +---- Expense
            +---- Bill
            |
            v
Warden verifies
            |
            v
RESOLVED
            |
            v
Student notified
            |
            v
CLOSED
```

------------------------------------------------------------------------

# 89. Important Data Integrity Rules

The backend must preserve relationships.

Examples:

-   Complaint must belong to a real student.
-   Student must have valid hostel mapping.
-   Assignment must reference a valid user.
-   Caretaker assignment must be allowed for the relevant hostel.
-   Requirement must belong to a valid hostel.
-   Work history should reference a valid complaint where applicable.
-   Expense must reference its source record.
-   Bill must reference an expense/requirement/work record.
-   Deleted users should generally be soft-deactivated instead of
    hard-deleted if historical records depend on them.

------------------------------------------------------------------------

# 90. Soft Delete / Deactivation

For important entities, prefer deactivation where historical records
must remain.

Examples:

``` text
User -> isActive
Hostel -> isActive
Category -> isActive
Authority -> isActive
```

Do not delete historical records simply because an employee leaves.

Historical complaints must still show who handled them.

------------------------------------------------------------------------

# 91. Date and Time

Backend should store timestamps consistently, preferably UTC.

Frontend converts timestamps to the appropriate display timezone.

Use ISO-compatible API values.

Important timestamps:

``` text
createdAt
updatedAt
assignedAt
expectedResolutionAt
resolvedAt
closedAt
escalatedAt
approvedAt
fulfilledAt
completedAt
```

------------------------------------------------------------------------

# 92. Monetary Values

Do not use floating-point arithmetic for financial values.

Prefer integer minor units or PostgreSQL decimal/numeric.

Example:

``` text
amount = Decimal
```

Keep:

``` text
estimatedCost
approvedCost
actualCost
materialCost
otherCost
totalCost
```

consistent.

------------------------------------------------------------------------

# 93. Search and Filtering

Eventually support server-side filtering for large datasets.

Examples:

``` text
Complaint ID
Student
Hostel
Category
Status
Priority
Assigned staff
Date range
```

Do not load thousands of records into the browser unnecessarily.

------------------------------------------------------------------------

# 94. Pagination

The current frontend intentionally avoids fake pagination.

Backend should eventually provide real pagination.

Example:

``` text
GET /api/v1/admin/complaints?page=1&limit=20
```

Response:

``` json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 148,
    "totalPages": 8
  }
}
```

------------------------------------------------------------------------

# 95. What NOT to Build Yet

Do not prematurely build:

-   Chatbot
-   AI classification
-   AI priority
-   RAG
-   SMS
-   Mobile application
-   PWA
-   Automated escalation
-   Advanced accounting
-   Complex procurement system
-   Microservices
-   Event-driven distributed architecture

First make the core complaint system reliable.

------------------------------------------------------------------------

# 96. MVP Definition

The MVP is complete when:

``` text
Student
  |
  +-- Login
  +-- Submit complaint
  +-- Receive complaint ID
  +-- Track complaint
  +-- Receive status communication

Warden
  |
  +-- See hostel complaints
  +-- Assign/process work
  +-- Update status
  +-- Escalate
  +-- Create requirements

Caretaker
  |
  +-- See assignments
  +-- Update work
  +-- Request materials
  +-- Maintain work history
  +-- Record expenses/bills

Admin
  |
  +-- Full complaint visibility
  +-- Assign/reassign
  +-- Manage users
  +-- Manage hostels
  +-- Approve requirements
  +-- Handle escalations
  +-- View reports
```

------------------------------------------------------------------------

# 97. Definition of Done

Backend MVP is considered done when:

-   Authentication works
-   Authorization works
-   Roles are enforced server-side
-   Student data is protected
-   Hostel mapping works
-   Complaint creation works
-   Complaint IDs are generated
-   Complaint routing works
-   Assignments work
-   Status history works
-   Comments work
-   Attachments work
-   Requirements work
-   Admin approval works
-   Escalation works
-   Work history works
-   Materials can be recorded
-   Expenses can be recorded
-   Bills can be recorded
-   Email events work
-   Audit logs work
-   Database migrations work
-   API validation works
-   Error handling works
-   Core tests pass
-   Frontend can consume live APIs

------------------------------------------------------------------------

# 98. Backend Developer Checklist

## Foundation

-   [ ] Create NestJS application
-   [ ] Configure PostgreSQL
-   [ ] Configure Prisma
-   [ ] Configure `.env`
-   [ ] Add Docker
-   [ ] Add global validation
-   [ ] Add exception handling
-   [ ] Add logging

## Authentication

-   [ ] User model
-   [ ] Password hashing
-   [ ] Login
-   [ ] Logout
-   [ ] Session/token
-   [ ] Role guard
-   [ ] Permission guard
-   [ ] Password reset
-   [ ] Rate limiting

## Users/Hostels

-   [ ] Student
-   [ ] Staff
-   [ ] Warden
-   [ ] Caretaker
-   [ ] Authority
-   [ ] Admin
-   [ ] Hostel
-   [ ] Hostel assignments

## Complaints

-   [ ] Categories
-   [ ] Create
-   [ ] Complaint ID
-   [ ] Hostel routing
-   [ ] Assignment
-   [ ] Status workflow
-   [ ] History
-   [ ] Comments
-   [ ] Attachments
-   [ ] Priority
-   [ ] Reopen
-   [ ] Escalation

## Requirements

-   [ ] Create
-   [ ] Review
-   [ ] Approve
-   [ ] Reject
-   [ ] Fulfill
-   [ ] Cost tracking
-   [ ] Bills

## Work History

-   [ ] Completed work
-   [ ] Materials
-   [ ] Expenses
-   [ ] Bills
-   [ ] Completion proof
-   [ ] Warden verification

## Notifications

-   [ ] Notification records
-   [ ] Email service
-   [ ] Email templates
-   [ ] Email logs
-   [ ] Background jobs if required

## Administration

-   [ ] User management
-   [ ] Hostel management
-   [ ] Staff mapping
-   [ ] Category management
-   [ ] Authority management
-   [ ] Reports
-   [ ] Audit logs

## Testing

-   [ ] Auth tests
-   [ ] Permission tests
-   [ ] Complaint tests
-   [ ] Routing tests
-   [ ] Requirement tests
-   [ ] Work-history tests
-   [ ] Admin tests

------------------------------------------------------------------------

# 99. Final End-to-End Architecture

``` text
                         GBU CMS
                            |
                     Landing / Login
                            |
              +-------------+-------------+
              |             |             |
           Student     Hostel Staff      Admin
                            |
                       +----+----+
                       |         |
                    Warden    Caretaker
                       |
                       v
                    Complaint
                       |
                       v
                 Student Hostel
                       |
                       v
                    Warden
                       |
                       v
                 Caretaker/Staff
                       |
             +---------+---------+
             |                   |
        Normal Work       Specialized Work
             |                   |
             v                   v
        Caretaker           Authority
             |                   |
             +---------+---------+
                       |
                       v
                    Resolve
                       |
                       v
                  Work History
                       |
          +------------+------------+
          |            |            |
       Materials     Expenses      Bills
          |            |            |
          +------------+------------+
                       |
                       v
                     Admin
                       |
          +------------+-------------+
          |            |             |
       Reports      Budget       Audit
```

------------------------------------------------------------------------

# 100. Final Backend Principle

The most important principle for the backend developer is:

> **Do not treat the current frontend mock data as the system. Treat the
> frontend as the user interface for the system described in this
> document.**

The backend must become the source of truth.

``` text
Frontend
   = Presentation

NestJS
   = Business Logic + API

PostgreSQL
   = Source of Truth

Prisma
   = Database Access

Email/Storage/Jobs
   = Supporting Services
```

The final system should be secure, role-aware, auditable, maintainable
and ready for future expansion without requiring a complete rewrite.

------------------------------------------------------------------------

# 101. Immediate Next Step

Start backend development in this order:

``` text
1. NestJS project setup
2. PostgreSQL + Prisma
3. Initial database schema
4. User + role model
5. Authentication
6. Hostel + staff mapping
7. Complaint module
8. Complaint routing
9. Assignment/status history
10. Requirements
11. Work History
12. Expenses/Bills
13. Escalations
14. Notifications/Email
15. Admin APIs
16. Frontend API integration
```

**Do not start by building every frontend page.**

The existing frontend foundation is sufficient to begin the backend.

Once the core backend is stable, return to the remaining Warden,
Authority and Admin pages and connect them to real APIs.
