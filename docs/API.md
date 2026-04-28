# API

Base URL for local development:

```text
http://localhost:8000
```

## Endpoints

- `GET /health` returns API and model status.
- `GET /metadata` returns available clubs, positions, example players, selected model, and metrics.
- `POST /predict` returns the estimated market value in euros.
- `GET /feature-importance` returns top model feature drivers, or fallback demo importances before training.
- `GET /players/search?q=` returns player autocomplete matches from the trained artifact.
- `POST /compare` predicts and compares two players.

## Prediction Request

```json
{
  "age": 24,
  "goals_per_90": 0.42,
  "assists_per_90": 0.18,
  "minutes_played_avg": 76,
  "club": "Manchester City",
  "position": "Winger"
}
```

## Prediction Response

```json
{
  "predicted_market_value": 68000000.0
}
```
