# Notebooks

Use this folder for exploratory analysis and experiment notebooks.

Suggested workflow:

1. Profile nulls, outliers, and date ranges in the Kaggle CSVs.
2. Validate joins between `players`, `appearances`, `games`, `clubs`, and `player_valuations`.
3. Compare model residuals by position, club, league, and age band.
4. Export final training code into `backend/preprocessing.py` and `backend/train_model.py`.
