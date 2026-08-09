export const DEFAULT_RECEIVABLE_FILTERS = Object.freeze({
  query: "",
  party: "all",
  aging: "all",
  amount: "all",
  sort: "amount_desc",
});

const AMOUNT_RANGES = {
  all: () => true,
  under_1l: (amount) => amount < 100000,
  "1l_5l": (amount) => amount >= 100000 && amount < 500000,
  "5l_10l": (amount) => amount >= 500000 && amount < 1000000,
  "10l_plus": (amount) => amount >= 1000000,
};

const AGING_BUCKETS = [
  { key: "not_due", bucket: "Not due" },
  { key: "1_30", bucket: "1-30 days" },
  { key: "31_60", bucket: "31-60 days" },
  { key: "61_90", bucket: "61-90 days" },
  { key: "90_plus", bucket: "90+ days" },
];

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function agingKey(overdueDays) {
  const days = Number(overdueDays) || 0;
  if (days <= 0) return "not_due";
  if (days <= 30) return "1_30";
  if (days <= 60) return "31_60";
  if (days <= 90) return "61_90";
  return "90_plus";
}

export function hasActiveReceivableFilters(filters) {
  return Object.entries(DEFAULT_RECEIVABLE_FILTERS).some(
    ([key, value]) => (filters?.[key] ?? value) !== value,
  );
}

export function hasScopedReceivableFilters(filters) {
  return ["query", "party", "aging", "amount"].some(
    (key) => (filters?.[key] ?? DEFAULT_RECEIVABLE_FILTERS[key])
      !== DEFAULT_RECEIVABLE_FILTERS[key],
  );
}

export function filterBills(bills, filters = DEFAULT_RECEIVABLE_FILTERS) {
  const query = (filters.query || "").trim().toLocaleLowerCase();
  const party = filters.party || "all";
  const aging = filters.aging || "all";
  const amountMatches = AMOUNT_RANGES[filters.amount] || AMOUNT_RANGES.all;

  const filtered = (bills || []).filter((bill) => {
    const billAmount = money(bill.amount);
    const text = `${bill.party || ""} ${bill.bill_ref || ""}`.toLocaleLowerCase();
    return (
      (!query || text.includes(query)) &&
      (party === "all" || bill.party === party) &&
      (aging === "all" || agingKey(bill.overdue_days) === aging) &&
      amountMatches(billAmount)
    );
  });

  const sort = filters.sort || DEFAULT_RECEIVABLE_FILTERS.sort;
  return filtered.sort((left, right) => {
    if (sort === "overdue_desc") {
      return (Number(right.overdue_days) || 0) - (Number(left.overdue_days) || 0)
        || money(right.amount) - money(left.amount);
    }
    if (sort === "due_asc") {
      return String(left.due_date || "9999-12-31").localeCompare(
        String(right.due_date || "9999-12-31"),
      );
    }
    if (sort === "newest") {
      return String(right.bill_date || "").localeCompare(String(left.bill_date || ""));
    }
    return money(right.amount) - money(left.amount);
  });
}

export function summarizeBills(bills) {
  const partyTotals = new Map();
  let outstanding = 0;
  let overdue = 0;
  let overdueDays = 0;
  let overdueBillCount = 0;
  let maxOverdueDays = 0;
  let ninetyPlusAmount = 0;
  let ninetyPlusCount = 0;

  for (const bill of bills || []) {
    const amount = money(bill.amount);
    const days = Number(bill.overdue_days) || 0;
    const party = bill.party || "";
    outstanding += amount;
    partyTotals.set(party, (partyTotals.get(party) || 0) + amount);
    if (days > 0) {
      overdue += amount;
      overdueDays += days;
      overdueBillCount += 1;
      maxOverdueDays = Math.max(maxOverdueDays, days);
    }
    if (days > 90) {
      ninetyPlusAmount += amount;
      ninetyPlusCount += 1;
    }
  }

  const [topParty, topPartyAmount] = [...partyTotals.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0] || [null, 0];
  const billCount = (bills || []).length;

  return {
    outstanding: roundMoney(outstanding),
    overdue: roundMoney(overdue),
    not_due: roundMoney(outstanding - overdue),
    bill_count: billCount,
    party_count: partyTotals.size,
    overdue_bill_count: overdueBillCount,
    avg_overdue_days: overdueBillCount ? Math.round(overdueDays / overdueBillCount) : 0,
    max_overdue_days: maxOverdueDays,
    top_party: topParty,
    concentration_pct: outstanding ? Math.round((topPartyAmount / outstanding) * 1000) / 10 : 0,
    overdue_pct: outstanding ? Math.round((overdue / outstanding) * 1000) / 10 : 0,
    average_bill: billCount ? roundMoney(outstanding / billCount) : 0,
    ninety_plus_amount: roundMoney(ninetyPlusAmount),
    ninety_plus_count: ninetyPlusCount,
    ninety_plus_pct: outstanding
      ? Math.round((ninetyPlusAmount / outstanding) * 1000) / 10
      : 0,
  };
}

