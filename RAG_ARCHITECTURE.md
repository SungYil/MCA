# RAG Architecture for MCA (My Capital Assistant)

## 🏗️ Overview
MCA employs a **Retrieval Augmented Generation (RAG)** architecture to provide grounded, reliable AI investment analysis. Instead of relying solely on the vast but potentially outdated knowledge of the LLM, we inject specific, trusted financial data into the context window.

## 🔄 Data Flow Pipeline

### 1. Data Ingestion & Storage
- **Structured Data (PostgreSQL)**:
    - Real-time stock prices, Dividend history, Financial ratios (P/E, EPS growth).
    - Source: External APIs (Tiingo, SEC).
- **Unstructured Data (Vector Store - Planned)**:
    - User notes, Earnings call summaries, Analyst news.
    - **Chunking**: Text is split into 500-token chunks with 50-token overlap.
    - **Embedding**: Converted to vectors using Gemini Embeddings API (text-embedding-004).

### 2. Retrieval Strategy (Hybrid)
When a user requests analysis for a ticker (e.g., AAPL):
1.  **DB Fetch**: Query `Stocks` table for latest numeric data.
2.  **Vector Search**: Query `Vector Store` for Top-3 relevant text chunks using cosine similarity.
    - *Metadata Filter*: Filter by ticker (e.g., `ticker == 'AAPL'`).

### 3. Prompt Engineering
The prompt is constructed dynamically with strict sections:

```text
[SYSTEM INSTRUCTION]
Act as a senior financial analyst. Answer ONLY based on the provided context.

[USER PROFILE]
- Risk Tolerance: Medium
- Goal: Monthly Dividends

[STRUCTURED DATA]
- Ticker: O
- Div Yield: 5.5%
- Payout Ratio: 200% (Real Estate REIT)

[RETRIEVED CONTEXT]
1. (2024-01) "Realty Income completed merger with Spirit Realty..."
2. (User Note) "I like their monthly checks but worried about interest rates."

[TASK]
Analyze 'Realty Income' for this user. Focus on dividend safety.
```

## 🛠️ Tech Stack
- **LLM**: Google Gemini Pro (v1.5)
- **Embeddings**: Google Gemini Embeddings
- **Orchestration**: Custom Python Service (`AIService`)
- **Vector DB**: pgvector (PostgreSQL extension) - *To be implemented*

## ⚠️ Data Grounding Rules
To prevent hallucinations:
1.  **Explicit Instructions**: "If data is missing, state 'Data Not Available'. Do not invent numbers."
2.  **Citation**: Ask model to reference which Context Chunk it used.
3.  **Fallback**: If Gemini API fails, return a graceful error message rather than breaking the app.
