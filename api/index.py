"""FastAPI entrypoint — Vercel Python serverless function."""

from datetime import date
from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from api.strava import router as strava_router
from engine.report import build_report

app = FastAPI(title="Bike Health Report API")
app.include_router(strava_router)

# A finite, non-negative float: rejects NaN/Infinity, which Python's JSON
# parser would otherwise happily accept and feed through the wear math.
Miles = Annotated[float, Field(ge=0, allow_inf_nan=False)]


class Ride(BaseModel):
    date: str = Field(max_length=64)
    miles: Miles
    hours: Miles
    gear: str = Field(default="", max_length=256)


class Baselines(BaseModel):
    """Optional 'last replaced' info; None means 'not sure' (conservative default)."""

    chain_miles_ago: Miles | None = None
    chain_date: str | None = Field(default=None, max_length=64)
    tires_miles_ago: Miles | None = None
    tires_date: str | None = Field(default=None, max_length=64)
    # When the bike was acquired / last fully serviced. Rides before this are
    # a previous bike's and are excluded; time-based wear starts here.
    bike_date: str | None = Field(default=None, max_length=64)


class ReportRequest(BaseModel):
    # A decade of daily riding is ~4k rides; 50k bounds serverless CPU.
    rides: list[Ride] = Field(max_length=50_000)
    bike_type: Literal["road", "gravel", "mtb"]
    conditions: Literal["dry", "mixed", "wet"]
    baselines: Baselines = Baselines()


@app.post("/api/report")
def report(req: ReportRequest) -> dict:
    try:
        return build_report(
            rides=[r.model_dump() for r in req.rides],
            bike_type=req.bike_type,
            conditions=req.conditions,
            baselines=req.baselines.model_dump(exclude_none=True),
            as_of=date.today().isoformat(),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# On Vercel the FastAPI app serves the whole site (single-function model), so
# mount the built SPA after the API routes; Vercel promotes these files to its
# CDN at build time. Guarded so a backend-only local run still boots.
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.is_dir():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
