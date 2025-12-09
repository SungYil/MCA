from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class RiskTolerance(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, default="me") # Single user for now
    risk_tolerance = Column(Enum(RiskTolerance), default=RiskTolerance.MEDIUM)
    preferred_sectors = Column(JSON, default=[]) # e.g. ["Technology", "Healthcare"]
    avoided_sectors = Column(JSON, default=[])   # e.g. ["Energy"]
    
    portfolio_items = relationship("PortfolioItem", back_populates="user")
    watchlist_items = relationship("WatchlistItem", back_populates="user")

class Stock(Base):
    __tablename__ = "stocks"

    ticker = Column(String, primary_key=True, index=True)
    name = Column(String)
    sector = Column(String)
    market_cap = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    
    # LLM Analysis Cache
    ai_summary = Column(String, nullable=True)
    quality_score = Column(Float, nullable=True) # 0-10
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    portfolio_entries = relationship("PortfolioItem", back_populates="stock")
    watchlist_entries = relationship("WatchlistItem", back_populates="stock")

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, ForeignKey("stocks.ticker"))
    
    shares = Column(Float)
    average_cost = Column(Float)
    
    user = relationship("User", back_populates="portfolio_items")
    stock = relationship("Stock", back_populates="portfolio_entries")

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, ForeignKey("stocks.ticker"))
    
    user = relationship("User", back_populates="watchlist_items")
    stock = relationship("Stock", back_populates="watchlist_entries")
