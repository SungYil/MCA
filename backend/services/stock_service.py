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

    def _get_mock_dividends(self, ticker):
        """
        Return mock dividend data when API fails or is rate limited.
        """
        return {
            "div_yield": 1.5,
            "frequency": "Quarterly",
            "growth_rate_5y": 5.0,
            "history": [
                {"date": "2023-12-01", "amount": 0.24},
                {"date": "2023-09-01", "amount": 0.24},
                {"date": "2023-06-01", "amount": 0.23},
                {"date": "2023-03-01", "amount": 0.23}
            ]
        }

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

    def search_ticker(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for tickers matching the query.
        Prioritize filtering the local cache (e.g., from SEC map) if available, 
        or fallback to Tiingo Search API.
        Current implementation: Use Tiingo Search API for best results (includes name matching).
        """
        if not self.api_key:
             return [
                 {"ticker": "AAPL", "name": "Apple Inc."},
                 {"ticker": "MSFT", "name": "Microsoft Corporation"},
                 {"ticker": "GOOGL", "name": "Alphabet Inc."},
                 {"ticker": "AMZN", "name": "Amazon.com Inc."},
                 {"ticker": "TSLA", "name": "Tesla Inc."}
             ]

        try:
            url = f"{self.base_url}/tiingo/utilities/search?query={query}"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.api_key}'
            }
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            results = response.json()
            
            # Tiingo returns list of objects
            # Filter to just US Stocks for MVP relevance if needed, but Tiingo search is good.
            # Format: [{"ticker": "AAPL", "name": "Apple Inc", ...}]
            return results[:10] # Top 10

        except Exception as e:
            logger.error(f"Error searching tickers for {query}: {e}")
            return []

    def get_batch_stock_prices(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """
        Fetch real-time prices for multiple tickers using Tiingo IEX endpoint.
        Fallback to Daily EOD (Last Close) if IEX fails (common on Free Tier).
        """
        if not tickers:
            return []

        results = []
        # 1. Try Real-time (IEX) - Most efficient (Batch)
        if self.api_key:
            try:
                ticker_str = ",".join([t.upper() for t in tickers])
                url = f"{self.base_url}/iex/?tickers={ticker_str}"
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Token {self.api_key}'
                }
                response = requests.get(url, headers=headers, timeout=5)
                
                if response.status_code == 200:
                    data = response.json()
                    # Check if data is actually populated
                    if data and isinstance(data, list) and len(data) > 0:
                        for quote in data:
                            price = quote.get("tngoLast") or quote.get("last")
                            prev_close = quote.get("prevClose")
                            # If we get valid numbers
                            if price:
                                change_percent = 0.0
                                if prev_close:
                                    change_percent = ((price - prev_close) / prev_close) * 100
                                results.append({
                                    "ticker": quote.get("ticker").upper(),
                                    "price": price,
                                    "change_percent": change_percent
                                })
            except Exception as e:
                logger.warning(f"Batch IEX fetch failed: {e}")

        # 2. Daily EOD Fallback (If IEX missed some or all)
        # On Free Tier, IEX might be empty or restricted. Daily is usually safe.
        # We check which tickers are missing from 'results'.
        found_tickers = set(r['ticker'] for r in results)
        missing = [t.upper() for t in tickers if t.upper() not in found_tickers]

        if missing:
             logger.info(f"Falling back to Daily EOD for: {missing}")
             # We fetch these serially (Tiingo doesn't have partial batch daily easily). 
             # Limit to avoid timeouts if list is huge, but for 15 it's okay.
             for t in missing:
                try:
                    # Get latest price only
                    url = f"{self.base_url}/tiingo/daily/{t}/prices?sort=-date&limit=1"
                    headers = {'Authorization': f'Token {self.api_key}'}
                    res = requests.get(url, headers=headers, timeout=2)
                    if res.status_code == 200:
                        hist = res.json()
                        if hist and isinstance(hist, list) and len(hist) > 0:
                            latest = hist[0]
                            price = latest.get("close")
                            # For change, we need prev day. But let's just use 0 or try fetch 2?
                            # Fetching 2 days is safer
                            pass # Optimized logic below
                            
                except:
                    continue
        
        # Improved Serial Fetch Logic for Missing
        if missing and self.api_key:
             for t in missing:
                 try:
                     # Fetch 2 days to calculate change
                     url = f"{self.base_url}/tiingo/daily/{t}/prices?sort=-date&limit=2"
                     headers = {'Authorization': f'Token {self.api_key}'}
                     res = requests.get(url, headers=headers, timeout=2) # Short timeout
                     if res.status_code == 200:
                         hist = res.json()
                         if hist and len(hist) > 0:
                             curr = hist[0]
                             price = curr.get("close") or curr.get("adjClose")
                             change_percent = 0.0
                             
                             if len(hist) > 1:
                                 prev = hist[1]
                                 prev_close = prev.get("close")
                                 if prev_close and price:
                                     change_percent = ((price - prev_close) / prev_close) * 100
                             
                             results.append({
                                 "ticker": t,
                                 "price": price,
                                 "change_percent": change_percent
                             })
                 except Exception as e:
                     logger.warning(f"Daily fetch fallback failed for {t}: {e}")

        # 3. Mock Fallback (Only if truly nothing found)
        if not results:
             import random
             logger.warning("All fetch methods failed. Using Mock Data.")
             for t in tickers:
                 change = random.uniform(-3, 3)
                 price = 150.0 + random.uniform(-20, 50)
                 if t in ["NVDA", "TSLA"]: change *= 1.5
                 results.append({
                     "ticker": t,
                     "price": round(price, 2),
                     "change_percent": round(change, 2)
                 })
        
        return results

    def get_exchange_rate(self, from_currency: str = "usd", to_currency: str = "krw") -> float:
        """
        Fetch Forex rate.
        For Tiingo, ticker format is often 'usdkrw'.
        """
        ticker = f"{from_currency}{to_currency}".lower()
        fallback_rate = 1442.50 # Real-time-ish (Dec 2024 proxy)
        
        if not self.api_key:
            return fallback_rate

        try:
            # Add sort=-date to get LATEST data
            url = f"{self.base_url}/tiingo/daily/{ticker}/prices?sort=-date&limit=1"
            headers = {'Authorization': f'Token {self.api_key}'}
            response = requests.get(url, headers=headers, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                if data and isinstance(data, list) and len(data) > 0:
                    # Latest close
                    return data[0].get("close", fallback_rate)
            
            return fallback_rate
        except Exception as e:
            logger.error(f"Error fetching forex {ticker}: {e}")
            return fallback_rate

    def get_market_brief_data(self) -> Dict[str, Any]:
        """
        Fetch data for market briefing:
        1. Indices (SPY, QQQ, DIA) cached prices.
        2. General Market News (general news endpoint).
        """
        # 1. Fetch Key Indices
        indices = ["spy", "qqq", "dia"] 
        market_data = {}
        
        for ticker in indices:
            try:
                price = self.get_stock_price(ticker.upper())
                market_data[ticker.upper()] = price
            except:
                market_data[ticker.upper()] = {"price": 0, "change_percent": 0}

        # 2. Fetch General News 
        # Using SPY as a proxy for "Market News" if 'general' tag isn't explicitly supported in this helper
        try:
            news_items = self.get_stock_news("SPY", limit=10)
        except:
            news_items = []

        return {
            "indices": market_data,
            "news": news_items
        }

# Singleton instance
stock_service = StockService()
