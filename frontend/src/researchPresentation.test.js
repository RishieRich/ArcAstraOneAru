import assert from "node:assert/strict";
import test from "node:test";
import { T } from "./i18n.js";
import { customerBriefState, supplierBriefState } from "./researchPresentation.js";

test("customer brief accepts an existing recorded product or an entered industry", () => {
  assert.deepEqual(customerBriefState({ top_products: [{ name: "Valve" }] }, {}), { canRun: true, reason: null });
  assert.deepEqual(customerBriefState({}, { industry: "Chemicals" }), { canRun: true, reason: null });
  assert.deepEqual(customerBriefState({}, { industry: "  " }), { canRun: false, reason: "customerTerms" });
});

test("supplier brief names the first missing existing API prerequisite", () => {
  assert.deepEqual(supplierBriefState({}), { canRun: false, reason: "supplierProduct" });
  assert.deepEqual(supplierBriefState({ product: "EN8 bar" }), { canRun: false, reason: "supplierBaseline" });
  assert.deepEqual(supplierBriefState({ product: "EN8 bar", baseline: "72" }), { canRun: true, reason: null });
});

test("research brief guidance and disabled reasons exist in all four languages", () => {
  for (const language of ["en", "hi", "gu", "mr"]) {
    const copy = T[language].research;
    ["required", "customerBriefIntro", "supplierBriefIntro", "geographyPurpose", "industryPurpose", "productPurpose", "specificationPurpose", "baselinePurpose"].forEach((key) => assert.ok(copy[key], `${language}.${key}`));
    ["customerTerms", "supplierProduct", "supplierBaseline"].forEach((key) => assert.ok(copy.researchDisabled[key], `${language}.researchDisabled.${key}`));
  }
});
