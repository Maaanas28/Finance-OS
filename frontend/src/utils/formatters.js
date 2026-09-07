/**
 * Financial formatters for institutional terminal presentation
 */

export function formatCurrency(amount, currency = 'INR', decimals = 0) {
  if (amount === undefined || amount === null) return '—';

  const symbol = currency === 'USD' ? '$' : '₹';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  // Format with commas according to Indian or Western numbering system
  let formattedNumber;
  if (currency === 'INR') {
    formattedNumber = abs.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    formattedNumber = abs.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return `${isNegative ? '-' : ''}${symbol}${formattedNumber}`;
}

export function formatPercent(value, showPlus = true, decimals = 2) {
  if (value === undefined || value === null) return '—';
  const prefix = showPlus && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}

export function formatNumber(val, decimals = 2) {
  if (val === undefined || val === null) return '—';
  return Number(val).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
