import os
import requests
import logging
import yfinance as yf
from typing import Dict, Any, Optional, List
from duckduckgo_search import DDGS

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StockService:
    """
    Service for fetching stock data using Tiingo API as primary,
    with yfinance and DuckDuckGo as powerful fallbacks/enhancers.
    """
    def __init__(self):
        self.api_key = os.getenv("TIINGO_API_KEY")
        self.base_url = "https://api.tiingo.com"
        
        if not self.api_key:
            logger.warning("TIINGO_API_KEY is not set. Service will rely on YFinance/Mock.")

    def get_stock_profile(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch basic company profile.
        Primary: Tiingo
        Fallback: yfinance (much richer data)
        """
        ticker = ticker.upper()
        
        # 1. SPECIAL ASSET: CASH (USD-CASH)
        if ticker == "USD-CASH":
            return {
                "ticker": "USD-CASH",
                "name": "US Dollar (Cash)",
                "sector": "Cash",
                "description": "Cash holdings in US Dollar.",
                "market_cap": 0,
                "exchange": "CASH"
            }

        # Try yfinance first for profile as it has Sector/MarketCap reliably
        try:
            t = yf.Ticker(ticker)
            info = t.info
            
            # Map quoteType to meaningful Sectors for non-stocks
            quote_type = info.get("quoteType", "").upper()
            sector = info.get("sector")
            
            if quote_type == "FUTURE":
                sector = "Commodities (Future)"
            elif quote_type == "CRYPTOCURRENCY":
                sector = "Crypto"
            elif quote_type == "ETF" and not sector:
                sector = "ETF"
            elif quote_type == "CURRENCY":
                sector = "Forex"
            elif not sector:
                sector = "Unknown"

            return {
                "ticker": ticker,
                "name": info.get("shortName") or info.get("longName") or ticker,
                "sector": sector,
                "description": info.get("longBusinessSummary") or f"{sector} asset.",
                "market_cap": info.get("marketCap"),
                "exchange": info.get("exchange")
            }
        except Exception as e:
            logger.warning(f"YFinance profile fetch failed for {ticker}: {e}. Trying Tiingo/Mock.")
        
        # Fallback to Tiingo/Mock logic if YF fails
        if self.api_key:
            try:
                url = f"{self.base_url}/tiingo/daily/{ticker}"
                headers = {'Content-Type': 'application/json', 'Authorization': f'Token {self.api_key}'}
                res = requests.get(url, headers=headers, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "ticker": data.get("ticker"),
                        "name": data.get("name"),
                        "sector": data.get("sector") or "Unknown",
                        "description": data.get("description"),
                        "market_cap": None # Tiingo daily meta lacks this usually
                    }
            except:
                pass

        return self._get_mock_profile(ticker)

    def get_stock_price(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch current stock price.
        Priority: 
        1. Tiingo IEX (Real-time)
        2. yfinance (Delayed/Real-time)
        """
        ticker = ticker.upper()

        ticker = ticker.upper()

        ticker = ticker.upper()

        # 0. SPECIAL ASSET: CASH (USD-CASH)
        # Use "USD-CASH" to avoid conflict with "USD" (ProShares Ultra Semiconductors ETF)
        if ticker == "USD-CASH":
            return {"price": 1.0, "change": 0.0, "change_percent": 0.0, "source": "Fixed"}

        # 1. Try Tiingo IEX
        if self.api_key:
            try:
                headers = {'Content-Type': 'application/json', 'Authorization': f'Token {self.api_key}'}
                url = f"{self.base_url}/iex/{ticker}" 
                response = requests.get(url, headers=headers, timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        quote = data[0]
                        price = quote.get("tngoLast") or quote.get("last")
                        if price and price > 0:
                            prev = quote.get("prevClose")
                            change = float(price) - float(prev) if prev else 0.0
                            pct = (change / prev * 100) if prev else 0.0
                            return {"price": price, "change": change, "change_percent": pct, "source": "Tiingo IEX"}
            except Exception as e:
                logger.warning(f"Tiingo IEX failed for {ticker}: {e}")

        # 2. Try yfinance (Fast & Reliable Fallback)
        try:
            t = yf.Ticker(ticker)
            # fast_info is faster than .info
            price = t.fast_info.last_price
            prev_close = t.fast_info.previous_close
            
            if price:
                change = price - prev_close
                pct = (change / prev_close * 100) if prev_close else 0.0
                return {
                    "price": price,
                    "change": change, 
                    "change_percent": pct,
                    "source": "yfinance"
                }
        except Exception as e:
            logger.error(f"YFinance price fetch failed for {ticker}: {e}")

        return {"price": 0.0, "change": 0.0, "change_percent": 0.0, "error": "Fetch failed"}

    def get_dividend_history(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch dividend info via yfinance (Superior to Tiingo for this).
        """
        ticker = ticker.upper()
        try:
            t = yf.Ticker(ticker)
            info = t.info
            div_yield = (info.get("dividendYield") or 0) * 100
            
            # History
            hist = t.dividends
            history_list = []
            if not hist.empty:
                # Last 2 years
                recent = hist.sort_index(ascending=False).head(8)
                for date, amount in recent.items():
                    history_list.append({
                        "date": date.strftime("%Y-%m-%d"),
                        "amount": float(amount)
                    })
            
            return {
                "div_yield": round(div_yield, 2),
                "frequency": "Quarterly", # YF doesn't explicitly give freq cleanly, assume Q or infer
                "growth_rate_5y": (info.get("dividendRate") or 0), # Proxy
                "history": history_list
            }
        except Exception as e:
            logger.error(f"YF Dividend fetch failed: {e}")
            return self._get_mock_dividends(ticker)

    def get_price_history(self, ticker: str, start_date: str = None) -> List[Dict[str, Any]]:
        """
        Fetch daily price history using yfinance.
        """
        ticker = ticker.upper()
        try:
            period = "1y"
            if start_date:
                period = "max" # Logic simplification
            
            t = yf.Ticker(ticker)
            hist = t.history(period="1y") # Default 1y for charts
            
            data = []
            for date, row in hist.iterrows():
                data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "close": float(row["Close"]),
                    "volume": int(row["Volume"])
                })
            return data
        except Exception as e:
            logger.error(f"YF history failed: {e}")
            return self._get_mock_history(ticker)

    def get_stock_news(self, ticker: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Hybrid News Fetching:
        1. DuckDuckGo Search (Specific financial sites for high quality)
        2. yfinance News (Aggregator)
        """
        news_items = []
        
        # 1. DuckDuckGo "Deep Search"
        try:
            query = f"{ticker} stock news site:bloomberg.com OR site:cnbc.com OR site:reuters.com OR site:wsj.com"
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=3))
                for r in results:
                    news_items.append({
                        "title": r.get('title'),
                        "url": r.get('href'),
                        "description": r.get('body'),
                        "source": "Major Financial News (Web)",
                        "publishedDate": "Recent"
                    })
        except Exception as e:
            logger.warning(f"DDG Search failed: {e}")

        # 2. yfinance News (Backup/Volume)
        try:
            t = yf.Ticker(ticker)
            yf_news = t.news
            if yf_news:
                for n in yf_news[:3]:
                    news_items.append({
                        "title": n.get('title'),
                        "url": n.get('link'),
                        "description": "Click to read full article on Yahoo Finance.",
                        "source": n.get('publisher'),
                        "publishedDate": str(n.get('providerPublishTime'))
                    })
        except Exception as e:
            logger.warning(f"YF News failed: {e}")

        if not news_items:
            return self._get_mock_news(ticker)
            
        return news_items[:limit]

    def get_batch_stock_prices(self, tickers: List[str]) -> List[Dict[str, Any]]:
        """
        Fetch batch prices. 
        Refactored to use yfinance batch download which is extremely efficient and robust.
        """
        if not tickers: return []
        
        results = []
        try:
            # Suppress YFinance FutureWarning clutter
            import warnings
            warnings.simplefilter(action='ignore', category=FutureWarning)
            
            # yfinance batch download
            # auto_adjust=True is now default in future versions, explicit False mimics old behavior if needed, 
            # or we accept True. Let's send auto_adjust=True explicitly to silence warning.
            data = yf.download(tickers, period="5d", group_by='ticker', threads=True, progress=False, auto_adjust=True)
            
            # If single ticker, structure is different
            if len(tickers) == 1:
                t = tickers[0]
                # Data is just a DataFrame for that ticker
                if not data.empty:
                    close = data['Close'].iloc[-1]
                    prev = data['Close'].iloc[-2] if len(data) >= 2 else close
                    change_pct = ((close - prev)/prev * 100)
                    results.append({
                        "ticker": t,
                        "price": float(close),
                        "change_percent": float(change_pct)
                    })
            else:
                # Multi-level columns
                for t in tickers:
                    try:
                        df = data[t]
                        if not df.empty:
                             # Check for NaN
                             close = df['Close'].iloc[-1]
                             prev = df['Close'].iloc[-2] if len(df) >= 2 else close
                             
                             import math
                             if math.isnan(close): continue
                             
                             change_pct = 0.0
                             if not math.isnan(prev) and prev != 0:
                                 change_pct = ((close - prev)/prev * 100)
                                 
                             results.append({
                                 "ticker": t,
                                 "price": float(close),
                                 "change_percent": float(change_pct)
                             })
                    except KeyError:
                        pass # Ticker data not found in batch
                        
        except Exception as e:
            logger.error(f"Batch YF failed: {e}")

        # Fallback Mock if absolutely needed
        if not results:
             return fallback_mock_batch(tickers)

        return results

    def get_exchange_rate(self, from_currency: str = "usd", to_currency: str = "krw") -> float:
        try:
            ticker = f"{from_currency.upper()}{to_currency.upper()}=X"
            t = yf.Ticker(ticker)
            return t.fast_info.last_price or 1440.0
        except:
            return 1440.0

    def get_market_brief_data(self) -> Dict[str, Any]:
        # Indices
        indices = {"SPY": {}, "QQQ": {}, "DIA": {}}
        for ticker in indices.keys():
            p = self.get_stock_price(ticker)
            indices[ticker] = p
            
        # News (General)
        news = self.get_stock_news("SPY", limit=5)
        
        return {"indices": indices, "news": news}

    def search_ticker(self, query: str) -> List[Dict[str, Any]]:
        # YFinance doesn't have a great search, stick to Tiingo or Mock
        if self.api_key:
            try:
                url = f"{self.base_url}/tiingo/utilities/search?query={query}"
                headers = {'Authorization': f'Token {self.api_key}'}
                res = requests.get(url, headers=headers)
                return res.json()[:10]
            except: pass
            
        return [
            {"ticker": "AAPL", "name": "Apple Inc."},
            {"ticker": "NVDA", "name": "NVIDIA Corp"},
            {"ticker": "MSFT", "name": "Microsoft"},
        ]

    # --- MOCKS ---
    def _get_mock_profile(self, ticker):
        return {"ticker": ticker, "name": f"{ticker}", "sector": "Technology", "description": "Mock Profile", "market_cap": 0}
    def _get_mock_dividends(self, ticker):
        return {"div_yield": 0, "frequency": "Irregular", "growth_rate_5y": 0, "history": []}
    def _get_mock_history(self, ticker):
        import random
        data = []
        for i in range(30):
            data.append({"date": f"2024-01-{i+1:02d}", "close": 100+i, "volume": 1000})
        return data
    def _get_mock_news(self, ticker):
        return [{"title": "No news found", "source": "System", "publishedDate": "Now"}]

def fallback_mock_batch(tickers):
    import random
    results = []
    for t in tickers:
        results.append({
            "ticker": t,
            "price": 100.0 + random.uniform(-10, 10),
            "change_percent": random.uniform(-2, 2)
        })
    return results

stock_service = StockService()
