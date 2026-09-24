"""
Run this once after starting the server to populate sample data.
  python seed.py
"""
import requests, random, datetime

BASE = "http://localhost:8000/api"

cattle_list = [
    {"tag_number": "C001", "name": "Lakshmi",  "breed": "HF Cross",  "age_years": 4.5, "weight_kg": 420, "farm_node": "node_1"},
    {"tag_number": "C002", "name": "Ganga",    "breed": "Jersey",    "age_years": 3.0, "weight_kg": 380, "farm_node": "node_1"},
    {"tag_number": "C003", "name": "Saraswati","breed": "Sahiwal",   "age_years": 5.0, "weight_kg": 400, "farm_node": "node_2"},
    {"tag_number": "C004", "name": "Kaveri",   "breed": "Gir",       "age_years": 2.5, "weight_kg": 350, "farm_node": "node_2"},
]

print("Seeding cattle...")
ids = []
for c in cattle_list:
    r = requests.post(f"{BASE}/health/cattle", json=c)
    if r.status_code == 200:
        ids.append(r.json()["id"])
        print(f"  Created {c['tag_number']}")
    else:
        print(f"  {c['tag_number']} already exists or error: {r.text}")

print("\nSeeding health records...")
for cid in ids:
    for _ in range(5):
        r = requests.post(f"{BASE}/health/predict", json={
            "cattle_id":        cid,
            "temperature":      round(random.uniform(38.0, 40.5), 1),
            "heart_rate":       round(random.uniform(42, 75), 0),
            "respiratory_rate": round(random.uniform(18, 42), 0),
            "milk_yield":       round(random.uniform(5, 18), 1),
            "body_condition":   round(random.uniform(2.5, 4.5), 1),
            "activity_level":   round(random.uniform(3, 9), 1),
            "farm_node":        "node_1",
        })
        if r.ok:
            print(f"  Health record for cattle {cid}: {r.json()['risk_label']}")

print("\nSeeding milk tests...")
for cid in ids:
    r = requests.post(f"{BASE}/milk/test", json={
        "cattle_id":     cid,
        "fat_percent":   round(random.uniform(3.2, 6.5), 2),
        "snf_percent":   round(random.uniform(7.8, 9.2), 2),
        "ph_level":      round(random.uniform(6.5, 6.9), 2),
        "temperature":   round(random.uniform(6, 14), 1),
        "adulteration":  round(random.uniform(0, 0.3), 2),
        "bacteria_count": round(random.uniform(30, 200), 0),
    })
    if r.ok:
        print(f"  Milk test for cattle {cid}: {r.json()['verdict']} ({r.json()['purity_score']})")

print("\nSeeding finance records...")
buyers = ["Nandini Dairy", "Local Market", "Co-op Society"]
for cid in ids:
    for day in range(7):
        r = requests.post(f"{BASE}/finance/milk-sale", json={
            "cattle_id":       cid,
            "litres":          round(random.uniform(8, 18), 1),
            "price_per_litre": round(random.uniform(30, 45), 2),
            "buyer_name":      random.choice(buyers),
        })
        if r.ok:
            print(f"  Sale for cattle {cid}: ₹{r.json()['total_amount']}")

    requests.post(f"{BASE}/finance/expense", json={
        "cattle_id":   cid,
        "record_type": "feed",
        "description": "Monthly feed cost",
        "amount":      round(random.uniform(800, 1500), 2),
    })

print("\nSeeding buyers directory...")
for b in [
    {"name": "Nandini Dairy",   "phone": "080-12345678", "location": "Mysuru",    "buyer_type": "dairy",       "avg_price": 38.0},
    {"name": "Co-op Society",   "phone": "9876543210",   "location": "Mandya",    "buyer_type": "cooperative", "avg_price": 36.5},
    {"name": "Local Market",    "phone": "9765432109",   "location": "Hunsur",    "buyer_type": "individual",  "avg_price": 34.0},
]:
    requests.post(f"{BASE}/finance/buyers", json=b)

print("\nSeed complete! Visit http://localhost:8000/docs to explore the API.")