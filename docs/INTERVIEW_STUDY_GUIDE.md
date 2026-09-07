# 🎯 Finance OS — Simple Project & Interview Study Guide

> **Goal**: Read this document, understand exactly what Finance OS does, how each page works under the hood, and explain it confidently to an interviewer in plain English.

---

## 💡 1. What is Finance OS? (The 1-Minute Pitch)

"Finance OS is a full-stack financial intelligence terminal built with **React**, **Node.js**, **Express**, and **PostgreSQL**. It functions like a web-based Bloomberg Terminal for retail & institutional users. It lets users track live portfolios with real-time Mark-to-Market (MTM) values, calculate risk metrics like VaR, Sharpe Ratio, and Beta, run 1,000-path Monte Carlo simulations, backtest trading strategies without look-ahead bias, analyze news sentiment, and ask an AI Analyst questions about their live portfolio."

---

## 🛠️ 2. Core Tech Stack (In Plain English)

* **Frontend**: React (UI components), Vite (fast bundler), Tailwind CSS / Vanilla CSS (Bloomberg dark mode aesthetic), TanStack Query / React Query (data fetching & auto-caching).
* **Backend**: Node.js & Express (REST APIs), Prisma ORM (database query builder), PostgreSQL (relational database storing users, portfolios, holdings, transactions, and strategy runs).
* **Authentication**: JWT (JSON Web Tokens) stored securely for session management. Passwords hashed using `bcrypt`.
* **Market Data Engine**: Unified backend service that routes requests to **BharatStock** (Indian stocks), **Twelve Data** (US stocks, Forex, Crypto), or **Mock Provider** (fallback). Features in-flight deduplication and stale caching so it operates 100% free without burning API limits.

---

## 📐 3. High-Level Architecture Diagram

```text
               ┌──────────────────────────────────────────────┐
               │    React Frontend (Bloomberg Dark Terminal)  │
               └──────────────────────┬───────────────────────┘
                                      │ REST API Calls (JWT Auth)
                                      ▼
               ┌──────────────────────────────────────────────┐
               │          Node.js + Express Backend           │
               └──────────────┬────────────────┬──────────────┘
                              │                │
             Prisma ORM Queries│                │ Live Quotes / History
                              ▼                ▼
         ┌────────────────────────┐  ┌───────────────────────────────────┐
         │   PostgreSQL Database  │  │        Market Data Engine         │
         │ (Users, Portfolios,    │  │ ┌──────────────┐ ┌──────────────┐ │
         │ Holdings, Trades)      │  │ │ BharatStock  │ │ Twelve Data  │ │
         └────────────────────────┘  │ └──────────────┘ └──────────────┘ │
                                     └───────────────────────────────────┘
```

---

## 📊 4. Page-by-Page Breakdown

### 1. Dashboard (`/dashboard`)
* **What it's for**: The main overview hub showing total portfolio value, daily P&L, allocation breakdown, market ticker ribbon, and risk highlights.
* **What the user sees**:
  * Top Ribbon: Live price ticker for NIFTY 50, SENSEX, AAPL, USD/INR, BTC/USD.
  * KPI Cards: Total Portfolio Value, Daily P&L (₹ and %), Total Profit/Loss, Cash Balance.
  * Portfolio Growth Chart: Historical portfolio performance over time.
  * Holdings & Sector Allocation: Pie/donut chart of stock breakdown.
* **Backend API & Data Flow**:
  * Calls `GET /api/v1/portfolio/user/me` for cash and holdings.
  * Calls `GET /api/v1/market/quotes` for live quotes.
  * Calculates live portfolio value = Cash + $\sum (\text{Quantity} \times \text{Live LTP})$.
* **Interactions**: Toggling timeframe buttons (1D, 1W, 1M, 1Y, ALL) to update growth charts.

---

