"""FastAPI entrypoint — Vercel Python serverless function."""

from datetime import date
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from engine.report import build_report

app = FastAPI(title="Bike Health Report API")

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
