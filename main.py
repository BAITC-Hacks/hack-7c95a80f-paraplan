from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .simulation import calculate


app = FastAPI(
    title="QalaAI API",
    description="AI-powered urban decision simulator",
    version="0.1.0",
)

# Разрешаем локальный frontend (например, VS Code Live Server)
# обращаться к API на другом локальном порту.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
