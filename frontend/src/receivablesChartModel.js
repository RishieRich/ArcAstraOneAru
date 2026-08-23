import { finiteChartValue, formatChartValue } from "./chartModel.js";

function receivableAmount(value) {
  const parsed = finiteChartValue(value);
  return parsed === null ? 0 : Math.abs(parsed);
}

function chartMonth(value) {
  const month = String(value || "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

/* Keep this boundary identical to the receivables month builders: a bill without
   a chartable month stays in every portfolio total, but is disclosed separately. */
export function receivablesDateCoverage(bills = [], field) {
  const months = [];
  const missing = {
    count: 0,
    amount: 0,
    overdue: 0,
    onTrack: 0,
  };

  for (const bill of bills || []) {
    const month = chartMonth(bill?.[field]);
    if (month) {
      months.push(month);
      continue;
    }

    const amount = receivableAmount(bill?.amount);
    missing.count += 1;
    missing.amount += amount;
    if ((bill?.overdue_days || 0) > 0) missing.overdue += amount;
    else missing.onTrack += amount;
  }

  months.sort();
  return {
    first: months[0] || null,
    last: months.at(-1) || null,
    validCount: months.length,
    missingCount: missing.count,
    missingAmount: missing.amount,
    missingOverdue: missing.overdue,
    missingOnTrack: missing.onTrack,
  };
}

export function formatReceivableExactMoney(value) {
  const parsed = finiteChartValue(value);
  return formatChartValue(parsed === null ? null : Math.abs(parsed), "currency");
}

export function formatReceivableShare(value, total) {
  const amount = receivableAmount(value);
  const denominator = receivableAmount(total);
  return denominator > 0 ? `${((amount / denominator) * 100).toFixed(1)}%` : null;
}
