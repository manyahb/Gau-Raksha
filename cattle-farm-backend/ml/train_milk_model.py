"""
train_milk_model.py
===================
Trains 3 ML models on milk purity data:
  - Random Forest
  - Gradient Boosting
  - Logistic Regression
Compares all 3, picks best, saves as milk_model.pkl

Dataset: milknew.csv (real Kaggle data — 1059 samples)
If milknew.csv not found, uses synthetic data as fallback.

Run from inside cattle-farm-backend/:
    python ml/train_milk_model.py
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

SEED = 42
np.random.seed(SEED)

SAVE_DIR = os.path.dirname(__file__)


# ── Try loading real Kaggle dataset first ──────────────────────────────────────
def load_dataset():
    kaggle_path = os.path.join(SAVE_DIR, "milknew.csv")

    if os.path.exists(kaggle_path):
        print(f"  Loading real Kaggle dataset: {kaggle_path}")
        df = pd.read_csv(kaggle_path)
        print(f"  Columns found: {df.columns.tolist()}")

        # milknew.csv has: pH, Temprature, Taste, Odor, Fat, Turbidity, Colour, Grade
        # Map to our feature names
        col_map = {}
        cols = [c.strip() for c in df.columns]

        for c in cols:
            cl = c.lower().strip()
            if "ph"    in cl:              col_map[c] = "ph_level"
            elif "temp" in cl:             col_map[c] = "temperature"
            elif "taste" in cl:            col_map[c] = "taste"
            elif "odor" in cl or "odour" in cl: col_map[c] = "odor"
            elif "fat"  in cl:             col_map[c] = "fat_percent"
            elif "turb" in cl:             col_map[c] = "turbidity"
            elif "colo" in cl or "colour" in cl: col_map[c] = "colour"
            elif "grade" in cl or "qualit" in cl: col_map[c] = "grade"

        df = df.rename(columns=col_map)
        features = ["ph_level","temperature","taste","odor",
                    "fat_percent","turbidity","colour"]
        features = [f for f in features if f in df.columns]

        # grade: high/medium/low → pass/fail
        if "grade" in df.columns:
            df["label"] = df["grade"].str.lower().str.strip()
            # keep 3-class for better model
            label_type = "multiclass"
        else:
            df["label"] = "pass"
            label_type = "binary"

        print(f"  Using features: {features}")
        print(f"  Label distribution:\n{df['label'].value_counts().to_string()}")
        return df, features, label_type

    else:
        print("  milknew.csv not found — using synthetic data")
        print("  To use real data: copy milknew.csv into cattle-farm-backend/ml/")
        return generate_synthetic_milk(), \
               ["fat_percent","snf_percent","ph_level",
                "temperature","adulteration","bacteria_count"], "binary"


def generate_synthetic_milk(n_samples=2500):
    rows = []
    n_pass   = int(n_samples * 0.55)
    n_border = int(n_samples * 0.25)
    n_bad    = n_samples - n_pass - n_border

    rows.append(pd.DataFrame({
        "fat_percent":    np.random.normal(4.5,  0.5,  n_pass).clip(3.5, 6.0),
        "snf_percent":    np.random.normal(8.5,  0.3,  n_pass).clip(8.0, 9.0),
        "ph_level":       np.random.normal(6.7,  0.05, n_pass).clip(6.6, 6.8),
        "temperature":    np.random.normal(6.0,  1.5,  n_pass).clip(2.0, 10.0),
        "adulteration":   np.random.uniform(0,   0.12, n_pass),
        "bacteria_count": np.random.normal(40,   20,   n_pass).clip(5, 95),
        "label": ["pass"] * n_pass,
    }))
    rows.append(pd.DataFrame({
        "fat_percent":    np.random.normal(3.2,  0.3,  n_border).clip(2.0, 3.5),
        "snf_percent":    np.random.normal(7.6,  0.3,  n_border).clip(6.5, 8.0),
        "ph_level":       np.random.normal(6.5,  0.1,  n_border).clip(6.2, 6.6),
        "temperature":    np.random.normal(13.0, 2.0,  n_border).clip(10, 18),
        "adulteration":   np.random.uniform(0.15,0.35, n_border),
        "bacteria_count": np.random.normal(130,  30,   n_border).clip(100, 220),
        "label": ["fail"] * n_border,
    }))
    rows.append(pd.DataFrame({
        "fat_percent":    np.random.normal(2.0,  0.5,  n_bad).clip(0.5, 3.5),
        "snf_percent":    np.random.normal(6.5,  0.5,  n_bad).clip(5.0, 8.0),
        "ph_level":       np.random.normal(6.3,  0.2,  n_bad).clip(5.5, 6.6),
        "temperature":    np.random.normal(18.0, 4.0,  n_bad).clip(10, 30),
        "adulteration":   np.random.uniform(0.35,1.0,  n_bad),
        "bacteria_count": np.random.normal(280,  80,   n_bad).clip(100, 600),
        "label": ["fail"] * n_bad,
    }))
    return pd.concat(rows, ignore_index=True).sample(frac=1, random_state=SEED)


def train():
    print("=" * 60)
    print("  GauRaksha — Multi-Model Milk Purity Classifier")
    print("=" * 60)

    print("\n[1/5] Loading dataset …")
    df, features, label_type = load_dataset()

    le = LabelEncoder()
    y  = le.fit_transform(df["label"])
    X  = df[features].values
    # Add realistic measurement noise
    import numpy as np
    np.random.seed(42)
    X = X + np.random.normal(0, 0.08, X.shape)

    labels   = list(le.classes_)
    label_map = {l: int(i) for i, l in enumerate(le.classes_)}
    idx_map   = {int(i): l for i, l in enumerate(le.classes_)}

    print(f"\n[2/5] Train/test split (80/20) …")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y)

    # ── 3 models ──────────────────────────────────────────────────────────────
    candidates = {
        "Random Forest": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    RandomForestClassifier(
                n_estimators=200, max_depth=10,
                min_samples_split=4, min_samples_leaf=2,
                class_weight="balanced", random_state=SEED, n_jobs=-1)),
        ]),
        "Gradient Boosting": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    GradientBoostingClassifier(
                n_estimators=200, max_depth=5,
                learning_rate=0.05, subsample=0.8,
                random_state=SEED)),
        ]),
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    LogisticRegression(
                max_iter=2000, class_weight="balanced",
                random_state=SEED, n_jobs=-1)),
        ]),
    }

    print("\n[3/5] Training and comparing all 3 models …")
    print("-" * 60)
    cv      = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    results = {}

    for name, pipe in candidates.items():
        pipe.fit(X_train, y_train)
        acc      = accuracy_score(y_test, pipe.predict(X_test))
        cv_score = cross_val_score(pipe, X, y, cv=cv, scoring="accuracy")
        results[name] = {
            "pipeline": pipe,
            "accuracy": acc,
            "cv_mean":  cv_score.mean(),
            "cv_std":   cv_score.std(),
        }
        print(f"  {name:<24} test={acc*100:.2f}%  "
              f"CV={cv_score.mean()*100:.2f}% ± {cv_score.std()*100:.2f}%")

    best_name = max(results, key=lambda k: results[k]["cv_mean"])
    best      = results[best_name]
    print(f"\n  ✓ Best model: {best_name}  (CV {best['cv_mean']*100:.2f}%)")

    print(f"\n[4/5] Classification report ({best_name}) …")
    y_pred = best["pipeline"].predict(X_test)
    print(classification_report(y_test, y_pred, target_names=labels))

    print("\n[5/5] Saving best model …")
    save_path = os.path.join(SAVE_DIR, "milk_model.pkl")
    joblib.dump({
        "pipeline":    best["pipeline"],
        "features":    features,
        "labels":      labels,
        "label_map":   label_map,
        "idx_map":     idx_map,
        "label_type":  label_type,
        "accuracy":    round(best["accuracy"], 4),
        "cv_mean":     round(best["cv_mean"], 4),
        "model_name":  best_name,
        "comparison": {
            name: {
                "test_accuracy": round(r["accuracy"], 4),
                "cv_mean":       round(r["cv_mean"], 4),
            }
            for name, r in results.items()
        },
    }, save_path)

    print(f"  Saved → {save_path}")
    print("\nModel comparison summary:")
    for name, r in results.items():
        marker = " ← deployed" if name == best_name else ""
        print(f"  {name:<24} {r['cv_mean']*100:.2f}%{marker}")
    print("=" * 60)


if __name__ == "__main__":
    train()
