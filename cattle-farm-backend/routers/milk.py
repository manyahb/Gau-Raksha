from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os, numpy as np, joblib, random

from database import get_db
from models import MilkTest, FinanceRecord, Cattle

router   = APIRouter()
CERT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "certificates"))
os.makedirs(CERT_DIR, exist_ok=True)

# ── Load ML model ─────────────────────────────────────────────────────────────
_MILK_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "milk_model.pkl")
_milk_bundle = None

def _load_milk_model():
    global _milk_bundle
    if os.path.exists(_MILK_MODEL_PATH):
        _milk_bundle = joblib.load(_MILK_MODEL_PATH)
        print(f"[Milk] Loaded: {_milk_bundle.get('model_name','ML')} "
              f"(accuracy={_milk_bundle['accuracy']})")
    else:
        print("[Milk] milk_model.pkl not found — run: python ml/train_milk_model.py")

_load_milk_model()

# ── Expanded Milk Buyers Directory ─────────────────────────────────────────────
MILK_BUYERS = [
    {
        "id":              1,
        "name":            "KMF — Karnataka Milk Federation",
        "brand":           "Nandini",
        "type":            "Government cooperative",
        "base_price":      34.00,
        "phone":           "1800-425-2345",
        "website":         "kmfnandini.coop",
        "min_quantity_L":  5,
        "locations":       ["Bengaluru","Mysuru","Mandya","Hassan","Tumkur"],
        "payment":         "Weekly bank transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              2,
        "name":            "Amul",
        "brand":           "Amul",
        "type":            "Cooperative",
        "base_price":      36.50,
        "phone":           "1800-258-3333",
        "website":         "amul.com",
        "min_quantity_L":  10,
        "locations":       ["Bengaluru","Mysuru"],
        "payment":         "Fortnightly bank transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              3,
        "name":            "Mother Dairy",
        "brand":           "Mother Dairy",
        "type":            "Cooperative Subsidiary",
        "base_price":      35.50,
        "phone":           "1800-180-1015",
        "website":         "motherdairy.com",
        "min_quantity_L":  10,
        "locations":       ["Bengaluru", "Tumkur"],
        "payment":         "Weekly bank transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              4,
        "name":            "Heritage Foods",
        "brand":           "Heritage",
        "type":            "Private company",
        "base_price":      35.00,
        "phone":           "9848012345",
        "website":         "heritagefoods.in",
        "min_quantity_L":  20,
        "locations":       ["Bengaluru","Mysuru","Tumkur"],
        "payment":         "Monthly bank transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              5,
        "name":            "Dodla Dairy",
        "brand":           "Dodla",
        "type":            "Private company",
        "base_price":      33.50,
        "phone":           "9876512345",
        "website":         "dodladairy.com",
        "min_quantity_L":  5,
        "locations":       ["Bengaluru","Hassan","Mandya","Tumkur"],
        "payment":         "Weekly cash or transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              6,
        "name":            "Tirumala Milk Products",
        "brand":           "Tirumala",
        "type":            "Private company",
        "base_price":      34.20,
        "phone":           "1800-425-3333",
        "website":         "tirumalamilk.com",
        "min_quantity_L":  15,
        "locations":       ["Bengaluru", "Kolar", "Tumkur"],
        "payment":         "Bi-weekly bank transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              7,
        "name":            "Hatsun Agro Product",
        "brand":           "Arokya",
        "type":            "Private company",
        "base_price":      34.80,
        "phone":           "044-28400000",
        "website":         "hap.in",
        "min_quantity_L":  10,
        "locations":       ["Bengaluru", "Mysuru", "Mandya"],
        "payment":         "Weekly bank transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              8,
        "name":            "BAMUL — Bangalore Milk Union",
        "brand":           "Nandini (BAMUL)",
        "type":            "District Cooperative",
        "base_price":      34.50,
        "phone":           "080-26096800",
        "website":         "bamulnandini.coop",
        "min_quantity_L":  5,
        "locations":       ["Bengaluru Urban", "Bengaluru Rural", "Ramanagara"],
        "payment":         "Weekly direct transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              9,
        "name":            "Creamline Dairy Products",
        "brand":           "Jersey",
        "type":            "Private company (Godrej)",
        "base_price":      33.80,
        "phone":           "040-23306935",
        "website":         "jerseydairy.in",
        "min_quantity_L":  20,
        "locations":       ["Bengaluru", "Mysuru"],
        "payment":         "Monthly transfer",
        "accepts_quality": ["pass"],
    },
    {
        "id":              10,
        "name":            "Local Village Co-operative Society",
        "brand":           "Local Bulk",
        "type":            "Village cooperative",
        "base_price":      32.00,
        "phone":           "9765498765",
        "website":         None,
        "min_quantity_L":  2,
        "locations":       ["All districts"],
        "payment":         "Daily cash",
        "accepts_quality": ["pass"],
    },
]

