import requests
import logging
from typing import Optional, Dict

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecService:
    """
    Service for interacting with SEC EDGAR system.
    Primarily used to look up CIK (Central Index Key) for valid Tickers
    and generate links to official filings.
    """
    def __init__(self):
        self.tickers_url = "https://www.sec.gov/files/company_tickers.json"
        self.ticker_map: Dict[str, int] = {}
        self._load_ticker_map()

    def _load_ticker_map(self):
        """
        Fetch and cache the ticker -> CIK mapping from SEC.
        """
        try:
            headers = {
                # SEC requires a User-Agent with contact info
                "User-Agent": "PersonalInvestmentAssistant/1.0 (contact@example.com)",
                "Accept-Encoding": "gzip, deflate",
                "Host": "www.sec.gov"
            }
            logger.info("Fetching SEC Ticker Map...")
            response = requests.get(self.tickers_url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Data format: {"0": {"cik_str": 123, "ticker": "AAA", "title": "Name"}, ...}
            new_map = {}
            for key, val in data.items():
                t = val.get("ticker")
                c = val.get("cik_str")
                if t and c:
                    new_map[t.upper()] = c
            
            self.ticker_map = new_map
            logger.info(f"Loaded {len(self.ticker_map)} tickers from SEC.")
            
        except Exception as e:
            logger.error(f"Failed to load SEC ticker map: {e}")
            # Non-critical failure, can retry or just have empty map
            
    def get_cik(self, ticker: str) -> Optional[int]:
        """
        Get CIK for a given ticker.
        """
        return self.ticker_map.get(ticker.upper())

    def get_edgar_url(self, ticker: str) -> Optional[str]:
        """
        Generate the official SEC EDGAR landing page URL for the ticker.
        """
        cik = self.get_cik(ticker)
        if cik:
            # Pad CIK to 10 digits for some URLs, but browse link works with int usually.
            # New SEC Browse URL: https://www.sec.gov/edgar/browse/?CIK={cik}
            # Classic: https://www.sec.gov/cgi-bin/browse-edgar?CIK={cik}&action=getcompany
            return f"https://www.sec.gov/edgar/browse/?CIK={cik}"
        return None

# Singleton
sec_service = SecService()
