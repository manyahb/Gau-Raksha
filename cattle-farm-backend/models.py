from sqlalchemy import (Column, Integer, String, Float, Boolean,
                        DateTime, Text, ForeignKey)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# ── Cattle ────────────────────────────────────────────────────────────────────
class Cattle(Base):
    __tablename__ = "cattle"
    id         = Column(Integer, primary_key=True, index=True)
    tag_number = Column(String, unique=True, index=True, nullable=False)
    name       = Column(String)
    breed      = Column(String)
    age_years  = Column(Float)
    weight_kg  = Column(Float)
    farm_node  = Column(String, default="node_1")
    created_at = Column(DateTime, server_default=func.now())

    health_records   = relationship("HealthRecord",    back_populates="cattle")
    milk_tests       = relationship("MilkTest",        back_populates="cattle")
    finance_records  = relationship("FinanceRecord",   back_populates="cattle")
    consultations    = relationship("VetConsultation", back_populates="cattle")


# ── Module 1 — Health ─────────────────────────────────────────────────────────
class HealthRecord(Base):
    __tablename__ = "health_records"
    id               = Column(Integer, primary_key=True, index=True)
    cattle_id        = Column(Integer, ForeignKey("cattle.id"), nullable=False)
    temperature      = Column(Float)
    heart_rate       = Column(Float)
    respiratory_rate = Column(Float)
    milk_yield       = Column(Float)
    body_condition   = Column(Float)
    activity_level   = Column(Float)
    risk_score       = Column(Float)
    risk_label       = Column(String)    # low / medium / high
    farm_node        = Column(String)
    alert_sent       = Column(Boolean, default=False)
    recorded_at      = Column(DateTime, server_default=func.now())

    cattle = relationship("Cattle", back_populates="health_records")


# ── Module 2 — Vet Consultation ───────────────────────────────────────────────
class VetConsultation(Base):
    __tablename__ = "vet_consultations"
    id               = Column(Integer, primary_key=True, index=True)
    cattle_id        = Column(Integer, ForeignKey("cattle.id"), nullable=True)
    farmer_name      = Column(String)
    symptoms         = Column(Text)
    ai_response      = Column(Text)
    level            = Column(String)    # ai_chatbot / map / video
    vet_name         = Column(String, nullable=True)
    prescription     = Column(Text, nullable=True)
    med_cost         = Column(Float, default=0.0)
    consultation_fee = Column(Float, default=0.0)
    status           = Column(String, default="open")   # open / closed
    jitsi_room_id    = Column(String, nullable=True)
    created_at       = Column(DateTime, server_default=func.now())

    cattle = relationship("Cattle", back_populates="consultations")


# ── Module 3 — Milk Purity ────────────────────────────────────────────────────
class MilkTest(Base):
    __tablename__ = "milk_tests"
    id               = Column(Integer, primary_key=True, index=True)
    cattle_id        = Column(Integer, ForeignKey("cattle.id"), nullable=True)
    fat_percent      = Column(Float)
    snf_percent      = Column(Float)
    ph_level         = Column(Float)
    temperature      = Column(Float)
    adulteration     = Column(Float)
    bacteria_count   = Column(Float)
    verdict          = Column(String)    # pass / fail
    purity_score     = Column(Float)
    certificate_path = Column(String, nullable=True)
    buyer_name       = Column(String, nullable=True)
    litres_sold      = Column(Float, nullable=True)
    sale_amount      = Column(Float, nullable=True)
    tested_at        = Column(DateTime, server_default=func.now())

    cattle = relationship("Cattle", back_populates="milk_tests")


# ── Module 4 — Finance ────────────────────────────────────────────────────────
class FinanceRecord(Base):
    __tablename__ = "finance_records"
    id              = Column(Integer, primary_key=True, index=True)
    cattle_id       = Column(Integer, ForeignKey("cattle.id"), nullable=True)
    record_type     = Column(String)  # milk_sale/cattle_sale/feed/medicine/vaccination/other
    description     = Column(String)
    amount          = Column(Float)   # positive=income, negative=expense
    litres          = Column(Float, nullable=True)
    price_per_litre = Column(Float, nullable=True)
    buyer_name      = Column(String, nullable=True)
    milk_test_id    = Column(Integer, ForeignKey("milk_tests.id"), nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

    cattle = relationship("Cattle", back_populates="finance_records")


# ── Buyers directory ──────────────────────────────────────────────────────────
class Buyer(Base):
    __tablename__ = "buyers"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    phone      = Column(String)
    location   = Column(String)
    buyer_type = Column(String)
    avg_price  = Column(Float)
    created_at = Column(DateTime, server_default=func.now())


# ── Registered vets (for vet console) ─────────────────────────────────────────
class RegisteredVet(Base):
    __tablename__ = "registered_vets"
    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String, nullable=False)
    specialization = Column(String)
    phone          = Column(String)
    district       = Column(String)
    available      = Column(Boolean, default=True)
    console_token  = Column(String, nullable=True)   # simple auth for vet console
    created_at     = Column(DateTime, server_default=func.now())
