from fastapi import FastAPI
from pydantic import BaseModel

from .simulation import calculate


app = FastAPI(
    title="QalaAI API",
    description="AI-powered urban decision simulator",
    version="0.1.0",
)


class Decision(BaseModel):
    id: str
    district: str | None = None


class SimulationRequest(BaseModel):
    decisions: list[Decision]


@app.get("/")
def root():
    return {
        "project": "QalaAI",
        "status": "running",
    }


@app.post("/api/simulate")
def simulate(request: SimulationRequest):
    decisions = [
        item.model_dump()
        for item in request.decisions
    ]

    return calculate(decisions)