# 🚀 Finance OS — Institutional Financial Intelligence & Web Terminal Platform

> **A full-stack, institutional-grade web terminal combining real-time market data streaming, factor risk modeling, stochastic Monte Carlo simulations, quantitative strategy backtesting, and AI-driven portfolio analytics.**

---

## 📌 Executive Summary

Finance OS is an open-source financial intelligence platform designed with the visual language and dark-mode ergonomics of institutional systems like the **Bloomberg Terminal** or **Refinitiv Eikon**.

Built with a **pure JavaScript stack** (React 18, Node.js 24, Express, PostgreSQL, Prisma ORM), it provides retail traders, quants, and developers with institutional-grade financial telemetry:
- **Mark-to-Market (MTM) Portfolio Tracking**: Real-time position valuation, P&L attribution, and transaction audit ledgers.
- **Factor Risk Engine**: Volatility, Beta, Sharpe, Sortino, Historical/Parametric VaR (95%), CVaR (Expected Shortfall), Correlation Heatmaps, and Macro Stress Testing.
- **Stochastic Monte Carlo Engine**: 1,000-path Geometric Brownian Motion (GBM) simulations using Box-Muller normal sampling.
- **Quantitative Strategy Lab**: Backtesting engine (RSI, EMA Crossover, MACD) with zero look-ahead bias execution, slippage (0.10%), and commission (0.05%).
- **Financial News & Sentiment Intelligence**: RSS wire aggregation across 7 Indian financial sources with multi-wire title deduplication and NLP sentiment scoring.
- **AI Analyst**: LLM financial assistant powered by Groq Cloud (`openai/gpt-oss-20b`) with automated user portfolio context injection.

---

## 📐 System Architecture & Module Flow

```text
               ┌────────────────────────────────────────────────────────┐
               │     React 18 Terminal UI (Bloomberg Dark Theme)        │
               │   - Sub-3s Live Polling (TanStack / React Query)       │
               │   - Recharts & TradingView Lightweight Charts          │
               └───────────────────────────┬────────────────────────────┘
                                           │ REST API / JWT Auth
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │              Node.js + Express Backend                 │
               │   - Modular Controllers & Services                     │
               │   - Zod Input Validation & Error Handling              │
               └──────────────┬──────────────────────────┬──────────────┘
                              │                          │
             Prisma ORM Queries│                          │ Real-time Quotes & Candles
                              ▼                          ▼
         ┌────────────────────────┐         ┌───────────────────────────────────┐
         │   PostgreSQL Database  │         │        Market Data Engine         │
         │                        │         │  - Multi-Provider Adapter Router  │
         │ - User Credentials     │         │  - In-Flight Request Deduplication│
         │ - Portfolios & Cash    │         │  - Rate-Limit Cool-off & Cache    │
         │ - MTM Holdings Ledger  │         │ ┌──────────────┐ ┌──────────────┐ │
         │ - Transaction Audit    │         │ │ YahooFinance │ │ BharatStock  │ │
         │ - Custom Stress Tests  │         │ ├──────────────┤ ├──────────────┤ │
         └────────────────────────┘         │ │ Twelve Data  │ │ Mock Engine  │ │
                                            │ └──────────────┘ └──────────────┘ │
                                            └───────────────────────────────────┘
```

---

## 📊 Workspace Desks & Capabilities

### 1. Executive Dashboard (`/dashboard`)
Command hub providing parallel telemetry:
- **Global Ticker Ribbon**: Sub-3-second live ticker streaming for NIFTY 50, SENSEX, S&P 500, NASDAQ, USD/INR, and GOLD.
- **Portfolio Telemetry**: Real-time Net Asset Value (NAV), Daily P&L ($ and %), Total Return, Cash Balance, and Risk Badges.
- **Growth Performance Chart**: Historical NAV vs Invested Capital timeline.
- **Holdings & Sector Allocation**: Pie breakdown by industry sector (Financials, Tech, Energy, FMCG, etc.).

### 2. Market Intelligence Desk (`/markets`)
Searchable security universe indexing Indian equities (NSE/BSE), US equities, Forex currency pairs, and Crypto assets:
- **Instant Symbol Search**: Client and server-side autocomplete indexing 100+ Indian & global securities.
- **Market Movers**: Top gainers and losers by percentage change and volume depth.
- **Exchange Hours Status**: Real-time status indicators for NSE, BSE, NYSE, NASDAQ, FOREX, and CRYPTO.

