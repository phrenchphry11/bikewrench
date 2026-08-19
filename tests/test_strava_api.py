"""Strava OAuth endpoint tests — Strava's API is always mocked."""

import httpx
import pytest
from fastapi.testclient import TestClient

from api import strava
from api.index import app

client = TestClient(app)

TOKENS = {
    "access_token": "at-123",
    "refresh_token": "rt-456",
    "expires_at": 1893456000,
    "athlete": {"firstname": "Holly", "lastname": "F", "id": 42},
}


@pytest.fixture
def creds(monkeypatch):
    monkeypatch.setenv("STRAVA_CLIENT_ID", "12345")
    monkeypatch.setenv("STRAVA_CLIENT_SECRET", "s3cret")


def mock_strava(monkeypatch, status_code=200, json_body=None, network_error=False):
    captured = {}

    def fake_post(url, data=None, timeout=None):
        captured["url"] = url
        captured["data"] = data
        if network_error:
            raise httpx.ConnectError("boom")
        return httpx.Response(status_code, json=json_body if json_body is not None else TOKENS)

    monkeypatch.setattr(strava.httpx, "post", fake_post)
    return captured


class TestExchange:
    def test_unconfigured_returns_503(self, monkeypatch):
        monkeypatch.delenv("STRAVA_CLIENT_ID", raising=False)
        monkeypatch.delenv("STRAVA_CLIENT_SECRET", raising=False)
        resp = client.post("/api/strava/token", json={"code": "abc"})
        assert resp.status_code == 503

    def test_happy_path_returns_token_subset(self, creds, monkeypatch):
        captured = mock_strava(monkeypatch)
        resp = client.post("/api/strava/token", json={"code": "authcode"})
        assert resp.status_code == 200
        assert resp.json() == {
            "access_token": "at-123",
            "refresh_token": "rt-456",
            "expires_at": 1893456000,
            "athlete_name": "Holly",
        }
        assert captured["url"] == strava.STRAVA_TOKEN_URL
        assert captured["data"]["grant_type"] == "authorization_code"
        assert captured["data"]["code"] == "authcode"
        assert captured["data"]["client_secret"] == "s3cret"

    def test_bad_code_maps_to_400_without_leaking(self, creds, monkeypatch):
        mock_strava(monkeypatch, status_code=400, json_body={"errors": ["secret junk"]})
        resp = client.post("/api/strava/token", json={"code": "expired"})
        assert resp.status_code == 400
        assert "secret junk" not in resp.text
        assert "reconnect" in resp.json()["detail"]

    def test_rate_limit_maps_to_429(self, creds, monkeypatch):
        mock_strava(monkeypatch, status_code=429, json_body={})
        resp = client.post("/api/strava/token", json={"code": "abc"})
        assert resp.status_code == 429

    def test_network_error_maps_to_502(self, creds, monkeypatch):
        mock_strava(monkeypatch, network_error=True)
        resp = client.post("/api/strava/token", json={"code": "abc"})
        assert resp.status_code == 502

    def test_empty_code_rejected(self, creds):
        resp = client.post("/api/strava/token", json={"code": ""})
        assert resp.status_code == 422


class TestRefresh:
    def test_refresh_uses_refresh_grant(self, creds, monkeypatch):
        captured = mock_strava(monkeypatch)
        resp = client.post("/api/strava/refresh", json={"refresh_token": "rt-456"})
        assert resp.status_code == 200
        assert captured["data"]["grant_type"] == "refresh_token"
        assert captured["data"]["refresh_token"] == "rt-456"


class TestConfig:
    def test_config_exposes_id_never_secret(self, creds):
        resp = client.get("/api/strava/config")
        assert resp.status_code == 200
        assert resp.json() == {"configured": True, "client_id": "12345"}
        assert "s3cret" not in resp.text

    def test_config_unconfigured(self, monkeypatch):
        monkeypatch.delenv("STRAVA_CLIENT_ID", raising=False)
        resp = client.get("/api/strava/config")
        assert resp.json() == {"configured": False, "client_id": None}
