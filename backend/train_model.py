from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from preprocessing import CATEGORICAL_FEATURES, NUMERIC_FEATURES, prepare_model_data
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    from xgboost import XGBRegressor
except ImportError:
    XGBRegressor = None


def build_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", min_frequency=5)),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )


def evaluate(model: Pipeline, x_test, y_test) -> dict[str, float]:
    predictions = np.maximum(model.predict(x_test), 0)
    return {
        "rmse": float(mean_squared_error(y_test, predictions, squared=False)),
        "mae": float(mean_absolute_error(y_test, predictions)),
        "r2": float(r2_score(y_test, predictions)),
    }


def train(data_dir: str, output_path: str, metrics_path: str) -> dict:
    prepared = prepare_model_data(data_dir)
    x_train, x_test, y_train, y_test = train_test_split(
        prepared.features,
        prepared.target,
        test_size=0.2,
        random_state=42,
    )

    candidates: dict[str, Pipeline | GridSearchCV] = {
        "linear_regression": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor()),
                ("model", LinearRegression()),
            ]
        ),
        "random_forest": GridSearchCV(
            Pipeline(
                steps=[
                    ("preprocessor", build_preprocessor()),
                    ("model", RandomForestRegressor(random_state=42, n_jobs=-1)),
                ]
            ),
            param_grid={
                "model__n_estimators": [250, 500],
                "model__max_depth": [10, 18, None],
                "model__min_samples_leaf": [1, 3],
            },
            cv=3,
            scoring="neg_root_mean_squared_error",
            n_jobs=-1,
        ),
    }

    if XGBRegressor is not None:
        candidates["xgboost"] = GridSearchCV(
            Pipeline(
                steps=[
                    ("preprocessor", build_preprocessor()),
                    (
                        "model",
                        XGBRegressor(
                            objective="reg:squarederror",
                            random_state=42,
                            n_jobs=-1,
                            tree_method="hist",
                        ),
                    ),
                ]
            ),
            param_grid={
                "model__n_estimators": [300, 600],
                "model__max_depth": [3, 5],
                "model__learning_rate": [0.03, 0.08],
                "model__subsample": [0.8, 1.0],
            },
            cv=3,
            scoring="neg_root_mean_squared_error",
            n_jobs=-1,
        )

    results = {}
    best_name = ""
    best_estimator = None
    best_rmse = float("inf")

    for name, estimator in candidates.items():
        estimator.fit(x_train, y_train)
        fitted = estimator.best_estimator_ if isinstance(estimator, GridSearchCV) else estimator
        metrics = evaluate(fitted, x_test, y_test)
        if isinstance(estimator, GridSearchCV):
            metrics["best_params"] = estimator.best_params_
        results[name] = metrics
        if metrics["rmse"] < best_rmse:
            best_rmse = metrics["rmse"]
            best_name = name
            best_estimator = fitted

    if best_estimator is None:
        raise RuntimeError("No model was trained.")

    artifact = {
        "model": best_estimator,
        "best_model": best_name,
        "metrics": results,
        "defaults": {
            "recent_form": float(prepared.raw["recent_form"].median()),
            "club_strength": float(prepared.raw["club_strength"].median()),
            "league_level": float(prepared.raw["league_level"].median()),
            "market_value_lag_1": float(prepared.raw["market_value_lag_1"].median()),
            "market_value_lag_2": float(prepared.raw["market_value_lag_2"].median()),
            "market_value_delta": float(prepared.raw["market_value_delta"].median()),
            "season": int(prepared.raw["season"].median()),
            "year": int(prepared.raw["year"].median()),
            "league": str(prepared.raw["league"].mode().iat[0]),
        },
        "clubs": sorted(prepared.raw["club"].dropna().astype(str).unique().tolist())[:250],
        "positions": sorted(prepared.raw["position"].dropna().astype(str).unique().tolist()),
        "players": prepared.raw[["name", "club", "position", "market_value_in_eur"]]
        .dropna(subset=["name"])
        .sort_values("market_value_in_eur", ascending=False)
        .head(1000)
        .to_dict(orient="records"),
    }

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, output_path)
    Path(metrics_path).write_text(json.dumps(results, indent=2), encoding="utf-8")
    return {"best_model": best_name, "metrics": results, "rows": len(prepared.features)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the Football Transfer Market Value Predictor.")
    parser.add_argument("--data-dir", default="../data")
    parser.add_argument("--output", default="model.pkl")
    parser.add_argument("--metrics", default="metrics.json")
    args = parser.parse_args()
    print(json.dumps(train(args.data_dir, args.output, args.metrics), indent=2))
