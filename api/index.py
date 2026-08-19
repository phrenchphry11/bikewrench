"""FastAPI entrypoint — Vercel Python serverless function."""

from datetime import date

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from engine.report import build_report

app = FastAPI(title="Bike Health Report API")


class Ride(BaseModel):
    date: str
    miles: float
    hours: float
    gear: str = ""


class Baselines(BaseModel):
    """Optional 'last replaced' info; None means 'not sure' (conservative default)."""

    chain_miles_ago: float | None = None
    chain_date: str | None = None
    tires_miles_ago: float | None = None
    tires_date: str | None = None
    # When the bike was acquired / last fully serviced. Rides before this are
    # a previous bike's and are excluded; time-based wear starts here.
    bike_date: str | None = None


class ReportRequest(BaseModel):
    rides: list[Ride]
    bike_type: str  # road | gravel | mtb
    conditions: str  # dry | mixed | wet
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
