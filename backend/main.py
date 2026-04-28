from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from preprocessing import build_prediction_frame


MODEL_PATH = Path(__file__).with_name("model.pkl")


class PredictionRequest(BaseModel):
    age: int = Field(ge=15, le=45)
    goals_per_90: float = Field(ge=0, le=3)
    assists_per_90: float = Field(ge=0, le=3)
    minutes_played_avg: float = Field(ge=0, le=120)
    club: str
    position: str


class PlayerCompareRequest(BaseModel):
    player_a: PredictionRequest
    player_b: PredictionRequest


class PredictorService:
    def __init__(self) -> None:
        self.artifact = self._load_artifact()
        self.model = self.artifact.get("model")
        self.defaults = self.artifact.get("defaults", {})

    def _load_artifact(self) -> dict[str, Any]:
        if MODEL_PATH.exists():
            return joblib.load(MODEL_PATH)
        return {
            "model": None,
            "best_model": "heuristic_fallback",
            "metrics": {
                "heuristic_fallback": {
                    "rmse": None,
                    "mae": None,
                    "r2": None,
                    "note": "Run python train_model.py after adding Kaggle CSVs to create backend/model.pkl.",
                }
            },
            "defaults": {
                "recent_form": 1.2,
                "club_strength": 1.6,
                "league_level": 1,
                "market_value_lag_1": 12_000_000,
                "market_value_lag_2": 10_000_000,
                "market_value_delta": 2_000_000,
                "season": 2025,
                "year": 2026,
                "league": "GB1",
            },
            "clubs": ["Manchester City", "Real Madrid", "Barcelona", "Bayern Munich", "Arsenal", "Liverpool", "Paris Saint-Germain"],
            "positions": ["Goalkeeper", "Defender", "Midfield", "Attack", "Centre-Forward", "Winger"],
            "players": [],
        }

    def predict(self, payload: dict[str, Any]) -> float:
        frame = build_prediction_frame(payload, self.defaults)
        if self.model is not None:
            return float(np.maximum(self.model.predict(frame)[0], 0))
        return self._fallback_prediction(payload)

    def _fallback_prediction(self, payload: dict[str, Any]) -> float:
        age = payload["age"]
        goals = payload["goals_per_90"]
        assists = payload["assists_per_90"]
        minutes = payload["minutes_played_avg"]
        position = payload["position"].lower()
        peak_age_factor = max(0.35, 1 - abs(age - 25) * 0.045)
        attacking_factor = 1.25 if any(token in position for token in ["attack", "forward", "winger"]) else 1.0
        creation = 1 + goals * 2.6 + assists * 1.9
        availability = min(minutes / 82, 1.2)
        prestige = 1.25 if payload["club"].lower() not in {"unknown", "unknown club"} else 0.8
        return 4_500_000 * peak_age_factor * attacking_factor * creation * availability * prestige


service = PredictorService()
app = FastAPI(title="Football Transfer Market Value Predictor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": service.artifact.get("best_model", "unknown")}


@app.get("/metadata")
def metadata() -> dict[str, Any]:
    return {
        "best_model": service.artifact.get("best_model"),
        "metrics": service.artifact.get("metrics", {}),
        "clubs": service.artifact.get("clubs", []),
        "positions": service.artifact.get("positions", []),
        "players": service.artifact.get("players", [])[:40],
    }


@app.post("/predict")
def predict(request: PredictionRequest) -> dict[str, float]:
    value = service.predict(request.model_dump())
    return {"predicted_market_value": round(value, 2)}


@app.get("/players/search")
def search_players(q: str = "") -> dict[str, list[dict[str, Any]]]:
    query = q.strip().lower()
    players = service.artifact.get("players", [])
    if not query:
        return {"players": players[:10]}
    matches = [player for player in players if query in str(player.get("name", "")).lower()]
    return {"players": matches[:10]}


@app.get("/feature-importance")
def feature_importance() -> dict[str, list[dict[str, float | str]]]:
    model = service.model
    if model is None or not hasattr(model.named_steps.get("model"), "feature_importances_"):
        fallback = [
            {"feature": "market_value_lag_1", "importance": 0.32},
            {"feature": "age", "importance": 0.18},
            {"feature": "goals_per_90", "importance": 0.16},
            {"feature": "assists_per_90", "importance": 0.12},
            {"feature": "minutes_played_avg", "importance": 0.1},
        ]
        return {"features": fallback}

    estimator = model.named_steps["model"]
    names = model.named_steps["preprocessor"].get_feature_names_out()
    importances = estimator.feature_importances_
    top = sorted(zip(names, importances), key=lambda item: item[1], reverse=True)[:12]
    return {"features": [{"feature": name.replace("num__", "").replace("cat__", ""), "importance": float(score)} for name, score in top]}


@app.post("/compare")
def compare_players(request: PlayerCompareRequest) -> dict[str, float]:
    value_a = service.predict(request.player_a.model_dump())
    value_b = service.predict(request.player_b.model_dump())
    return {
        "player_a_value": round(value_a, 2),
        "player_b_value": round(value_b, 2),
        "difference": round(abs(value_a - value_b), 2),
    }
