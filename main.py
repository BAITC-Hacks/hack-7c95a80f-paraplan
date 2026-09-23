import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI, OpenAIError
from pydantic import BaseModel

from .data import MEASURES
from .simulation import calculate

load_dotenv()


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


@app.post("/api/analyze")
def analyze(request: SimulationRequest):
    """Explain the deterministic simulation result using OpenAI on demand."""
    decisions = [item.model_dump() for item in request.decisions]
    result = calculate(decisions)
    if not result.get("valid"):
        return {"available": False, "message": result.get("error", "Сначала соберите допустимый сценарий.")}

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "add-your-api-key-here":
        return {"available": False, "message": "AI-разбор не настроен. Добавьте OPENAI_API_KEY в локальный файл .env."}

    selected = []
    selected_ids = set()
    for decision in decisions:
        measure = MEASURES.get(decision["id"])
        if not measure:
            continue
        selected_ids.add(decision["id"])
        selected.append({
            "id": decision["id"],
            "name": measure["name"],
            "direction": measure["direction"],
            "district": decision.get("district") or "Весь город",
            "cost": measure["cost"],
            "lag_quarters": measure["lag"],
        })

    context = {
        "selected_measures": selected,
        "calculation": {
            "aqol_score": result.get("score"),
            "baseline_score": result.get("baseline_score"),
            "score_delta": result.get("score_delta"),
            "budget": result.get("budget"),
            "spent": result.get("spent"),
            "remaining": result.get("remaining"),
            "district_scores": result.get("district_scores"),
            "critical_count": result.get("critical_count"),
            "critical_indicators": result.get("critical_indicators"),
        },
        "other_available_measures": [
            {"id": measure_id, "name": measure["name"], "direction": measure["direction"], "cost": measure["cost"]}
            for measure_id, measure in MEASURES.items() if measure_id not in selected_ids
        ],
    }
    instructions = (
        "Ты — помощник городского планировщика. Объясни результат симулятора на русском языке. "
        "Опирайся только на переданные данные: не пересчитывай и не выдумывай числа, факты или причинность. "
        "Дай короткие разделы: «Что работает», «Компромиссы и риски», «Что рассмотреть дальше». "
        "В последнем разделе предлагай только меры из списка other_available_measures; уточняй, что их эффект "
        "нужно проверить отдельным расчётом сценария. Не обещай, что мера повысит балл без такого расчёта. "
        "Если данных мало, прямо скажи об этом. До 170 слов."
    )
    try:
        client = OpenAI(api_key=api_key, timeout=20.0, max_retries=1)
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-6-luna"),
            instructions=instructions,
            input=json.dumps(context, ensure_ascii=False),
            max_output_tokens=400,
        )
        return {"available": True, "text": response.output_text}
    except OpenAIError:
        return {"available": False, "message": "Не удалось получить AI-разбор. Проверьте ключ, модель и доступ к API."}
