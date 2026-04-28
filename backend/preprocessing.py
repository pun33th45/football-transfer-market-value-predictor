from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


REQUIRED_FILES = {
    "players": "players.csv",
    "appearances": "appearances.csv",
    "games": "games.csv",
    "valuations": "player_valuations.csv",
    "clubs": "clubs.csv",
}

MODEL_FEATURES = [
    "age",
    "goals_per_90",
    "assists_per_90",
    "minutes_played_avg",
    "recent_form",
    "club_strength",
    "league_level",
    "season",
    "year",
    "market_value_lag_1",
    "market_value_lag_2",
    "market_value_delta",
    "club",
    "position",
    "league",
]

NUMERIC_FEATURES = [
    "age",
    "goals_per_90",
    "assists_per_90",
    "minutes_played_avg",
    "recent_form",
    "club_strength",
    "league_level",
    "season",
    "year",
    "market_value_lag_1",
    "market_value_lag_2",
    "market_value_delta",
]

CATEGORICAL_FEATURES = ["club", "position", "league"]


@dataclass(frozen=True)
class PreparedData:
    features: pd.DataFrame
    target: pd.Series
    raw: pd.DataFrame


def _read_csv(data_dir: Path, name: str) -> pd.DataFrame:
    path = data_dir / REQUIRED_FILES[name]
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Download the Kaggle CSVs into data/.")
    return pd.read_csv(path, low_memory=False)


def load_raw_data(data_dir: str | Path = "../data") -> dict[str, pd.DataFrame]:
    data_path = Path(data_dir)
    return {name: _read_csv(data_path, name) for name in REQUIRED_FILES}


def _to_datetime(frame: pd.DataFrame, columns: Iterable[str]) -> pd.DataFrame:
    frame = frame.copy()
    for column in columns:
        if column in frame.columns:
            frame[column] = pd.to_datetime(frame[column], errors="coerce", utc=True).dt.tz_localize(None)
    return frame


def _first_existing(frame: pd.DataFrame, candidates: list[str], default: object = np.nan) -> pd.Series:
    for column in candidates:
        if column in frame.columns:
            return frame[column]
    return pd.Series(default, index=frame.index)


def _league_level(competition_id: pd.Series) -> pd.Series:
    elite = {
        "GB1",
        "ES1",
        "IT1",
        "L1",
        "FR1",
        "CL",
        "EL",
        "PO1",
        "NL1",
        "TR1",
    }
    second = {"GB2", "ES2", "IT2", "L2", "FR2", "BE1", "SC1"}
    normalized = competition_id.fillna("OTHER").astype(str).str.upper()
    return np.select([normalized.isin(elite), normalized.isin(second)], [1, 2], default=3)


def _clean_outliers(frame: pd.DataFrame, numeric_columns: list[str]) -> pd.DataFrame:
    cleaned = frame.copy()
    for column in numeric_columns:
        if column not in cleaned.columns:
            continue
        cleaned[column] = pd.to_numeric(cleaned[column], errors="coerce")
        lower = cleaned[column].quantile(0.01)
        upper = cleaned[column].quantile(0.99)
        cleaned[column] = cleaned[column].clip(lower=lower, upper=upper)
    return cleaned


