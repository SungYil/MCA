from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import schema
from routers.auth import get_current_user
from services import stock_service, ai_service
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

class PortfolioAnalysisResponse(BaseModel):
    analysis: str

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

@router.post("/analyze", response_model=PortfolioAnalysisResponse)
async def analyze_portfolio(
    db: Session = Depends(get_db), 
    current_user: schema.User = Depends(get_current_user)
):
    """
    Triggers AI analysis for the current user's portfolio.
    """
    # 1. Fetch Portfolio Items
    items = db.query(schema.PortfolioItem).filter(schema.PortfolioItem.user_id == current_user.id).all()
    
    if not items:
        return {"analysis": "포트폴리오가 비어있어 분석할 수 없습니다. 종목을 먼저 추가해주세요!"}

    portfolio_data = []
    for item in items:
        # Fetch current price for accurate valuation
        try:
            price_info = stock_service.get_stock_price(item.ticker)
            current_price = price_info.get("price", 0.0)
        except:
            current_price = 0.0
            
        portfolio_data.append({
            "ticker": item.ticker,
            "shares": item.shares,
            "average_cost": item.average_cost,
            "current_price": current_price
        })

    # 2. Fetch User Profile
    user_profile = {
        "risk_tolerance": current_user.risk_tolerance,
        # "goal": current_user.investment_goal # assuming this field exists or defaults
    }

    # 3. Call AI Service
    analysis_text = await ai_service.ai_service.analyze_portfolio(portfolio_data, user_profile)
    
    return {"analysis": analysis_text}

@router.get("", response_model=List[PortfolioItemResponse])
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

@router.post("", response_model=PortfolioItemResponse)
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

class PortfolioUpdateRequest(BaseModel):
    shares: float
    average_cost: float