### 3. Stock Detail & Quick Trade (`/markets/:symbol`)
Single-instrument workspace:
- **Interactive Candlestick / Area Charts**: Adjustable timeframes (1D, 1W, 1M, 1Y).
- **Fundamental Key Ratios**: P/E ratio, Market Cap, 52-Week High/Low, Volume, and Day Range.
- **Server-Verified Quick Trade Modal**: BUY/SELL orders validated server-side to prevent negative cash or overselling positions.

### 4. Portfolio Desk (`/portfolio`)
Institutional asset tracking & trade execution:
- **Mark-to-Market (MTM) Valuation**: Position value calculated continuously as $\text{Quantity} \times \text{Live LTP}$.
- **Unrealized & Realized P&L**: Individual holding cost basis vs current market price.
- **Atomic Trade Ledger**: Complete audit trail of all BUY, SELL, DEPOSIT, and WITHDRAWAL transactions.

### 5. Risk Command Center (`/risk`)
Quantitative risk & scenario analysis:
- **Volatility ($\sigma$)**: Annualized standard deviation of daily logarithmic returns.
- **Beta ($\beta$)**: Portfolio sensitivity relative to NIFTY 50 benchmark.
- **Sharpe & Sortino Ratios**: Risk-adjusted returns evaluating total vs downside-only volatility relative to risk-free rate ($R_f = 6.0\%$).
- **Value at Risk (VaR 95%) & CVaR**: Maximum expected 1-day loss and Expected Shortfall in tail risk events.
- **Correlation Heatmap**: Pairwise asset correlation matrix ($-1.0$ to $+1.0$) for diversification auditing.
- **Macro Stress Testing**: Simulates portfolio P&L impact under macroeconomic shock scenarios:
  - *RBI Rate Hike (+100 bps)*
  - *Crude Oil Spike (+20%)*
  - *Tech Sector Correction (-15%)*
  - *Rupee Depreciation (USD/INR +5%)*

### 6. Monte Carlo Simulator (`/simulator`)
Stochastic price path simulation:
- **Geometric Brownian Motion (GBM)**:
  $$S_t = S_0 \times \exp\left( \left(\mu - \frac{\sigma^2}{2}\right) t + \sigma \sqrt{t} Z \right)$$
- **Box-Muller Normal Sampling**: Generates normally distributed random shocks $Z \sim \mathcal{N}(0,1)$.
- **Probability Fan Chart**: Projects 1,000 independent simulation paths showing 5th percentile (bearish), 50th percentile (median), and 95th percentile (bullish) terminal portfolio outcomes over 30 to 365 days.

### 7. Analytics Desk (`/analytics`)
Performance attribution & benchmark comparison:
- **Benchmark Alpha ($\alpha$)**: Excess return generated beyond Beta-adjusted market returns:
  $$\alpha = R_p - [R_f + \beta (R_m - R_f)]$$
- **Treynor & Calmar Ratios**: Risk-adjusted returns per unit of systematic risk ($\beta$) and maximum drawdown.
- **Sector Attribution**: Breakdown of portfolio performance contributed by each sector.

### 8. News Feed & Sentiment Engine (`/news`)
Financial wire aggregator:
- **7 Live Indian RSS Wires**: Moneycontrol, Economic Times, Livemint, Business Standard, Financial Express, Reuters, NDTV Profit.
- **Multi-Wire Deduplication**: Title normalization algorithm prevents identical wire stories from appearing twice.
- **NLP Financial Sentiment**: Rule-based scoring categorizes stories as Bullish ($> +0.15$), Bearish ($< -0.15$), or Neutral.

### 9. Strategy Lab (`/strategy-lab`)
Algorithmic trading strategy backtester:
- **Built-in Indicators**: Relative Strength Index (RSI), Exponential Moving Average Crossover (EMA 20/50), MACD Momentum.
- **Zero Look-Ahead Bias**: Signal generated on candle $T$ close is executed strictly at candle $T+1$ Open.
- **Market Friction Modeling**: Incorporates 0.10% slippage + 0.05% broker commission per trade.

