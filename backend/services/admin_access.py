import os
from typing import Any

ADMIN_ROLE_VALUES = {"admin", "owner", "superadmin"}


def _parse_admin_emails(raw_value: str | None) -> set[str]:
    if not raw_value:
        return set()
    return {email.strip().lower() for email in raw_value.split(",") if email.strip()}


def get_admin_emails() -> set[str]:
    return _parse_admin_emails(os.getenv("ADMIN_EMAILS", ""))


def is_admin_user(user: dict[str, Any] | None) -> bool:
    if not isinstance(user, dict):
        return False

    if bool(user.get("is_admin")):
        return True

    role = str(user.get("role") or "").strip().lower()
    if role in ADMIN_ROLE_VALUES:
        return True

    email = str(user.get("email") or "").strip().lower()
    return bool(email and email in get_admin_emails())
