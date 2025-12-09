# MCA (My Capital Assistant)
**개인용 미국 배당주 및 성장주 분석 AI 어시스턴트**

---

## 📌 프로젝트 개요

MCA는 개인 투자자를 위한 **미국 주식 분석 웹 애플리케이션**입니다.  
배당주와 대형 테크 성장주를 중심으로 포트폴리오 관리, 종목 상세 분석, AI 기반 투자 인사이트를 제공합니다.

### 주요 특징
- 🎯 **개인용 프로젝트**: 단일 사용자 환경이지만 프로덕션 수준의 코드 품질 유지
- 📊 **데이터 기반 분석**: 신뢰할 수 있는 외부 API(Tiingo, SEC EDGAR 등)를 통한 정확한 데이터 수집
- 🤖 **AI 인사이트**: LLM을 활용한 종목별 투자 분석 및 추천 요약
- 🐳 **Docker 기반**: 로컬 개발과 EC2 배포 환경의 일관성 보장

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  - 대시보드, 포트폴리오, 종목 상세 페이지                          │
│  - TypeScript + Tailwind CSS                                │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                       │
│  - REST API 제공                                             │
│  - 외부 데이터 수집 (Tiingo, SEC EDGAR)                        │
│  - LLM 호출 및 프롬프트 엔지니어링                               │
│  - 포트폴리오 계산 로직 (수익률, 배당 예상액 등)                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                     │
│  - 사용자 프로필, 워치리스트, 포트폴리오                          │
│  - 종목 데이터 캐싱 (가격, 배당, 재무제표)                        │
└─────────────────────────────────────────────────────────────┘

External APIs:
  - Tiingo (주가 데이터)
  - SEC EDGAR (재무제표)
  - LLM API (Gemini 등)
```

### 데이터 흐름
1. **외부 API → Backend ETL/Batch**: 주기적으로 주식 데이터 수집
2. **Backend → PostgreSQL**: 수집된 데이터를 DB에 저장 및 캐싱
3. **Frontend → Backend API**: REST API를 통해 데이터 요청
4. **Backend → LLM**: 필요 시 금융 데이터를 프롬프트로 구성하여 AI 분석 요청
5. **Backend → Frontend**: 분석 결과를 JSON으로 반환

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI/UX**: Desktop-first, Responsive 지원

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy / SQLModel (예정)
- **Data Processing**: pandas, numpy
- **API 통신**: requests, httpx

**왜 FastAPI?**  
NestJS도 훌륭하지만, 금융 데이터 분석(pandas, numpy)과 LLM 라이브러리(LangChain 등) 생태계에서 Python이 압도적으로 유리합니다.

### Database
- **RDBMS**: PostgreSQL 15
- **향후 계획**: Redis (캐싱 및 Background Job Queue)

### Infrastructure
- **컨테이너화**: Docker, Docker Compose
- **배포 환경**: AWS EC2 (Ubuntu 22.04 LTS)
- **버전 관리**: Git

---

## 📦 프로젝트 구조

```
mca/
├── frontend/                # Next.js 애플리케이션
│   ├── app/                 # App Router 페이지
│   │   └── page.tsx         # 메인 대시보드
│   ├── components/          # React 컴포넌트 (예정)
│   ├── lib/                 # 유틸리티 및 API 클라이언트 (예정)
│   ├── Dockerfile           # Frontend 컨테이너 이미지
│   ├── next.config.ts       # Next.js 설정 (standalone 모드)
│   └── package.json
│
├── backend/                 # FastAPI 애플리케이션
│   ├── main.py              # 진입점, Health Check API
│   ├── requirements.txt     # Python 의존성
│   ├── Dockerfile           # Backend 컨테이너 이미지
│   ├── database.py          # DB 연결 설정 (예정)
│   ├── models/              # SQLAlchemy 모델 (예정)
│   ├── routers/             # API 라우터 (예정)
│   └── services/            # 비즈니스 로직 (예정)
│
├── docker-compose.yml       # 전체 서비스 오케스트레이션
└── README.md                # 본 문서
```

---

## 🎯 MVP 기능 계획

### 1. 사용자 프로필 (투자 선호도)
- 배당 vs 성장 선호도
- 변동성 허용 수준 (Low / Medium / High)
- 선호 섹터 / 회피 섹터

### 2. 워치리스트 & 포트폴리오
- **워치리스트**: 관심 종목 추가/삭제
- **포트폴리오**: 보유 종목, 수량, 평단가 입력
- **요약 정보**:
  - 섹터별 비중
  - 예상 연간 배당 수익
  - 단순 수익률 (향후 변동성 추가)

### 3. 종목 상세 페이지
각 종목(예: AAPL)에 대해 다음 정보 제공:
- **기본 정보**: 티커, 회사명, 섹터, 시가총액
- **가격 차트**: 1개월 / 3개월 / 1년 EOD 데이터
- **배당 정보**:
  - 현재 배당 수익률
  - 과거 배당 이력
  - 배당 성장률
- **재무 데이터**:
  - 매출 및 EPS 성장률
  - 마진율, 부채 비율 등 핵심 지표
- **AI 애널리스트 요약** (LLM 생성):
  - 한 줄 요약
  - 배당 퀄리티
  - 성장성 및 비즈니스 품질
  - 밸류에이션
  - 주요 리스크 2~3가지
  - **적합도 점수** (0~10): 사용자 프로필 기반

### 4. 추천 종목 리스트
두 가지 카테고리로 나누어 제공:
- **핵심 배당주 후보**
- **테크 성장주 후보**

각 추천 카드는:
- 주요 지표 표시
- LLM 생성 짧은 설명 (왜 추천되는지 + 주요 리스크)

---

## 🚀 개발 및 배포 워크플로우

### 로컬 개발 (코드 작성만)
로컬 PC에서는 코드 작성과 커밋에만 집중합니다.  
실제 실행 및 테스트는 EC2에서 진행합니다.

```bash
# 코드 수정 후
git add .
git commit -m "feat: Add stock detail API"
git push origin main
```

### EC2 배포 및 테스트
상세한 배포 과정은 **[deployment_guide.md](C:\Users\shfur2006\.gemini\antigravity\brain\3c3caf86-1dbc-4941-8078-6387bd1d4bef\deployment_guide.md)** 문서를 참고하세요.

**간략 요약:**
```bash
# 1. EC2 접속
ssh ubuntu@<EC2_PUBLIC_IP>