### 2. Markets Desk (`/markets`)
* **What it's for**: Market discovery & tracking across global indices, Indian equities, US equities, Forex, and Crypto.
* **What the user sees**: Search bar, exchange market status (Open/Closed badges), top gainers & losers, sector heatmaps, and a searchable market table.
* **Backend API & Data Flow**:
  * `GET /api/v1/market/movers` -> Top gainers and losers.
  * `GET /api/v1/market/status` -> Market open/closed hours status.
  * `GET /api/v1/market/search?q=...` -> Instant symbol search.
* **Key Terms**:
  * **LTP (Last Traded Price)**: The most recent price a stock traded at.
  * **Volume**: Total shares traded during the day.
  * **Market Cap**: Total value of all company shares ($\text{Price} \times \text{Shares Outstanding}$).

---

### 3. Stock Detail Page (`/markets/:symbol`)
* **What it's for**: Deep-dive single stock view (e.g. HDFCBANK, RELIANCE, AAPL).
* **What the user sees**: Interactive candlestick / area price chart, key fundamental metrics (P/E ratio, 52W High/Low, Market Cap), company summary, and a **Quick Trade Modal** (BUY/SELL).
* **Backend API & Data Flow**:
  * `GET /api/v1/market/quote/:symbol` -> Current quote and market status.
  * `GET /api/v1/market/history/:symbol?timeframe=1M` -> Historical OHLCV candle series.
* **Trade Safety Logic**:
  * When BUY is clicked: Frontend calls `POST /api/v1/portfolio/trade`.
  * The backend **re-verifies** live market price from provider before executing! It checks:
    1. Quote exists and price > 0.
    2. User has enough cash balance for (Quantity * Price + Fees).
    3. If SELL, user actually owns enough shares.
    4. Executes inside an atomic database transaction (`prisma.$transaction`).

---

### 4. Portfolio Desk (`/portfolio`)
* **What it's for**: Managing owned stocks, cash balance, viewing mark-to-market valuations, and transaction audit trail.
* **What the user sees**:
  * Total Net Asset Value (NAV) & Cash Balance.
  * Holdings Table: Symbol, Quantity, Avg Buy Price, Live Price, Current Value, Unrealized P&L, Allocation %.
  * Transaction Ledger: History of all BUY/SELL trades with timestamp, quantity, price, and total cost.
  * Add Cash / Withdraw Cash buttons.
* **Important Calculations**:
  * **MTM (Mark-to-Market)**: Valuation of holdings using live current prices, not historical purchase price.
  * **Unrealized P&L**: $(\text{Live Price} - \text{Avg Buy Price}) \times \text{Quantity}$.
  * **Realized P&L**: Profit/loss locked in after selling shares.
  * **NAV (Net Asset Value)**: Total portfolio value = $\text{Cash} + \text{Total MTM Value of Holdings}$.

---

### 5. Risk Center (`/risk`)
* **What it's for**: Quantifying portfolio risk exposure, volatility, drawdowns, and stress scenarios.
* **What the user sees**:
  * Risk KPI Cards: Volatility (%), Portfolio Beta, Sharpe Ratio, Value at Risk (VaR), CVaR (Expected Shortfall).
  * Correlation Matrix Heatmap: Shows how stocks move relative to each other (-1.0 to +1.0).
  * Macro Stress Testing: Simulates impact of market shocks (e.g., "RBI Rate Hike +50bps", "Crude Oil Spike +20%", "Global Tech Selloff").
* **Backend API & Logic**:
  * `GET /api/v1/risk/summary?portfolioId=...` -> Computes historical daily log returns of portfolio holdings.
* **Key Terms & Math**:
  * **Volatility ($\sigma$)**: Annualized standard deviation of daily portfolio returns.
  * **Beta ($\beta$)**: Sensitivity of portfolio relative to NIFTY 50 benchmark ($\beta > 1$ means more volatile than market).
  * **Sharpe Ratio**: $\frac{\text{Portfolio Return} - R_f}{\text{Volatility}}$. Measures risk-adjusted return above risk-free rate ($R_f = 6\%$). Higher is better.
  * **Sortino Ratio**: Same as Sharpe, but only penalizes *downside* volatility.
  * **VaR (Value at Risk - 95%)**: Maximum expected loss over 1 day at a 95% confidence level.
  * **CVaR (Conditional VaR / Expected Shortfall)**: Average loss in the worst 5% of cases (tells you how bad a crash gets beyond VaR).
  * **Correlation**: Measure of co-movement between two assets (+1 = move together, -1 = move opposite, 0 = uncorrelated).

