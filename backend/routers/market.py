from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import schema
from services import stock_service, ai_service
from pydantic import BaseModel
from datetime import datetime
import pytz
import datetime as dt

router = APIRouter(
    prefix="/api/market",
    tags=["market"],
)

# Simple In-Memory Cache
_dashboard_cache = {
    "data": None,
    "expires": datetime.min
}

class MarketBriefResponse(BaseModel):
    analysis: str

@router.get("/analysis", response_model=MarketBriefResponse)
async def get_market_analysis(db: Session = Depends(get_db)):
    """
    Get AI-generated daily market briefing.
    """
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    current_hour = now.hour

    if 6 <= current_hour < 12:
        block_name = "Morning"
    elif 12 <= current_hour < 18:
        block_name = "Afternoon"
    else:
        block_name = "Evening"

    latest_report = db.query(schema.MarketReport)\
        .order_by(desc(schema.MarketReport.created_at))\
        .first()

    should_generate = True
    if latest_report:
        if latest_report.report_type == block_name:
            now_utc = datetime.now(pytz.utc)
            report_time = latest_report.created_at
            if report_time.tzinfo is None:
                report_time = pytz.utc.localize(report_time)
            
            time_diff = (now_utc - report_time).total_seconds() / 3600
            if time_diff < 10: 
                should_generate = False
                return {"analysis": latest_report.content}

    if should_generate:
        try:
            data = stock_service.get_market_brief_data()
        except Exception as e:
             print(f"Error fetching market data: {e}")
             data = {"indices": {}, "news": []}

        report_content = await ai_service.ai_service.generate_market_briefing(data)
        
        new_report = schema.MarketReport(
            report_type=block_name,
            content=report_content
        )
        db.add(new_report)
        db.commit()
        
        return {"analysis": report_content}

@router.get("/dashboard")
def get_dashboard_summary():
    """
    Returns aggregated data for the Home Dashboard.
    """
    # Check Cache
    now = datetime.now()
    if _dashboard_cache["data"] and _dashboard_cache["expires"] > now:
        return _dashboard_cache["data"]

    # 1. Exchange Rate
    rate = stock_service.get_exchange_rate("usd", "krw")

    # 2. Market Map Data
    # 2. Market Map Data (Top ~50 US Stocks)
    map_tickers = [
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", # Mag 7
        "AVGO", "AMD", "QCOM", "TXN", "INTC", "MU", "CRWD", "PLTR", # Semis/Tech
        "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "BLK", # Financials
        "LLY", "UNH", "JNJ", "MRK", "ABBV", "PFE", "TMO", # Healthcare
        "WMT", "COST", "PG", "KO", "PEP", "HD", "MCD", "NKE", "SBUX", # Consumer
        "NFLX", "DIS", "CMCSA", "TMUS", # Comm
        "XOM", "CVX", "CAT", "GE", "DE", "HON", "BA", # Industrial/Energy
        "QQQ", "SPY", "DIA" # Indices
    ]
    
    # Batch fetch
    batch_data = stock_service.get_batch_stock_prices(map_tickers)
    
    def get_weight(ticker):
        if ticker in ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META"]: return 4000
        if ticker in ["TSLA", "AVGO", "LLY", "JPM", "V", "WMT", "XOM", "UNH"]: return 2000
        if ticker in ["QQQ", "SPY", "DIA"]: return 0 # Hide indices from visual map
        return 500 # Default for others

    def get_sector(ticker):
        if ticker in ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "AVGO", "AMD", "QCOM", "TXN", "INTC", "MU", "CRWD", "PLTR", "CRM", "ADBE"]: return "Technology"
        if ticker in ["JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "BLK", "AXP"]: return "Financial"
        if ticker in ["LLY", "UNH", "JNJ", "MRK", "ABBV", "PFE", "TMO", "BMY", "AMGN"]: return "Healthcare"
        if ticker in ["WMT", "COST", "PG", "KO", "PEP", "HD", "MCD", "NKE", "SBUX", "CL"]: return "Consumer"
        if ticker in ["NFLX", "DIS", "CMCSA", "TMUS", "VZ", "T"]: return "Communication"
        if ticker in ["XOM", "CVX", "CAT", "GE", "DE", "HON", "BA", "LMT", "UPS", "UNP"]: return "Industrials"
        if ticker in ["QQQ", "SPY", "DIA"]: return "Indices"
        return "Others"

    heatmap_data = []
    for item in batch_data:
        t = item["ticker"]
        w = get_weight(t)
        s = get_sector(t)
        
        # Skip indices for visual map
        if s == "Indices":
            continue

        heatmap_data.append({
            "ticker": t,
            "change_percent": item["change_percent"],
            "price": item["price"],
            "weight": w,
            "sector": s
        })

    # FINAL SAFEGUARD: If heatmap is empty (YF failed + Mock failed), force data.
    if not heatmap_data:
        print("WARNING: Heatmap data empty. Using emergency fallback.")
        heatmap_data = [
            {"ticker": "AAPL", "change_percent": 1.2, "price": 220.0, "weight": 3500},
            {"ticker": "MSFT", "change_percent": 0.5, "price": 410.0, "weight": 3400},
            {"ticker": "NVDA", "change_percent": -1.5, "price": 120.0, "weight": 3300},
            {"ticker": "GOOGL", "change_percent": 2.1, "price": 175.0, "weight": 2100},
            {"ticker": "AMZN", "change_percent": -0.2, "price": 180.0, "weight": 2200},
        ]

    result = {
        "exchange_rate": rate,
        "heatmap": heatmap_data
    }
    
    # Update Cache (60 seconds)
    _dashboard_cache["data"] = result
    _dashboard_cache["expires"] = now + dt.timedelta(seconds=60)
    
    return result
