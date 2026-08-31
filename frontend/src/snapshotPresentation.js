function rows(value) {
  return Array.isArray(value) ? value : [];
}

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function salesPeriod(customers) {
  const dates = rows(customers).flatMap((customer) => [
    validDate(customer.first_order), validDate(customer.last_order),
  ]).filter(Boolean).sort();
  return dates.length ? { from: dates[0], to: dates.at(-1) } : null;
}

// This is deliberately presentation-only. The API remains the authority for the
// profile's deterministic ordering and scoring; we only make its supporting facts visible.
export function buildBusinessSnapshot(icp = {}) {
  const profile = icp.profile || {};
  const completeness = icp.data_completeness || {};
  const products = rows(profile.top_products);
  const customers = rows(profile.best_customers);
  const collections = rows(profile.collection_priorities);
  const actions = rows(profile.action_plan);
  const urgentCollection = actions.find((action) => action.type === "collect") || null;
  const productWatch = actions.find((action) => action.type === "protect_product") || null;
  const customerWatch = actions.find((action) => action.type === "grow_customer") || null;
  const attention = urgentCollection
    ? { type: "urgentCollection", row: urgentCollection }
    : productWatch
      ? { type: "productConcentration", row: productWatch }
      : customerWatch
        ? { type: "customerFollowUp", row: customerWatch }
        : null;

  const evidence = [
    { id: "products", connected: Boolean(completeness.products), prevents: "product" },
    { id: "customers", connected: Boolean(completeness.customers), prevents: "customer" },
    { id: "receivables", connected: Boolean(completeness.receivables), prevents: "collection" },
    { id: "margin", connected: Boolean(completeness.margin), prevents: "margin" },
    { id: "industry", connected: Boolean(completeness.industry), prevents: "industry" },
    { id: "geography", connected: Boolean(completeness.geography), prevents: "geography" },
    { id: "size", connected: Boolean(completeness.size), prevents: "size" },
  ];

  return {
    topProduct: products[0] || null,
    topCustomer: customers[0] || null,
    topCollection: collections[0] || null,
    attention,
    products,
    customers,
    collections,
    evidence,
    missingEvidence: evidence.filter((item) => !item.connected),
    hasSales: products.length > 0 || customers.length > 0,
    hasReceivables: collections.length > 0,
    salesPeriod: salesPeriod(customers),
    generatedAt: icp.generated_at || null,
  };
}