---

### 6. Monte Carlo Simulator (`/simulator`)
* **What it's for**: Simulating 1,000 potential future portfolio price paths over 30 to 365 days using stochastic probability models.
* **What the user sees**:
  * Interactive Fan Chart: 5th percentile (bearish case), 50th percentile (median case), 95th percentile (bullish case).
  * Final Probability Distribution Histogram: Likelihood of portfolio reaching different future values.
  * Win Rate & Max Expected Drawdown probabilities.
* **Mathematical Engine**:
  * Uses **Geometric Brownian Motion (GBM)**:
    $$S_t = S_0 \times \exp\left( \left(\mu - \frac{\sigma^2}{2}\right) t + \sigma \sqrt{t} Z \right)$$
  * Where $Z$ is a random sample from a normal distribution generated using the **Box-Muller Transform**.
  * Handled in Node.js backend (`monteCarloService.js`) using real portfolio volatility $\sigma$ and historical drift $\mu$.

---

### 7. Analytics Desk (`/analytics`)
* **What it's for**: Deep performance measurement vs benchmark (NIFTY 50) and sector attribution.
* **What the user sees**: Cumulative Return comparison line chart (Portfolio vs NIFTY 50), sector allocation pie, and key performance ratios.
* **Key Terms & Math**:
  * **Alpha ($\alpha$)**: Excess return generated by portfolio over what was expected given its Beta. $\alpha = R_p - [R_f + \beta (R_m - R_f)]$. Positive Alpha means outperforming the market!
  * **CAGR (Compound Annual Growth Rate)**: Smoothed annual growth rate over time.
  * **Maximum Drawdown (MDD)**: The largest percentage drop from a peak to a trough before a new peak is achieved.
  * **Treynor Ratio**: Risk-adjusted return relative to Beta ($\frac{R_p - R_f}{\beta}$).
  * **Calmar Ratio**: Return divided by Maximum Drawdown ($\frac{\text{CAGR}}{\text{Max Drawdown}}$).

---

### 8. News Feed (`/news`)
* **What it's for**: Aggregating real-time financial news, market commentary, and company announcements with sentiment scoring.
* **What the user sees**: Filterable news cards (All, Bullish, Bearish, Neutral), ticker tags, source, and sentiment score badge.
* **Backend Engine**:
  * Aggregates 7 live Indian RSS news feeds (Moneycontrol, Economic Times, Livemint, Business Standard, etc.).
  * **Title Deduplication**: Ignores duplicate stories across RSS feeds using normalized title matching.
  * **NLP Sentiment Scoring**: Uses rule-based financial dictionary analysis to score articles from -1.0 (Bearish) to +1.0 (Bullish).

---

### 9. Strategy Lab & Quant Backtester (`/strategy-lab`)
* **What it's for**: Building, testing, and evaluating algorithmic trading strategies on historical price data before risking real money.
* **What the user sees**:
  * Strategy Selector: RSI Reversal, Moving Average Crossover (EMA 20/50), MACD Momentum.
  * Input Parameters: Fast Period, Slow Period, RSI Thresholds, Stop Loss %, Take Profit %.
  * Backtest Results: Equity Curve vs Buy & Hold, Win Rate %, Total Trades, Profit Factor, Max Drawdown, Strategy Sharpe Ratio.
* **Quant Backtesting Engine Rules**:
  * **Zero Look-Ahead Bias**: Signal generated on candle $T$ close is executed on candle $T+1$ Open price!
  * **Transaction Friction**: Incorporates realistic market friction: 0.10% slippage + 0.05% broker commission per trade.
