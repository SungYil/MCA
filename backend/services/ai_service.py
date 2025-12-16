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
        NOW: Fetches REAL NEWS via Tiingo API.
        """
        from services import stock_service # Implicit import to avoid circular dep if any, or better import at top if simple.
        # Actually standard import is `from services.stock_service import stock_service`
        # But let's assume it's available or import locally.
        try:
            from services.stock_service import stock_service
            news_items = stock_service.get_stock_news(ticker, limit=5)
            
            if not news_items:
                return ["No recent news found for this stock."]
                
            chunks = []
            for item in news_items:
                # Format: [Date] Source: Title - Description
                date_str = item.get("publishedDate", "")[:10]
                chunk = f"[{date_str}] {item['source']}: {item['title']} - {item['description']}"
                chunks.append(chunk)
            
            return chunks

        except Exception as e:
            logger.error(f"RAG Retrieval failed for {ticker}: {e}")
            return [f"Error retrieving news: {str(e)}"]

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
You are an equity analyst advising a single private client.

[CLIENT PROFILE]
- Risk Tolerance: {profile.get('risk_tolerance', 'Medium')}
- Investment Goal: {profile.get('goal', 'Balanced')}

[STOCK DATA]
- Ticker: {ticker}
- Name: {profile_info.get('name', 'Unknown')}
- Fundamentals: P=${price_info.get('price', 0)}, Div={div_info.get('div_yield', 0)}%, Growth={div_info.get('growth_rate_5y', 0)}%
- Description: {profile_info.get('description', '')}

[RECENT NEWS]
{formatted_context}

[INSTRUCTIONS]
Tasks:
1. Give a forward-looking view for the next 6–12 months, based on:
   - The fundamentals and growth trends,
   - Recent news and events,
   - The client’s risk and income preferences.
2. For this specific client:
   - Should this stock be a BUY, HOLD, or REDUCE/SELL candidate?
   - If held: is the current weight too high, too low, or reasonable?
3. Rate the FIT between this stock and the client’s profile on a 0–10 scale.
4. Explain in Korean, structured as:
   - 섹션 1: 6–12개월 전망 (Scenarios, not guarantees)
   - 섹션 2: 이 종목과 내 포트폴리오의 궁합 (Fit Score + Reason)
   - 섹션 3: 액션 플랜 (Buy/Sell/Hold, 비중 조정 제안)
   - 섹션 4: 주요 리스크 & 모니터링 포인트

Constraints:
- Ground your answer in the provided fundamentals and news.
- Do not invent specific numbers that are not in the input.
- Avoid extreme certainty; describe plausible scenarios instead.
"""
        return prompt

    async def analyze_portfolio(self, portfolio_items: List[Dict[str, Any]], user_profile: Dict[str, Any]) -> str:
        """
        Generates a personalized daily advice report based on the user's portfolio.
        """
        try:
            # 1. Summarize Portfolio Context
            holdings_text = ""
            total_value = 0
            for item in portfolio_items:
                value = item['shares'] * item['current_price']
                total_value += value
                holdings_text += f"- {item['ticker']}: {item['shares']} shares @ ${item['average_cost']:.2f} (Current: ${item['current_price']:.2f}, Val: ${value:.2f})\n"

            # 2. Build Prompt (User Requested Format)
            # 2. Build Prompt (User Requested Format)
            # Unpack detailed profile
            risk = user_profile.get('risk_tolerance', 'Medium')
            inv_profile = user_profile.get('investment_profile', {})
            
            goal = inv_profile.get('primary_goal', 'Balanced Growth')
            horizon = inv_profile.get('investment_horizon', 'Mid-term')
            experience = inv_profile.get('experience_level', 'Intermediate')
            
            sectors = user_profile.get('preferred_sectors', [])
            if not sectors: sectors = ['General Balance']
            
            prompt = f"""
[SYSTEM ROLE]
You are a highly personalized portfolio manager for a private client.

[CLIENT PROFILE]
- Risk Tolerance: {risk}
- Primary Goal: {goal}
- Investment Horizon: {horizon}
- Experience Level: {experience}
- Preferred Sectors: {', '.join(sectors)}

[PORTFOLIO SNAPSHOT]
Total Value: ${total_value:.2f}
Holdings:
{holdings_text}

[INSTRUCTIONS]
Based on the client's specific profile above, provide a detailed advice report in Korean.
Use a tone appropriate for a {experience} investor (e.g. explain more concepts if Beginner, go deeper if Expert).

Tasks:
1. Identify the main WEAKNESSES of this portfolio today, specifically considering the '{goal}' goal and '{risk}' tolerance.
2. Propose a concrete REBALANCING PLAN:
   - Which positions to trim or exit?
   - Which positions to increase?
   - Cash buffer recommendation?
3. Suggest up to 3 NEW US stocks that fit the '{goal}' strategy:
   - Consider the '{horizon}' horizon.
4. Explain in Korean, clearly structured:
   - Section 1: 주요 약점 (Weaknesses) - 맞춤형 분석
   - Section 2: 리밸런싱 제안 (Target Weights)
   - Section 3: 신규 편입 후보 (Rationale tailored to profile)
   - Section 4: 오늘 체크 포인트

Constraints:
- Be objective but personalized.
- Address the user directly based on their profile.
"""
            # 3. Call LLM
            response_text = await self._call_gemini(prompt)
            return response_text

        except Exception as e:
            logger.error(f"Error analyzing portfolio: {str(e)}")
            return "포트폴리오 분석 중 오류가 발생했습니다."

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

    async def generate_market_briefing(self, market_data: Dict[str, Any]) -> str:
        """
        Generates a Bloomberg-style daily market briefing.
        """
        indices = market_data.get("indices", {})
        news_items = market_data.get("news", [])

        # Format Indices
        indices_text = ", ".join([
            f"{k}: ${v.get('price', 0):.2f} ({v.get('change_percent', 0):.2f}%)" 
            for k, v in indices.items()
        ])

        # Format News
        news_text = "\n".join([
            f"- [{item.get('publishedDate')[:10]}] {item.get('title')} ({item.get('source')})"
            for item in news_items[:8]
        ])

        prompt = f"""
[SYSTEM ROLE]
You are a market anchor and portfolio strategist.

[TODAY'S MARKET DATA]
- Indices: {indices_text}
- Top Headlines: 
{news_text}

[INSTRUCTIONS]
Based on the data above, write a professional market report in Korean.

Tasks:
1. Explain in Korean why the US market moved the way it did today (main causes).
2. Explain how today’s market and news might affect a typical simplified growth-focused portfolio (Tech/Growth heavy).
3. List 3–5 key things investors should pay attention to going forward (e.g., upcoming events, risks, opportunities).
4. Optional: If there is any urgent risk or clear opportunity that stands out, mention it clearly in a short alert-style sentence.

Tone:
- Like a calm Bloomberg anchor, but speaking directly to one investor.
- Clear, concise, not sensational.

Structure:
- 섹션 1: 오늘 미국 시장 한눈에 보기
- 섹션 2: 내 포트폴리오에 미칠 수 있는 영향 (Growth/Tech 관점)
- 섹션 3: 앞으로 체크해야 할 포인트
- 섹션 4: (있다면) 오늘의 경고 또는 기회 한 줄 정리
"""
        return await self._call_gemini(prompt)

# Singleton
ai_service = AIService()
