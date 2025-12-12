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
            time_diff = (datetime.utcnow() - latest_report.created_at).total_seconds() / 3600
            if time_diff < 10: # Reasonable window for a block
                should_generate = False
                return {"analysis": latest_report.content}

    if should_generate:
        # 1. Gather raw data
        try:
            data = stock_service.stock_service.get_market_brief_data()
        except:
             # Fallback fix if stock_service instance structure changed (as seen in previous error)
             from services import stock_service as ss
             data = ss.stock_service.get_market_brief_data()

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
