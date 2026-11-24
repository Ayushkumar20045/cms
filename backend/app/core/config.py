from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    database_url: str
    test_database_url: str | None = None
    redis_url: str

    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = 'HS256'
    access_token_minutes: int = 15
    # Without "Remember me" the refresh cookie lasts for the browser session; with it, this many days
    refresh_token_days: int = 7
    remember_me_days: int = 30

    upload_dir: str = '/data/uploads'
    max_attachments: int = 5
    max_attachment_bytes: int = 10 * 1024 * 1024

    cors_origins: Annotated[list[str], NoDecode] = ['http://localhost:3000']
    cookie_secure: bool = False

    login_max_attempts: int = 5
    login_window_seconds: int = 300

    # Email. With no SMTP host, emails are skipped (in-app notifications still work). In development the
    # Docker setup points this at Mailpit, a local test inbox at http://localhost:8025 that never delivers.
    smtp_host: str | None = None
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_starttls: bool = False
    mail_from: str = 'GBU Complaint System <no-reply@gbu.local>'
    # Base address of the frontend, used for links inside emails
    app_base_url: str = 'http://localhost:3000'

    # A complaint counts as recurring when this many similar ones (same place and category) arrive within the window
    recurring_threshold: int = 3
    recurring_window_days: int = 14
    # The warden is alerted about the same recurring issue at most once in this many hours
    recurring_alert_cooldown_hours: int = 12

    @field_validator('cors_origins', mode='before')
    @classmethod
    def split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(',') if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
