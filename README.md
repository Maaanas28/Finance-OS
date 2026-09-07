# Finance OS

> **Institutional Financial Intelligence & Terminal Platform**
> 
> *What happened → Why did it happen → What could happen → What can I investigate?*

Finance OS is a serious fintech engineering platform designed with the aesthetics of a Bloomberg Terminal combined with the ergonomics of modern institutional trading and portfolio intelligence systems. Built with **pure JavaScript** across the entire stack, it provides a scalable, modular foundation for market intelligence, portfolio analytics, factor risk modeling, and quantitative strategy research.

---

## 📖 Technical Documentation & Study Guide

* 🎯 **[Practical Interview & Project Study Guide](./docs/INTERVIEW_STUDY_GUIDE.md)** — **Recommended start!** Easy-to-understand breakdown of every page, API, formula, tech stack component, and interview Q&A.
* 🟢 **[Part 1: Core System Architecture & Foundations](./docs/finance_os_technical_doc_part1.md)** — Sections 01–08 (Overview, System Architecture, Tech Stack, Codebase Structure, Auth/Security, Database Schema, API Reference, Market Data System).
* 🔵 **[Part 2: Workspace Pages & Domain Engine Deep Dives](./docs/finance_os_technical_doc_part2.md)** — Sections 09–17 (Dashboard, Markets, Portfolio Desk, Risk Center, Monte Carlo Simulator, Analytics Desk, News Feed, Strategy Lab, AI Analyst).
* 🟣 **[Part 3: Quantitative Math, Testing, Security & Interview Guide](./docs/finance_os_technical_doc_part3.md)** — Sections 18–33 (Financial Mathematics, Quant Methods, Integrity, Empty States, Testing Strategy, Cross-Page Consistency, Security & Trade Safety, Production Audit, Limitations, Interview Prep, Design Decisions, Failure Scenarios, Walkthrough, Glossary, Quick Reference, Master Map).
* 📚 **[Master Documentation Index & Checklist](./docs/README.md)** — Full Table of Contents & Completeness Checklist.

---

## Market Data Engine Architecture

Finance OS provides a unified internal interface for financial market data while hiding vendor-specific API implementations behind provider adapters:

```text
Frontend (Dashboard / Ticker / Chart / Movers)
    ↓ TanStack Query (staleTime: 30s-60s)
Finance OS Backend API (/api/v1/market/*)
    ↓
MarketDataService (Orchestrator)
    ├── In-Flight Request Deduplication Map (Prevents concurrent identical API hits)
    ├── Rate-Limit & Quota Budget Tracker (Daily counters + cool-off window)
    ├── Cache Layer (CacheService with Quote/History/Movers TTLs)
    └── SymbolNormalizer & Router (NSE/BSE -> BharatStock, US/FX/Crypto -> Twelve Data)
          ↓
Provider Adapter Layer (implements MarketDataProvider contract)
    ├── BharatStockProvider (https://api.bharatstock.in/v1, Indian Equities & Indices)
    ├── TwelveDataProvider (https://api.twelvedata.com, US Equities, Forex, Crypto)
    └── MockMarketDataProvider (Guaranteed offline fallback labeled SIMULATED)
          ↓
Response Normalization & Validation (Safe parsing, status attribution)
    ↓
Database Persistence Layer (Prisma: Security & MarketPrice historical snapshots)
```

### Supported Asset Classes
* **Indian Equities & Indices**: Routed to BharatStock (`RELIANCE`, `TCS`, `INFY`, `NIFTY 50`, `SENSEX`).
* **US Equities & ETFs**: Routed to Twelve Data (`AAPL`, `MSFT`, `NVDA`, `SPY`, `QQQ`).
* **Forex Currency Pairs**: Routed to Twelve Data (`USD/INR`, `EUR/USD`, `GBP/USD`).
* **Cryptocurrency**: Routed to Twelve Data (`BTC/USD`, `ETH/USD`, `SOL/USD`).

---

## Free-Tier Constraints (₹0 Budget)

Finance OS is strictly built for **zero-cost** operation:
* **BharatStock**: Free tier allows **100 requests/day** under `/v1` via `X-API-Key: <API_KEY>`.
* **Twelve Data**: Free basic plan allows **800 requests/day** and 8 credits/minute.
* **In-Flight Deduplication**: Multiple simultaneous frontend requests for the same instrument (e.g. ribbon + watchlist + chart) share a single in-flight Promise, conserving free quota.
* **Stale Cache Fallback**: When an external API returns HTTP 429 (Rate Limit), the engine marks the provider rate-limited, initiates a cool-off window, and serves the latest known cached snapshot marked `STALE` instead of failing.
* **Zero Testing Quota Burn**: All automated unit and API integration tests execute against local mock fixtures. Automated tests **never** burn external API credits.

---

## Data Freshness Statuses

Every market response includes standardized freshness metadata:

