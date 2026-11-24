"""Outgoing email.

Emails are sent after the database change is committed (as a FastAPI background task), so a slow or failing
mail server never blocks or rolls back the request. Messages carry only a reference, a short subject line and a
link to the portal; complaint details stay behind the login.
"""
import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import get_settings

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Email:
    to: str
    subject: str
    text: str


def send_many(emails: list[Email]) -> None:
    s = get_settings()
    if not emails or not s.smtp_host:
        return
    try:
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=10) as smtp:
            if s.smtp_starttls:
                smtp.starttls()
            if s.smtp_username:
                smtp.login(s.smtp_username, s.smtp_password or '')
            for e in emails:
                msg = EmailMessage()
                msg['From'], msg['To'], msg['Subject'] = s.mail_from, e.to, e.subject
                msg.set_content(e.text)
                smtp.send_message(msg)
    except (OSError, smtplib.SMTPException):
        # In-app notifications are already saved; a mail outage must not surface as a failed request
        log.exception('Sending %d email(s) failed', len(emails))