# ── Pydantic schemas ───────────────────────────────────────────────────────────
class MilkTestInput(BaseModel):
    cattle_id:      Optional[int] = None
    fat_percent:    float
    snf_percent:    float
    ph_level:       float
    temperature:    float
    adulteration:   float
    bacteria_count: float

class SellMilkInput(BaseModel):
    test_id:         int
    buyer_id:        int
    litres:          float
    price_per_litre: Optional[float] = None

# ── ML prediction ─────────────────────────────────────────────────────────────
def classify_milk(data: MilkTestInput):
    features = np.array([[
        data.fat_percent, data.snf_percent, data.ph_level,
        data.temperature, data.adulteration, data.bacteria_count,
    ]])

    if _milk_bundle is not None:
        pipeline = _milk_bundle["pipeline"]
        pred     = pipeline.predict(features)[0]
        proba    = pipeline.predict_proba(features)[0]
        label    = _milk_bundle["idx_map"][int(pred)]
        score    = round(float(max(proba)) * 100, 1)
        return label, score

    issues = []
    if not (3.5 <= data.fat_percent  <= 6.0): issues.append("fat")
    if not (8.0 <= data.snf_percent  <= 9.0): issues.append("snf")
    if not (6.6 <= data.ph_level     <= 6.8): issues.append("ph")
    if data.temperature   > 10:               issues.append("temp")
    if data.adulteration  > 0.15:             issues.append("adulteration")
    if data.bacteria_count > 100:             issues.append("bacteria")
    score   = max(0, 100 - len(issues) * 15)
    verdict = "pass" if len(issues) < 2 else "fail"
    return verdict, float(score)

def get_today_price(base_price: float) -> float:
    today_seed = int(datetime.now().strftime("%Y%m%d"))
    rng        = random.Random(today_seed)
    variation  = rng.uniform(-1.5, 1.5)
    return round(base_price + variation, 2)

# ── PDF Certificate Generation ───────────────────────────────────────────────
def generate_certificate(test: MilkTest, cow_name: str = "") -> str:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER

        filename = os.path.join(CERT_DIR, f"milk_cert_{test.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf")
        doc    = SimpleDocTemplate(filename, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1*cm, bottomMargin=1.5*cm)
        styles = getSampleStyleSheet()
        story  = []

        GREEN = colors.HexColor("#1D9E75")
        RED   = colors.HexColor("#A32D2D")
        WHITE = colors.white

        hdr_data = [[Paragraph(
            f'<font color="white"><b><font size="20">Milk Quality Certificate</font></b><br/>'
            f'<font size="10">GauRaksha AI Cattle Farm System — RVITM 2025–26</font></font>',
            ParagraphStyle("h", alignment=TA_CENTER))]]
        hdr = Table(hdr_data, colWidths=[18*cm])
        hdr.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),GREEN), ("TOPPADDING",(0,0),(-1,-1),18), ("BOTTOMPADDING",(0,0),(-1,-1),18)]))
        story.append(hdr)
        story.append(Spacer(1,.4*cm))

        story.append(Paragraph(
            f"<b>Cattle:</b> {cow_name or f'ID #{test.cattle_id}'}  &nbsp;&nbsp; "
            f"<b>Test ID:</b> MT-{test.id}  &nbsp;&nbsp; "
            f"<b>Date:</b> {test.tested_at.strftime('%d %b %Y %H:%M') if test.tested_at else datetime.now().strftime('%d %b %Y %H:%M')}",
            styles["Normal"]))
        story.append(Spacer(1,.4*cm))

        rows = [["Parameter","Measured","Standard Range","Status"]]
        params = [
            ("Fat %",          f"{test.fat_percent}%",      "3.5–6.0%",  3.5<=test.fat_percent<=6.0),
            ("SNF %",          f"{test.snf_percent}%",      "8.0–9.0%",  8.0<=test.snf_percent<=9.0),
            ("pH Level",       str(test.ph_level),          "6.6–6.8",   6.6<=test.ph_level<=6.8),
            ("Temperature",    f"{test.temperature}°C",     "≤10°C",     test.temperature<=10),
            ("Adulteration",   f"{test.adulteration:.2f}",  "<0.15",     test.adulteration<0.15),
            ("Bacteria Count", f"{test.bacteria_count}k",   "<100k CFU", test.bacteria_count<100),
        ]
        for name, val, rng, ok in params:
            rows.append([name, val, rng, "✓ Pass" if ok else "✗ Fail"])

        tbl = Table(rows, colWidths=[5*cm,4*cm,4*cm,5*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#085041")),
            ("TEXTCOLOR",(0,0),(-1,0),WHITE),
            ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),
            ("GRID",(0,0),(-1,-1),.5,colors.grey),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,colors.HexColor("#f0faf6")]),
            ("ALIGN",(1,0),(-1,-1),"CENTER"),
            ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(tbl)
        story.append(Spacer(1,.5*cm))

        clr  = GREEN if test.verdict=="pass" else RED
        vtxt = (f"VERDICT: PASSED — Purity Score: {test.purity_score}/100" if test.verdict=="pass" else f"VERDICT: FAILED — Purity Score: {test.purity_score}/100")
        vtbl = Table([[Paragraph(f'<font color="white"><b><font size="16">{vtxt}</font></b></font>', ParagraphStyle("v",alignment=TA_CENTER))]], colWidths=[18*cm])
        vtbl.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),clr), ("TOPPADDING",(0,0),(-1,-1),16), ("BOTTOMPADDING",(0,0),(-1,-1),16)]))
        story.append(vtbl)
        story.append(Spacer(1,.3*cm))

        story.append(HRFlowable(width="100%",thickness=.5,color=colors.grey))
        story.append(Spacer(1,.2*cm))
        story.append(Paragraph(
            '<font size="8" color="grey">AI-generated certificate. Confirm with FSSAI lab. GauRaksha v1.0</font>',
            ParagraphStyle("ft",fontSize=8,alignment=TA_CENTER)))

        doc.build(story)
        return filename
    except Exception as e:
        print(f"[Milk] Certificate error: {e}")
        return None

# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/simulate-reading", summary="IoT simulation: auto-generate milk sensor values")
def simulate_reading(quality: str = "pass"):
    if quality == "pass":
        return {
            "fat_percent":    round(random.uniform(3.5, 6.0), 2),
            "snf_percent":    round(random.uniform(8.0, 9.0), 2),
            "ph_level":       round(random.uniform(6.6, 6.8), 2),
            "temperature":    round(random.uniform(2.0, 9.5), 1),
            "adulteration":   round(random.uniform(0.0, 0.12), 2),
            "bacteria_count": round(random.uniform(10, 90), 1),
            "simulated":      True,
        }
    else:
        return {
            "fat_percent":    round(random.uniform(0.5, 3.0), 2),
            "snf_percent":    round(random.uniform(5.0, 7.5), 2),
            "ph_level":       round(random.uniform(5.5, 6.5), 2),
            "temperature":    round(random.uniform(15, 30), 1),
            "adulteration":   round(random.uniform(0.35, 1.0), 2),
            "bacteria_count": round(random.uniform(150, 600), 1),
            "simulated":      True,
        }

@router.post("/test", summary="Run milk purity test + generate PDF certificate")
def run_milk_test(payload: MilkTestInput, db: Session = Depends(get_db)):
    verdict, purity_score = classify_milk(payload)

    test = MilkTest(
        cattle_id=payload.cattle_id, fat_percent=payload.fat_percent,
        snf_percent=payload.snf_percent, ph_level=payload.ph_level,
        temperature=payload.temperature, adulteration=payload.adulteration,
        bacteria_count=payload.bacteria_count, verdict=verdict,
        purity_score=purity_score,
    )
    db.add(test); db.commit(); db.refresh(test)

    cow_name = ""
    if payload.cattle_id:
        cow = db.query(Cattle).filter(Cattle.id == payload.cattle_id).first()
        if cow: cow_name = f"{cow.name} ({cow.tag_number})"

    cert_path = generate_certificate(test, cow_name)
    if cert_path:
        test.certificate_path = cert_path
        db.commit()

    buyers_today = []
    for b in MILK_BUYERS:
        if verdict in b["accepts_quality"]:
            p = get_today_price(b["base_price"])
            buyers_today.append({
                **b,
                "today_price": p,
                "price": p,           # Fallback for frontend keys looking for 'price'
                "price_per_litre": p  # Fallback for frontend keys looking for 'price_per_litre'
            })
    buyers_today.sort(key=lambda x: x["today_price"], reverse=True)

    return {
        "test_id":        test.id,
        "cattle_id":      payload.cattle_id,
        "verdict":        verdict,
        "purity_score":   purity_score,
        "certificate":    f"/api/milk/certificate/{test.id}" if cert_path else None,
        "model":          _milk_bundle.get("model_name","rule_based") if _milk_bundle else "rule_based",
        "available_buyers": buyers_today if verdict == "pass" else [],
        "message": (
            f"✓ Milk passed quality standards (score: {purity_score}/100). {len(buyers_today)} buyers available today."
            if verdict == "pass"
            else f"✗ Milk failed quality check (score: {purity_score}/100). Do not sell."
        ),
    }

