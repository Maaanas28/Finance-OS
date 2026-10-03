# Finance OS — Complete Fix Specification (for Antigravity)

You are working in the **Finance OS** repository (`backend/` Node 22 + Express + Prisma + Vitest, `frontend/` React 18 + Vite + Tailwind + TanStack Query). A full audit found real bugs in money handling, risk maths, security and reliability. **Fix everything in this document in one run.** Work autonomously, do not ask questions; where a decision is needed, take the option marked **DECISION** and note it in the final report.

---

## 0. Ground rules

1. Work through the phases in order (P1 → P8). **Run `cd backend && npm test` and `cd frontend && npm run build` at the end of every phase and make a git commit** (`fix(P1): ...`). Never leave a phase with failing tests.
2. **Do not read, print, edit or commit `backend/.env`.** Never paste key values into code, logs, tests or the report. Create `backend/.env.test` (no real keys) for tests. The owner will rotate the keys that are in `.env` manually.
3. Keep the existing API response envelope `{ success, data, meta, timestamp }` and existing route paths unless a task says otherwise.
4. Every behaviour change needs a test. Add tests; don't just edit old ones to pass. When an old test asserted buggy behaviour (client price, anonymous access, seeded demo portfolio), rewrite it to assert the new correct behaviour.
5. Money is in INR with 2-decimals. Round once at the boundary (paise), never accumulate float error across operations.
6. Don't add heavy dependencies. Allowed: `express-rate-limit`, `ioredis` (optional, task 8.5), `eslint`, `msw` or Vitest stubs. Everything else should use what exists.
7. Do not delete files not listed here. Do not reformat unrelated code.
8. Paths below are relative to `backend/src/` for backend and `frontend/src/` for frontend unless stated. Line numbers are approximate (pre-fix).

---

## P1 — Money integrity & authorisation (CRITICAL)

### 1.1 Server must decide the execution price
- **Files:** `modules/portfolio/portfolio.validation.js`, `modules/portfolio/portfolio.service.js` (`executeTransaction`, ~L250–430), `frontend/pages/Portfolio/TradeModal.jsx`.
- **Problem:** `price` is required in the BUY/SELL schema and used as `execPrice` when `> 0`. A client bought 1,000 TCS at ₹0.01 and the portfolio value inflated to ~₹47 lakh.
- **Fix:**
  - Remove `price` from `executeTransactionSchema` (use `.strict()` or `.strip()` so extra keys are ignored; also remove `assetClass`). The `refine` for BUY/SELL requires only `symbol` + `quantity`.
  - In `executeTransaction`, `execPrice = Number(liveQuote.price)` always. Ignore any client price.
  - **Quantity must be a positive integer** for EQUITY (`z.number().int().positive()`); fractional shares rejected with 400.
  - **Fees are server-computed:** add `config.TRADE_FLAT_FEE` (default `20`) and ignore client `fees`. Return the fee in the transaction.
  - Frontend `TradeModal.jsx`: make the price field a **read-only display** of the latest quote, stop sending `price`, `fees`, `assetClass`. Show "Executes at market price".
- **Tests:** BUY with `price: 0.01` executes at quote price; fractional quantity → 400; client `fees: 0` still charges server fee.

### 1.2 Never trade on non-real quotes
- **Files:** `portfolio.service.js` (BUY and SELL), `infrastructure/market/marketDataService.js`.
- **Problem:** In `MARKET_DATA_MODE=auto`, when Yahoo fails the mock provider invents a hash-based price for *any* string (`FAKECOXYZ` is tradeable).
- **Fix:** In BUY and SELL, after `getQuote`, reject with `BadRequestError`/503 (`QUOTE_NOT_TRADEABLE`) when `quote.dataStatus` is `SIMULATED` or `UNAVAILABLE`, **unless `config.MARKET_DATA_MODE === 'mock'`** (explicit dev/test). `STALE` quotes older than 5 min are also rejected for trades. In `MockMarketDataProvider.getQuote`, for symbols not in the quote table or `INDIAN_SECURITY_UNIVERSE`, **throw** `NotFoundError('Unknown symbol')` instead of hashing a fake price.
- **Tests:** unknown symbol cannot be bought in any mode; SIMULATED quote blocks trade in `auto`, allowed in `mock`.

### 1.3 Remove the fake price jitter
- **File:** `infrastructure/market/marketDataService.js` `applyLiveTickJitter` (~L119) and its 3 call sites.
- **Problem:** ±0.08 % synthetic noise is added to **real** Yahoo prices, then used for valuation and trade execution while labelled LIVE/DELAYED.
- **Fix:** Delete `applyLiveTickJitter`. Return real quotes unmodified. (If a "ticking" demo effect is wanted, apply it only inside `MockMarketDataProvider` output and only when `MARKET_DATA_MODE=mock`.)

### 1.4 Registration must not accept a role
- **Files:** `modules/auth/auth.validation.js`, `modules/auth/auth.service.js`.
- **Fix:** Remove `role` from `registerSchema`; `auth.service.register` always creates `role: 'USER'`. Admin/analyst accounts are created only by `prisma/seed.js` or a DB update. Add `requireRole(...roles)` middleware in `middleware/authMiddleware.js` for future use.
- **Tests:** `POST /auth/register` with `role:"ADMIN"` returns a user with `role:"USER"`.

