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
        Uses IEX endpoint for real-time/top-of-book data during market hours.
        """
        ticker = ticker.upper()
        if not self.api_key:
            return self._get_mock_price(ticker)

        try:
            # Using IEX endpoint for more real-time-like data
            url = f"{self.base_url}/iex/{ticker}" 
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.api_key}'
            }
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            # Tiingo IEX returns a list [ { ... } ]
            if isinstance(data, list) and len(data) > 0:
                quote = data[0]
                price = quote.get("last") or quote.get("tngoLast")
                # Calculate change if open is available, or use mock change since IEX might just show last
                # Usually we want close vs prevClose from daily for change, but let's try to get what we can
                prev_close = quote.get("prevClose")
                change = 0.0
                change_percent = 0.0
                
                if price and prev_close:
                    change = price - prev_close
                    change_percent = (change / prev_close) * 100
                
                return {
                    "price": price,
                    "change": change,
                    "change_percent": change_percent
                }
            
            return {"price": 0.0, "change": 0.0, "change_percent": 0.0}

        except Exception as e:
            logger.error(f"Error fetching price for {ticker}: {e}")
            return self._get_mock_price(ticker)

    def get_dividend_history(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch dividend history. 
        Tiingo doesn't have a direct "dividend history" endpoint easily accessible without full historical query.
        We will query historical prices with 'resampleFreq=monthly' or similar to find distributions?
        Or just stick to Mock for Dividends for now as Tiingo Free might be limited, 
        or use Tiingo generic historical endpoint to find 'divCash' > 0.
        """
        ticker = ticker.upper()
        # For MVP, Tiingo IEX doesn't give dividends. Daily historical does.
        # Let's try to fetch last 1 year of daily data to find dividends.
        if not self.api_key:
            return self._get_mock_dividends(ticker)

        try:
            url = f"{self.base_url}/tiingo/daily/{ticker}/prices?startDate=2024-01-01&columns=date,divCash"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.api_key}'
            }
            # This fetches history. 
            # Optimization: Fetching history for every request is heavy. 
            # In a real app we'd cache this. For now, let's keep it simple or fallback to mock if too slow.
            # Actually, let's stick to mock dividends for this step to ensure speed, 
            # OR implement a very simple check.
            # User prioritized Price and Chart.
            return self._get_mock_dividends(ticker) # Keeping mock for dividends to focus on Price reliability first.

        except Exception as e:
            logger.error(f"Error fetching dividends for {ticker}: {e}")
            return self._get_mock_dividends(ticker)

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

    def _get_mock_dividends(self, ticker):
        return {
            "div_yield": 1.5,
            "frequency": "Quarterly",
            "growth_rate_5y": 5.0,
            "history": []
        }

# Singleton instance
stock_service = StockService()
