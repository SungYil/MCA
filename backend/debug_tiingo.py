import os
import requests
import json

# Manually set key if env not picked up, but try to read env first
API_KEY = os.getenv("TIINGO_API_KEY")

print(f"DEBUG: Checking Tiingo API...")
print(f"DEBUG: API Key present: {bool(API_KEY)}")

if not API_KEY:
    print("ERROR: TIINGO_API_KEY is not set.")
    exit(1)

TICKER = "AAPL"
BASE_URL = "https://api.tiingo.com"

def test_endpoint(name, url):
    print(f"\n--- Testing {name} ---")
    print(f"URL: {url}")
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Token {API_KEY}'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        try:
            data = response.json()
            print(f"Response Data (Truncated): {str(data)[:200]}...")
            return data
        except json.JSONDecodeError:
            print(f"Response Text: {response.text}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# 1. Test IEX (Real-time/Top of Book)
iex_url = f"{BASE_URL}/iex/{TICKER}"
test_endpoint("IEX Endpoint", iex_url)

# 2. Test Daily (EOD)
daily_url = f"{BASE_URL}/tiingo/daily/{TICKER}"
test_endpoint("Daily Meta Endpoint", daily_url)

# 3. Test Daily Prices
history_url = f"{BASE_URL}/tiingo/daily/{TICKER}/prices?startDate=2024-01-01&columns=date,close,divCash"
test_endpoint("Daily Prices Endpoint", history_url)

# 4. Test News Endpoint
news_url = f"{BASE_URL}/tiingo/news?tickers={TICKER}&limit=5"
test_endpoint("News Endpoint", news_url)