@router.get("/buyers", summary="Milk buyer marketplace with today's prices")
def get_buyers(verdict: str = "pass"):
    buyers = []
    for b in MILK_BUYERS:
        if verdict in b["accepts_quality"]:
            p = get_today_price(b["base_price"])
            buyers.append({
                **b,
                "today_price": p,
                "price": p,
                "price_per_litre": p
            })
    buyers.sort(key=lambda x: x["today_price"], reverse=True)
    return {
        "date":         datetime.now().strftime("%d %b %Y"),
        "total_buyers": len(buyers),
        "buyers":       buyers,
        "tip":          f"Best price today: {buyers[0]['name']} at ₹{buyers[0]['today_price']}/L" if buyers else "",
    }

@router.post("/sell", summary="Record milk sale to chosen buyer + auto-log to finance")
def sell_milk(payload: SellMilkInput, db: Session = Depends(get_db)):
    test = db.query(MilkTest).filter(MilkTest.id == payload.test_id).first()
    if not test: raise HTTPException(404, "Milk test not found")
    if test.verdict != "pass":
        raise HTTPException(400, "Cannot sell failed milk batch")

    buyer = next((b for b in MILK_BUYERS if b["id"] == payload.buyer_id), None)
    if not buyer: raise HTTPException(404, "Buyer not found")

    price = payload.price_per_litre or get_today_price(buyer["base_price"])
    total = round(payload.litres * price, 2)

    finance = FinanceRecord(
        cattle_id       = test.cattle_id,
        record_type     = "milk_sale",
        description     = f"Milk sale — {payload.litres}L to {buyer['name']} @ ₹{price}/L",
        amount          = total,
        litres          = payload.litres,
        price_per_litre = price,
        buyer_name      = buyer["name"],
        milk_test_id    = test.id,
    )
    db.add(finance); db.commit(); db.refresh(finance)

    return {
        "sale_id":        finance.id,
        "test_id":        payload.test_id,
        "buyer":          buyer["name"],
        "litres":         payload.litres,
        "price_per_litre":price,
        "total_amount":   total,
        "certificate":    f"/api/milk/certificate/{test.id}",
        "finance_logged": True,
        "message":        f"₹{total} sale to {buyer['name']} recorded successfully. Finance ledger updated.",
    }

@router.get("/certificate/{test_id}", summary="Download PDF milk quality certificate")
def download_certificate(test_id: int, db: Session = Depends(get_db)):
    test = db.query(MilkTest).filter(MilkTest.id == test_id).first()
    if not test: raise HTTPException(404, "Test not found")
    if not test.certificate_path or not os.path.exists(test.certificate_path):
        raise HTTPException(404, "Certificate not generated")
    return FileResponse(test.certificate_path, media_type="application/pdf", filename=f"milk_certificate_{test_id}.pdf")

@router.get("/tests", summary="All milk tests")
def list_tests(cattle_id: Optional[int]=None, verdict: Optional[str]=None, db: Session = Depends(get_db)):
    q = db.query(MilkTest)
    if cattle_id: q = q.filter(MilkTest.cattle_id == cattle_id)
    if verdict:   q = q.filter(MilkTest.verdict == verdict)
    return q.order_by(MilkTest.tested_at.desc()).all()

@router.get("/stats", summary="Milk quality summary stats")
def milk_stats(db: Session = Depends(get_db)):
    tests  = db.query(MilkTest).all()
    if not tests: return {"total":0,"pass_rate":0,"avg_purity":0}
    passed = [t for t in tests if t.verdict=="pass"]
    return {
        "total":      len(tests),
        "passed":     len(passed),
        "failed":     len(tests)-len(passed),
        "pass_rate":  round(len(passed)/len(tests)*100, 1),
        "avg_purity": round(sum(t.purity_score for t in tests)/len(tests), 1),
        "model":      _milk_bundle.get("model_name","rule_based") if _milk_bundle else "rule_based",
    }