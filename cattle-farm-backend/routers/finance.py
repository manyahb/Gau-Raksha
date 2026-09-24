"""
routers/finance.py — Module 4: Farm Finance & Profit Tracking
=============================================================
Features:
  - Auto-collects from all modules (health vet costs + milk sales)
  - Manual expense entry with category
  - Per-cow P&L with daily/monthly breakdown
  - Cow ranking leaderboard (most profitable)
  - Click any cow → full statistics + history
  - Daily farm report
  - Prophet price forecast
  - Buyers directory
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, date

from database import get_db
from models import FinanceRecord, Buyer, Cattle, MilkTest, HealthRecord, VetConsultation

router = APIRouter()


# ── Pydantic schemas ───────────────────────────────────────────────────────────
class MilkSaleInput(BaseModel):
    cattle_id:       Optional[int] = None
    litres:          float
    price_per_litre: float
    buyer_name:      Optional[str] = None
    milk_test_id:    Optional[int] = None

class ExpenseInput(BaseModel):
    cattle_id:   Optional[int] = None
    record_type: str           # feed / medicine / vaccination / labour / equipment / other
    description: str
    amount:      float

class BuyerCreate(BaseModel):
    name:       str
    phone:      Optional[str] = None
    location:   Optional[str] = None
    buyer_type: Optional[str] = "individual"
    avg_price:  Optional[float] = None


# ── Milk sale ──────────────────────────────────────────────────────────────────
@router.post("/milk-sale", summary="Record milk sale (also called from milk module)")
def record_milk_sale(payload: MilkSaleInput, db: Session = Depends(get_db)):
    total   = round(payload.litres * payload.price_per_litre, 2)
    test_id = payload.milk_test_id

    if not test_id and payload.cattle_id:
        latest = (db.query(MilkTest)
                  .filter(MilkTest.cattle_id==payload.cattle_id, MilkTest.verdict=="pass")
                  .order_by(MilkTest.tested_at.desc()).first())
        if latest: test_id = latest.id

    record = FinanceRecord(
        cattle_id=payload.cattle_id, record_type="milk_sale",
        description=f"Milk sale — {payload.litres}L @ ₹{payload.price_per_litre}/L",
        amount=total, litres=payload.litres, price_per_litre=payload.price_per_litre,
        buyer_name=payload.buyer_name, milk_test_id=test_id,
    )
    db.add(record); db.commit(); db.refresh(record)
    return {"record_id": record.id, "total_amount": total,
            "certificate_attached": test_id is not None,
            "message": f"Sale of ₹{total} recorded."}


@router.post("/expense", summary="Add manual expense (feed, vaccination, labour, etc.)")
def record_expense(payload: ExpenseInput, db: Session = Depends(get_db)):
    record = FinanceRecord(
        cattle_id=payload.cattle_id, record_type=payload.record_type,
        description=payload.description, amount=-abs(payload.amount),
    )
    db.add(record); db.commit(); db.refresh(record)
    return {"record_id": record.id, "amount": record.amount,
            "message": "Expense recorded."}


# ── Per-cow full statistics (click on cow) ─────────────────────────────────────
@router.get("/cow-stats/{cattle_id}", summary="Full statistics for one cow — click to view")
def cow_stats(cattle_id: int, db: Session = Depends(get_db)):
    cow = db.query(Cattle).filter(Cattle.id == cattle_id).first()
    if not cow: raise HTTPException(404, "Cattle not found")

    records   = db.query(FinanceRecord).filter(FinanceRecord.cattle_id == cattle_id).all()
    health    = (db.query(HealthRecord).filter(HealthRecord.cattle_id == cattle_id)
                 .order_by(HealthRecord.recorded_at).all())
    milk_tests= (db.query(MilkTest).filter(MilkTest.cattle_id == cattle_id)
                 .order_by(MilkTest.tested_at.desc()).all())

    income   = sum(r.amount for r in records if r.amount > 0)
    expenses = sum(r.amount for r in records if r.amount < 0)
    net      = income + expenses

    daily_sales = {}
    for r in records:
        if r.record_type == "milk_sale" and r.created_at:
            day = r.created_at.strftime("%Y-%m-%d")
            if day not in daily_sales:
                daily_sales[day] = {"date": day, "litres": 0, "income": 0, "buyer": r.buyer_name}
            daily_sales[day]["litres"] += r.litres or 0
            daily_sales[day]["income"] += r.amount

    expense_breakdown = {}
    for r in records:
        if r.amount < 0:
            t = r.record_type
            expense_breakdown[t] = expense_breakdown.get(t, 0) + abs(r.amount)

    health_events = [
        {
            "date":       str(h.recorded_at),
            "risk_label": h.risk_label,
            "risk_score": h.risk_score,
            "temperature":h.temperature,
            "heart_rate": h.heart_rate,
        }
        for h in health if h.risk_label in ["medium","high"]
    ]

    milk_trend = [
        {
            "date":       str(m.tested_at),
            "verdict":    m.verdict,
            "purity":     m.purity_score,
            "fat":        m.fat_percent,
        }
        for m in milk_tests[:14]
    ]

    total_litres = sum(r.litres for r in records if r.litres) or 0

    return {
        "cattle_id":   cattle_id,
        "tag_number":  cow.tag_number,
        "name":        cow.name,
        "breed":       cow.breed,
        "age_years":   cow.age_years,
        "farm_node":   cow.farm_node,
        "financial_summary": {
            "total_income":   round(income,   2),
            "total_expenses": round(abs(expenses), 2),
            "net_profit":     round(net,       2),
            "profitable":     net > 0,
            "total_litres":   round(total_litres, 1),
        },
        "daily_milk_sales":   sorted(daily_sales.values(), key=lambda x: x["date"], reverse=True),
        "expense_breakdown":  {k: round(v,2) for k,v in expense_breakdown.items()},
        "health_events":      health_events,
        "milk_quality_trend": milk_trend,
        "total_health_records": len(health),
        "total_milk_tests":     len(milk_tests),
    }


# ── Cow ranking leaderboard ───────────────────────────────────────────────────
@router.get("/ranking", summary="Cow profitability leaderboard — ranked by income")
def cow_ranking(
    period: str = "all",   # all / today / month
    db: Session = Depends(get_db)
):
    cattle_list = db.query(Cattle).all()
    today  = datetime.now()
    ranking = []

    start_of_day   = datetime.combine(today.date(), datetime.min.time())
    end_of_day     = datetime.combine(today.date(), datetime.max.time())
    start_of_month = datetime(today.year, today.month, 1)

    for cow in cattle_list:
        q = db.query(FinanceRecord).filter(FinanceRecord.cattle_id == cow.id)

        if period == "today":
            q = q.filter(FinanceRecord.created_at >= start_of_day, FinanceRecord.created_at <= end_of_day)
        elif period == "month":
            q = q.filter(FinanceRecord.created_at >= start_of_month)

        records     = q.all()
        income      = sum(r.amount for r in records if r.amount > 0)
        expense     = sum(r.amount for r in records if r.amount < 0)
        net         = income + expense
        milk_litres = sum(r.litres for r in records if r.litres) or 0

        latest_health = (db.query(HealthRecord)
                         .filter(HealthRecord.cattle_id == cow.id)
                         .order_by(HealthRecord.recorded_at.desc()).first())

        ranking.append({
            "cattle_id":      cow.id,
            "tag_number":     cow.tag_number,
            "name":           cow.name,
            "breed":          cow.breed,
            "farm_node":      cow.farm_node,
            "income":         round(income, 2),
            "expenses":       round(abs(expense), 2),
            "net_profit":     round(net, 2),
            "total_litres":   round(milk_litres, 1),
            "profitable":     net > 0,
            "health_status":  latest_health.risk_label if latest_health else "unknown",
            "verdict":        "keep" if net > 0 else ("monitor" if net > -500 else "consider_selling"),
        })

    ranking.sort(key=lambda x: x["net_profit"], reverse=True)
    for i, item in enumerate(ranking):
        item["rank"] = i + 1
        if i == 0: item["badge"] = "🏆 Top earner"
        elif i == 1: item["badge"] = "🥈 2nd"
        elif i == 2: item["badge"] = "🥉 3rd"

    return {
        "period":       period,
        "total_cattle": len(ranking),
        "total_income": round(sum(r["income"] for r in ranking), 2),
        "animals":      ranking,
    }


# ── Daily farm report ──────────────────────────────────────────────────────────
@router.get("/daily-report", summary="Complete daily report for entire farm")
def daily_report(report_date: Optional[str] = None, db: Session = Depends(get_db)):
    if report_date:
        d = datetime.strptime(report_date, "%Y-%m-%d").date()
    else:
        d = datetime.now().date()

    day_records = [
        r for r in db.query(FinanceRecord).all()
        if r.created_at and r.created_at.date() == d
    ]

    income   = sum(r.amount for r in day_records if r.amount > 0)
    expenses = sum(abs(r.amount) for r in day_records if r.amount < 0)
    net      = income - expenses

    milk_sales = [r for r in day_records if r.record_type == "milk_sale"]
    total_litres = sum(r.litres for r in milk_sales if r.litres) or 0

    buyers_today = {}
    for r in milk_sales:
        b = r.buyer_name or "Unknown"
        if b not in buyers_today:
            buyers_today[b] = {"litres": 0, "amount": 0}
        buyers_today[b]["litres"] += r.litres or 0
        buyers_today[b]["amount"] += r.amount

    sick_today = [
        r for r in db.query(HealthRecord).all()
        if r.recorded_at and r.recorded_at.date() == d
        and r.risk_label in ["high","medium"]
    ]
    sick_info = []
    for r in sick_today:
        cow = db.query(Cattle).filter(Cattle.id == r.cattle_id).first()
        sick_info.append({
            "cow": cow.tag_number if cow else f"#{r.cattle_id}",
            "risk": r.risk_label,
            "temp": r.temperature,
        })

    milk_today = [
        m for m in db.query(MilkTest).all()
        if m.tested_at and m.tested_at.date() == d
    ]
    failed_batches = [m for m in milk_today if m.verdict == "fail"]

    return {
        "date":            str(d),
        "financial": {
            "total_income":   round(income, 2),
            "total_expenses": round(expenses, 2),
            "net_profit":     round(net, 2),
            "profitable":     net > 0,
        },
        "milk": {
            "total_litres":   round(total_litres, 1),
            "total_sold":     len(milk_sales),
            "buyers":         {k: {"litres": round(v["litres"],1),
                                   "amount": round(v["amount"],2)}
                               for k,v in buyers_today.items()},
        },
        "health": {
            "sick_today":     len(sick_today),
            "sick_animals":   sick_info,
        },
        "milk_quality": {
            "tests_today":    len(milk_today),
            "failed_batches": len(failed_batches),
        },
    }


# ── P&L report ─────────────────────────────────────────────────────────────────
@router.get("/pl-report", summary="Monthly P&L report")
def pl_report(year: int = datetime.now().year,
              month: int = datetime.now().month,
              db: Session = Depends(get_db)):
              
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    records = (db.query(FinanceRecord)
               .filter(FinanceRecord.created_at >= start_date, FinanceRecord.created_at < end_date)
               .all())
               
    income   = sum(r.amount for r in records if r.amount > 0)
    expenses = sum(r.amount for r in records if r.amount < 0)
    net      = income + expenses
    
    breakdown = {}
    for r in records:
        t = r.record_type
        breakdown[t] = breakdown.get(t, 0) + abs(r.amount)

    return {
        "period":    f"{year}-{month:02d}",
        "income":    round(income,    2),
        "expenses":  round(abs(expenses), 2),
        "net_profit":round(net,       2),
        "profitable":net > 0,
        "breakdown": {k: round(v,2) for k,v in breakdown.items()},
        "transaction_count": len(records),
    }


# ── Ledger ─────────────────────────────────────────────────────────────────────
@router.get("/ledger", summary="Full transaction ledger")
def get_ledger(record_type: Optional[str]=None, cattle_id: Optional[int]=None,
               limit: int=100, db: Session = Depends(get_db)):
    q = db.query(FinanceRecord)
    if record_type: q = q.filter(FinanceRecord.record_type==record_type)
    if cattle_id:   q = q.filter(FinanceRecord.cattle_id==cattle_id)
    return q.order_by(FinanceRecord.created_at.desc()).limit(limit).all()


# ── Price forecast ─────────────────────────────────────────────────────────────
@router.get("/price-forecast", summary="Milk price forecast for next 30 days (Prophet)")
def price_forecast(db: Session = Depends(get_db)):
    try:
        from prophet import Prophet
        import pandas as pd

        records = (db.query(FinanceRecord)
                   .filter(FinanceRecord.record_type=="milk_sale",
                           FinanceRecord.price_per_litre.isnot(None))
                   .order_by(FinanceRecord.created_at).all())

        if len(records) < 10:
            return _mock_forecast()

        df = pd.DataFrame([{"ds": r.created_at.date(), "y": r.price_per_litre}
                            for r in records])
        df = df.groupby("ds").mean().reset_index()
        df["ds"] = pd.to_datetime(df["ds"])

        model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
        model.fit(df)
        future   = model.make_future_dataframe(periods=30)
        forecast = model.predict(future)
        result   = forecast[["ds","yhat","yhat_lower","yhat_upper"]].tail(30)

        return {
            "forecast": [
                {"date":      row["ds"].strftime("%Y-%m-%d"),
                 "predicted": round(row["yhat"],2),
                 "lower":     round(row["yhat_lower"],2),
                 "upper":     round(row["yhat_upper"],2)}
                for _,row in result.iterrows()
            ],
            "source": "prophet",
        }
    except Exception:
        return _mock_forecast()


def _mock_forecast():
    import random; base = 35.0; today = datetime.now()
    return {
        "forecast": [
            {"date":      (today+timedelta(days=i)).strftime("%Y-%m-%d"),
             "predicted": round(base+random.uniform(-3,5)+i*0.05, 2),
             "lower":     round(base-4+i*0.05, 2),
             "upper":     round(base+7+i*0.05, 2)}
            for i in range(1,31)
        ],
        "source": "mock (add more sales data for real forecast)",
    }


# ── Buyers directory ────────────────────────────────────────────────────────────
@router.post("/buyers", summary="Add buyer")
def add_buyer(payload: BuyerCreate, db: Session = Depends(get_db)):
    buyer = Buyer(**payload.dict())
    db.add(buyer); db.commit(); db.refresh(buyer)
    return buyer

@router.get("/buyers", summary="List all buyers")
def list_buyers(db: Session = Depends(get_db)):
    return db.query(Buyer).all()


# ── Dashboard summary ───────────────────────────────────────────────────────────
@router.get("/dashboard", summary="Finance dashboard summary")
def finance_dashboard(db: Session = Depends(get_db)):
    today      = datetime.now()
    all_records= db.query(FinanceRecord).all()
    today_recs = [r for r in all_records if r.created_at and r.created_at.date()==today.date()]
    month_recs = [r for r in all_records
                  if r.created_at and r.created_at.year==today.year
                  and r.created_at.month==today.month]
    return {
        "today": {
            "income":   round(sum(r.amount for r in today_recs if r.amount>0),2),
            "expenses": round(sum(abs(r.amount) for r in today_recs if r.amount<0),2),
        },
        "this_month": {
            "income":   round(sum(r.amount for r in month_recs if r.amount>0),2),
            "expenses": round(sum(abs(r.amount) for r in month_recs if r.amount<0),2),
            "net":      round(sum(r.amount for r in month_recs),2),
        },
        "total_milk_litres": round(sum(r.litres for r in all_records if r.litres) or 0, 1),
        "total_buyers":      db.query(Buyer).count(),
    }