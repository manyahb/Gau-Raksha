"""
routers/vet.py — Module 2: Vet & AI Chatbot Assistance
=======================================================
Routing logic:
  HIGH risk   → /map (nearby vets) + /video-call (Jitsi)
  MEDIUM risk → /chat (AI chatbot with auto cow context)

Video call: Jitsi Meet — real two-way video, no app needed.
Vet console: /vet-console page for demo vet to accept calls.
Socket.IO:  Real-time call notifications to vet dashboard.
Finance:    All consultation fees auto-logged to Module 4.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import httpx, json, uuid

from database import get_db
from models import VetConsultation, FinanceRecord, HealthRecord, Cattle

router = APIRouter()

# ── Ollama / Gemma config ──────────────────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "gemma3:4b"


# ── Pydantic schemas ───────────────────────────────────────────────────────────
class ChatInput(BaseModel):
    cattle_id:    int           # auto-loads cow's latest sensor readings
    farmer_name:  str
    message:      Optional[str] = ""   # farmer's additional message (optional)

class VideoCallRequest(BaseModel):
    cattle_id:   int
    farmer_name: str
    vet_name:    Optional[str] = "Dr. Ravi Kumar"

class PrescriptionInput(BaseModel):
    consultation_id: int
    vet_name:        str
    prescription:    str
    consultation_fee: float = 0.0
    med_cost:         float = 0.0

class VetCallNotification(BaseModel):
    cattle_id:   int
    farmer_name: str
    room_id:     str
    risk_score:  float
    risk_label:  str


# ── Build auto-context from cow's latest readings ─────────────────────────────
def build_cow_context(cattle_id: int, db: Session) -> str:
    cow = db.query(Cattle).filter(Cattle.id == cattle_id).first()
    latest = (
        db.query(HealthRecord)
        .filter(HealthRecord.cattle_id == cattle_id)
        .order_by(HealthRecord.recorded_at.desc())
        .first()
    )

    if not latest:
        return f"Cow #{cattle_id} — no recent sensor readings available."

    temp_status = ("elevated ⚠️" if latest.temperature > 39.5
                   else "normal ✓" if latest.temperature >= 38.0 else "low ⚠️")
    hr_status   = ("high ⚠️"     if latest.heart_rate > 75
                   else "normal ✓" if latest.heart_rate >= 40   else "low ⚠️")
    rr_status   = ("high ⚠️"     if latest.respiratory_rate > 36
                   else "normal ✓")
    milk_status = ("below normal ⚠️" if latest.milk_yield < 8 else "normal ✓")
    bcs_status  = ("poor ⚠️"     if latest.body_condition < 2.5 else "normal ✓")
    act_status  = ("low ⚠️"      if latest.activity_level < 3   else "normal ✓")

    cow_name  = cow.name if cow else f"Cow #{cattle_id}"
    cow_breed = cow.breed if cow else "Unknown breed"

    context = f"""
=== AUTO-DETECTED COW CONDITION ===
Cow ID     : #{cattle_id} — {cow_name} ({cow_breed})
Risk Level : {latest.risk_label.upper()} (score: {latest.risk_score:.2f})
Farm Node  : {latest.farm_node}

Current Sensor Readings:
• Temperature      : {latest.temperature}°C   [{temp_status}]
• Heart Rate       : {latest.heart_rate} bpm  [{hr_status}]
• Respiratory Rate : {latest.respiratory_rate} br/min [{rr_status}]
• Milk Yield       : {latest.milk_yield} L/day [{milk_status}]
• Body Condition   : {latest.body_condition}/5  [{bcs_status}]
• Activity Level   : {latest.activity_level}/10 [{act_status}]
====================================
"""
    return context.strip()


# ── AI chatbot (Gemma) with auto cow context ──────────────────────────────────
def get_ai_response(cow_context: str, farmer_message: str) -> str:
    system_prompt = """You are an expert cattle veterinarian AI assistant for Indian dairy farmers.
