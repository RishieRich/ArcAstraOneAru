import test from "node:test";
import assert from "node:assert/strict";

import { T } from "./i18n.js";
import {
  defaultHomeView,
  homeNavigationState,
  workspaceLocation,
} from "./navigation.js";

test("home chooses receivables first, then finance, then the guided empty route", () => {
  assert.equal(defaultHomeView({ has_receivables_data: true, has_financial_data: true }), "receivables");
  assert.equal(defaultHomeView({ has_receivables_data: false, has_financial_data: true }), "financial");
  assert.equal(defaultHomeView({ has_receivables_data: false, has_financial_data: false }), "receivables");
  assert.equal(defaultHomeView(null), "receivables");
});

test("home closes temporary panels without discarding useful state", () => {
  const data = { has_receivables_data: true, marker: "same-object" };
  const before = {
    view: "research",
    showUpload: true,
    chatOpen: true,
    showCleanup: true,
    toolsOpen: true,
    tenantId: "tenant-7",
    lang: "gu",
    theme: "dark",
    data,
  };
  const after = homeNavigationState(before, data);

  assert.deepEqual(
    {
      view: after.view,
      showUpload: after.showUpload,
      chatOpen: after.chatOpen,
      showCleanup: after.showCleanup,
      toolsOpen: after.toolsOpen,
    },
    {
      view: "receivables",
      showUpload: false,
      chatOpen: false,
      showCleanup: false,
      toolsOpen: false,
    },
  );
  assert.equal(after.tenantId, before.tenantId);
  assert.equal(after.lang, before.lang);
  assert.equal(after.theme, before.theme);
  assert.equal(after.data, data);
});

test("workspace location has a safe receivables fallback", () => {
  assert.deepEqual(workspaceLocation("financial", T.en), {
    area: T.en.financialView,
    subsection: T.en.financialViewSub,
  });
  assert.deepEqual(workspaceLocation("research", T.en, "customers"), {
    area: T.en.research.nav,
    subsection: T.en.research.customers,
  });
  assert.deepEqual(workspaceLocation("unexpected", T.en), {
    area: T.en.receivablesView,
    subsection: T.en.receivablesViewSub,
  });
});

test("new navigation labels exist in every supported language", () => {
  const keys = ["goHome", "currentLocation", "currentSection", "current", "toolsAndSettings"];
  for (const language of ["en", "hi", "gu", "mr"]) {
    for (const key of keys) assert.ok(T[language][key], `${language}.${key} is missing`);
  }
});