export function buildAging(bills) {
  const totals = new Map(
    AGING_BUCKETS.map(({ key }) => [key, { amount: 0, bills: 0 }]),
  );
  for (const bill of bills || []) {
    const bucket = totals.get(agingKey(bill.overdue_days));
    bucket.amount += money(bill.amount);
    bucket.bills += 1;
  }
  return AGING_BUCKETS.map(({ key, bucket }) => ({
    bucket,
    amount: roundMoney(totals.get(key).amount),
    bills: totals.get(key).bills,
  }));
}

export function buildDueTimeline(bills, limit = 12) {
  const months = new Map();
  for (const bill of bills || []) {
    const month = String(bill.due_date || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const current = months.get(month) || { month, overdue: 0, on_track: 0, bills: 0 };
    const key = (Number(bill.overdue_days) || 0) > 0 ? "overdue" : "on_track";
    current[key] += money(bill.amount);
    current.bills += 1;
    months.set(month, current);
  }
  const ordered = [...months.values()]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((month) => ({
      ...month,
      overdue: roundMoney(month.overdue),
      on_track: roundMoney(month.on_track),
    }));
  if (ordered.length <= limit) return ordered;

  const recent = ordered.slice(-(limit - 1));
  const earlier = ordered.slice(0, -(limit - 1)).reduce(
    (total, month) => ({
      month: "earlier",
      overdue: total.overdue + month.overdue,
      on_track: total.on_track + month.on_track,
      bills: total.bills + month.bills,
      earlier: true,
    }),
    { month: "earlier", overdue: 0, on_track: 0, bills: 0, earlier: true },
  );
  earlier.overdue = roundMoney(earlier.overdue);
  earlier.on_track = roundMoney(earlier.on_track);
  return [earlier, ...recent];
}

export function buildTopDebtors(bills, limit = 8) {
  const parties = new Map();
  for (const bill of bills || []) {
    const party = bill.party || "";
    const current = parties.get(party) || {
      party,
      amount: 0,
      max_overdue_days: 0,
      bills: 0,
    };
    current.amount += money(bill.amount);
    current.max_overdue_days = Math.max(
      current.max_overdue_days,
      Number(bill.overdue_days) || 0,
    );
    current.bills += 1;
    parties.set(party, current);
  }
  const outstanding = [...parties.values()].reduce((sum, party) => sum + party.amount, 0);
  return [...parties.values()]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, limit)
    .map((party) => ({
      ...party,
      amount: roundMoney(party.amount),
      pct: outstanding ? Math.round((party.amount / outstanding) * 1000) / 10 : 0,
    }));
}

export function buildOldestBills(bills, limit = 5) {
  return [...(bills || [])]
    .filter((bill) => (Number(bill.overdue_days) || 0) > 0)
    .sort(
      (left, right) => (Number(right.overdue_days) || 0) - (Number(left.overdue_days) || 0)
        || money(right.amount) - money(left.amount),
    )
    .slice(0, limit);
}

export function buildExposureTrajectory(bills, limit = 12) {
  const months = new Map();
  for (const bill of bills || []) {
    const month = String(bill.bill_date || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const current = months.get(month) || { month, amount: 0, bills: 0 };
    current.amount += money(bill.amount);
    current.bills += 1;
    months.set(month, current);
  }
  const ordered = [...months.values()]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((month) => ({ ...month, amount: roundMoney(month.amount) }));
  if (ordered.length <= limit) return ordered;

  const recent = ordered.slice(-(limit - 1));
  const earlier = ordered.slice(0, -(limit - 1)).reduce(
    (total, month) => ({
      month: "earlier",
      amount: total.amount + month.amount,
      bills: total.bills + month.bills,
      earlier: true,
    }),
    { month: "earlier", amount: 0, bills: 0, earlier: true },
  );
  earlier.amount = roundMoney(earlier.amount);
  return [earlier, ...recent];
}

export function deriveReceivables(bills) {
  return {
    totals: summarizeBills(bills),
    aging: buildAging(bills),
    dueTimeline: buildDueTimeline(bills),
    topDebtors: buildTopDebtors(bills),
    oldestBills: buildOldestBills(bills),
    trajectory: buildExposureTrajectory(bills),
  };
}
