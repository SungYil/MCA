from fastapi import APIRouter, Depends
from services import stock_service, ai_service
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/market",
    tags=["market"],
)

class MarketBriefResponse(BaseModel):
    analysis: str

@router.get("/analysis", response_model=MarketBriefResponse)
async def get_market_analysis():
    """
    Get AI-generated daily market briefing.
    """
    # 1. Gather raw data
    data = stock_service.get_market_brief_data()
    
    # 2. Generate Report
    report = await ai_service.ai_service.generate_market_briefing(data)
    
    return {"analysis": report}
