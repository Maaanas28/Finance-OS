# Finance OS

> **Institutional Financial Intelligence & Terminal Platform**
> 
> *Real-Time Market Intelligence · Factor Risk Modeling · Algorithmic Backtesting · AI Analytics*

Finance OS is a high-performance web-based financial intelligence platform built with the dark terminal aesthetic of a Bloomberg Terminal combined with the ergonomics of modern web applications. Built entirely with **JavaScript** (React, Node.js, Express, PostgreSQL, Prisma), it provides a scalable, modular platform for tracking portfolios, analyzing risk factors, running stochastic Monte Carlo simulations, backtesting quantitative trading strategies, and leveraging AI for portfolio insights.

---

## ⚡ Key Features & Platform Desks

| Desk / Workspace | Route | Description |
| :--- | :--- | :--- |
| **Executive Dashboard** | `/dashboard` | Command overview showing total portfolio value, daily P&L, risk highlights, global market tickers, and sector allocation. |
| **Markets Desk** | `/markets` | Global security master indexing Indian equities (NSE/BSE), US equities, Forex pairs, and Cryptocurrencies with top gainers/losers. |
| **Stock Workspace** | `/markets/:symbol` | Deep-dive single instrument analysis with interactive price charts, key ratios (P/E, Market Cap, 52W Range), and Quick Trade execution. |
| **Portfolio Desk** | `/portfolio` | Real-time Mark-to-Market (MTM) holdings valuation, atomic cash/stock execution, and complete transaction audit ledger. |
| **Risk Center** | `/risk` | Institutional factor risk modeling including Volatility, Beta, Sharpe Ratio, Sortino Ratio, VaR (95%), CVaR, Correlation Heatmap, and Macro Stress Testing. |
| **Monte Carlo Simulator** | `/simulator` | 1,000-path Geometric Brownian Motion (GBM) price trajectory fan chart, Box-Muller random sampling, and percentile outcome distributions. |
| **Analytics Desk** | `/analytics` | Relative return performance vs NIFTY 50 benchmark, sector attribution, Treynor ratio, Jensen's Alpha, and Calmar ratio. |
| **News Feed** | `/news` | Aggregates 7 live Indian RSS financial wires with multi-wire title deduplication and rule-based NLP sentiment scoring (-1.0 to +1.0). |
| **Strategy Lab** | `/strategy-lab` | Quantitative strategy backtester (RSI, EMA Crossover, MACD) featuring zero look-ahead bias execution, 0.10% slippage, and 0.05% commission. |
| **AI Analyst** | `/ai-analyst` | Terminal AI chat assistant powered by Groq Cloud (`openai/gpt-oss-20b`) with live portfolio context injection and Zod schema validation. |

---

## 🏛️ System Architecture & Market Data Engine

Finance OS uses a unified internal interface for financial market data while concealing provider implementations behind vendor adapters:

```text
Frontend (Dashboard / Ticker / Chart / Movers)
    ↓ TanStack Query (Sub-3s High-Frequency Polling)
Finance OS Backend API (/api/v1/market/*)
    ↓
MarketDataService (Orchestrator)
    ├── In-Flight Request Deduplication Map (Prevents duplicate concurrent API hits)
    ├── Rate-Limit & Quota Budget Tracker (Daily counters + cool-off window)
    ├── Multi-Tier Cache Layer (CacheService with 3s quote TTL)
    └── SymbolNormalizer & Router (NSE/BSE -> Yahoo/BharatStock, US/FX/Crypto -> Twelve Data)
          ↓
Provider Adapter Layer (implements MarketDataProvider contract)
    ├── YahooFinanceProvider (Live & 15-min delayed global quotes without API keys)
    ├── BharatStockProvider (https://api.bharatstock.in/v1, Indian Equities & Indices)
    ├── TwelveDataProvider (https://api.twelvedata.com, US Equities, Forex, Crypto)
    └── MockMarketDataProvider (Guaranteed offline fallback labeled SIMULATED)
          ↓
Response Normalization & Validation (Zod schemas, status attribution)
          ↓
Database Persistence Layer (Prisma ORM & PostgreSQL)
```

### Data Freshness Statuses

Every market response includes standardized freshness metadata displayed in the UI:

| Status | Meaning | UI Indicator |
| :--- | :--- | :--- |
| `LIVE` | Real-time active market tick stream | `● LIVE` (Emerald beacon) |
| `DELAYED` | Exchange-delayed quote (e.g., 15-min delay) | `◷ DELAYED` (Blue badge) |
| `EOD` | End-of-Day closing price snapshot | `◷ EOD` (Sky blue badge) |
| `HISTORICAL` | Multi-period historical OHLCV candles | `◷ HISTORICAL` (Slate badge) |
| `SIMULATED` | High-fidelity mock engine output (offline mode) | `◇ SIMULATED` (Amber badge) |
| `STALE` | Cached snapshot served during provider rate-limit or outage | `⚠ STALE` (Rose warning badge) |

---

## 🛠️ Technology Stack

* **Frontend**:
  * React 18 & Vite 6
  * Tailwind CSS & Lucide Icons
  * TanStack Query (React Query v5) for data fetching & auto-refetching
  * Recharts & Lightweight-Charts for financial visualization
* **Backend**:
  * Node.js & Express
  * Prisma ORM & PostgreSQL
  * JWT (JSON Web Tokens) & `bcryptjs` for security
  * Groq Cloud API (`openai/gpt-oss-20b`) for AI Analyst
  * Vitest & Supertest for unit and integration testing

---

## 🚀 Quick Start & Installation

### Prerequisites

* Node.js v18+ 
* PostgreSQL (Local database or Neon/Supabase cloud instance)

### 1. Clone Repository

```bash
git clone https://github.com/Maaanas28/Finance-OS.git
cd Finance-OS
```

### 2. Configure Backend

```bash
cd backend
npm install

# Copy example environment file
cp .env.example .env
```

Update `backend/.env` with your database credentials:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_os?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Market Data Providers (Optional - Yahoo Finance active by default)
MARKET_DATA_MODE="auto"
BHARATSTOCK_API_KEY=""
TWELVE_DATA_API_KEY=""

# AI Analyst (Optional - Groq Cloud API Key)
AI_PROVIDER="grok"
AI_API_KEY="your_groq_api_key_here"
```

### 3. Run Database Migrations & Seed

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Start Backend Server

```bash
npm run dev
# Starts API server at http://localhost:5000
```

### 5. Configure & Start Frontend Terminal

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
# Starts Terminal UI at http://localhost:5173
```

---

## 🧪 Running Automated Tests

All 148 backend unit and integration tests execute against local mock fixtures and **never** burn external API credits:

```bash
cd backend
npm test
```

---

## 🔒 Security & Trade Safety

* **Server-Side Price Verification**: Trades are never executed using client-supplied prices. The backend re-fetches current live quotes before updating balances.
* **Atomic Transactions**: Portfolio balance updates and trade logs execute inside PostgreSQL database transactions (`prisma.$transaction`).
* **Zero Secret Exposure**: Provider API keys (`BHARATSTOCK_API_KEY`, `TWELVE_DATA_API_KEY`, `AI_API_KEY`) remain strictly server-side and are sanitized from logs.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