| Status | Meaning | UI Indicator |
| :--- | :--- | :--- |
| `LIVE` | Real-time active market tick stream | `● LIVE` (Emerald beacon) |
| `DELAYED` | Exchange-delayed quote (e.g., 15-min delay) | `◷ DELAYED` (Blue pill) |
| `EOD` | End-of-Day closing price snapshot | `◷ EOD` (Sky blue pill) |
| `HISTORICAL` | Multi-period historical OHLCV candles | `◷ HISTORICAL` (Slate pill) |
| `SIMULATED` | High-fidelity mock engine output (no API keys active) | `◇ SIMULATED` (Amber badge) |
| `STALE` | Cached snapshot served during provider rate-limit or outage | `⚠ STALE` (Rose warning badge) |
| `UNAVAILABLE`| Symbol not found across providers | `✕ UNAVAILABLE` (Red pill) |

---

## Environment Configuration

Copy `.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Configuration parameters in `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_os?schema=public"

# Authentication
JWT_SECRET="finance-os-dev-secret-key-at-least-32-chars-long"
JWT_EXPIRES_IN="7d"

# Market Data Engine Mode (auto | live | mock)
MARKET_DATA_MODE="auto"

# BharatStock (Indian Equities & Indices)
BHARATSTOCK_API_KEY="your_bharatstock_key_here"
BHARATSTOCK_BASE_URL="https://api.bharatstock.in/v1"
BHARATSTOCK_DAILY_LIMIT=100

# Twelve Data (US Equities, Forex, Crypto, Global)
TWELVE_DATA_API_KEY="your_twelvedata_key_here"
TWELVE_DATA_BASE_URL="https://api.twelvedata.com"
TWELVE_DATA_DAILY_LIMIT=800

# AI Provider
AI_PROVIDER="grok"
XAI_API_KEY=""

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### Modes of Operation (`MARKET_DATA_MODE`)
1. `auto` (Default): Uses real providers if credentials exist. Automatically falls back to stale cache or mock if keys are missing or rate-limited.
2. `live`: Attempts real providers. If unavailable, serves stale cache or throws an error without silently substituting mock data.
3. `mock`: Bypasses external providers entirely. Perfect for offline local development and rapid UI iterations.

---

## Market Data API Endpoints

All endpoints are prefixed with `/api/v1/market`:

* `GET /api/v1/market/quote/:symbol?exchange=NSE` — Normalized quote with source and freshness metadata.
* `GET /api/v1/market/quotes?symbols=NIFTY 50,SENSEX,AAPL,USD/INR` — Batch quotes for ticker ribbon.
* `GET /api/v1/market/history/:symbol?timeframe=1M&interval=1day` — Normalized OHLCV historical time series.
* `GET /api/v1/market/movers` — Normalized institutional top gainers and losers.
* `GET /api/v1/market/status` — Calculated real-time trading status for global exchanges (NSE, BSE, NYSE, NASDAQ, FOREX, CRYPTO).
* `GET /api/v1/market/health` — Provider health, rate-limit status, and daily quota usage without exposing secrets.
* `GET /api/v1/market/search?q=RELIANCE` — Symbol search and asset classification.

---

## Running the Platform

### Running Automated Tests (Zero Quota Used)

```bash
cd backend
npm test
```

Runs **33 unit and integration tests** across:
* `symbolNormalizer.test.js`: Asset routing and ticker aliases.
* `providers.test.js`: BharatStock and Twelve Data response normalization.
* `marketService.test.js`: Request deduplication, cache TTLs, rate-limit cool-off, and security audits.
* `marketApi.test.js`: Supertest validation of all market endpoints.
* `auth.test.js`: User registration, password hashing, and JWT security.
* `health.test.js`: System uptime and service status.

### Running Backend API

```bash
cd backend
npm run dev
# Starts at http://localhost:5000
```

### Running Frontend Terminal

```bash
cd frontend
npm run dev
# Starts at http://localhost:5173
```

### Building Frontend for Production

```bash
cd frontend
npm run build
```

---

## Manual Smoke Testing

To test specific symbols without burning quotas, make a single curl request:

```bash
# Indian Equity (BharatStock)
curl -s http://localhost:5000/api/v1/market/quote/RELIANCE

# US Equity (Twelve Data)
curl -s http://localhost:5000/api/v1/market/quote/AAPL

# Forex Pair
curl -s http://localhost:5000/api/v1/market/quote/USD-INR

# Crypto Pair
curl -s http://localhost:5000/api/v1/market/quote/BTC-USD

# Market Health & Quotas
curl -s http://localhost:5000/api/v1/market/health
```

---

## Security Audit
* **Zero Client Exposure**: No provider API keys (`BHARATSTOCK_API_KEY`, `TWELVE_DATA_API_KEY`, `XAI_API_KEY`) exist in the frontend repository or API responses.
* **Sanitized Logs**: HTTP client and error handlers strip API keys and query parameters before printing to terminal output.
