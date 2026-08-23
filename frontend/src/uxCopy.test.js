import assert from "node:assert/strict";
import test from "node:test";
import { T } from "./i18n.js";

function shape(value) {
  if (typeof value === "function") return "function";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, shape(value[key])]),
    );
  }
  return typeof value;
}

test("answer-first and chart copy has identical shape in all four languages", () => {
  const expected = shape(T.en.ux);
  for (const language of ["hi", "gu", "mr"]) {
    assert.deepEqual(shape(T[language].ux), expected, `${language}.ux differs from en.ux`);
  }
});

test("unknown Smart warnings have a localized safe fallback", () => {
  for (const language of ["en", "hi", "gu", "mr"]) {
    assert.ok(T[language].ux.smartWarningGeneric);
    assert.notEqual(T[language].ux.smartWarningGeneric, "Unexpected parser wording");
  }
});
