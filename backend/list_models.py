import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load .env manually if not running in a context that does it automatically (like Docker env vars)
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"Checking models with API Key: {api_key[:5]}..." if api_key else "API Key NOT FOUND")

if api_key:
    genai.configure(api_key=api_key)
    try:
        print("\nAvailable Models for generateContent:")
        found = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
                found = True
        if not found:
            print("No models found supporting generateContent.")
    except Exception as e:
        print(f"Error listing models: {e}")
else:
    print("Cannot check models without API KEY.")
