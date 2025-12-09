from fastapi import APIRouter, HTTPException, Depends
from services import stock_service
from database import get_db
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/stocks",
    tags=["stocks"],
)

@router.get("/{ticker}/profile")
async def get_profile(ticker: str):
    return stock_service.get_stock_profile(ticker)

@router.get("/{ticker}/price")
async def get_price(ticker: str):
    return stock_service.get_stock_price(ticker)

@router.get("/{ticker}/dividends")
async def get_dividends(ticker: str):
    return stock_service.get_dividend_history(ticker)

@router.get("/{ticker}/full")
async def get_full_stock_data(ticker: str):
    """
    Convenience endpoint to get all data at once
    """
    return {
        "profile": stock_service.get_stock_profile(ticker),
        "price": stock_service.get_stock_price(ticker),
        "dividends": stock_service.get_dividend_history(ticker)
    }
