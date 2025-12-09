import os
import google.generativeai as genai
from typing import Dict, Any, List
import json
import logging

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
# Fallback to a placeholder if API key is not set to prevent startup crash
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

class AIService:
    """
    RAG-based AI Service for Stock Analysis.
    Integrates with Google Gemini API.
    """

    def __init__(self):
        self.model_name = "gemini-flash-latest"
        # Safety settings can be adjusted here
        pass

    async def analyze_stock(self, ticker: str, structured_data: Dict[str, Any], user_profile: Dict[str, Any]) -> str:
        """
        Main entry point for stock analysis.
        Coordinates Retrieval -> Prompting -> Generation.
        """
        try:
            # 1. Retrieve Relevant Text Chunks (RAG)
            context_chunks = await self._retrieve_relevant_chunks(ticker)

            # 2. Build Hybrid Prompt
            prompt = self._build_prompt(ticker, structured_data, context_chunks, user_profile)

            # 3. Call LLM
            response_text = await self._call_gemini(prompt)
            
            return response_text

        except Exception as e:
            logger.error(f"Error analyzing stock {ticker}: {str(e)}")
            return "죄송합니다. 현재 AI 분석을 수행할 수 없습니다. (API 오류 또는 키 설정 확인 필요)"

    async def _retrieve_relevant_chunks(self, ticker: str) -> List[str]:
        """
        RAG Component: Retrieve top-k relevant text chunks.
        TODO: Replace mock with actual Vector DB (pgvector) query.
        """
        # Mock Context Data based on Ticker
        # In production, this would use embeddings search.
        mock_db = {
            "AAPL": [
                "Analyst Note (2024-Q1): Vision Pro headset launch had mixed reviews but high engagement.",
                "Earnings Call: Services revenue reached an all-time high, offsetting iPhone weakness in China.",
                "User Note: I am worried about the DOJ lawsuit regulatory risk."
            ],
            "O": [
                "News: Realty Income completed the acquisition of Spirit Realty Capital.",
                "Analyst Note: High interest rates continue to pressure REIT valuations, but O maintains 98% occupancy.",
                "User Note: Love the monthly dividends, looking to add more if yield hits 6%."
            ]
        }
        
        return mock_db.get(ticker.upper(), ["No specific recent news or notes found for this stock."])

    def _build_prompt(self, ticker: str, data: Dict[str, Any], context: List[str], profile: Dict[str, Any]) -> str:
        """
        Constructs a structured prompt for the LLM.
        """
        
        # Format structured data safely
        price_info = data.get('price', {})
        div_info = data.get('dividends', {})
        profile_info = data.get('profile', {})

        formatted_context = "\n".join([f"- {chunk}" for chunk in context])

        prompt = f"""
[SYSTEM ROLE]
You are a senior investment analyst for a personal wealth management app. 
Your goal is to provide a concise, high-quality analysis of a US stock for a Korean user.
Answer MUST be in Korean.

[USER PROFILE]
- Risk Tolerance: {profile.get('risk_tolerance', 'Medium')}
- Preferred Sectors: {', '.join(profile.get('preferred_sectors', []))}
- Investment Goal: {profile.get('goal', 'Balanced Growth and Income')}

[STRUCTURED FINANCIAL DATA]
- Ticker: {ticker}
- Name: {profile_info.get('name', 'Unknown')}
- Sector: {profile_info.get('sector', 'Unknown')}
- Current Price: ${price_info.get('price', 0)}
- Dividend Yield: {div_info.get('div_yield', 0)}%
- 5Y Growth Rate: {div_info.get('growth_rate_5y', 0)}%
- Description: {profile_info.get('description', '')}

[RETRIEVED CONTEXT (News, Notes, Reports)]
{formatted_context}

[INSTRUCTIONS]
Based STRICTLY on the data above, generate a report with the following structure:

1. **한 줄 요약**: 핵심 포인트를 한 문장으로 강력하게 요약.
2. **배당 분석**: 배당의 안정성, 성장성 평가. (배당주가 아니라면 성장 재투자 관점에서 서술)
3. **성장 및 비즈니스**: 비즈니스 모델의 견고함과 최근 성장 모멘텀.
4. **밸류에이션 및 리스크**: 현재 가격 매력도와 [RETRIEVED CONTEXT]에서 언급된 리스크 요인 2~3가지.
5. **적합도 점수 (0-10점)**: 사용자 프로필과의 적합도.
6. **최종 의견**: 점수를 준 이유 짧게.

DO NOT invent numbers. If data is missing, mention it.
Write in a professional yet easy-to-read tone (polite Korean ~해요체 or ~합니다체).
"""
        return prompt

    async def _call_gemini(self, prompt: str) -> str:
        """
        Executes the API call to Gemini.
        """
        if not GENAI_API_KEY:
            logger.warning("Gemini API Key missing.")
            return "API 키가 설정되지 않아 데모 분석만 가능합니다. (실제 분석 아님)"

        try:
            model = genai.GenerativeModel(self.model_name)
            response = await model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise e

# Singleton
ai_service = AIService()
