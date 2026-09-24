"""
main.py — GauRaksha Backend Entry Point
========================================
Run: uvicorn main:socket_app --reload --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from database import Base, engine
from routers import health, vet, milk, finance

Base.metadata.create_all(bind=engine)

# Configurable CORS Origins
ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
).split(",")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="GauRaksha — Smart Cattle Farm API",
    description="AI-Based Integrated Cattle Farm Management — 4 Modules",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,  prefix="/api/health",  tags=["Module 1 — Health"])
app.include_router(vet.router,     prefix="/api/vet",     tags=["Module 2 — Vet"])
app.include_router(milk.router,    prefix="/api/milk",    tags=["Module 3 — Milk"])
app.include_router(finance.router, prefix="/api/finance", tags=["Module 4 — Finance"])

# ── Socket.IO — Real-time vet call notifications + chat ───────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS,
    logger=False,
    engineio_logger=False,
)
socket_app = socketio.ASGIApp(sio, app, socketio_path="/socket.io")

connected_vets = {}   # {sid: vet_name}


@sio.event
async def connect(sid, environ, auth=None):
    role = (auth or {}).get("role", "farmer")
    name = (auth or {}).get("name", "unknown")
    if role == "vet":
        connected_vets[sid] = name
        print(f"[Socket.IO] Vet connected: {name} ({sid})")
    else:
        print(f"[Socket.IO] Farmer connected: {name} ({sid})")


@sio.event
async def disconnect(sid):
    if sid in connected_vets:
        name = connected_vets.pop(sid)
        print(f"[Socket.IO] Vet disconnected: {name} ({sid})")
        await sio.emit("vet_offline", {"vet_name": name})
    else:
        print(f"[Socket.IO] Client disconnected: {sid}")


@sio.event
async def join_room(sid, data):
    room = data.get("room", "default")
    name = data.get("name", "user")
    role = data.get("role", "farmer")
    await sio.enter_room(sid, room)

    await sio.emit("user_joined", {
        "name": name, "role": role, "room": room
    }, room=room, skip_sid=sid)

    await sio.emit("room_joined", {
        "room": room,
        "message": f"Connected to consultation room: {room}"
    }, to=sid)
    print(f"[Socket.IO] {name} ({role}) joined room: {room}")


@sio.event
async def chat_message(sid, data):
    room = data.get("room", "default")
    await sio.emit("chat_message", {
        "sender":    data.get("sender", "User"),
        "role":      data.get("role", "farmer"),
        "text":      data.get("text", ""),
        "timestamp": data.get("timestamp", ""),
    }, room=room)


@sio.event
async def call_request(sid, data):
    print(f"[Socket.IO] Call request from farmer: {data.get('farmer_name')} "
          f"for cow #{data.get('cattle_id')}")

    if connected_vets:
        await sio.emit("incoming_call", {
            "cattle_id":   data.get("cattle_id"),
            "farmer_name": data.get("farmer_name"),
            "risk_label":  data.get("risk_label"),
            "risk_score":  data.get("risk_score"),
            "room_id":     data.get("room_id"),
            "room_url":    f"https://meet.jit.si/{data.get('room_id')}",
            "cow_context": data.get("cow_context", ""),
            "timestamp":   data.get("timestamp", ""),
        })
        print(f"[Socket.IO] Call request sent to {len(connected_vets)} vet(s)")
    else:
        await sio.emit("no_vet_available", {
            "message":   "No vet is currently online. Please try calling directly.",
            "emergency": "1962",
        }, to=sid)
        print("[Socket.IO] No vet online — farmer notified")

    await sio.emit("health_alert", {
        "cattle_id": data.get("cattle_id"),
        "risk":      data.get("risk_label"),
        "type":      "video_call_requested",
    })


@sio.event
async def call_accepted(sid, data):
    room_id  = data.get("room_id")
    vet_name = data.get("vet_name", "Dr. Vet")
    room_url = f"https://meet.jit.si/{room_id}"

    print(f"[Socket.IO] {vet_name} accepted call — room: {room_id}")

    await sio.emit("call_accepted", {
        "room_id":  room_id,
        "room_url": room_url,
        "vet_name": vet_name,
        "message":  f"{vet_name} accepted your call. Click to join video.",
    }, room=room_id)


@sio.event
async def health_alert_broadcast(sid, data):
    await sio.emit("health_alert", data)


@app.get("/")
def root():
    return {
        "status":      "running",
        "version":     "2.0.0",
        "docs":        "/docs",
        "modules": {
            "module_1": "/api/health — Real-time cattle health (IoT-ready)",
            "module_2": "/api/vet   — Vet assistance + video call",
            "module_3": "/api/milk  — Milk purity + buyer marketplace",
            "module_4": "/api/finance — Farm finance + cow ranking",
        },
        "iot_ready":    True,
        "fl_model":     "Federated RF (FedAvg — best of RF/SVM/XGBoost)",
        "video_call":   "Jitsi Meet (real two-way, no app needed)",
        "auto_feed":    "python auto_feed.py (run for demo)",
        "socket_io":    "ws://localhost:8000/socket.io",
        "vets_online":  len(connected_vets),
    }


@app.get("/health-check")
def health_check():
    return {"status": "ok", "socket_io": "mounted", "vets_online": len(connected_vets)}