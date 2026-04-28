# Architecture

## Data Layer

The Kaggle Player Scores CSVs live in `data/` and are intentionally ignored by git. `backend/preprocessing.py` loads `players.csv`, `appearances.csv`, `games.csv`, `player_valuations.csv`, and `clubs.csv`, then creates the training table.

## Feature Pipeline

The feature pipeline creates performance aggregates, rolling recent form, age, club strength, league level, season/year fields, and market value lag features. Numeric values are imputed and scaled; club, position, and league are one-hot encoded.

## Model Layer

`backend/train_model.py` compares Linear Regression, Random Forest, and XGBoost. The best model and UI metadata are saved to `backend/model.pkl`.

## API Layer

`backend/main.py` exposes a FastAPI application. If `model.pkl` is missing, the API serves a transparent heuristic fallback so the frontend remains demoable.

## Frontend

The frontend is a Next.js App Router app styled with Tailwind CSS. It includes:

- Home dashboard
- Prediction form with sliders, dropdowns, and club search
- Result page with player card and historical value trend
- Recharts visualizations and lucide icons

## Deployment

- Backend: Render or Railway with `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Frontend: Vercel with `NEXT_PUBLIC_API_URL` pointed at the backend
- Docker Compose: local two-service stack when Docker Desktop is installed
