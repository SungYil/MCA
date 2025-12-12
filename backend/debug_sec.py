import requests
import json

def fetch_sec_tickers():
    url = "https://www.sec.gov/files/company_tickers.json"
    headers = {
        "User-Agent": "MyPersonalApp/1.0 (me@example.com)",
        "Accept-Encoding": "gzip, deflate",
        "Host": "www.sec.gov"
    }
    
    try:
        print(f"Fetching {url}...")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        print(f"Successfully fetched {len(data)} entries.")
        
        # Format is {"0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}, ...}
        # Let's peek at the first item
        first_key = list(data.keys())[0]
        print(f"Sample: {data[first_key]}")
        
        # Test lookup for AAPL
        target = "AAPL"
        found_cik = None
        for k, v in data.items():
            if v['ticker'] == target:
                found_cik = v['cik_str']
                break
        
        print(f"CIK for {target}: {found_cik}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_sec_tickers()