* **Key Terms**:
  * **RSI (Relative Strength Index)**: Momentum indicator (0-100). Below 30 = Oversold (Buy signal), Above 70 = Overbought (Sell signal).
  * **EMA (Exponential Moving Average)**: Moving average that gives more weight to recent prices.
  * **MACD**: Moving Average Convergence Divergence indicator.
  * **Slippage**: The difference between expected trade price and actual execution price due to market movement.
  * **Profit Factor**: $\frac{\text{Total Gross Profits}}{\text{Total Gross Losses}}$. Above 1.5 indicates a strong strategy.

---

### 10. AI Analyst (`/ai-analyst`)
* **What it's for**: Conversational AI financial assistant providing institutional-grade portfolio analysis.
* **What the user sees**: Terminal chat interface with pre-built prompt shortcuts ("Analyze my portfolio risk", "Evaluate sector concentration", "Suggest rebalancing strategy").
* **Backend Architecture**:
  * Integrates **Groq Cloud API** using `openai/gpt-oss-20b` (or Grok model).
  * **Portfolio Context Injection**: When user asks a question, the backend automatically injects the authenticated user's **real portfolio holdings, cash, risk metrics, and top positions** into the system prompt!
  * Structured output validation using Zod schemas to ensure safe, helpful responses.

---

## 🎯 5. Essential Interview Q&A Cheatsheet

### Q1: How did you handle live market data on a zero budget?
**Answer**: "I built a unified Market Data Engine with vendor adapters for BharatStock and Twelve Data. It includes an in-flight request deduplication map so simultaneous frontend calls share one Promise, and a multi-tier cache service with rate-limit cool-off detection. If an external API hits rate limits (HTTP 429), it serves cached data marked with a `STALE` status badge rather than breaking the UI."

### Q2: How do you prevent users from placing invalid or unsafe trades?
**Answer**: "Trade execution is validated server-side. Before executing a trade, the backend re-fetches the current live quote to ensure the price > 0, checks that the user has sufficient cash for BUY orders (including fees) or sufficient quantity for SELL orders, and executes the balance and holdings updates inside an atomic PostgreSQL database transaction."

### Q3: How does your Monte Carlo Simulator work?
**Answer**: "It runs 1,000 stochastic simulations over a selected timeframe using Geometric Brownian Motion (GBM). The backend calculates the portfolio's historical daily mean return ($\mu$) and volatility ($\sigma$), generates normally distributed random shocks using the Box-Muller transform, and projects price paths. We then compute 5th, 50th, and 95th percentile curves to show potential downside and upside outcomes."

### Q4: What is look-ahead bias in backtesting and how did you prevent it?
**Answer**: "Look-ahead bias occurs when a backtester uses future candle data that would not have been known at trading time. In Strategy Lab, indicator signals are evaluated strictly at candle $T$ close, and orders are executed at candle $T+1$ Open price. We also apply 0.10% slippage and 0.05% commission to reflect realistic trading friction."

---

## 🚀 Quick Summary Checklist for Interviews

| Feature / Topic | 1-Sentence Summary |
| :--- | :--- |
| **System Vision** | Bloomberg Terminal alternative built using Pure JS (React, Node, Express, PostgreSQL). |
| **Data Engine** | Multi-provider router (BharatStock + Twelve Data + Mock) with deduplication & stale cache. |
| **Trade Safety** | Server-side price re-verification + atomic database transaction checks before execution. |
| **Portfolio MTM** | Real-time valuation based on live prices ($\text{Cash} + \sum (\text{Qty} \times \text{LTP})$). |
| **Risk Metrics** | Daily return series analysis for Volatility, Beta, Sharpe, Sortino, VaR (95%), CVaR. |
| **Monte Carlo** | 1,000-path Geometric Brownian Motion simulation via Box-Muller normal sampling. |
| **Quant Backtesting**| Zero look-ahead bias (candle $T$ signal $\rightarrow$ candle $T+1$ open trade) + slippage & fees. |
| **AI Analyst** | Groq Cloud LLM completion with live portfolio context injection & Zod schema validation. |
