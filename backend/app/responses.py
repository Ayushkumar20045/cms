"""Uniform error format: {"success": false, "message": ..., "errors": [{"field", "message"}]}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic.alias_generators import to_camel
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger(__name__)


def _error(status_code: int, message: str, errors: list | None = None, headers=None) -> JSONResponse:
    body = {'success': False, 'message': message}
    if errors:
        body['errors'] = errors
    return JSONResponse(body, status_code=status_code, headers=headers)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        if isinstance(exc.detail, list):  # field-level errors raised by an endpoint
            return _error(exc.status_code, 'Validation failed', exc.detail, headers=getattr(exc, 'headers', None))
        return _error(exc.status_code, str(exc.detail), headers=getattr(exc, 'headers', None))

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        errors = []
        for e in exc.errors():
            loc = [str(p) for p in e.get('loc', []) if p not in ('body', 'query', 'path', 'form')]
            msg = e.get('msg', 'Invalid value')
            if msg.startswith('Value error, '):
                msg = msg[len('Value error, '):]
            errors.append({'field': '.'.join(to_camel(p) for p in loc) or None, 'message': msg})
        return _error(422, 'Validation failed', errors)

    @app.exception_handler(Exception)
    async def unexpected(_: Request, exc: Exception):
        log.exception('Unhandled error', exc_info=exc)
        return _error(500, 'Something went wrong. Please try again.')
