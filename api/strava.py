"""Strava OAuth endpoints — code/token exchange only.

The client secret lives here (env vars) and nowhere else; tokens are returned
to the browser and never stored or logged server-side, keeping the
no-persistence promise. Ride fetching happens client-side against the Strava
API with the returned token.
"""

import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"

router = APIRouter(prefix="/api/strava")


class ExchangeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=256)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=256)


def _credentials() -> tuple[str, str]:
    client_id = os.environ.get("STRAVA_CLIENT_ID", "")
    client_secret = os.environ.get("STRAVA_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503,
            detail="Strava import isn't configured on this deployment yet.",
        )
    return client_id, client_secret


def _token_request(data: dict) -> dict:
    """POST to Strava's token endpoint and map failures to friendly errors."""
    try:
        resp = httpx.post(STRAVA_TOKEN_URL, data=data, timeout=10)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Couldn't reach Strava — try again.")
    if resp.status_code == 429:
        raise HTTPException(
            status_code=429, detail="Strava is rate-limiting us — try again in a few minutes."
        )
    if resp.status_code >= 400:
        # Bad/expired code or revoked grant; Strava's body may echo our
        # request, so don't forward it.
        raise HTTPException(
            status_code=400,
            detail="Strava didn't accept that authorization — please reconnect.",
        )
    body = resp.json()
    # Pass through only what the frontend needs; never log any of it.
    return {
        "access_token": body.get("access_token"),
        "refresh_token": body.get("refresh_token"),
        "expires_at": body.get("expires_at"),
        "athlete_name": (body.get("athlete") or {}).get("firstname"),
    }


@router.post("/token")
def exchange_token(req: ExchangeRequest) -> dict:
    client_id, client_secret = _credentials()
    return _token_request(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": req.code,
            "grant_type": "authorization_code",
        }
    )


@router.post("/refresh")
def refresh_token(req: RefreshRequest) -> dict:
    client_id, client_secret = _credentials()
    return _token_request(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": req.refresh_token,
            "grant_type": "refresh_token",
        }
    )


@router.get("/config")
def config() -> dict:
    """Public config for the frontend: client ID (not secret) and whether
    Strava import is available on this deployment."""
    client_id = os.environ.get("STRAVA_CLIENT_ID", "")
    return {"configured": bool(client_id), "client_id": client_id or None}