# 2. 최신 코드 가져오기
cd mca
git pull

# 3. Docker Compose로 실행
docker compose up -d --build

# 4. 상태 확인
docker compose ps
curl http://localhost:8000/api/health

# 5. 브라우저 테스트
# http://<EC2_PUBLIC_IP>:3000
```

---

## 🔧 현재 구현 상태

### ✅ 완료
- [x] 프로젝트 구조 설정 (Frontend, Backend, Infra)
- [x] Docker 및 Docker Compose 설정
- [x] Backend Health Check API (`/api/health`)
- [x] Frontend 기본 대시보드 (Backend 연결 테스트)
- [x] EC2 배포 가이드 작성
- [x] PostgreSQL 연결 및 DB 스키마 설계 (`User`, `Stock`, `Portfolio`, `Watchlist`)

## 🗄️ 데이터베이스 스키마

**1. Users (사용자)**
- `id`, `username`
- `risk_tolerance` (Low, Medium, High)
- `preferred_sectors`, `avoided_sectors` (JSON)

**2. Stocks (주식 종목)**
- `ticker` (PK), `name`, `sector`
- `current_price`, `dividend_yield`, `market_cap`
- `ai_summary`, `quality_score` (LLM 분석 결과 캐싱)

**3. Portfolio & Watchlist**
- `PortfolioItem`: `user_id`, `ticker`, `shares`, `average_cost`
- `WatchlistItem`: `user_id`, `ticker`

### 🚧 진행 예정
- [ ] PostgreSQL 연결 및 DB 스키마 설계
- [ ] 사용자 프로필 모델 및 API
- [ ] 워치리스트/포트폴리오 CRUD API
- [ ] 외부 API 연동 (Tiingo, SEC EDGAR - Mock)
- [ ] LLM 통합 (Gemini API)
- [ ] 종목 상세 페이지 UI
- [ ] AI 애널리스트 요약 기능
- [ ] 추천 엔진 (간단한 룰 베이스)

---

## 📚 참고 문서

- **[Implementation Plan](C:\Users\shfur2006\.gemini\antigravity\brain\3c3caf86-1dbc-4941-8078-6387bd1d4bef\implementation_plan.md)**: 상세 구현 계획
- **[Deployment Guide](C:\Users\shfur2006\.gemini\antigravity\brain\3c3caf86-1dbc-4941-8078-6387bd1d4bef\deployment_guide.md)**: EC2 배포 가이드
- **[Task List](C:\Users\shfur2006\.gemini\antigravity\brain\3c3caf86-1dbc-4941-8078-6387bd1d4bef\task.md)**: 진행 상황 체크리스트

---

## 🔐 환경 변수 (예정)

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@db:5432/mca_db
TIINGO_API_KEY=your_tiingo_key
LLM_API_KEY=your_gemini_key

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 💡 설계 원칙

1. **데이터 정확성 우선**: 신뢰할 수 있는 외부 데이터 소스 사용
2. **LLM은 설명만**: LLM은 자연어 요약/설명에만 사용, 투자 계산 로직은 Backend에서 처리
3. **프로덕션 수준 코드**: 개인용이지만 확장 가능한 아키텍처 유지
4. **환경 일관성**: Docker 기반으로 로컬과 EC2 환경 동일하게 관리

---

## 📞 문의 및 기여

본 프로젝트는 개인 학습 및 투자 분석 목적으로 제작되었습니다.  
질문이나 제안 사항이 있으시면 이슈를 등록해 주세요.

---

**Last Updated**: 2025-12-09