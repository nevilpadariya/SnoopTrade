import importlib


def load_auth_services(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "unit-test-secret")
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "5")
    monkeypatch.setenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
    import services.auth_services as auth_services

    return importlib.reload(auth_services)


def test_access_token_decodes_for_access_path(monkeypatch):
    auth_services = load_auth_services(monkeypatch)

    token = auth_services.create_access_token({"sub": "student@example.com"}, expires_minutes=5)
    payload = auth_services.decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == "student@example.com"
    assert auth_services.decode_refresh_token(token) is None


def test_refresh_token_decodes_and_is_rejected_as_access(monkeypatch):
    auth_services = load_auth_services(monkeypatch)

    refresh_token, token_id, _ = auth_services.create_refresh_token(
        {"sub": "student@example.com"}, expires_days=1
    )
    payload = auth_services.decode_refresh_token(refresh_token)

    assert payload is not None
    assert payload["sub"] == "student@example.com"
    assert payload["jti"] == token_id
    assert auth_services.decode_access_token(refresh_token) is None


def test_expired_access_token_is_invalid(monkeypatch):
    auth_services = load_auth_services(monkeypatch)

    token = auth_services.create_access_token({"sub": "student@example.com"}, expires_minutes=-1)

    assert auth_services.decode_access_token(token) is None


def test_hash_refresh_token_id_is_stable(monkeypatch):
    auth_services = load_auth_services(monkeypatch)

    token_id = "fixed-refresh-token-id"
    first_hash = auth_services.hash_refresh_token_id(token_id)
    second_hash = auth_services.hash_refresh_token_id(token_id)

    assert first_hash == second_hash
    assert len(first_hash) == 64