### 10. AI Analyst (`/ai-analyst`)
Institutional financial assistant:
- **Groq Cloud Integration**: Low-latency inference via `openai/gpt-oss-20b` (or Grok engine).
- **Automated Portfolio Context Injection**: User questions automatically inject real portfolio holdings, cash balance, risk metrics, and top positions into the prompt.
- **Zod Output Validation**: Enforces structured, safe responses.

---

## 🌐 Market Data Engine & Freshness Metadata

Finance OS features an intelligent Market Data Engine that automatically routes requests and manages free API quotas:

| Data Status | Meaning | UI Indicator |
| :--- | :--- | :--- |
| `LIVE` | Real-time active market tick stream | `● LIVE` (Emerald beacon) |
| `DELAYED` | Exchange-delayed quote (e.g., 15-min delay) | `◷ DELAYED` (Blue badge) |
| `EOD` | End-of-Day closing price snapshot | `◷ EOD` (Sky blue badge) |
| `HISTORICAL` | Multi-period historical OHLCV candles | `◷ HISTORICAL` (Slate badge) |
| `SIMULATED` | High-fidelity mock engine output (offline mode) | `◇ SIMULATED` (Amber badge) |
| `STALE` | Cached snapshot served during provider rate-limit or outage | `⚠ STALE` (Rose warning badge) |

---

## 🛠️ Technology Stack

| Layer | Technology | Role in Project |
| :--- | :--- | :--- |
| **Frontend UI** | React 18 & Vite 6 | High-speed component rendering & bundling |
| **Styling** | Tailwind CSS & Lucide Icons | Bloomberg dark-terminal visual system |
| **State & Polling** | TanStack Query (React Query v5) | Sub-3s refetching, request deduplication, memory caching |
| **Charts** | Recharts & Lightweight-Charts | Interactive financial candlestick & fan charts |
| **Backend API** | Node.js v24 & Express 4 | ESM REST API server & domain services |
| **Database** | PostgreSQL & Prisma ORM 6 | Relational persistence, migrations, type-safe queries |
| **Security** | JWT & `bcryptjs` | Multi-tenant authentication & session security |
| **AI Driver** | Groq Cloud (`openai/gpt-oss-20b`) | Portfolio context-injected AI chat engine |
| **Testing** | Vitest 3 & Supertest 7 | 148 automated unit & API integration tests |

---

## ⚡ Quick Start & Setup Guide

### Prerequisites
- **Node.js**: v18.0 or higher
- **PostgreSQL**: Local instance or Cloud PostgreSQL (Neon/Supabase)

### 1. Clone Repository

```bash
git clone https://github.com/Maaanas28/Finance-OS.git
cd Finance-OS
```

### 2. Configure Backend Environment

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your database URL:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_os?schema=public"
JWT_SECRET="finance-os-dev-secret-key-at-least-32-chars-long"
JWT_EXPIRES_IN="7d"

# Market Data Engine (Yahoo Finance active by default - no API key needed)
MARKET_DATA_MODE="auto"

# Optional AI API Key (Groq Cloud)
AI_PROVIDER="grok"
AI_API_KEY="your_groq_api_key_here"
```

### 3. Initialize Database & Migrations

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Start Backend API Server

```bash
npm run dev
# Server running at http://localhost:5000
```

### 5. Start Frontend Terminal UI

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
# Terminal UI running at http://localhost:5173 (or http://localhost:5174)
```

---

## 🧪 Testing & Quality Assurance

Run all 148 automated unit & integration tests (runs 100% offline using mock data fixtures without consuming external API quota):

```bash
cd backend
npm test
```

Build production bundle:

```bash
cd frontend
npm run build
```

---

## 🔒 Security & Trade Safety

1. **Server-Side Price Validation**: Trades are validated against current live market quotes fetched server-side before execution.
2. **Atomic Ledger Transactions**: Balance adjustments and transaction entries run inside PostgreSQL database transactions (`prisma.$transaction`).
3. **Zero Secret Exposure**: Provider API keys (`BHARATSTOCK_API_KEY`, `TWELVE_DATA_API_KEY`, `AI_API_KEY`) remain strictly on the backend server.
4. **Input Sanitation**: Zod schemas validate all API payloads for strict type safety.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