You have been automatically provided with the cow's current sensor readings above.
Based on these readings AND the farmer's message:
1. Identify the likely condition in 1-2 sentences
2. Give 3-4 specific home remedies or care steps the farmer can do RIGHT NOW
3. List warning signs that mean they must call a real vet immediately
Be practical, specific to the readings, and keep response under 250 words."""

    full_prompt = f"{cow_context}\n\n{system_prompt}\n\nFarmer says: {farmer_message or 'Please advise based on the above readings.'}\n\nVeterinary advice:"

    try:
        with httpx.Client(timeout=40) as client:
            resp = client.post(OLLAMA_URL, json={
                "model":  OLLAMA_MODEL,
                "prompt": full_prompt,
                "stream": False,
            })
            return resp.json().get("response", "AI service unavailable.")
    except Exception:
        return (
            "AI service is currently offline. Based on the sensor readings shown above:\n\n"
            "• If temperature is above 40°C: isolate the animal, ensure cool water, reduce sun exposure\n"
            "• If heart rate is above 80 bpm: keep animal calm, reduce physical activity\n"
            "• If milk yield is very low: check feed quality and water intake\n"
            "• If activity is very low: check for lameness or pain signs\n\n"
            "Monitor every 2 hours. If no improvement in 6 hours, contact a vet immediately."
        )


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/chat", summary="Module 2 — AI chatbot (MEDIUM risk) with auto cow context")
def chat_with_ai(payload: ChatInput, db: Session = Depends(get_db)):
    cow_context = build_cow_context(payload.cattle_id, db)
    ai_response = get_ai_response(cow_context, payload.message)

    consultation = VetConsultation(
        cattle_id   = payload.cattle_id,
        farmer_name = payload.farmer_name,
        symptoms    = f"Auto-detected from sensors + farmer note: {payload.message}",
        ai_response = ai_response,
        level       = "ai_chatbot",
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    return {
        "consultation_id":   consultation.id,
        "cow_context":       cow_context,
        "ai_response":       ai_response,
        "escalate_to_video": True,
        "message": "AI advice given based on live sensor readings.",
    }


@router.get("/map", summary="Module 2 — nearby vet hospitals (HIGH risk)")
def get_nearby_vets(lat: float = 12.52, lng: float = 76.90, radius_km: int = 20):
    vets = [
        {
            "id": 1,
            "name":         "Government Veterinary Hospital",
            "type":         "Government",
            "distance_km":  2.1,
            "phone":        "1962",
            "emergency":    "1962",
            "lat":          lat + 0.02,
            "lng":          lng + 0.01,
            "available":    True,
            "open_now":     True,
            "hours":        "9AM–5PM (Emergency 24/7)",
            "services":     ["Emergency", "Surgery", "Vaccination"],
            "rating":       4.2,
        },
        {
            "id": 2,
            "name":         "Dr. Suresh Kumar — Livestock Clinic",
            "type":         "Private",
            "distance_km":  3.8,
            "phone":        "9876543210",
            "emergency":    "9876543210",
            "lat":          lat - 0.03,
            "lng":          lng + 0.02,
            "available":    True,
            "open_now":     True,
            "hours":        "8AM–8PM",
            "services":     ["General", "Cattle specialist", "Home visit"],
            "rating":       4.7,
            "video_consult": True,
        },
        {
            "id": 3,
            "name":         "Karnataka Animal Husbandry Dept.",
            "type":         "Government",
            "distance_km":  5.5,
            "phone":        "080-22212928",
            "emergency":    "1800-425-1188",
            "lat":          lat + 0.04,
            "lng":          lng - 0.02,
            "available":    True,
            "open_now":     False,
            "hours":        "10AM–5PM Mon–Sat",
            "services":     ["Vaccination", "AI service", "Health camps"],
            "rating":       3.9,
        },
        {
            "id": 4,
            "name":         "Dr. Priya Nair — Dairy Specialist",
            "type":         "Private",
            "distance_km":  7.2,
            "phone":        "9765432109",
            "emergency":    "9765432109",
            "lat":          lat + 0.06,
            "lng":          lng + 0.03,
            "available":    True,
            "open_now":     True,
            "hours":        "9AM–7PM",
            "services":     ["Dairy cattle", "Milk fever", "Mastitis"],
            "rating":       4.8,
            "video_consult": True,
        },
    ]

    nearby = [v for v in vets if v["distance_km"] <= radius_km]
    nearby.sort(key=lambda v: v["distance_km"])

    return {
        "your_location": {"lat": lat, "lng": lng},
        "radius_km":     radius_km,
        "total_found":   len(nearby),
        "vets":          nearby,
        "emergency_number": "1962",
        "note": "Call or video call any available vet. Emergency: 1962 (24/7 free govt helpline)",
    }


@router.post("/video-call", summary="Module 2 — Start Jitsi video call (HIGH risk)")
def start_video_call(payload: VideoCallRequest, db: Session = Depends(get_db)):
    room_id  = f"gauraksha-cow{payload.cattle_id}-{uuid.uuid4().hex[:8]}"
    room_url = f"https://meet.jit.si/{room_id}"

    cow_context = build_cow_context(payload.cattle_id, db)

    consultation = VetConsultation(
        cattle_id   = payload.cattle_id,
        farmer_name = payload.farmer_name,
        symptoms    = f"Video consultation requested [Room: {room_id}]. {cow_context[:200]}",
        level       = "video",
        vet_name    = payload.vet_name,
        status      = "open",
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    return {
        "consultation_id": consultation.id,
        "room_id":         room_id,
        "room_url":        room_url,
        "vet_console_url": f"/vet-console?room={room_id}",
        "cow_context":     cow_context,
        "instructions": {
            "farmer": f"Click this link to join: {room_url}",
            "vet":    f"Vet console: /vet-console?room={room_id}",
        },
        "provider": "Jitsi Meet (end-to-end encrypted)",
        "message":  "Video room created. Share the room URL with your vet or use the vet console.",
    }


@router.get("/vet-console-info/{room_id}", summary="Vet console — get consultation details for a room")
def vet_console_info(room_id: str, db: Session = Depends(get_db)):
    consultation = (
        db.query(VetConsultation)
        .filter(
            VetConsultation.level == "video",
            VetConsultation.status == "open",
            VetConsultation.symptoms.like(f"%{room_id}%")
        )
        .order_by(VetConsultation.created_at.desc())
        .first()
    )

    if not consultation:
        consultation = (
            db.query(VetConsultation)
            .filter(VetConsultation.level == "video", VetConsultation.status == "open")
            .order_by(VetConsultation.created_at.desc())
            .first()
        )

    if not consultation:
        raise HTTPException(404, "No active consultation found for this room")

    cow_context = build_cow_context(consultation.cattle_id, db) if consultation.cattle_id else ""

    return {
        "consultation_id": consultation.id,
        "cattle_id":       consultation.cattle_id,
        "farmer_name":     consultation.farmer_name,
        "room_url":        f"https://meet.jit.si/{room_id}",
        "cow_context":     cow_context,
        "created_at":      str(consultation.created_at),
        "message": "Accept the call to start video consultation with the farmer.",
    }


@router.post("/prescription/{consultation_id}", summary="Vet saves prescription + auto-logs to finance")
def save_prescription(
    consultation_id: int,
    payload: PrescriptionInput,
    db: Session = Depends(get_db)
):
    c = db.query(VetConsultation).filter(VetConsultation.id == consultation_id).first()
    if not c:
        raise HTTPException(404, "Consultation not found")

    c.vet_name     = payload.vet_name
    c.prescription = payload.prescription
    c.med_cost     = payload.med_cost
    c.status       = "closed"
    db.commit()

    total_cost = payload.consultation_fee + payload.med_cost
    if total_cost > 0:
        db.add(FinanceRecord(
            cattle_id   = c.cattle_id,
            record_type = "medicine",
            description = f"Vet: {payload.vet_name} — {payload.prescription[:60]}",
            amount      = -abs(total_cost),
        ))
        db.commit()

    return {
        "consultation_id":  consultation_id,
        "prescription":     payload.prescription,
        "consultation_fee": payload.consultation_fee,
        "med_cost":         payload.med_cost,
        "total_cost":       total_cost,
        "finance_logged":   total_cost > 0,
        "message": "Prescription saved. Expense auto-logged to finance tracker.",
    }


@router.get("/consultations", summary="All consultations list")
def list_consultations(
    status:    Optional[str] = None,
    cattle_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(VetConsultation)
    if status:    q = q.filter(VetConsultation.status == status)
    if cattle_id: q = q.filter(VetConsultation.cattle_id == cattle_id)
    return q.order_by(VetConsultation.created_at.desc()).all()


@router.get("/consultations/{consultation_id}", summary="Single consultation")
def get_consultation(consultation_id: int, db: Session = Depends(get_db)):
    c = db.query(VetConsultation).filter(VetConsultation.id == consultation_id).first()
    if not c:
        raise HTTPException(404, "Consultation not found")
    return c


@router.get("/", summary="Vet module status")
def vet_status():
    return {
        "module":  "Module 2 — Vet & AI Chatbot Assistance",
        "routing": {
            "HIGH risk":   "/api/vet/map + /api/vet/video-call",
            "MEDIUM risk": "/api/vet/chat (auto cow context)",
        },
        "video":   "Jitsi Meet — real two-way video, no app needed",
        "chatbot": "Gemma 2B via Ollama — auto-loaded cow sensor context",
    }