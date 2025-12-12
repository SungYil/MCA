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

            # 2. Build Prompt
            prompt = f"""
[SYSTEM ROLE]
You are a highly experienced personal investment consultant.
Your client has a specific stock portfolio and wants daily advice and a health check.
Answer MUST be in Korean.

[CLIENT PROFILE]
- Risk Tolerance: {user_profile.get('risk_tolerance', 'Medium')}
- Investment Goal: {user_profile.get('goal', 'Balanced Growth and Income')}

[PORTFOLIO SUMMARY]
Total Value: ${total_value:.2f}
Holdings:
{holdings_text}

[INSTRUCTIONS]
Based on the portfolio above, provide a detailed and actionable report:

1.  **📊 포트폴리오 정밀 진단 (Weakness Analysis)**: 
    -   섹터 편중, 배당 안정성, 성장성 부족 등 **취약점**을 날카롭게 지적해주세요.
    -   "현재 기술주 비중이 80%로 너무 높습니다" 처럼 구체적으로.

2.  **⚖️ 리밸런싱 제안 (Rebalancing)**:
    -   현재 포트폴리오 균형을 맞추기 위해 **비중을 줄여야 할 종목**과 **늘려야 할 종목**을 콕 집어주세요.
    -   예: "AAPL 비중을 10% 줄이고, 방어주인 O를 5% 추가하세요."

3.  **💎 AI 추천 종목 (Stock Gems)**:
    -   사용자의 투자 성향({user_profile.get('risk_tolerance')} / {user_profile.get('goal')})에 부합하는 **미국 주식 3개**를 추천해주세요.
    -   각 추천 종목에 대해 **티커(Ticker)**와 **추천 이유**를 명시하세요.

4.  **💡 오늘의 투자 조언**:
    -   현재 시장 상황을 고려한 단기 대응 전략.

Write in a warm but expert tone (Korean ~해요체/합니다체). Use Markdown formatting strictly.
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
You are a top-tier financial news anchor (like Bloomberg or CNBC) for a Korean audience.
Your task is to produce a "Daily Market Briefing" (오늘의 미국 증시 브리핑).

[MARKET DATA]
Indices: {indices_text}

[TOP NEWS HEADLINES]
{news_text}

[INSTRUCTIONS]
Based on the data above, write a professional, engaging, and insightful market report in Korean.
Structure:

# 🇺🇸 오늘의 미국 증시 요약
(Top section: Summarize the overall market sentiment based on indices data. Bullish/Bearish/Mixed?)

## 📰 주요 헤드라인
(Bulleted list of the most critical news items, rewritten in natural Korean. Filter out noise.)

## 🧐 심층 분석 및 전망
(Synthesize the news and price action to explain WHY the market moved this way. Provide a short-term outlook.)

## 💡 투자자 체크포인트
(1-2 key takeaways for personal investors.)

Tone: Professional, Insightful, and Crisp. Use Markdown.
"""
        return await self._call_gemini(prompt)

# Singleton
ai_service = AIService()
