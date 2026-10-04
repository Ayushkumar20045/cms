from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, complaints, students
from app.authorization.deps import CSRF_HEADER
from app.core.config import get_settings
from app.responses import install_error_handlers

app = FastAPI(title='GBU Complaint Management System API', version='0.1.0')
install_error_handlers(app)

# Only needed when the frontend calls the API from another origin; through the Next.js proxy it is same-origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PATCH', 'DELETE'],
    allow_headers=['Authorization', 'Content-Type', CSRF_HEADER],
)


@app.middleware('http')
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'no-referrer')
    response.headers.setdefault('Cache-Control', 'no-store')
    return response


for r in (auth.router, students.router, complaints.router, admin.router):
    app.include_router(r)


@app.get('/api/v1/health', tags=['health'])
def health():
    return {'success': True, 'data': {'status': 'ok'}}
