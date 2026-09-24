# Cattle Farm Backend — FastAPI

AI-Based Smart Cattle Farm Management System  
4 modules, fully connected, REST API + Socket.IO

---

## Quick Start

```bash
# 1. Create & activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac / Linux

# 2. Install all dependencies
pip install -r requirements.txt

# 3. Start the server
uvicorn main:socket_app --reload --port 8000

# 4. Open API docs in browser
http://localhost:8000/docs

# 5. (Optional) Seed sample data
python seed.py
```

---

## Project Structure

```
cattle-farm-backend/
├── main.py           — FastAPI app + Socket.IO setup
├── database.py       — SQLAlchemy engine + session
├── models.py         — All database table definitions
├── requirements.txt  — Python dependencies
├── seed.py           — Sample data for testing
└── routers/
    ├── health.py     — Module 1: health monitoring + ML prediction
    ├── vet.py        — Module 2: AI first-aid + vet consultation
    ├── milk.py       — Module 3: milk purity + PDF certificate
    └── finance.py    — Module 4: finance + forecasting
```

---

## API Endpoints

### Module 1 — Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/health/cattle | Register new animal |
| GET  | /api/health/cattle | List all cattle |
| POST | /api/health/predict | Run health risk prediction |
| GET  | /api/health/records/{id} | Health history for animal |
| GET  | /api/health/alerts | All high-risk animals |
| GET  | /api/health/dashboard-stats | Summary for dashboard |

### Module 2 — Vet
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/vet/first-aid | Get AI first-aid response |
| GET  | /api/vet/map | Nearby vets with coordinates |
| POST | /api/vet/prescription/{id} | Save prescription + auto-log expense |
| GET  | /api/vet/video-token/{room} | Get Jitsi video call URL |
| GET  | /api/vet/consultations | List all consultations |

### Module 3 — Milk
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/milk/test | Run purity test + generate PDF cert |
| GET  | /api/milk/certificate/{id} | Download PDF certificate |
| GET  | /api/milk/tests | All test records |
| GET  | /api/milk/stats | Pass rate + avg purity |

### Module 4 — Finance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/finance/milk-sale | Record milk sale |
| POST | /api/finance/expense | Record expense |
| GET  | /api/finance/ledger | Full transaction ledger |
| GET  | /api/finance/pl-report | Monthly P&L report |
| GET  | /api/finance/animal-ranking | Per-animal profit ranking |
| GET  | /api/finance/price-forecast | 30-day milk price forecast |
| GET  | /api/finance/dashboard | Finance summary |
| POST | /api/finance/buyers | Add buyer to directory |
| GET  | /api/finance/buyers | List all buyers |

---

## Socket.IO Events (Module 2 — Live Chat)

Connect to `ws://localhost:8000` with socket.io-client.

| Event (emit) | Payload | Description |
|---|---|---|
| `join_room` | `{room: "consult-123"}` | Join a consultation room |
| `chat_message` | `{room, sender, text, timestamp}` | Send a message |

| Event (listen) | Payload | Description |
|---|---|---|
| `chat_message` | `{sender, text, timestamp}` | Receive a message |
| `system_message` | `{text}` | System notifications |

---

## Environment / Integrations

- **Gemma AI** — Install Ollama, then `ollama pull gemma:2b`
- **Jitsi video** — Free, no API key needed
- **Prophet forecast** — Needs 10+ milk sale records to activate
- **Federated learning** — Add `flwr` training in `ml/federated.py`

---
uvicorn main:socket_app --reload --port 8000
## Frontend URL

Set this in your React `.env` file:
```
VITE_API_URL=http://localhost:8000
```