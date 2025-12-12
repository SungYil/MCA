from fastapi import APIRouter, HTTPException, Depends
from services import stock_service
from services.ai_service import ai_service
from database import get_db
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/stocks",
    tags=["stocks"],
)

@router.get("/search")
async def search_stocks(query: str):
    return stock_service.search_ticker(query)

@router.post("/{ticker}/analyze")
async def analyze_stock(ticker: str):
    """
    Trigger AI analysis for a specific stock.
    """
    # 1. Fetch latest raw data
    stock_data = {
        "profile": stock_service.get_stock_profile(ticker),
        "price": stock_service.get_stock_price(ticker),
        "dividends": stock_service.get_dividend_history(ticker)
    }

    # 2. Load User Profile (Mock for MVP)
    # In a real app, we would get this from DB using a user_id
    user_profile = {
        "risk_tolerance": "Medium",
        "preferred_sectors": ["Technology", "Real Estate"],
        "goal": "Balanced Growth and Income"
    }

    # 3. Call AI Service
    report = await ai_service.analyze_stock(ticker, stock_data, user_profile)
    
    return {"ticker": ticker, "report": report}

@router.get("/{ticker}/profile")
async def get_profile(ticker: str):
    return stock_service.get_stock_profile(ticker)

@router.get("/{ticker}/price")
async def get_price(ticker: str):
    return stock_service.get_stock_price(ticker)

@router.get("/{ticker}/dividends")
async def get_dividends(ticker: str):
    return stock_service.get_dividend_history(ticker)

@router.get("/{ticker}/history")
async def get_history(ticker: str):
    return stock_service.get_price_history(ticker)

from services.sec_service import sec_service

@router.get("/{ticker}/full")
async def get_full_stock_data(ticker: str):
    """
    Convenience endpoint to get all data at once
    """
    return {
        "profile": stock_service.get_stock_profile(ticker),
        "price": stock_service.get_stock_price(ticker),
        "dividends": stock_service.get_dividend_history(ticker),
        "sec_filings_url": sec_service.get_edgar_url(ticker)
    }
