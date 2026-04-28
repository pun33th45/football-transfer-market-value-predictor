# Data Folder

Download the Kaggle Player Scores dataset and place these CSV files here:

- `players.csv`
- `appearances.csv`
- `games.csv`
- `player_valuations.csv`
- `clubs.csv`

Dataset: https://www.kaggle.com/datasets/davidcariboo/player-scores

The CSVs are ignored by git because they can be large. After adding them, train the model from `backend/`:

```bash
python train_model.py --data-dir ../data --output model.pkl --metrics metrics.json
```
