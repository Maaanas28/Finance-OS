import React from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Badge } from '../ui/Badge.jsx';
import {
  Activity,
  Zap,
  ShieldCheck,
  TrendingDown,
  ShieldAlert,
  Info,
  Layers,
  Scale,
  Percent,
} from 'lucide-react';

export const RISK_DEFINITIONS = {
  volatility: {
    id: 'volatility',
    title: 'Annualized Volatility (σ)',
    subtitle: 'Total Dispersion & Price Swing Severity',
    icon: Activity,
    badgeVariant: 'neutral',
    definition:
      'Annualized Volatility measures the statistical dispersion of portfolio daily returns over a standard 252-trading-session market year. It quantifies how violently the portfolio NAV fluctuates around its mean return.',
    formula: 'σ_annual = σ_daily × √252',
    formulaExplanation:
      'Where σ_daily is the sample standard deviation of trading-day percentage returns: √[ Σ (r_t - r̄)² / (N - 1) ]. Multiplying by √252 converts daily return variance into standard annualized volatility.',
    calculationBreakdown: [
      { step: '1. Daily Return', desc: 'Flow-adjusted daily return r_t = (NAV_t - ExternalFlow_t) / NAV_{t-1} - 1' },
      { step: '2. Sample Std Dev', desc: 'Sample standard deviation using Bessel’s correction (N - 1 in denominator)' },
      { step: '3. Annualization', desc: 'Scaled by the square root of annual trading sessions: √252 ≈ 15.8745' },
    ],
    interpretations: [
      { range: '< 10%', label: 'Low / Defensive', desc: 'Typical of high-cash, sovereign bond, or ultra-conservative allocations.' },
      { range: '10% – 18%', label: 'Moderate / Market-Aligned', desc: 'Consistent with broad equity indices like NIFTY 50 or S&P 500.' },
      { range: '> 22%', label: 'Elevated / Aggressive', desc: 'High cyclicality, concentrated tech/small-cap equity exposures.' },
    ],
    portfolioContext:
      'Cash balances have exactly 0% volatility. A high cash weight directly dampens the portfolio’s aggregate volatility.',
  },
  beta: {
    id: 'beta',
    title: 'Portfolio Beta (β)',
    subtitle: 'Systematic Risk & Market Sensitivity',
    icon: Zap,
    badgeVariant: 'gain',
    definition:
      'Portfolio Beta measures the systematic risk or sensitivity of your portfolio returns relative to movements in the benchmark index (NIFTY 50). It reflects how much the portfolio is expected to move when the market moves.',
    formula: 'β = Covariance(R_portfolio, R_benchmark) / Variance(R_benchmark)',
    formulaExplanation:
      'Calculated strictly across date-synchronized daily returns where both portfolio and benchmark trading sessions match 1:1. Beta cannot be evaluated if benchmark variance is zero.',
    calculationBreakdown: [
      { step: '1. Date Alignment', desc: 'Trading days for portfolio and benchmark are synchronized to identical timestamps' },
      { step: '2. Covariance', desc: 'Sample covariance between portfolio daily returns and benchmark returns' },
      { step: '3. Division by Variance', desc: 'Divided by the variance of benchmark daily returns: Cov(P, B) / Var(B)' },
    ],
    interpretations: [
      { range: 'β = 0.00', label: 'Uncorrelated / Pure Cash', desc: '100% Cash allocation or asset completely decoupled from index fluctuations.' },
      { range: '0.0 < β < 0.8', label: 'Defensive / Low Sensitivity', desc: 'Portfolio will fluctuate significantly less than the benchmark market.' },
      { range: '0.8 ≤ β ≤ 1.2', label: 'Balanced / Market Tracking', desc: 'Portfolio moves in close tandem with broad market swings.' },
      { range: 'β > 1.2', label: 'Aggressive / Amplified', desc: 'Portfolio amplifies market moves (e.g. if index falls 10%, portfolio drops >12%).' },
    ],
    portfolioContext:
      'A portfolio with 88% cash and 12% NIFTY equities naturally exhibits a beta around 0.11 to 0.12 (12% × 1.0), insulating capital from market sell-offs.',
  },
  sharpe: {
    id: 'sharpe',
    title: 'Sharpe Ratio',
    subtitle: 'Total Risk-Adjusted Return vs. Risk-Free Hurdle',
    icon: ShieldCheck,
    badgeVariant: 'gain',
    definition:
      'The Sharpe Ratio measures the excess return earned above the risk-free rate per unit of total risk (volatility). It reveals whether a portfolio’s returns are the result of smart asset selection or excess risk exposure.',
    formula: 'Sharpe = (R_portfolio,annual - R_f) / σ_annual',
    formulaExplanation:
      'Where R_portfolio is the annualized expected return, R_f is the configured 6.5% risk-free rate (RBI 91-Day Treasury Bill benchmark), and σ_annual is annualized volatility.',
    calculationBreakdown: [
      { step: '1. Risk-Free Hurdle', desc: 'Daily compounding of 6.5% annual hurdle: r_f_daily = (1 + 0.065)^(1/252) - 1' },
      { step: '2. Excess Returns', desc: 'Daily portfolio return minus daily risk-free rate: r_excess,t = r_p,t - r_f_daily' },
      { step: '3. Annualized Ratio', desc: '[ Mean(r_excess) / StdDev(r_excess) ] × √252' },
    ],
    interpretations: [
      { range: '< 0.0', label: 'Negative / Underperforming', desc: 'The portfolio generated less return than a risk-free government T-Bill.' },
      { range: '0.0 – 1.0', label: 'Sub-Optimal', desc: 'Excess return is insufficient given the level of volatility taken.' },
      { range: '1.0 – 1.5', label: 'Good / Solid', desc: 'Adequately compensated for market volatility.' },
      { range: '> 1.5', label: 'Excellent / Institutional', desc: 'Superior risk-adjusted performance with low drawdowns.' },
    ],
    portfolioContext:
      'When cash yield is nominal (0%) and portfolio return is below the 6.5% hurdle rate, the excess return is negative, resulting in a negative Sharpe ratio.',
  },
  sortino: {
    id: 'sortino',
    title: 'Sortino Ratio',
    subtitle: 'Downside Risk-Adjusted Return',
    icon: Scale,
    badgeVariant: 'gain',
    definition:
      'The Sortino Ratio is a modification of the Sharpe ratio that penalizes only harmful downside volatility (negative excess returns), without penalizing upward volatility.',
    formula: 'Sortino = (R_portfolio,annual - R_f) / (σ_downside × √252)',
    formulaExplanation:
      'Where σ_downside is the semi-variance root, taking only observations where return falls below the risk-free hurdle (r_t < r_f).',
    calculationBreakdown: [
      { step: '1. Filter Losses', desc: 'Identify sessions where excess return < 0' },
      { step: '2. Downside Deviation', desc: '√[ Σ (min(0, r_t - r_f))² / N ]' },
      { step: '3. Ratio Evaluation', desc: 'Annualized excess return divided by annualized downside deviation' },
    ],
    interpretations: [
      { range: 'Sortino > Sharpe', label: 'Asymmetric Upside', desc: 'Volatility is predominantly driven by profitable rallies rather than drops.' },
      { range: 'Sortino < 0', label: 'Downside Drift', desc: 'Portfolio experiences frequent sessions below the risk-free hurdle.' },
    ],
    portfolioContext:
      'Sortino is the preferred metric for asymmetric strategies (options, long-short) where upside volatility is welcomed.',
  },
  drawdown: {
    id: 'drawdown',
    title: 'Maximum Drawdown (MDD)',
    subtitle: 'Worst Historical Peak-to-Trough Decline',
    icon: TrendingDown,
    badgeVariant: 'loss',
    definition:
      'Maximum Drawdown measures the largest percentage decline from a historical peak valuation to the lowest subsequent trough before a new peak is reached. It quantifies worst-case capital preservation.',
    formula: 'Drawdown_t = (NAV_t - Running_Peak_t) / Running_Peak_t',
    formulaExplanation:
      'Running Peak is the maximum portfolio valuation observed up to date t. Maximum Drawdown is the minimum (most negative) drawdown value across the entire equity curve.',
    calculationBreakdown: [
      { step: '1. Running Peak', desc: 'Track peak_t = max(peak_{t-1}, NAV_t)' },
      { step: '2. Session Drawdown', desc: 'dd_t = (NAV_t - peak_t) / peak_t, bounded in [-100%, 0%]' },
      { step: '3. Max Drawdown', desc: 'Minimum historical drawdown: min(dd_t)' },
    ],
    interpretations: [
      { range: '0% to -5%', label: 'Ultra-Defensive', desc: 'Minimal capital loss, typical of conservative capital preservation.' },
      { range: '-5% to -15%', label: 'Controlled / Moderate', desc: 'Normal healthy drawdown during routine equity corrections.' },
      { range: '> -25%', label: 'Severe / Vulnerable', desc: 'Prolonged underwater recovery period requiring disciplined rebalancing.' },
    ],
    portfolioContext:
      'For long-only portfolios with cash, wealth is non-negative and drawdown can never mathematically exceed -100%.',
  },
  composite: {
    id: 'composite',
    title: 'Composite Risk Score (0–100)',
    subtitle: 'Holistic Multi-Factor Risk Assessment',
    icon: ShieldAlert,
    badgeVariant: 'warn',
    definition:
      'A multi-factor risk index combining volatility, market sensitivity (beta), historical drawdown, and asset concentration into a single unified score from 0 to 100.',
    formula: 'Score = 30%·VolScore + 25%·BetaScore + 25%·DDScore + 20%·ConcScore',
    formulaExplanation:
      'Weights reflect institutional risk factors: 30% Volatility (capped at 30%), 25% Beta (capped at 2.0), 25% Max Drawdown (capped at 25%), and 20% Single-Asset Concentration (capped at 35%).',
    calculationBreakdown: [
      { step: '30% Volatility', desc: 'min(100, (AnnualVol / 30) × 100)' },
      { step: '25% Beta', desc: 'min(100, (Beta / 2.0) × 100)' },
      { step: '25% Drawdown', desc: 'min(100, (|MaxDrawdown| / 25) × 100)' },
      { step: '20% Concentration', desc: 'min(100, (MaxAssetWeight / 0.35) × 100)' },
    ],
    interpretations: [
      { range: '0 – 40', label: 'CONSERVATIVE', desc: 'Capital preservation focus, low market correlation, minimal drawdown risk.' },
      { range: '41 – 65', label: 'MODERATE', desc: 'Balanced growth profile with controlled systematic risk.' },
      { range: '66 – 100', label: 'HIGH RISK', desc: 'Aggressive equity or concentrated exposure sensitive to broad market shocks.' },
    ],
    portfolioContext:
      'Your composite score updates dynamically with live market price movements and portfolio transactions.',
  },
  var: {
    id: 'var',
    title: 'Value at Risk (VaR 95% 1-Day)',
    subtitle: 'Statistical Loss Boundary at 95% Confidence',
    icon: Layers,
    badgeVariant: 'warn',
    definition:
      'Value at Risk (VaR) estimates the maximum dollar (or percentage) loss expected over a 1-day holding period under normal market conditions at a 95% confidence level.',
    formula: 'Parametric VaR = (z_0.95 × σ_daily - μ_daily) × Portfolio Value',
    formulaExplanation:
      'At 95% confidence, z = 1.645. Historical VaR uses the empirical 5th percentile of historical daily returns: -q_0.05 × Portfolio Value.',
    calculationBreakdown: [
      { step: '1. Return Series', desc: 'Historical daily return distribution sorted from worst to best' },
      { step: '2. 5th Percentile', desc: 'Cutoff return below which only 5% of trading sessions fall' },
      { step: '3. Rupee Exposure', desc: 'Percentage loss converted to currency value: -q_0.05 × NAV' },
    ],
    interpretations: [
      { range: '95% Confidence', label: '1 in 20 Sessions', desc: 'On 19 out of 20 trading sessions (95%), daily losses will not exceed this threshold.' },
    ],
    portfolioContext:
      'Provides a regulatory standard risk metric (Basel III / SEBI compliant) for capital adequacy.',
  },
};

