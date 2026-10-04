# GBU Complaint Management System

Student and Admin portals with a FastAPI backend, PostgreSQL + PostGIS and Redis.

```
backend/            FastAPI app (app/), Alembic migrations, pytest suite
frontend/           Next.js 16 app
docker-compose.yml  PostgreSQL 18 + PostGIS, Redis 8, backend
```

## Run it

1. Copy `.env.example` to `.env` and replace every `change-me` value (a `.env` with generated development
   secrets already exists on this machine). The `SEED_*` values are the development sign-in accounts.
2. Start the database, Redis and the API (migrations and seed data run automatically):

   ```bash
   docker compose up -d --build
   ```

   API: http://localhost:8000/api/v1 · interactive docs: http://localhost:8000/docs
3. Start the frontend:

   ```bash
   cd frontend && npm install && npm run dev
   ```

   Open http://localhost:3000. The frontend forwards `/api/v1/*` to the backend (`BACKEND_URL`, default
   `http://localhost:8000`), so the session cookies stay on one origin.

## Tests

```bash
docker compose exec backend python -m pytest
```

The tests use the separate `gbu_test` database and cover sign-in and portal checks, rate limiting, refresh-token
rotation, CSRF, students' access limited to their own complaints, attachment validation, the status workflow,
assignment rules, privilege escalation and the append-only audit log.

## What is connected

| Page | Backend |
| --- | --- |
| Login (Student / Admin) | `POST /auth/login` checks the portal against the role stored on the account |
| Student Dashboard | `GET /students/me`, `/students/me/complaints`, `/students/me/activity` |
| My Complaints | `GET /students/me/complaints` with search, status and category filters |
| Raise Complaint | `GET /categories`, `POST /complaints` (multipart, attachments checked by content) |
| Admin Dashboard | `GET /admin/dashboard`, `GET /admin/complaints?search=` |

The API also provides admin complaint management (status, priority, assign, reassign, escalate), users, hostels,
categories and the audit log, ready for the remaining admin pages. Warden and Caretaker pages, requirements,
email and password reset are not built yet.

## Security notes

- Roles, permissions and scope are checked on the server for every request; the frontend only hides links.
- Sessions use HttpOnly cookies, short-lived access tokens and rotating refresh tokens (reuse revokes the session).
- State-changing requests need the CSRF header; logins are rate-limited in Redis.
- Passwords are hashed with Argon2id; the audit log cannot be updated or deleted, even with direct SQL.
