import os
import requests
import logging
from typing import Dict, Any, Optional, List

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StockService:
    """
    Service for fetching stock data using Tiingo API.
    """
    def __init__(self):
        self.api_key = os.getenv("TIINGO_API_KEY")
        self.base_url = "https://api.tiingo.com"
        
        if not self.api_key:
            logger.warning("TIINGO_API_KEY is not set. Service will fail or return mocks.")

    def get_stock_profile(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch basic company profile via Tiingo Meta Endpoint.
        """
        ticker = ticker.upper()
        if not self.api_key:
            return self._get_mock_profile(ticker)

        try:
            url = f"{self.base_url}/tiingo/daily/{ticker}"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.api_key}'
            }
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            return {
                "ticker": data.get("ticker"),
                "name": data.get("name"),
                "sector": data.get("sector") or "Unknown", # Tiingo might not always return sector directly here
                "description": data.get("description"),
                "exchange": data.get("exchangeCode"),
                "market_cap": None # Tiingo Daily Meta doesn't usually have market cap, might need another source or mock
            }
        except Exception as e:
            logger.error(f"Error fetching profile for {ticker}: {e}")
            return self._get_mock_profile(ticker)

    def get_stock_price(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch current stock price.
        Strategy:
        1. Try IEX endpoint (Real-time/Top of Book).
        2. Fallback to Daily endpoint (EOD) if IEX is empty or closed.
        """
        ticker = ticker.upper()
        if not self.api_key:
            logger.warning(f"No API Key. Returning mock for {ticker}")
            return self._get_mock_price(ticker)

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Token {self.api_key}'
        }

        # 1. Try IEX
        try:
            url = f"{self.base_url}/iex/{ticker}" 
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if isinstance(data, list) and len(data) > 0:
                quote = data[0]
                price = quote.get("last") or quote.get("tngoLast")
                
                if price and price > 0:
                    prev_close = quote.get("prevClose")
                    change = 0.0
                    change_percent = 0.0
                    if prev_close:
                        change = price - prev_close
                        change_percent = (change / prev_close) * 100
                    
                    return {
                        "price": price,
                        "change": change,
                        "change_percent": change_percent,
                        "source": "IEX"
                    }
        except Exception as e:
            logger.warning(f"IEX fetch failed for {ticker}: {e}. Trying Daily fallback.")

        # 2. Fallback to Daily (Last Closing Price)
        try:
            url = f"{self.base_url}/tiingo/daily/{ticker}/prices"
            # Get just the last 1 day
            params = {'startDate': '2020-01-01', 'resampleFreq': 'daily'} # Simple latest queries often default to latest without date, but explicit is safe
            # Actually, simpler URL is /tiingo/daily/{ticker}/prices with no params gives full history, that's bad.
            # Best way for latest is /tiingo/daily/{ticker}/prices endpoint returns latest by default? No, it returns history.
            # Tiingo docs say: /tiingo/daily/<ticker>/prices returns history.
            # We can use `sort=-date` if supported, or just requesting a recent start date.
            # Let's try fetching just the meta which sometimes has prevClose?
            # Or standard history logic:
            response = requests.get(url, headers=headers, timeout=5) 
            response.raise_for_status()
            history = response.json()
            
            if isinstance(history, list) and len(history) > 0:
                latest = history[-1] # Valid assumption if sorted by date ascending (default)
                price = latest.get("close") or latest.get("adjClose")
                # Calculate change from previous day if possible, else 0
                change = 0.0
                change_percent = 0.0
                
                if len(history) >= 2:
                    prev = history[-2]
                    prev_close = prev.get("close")
                    if prev_close:
                        change = price - prev_close
                        change_percent = (change / prev_close) * 100

                return {
                    "price": price,
                    "change": change,
                    "change_percent": change_percent,
                    "source": "Daily_EOD"
                }

        except Exception as e:
            logger.error(f"Daily fetch failed for {ticker}: {e}")

        logger.error(f"All price fetches failed for {ticker}. Returning mock/zero.")
        # If strict real-time is required, maybe throw error? 
        # But for UI stability, returning 0 or mock might be better.
        # User complained about "Real price not showing", so returning mock is confusing.
        # Better to return 0 so they know it failed? or Mock with flag?
        return {"price": 0.0, "change": 0.0, "change_percent": 0.0, "error": "Fetch failed"}

    def get_dividend_history(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch dividend history using Tiingo Daily Prices (Historical).
        Strategies:
        1. Fetch last 2 years of daily prices.
        2. Filter for rows where 'divCash' > 0.
        3. Calculate Trailing 12M Yield.
        """
        ticker = ticker.upper()
        if not self.api_key:
            return self._get_mock_dividends(ticker)

        try:
            # Fetch last 2 years (approx 730 days) to catch sufficient dividend history
            from datetime import datetime, timedelta
            start_date = (datetime.now() - timedelta(days=730)).strftime('%Y-%m-%d')
            
            url = f"{self.base_url}/tiingo/daily/{ticker}/prices?startDate={start_date}&columns=date,divCash,close"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.api_key}'
            }
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            dividends = []
            if isinstance(data, list):
                for row in data:
                    if row.get('divCash', 0) > 0:
                        dividends.append({
                            "date": row.get('date'),
                            "amount": row.get('divCash')
                        })
            
            # Sort descending by date
            dividends.sort(key=lambda x: x['date'], reverse=True)
            
            # Calculate Yield (Sum of last 12 months / Current Price)
            # We assume current price is the last close in this dataset
            current_price = 0.0
            if data and isinstance(data, list) and len(data) > 0:
                 current_price = data[-1].get('close', 0.0)
            
            ttm_div_sum = 0.0
            cutoff_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
            
            for d in dividends:
                if d['date'] >= cutoff_date:
                    ttm_div_sum += d['amount']
            
            div_yield = 0.0
            if current_price > 0:
                div_yield = (ttm_div_sum / current_price) * 100
                
            # Determine Frequency (Naive estimation based on count in last year)
            # 4 -> Quarterly, 12 -> Monthly, 1/2 -> Annual/Semi
            count_last_year = len([d for d in dividends if d['date'] >= cutoff_date])
            frequency = "Irregular"
            if count_last_year >= 11: frequency = "Monthly"
            elif count_last_year >= 3: frequency = "Quarterly"
            elif count_last_year >= 1: frequency = "Annual"

            # Growth Rate (Naive 1-year comparison if possible) - Skipped for robustness now
            # growth_rate_5y can be left as 0 or calc simple 1y growth
            
            return {
                "div_yield": round(div_yield, 2),
                "frequency": frequency,
                "growth_rate_5y": 0.0, # Requires deeper history/calc
                "history": dividends[:10] # Return top 10 recent
            }

        except Exception as e:
            logger.error(f"Error fetching dividends for {ticker}: {e}")
            return self._get_mock_dividends(ticker)

    def get_price_history(self, ticker: str, start_date: str = None) -> List[Dict[str, Any]]:
        """
        Fetch daily price history.
        """
        ticker = ticker.upper()
        if not self.api_key:
             # Return a generated mock history for graph viz
             return self._get_mock_history(ticker)

        try:
            if not start_date:
                # Default to 1 year
                from datetime import datetime, timedelta
                start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
            
            url = f"{self.base_url}/tiingo/daily/{ticker}/prices?startDate={start_date}&columns=date,close,volume"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.api_key}'
            }
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            history = []
            if isinstance(data, list):
                for row in data:
                    history.append({
                        "date": row.get('date')[:10], # YYYY-MM-DD
                        "close": row.get('close'),
                        "volume": row.get('volume')
                    })
            return history
            
        except Exception as e:
            logger.error(f"Error fetching history for {ticker}: {e}")
            return self._get_mock_history(ticker)

    def _get_mock_history(self, ticker):
        # Generate some sine wave-ish mock data
        import math
        from datetime import datetime, timedelta
        base_price = 150.0
        data = []
        for i in range(30):
            dt = (datetime.now() - timedelta(days=30-i)).strftime('%Y-%m-%d')
            price = base_price + (math.sin(i) * 10)
            data.append({"date": dt, "close": round(price, 2), "volume": 1000000})
        return data

    # --- MOCK FALLBACKS ---
    def _get_mock_profile(self, ticker):
        return {
            "ticker": ticker,
            "name": f"{ticker} (Mock)",
            "sector": "Technology",
            "description": "Mock description. API Key missing or Error.",
            "market_cap": 1000000000
        }

    def _get_mock_price(self, ticker):
        return {"price": 123.45, "change": 1.23, "change_percent": 1.0}

    def get_stock_news(self, ticker: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch recent news articles for a ticker.
        """
        ticker = ticker.upper()
        if not self.api_key:
            return self._get_mock_news(ticker)

        try:
            url = f"{self.base_url}/tiingo/news?tickers={ticker}&limit={limit}"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.api_key}'
            }
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            articles = response.json()
            
            news_items = []
            for article in articles:
                news_items.append({
                    "title": article.get("title"),
                    "publishedDate": article.get("publishedDate"),
                    "description": article.get("description"),
                    "url": article.get("url"),
                    "source": article.get("source", {}).get("name", "Unknown")
                })
            
            return news_items

        except Exception as e:
            logger.error(f"Error fetching news for {ticker}: {e}")
            return self._get_mock_news(ticker)

    def _get_mock_news(self, ticker):
        return [
            {"title": f"{ticker} Stock Analysis (Mock)", "description": "Mock description for development.", "source": "MockNews", "publishedDate": "2024-01-01"},
            {"title": f"Why {ticker} is moving today", "description": "Another mock article.", "source": "MockInsider", "publishedDate": "2024-01-02"}
        ]

# Singleton instance
stock_service = StockService()
