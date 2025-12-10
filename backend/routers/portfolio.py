from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import schema
from routers.auth import get_current_user
from services import stock_service
from pydantic import BaseModel
from typing import List

router = APIRouter(
    prefix="/api/portfolio",
    tags=["portfolio"],
)

# Pydantic Models
class PortfolioAddRequest(BaseModel):
    ticker: str
    shares: float
    average_cost: float

class PortfolioItemResponse(BaseModel):
    id: int
    ticker: str
    shares: float
    average_cost: float
    current_price: float = 0.0 # To be fetched/calculated
    current_value: float = 0.0
    gain_loss: float = 0.0
    gain_loss_percent: float = 0.0

    class Config:
        from_attributes = True

@router.get("/", response_model=List[PortfolioItemResponse])
def get_portfolio(
    db: Session = Depends(get_db), 
    current_user: schema.User = Depends(get_current_user)
):
    """
    Get all portfolio items for the current user.
    Also fetches current price to calculate real-time value.
    """
    items = db.query(schema.PortfolioItem).filter(schema.PortfolioItem.user_id == current_user.id).all()
    
    response_items = []
    for item in items:
        # Fetch current price (using service, simple fetch)
        # In a real app, this should be batch-fetched or cached
        try:
            price_info = stock_service.get_stock_price(item.ticker)
            current_price = price_info.get("price", 0.0)
        except:
            current_price = 0.0

        current_value = current_price * item.shares
        total_cost = item.average_cost * item.shares
        gain_loss = current_value - total_cost
        gain_loss_percent = (gain_loss / total_cost * 100) if total_cost > 0 else 0.0

        response_items.append(PortfolioItemResponse(
            id=item.id,
            ticker=item.ticker,
            shares=item.shares,
            average_cost=item.average_cost,
            current_price=current_price,
            current_value=current_value,
            gain_loss=gain_loss,
            gain_loss_percent=gain_loss_percent
        ))
    
    return response_items

@router.post("/", response_model=PortfolioItemResponse)
def add_to_portfolio(
    request: PortfolioAddRequest, 
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(get_current_user)
):
    """
    Add a transaction to portfolio.
    If ticker exists, updates the average cost and shares (simple weighted average).
    """
    ticker = request.ticker.upper()
    
    # 1. Ensure Stock exists
    stock = db.query(schema.Stock).filter(schema.Stock.ticker == ticker).first()
    if not stock:
        # Fetch data from external service
        profile = stock_service.get_stock_profile(ticker)
        price_info = stock_service.get_stock_price(ticker)
        div_info = stock_service.get_dividend_history(ticker)
        
        new_stock = schema.Stock(
            ticker=ticker,
            name=profile.get("name"),
            sector=profile.get("sector"),
            market_cap=profile.get("market_cap"),
            current_price=price_info.get("price"),
            dividend_yield=div_info.get("div_yield")
        )
        db.add(new_stock)
        db.commit()

    # 2. Check if item exists in portfolio
    existing_item = db.query(schema.PortfolioItem).filter(
        schema.PortfolioItem.user_id == current_user.id,
        schema.PortfolioItem.ticker == ticker
    ).first()

    if existing_item:
        # Update logic: Weighted Average
        total_shares = existing_item.shares + request.shares
        total_cost = (existing_item.shares * existing_item.average_cost) + (request.shares * request.average_cost)
        new_average_cost = total_cost / total_shares if total_shares > 0 else 0

        existing_item.shares = total_shares
        existing_item.average_cost = new_average_cost
        
        db.commit()
        db.refresh(existing_item)
        
        # Prepare response
        return PortfolioItemResponse(
            id=existing_item.id,
            ticker=existing_item.ticker,
            shares=existing_item.shares,
            average_cost=existing_item.average_cost
        )
    else:
        # Create new item
        new_item = schema.PortfolioItem(
            user_id=current_user.id,
            ticker=ticker,
            shares=request.shares,
            average_cost=request.average_cost
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        return PortfolioItemResponse(
            id=new_item.id,
            ticker=new_item.ticker,
            shares=new_item.shares,
            average_cost=new_item.average_cost
        )

@router.delete("/{ticker}")
def remove_from_portfolio(
    ticker: str, 
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(get_current_user)
):
    """
    Remove a stock completely from portfolio.
    """
    ticker = ticker.upper()
    item = db.query(schema.PortfolioItem).filter(
        schema.PortfolioItem.user_id == current_user.id,
        schema.PortfolioItem.ticker == ticker
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found in portfolio")

    db.delete(item)
    db.commit()
    return {"message": "Item removed", "ticker": ticker}
