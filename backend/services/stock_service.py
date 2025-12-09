from typing import Dict, Any, Optional

class StockService:
    """
    Service for fetching stock data.
    Currently mocks external APIs (Tiingo, SEC).
    """

    def get_stock_profile(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch basic company profile.
        """
        # Mock Data
        ticker = ticker.upper()
        if ticker == "AAPL":
            return {
                "ticker": "AAPL",
                "name": "Apple Inc.",
                "sector": "Technology",
                "description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories.",
                "market_cap": 3000000000000
            }
        elif ticker == "MSFT":
            return {
                "ticker": "MSFT",
                "name": "Microsoft Corporation",
                "sector": "Technology",
                "description": "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions.",
                "market_cap": 2800000000000
            }
        elif ticker == "O":
            return {
                "ticker": "O",
                "name": "Realty Income Corporation",
                "sector": "Real Estate",
                "description": "Realty Income, The Monthly Dividend Company, is an S&P 500 company dedicated to providing stockholders with dependable monthly income.",
                "market_cap": 40000000000
            }
        
        # Default mock for others
        return {
            "ticker": ticker,
            "name": f"{ticker} Inc.",
            "sector": "Unknown",
            "description": "Mock description for development.",
            "market_cap": 1000000000
        }

    def get_stock_price(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch current stock price and changes.
        """
        ticker = ticker.upper()
        # Mock Data
        mock_prices = {
            "AAPL": {"price": 185.50, "change": 1.25, "change_percent": 0.68},
            "MSFT": {"price": 420.10, "change": -2.30, "change_percent": -0.55},
            "O": {"price": 52.30, "change": 0.15, "change_percent": 0.29},
        }
        return mock_prices.get(ticker, {"price": 100.00, "change": 0.0, "change_percent": 0.0})

    def get_dividend_history(self, ticker: str) -> Dict[str, Any]:
        """
        Fetch dividend history and yield.
        """
        ticker = ticker.upper()
        # Mock Data
        if ticker == "O":
            return {
                "div_yield": 5.5,
                "frequency": "Monthly",
                "growth_rate_5y": 3.2,
                "history": [
                    {"date": "2024-01-15", "amount": 0.256},
                    {"date": "2023-12-15", "amount": 0.256},
                    {"date": "2023-11-15", "amount": 0.256},
                ]
            }
        elif ticker == "AAPL":
            return {
                "div_yield": 0.5,
                "frequency": "Quarterly",
                "growth_rate_5y": 6.5,
                "history": [
                    {"date": "2024-02-10", "amount": 0.24},
                    {"date": "2023-11-10", "amount": 0.24},
                ]
            }
            
        return {
            "div_yield": 0.0,
            "frequency": "None",
            "growth_rate_5y": 0.0,
            "history": []
        }

# Singleton instance
stock_service = StockService()
