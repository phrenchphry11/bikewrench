"""FastAPI entrypoint — Vercel Python serverless function."""

from typing import Annotated

from fastapi import FastAPI
from pydantic import BaseModel, Field

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


class ReportRequest(BaseModel):
    rides: list[Ride]
    bike_type: Annotated[str, Field(alias="bikeType")]  # road | gravel | mtb
    conditions: str  # dry | mixed | wet
    baselines: Baselines = Baselines()

    model_config = {"populate_by_name": True}


@app.post("/api/report")
def report(req: ReportRequest) -> dict:
    # M2 wires this to the wear engine; for now echo the totals so the pipe works.
    total_miles = sum(r.miles for r in req.rides)
    total_hours = sum(r.hours for r in req.rides)
    return {
        "status": "stub",
        "ride_count": len(req.rides),
        "total_miles": round(total_miles, 1),
        "total_hours": round(total_hours, 1),
    }
