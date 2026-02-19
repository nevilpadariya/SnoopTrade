import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.admin_access import is_admin_user


def test_is_admin_user_true_from_boolean_flag(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    assert is_admin_user({"email": "x@example.com", "is_admin": True}) is True


def test_is_admin_user_true_from_role(monkeypatch):
    monkeypatch.delenv("ADMIN_EMAILS", raising=False)
    assert is_admin_user({"email": "x@example.com", "role": "admin"}) is True
    assert is_admin_user({"email": "x@example.com", "role": "OWNER"}) is True


def test_is_admin_user_true_from_admin_emails_env(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "alpha@example.com,beta@example.com")
    assert is_admin_user({"email": "beta@example.com"}) is True


def test_is_admin_user_false_when_no_admin_flags(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "admin@example.com")
    assert is_admin_user({"email": "user@example.com"}) is False
    assert is_admin_user({"email": "user@example.com", "role": "member"}) is False
