"""
auto_feed.py
============
Simulates real-time IoT sensor data from cattle wearables.
Run this alongside the backend during demo — dashboard updates live.
"""

import os
import requests
import numpy as np
import time
import random
from datetime import datetime

BACKEND  = os.getenv("BACKEND_URL", "http://localhost:8000")
INTERVAL = 30          # seconds between readings
CATTLE_IDS = [1, 2, 3, 4, 5]   # match your DB cattle IDs

FARM_NODES = {1: "node_1", 2: "node_1", 3: "node_1",
              4: "node_2", 5: "node_2"}

COW_HEALTH = {cid: "healthy" for cid in CATTLE_IDS}

def generate_reading(cow_id: int) -> dict:
    if random.random() < 0.08:
        COW_HEALTH[cow_id] = "high"
    elif random.random() < 0.12:
        COW_HEALTH[cow_id] = "medium"
    else:
        COW_HEALTH[cow_id] = "healthy"

    h = COW_HEALTH[cow_id]

    if h == "high":
        return {
            "cattle_id":        cow_id,
            "temperature":      round(np.random.normal(41.2, 0.4), 1),
            "heart_rate":       round(np.random.normal(90,   8.0), 1),
            "respiratory_rate": round(np.random.normal(50,   5.0), 1),
            "milk_yield":       round(np.random.normal(3.0,  1.0), 1),
            "body_condition":   round(np.random.normal(1.8,  0.2), 1),
            "activity_level":   round(np.random.normal(1.5,  0.5), 1),
            "farm_node":        FARM_NODES[cow_id],
        }
    elif h == "medium":
        return {
            "cattle_id":        cow_id,
            "temperature":      round(np.random.normal(39.9, 0.3), 1),
            "heart_rate":       round(np.random.normal(73,   6.0), 1),
            "respiratory_rate": round(np.random.normal(37,   4.0), 1),
            "milk_yield":       round(np.random.normal(7.5,  1.5), 1),
            "body_condition":   round(np.random.normal(2.5,  0.3), 1),
            "activity_level":   round(np.random.normal(3.5,  0.8), 1),
            "farm_node":        FARM_NODES[cow_id],
        }
    else:
        return {
            "cattle_id":        cow_id,
            "temperature":      round(np.random.normal(38.8, 0.3), 1),
            "heart_rate":       round(np.random.normal(55,   5.0), 1),
            "respiratory_rate": round(np.random.normal(25,   3.0), 1),
            "milk_yield":       round(np.random.normal(14,   2.5), 1),
            "body_condition":   round(np.random.normal(3.4,  0.2), 1),
            "activity_level":   round(np.random.normal(6.5,  0.8), 1),
            "farm_node":        FARM_NODES[cow_id],
        }


def send_reading(data: dict) -> dict | None:
    try:
        r = requests.post(
            f"{BACKEND}/api/health/predict",
            json=data, timeout=5)
        if r.ok:
            return r.json()
    except requests.exceptions.ConnectionError:
        print("  [!] Backend not reachable — is uvicorn running?")
    except Exception as e:
        print(f"  [!] Error: {e}")
    return None


def print_status(cow_id: int, data: dict, result: dict | None):
    ts    = datetime.now().strftime("%H:%M:%S")
    h     = COW_HEALTH[cow_id]
    icon  = "🔴 HIGH  " if h == "high" else ("🟡 MEDIUM" if h == "medium" else "🟢 healthy")

    print(f"  [{ts}] Cow #{cow_id} ({FARM_NODES[cow_id]}) {icon} "
          f"| T:{data['temperature']}°C "
          f"HR:{data['heart_rate']}bpm "
          f"RR:{data['respiratory_rate']} "
          f"Milk:{data['milk_yield']}L", end="")

    if result:
        print(f"  → Model: {result.get('risk_label','?').upper()} "
              f"(score={result.get('risk_score','?')})", end="")
        if result.get("alert"):
            print("  ⚠️  ALERT SENT", end="")
    print()


def main():
    print("=" * 65)
    print("  GauRaksha — IoT Sensor Feed Simulator")
    print(f"  Monitoring {len(CATTLE_IDS)} cattle | Reading every {INTERVAL}s")
    print("=" * 65)
    print(f"\n  Backend: {BACKEND}")
    print("\n" + "-" * 65)

    round_num = 0
    while True:
        round_num += 1
        print(f"\n  --- Sensor reading #{round_num} "
              f"[{datetime.now().strftime('%d %b %Y %H:%M:%S')}] ---")

        alerts = []
        for cow_id in CATTLE_IDS:
            data   = generate_reading(cow_id)
            result = send_reading(data)
            print_status(cow_id, data, result)

            if result and result.get("alert"):
                alerts.append({
                    "cow_id":     cow_id,
                    "risk_label": result.get("risk_label"),
                    "risk_score": result.get("risk_score"),
                    "temp":       data["temperature"],
                    "heart_rate": data["heart_rate"],
                })

        if alerts:
            print(f"\n  🚨 ALERTS ({len(alerts)} cow(s) need attention):")
            for a in alerts:
                print(f"     Cow #{a['cow_id']} — {a['risk_label'].upper()} risk "
                      f"(score={a['risk_score']}) "
                      f"T:{a['temp']}°C HR:{a['heart_rate']}bpm")

        print(f"\n  Next reading in {INTERVAL}s ... (Ctrl+C to stop)")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  Auto-feed stopped.")