@router.put("/{ticker}", response_model=PortfolioItemResponse)
def update_portfolio_item(
    ticker: str,
    request: PortfolioUpdateRequest,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(get_current_user)
):
    """
    Update an existing portfolio item (shares/cost).
    """
    ticker = ticker.upper()
    item = db.query(schema.PortfolioItem).filter(
        schema.PortfolioItem.user_id == current_user.id,
        schema.PortfolioItem.ticker == ticker
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")

    item.shares = request.shares
    item.average_cost = request.average_cost
    
    db.commit()
    db.refresh(item)
    
    # Calculate derived fields for response
    try:
        price_info = stock_service.get_stock_price(ticker)
        current_price = price_info.get("price", 0.0)
    except:
        current_price = 0.0

    current_value = current_price * item.shares
    total_cost = item.average_cost * item.shares
    gain_loss = current_value - total_cost
    gain_loss_percent = (gain_loss / total_cost * 100) if total_cost > 0 else 0.0

    return PortfolioItemResponse(
        id=item.id,
        ticker=item.ticker,
        shares=item.shares,
        average_cost=item.average_cost,
        current_price=current_price,
        current_value=current_value,
        gain_loss=gain_loss,
        gain_loss_percent=gain_loss_percent
    )

@router.delete("/{ticker}")
def delete_portfolio_item(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: schema.User = Depends(get_current_user)
):
    """
    Delete a ticker from the user's portfolio.
    """
    ticker = ticker.upper()
    item = db.query(schema.PortfolioItem).filter(
        schema.PortfolioItem.user_id == current_user.id,
        schema.PortfolioItem.ticker == ticker
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}

class DividendItemResponse(BaseModel):
    ticker: str
    shares: float
    div_yield: float
    annual_income: float
    frequency: str
    last_payment_date: str
    last_payment_amount: float
    next_payment_date: str # NEW
    next_payment_amount: float # NEW

class DividendProjectionResponse(BaseModel):
    total_annual_income: float
    monthly_average: float
    this_month_income: float # NEW: How much expected in current month
    items: List[DividendItemResponse]

@router.get("/dividends", response_model=DividendProjectionResponse)
def get_dividend_projection(
    db: Session = Depends(get_db), 
    current_user: schema.User = Depends(get_current_user)
):
    """
    Get detailed dividend projection for the portfolio.
    Calculates estimated annual income based on current yield/history.
    """
    items = db.query(schema.PortfolioItem).filter(schema.PortfolioItem.user_id == current_user.id).all()
    
    projection_items = []
    total_annual = 0.0
    total_this_month = 0.0
    
    from datetime import datetime, timedelta
    today = datetime.now()

    for item in items:
        # Fetch dividend history
        div_info = stock_service.get_dividend_history(item.ticker)
        
        # Calculate Income
        annual_income_per_share = 0.0
        last_date_str = "-"
        last_amount = 0.0
        next_date_str = "-"
        next_amount_expected = 0.0
        
        history = div_info.get("history", [])
        frequency = div_info.get("frequency", "Irregular")
        
        if history and len(history) > 0:
            last_div = history[0] # Most recent
            last_amount = last_div.get("amount", 0.0)
            last_date_str = last_div.get("date", "-")[:10]
            
            # Annualize logic
            multiplier = 0
            if frequency == "Monthly": multiplier = 12
            elif frequency == "Quarterly": multiplier = 4
            elif frequency == "Annual": multiplier = 1
            
            # Fallback for irregular using TTM sum if multiplier is 0
            if multiplier == 0 and frequency == "Irregular": 
                cutoff = (today - timedelta(days=365)).strftime('%Y-%m-%d')
                annual_income_per_share = sum(d['amount'] for d in history if d.get('date') >= cutoff)
            elif multiplier > 0:
                annual_income_per_share = last_amount * multiplier

            # NEXT PAYMENT DATE CALCULATION
            try:
                if last_date_str != "-" and frequency in ["Monthly", "Quarterly", "Annual"]:
                    last_dt = datetime.strptime(last_date_str, "%Y-%m-%d")
                    
                    # Simple approximate add
                    next_dt = last_dt
                    
                    # Find the first future date
                    while next_dt < today:
                        if frequency == "Monthly":
                            # Add ~30 days or using simple month increment logic
                            # Being robust without extra libs:
                            year = next_dt.year + (next_dt.month // 12)
                            month = (next_dt.month % 12) + 1
                            # Handle day overflow (e.g. Jan 31 -> Feb 28)
                            try:
                                next_dt = next_dt.replace(year=year, month=month)
                            except ValueError:
                                # Fallback for end of month issues
                                next_dt = next_dt.replace(year=year, month=month, day=28)
                                
                        elif frequency == "Quarterly":
                             # Add 3 months
                             month = next_dt.month + 3
                             year = next_dt.year + (month - 1) // 12
                             month = (month - 1) % 12 + 1
                             try:
                                next_dt = next_dt.replace(year=year, month=month)
                             except ValueError:
                                next_dt = next_dt.replace(year=year, month=month, day=28)
                                
                        elif frequency == "Annual":
                             next_dt = next_dt.replace(year=next_dt.year + 1)
                             
                    next_date_str = next_dt.strftime('%Y-%m-%d')
                    next_amount_expected = last_amount * item.shares
                    
                    # Check if this expected payment is in the CURRENT month
                    if next_dt.month == today.month and next_dt.year == today.year:
                        total_this_month += next_amount_expected
                        
            except Exception as e:
                # Fallback if date parsing fails
                print(f"Date calc error for {item.ticker}: {e}")
                pass

        estimated_income = annual_income_per_share * item.shares
        total_annual += estimated_income
        
        projection_items.append(DividendItemResponse(
            ticker=item.ticker,
            shares=item.shares,
            div_yield=div_info.get("div_yield", 0.0),
            annual_income=round(estimated_income, 2),
            frequency=frequency,
            last_payment_date=last_date_str,
            last_payment_amount=last_amount,
            next_payment_date=next_date_str,
            next_payment_amount=round(next_amount_expected, 2)
        ))
        
    return DividendProjectionResponse(
        total_annual_income=round(total_annual, 2),
        monthly_average=round(total_annual / 12, 2),
        this_month_income=round(total_this_month, 2),
        items=projection_items
    )
