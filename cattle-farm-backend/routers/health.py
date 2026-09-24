"""
routers/health.py — Module 1: Real-Time Cattle Health Monitoring
================================================================
IoT-ready architecture:
  - Same API endpoint receives data from auto_feed.py (demo) OR real IoT sensors
  - Auto-detects abnormal cattle from 1000+ animals
  - Sends alerts to owner when HIGH/MEDIUM risk detected
  - Routes to Module 2 based on risk level:
      HIGH   → /api/vet/map + /api/vet/video-call
      MEDIUM → /api/vet/chat (AI chatbot)
Model: Federated RF (FedAvg) — best of RF / SVM / XGBoost
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
import numpy as np, joblib, os
from datetime import datetime

from database import get_db
from models import Cattle, HealthRecord

router = APIRouter()

# ── Load FL model ─────────────────────────────────────────────────────────────
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "health_model.pkl")
_bundle     = None

def _load_model():
    global _bundle
    if os.path.exists(_MODEL_PATH):
        _bundle = joblib.load(_MODEL_PATH)
        name    = _bundle.get("model_name", "ML model")
        acc     = _bundle.get("accuracy", "?")
        print(f"[Health] Loaded: {name} (accuracy={acc})")
    else:
        print("[Health] health_model.pkl not found — rule-based fallback active.")
        print("         Run: python ml/train_health_model.py")

_load_model()

FEATURES = ["temperature","heart_rate","respiratory_rate",
            "milk_yield","body_condition","activity_level"]

# Normal ranges for each parameter (for alert messages)
NORMAL_RANGES = {
    "temperature":      (38.0, 39.5, "°C"),
    "heart_rate":       (40.0, 70.0, "bpm"),
    "respiratory_rate": (15.0, 36.0, "br/min"),
    "milk_yield":       (8.0,  25.0, "L/day"),
    "body_condition":   (2.5,  4.5,  "/5"),
    "activity_level":   (3.0,  10.0, "/10"),
}


# ── Pydantic schemas ───────────────────────────────────────────────────────────
class CattleCreate(BaseModel):
    tag_number: str
    name:       Optional[str]   = None
    breed:      Optional[str]   = "Mixed"
    age_years:  Optional[float] = None
    weight_kg:  Optional[float] = None
    farm_node:  Optional[str]   = "node_1"

class HealthInput(BaseModel):
    cattle_id:        int
    temperature:      float
    heart_rate:       float
    respiratory_rate: float
    milk_yield:       float
    body_condition:   float
    activity_level:   float
    farm_node:        Optional[str] = "node_1"


# ── ML prediction ─────────────────────────────────────────────────────────────
def predict_health_risk(data: HealthInput):
    features = np.array([[
        data.temperature, data.heart_rate, data.respiratory_rate,
        data.milk_yield,  data.body_condition, data.activity_level,
    ]])

    if _bundle is not None:
        pipeline   = _bundle["pipeline"]
        idx_map    = _bundle["idx_map"]
        pred_idx   = pipeline.predict(features)[0]
        proba      = pipeline.predict_proba(features)[0]
        label      = idx_map[pred_idx]
        risk_score = float(proba[2])   # probability of "high"
        confidence = float(max(proba))
        return risk_score, label, confidence, list(proba), _bundle.get("model_name","ml")

    # Rule-based fallback
    score = 0.0
    if data.temperature > 40.0:       score += 0.35
    elif data.temperature > 39.5:     score += 0.15
    if data.heart_rate > 80:          score += 0.25
    if data.respiratory_rate > 40:    score += 0.20
    if data.milk_yield < 5:           score += 0.10
    if data.body_condition < 2.0:     score += 0.10
    score  = min(score, 1.0)
    label  = "high" if score > 0.6 else ("medium" if score > 0.3 else "low")
    
    # Fallback probability mapping [low, medium, high]
    if label == "high":
        probs = [0.1, 0.2, round(score, 3)]
    elif label == "medium":
        probs = [0.2, round(score, 3), 0.2]
    else:
        probs = [round(1.0 - score, 3), score, 0.0]
        
    return round(score, 3), label, round(score, 3), probs, "rules"


# ── Build abnormal readings list for alert message ─────────────────────────────
def get_abnormal_readings(data: HealthInput) -> list:
    abnormal = []
    vals = {
        "temperature":      data.temperature,
        "heart_rate":       data.heart_rate,
        "respiratory_rate": data.respiratory_rate,
        "milk_yield":       data.milk_yield,
        "body_condition":   data.body_condition,
        "activity_level":   data.activity_level,
    }
    for param, value in vals.items():
        low, high, unit = NORMAL_RANGES[param]
        if value < low or value > high:
            direction = "HIGH" if value > high else "LOW"
            abnormal.append({
                "parameter": param.replace("_"," ").title(),
                "value":     f"{value}{unit}",
                "normal":    f"{low}–{high}{unit}",
                "status":    direction,
            })
    return abnormal


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/cattle", summary="Register a new animal")
def create_cattle(payload: CattleCreate, db: Session = Depends(get_db)):
    if db.query(Cattle).filter(Cattle.tag_number == payload.tag_number).first():
        raise HTTPException(400, f"Tag {payload.tag_number} already registered")
    cow = Cattle(**payload.dict())
    db.add(cow); db.commit(); db.refresh(cow)
    return {"id": cow.id, "tag_number": cow.tag_number, "message": "Cattle registered"}

@router.get("/cattle", summary="List all cattle")
def list_cattle(farm_node: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Cattle)
    if farm_node: q = q.filter(Cattle.farm_node == farm_node)
    return q.all()

@router.get("/cattle/{cattle_id}", summary="Single animal details")
def get_cattle(cattle_id: int, db: Session = Depends(get_db)):
    cow = db.query(Cattle).filter(Cattle.id == cattle_id).first()
    if not cow: raise HTTPException(404, "Cattle not found")
    return cow


@router.post("/predict", summary="IoT-ready: receive sensor data + predict risk + send alert")
def predict(payload: HealthInput, db: Session = Depends(get_db)):
    cow = db.query(Cattle).filter(Cattle.id == payload.cattle_id).first()
    if not cow: raise HTTPException(404, "Cattle not found")

    risk_score, risk_label, confidence, probabilities, model_used = predict_health_risk(payload)

    # Save reading
    record = HealthRecord(
        cattle_id=payload.cattle_id,   temperature=payload.temperature,
        heart_rate=payload.heart_rate, respiratory_rate=payload.respiratory_rate,
        milk_yield=payload.milk_yield, body_condition=payload.body_condition,
        activity_level=payload.activity_level, risk_score=round(risk_score,3),
        risk_label=risk_label, farm_node=payload.farm_node,
    )
    db.add(record); db.commit(); db.refresh(record)

    # Get abnormal readings for alert
    abnormal = get_abnormal_readings(payload)

    # Build alert message for owner
    alert_message = None
    next_action   = None

    if risk_label == "high":
        alert_message = (
            f"🔴 URGENT ALERT — Cow #{payload.cattle_id} ({cow.tag_number})\n"
            f"Risk: HIGH (score: {round(risk_score,2)})\n"
            f"Abnormal readings: {', '.join(str(a['parameter']) + ': ' + str(a['value']) for a in abnormal)}\n"
            f"Action: Contact vet immediately. Use video call or find nearest vet hospital."
        )
        next_action = {
            "action":     "CALL_VET",
            "message":    "High risk detected — connect to vet immediately",
            "routes": {
                "map":        "/api/vet/map",
                "video_call": "/api/vet/video-call",
            }
        }
    elif risk_label == "medium":
        abnormal_str = ", ".join(str(a['parameter']) + ": " + str(a['value']) for a in abnormal)
        alert_message = (
            f"🟡 ALERT — Cow #{payload.cattle_id} ({cow.tag_number})\n"
            f"Risk: MEDIUM (score: {round(risk_score,2)})\n"
            f"Abnormal readings: {abnormal_str}\n"
            f"Action: Monitor closely. Use AI chatbot for home remedies."
        )
        next_action = {
            "action":  "OPEN_CHATBOT",
            "message": "Medium risk — AI chatbot will give home remedies based on these readings",
            "routes": {
                "chat": f"/api/vet/chat"
            }
        }

    response = {
        "cattle_id":   payload.cattle_id,
        "tag_number":  cow.tag_number,
        "cow_name":    cow.name,
        "farm_node":   payload.farm_node,
        "risk_score":  round(risk_score, 3),
        "risk_label":  risk_label,
        "record_id":   record.id,
        "alert":       risk_label in ["high","medium"],
        "alert_message": alert_message,
        "abnormal_readings": abnormal,
        "next_action": next_action,
        "model_used":  model_used,
        "timestamp":   datetime.now().isoformat(),
        "advice": {
            "low":    "Healthy. Continue routine monitoring.",
            "medium": "Monitor closely. AI chatbot can suggest home remedies.",
            "high":   "Immediate vet attention needed. Isolate animal now.",
        }[risk_label],
    }

    if probabilities is not None and len(probabilities) >= 3:
        response["probabilities"] = {
            "low":    round(probabilities[0], 3),
            "medium": round(probabilities[1], 3),
            "high":   round(probabilities[2], 3),
        }
    
    if confidence is not None:
        response["confidence"] = round(confidence, 3)

    return response


@router.get("/alerts", summary="All HIGH/MEDIUM risk animals — for owner dashboard")
def get_alerts(db: Session = Depends(get_db)):
    subq = (
        db.query(HealthRecord.cattle_id,
                 func.max(HealthRecord.recorded_at).label("latest"))
        .group_by(HealthRecord.cattle_id).subquery()
    )
    risky = (
        db.query(HealthRecord)
        .join(subq, (HealthRecord.cattle_id == subq.c.cattle_id) &
                    (HealthRecord.recorded_at == subq.c.latest))
        .filter(HealthRecord.risk_label.in_(["high","medium"]))
        .all()
    )

    alerts = []
    for r in risky:
        cow = db.query(Cattle).filter(Cattle.id == r.cattle_id).first()
        alerts.append({
            "cattle_id":   r.cattle_id,
            "tag_number":  cow.tag_number if cow else f"COW{r.cattle_id}",
            "cow_name":    cow.name if cow else None,
            "risk_label":  r.risk_label,
            "risk_score":  r.risk_score,
            "temperature": r.temperature,
            "heart_rate":  r.heart_rate,
            "milk_yield":  r.milk_yield,
            "farm_node":   r.farm_node,
            "recorded_at": str(r.recorded_at),
            "next_action": "CALL_VET" if r.risk_label=="high" else "OPEN_CHATBOT",
        })

    alerts.sort(key=lambda x: (x["risk_label"]=="high", x["risk_score"]), reverse=True)
    return {"total_alerts": len(alerts), "high": sum(1 for a in alerts if a["risk_label"]=="high"),
            "medium": sum(1 for a in alerts if a["risk_label"]=="medium"), "animals": alerts}


@router.get("/records/{cattle_id}", summary="Health history for one animal")
def get_records(cattle_id: int, limit: int = 20, db: Session = Depends(get_db)):
    return (
        db.query(HealthRecord)
        .filter(HealthRecord.cattle_id == cattle_id)
        .order_by(HealthRecord.recorded_at.desc())
        .limit(limit).all()
    )


@router.get("/dashboard-stats", summary="Live dashboard summary stats")
def dashboard_stats(db: Session = Depends(get_db)):
    total_cattle  = db.query(Cattle).count()
    total_records = db.query(HealthRecord).count()
    subq = (
        db.query(HealthRecord.cattle_id,
                 func.max(HealthRecord.recorded_at).label("latest"))
        .group_by(HealthRecord.cattle_id).subquery()
    )
    latest = (
        db.query(HealthRecord)
        .join(subq, (HealthRecord.cattle_id == subq.c.cattle_id) &
                    (HealthRecord.recorded_at == subq.c.latest))
        .all()
    )
    model_info = {}
    if _bundle:
        model_info = {
            "name":       _bundle.get("model_name","ML model"),
            "accuracy":   _bundle.get("accuracy"),
            "fl_rounds":  _bundle.get("fl_rounds"),
            "comparison": _bundle.get("comparison",{}),
        }
    return {
        "total_cattle":  total_cattle,
        "high_risk":     sum(1 for r in latest if r.risk_label=="high"),
        "medium_risk":   sum(1 for r in latest if r.risk_label=="medium"),
        "low_risk":      sum(1 for r in latest if r.risk_label=="low"),
        "total_records": total_records,
        "model":         model_info,
        "iot_ready":     True,
        "last_updated":  datetime.now().isoformat(),
    }


@router.get("/model-info", summary="ML model details + FL comparison")
def model_info():
    if _bundle is None:
        return {"status": "rule_based", "message": "Run: python ml/train_health_model.py"}
    return {
        "status":      "ml_active",
        "model_name":  _bundle.get("model_name"),
        "accuracy":    _bundle.get("accuracy"),
        "cv_mean":     _bundle.get("cv_mean"),
        "fl_rounds":   _bundle.get("fl_rounds"),
        "fl_round_acc":_bundle.get("fl_round_acc"),
        "features":    _bundle.get("features"),
        "comparison":  _bundle.get("comparison",{}),
        "iot_ready":   True,
    }


@router.get("/simulate-feed", summary="IoT simulation: generate one reading per cattle (for testing)")
def simulate_feed(db: Session = Depends(get_db)):
    import random
    cattle_list = db.query(Cattle).all()
    if not cattle_list:
        return {"message": "No cattle registered. Run seed.py first."}
    results = []
    for cow in cattle_list:
        is_sick = random.random() < 0.1
        reading = HealthInput(
            cattle_id        = cow.id,
            temperature      = round(float(np.random.normal(40.8 if is_sick else 38.8, 0.3)), 1),
            heart_rate       = round(float(np.random.normal(88   if is_sick else 55,   5.0)), 1),
            respiratory_rate = round(float(np.random.normal(48   if is_sick else 25,   3.0)), 1),
            milk_yield       = round(float(np.random.normal(3    if is_sick else 14,   2.0)), 1),
            body_condition   = round(float(np.random.normal(1.8  if is_sick else 3.4,  0.2)), 1),
            activity_level   = round(float(np.random.normal(1.5  if is_sick else 6.5,  0.8)), 1),
            farm_node        = cow.farm_node,
        )
        risk_score, risk_label, *_ = predict_health_risk(reading)
        results.append({"cattle_id": cow.id, "tag": cow.tag_number,
                         "risk_label": risk_label, "risk_score": round(risk_score,3)})
    return {"readings_generated": len(results), "results": results,
            "note": "For continuous real-time feed, run: python auto_feed.py"}