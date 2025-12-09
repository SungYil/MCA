from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.schema import WatchlistItem, Stock
from pydantic import BaseModel
from typing import List
from services import stock_service

router = APIRouter(
    prefix="/api/watchlist",
    tags=["watchlist"],
)

@router.post("/", response_model=WatchlistItemResponse)
def add_to_watchlist(request: WatchlistAddRequest, db: Session = Depends(get_db)):
    """
    Add a ticker to the watchlist.
    Ensures the Stock exists in the DB first.
    """
    user_id = 1 # Mock user ID
    ticker = request.ticker.upper()

    # 1. Check/Ensure Stock exists in 'stocks' table
    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if not stock:
        # Fetch data from external service
        profile = stock_service.get_stock_profile(ticker)
        price_info = stock_service.get_stock_price(ticker)
        div_info = stock_service.get_dividend_history(ticker)
        
        # Create new Stock record
        new_stock = Stock(
            ticker=ticker,
            name=profile.get("name"),
            sector=profile.get("sector"),
            market_cap=profile.get("market_cap"),
            current_price=price_info.get("price"),
            dividend_yield=div_info.get("div_yield")
        )
        db.add(new_stock)
        db.commit()

    # 2. Check if already in Watchlist
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == user_id, 
        WatchlistItem.ticker == ticker
    ).first()

    if existing:
        return existing

    # 3. Create new Watchlist Item
    item = WatchlistItem(user_id=user_id, ticker=ticker)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{ticker}")
def remove_from_watchlist(ticker: str, db: Session = Depends(get_db)):
    """
    Remove a ticker from the watchlist.
    """
    user_id = 1 # Mock user ID
    ticker = ticker.upper()

    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == user_id,
        WatchlistItem.ticker == ticker
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found in watchlist")

    db.delete(item)
    db.commit()
    return {"message": "Item removed", "ticker": ticker}