export function RiskMetricModal({ isOpen, onClose, metricId, currentValue, currentStatus }) {
  if (!isOpen || !metricId) return null;

  const def = RISK_DEFINITIONS[metricId] || RISK_DEFINITIONS.volatility;
  const Icon = def.icon || Info;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quantitative Risk Metric Explainer" maxWidth="max-w-2xl">
      <div className="space-y-4 font-mono text-xs">
        {/* Header Block */}
        <div className="flex items-start justify-between gap-3 p-3 bg-[#0a101d] border border-[#1b2742] rounded">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#121c33] border border-[#223357] rounded-md text-emerald-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide">{def.title}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{def.subtitle}</p>
            </div>
          </div>
          {currentValue !== undefined && (
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase font-semibold">Your Portfolio</div>
              <div className="text-base font-bold text-white tabular-nums my-0.5">{currentValue}</div>
              {currentStatus && (
                <Badge variant={def.badgeVariant || 'neutral'} size="xs">
                  {currentStatus}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Definition */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" /> What It Measures
          </span>
          <p className="text-slate-300 leading-relaxed bg-[#0a0f18] p-3 rounded border border-[#141d2e]">
            {def.definition}
          </p>
        </div>

        {/* Formula */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-400" /> Mathematical Formula
          </span>
          <div className="bg-[#070b12] p-3 rounded border border-[#152035] space-y-2">
            <div className="font-bold text-emerald-400 text-xs tracking-wider bg-[#0d1627] py-1.5 px-2.5 rounded border border-[#1c2c4d] inline-block">
              {def.formula}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">{def.formulaExplanation}</p>
          </div>
        </div>

        {/* Calculation Steps */}
        {def.calculationBreakdown && (
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Calculation Pipeline
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {def.calculationBreakdown.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-[#0a0f18] border border-[#141f33] rounded">
                  <div className="text-emerald-400 font-semibold text-[10px] mb-1">{item.step}</div>
                  <div className="text-slate-400 text-[10px] leading-tight">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interpretation Table */}
        {def.interpretations && (
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-purple-400" /> How to Interpret This Value
            </span>
            <div className="border border-[#141f33] rounded overflow-hidden">
              {def.interpretations.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start justify-between p-2 text-[11px] ${
                    idx % 2 === 0 ? 'bg-[#090e17]' : 'bg-[#0a111c]'
                  } border-b border-[#141f33] last:border-b-0`}
                >
                  <span className="font-semibold text-emerald-300 w-28 shrink-0">{item.range}</span>
                  <span className="text-slate-200 font-medium w-36 shrink-0">{item.label}</span>
                  <span className="text-slate-400 text-[10px] text-right">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specific Portfolio Context */}
        {def.portfolioContext && (
          <div className="p-2.5 bg-[#0b1322] border border-[#1d2d4d] rounded text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Portfolio Context: </span>
              {def.portfolioContext}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
