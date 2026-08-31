import assert from "node:assert/strict";
import test from "node:test";
import { T } from "./i18n.js";
import { buildBusinessSnapshot } from "./snapshotPresentation.js";

const complete = {
  products: true, customers: true, receivables: true,
  margin: false, industry: false, geography: false, size: false,
};

test("snapshot keeps sales, debtors, and collection priorities as distinct evidence types", () => {
  const snapshot = buildBusinessSnapshot({
    generated_at: "2026-08-31T10:00:00Z",
    data_completeness: complete,
    profile: {
      top_products: [{ name: "Valve", revenue: 50000, revenue_share_pct: 60, orders: 3, customers: 2 }],
      best_customers: [{ name: "Sales Buyer", revenue: 50000, orders: 3, first_order: "2026-01-01", last_order: "2026-08-01", icp_score: 92 }],
      collection_priorities: [{ name: "Tally Debtor", outstanding: 40000, overdue: 20000, max_overdue_days: 45, bill_count: 2 }],
      action_plan: [{ type: "collect", party: "Tally Debtor", amount: 20000, overdue_days: 45 }],
    },
  });
  assert.equal(snapshot.topProduct.name, "Valve");
  assert.equal(snapshot.topCustomer.name, "Sales Buyer");
  assert.equal(snapshot.topCollection.name, "Tally Debtor");
  assert.equal(snapshot.attention.type, "urgentCollection");
  assert.deepEqual(snapshot.salesPeriod, { from: "2026-01-01", to: "2026-08-01" });
  assert.equal(snapshot.missingEvidence.length, 4);
});

test("snapshot chooses urgent collection before a concentration watch without changing API ordering", () => {
  const snapshot = buildBusinessSnapshot({
    data_completeness: complete,
    profile: {
      action_plan: [
        { type: "protect_product", product: "Valve", share_pct: 70 },
        { type: "collect", party: "Debtor", amount: 100, overdue_days: 90 },
      ],
    },
  });
  assert.equal(snapshot.attention.type, "urgentCollection");
  assert.equal(snapshot.attention.row.party, "Debtor");
});

test("snapshot supports sales-only, receivables-only, and empty profiles honestly", () => {
  const salesOnly = buildBusinessSnapshot({ data_completeness: { products: true, customers: true }, profile: { top_products: [{}], best_customers: [{}] } });
  const receivablesOnly = buildBusinessSnapshot({ data_completeness: { receivables: true }, profile: { collection_priorities: [{}] } });
  const empty = buildBusinessSnapshot({});
  assert.equal(salesOnly.hasSales, true);
  assert.equal(salesOnly.hasReceivables, false);
  assert.equal(receivablesOnly.hasSales, false);
  assert.equal(receivablesOnly.hasReceivables, true);
  assert.equal(empty.topProduct, null);
  assert.equal(empty.attention, null);
});

test("snapshot presentation copy is complete in all four supported languages", () => {
  const keys = [
    "businessSnapshotTitle", "businessSnapshotBody", "snapshotContext", "snapshotSource",
    "snapshotSalesPeriod", "snapshotFreshness", "missingEvidence", "evidenceItems",
    "evidencePrevents", "rankingEvidence", "productEvidence", "customerEvidence",
    "collectionEvidence", "noRecordedDate",
  ];
  for (const language of ["en", "hi", "gu", "mr"]) {
    for (const key of keys) assert.ok(T[language].research[key], `${language}.research.${key}`);
    assert.equal(T[language].research.icp.includes("pattern"), false, `${language}.research.icp`);
  }
});