### 1.5 Require authentication for writes, AI, risk, analytics, strategy
- **Files:** all `*.routes.js`, `modules/portfolio/portfolio.controller.js`, `infrastructure/database/portfolioRepository.js`.
- **Problem:** `optionalAuth` lets anonymous callers `POST /portfolio/transactions` (201; junk written to memory under `guest-portfolio`), call the paid AI endpoint, and trigger unlimited provider calls. `portfolio.controller` falls back to `'user-default-analyst'` and `GET /portfolio/list` returns a seeded demo portfolio while every other endpoint returns an empty guest portfolio.
- **Fix:**
  - Use `authMiddleware` (not `optionalAuth`) on: all `/portfolio/*`, `/risk/*`, `/analytics/*`, `/strategy/*`, `/ai/*`. Market (`/market/*`) and news (`/news/*`) stay public but rate-limited (task 2.1).
  - Delete the `req.user?.id || 'user-default-analyst'` fallbacks and every `userId = null` guest path in `portfolio.service.getPortfolio` (remove the `guest-portfolio` object). Services always receive a real `userId`.
  - `portfolioRepository.seedModelPortfolio()` must run only when `process.env.SEED_DEMO_PORTFOLIO === 'true'` (default off, never in production). Update tests that depended on `portfolio-model-alpha` to create their own data through a shared test helper (`tests/helpers/auth.js`: `registerAndLogin()` returning `{token,userId}`).
  - When `portfolioId` is supplied and belongs to another user, **return 404** (not a silent fallback to the caller's own portfolio).
- **Tests:** anonymous write → 401; anonymous AI/risk/analytics/strategy → 401; cross-user `portfolioId` → 404.

### 1.6 Atomic trades (no half-applied state, no double-spend)
- **Files:** `infrastructure/database/portfolioRepository.js`, `portfolio.service.js`.
- **Problem:** upsert holding → update cash → record transaction are three separate writes; cash is read-modify-write from a stale value.
- **Fix:** Add `portfolioRepository.applyTrade(portfolioId, trade)`:
  - **Postgres:** `prisma.$transaction(async (tx) => {...})`. Inside: lock/check cash with a conditional update (`tx.portfolio.updateMany({ where:{ id, cashBalance:{ gte: cost } }, data:{ cashBalance:{ decrement: cost } } })`; if `count === 0` → throw insufficient funds), then upsert/delete the holding, then create the transaction (including `realizedPnl`, task 3.8). For SELL verify quantity inside the transaction too.
  - **Memory mode:** a per-portfolio async mutex (simple promise chain keyed by portfolioId) wrapping the same logic.
  - `executeTransaction` computes the trade, then calls `applyTrade` once. Same for DEPOSIT/WITHDRAWAL (`increment`/conditional `decrement`).
  - Use `Prisma.Decimal` or integer paise for money in the DB path.
- **Tests:** fire 10 parallel BUYs that together exceed cash → total spent ≤ cash and no negative balance; failure mid-trade leaves holdings/cash/ledger unchanged.

### 1.7 Persistence must not silently flip to memory
- **Files:** `userRepository.js`, `portfolioRepository.js`, `riskRepository.js` (all contain `useMemoryFallback = true` in `catch`).
- **Problem:** *Any* error (including a duplicate-email unique violation) permanently switches the process to in-memory storage; data then vanishes on restart and a trade can be split between Postgres and memory.
- **Fix:** Create `infrastructure/database/resilience.js`:
  - `isConnectivityError(err)` → true only for Prisma `P1000/P1001/P1002/P1008/P1017` and `PrismaClientInitializationError`.
  - Fallback to memory **only if** `NODE_ENV !== 'production'` **and** `ALLOW_MEMORY_FALLBACK=true`, **and** the error is a connectivity error. Otherwise rethrow (map to 503 `DATABASE_UNAVAILABLE`). Domain errors (P2002 unique, validation) must propagate normally (e.g. duplicate email → 409).
  - Use a circuit breaker: after fallback, re-probe the DB every 30 s and switch back; log loudly each transition.
  - `/health` must report the true state: `database: CONNECTED | DEGRADED_MEMORY | DOWN`, and `cache` from the real driver (it is hard-coded `MEMORY_DRIVER_ACTIVE` today).
- **Tests:** unique-violation does not enable fallback; production env never falls back.

### 1.8 Do not truncate the ledger
- **File:** `portfolioRepository.js` (`getPortfolioById` takes 50 transactions, `getPortfoliosByUser` takes 100).
- **Problem:** `risk.service.getSynchronizedReturns` rebuilds NAV from `getTransactions()`; with >50/100 transactions the reconstruction is wrong and the UI ledger is silently truncated.
- **Fix:** Add `getAllTransactions(portfolioId)` (no `take`) for risk/analytics. The portfolio list/detail endpoints return the latest 50 plus `meta.totalTransactions`; `/portfolio/transactions` supports `?limit=&cursor=`.

---

## P2 — Security hardening

### 2.1 Rate limiting
- Add `express-rate-limit` in `app.js`: global 300 req / 15 min / IP; `/api/v1/auth/*` 10 req / 15 min per IP (+ per email on login); `/api/v1/ai/*` 20 req / hour / user; market & news 120 req / min / IP. Standard 429 envelope. Set `app.set('trust proxy', 1)` when `TRUST_PROXY=true`.
- **Test:** 11th rapid login → 429.

### 2.2 JWT & secrets
- **Files:** `config/index.js`, `modules/auth/auth.service.js`, `middleware/authMiddleware.js`, `.env.example`.
- Remove the hard-coded `JWT_SECRET` default. Dev: if unset, generate a random per-process secret and warn. **Production: refuse to start** unless `JWT_SECRET` ≥ 32 chars and not equal to any value containing `super-secret`, `change-this` or `finance-os-dev`.
- Pin algorithms: `jwt.sign(..., { algorithm:'HS256' })`, `jwt.verify(..., { algorithms:['HS256'] })`.
- Default `JWT_EXPIRES_IN` → `1d`. Add `tokenVersion Int @default(0)` to `User` (task 8.2) embedded in the token and checked in `authMiddleware`; `POST /auth/logout` increments it (real server-side logout).
- Login: always run a bcrypt compare (against a dummy hash when the user is missing) so response time doesn't reveal account existence. bcrypt rounds → 12. `password` max length 72.
- `.env.example`: placeholder comments only; document how to generate a secret (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

### 2.3 CORS
- **File:** `app.js`. Every branch currently returns `callback(null,true)`. Implement: allow if origin missing (curl/server-to-server) or in `CORS_ORIGIN` list; in non-production additionally allow `http://localhost:*` / `127.0.0.1:*`; otherwise `callback(null,false)`.

### 2.4 AI endpoint trust & input
- **Files:** `modules/ai/ai.controller.js`, `infrastructure/providers/AIProvider.js`.
- `processQuery` spreads `...context` from the request body **after** `valuation`/`riskMetrics`, so a client can inject a fake portfolio into the prompt. **Remove the spread.** Accept only `prompt` (string, 1–2000 chars, trimmed). Valuation and risk always come from the server.
- Replace raw `fetch` with `secureFetch` (timeout 15 s). Do not return upstream error bodies to the client (`errorBody.substring(0,150)` is leaked); return a generic "AI service unavailable" and log details server-side.
- Rename for accuracy: the code calls **Groq** (`api.groq.com`), not xAI Grok. Accept `AI_PROVIDER` ∈ `mock|groq|openai|gemini` and keep `grok` as a deprecated alias. Make model configurable (`AI_MODEL`, default current value). Remove `XAI_API_KEY` from `config` and `.env.example`. Provider/label strings in responses → `Groq`. `MockAIProvider` responses must say `Simulated` (not claim provider "Grok" with 0.93 confidence); use `provider: 'Simulated'`, `confidence: null`.
- Fix the data contract: `ai.controller` must call `riskService.getRiskMetrics(...)` (task 3.9) and build one `riskContext` object `{beta, sharpe, sortino, annualizedVolatility, maxDrawdown, compositeScore, riskLevel, var95Daily (formatted ₹), cvar95Daily}` that both providers read (they currently read non-existent fields like `riskMetrics.var95Daily`).
- Stock-intent detection in `MockAIProvider` uses `includes('sbi')` etc.; use word boundaries.

### 2.5 Misc hardening
- `prisma.js`: remove the unused `query` log event (overhead) and call `prisma.$disconnect()` in `server.js` graceful shutdown. Add `process.on('unhandledRejection'|'uncaughtException')` logging + exit.
- `/api/v1/health` in production returns only `{status,uptime}` (no provider names/env).
- `stressTest.service.executeStressTest`: a user-owned scenario (`userId` set) may only be used by its owner; `riskRepository.getScenarioById(id, userId)` enforces it.
- Frontend `Login.jsx`: the "demo login" button (`rahul@financeos.demo / Demo@123`) renders only when `import.meta.env.DEV`. `prisma/seed.js` must refuse to run when `NODE_ENV==='production'` unless `ALLOW_DESTRUCTIVE_SEED=true`, and must not set the shared password for ADMIN in any non-dev env.
- **DECISION (optional, do if time):** move the JWT from `localStorage` to an `httpOnly; SameSite=Lax; Secure` cookie with CSRF token. If skipped, leave a `// SECURITY` note in `AuthContext.jsx`.

---

## P3 — Quantitative correctness

### 3.1 Daily vs weekly candles (volatility/Sharpe/VaR/backtests scaled wrongly)
- **Files:** `infrastructure/providers/YahooFinanceProvider.js` (`getHistoricalPrices`, `rangeMap`), `TwelveDataProvider.js`, `MockMarketDataProvider.js`, `marketDataService.js`, `risk.service.js`, `strategy.service.js`.
- **Problem:** `1Y` maps to `interval:'1wk'` and the provider ignores the `interval:'1day'` that risk/strategy pass. All annualisation uses √252 on **weekly** returns (vol overstated ≈ ×2.2; Sharpe/Sortino/VaR/CVaR/Monte-Carlo inputs wrong; EMA 20/50 and RSI 14 run on weeks).
- **Fix:**
  - Provider honours `options.interval` (accept `1d|1day`, `1wk|1week`, `1mo|1month`, `5m`, `15m`) and overrides the range default when given. Add ranges `3m`, `6m`, `5y`. Unknown timeframe → 400, not silent fallback to 1M.
  - Risk (`getSynchronizedReturns`) and Strategy request `interval:'1day'` explicitly with a **1-year (252 session) daily** range; Strategy allows `1Y|3Y|5Y`.
  - Chart UI keeps its current defaults (no interval → weekly for 1Y is fine).
  - Mock provider: for `1Y` + daily interval return 252 business-day candles (skip weekends), not 52.
  - Add `periodsPerYear` derived from the actual candle spacing in `getSynchronizedReturns` and use it instead of the literal `252` in risk, Monte Carlo and analytics (so a weekly feed is still correct).
- **Tests:** a synthetic daily series with known σ gives annualised vol = σ·√252; weekly series gives σ·√52.

### 3.2 Beta is forced to 0 (series length mismatch)
- **File:** `modules/risk/risk.service.js` (~L307–310), `riskMath.js`.
- **Problem:** portfolio returns start at the first transaction; benchmark returns span the whole window; `RiskMath.covariance` returns 0 when lengths differ → beta = 0 for essentially every real portfolio.
- **Fix:** Add `RiskMath.alignByDate(seriesA, seriesB)` (inner join on date). In `getRiskMetrics` compute beta, benchmark vol, alpha and correlation on the **date-aligned** pair. Make `covariance`/`correlation` **throw** (or log+NaN) on length mismatch instead of silently returning 0. `getSynchronizedReturns` must return `benchReturnsAligned` with dates.
- **Tests:** portfolio of 20 days vs benchmark of 252 days → beta equals the beta computed on the overlapping 20; a portfolio that equals the benchmark → beta ≈ 1.

### 3.3 Composite risk score counts CASH as concentration
- `risk.service.js` ~L378: `Math.max(...Object.values(weights), 0)` includes `weights.CASH`, so a 100 % cash portfolio scores maximum concentration. Use only equity weights.

### 3.4 Synthetic random returns presented as real risk
- `generateSyntheticReturnSeries` fabricates seeded random returns when benchmark history fails. **Only allow it when `MARKET_DATA_MODE==='mock'`.** Otherwise return `insufficientHistory:true` with `dataStatus:'UNAVAILABLE'` and let the UI show an unavailable state.

### 3.5 Annualised return, alpha, Treynor, Calmar done properly
- **Files:** `risk.service.js` (add), `modules/analytics/analytics.service.js`.
- Currently these are back-solved from Sharpe (`ret = sharpe*vol + rf`) and use a hard-coded 12 % market return. Replace with:
  - `annualizedReturn = (Π(1+r_t))^(periodsPerYear/n) − 1` from flow-adjusted portfolio returns; same for the benchmark → `benchmarkAnnualizedReturn`. Expose both in `getRiskMetrics().summary`.
  - Jensen's alpha = `Rp − (rf + β·(Rm − rf))`; Treynor = `(Rp − rf)/β` (β>0); Calmar = `Rp / |maxDD|`.
  - If fewer than 30 observations, return `null` + `insufficientHistory` (UI shows "—"), not misleading numbers.
- Make the risk-free rate one source of truth: `config.RISK_FREE_RATE` (default `0.065`) used by risk, analytics, strategy engine and AI. Label consistently in UI/docs (pick **"RBI 91-day T-Bill"** and fix `SettingsPage.jsx` which says 10-year G-Sec).

### 3.6 Monte Carlo `targetReturn: 0` is replaced by 12 %
- `monteCarlo.service.js` L25 `Number(targetReturn) || 0.12` → `Number.isFinite(Number(targetReturn)) ? Number(targetReturn) : 0.12` (same for `numPaths`, `horizon`). Use the corrected daily series from 3.1/3.2.

### 3.7 Backtester date bug (all dates `undefined`, CAGR NaN)
- **Files:** `modules/strategy/strategy.service.js`, `strategyEngine.js`.
- Providers emit `timestamp` (and sometimes `time`), the engine reads `.date`. In `runBacktest` of the service, **normalise candles** once: `{ date: (c.date||c.time||c.timestamp).slice(0,10), open, high, low, close, volume }`, sorted ascending and de-duplicated by date; drop candles with non-finite OHLC. In the engine, throw `BadRequestError` if dates are invalid; guard every output with `Number.isFinite` (CAGR, Sharpe, profit factor → `null` not `NaN`). Use sample (n−1) variance for Sharpe. Warm-up: RSI/EMA need `period+1` candles; reject if candles < `max(slow, signal)+20`.
- Replace the call to non-existent `portfolioService.getSummary(null, userId)` with `(await portfolioService.getValuation(null, userId, {includeRisk:false})).summary` for the default capital.
- Validate every numeric param with Zod (new `strategy.validation.js`): `slippagePercent`, `commissionPercent` (0–5), capital, periods, `fastEma < slowEma`, `oversold < overbought`.
- Move run history out of the in-memory `Map` into the DB (task 8.2 `StrategyRun` model) or, at minimum, cap size and document that it is ephemeral.
- **Tests:** equity curve dates are `YYYY-MM-DD`; `cagrPercent` finite; invalid params → 400.

### 3.8 Analytics reads fields that don't exist
- **Files:** `portfolio.service.js` (`getValuation`), `analytics.service.js`, `prisma/schema.prisma`.
- Today: `investedCapital`, `unrealizedPnL`, `realizedPnL`, `totalPnL`, `tx.realizedPnl`, `valuation.transactions`, `h.unrealizedPnL` are all undefined → zeros everywhere (win rate, profit factor, P&L, attribution).
- **Fix:**
  - Add `realizedPnl Decimal? @db.Decimal(18,4)` to `Transaction`; set it on SELL in `applyTrade` (`netProceeds − qty·avgCost`).
  - `getValuation` summary adds canonical fields: `investedAmount`, `unrealizedPnl`, `unrealizedPnlPercent`, `realizedPnl` (sum of SELL `realizedPnl`), `totalPnl`. Each holding adds `unrealizedPnl` (alias of `totalPnl`) and `unrealizedPnlPercent`.
  - `analytics.service.getAnalyticsSummary` reads those names and fetches transactions via `getAllTransactions`; win rate / profit factor from SELL `realizedPnl`. If no losses and gains>0 return `profitFactor: null` (not the gain amount).
  - `attribution`: contribution = `h.unrealizedPnl / Σ|unrealizedPnl|`; handle zero total without the `|| 1` hack.
  - Remove the hard-coded `alpha: '0.0%'` from `getValuation`; return numeric `alpha` only from analytics (3.5) and update `Dashboard.jsx`.
- **Tests:** after BUY then partial SELL, analytics shows correct realized P&L, win rate and non-zero unrealised P&L.

### 3.9 Non-existent method calls swallowed by try/catch
- `ai.controller.js` calls `riskService.getSnapshot` (does not exist) in three handlers inside empty `catch (e) {}`. Replace with `getRiskMetrics`. **No empty catch blocks anywhere in backend**: catch → `logger.warn` with context, and degrade explicitly.

### 3.10 Performance curve is fabricated
- `portfolio.service.getPerformanceHistory` linearly interpolates between invested amount and today's value. Replace with the real reconstructed `navSeries` from `riskService.getSynchronizedReturns`; return `performance: []` when history is insufficient.
- `analytics.getPerformanceSeries`: build NAV from `navSeries`; cumulative return must be **compounded** (`Π(1+r)−1`), not summed; benchmark likewise; honour `timeframe` (`1M|3M|6M|1Y|ALL`) by slicing; the "no holdings" branch returns `[]` rather than a flat line of invented dates.

### 3.11 Stress-test sector matching
- `stressTest.service.js` uses ad-hoc `sector.includes('tech')` hacks, and holdings get sectors from a 10-ticker hard-coded list so almost everything is "Other".
- **Fix:** create `infrastructure/market/sectorTaxonomy.js` with a canonical sector list and an alias map (`Financials`/`Financial Services`/`Banking` → `Financial Services`; `Technology`/`IT`/`Information Technology` → `Information Technology`; `Automotive`/`Automobile`/`Auto` → `Automobile`; etc.). First list the distinct sectors in `securityUniverse.js` and map each. Export `canonicalSector(raw)` and `getSecurityMeta(symbol)`. `portfolio.service` assigns `sector` from `getSecurityMeta` (fallback `Unclassified`); stress test and allocations compare canonical names only. Remove the `if (['RELIANCE']...) sector=` block.
- Document the 40 % market spill-over constant as `STRESS_MARKET_SPILLOVER` in config.

---

## P4 — Market data layer

### 4.1 Symbol normaliser misclassification
- **File:** `infrastructure/market/symbolNormalizer.js`. Verified: `SOLARINDS`→crypto `SOL/ARINDS`; `ETHERNET`→crypto; `DMART`, `ZOMATO`→US/USD.
- **Fix:** Resolve in this order: explicit exchange/suffix → universe lookup (`securityUniverse` incl. exchange/currency/sector) → exact index maps → crypto **only** if it matches `^(BTC|ETH|SOL|BNB|XRP|DOGE|ADA)[-/]?(USD|USDT|INR)$` → forex **only** if both halves are ISO currency codes (`^[A-Z]{3}[/-]?[A-Z]{3}$` and in a currency set) → unknown bare ticker: try NSE first via the Yahoo resolver, else US. Remove `startsWith('BTC'...)` and `endsWith('/USD')` shortcuts. Verify the `TATAMOTORS → TMPV.NS` mapping against Yahoo before keeping it (**DECISION:** if Yahoo still serves `TATAMOTORS.NS`, drop the special case).
- **Tests:** table-driven: `SOLARINDS`, `ETHERNET`, `DMART`, `ZOMATO`, `RELIANCE.NS`, `BTC-USD`, `USDINR`, `AAPL`, `NIFTY 50`.

### 4.2 Market hours
- `marketDataService.getMarketStatus` uses fixed UTC−5 for US (wrong during DST, which is in force now) and has no holiday calendar. Use `Intl.DateTimeFormat` with `America/New_York` and `Asia/Kolkata` for local time/weekday; NSE sessions: pre-open 09:00–09:15, regular 09:15–15:30, else closed; add `config/holidays.js` with exchange holiday lists per year. **Populate holidays from the official NSE/NYSE calendars; do not guess dates** — if you cannot verify, leave the array empty with a clear `// TODO(owner): fill from NSE circular` and expose `holidayCalendarLoaded:false` in the response.

### 4.3 Provider accounting, caches and memory
- `dailyUsage.yahoo` is never incremented; yahoo-finance2 errors don't set `isRateLimit` → detect `/429|Too Many Requests/i` in message and cool off.
- `staleStorage` (Map) and `InMemoryCacheService` grow without bound (expired keys only removed on read). Add a max-size LRU (e.g. 2,000 keys) and a 60 s sweep timer (`unref()`).
- `persistHistoricalData` labels `source` as `normalized.targetProvider` (always `yahoo`) and `dataStatus:'EOD'`; use the real `history.dataSource` and `HISTORICAL`.
- `searchSymbols` only queries BharatStock/mock; add the local `searchSecurityUniverse` first, then providers.
- Make `TwelveDataProvider` and `BharatStockProvider` failures non-fatal and keep the Yahoo→BharatStock→TwelveData→(mock only if `auto`) order consistent in code, UI text and docs.

### 4.4 Cost of one summary call
- `portfolio.getValuation` (default `includeRisk:true`) calls `riskService.getRiskMetrics` which calls `getValuation` again plus history for every holding — every 3 s poll. Fix: `/portfolio/summary` returns valuation **without** risk by default (`?includeRisk=true` opt-in); `riskService.getRiskMetrics` result is cached 60 s in `cacheService` keyed `risk:${portfolioId}:${txCount}:${rf}`; remove the dynamic `import('../risk/risk.service.js')` circular workaround by moving enrichment into the controller.

---

## P5 — News & sentiment

### 5.1 Word-boundary matching
- **Files:** `infrastructure/news/portfolioTickerLinker.js`, `sentimentAnalyzer.js`.
- Verified false positives: "April" → RELIANCE (`ril`), "switch" → ITC, "result"/"Monsoon" → LT, "Hull" → HINDUNILVR. Fix:
  - Precompile one regex per alias at module load, using `(?<![A-Za-z0-9])alias(?![A-Za-z0-9])`.
  - Aliases of ≤ 4 characters (`ril`, `lt`, `itc`, `hul`, `sbi`, `fss`, `jsw`, `tcs`, `ioc`, `msil`, `jio`) must match **case-sensitively in uppercase** against the original text; remove ambiguous aliases (`fss`, `lt`, `hdfc` → keep only `hdfc bank`/`hdfcbank`, `bharti` alone, `jaguar`, `land rover`, `mukesh ambani` as sole ticker evidence).
  - Sentiment: precompile term regexes once (currently ~200 `new RegExp` per article), use boundaries; HIGH_IMPACT terms like `fed`, `gdp`, `rbi`, `ipo` need boundaries (`fed` currently matches "federal", "FedEx", "fed up"). Add simple negation handling (`no|not|without|fails to` within 3 words before a term flips its polarity) and make "dividend", "investment", "challenges", "pressure" weak terms (weight 1, title ×2).
- **Tests:** the four false-positive strings return `[]`; "Reliance Industries Q2 profit" → `['RELIANCE']`.

### 5.2 RSS robustness
- `rssParser.js`: decode numeric entities (`&#8217;`, `&#x2019;`) and `&apos;`; strip `<![CDATA[]]>` in `link` too. `newsService`: when `NEWS_PROVIDER=mock` or fallback to mock, set `dataSource:'MOCK'` and make the UI show a visible "Sample data" badge (mock articles point at `https://example.com/...` — never render them as real links; mark `isSample:true`). Cache RSS fetches (`fetchAllFeeds`) for 5 min so category/ticker/sentiment calls don't each refetch all 7 feeds.

---

## P6 — Frontend

### 6.1 Honest error / empty / loading states
- Replace the **15 empty `catch` blocks** (`Dashboard.jsx`, `PortfolioDesk.jsx`, etc.) so failures show state, not a ₹0 portfolio. Use the **already-existing but unused** `ErrorState`, `EmptyState`, `Skeleton`, `Toast` components (wire a `ToastProvider` in `App.jsx`). Dashboard must distinguish "loading", "error (retry button)", and "empty portfolio".
- Show the `DataStatusBadge` everywhere prices appear and make sure it handles `SIMULATED`, `STALE`, `UNAVAILABLE`, `HISTORICAL` (verify the component; add missing variants). Persistent banner when any visible data is `SIMULATED`.

### 6.2 API client
- `services/api.js`: (a) global 401 handling — on `401` from any authenticated call, clear the token and emit a `finance-os:unauthorized` event; `AuthContext` listens, logs out and routes to `/login` with a toast "Session expired". (b) `createPortfolio` calls `/portfolio/create` which **404s**; the backend route is `POST /portfolio` — fix client (and backend gets validation: unique name per user). (c) `API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'`; add `frontend/.env.example`. (d) Add `AbortController` support and a 15 s timeout.

### 6.3 Polling
- Replace 3 s intervals in `Dashboard.jsx`, `PortfolioDesk.jsx`, `MarketsPage.jsx`, `StockDetailPage.jsx`, `MarketOverviewGrid.jsx`, `MarketStatusBar.jsx` with TanStack Query: quotes 15 s, portfolio/summary 30 s, risk/analytics on demand (60 s max), news 5 min; `refetchIntervalInBackground:false` so hidden tabs stop polling. Migrate `Dashboard`/`PortfolioDesk` from manual `setInterval` to `useQuery`.

### 6.4 Dead / fake UI
- `Dashboard.jsx` "Export Telemetry": implement CSV export of summary + holdings (client-side Blob) or remove the button.
- `SettingsPage.jsx` fakes a save. **DECISION:** make it real and minimal — persist `riskFreeRate` and display currency per user (`UserSettings` model, `GET/PUT /api/v1/settings`, zod-validated 0–30 %) and use `riskFreeRate` as the default for `/risk/metrics` and analytics; replace the provider-mode/news-mode dropdowns (server-side env, not user-changeable) with read-only status pulled from `/market/health` and `/news/health`; fix the stale provider-order text; remove the "₹0 BUDGET COMPLIANCE VERIFIED" claim.
- `Login.jsx` demo button → DEV only (2.5).
- `StockDetailPage.jsx`: timeframe buttons must map to supported backend ranges (`1D,1W,1M,3M,6M,1Y`).
- `TradeModal.jsx`: show server-confirmed execution details from the response (price, fee, resulting cash), not client-computed totals; block submit while quote is `SIMULATED/STALE`.

### 6.5 Assets & hygiene
- `index.html` references missing `/vite.svg`: add `frontend/public/favicon.svg` (or use the logo) and update the tag.
- `src/assets/logo.png` is actually JPEG data (547 KB) and `logo.jpg` is an unused duplicate. Export a proper optimised PNG/WebP (< 80 KB, plus a 64 px favicon), update imports, delete `logo.jpg`.
- Delete unused: `src/mock/marketData.js`, `portfolioData.js`, `riskData.js`, `pages/Placeholders/*`, `components/ui/Dropdown.jsx`, `DataTable.jsx` (**keep** `Toast`, `Skeleton`, `EmptyState`, `ErrorState` — they are used after 6.1). Re-run the unused-file scan after your changes and remove anything still orphaned.
- Deduplicate `frontend/src/data/securityUniverse.js` and `backend/.../securityUniverse.js`: backend is the source of truth; add `GET /api/v1/market/universe` (cached) and load it on the client, or generate the frontend file from the backend in a script (`npm run gen:universe`).
- Replace the 4 `console.log/error` calls with a tiny `lib/logger.js` that is silent in production.
- Add `<noscript>` and an `ErrorBoundary` around `AppRoutes`.

---

## P7 — Tests, tooling, CI

### 7.1 Hermetic tests
- Today the suite calls live Yahoo and BharatStock (real keys from `.env`, BharatStock returns 403). Fix:
  - `config/index.js`: `dotenv.config({ path: process.env.NODE_ENV==='test' ? '.env.test' : '.env' })`.
  - Create `backend/.env.test` with `MARKET_DATA_MODE=mock`, `NEWS_PROVIDER=mock`, `AI_PROVIDER=mock`, empty provider keys, a test `JWT_SECRET`, `ALLOW_MEMORY_FALLBACK=true`, `SEED_DEMO_PORTFOLIO=false`. Commit it (no secrets). Whitelist it in `.gitignore` (`!.env.test`).
  - Add `backend/vitest.config.js` with `setupFiles: ['tests/setup.js']`; `tests/setup.js` stubs global `fetch` to **throw** on any unmocked network call and sets `process.env.NODE_ENV='test'`. Tests that need providers use `vi.spyOn`/`msw`.
  - Remove the `process.env.NODE_ENV === 'test' && this.bharatStock.getTopMovers._isMockFunction` test-only branch from production code (`marketDataService.getTopMovers`); inject providers via the constructor instead.
- `npm test` must pass **offline**.

### 7.2 New tests required (minimum)
Authorization (1.4, 1.5, cross-user 404), trade execution (1.1, 1.2, 1.6 concurrency, SELL realised P&L), risk (3.2 aligned beta, 3.3 cash concentration, 3.1 annualisation factor), Monte Carlo (3.6 `targetReturn:0`), backtester (3.7 dates/CAGR/validation), analytics (3.8), symbol normaliser table (4.1), news false-positives (5.1), rate limiting (2.1), CORS (2.3), JWT (2.2 algorithm pin, expired, tokenVersion after logout), AI controller ignores client `context` (2.4), market-hours with DST (4.2), persistence resilience (1.7).
- Update the 7 `backend/scratch/verify_*_e2e.js` scripts to the new behaviour or delete them (they're git-ignored); don't leave them broken.

### 7.3 Tooling
- `engines: { node: ">=20" }` in both `package.json`s; add ESLint (flat config) + `npm run lint` in both packages (fix new warnings introduced, don't mass-reformat); add `.github/workflows/ci.yml`: install → backend `npm test` → frontend `npm run build` → `npm run lint`.
- Optional: `Dockerfile` (backend), `docker-compose.yml` (postgres + backend + frontend static), `.dockerignore`.

---

## P8 — Database & ops

### 8.1 Migrations
- There is no `prisma/migrations/`. Generate an initial migration reflecting the final schema (`prisma migrate dev --name init`), commit it, and change README/scripts: dev → `migrate dev`, production → `migrate deploy`. Add indexes: `Transaction @@index([portfolioId, executedAt])`, `Portfolio @@index([userId])`, `PortfolioHolding @@index([portfolioId])`.

### 8.2 Schema changes (all in one migration)
`Transaction.realizedPnl Decimal?` (3.8), `User.tokenVersion Int @default(0)` (2.2), `UserSettings { userId @unique, riskFreeRate Decimal(5,4) default 0.065, currency }` (6.4), `StrategyRun { id, userId, strategyId, symbol, params Json, summary Json, createdAt }` (3.7). Remove the commented-out Watchlist/Alert/AIConversation lines from `User` or implement none. `StressScenario` stays.

### 8.3 Seed
- `prisma/seed.js`: production guard (2.5), idempotent upserts instead of `deleteMany()` on every table, passwords from `SEED_PASSWORD` env (default only when `NODE_ENV=development`).

### 8.4 Config
- Add to `config/index.js` and `.env.example` (documented): `RISK_FREE_RATE`, `TRADE_FLAT_FEE`, `ALLOW_MEMORY_FALLBACK`, `SEED_DEMO_PORTFOLIO`, `TRUST_PROXY`, `AI_MODEL`, `STRESS_MARKET_SPILLOVER`, `LOG_LEVEL`. Remove `MARKET_DATA_PROVIDER`/`MARKET_DATA_API_KEY` if unused after refactor (they are parsed but not read for routing) — or make them actually drive the primary provider.

### 8.5 Redis
- `REDIS_URL` exists in env/README/health but the cache is in-memory only. **DECISION:** implement `RedisCacheService` with `ioredis` selected when `REDIS_URL` is reachable (fallback to in-memory with a warning); report the real driver in `/health`. If skipped, remove Redis from README, `.env.example`, config and health text.

### 8.6 Documentation (`README.md` + `docs/*.md`, `docs/` is git-ignored but ship the fixes)
- Correct false statements: "server-side price re-verification" and "atomic" updates (now true after P1), "148 tests" (update to real count), "zero demo data" (true only after 1.5), Grok→Groq, provider order, risk-free-rate source, "Redis". Add a **Known limitations** section: Yahoo unofficial API, delayed quotes, no tax/lot accounting, virtual trading only, rule-based sentiment, Gaussian VaR/GBM assumptions. Add "Security model" and "Environment variables" tables.

---

## Final verification checklist (run all, report results)

```bash
cd backend && npm ci && npx prisma validate && npm test          # offline, all green
cd ../frontend && npm ci && npm run build && npm run lint
```

Then start the API (`MARKET_DATA_MODE=mock`) and prove with a script (put it in `backend/tests/e2e/smoke.test.js`):
1. Register with `role:"ADMIN"` → role is `USER`.
2. Anonymous `POST /portfolio/transactions` → 401. 11th login attempt in a minute → 429.
3. DEPOSIT 500000; BUY TCS ×5 sending `price:0.01` → executed at quote; `fees` = server fee.
4. 10 concurrent BUYs exceeding cash → cash never negative.
5. SELL → transaction has `realizedPnl`; `/analytics/summary` shows non-zero win rate / P&L.
6. Portfolio younger than the benchmark window → `/risk/metrics` beta ≠ 0 and equals the aligned computation.
7. `/strategy/backtest` → equity-curve dates are ISO strings and `cagrPercent` is a finite number.
8. `/ai/query` with a forged `context.valuation` → response ignores it.
9. `/portfolio/summary` response time with 5 holdings < 300 ms in mock mode (no risk recompute).

## Final report format

Produce `FIX_REPORT.md` in the repo root: per task ID (1.1 … 8.6) → **Done / Partially / Skipped**, files changed, tests added, and every **DECISION** you took with a one-line reason. List anything you could not verify (e.g. live Yahoo behaviour, NSE holiday dates, Postgres path if no DB available) and what the owner must do manually: **rotate all API keys that were ever in `backend/.env`**, set a strong production `JWT_SECRET`, run `prisma migrate deploy`, and review `config/holidays.js`.
