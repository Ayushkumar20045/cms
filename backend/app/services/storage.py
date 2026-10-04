"""Attachment storage and validation.

Files are stored under random keys in a local directory (a Docker volume in development). The interface
(save / open_path) is kept small so it can be swapped for S3-compatible storage without touching callers.
"""
import io
import os
import secrets
import zipfile
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

# Allowed types are detected from the file's content, not from the name or the browser-supplied MIME type
_EXTENSIONS = {
    'image/jpeg': {'.jpg', '.jpeg'}, 'image/png': {'.png'}, 'image/gif': {'.gif'}, 'image/webp': {'.webp'},
    'application/pdf': {'.pdf'}, 'application/msword': {'.doc'},
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {'.docx'},
}


def _sniff(head: bytes, data: bytes) -> str | None:
    if head.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if head.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if head[:6] in (b'GIF87a', b'GIF89a'):
        return 'image/gif'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'image/webp'
    if head.startswith(b'%PDF-'):
        return 'application/pdf'
    if head.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
        return 'application/msword'
    if head.startswith(b'PK\x03\x04'):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                if 'word/document.xml' in z.namelist():
                    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        except zipfile.BadZipFile:
            return None
    return None


@dataclass
class StoredFile:
    original_filename: str
    storage_key: str
    mime_type: str
    size_bytes: int


def _bad(msg: str):
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)


def validate_and_store(files: list[UploadFile], existing_count: int = 0) -> list[StoredFile]:
    """Validate every file first and only then write them, so a bad file stores nothing."""
    s = get_settings()
    files = [f for f in files if f and f.filename]
    if existing_count + len(files) > s.max_attachments:
        raise _bad(f'A complaint can have at most {s.max_attachments} attachments.')
    checked = []
    for f in files:
        data = f.file.read(s.max_attachment_bytes + 1)
        name = os.path.basename(f.filename or 'file')[:255]
        if len(data) > s.max_attachment_bytes:
            raise _bad(f'"{name}" is larger than {s.max_attachment_bytes // (1024 * 1024)} MB.')
        if not data:
            raise _bad(f'"{name}" is empty.')
        mime = _sniff(data[:16], data)
        ext = Path(name).suffix.lower()
        if mime is None or ext not in _EXTENSIONS[mime]:
            raise _bad(f'"{name}" is not an allowed file. Only image, PDF, DOC or DOCX files can be attached.')
        checked.append((name, mime, data))

    root = Path(s.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    stored = []
    for name, mime, data in checked:
        key = f'{secrets.token_hex(16)}{Path(name).suffix.lower()}'
        (root / key).write_bytes(data)
        stored.append(StoredFile(name, key, mime, len(data)))
    return stored


def open_path(storage_key: str) -> Path:
    path = (Path(get_settings().upload_dir) / storage_key).resolve()
    if path.parent != Path(get_settings().upload_dir).resolve() or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail='File not found')
    return path


def delete(storage_key: str) -> None:
    try:
        (Path(get_settings().upload_dir) / storage_key).unlink(missing_ok=True)
    except OSError:
        pass