def create_training_table(raw: dict[str, pd.DataFrame]) -> pd.DataFrame:
    players = _to_datetime(raw["players"], ["date_of_birth"])
    appearances = _to_datetime(raw["appearances"], ["date"])
    games = _to_datetime(raw["games"], ["date"])
    valuations = _to_datetime(raw["valuations"], ["date", "datetime"])
    clubs = raw["clubs"].copy()

    appearances["minutes_played"] = pd.to_numeric(_first_existing(appearances, ["minutes_played", "minutes"]), errors="coerce").fillna(0)
    appearances["goals"] = pd.to_numeric(_first_existing(appearances, ["goals"]), errors="coerce").fillna(0)
    appearances["assists"] = pd.to_numeric(_first_existing(appearances, ["assists"]), errors="coerce").fillna(0)

    game_columns = ["game_id", "date", "season", "competition_id", "home_club_id", "away_club_id"]
    games_available = [column for column in game_columns if column in games.columns]
    match_log = appearances.merge(games[games_available], on="game_id", how="left", suffixes=("", "_game"))
    match_log["date"] = match_log["date"].fillna(match_log.get("date_game"))
    match_log["season"] = pd.to_numeric(match_log.get("season"), errors="coerce")
    match_log["year"] = match_log["date"].dt.year
    match_log["performance_score"] = (
        match_log["goals"] * 4.0
        + match_log["assists"] * 3.0
        + match_log["minutes_played"] / 90.0
    )

    match_log = match_log.sort_values(["player_id", "date"])
    rolling_recent = (
        match_log.groupby("player_id")["performance_score"]
        .rolling(5, min_periods=1)
        .mean()
        .reset_index(level=0, drop=True)
    )
    match_log["recent_form_match"] = rolling_recent

    player_stats = (
        match_log.groupby("player_id")
        .agg(
            total_goals=("goals", "sum"),
            total_assists=("assists", "sum"),
            total_minutes=("minutes_played", "sum"),
            minutes_played_avg=("minutes_played", "mean"),
            recent_form=("recent_form_match", "last"),
            season=("season", "max"),
            year=("year", "max"),
            league=("competition_id", "last"),
        )
        .reset_index()
    )
    minutes_safe = player_stats["total_minutes"].replace(0, np.nan)
    player_stats["goals_per_90"] = (player_stats["total_goals"] / minutes_safe * 90).fillna(0)
    player_stats["assists_per_90"] = (player_stats["total_assists"] / minutes_safe * 90).fillna(0)
    player_stats["league_level"] = _league_level(player_stats["league"])

    club_id_column = "current_club_id" if "current_club_id" in players.columns else "club_id"
    players = players.rename(columns={club_id_column: "club_id"})
    players["position"] = _first_existing(players, ["sub_position", "position"], "Unknown").fillna("Unknown")
    players["club_id"] = pd.to_numeric(players["club_id"], errors="coerce")

    club_names = clubs.rename(columns={"name": "club", "club_code": "club_code"})
    club_name_column = "club"
    if club_name_column not in club_names.columns and "pretty_name" in club_names.columns:
        club_names = club_names.rename(columns={"pretty_name": "club"})
    club_features = club_names[[column for column in ["club_id", "club", "domestic_competition_id"] if column in club_names.columns]]

    club_perf_home = games.groupby("home_club_id")["home_club_goals"].mean() if {"home_club_id", "home_club_goals"}.issubset(games.columns) else pd.Series(dtype=float)
    club_perf_away = games.groupby("away_club_id")["away_club_goals"].mean() if {"away_club_id", "away_club_goals"}.issubset(games.columns) else pd.Series(dtype=float)
    club_strength = pd.concat([club_perf_home, club_perf_away]).groupby(level=0).mean().rename("club_strength").reset_index().rename(columns={"index": "club_id"})
    club_features = club_features.merge(club_strength, on="club_id", how="left")

    value_column = "market_value_in_eur" if "market_value_in_eur" in valuations.columns else "market_value"
    valuations[value_column] = pd.to_numeric(valuations[value_column], errors="coerce")
    valuations = valuations.dropna(subset=["player_id", value_column]).sort_values(["player_id", "date"])
    valuations["market_value_lag_1"] = valuations.groupby("player_id")[value_column].shift(1)
    valuations["market_value_lag_2"] = valuations.groupby("player_id")[value_column].shift(2)
    valuations["market_value_delta"] = valuations[value_column] - valuations["market_value_lag_1"]
    latest_values = valuations.groupby("player_id").tail(1)

    table = (
        latest_values[["player_id", "date", value_column, "market_value_lag_1", "market_value_lag_2", "market_value_delta"]]
        .merge(player_stats, on="player_id", how="left")
        .merge(players[["player_id", "name", "date_of_birth", "position", "club_id"]], on="player_id", how="left")
        .merge(club_features, on="club_id", how="left")
    )

    table = table.rename(columns={value_column: "market_value_in_eur"})
    table["age"] = ((table["date"] - table["date_of_birth"]).dt.days / 365.25).fillna(25)
    table["club"] = table["club"].fillna("Unknown Club")
    table["league"] = table["league"].fillna(table.get("domestic_competition_id", "OTHER")).fillna("OTHER")
    table["position"] = table["position"].fillna("Unknown")
    table["season"] = pd.to_numeric(table["season"], errors="coerce").fillna(table["date"].dt.year)
    table["year"] = pd.to_numeric(table["year"], errors="coerce").fillna(table["date"].dt.year)
    table["club_strength"] = pd.to_numeric(table["club_strength"], errors="coerce").fillna(table["club_strength"].median())

    for column in NUMERIC_FEATURES:
        table[column] = pd.to_numeric(table[column], errors="coerce")
        table[column] = table[column].fillna(table[column].median() if table[column].notna().any() else 0)

    table = _clean_outliers(table, NUMERIC_FEATURES + ["market_value_in_eur"])
    table = table.dropna(subset=["market_value_in_eur"])
    return table


def prepare_model_data(data_dir: str | Path = "../data") -> PreparedData:
    table = create_training_table(load_raw_data(data_dir))
    features = table[MODEL_FEATURES].copy()
    target = table["market_value_in_eur"].copy()
    return PreparedData(features=features, target=target, raw=table)


def build_prediction_frame(payload: dict, defaults: dict | None = None) -> pd.DataFrame:
    defaults = defaults or {}
    row = {
        "age": payload.get("age", 25),
        "goals_per_90": payload.get("goals_per_90", 0.15),
        "assists_per_90": payload.get("assists_per_90", 0.08),
        "minutes_played_avg": payload.get("minutes_played_avg", 65),
        "recent_form": payload.get("recent_form", defaults.get("recent_form", 1.0)),
        "club_strength": payload.get("club_strength", defaults.get("club_strength", 1.5)),
        "league_level": payload.get("league_level", defaults.get("league_level", 1)),
        "season": payload.get("season", defaults.get("season", 2025)),
        "year": payload.get("year", defaults.get("year", 2026)),
        "market_value_lag_1": payload.get("market_value_lag_1", defaults.get("market_value_lag_1", 10_000_000)),
        "market_value_lag_2": payload.get("market_value_lag_2", defaults.get("market_value_lag_2", 9_000_000)),
        "market_value_delta": payload.get("market_value_delta", defaults.get("market_value_delta", 1_000_000)),
        "club": payload.get("club", "Unknown Club"),
        "position": payload.get("position", "Unknown"),
        "league": payload.get("league", defaults.get("league", "GB1")),
    }
    return pd.DataFrame([row], columns=MODEL_FEATURES)
