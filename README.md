# Football Transfer Market Value Predictor

Full-stack machine learning project for estimating a football player's transfer market value from performance, demographic, historical valuation, club, and league signals.

## Overview

The project uses the Kaggle Player Scores dataset to build a regression pipeline and serve predictions through FastAPI. The frontend is a modern dark sports analytics dashboard built with React, Next.js, Tailwind CSS, lucide icons, and Recharts.

Dataset: https://www.kaggle.com/datasets/davidcariboo/player-scores

## Project Structure

```text
backend/
  main.py
  preprocessing.py
  train_model.py
  model.pkl
  requirements.txt
  Dockerfile
frontend/
  app/
  components/
  public/
  package.json
  Dockerfile
data/
  README.md
notebooks/
  README.md
README.md
docker-compose.yml
```

## Dataset Files

Place these files in `data/`:

- `players.csv`
- `appearances.csv`
- `games.csv`
- `player_valuations.csv`
- `clubs.csv`

## Features Used

- `goals_per_90`
- `assists_per_90`
- `minutes_played_avg`
- `recent_form`: rolling last 5 match performance
- `age`
- `club_strength`: average club scoring performance
- `league_level`
- `season` and `year`
- `market_value_lag_1`, `market_value_lag_2`, and `market_value_delta`
- Encoded categorical features: club, position, league

## Model Training

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train_model.py --data-dir ../data --output model.pkl --metrics metrics.json
```

The trainer evaluates:

- Linear Regression baseline
- Random Forest Regressor with grid search
- XGBoost Regressor with grid search, when `xgboost` is installed

Metrics written to `backend/metrics.json`:

- RMSE
- MAE
- R2 Score

On a fresh clone without the Kaggle CSVs, the API uses a transparent heuristic fallback so the UI remains demoable. Run training to replace it with `backend/model.pkl`.

## Backend API

```bash
cd backend
uvicorn main:app --reload
```

Open `http://localhost:8000/docs`.

Prediction endpoint:

```http
POST /predict
```

Input:

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

Output:

```json
{
  "predicted_market_value": 68000000.0
}
```

Extra endpoints:

- `GET /metadata`
- `GET /feature-importance`
- `GET /players/search?q=`
- `POST /compare`
- `GET /health`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

Pages:

- Home page with project overview and market trend chart
- Prediction page with sliders, dropdowns, autocomplete-style club search, feature importance chart, loading spinner, and player card UI
- Result page showing `Estimated Market Value: EUR X Million` with a historical value trend graph

Set API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Docker

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Deployment

Backend on Render or Railway:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Upload or generate `model.pkl` during build/release if trained predictions are required

Frontend on Vercel:

- Root directory: `frontend`
- Build command: `npm run build`
- Output handled by Next.js
- Environment variable: `NEXT_PUBLIC_API_URL=https://your-api-host`

## UI Screenshots

Add screenshots after running locally:

- `docs/screenshots/home.png`
- `docs/screenshots/predict.png`
- `docs/screenshots/result.png`

## Notes

The training pipeline is designed around the Kaggle dataset schema, with defensive handling for missing columns and date conversion. Model quality depends heavily on the downloaded dataset version and final train/test split.
