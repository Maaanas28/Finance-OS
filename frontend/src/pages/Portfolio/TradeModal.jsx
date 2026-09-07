import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { api } from '../../services/api.js';
import { searchFrontendSecurities } from '../../data/securityUniverse.js';
import { Search, AlertCircle, ArrowUpRight, ArrowDownRight, Wallet, CheckCircle2 } from 'lucide-react';

export function TradeModal({
  isOpen,
  onClose,
  portfolioId,
  currentCash = 0,
  holdings = [],
  onTradeSuccess,
  prefilledSymbol = '',
  prefilledType = 'BUY',
}) {
  const [tradeType, setTradeType] = useState(prefilledType);
  const [symbol, setSymbol] = useState(prefilledSymbol);
  const [exchange, setExchange] = useState('NSE');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(0);
  const [amount, setAmount] = useState(10000);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [quoteInfo, setQuoteInfo] = useState(null);

  // Sync props when modal opens or prefilled symbol changes
  useEffect(() => {
    if (isOpen) {
      setTradeType(prefilledType || 'BUY');
      setSymbol(prefilledSymbol || '');
      setError(null);
      if (prefilledSymbol) {
        fetchQuoteForSymbol(prefilledSymbol);
      }
    }
  }, [isOpen, prefilledSymbol, prefilledType]);

  // Fetch real/simulated quote when symbol is picked
  async function fetchQuoteForSymbol(sym) {
    if (!sym) return;
    setFetchingQuote(true);
    setError(null);
    try {
      const res = await api.getQuote(sym, exchange);
      if (res?.data) {
        setQuoteInfo(res.data);
        setPrice(Number(res.data.price || res.data.ltp || 0));
      }
    } catch (err) {
      // If quote fails, fallback to holding avg price if owned
      const owned = holdings.find((h) => h.symbol.toUpperCase() === sym.toUpperCase());
      if (owned) {
        setPrice(Number(owned.ltp || owned.averageBuyPrice));
      }
    } finally {
      setFetchingQuote(false);
    }
  }

  // Symbol Autocomplete search (Instant local + API fallback)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    // Instant local lookup from 100+ Indian security master
    const localMatches = searchFrontendSecurities(searchQuery, 15);
    setSearchResults(localMatches);

    // Supplementary API search query
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchSymbols(searchQuery);
        if (res?.data && res.data.length > 0) {
          // Merge API results with local results, deduplicating by symbol
          const existing = new Set(localMatches.map((m) => m.symbol.toUpperCase()));
          const extra = res.data.filter((item) => !existing.has(item.symbol.toUpperCase()));
          setSearchResults([...localMatches, ...extra]);
        }
      } catch {
        // Keep local matches if API fails
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectSymbol = (s) => {
    setSymbol(s.symbol);
    setExchange(s.exchange || 'NSE');
    setSearchQuery('');
    setSearchResults([]);
    fetchQuoteForSymbol(s.symbol);
  };

  // Find position for current symbol
  const activePosition = holdings.find(
    (h) => h.symbol.toUpperCase() === symbol.toUpperCase()
  );
  const ownedShares = activePosition ? Number(activePosition.quantity) : 0;

  // Financial calculations
  const totalBuyCost = Math.round((Number(quantity) * Number(price) + 20) * 100) / 100;
  const totalSellProceeds = Math.round((Number(quantity) * Number(price) - 20) * 100) / 100;
  const estimatedCashAfter =
    tradeType === 'BUY'
      ? currentCash - totalBuyCost
      : tradeType === 'SELL'
      ? currentCash + totalSellProceeds
      : tradeType === 'DEPOSIT'
      ? currentCash + Number(amount)
      : currentCash - Number(amount);

  // Validations
  let validationError = null;
  if (tradeType === 'BUY') {
    if (!symbol) validationError = 'Please select an asset symbol';
    else if (fetchingQuote) validationError = 'Fetching live market quote...';
    else if (!quoteInfo || !price || Number(price) <= 0) validationError = 'Verified market quote unavailable for order execution';
    else if (quoteInfo?.symbol && quoteInfo.symbol.toUpperCase() !== symbol.toUpperCase()) validationError = 'Market quote symbol mismatch';
    else if (Number(quantity) <= 0) validationError = 'Quantity must be greater than 0';
    else if (totalBuyCost > currentCash)
      validationError = `Insufficient cash. Requires ₹${totalBuyCost.toLocaleString('en-IN')}, Available: ₹${currentCash.toLocaleString('en-IN')}`;
  } else if (tradeType === 'SELL') {
    if (!symbol) validationError = 'Please select an asset symbol';
    else if (ownedShares === 0) validationError = `You do not hold any shares of ${symbol}`;
    else if (fetchingQuote) validationError = 'Fetching live market quote...';
    else if (!quoteInfo || !price || Number(price) <= 0) validationError = 'Verified market quote unavailable for order execution';
    else if (quoteInfo?.symbol && quoteInfo.symbol.toUpperCase() !== symbol.toUpperCase()) validationError = 'Market quote symbol mismatch';
    else if (Number(quantity) <= 0) validationError = 'Quantity must be greater than 0';
    else if (Number(quantity) > ownedShares)
      validationError = `Cannot sell ${quantity} shares. You currently own ${ownedShares} shares.`;
  } else if (tradeType === 'WITHDRAWAL') {
    if (Number(amount) <= 0) validationError = 'Withdrawal amount must be greater than 0';
    else if (Number(amount) > currentCash)
      validationError = `Insufficient liquidity. Available cash: ₹${currentCash.toLocaleString('en-IN')}`;
  } else if (tradeType === 'DEPOSIT') {
    if (Number(amount) <= 0) validationError = 'Deposit amount must be greater than 0';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (validationError) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        portfolioId,
        type: tradeType,
        notes: notes || `${tradeType} transaction executed via Portfolio Desk`,
      };

      if (tradeType === 'BUY' || tradeType === 'SELL') {
        payload.symbol = symbol.toUpperCase();
        payload.exchange = exchange;
        payload.quantity = Number(quantity);
        payload.price = Number(price);
        payload.fees = 20.0;
        payload.assetClass = 'EQUITY';
      } else {
        payload.amount = Number(amount);
      }

      const res = await api.executeTransaction(payload);
      if (res?.success) {
        if (onTradeSuccess) onTradeSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Transaction execution failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="PORTFOLIO ORDER EXECUTION DESK"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
        {/* Order Type Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#090e17] border border-[#172033] rounded">
          {['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTradeType(t);
                setError(null);
              }}
              className={`py-1.5 px-2 text-center rounded text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                tradeType === t
                  ? t === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : t === 'SELL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Trade Inputs for BUY / SELL */}
        {(tradeType === 'BUY' || tradeType === 'SELL') && (
          <>
            {/* Symbol Search / Selector */}
            <div>
              <label className="block text-slate-400 uppercase tracking-wider mb-1">
                Asset Symbol & Exchange
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={symbol ? symbol : 'Search symbol e.g. RELIANCE, TCS, INFY...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#080d1a] border border-[#1e293b] rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1527] border border-[#1e293b] rounded shadow-xl max-h-48 overflow-y-auto z-20">
                    {searchResults.map((item) => (
                      <div
                        key={item.symbol}
                        onClick={() => selectSymbol(item)}
                        className="px-3 py-2 hover:bg-[#152033] cursor-pointer flex justify-between items-center border-b border-[#182030] last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">{item.symbol}</span>
                          <span className="text-slate-400 text-[11px] truncate max-w-[180px]">{item.name}</span>
                          {item.sector && (
                            <span className="text-[9px] font-mono text-slate-400 bg-[#121a29] px-1.5 py-0.5 rounded border border-[#1e2a40]">
                              {item.sector}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-300 bg-[#172236] px-1.5 py-0.5 rounded">
                          {item.exchange || 'NSE'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Asset Info Banner */}
              {symbol && (
                <div className="mt-2.5 p-2.5 bg-[#0a0e17] border border-[#182030] rounded flex justify-between items-center font-mono">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm tracking-wide">{symbol}</span>
                      <span className="text-slate-400 text-[10px]">[{exchange}]</span>
                      {quoteInfo?.dataStatus && (
                        <Badge
                          variant={quoteInfo.dataStatus === 'LIVE' ? 'live' : 'simulated'}
                          size="xs"
                        >
                          {quoteInfo.dataStatus}
                        </Badge>
                      )}
                    </div>
                    {activePosition && (
                      <div className="text-[11px] text-emerald-400 mt-0.5">
                        Current Position: {ownedShares} shares @ ₹{Number(activePosition.averageBuyPrice).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-[10px]">LAST TRADED PRICE</div>
                    <div className="font-bold text-emerald-400 text-sm">
                      {fetchingQuote ? 'Fetching...' : `₹${Number(price).toFixed(2)}`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity and Execution Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-[#080d1a] border border-[#1e293b] rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1">
                  Limit/Exec Price (₹)
                </label>
                <input
                  type="number"
                  min="0.05"
                  step="0.05"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-[#080d1a] border border-[#1e293b] rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </>
        )}

        {/* Cash Deposit / Withdrawal Inputs */}
        {(tradeType === 'DEPOSIT' || tradeType === 'WITHDRAWAL') && (
          <div>
            <label className="block text-slate-400 uppercase tracking-wider mb-1">
              {tradeType === 'DEPOSIT' ? 'Deposit Amount (₹)' : 'Withdrawal Amount (₹)'}
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#080d1a] border border-[#1e293b] rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>Available Cash: ₹{Number(currentCash).toLocaleString('en-IN')}</span>
              {tradeType === 'WITHDRAWAL' && (
                <button
                  type="button"
                  onClick={() => setAmount(currentCash)}
                  className="text-cyan-400 hover:underline"
                >
                  Withdraw Max
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-slate-400 uppercase tracking-wider mb-1">
            Order Rationale / Memo
          </label>
          <input
            type="text"
            placeholder="e.g. Tactical sector allocation / Target rebalance"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#080d1a] border border-[#1e293b] rounded px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Financial Accounting Breakdown Preview */}
        <div className="p-3 bg-[#080d1a] border border-[#172033] rounded space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Estimated Trade Value:</span>
            <span className="text-white font-semibold">
              {tradeType === 'BUY'
                ? `₹${totalBuyCost.toLocaleString('en-IN')}`
                : tradeType === 'SELL'
                ? `₹${totalSellProceeds.toLocaleString('en-IN')}`
                : `₹${Number(amount).toLocaleString('en-IN')}`}
            </span>
          </div>
          {(tradeType === 'BUY' || tradeType === 'SELL') && (
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Regulatory Fees & STT:</span>
              <span>₹20.00</span>
            </div>
          )}
          <div className="flex justify-between text-slate-400 border-t border-[#172033] pt-1 mt-1">
            <span>Projected Cash Balance:</span>
            <span
              className={`font-semibold ${
                estimatedCashAfter < 0 ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              ₹{estimatedCashAfter.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Validation / Server Error Alert */}
        {(validationError || error) && (
          <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded flex items-center gap-2 text-rose-300 text-[11px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#172033]">
          <Button type="button" variant="secondary" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="xs"
            disabled={submitting || Boolean(validationError)}
          >
            {submitting ? 'Executing...' : `Confirm ${tradeType} Order`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
