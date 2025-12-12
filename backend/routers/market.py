from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import schema
from services import stock_service, ai_service
from pydantic import BaseModel
from datetime import datetime, time
import pytz

router = APIRouter(
    prefix="/api/market",
    tags=["market"],
)

class MarketBriefResponse(BaseModel):
    analysis: str

def get_current_time_block():
    """
    Returns the current time block (Morning, Afternoon, Evening) and the start time of that block (for query filtering).
    KST (Korea Standard Time) assumed for user convenience.
    """
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    current_hour = now.hour

    today_str = now.strftime("%Y-%m-%d")
    
    if 6 <= current_hour < 12:
        return "Morning", now.replace(hour=6, minute=0, second=0, microsecond=0)
    elif 12 <= current_hour < 18:
        return "Afternoon", now.replace(hour=12, minute=0, second=0, microsecond=0)
    else:
        # Evening block is 18:00 ~ 06:00 next day.
        # If we are 00:00~06:00, the block started yesterday 18:00.
        if current_hour < 6:
             # Logic simplifies just to 'find latest' within reasonable window, 
             # but strictly, let's say "Effective" block start.
             # Actually, simpler: Just "Evening". We check if report exists >= 18:00 today (if now > 18) OR >= 18:00 yesterday (if now < 6)
             pass 
        return "Evening", now.replace(hour=18, minute=0, second=0, microsecond=0) # Simplified logic, will refine in query

@router.get("/analysis", response_model=MarketBriefResponse)
async def get_market_analysis(db: Session = Depends(get_db)):
    """
    Get AI-generated daily market briefing.
    Uses caching: Returns valid report for the current time block (Morning/Afternoon/Evening).
    """
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    current_hour = now.hour

    # Determine Block
    if 6 <= current_hour < 12:
        block_name = "Morning"
    elif 12 <= current_hour < 18:
        block_name = "Afternoon"
    else:
        block_name = "Evening"

    # Find Latest Report
    latest_report = db.query(schema.MarketReport)\
        .order_by(desc(schema.MarketReport.created_at))\
        .first()

    # Check if we can reuse it
    # Reuse if: Same Block AND Created 'recently' (e.g. within the last 6 hours or just matches the block logic)
    # Simple check: If latest_report matches current block name AND was created 'today' (handle late night logic carefully)
    
    # Let's use a simpler heuristic:
    # If latest report is less than 4 hours old, reuse it. User wants detailed updates 3 times a day.
    # Actually, user said explicitly "Morning, Afternoon, Evening".
    
    should_generate = True
    if latest_report:
        # Convert DB time (usually UTC or naive) to KST for comparison if needed, 
        # or just check age.
        # Assuming DB stores UTC.
        
        # Simple Age Check: If < 2 hours old, definitely reuse.
        # Strict Block Check:
        if latest_report.report_type == block_name:
            # Check if it was created 'today' (relative to the block)
            # e.g. Morning report created at 07:00 is valid at 11:00.
            # Morning report created yesterday is NOT valid.
            
            # Since we just want "freshness", let's check if it was created within the last 6 hours.
            # Fix: Ensure both are timezone aware. DB returns aware (UTC usually).
            now_utc = datetime.now(pytz.utc)
            report_time = latest_report.created_at
            
            # If report_time is naive (shouldn't be with timezone=True), localize it.
            if report_time.tzinfo is None:
                report_time = pytz.utc.localize(report_time)
                
            time_diff = (now_utc - report_time).total_seconds() / 3600
            if time_diff < 10: # Reasonable window for a block
                should_generate = False
                return {"analysis": latest_report.content}

    if should_generate:
        # 1. Gather raw data
        try:
            data = stock_service.get_market_brief_data()
        except Exception as e:
             print(f"Error fetching market data: {e}")
             data = {"indices": {}, "news": []}

        # 2. Generate Report
        report_content = await ai_service.ai_service.generate_market_briefing(data)
        
        # 3. Save to DB
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
    Returns aggregated data for the Home Dashboard:
    1. USDKRW Exchange Rate
    2. Market Map Data (Top Tech stocks performance)
    3. Market Status (implied by data availability/time, handled by frontend)
    """
    # 1. Exchange Rate
    rate = stock_service.get_exchange_rate("usd", "krw")

    # 2. Market Map Data
    # Hardcoded list of market movers for the visual map
    map_tickers = [
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", 
        "AVGO", "COST", "PEP", "KO", "JPM", "AMD", "NFLX"
    ]
    
    # Batch fetch
    batch_data = stock_service.get_batch_stock_prices(map_tickers)
    
    # Enrichment (for TreeMap sizing, usually requires Market Cap)
    # Since we can't fetch 15 market caps efficiently every time without caching,
    # we will use a static 'weight' map for MVP or just 1.0 if unknown.
    # Approximate relative sizing (Mental Model 2024-2025)
    # AAPL/MSFT/NVDA ~ 3.5T, GOOGL/AMZN ~ 2T, META ~ 1.5T, TSLA ~ 1T...
    # We can hardcode weights for the visual impact requested by user ("Finviz style")
    
    weights = {
        "AAPL": 3500, "MSFT": 3400, "NVDA": 3300, "GOOGL": 2100, "AMZN": 2200, 
        "META": 1500, "TSLA": 900, "AVGO": 800, "JPM": 600, "COST": 400,
        "AMD": 300, "NFLX": 300, "PEP": 230, "KO": 280
    }

    heatmap_data = []
    for item in batch_data:
        t = item["ticker"]
        heatmap_data.append({
            "ticker": t,
            "change_percent": item["change_percent"],
            "price": item["price"],
            "weight": weights.get(t, 100) # Default weight
        })

    # Sort checks? Frontend TreeMap might handle it.
    
    return {
        "exchange_rate": rate,
        "heatmap": heatmap_data
    }
