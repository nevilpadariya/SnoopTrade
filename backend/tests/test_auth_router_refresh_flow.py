import importlib
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
slowapi = pytest.importorskip("slowapi")
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from utils.limiter import limiter


class FakeUsersCollection:
    def __init__(self):
        self._docs = {}

    def find_one(self, query, projection=None):
        email = query.get("email")
        doc = self._docs.get(email)
        if not doc:
            return None

        result = dict(doc)
        if projection:
            for key, include in projection.items():
                if include == 0:
                    result.pop(key, None)
        return result

    def insert_one(self, document):
        self._docs[document["email"]] = dict(document)
        return {"inserted_id": document["email"]}

    def update_one(self, query, update):
        email = query.get("email")
        doc = self._docs.get(email)
        if not doc:
            return {"matched_count": 0}

        for key, value in update.get("$set", {}).items():
            doc[key] = value
        for key in update.get("$unset", {}):
            doc.pop(key, None)
        self._docs[email] = doc
        return {"matched_count": 1}


class FakeDB:
    def __init__(self):
        self.users = FakeUsersCollection()


def build_client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "router-test-secret")
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017")

    import services.auth_services as auth_services
    auth_services = importlib.reload(auth_services)

    import routers.auth_router as auth_router_module
    auth_router_module = importlib.reload(auth_router_module)

    fake_db = FakeDB()
    monkeypatch.setattr(auth_router_module, "db", fake_db)

    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.include_router(auth_router_module.auth_router, prefix="/auth")

    return TestClient(app), fake_db, auth_services


def test_refresh_rotation_and_logout_revocation(monkeypatch):
    client, fake_db, auth_services = build_client(monkeypatch)

    fake_db.users.insert_one(
        {
            "email": "student@example.com",
            "name": "Student User",
            "hashed_password": auth_services.hash_password("s3cret-pass"),
            "login_type": "normal",
            "created_at": datetime.now(timezone.utc),
        }
    )

    login_response = client.post(
        "/auth/token",
        data={
            "username": "student@example.com",
            "password": "s3cret-pass",
            "login_type": "normal",
        },
    )
    assert login_response.status_code == 200
    login_payload = login_response.json()
    first_access = login_payload["access_token"]
    first_refresh = login_payload["refresh_token"]
    assert first_refresh

    stored_user = fake_db.users.find_one({"email": "student@example.com"})
    first_refresh_hash = stored_user.get("refresh_token_jti_hash")
    assert first_refresh_hash

    refresh_response = client.post("/auth/refresh", json={"refresh_token": first_refresh})
    assert refresh_response.status_code == 200
    refresh_payload = refresh_response.json()
    second_refresh = refresh_payload["refresh_token"]
    assert second_refresh
    assert second_refresh != first_refresh

    rotated_user = fake_db.users.find_one({"email": "student@example.com"})
    assert rotated_user.get("refresh_token_jti_hash") != first_refresh_hash

    stale_refresh_response = client.post("/auth/refresh", json={"refresh_token": first_refresh})
    assert stale_refresh_response.status_code == 401

    me_with_refresh = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {second_refresh}"}
    )
    assert me_with_refresh.status_code == 401

    logout_response = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {first_access}"},
    )
    assert logout_response.status_code == 200

    logged_out_user = fake_db.users.find_one({"email": "student@example.com"})
    assert logged_out_user.get("refresh_token_jti_hash") is None

    refresh_after_logout = client.post("/auth/refresh", json={"refresh_token": second_refresh})
    assert refresh_after_logout.status_code == 401
