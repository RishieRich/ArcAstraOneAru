function text(value) {
  return String(value || "").trim();
}

// These states describe the existing API preconditions; they never alter a search request.
export function customerBriefState(profile = {}, brief = {}) {
  const hasRecordedProduct = Array.isArray(profile.top_products) && profile.top_products.length > 0;
  const hasIndustry = Boolean(text(brief.industry));
  return {
    canRun: hasRecordedProduct || hasIndustry,
    reason: hasRecordedProduct || hasIndustry ? null : "customerTerms",
  };
}

export function supplierBriefState(brief = {}) {
  const hasProduct = Boolean(text(brief.product));
  const hasBaseline = Boolean(text(brief.baseline));
  return {
    canRun: hasProduct && hasBaseline,
    reason: !hasProduct ? "supplierProduct" : !hasBaseline ? "supplierBaseline" : null,
  };
}
