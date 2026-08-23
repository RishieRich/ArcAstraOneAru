import test from "node:test";
import assert from "node:assert/strict";

import { authErrorCopy, authErrorKind, resetAuthModeState } from "./authPresentation.js";
import { T } from "./i18n.js";

test("authentication failures map to useful categories", () => {
  assert.equal(authErrorKind({ status: 401 }, "login"), "credentials");
  assert.equal(authErrorKind({ status: 409 }, "signup"), "accountExists");
  assert.equal(authErrorKind({ status: 422 }, "signup"), "details");
  assert.equal(authErrorKind({ status: 429 }, "login"), "wait");
  assert.equal(authErrorKind(new TypeError("Failed to fetch"), "login"), "connection");
  assert.equal(authErrorKind({ status: 503 }, "login"), "connection");
  assert.equal(authErrorKind(new Error("opaque provider detail"), "login"), "general");
});

test("presented authentication copy never exposes the raw server message", () => {
  const raw = "database host secret internal message";
  const copy = authErrorCopy(Object.assign(new Error(raw), { status: 500 }), T.en, "login");
  assert.ok(copy.title);
  assert.ok(copy.body);
  assert.equal(`${copy.title} ${copy.body}`.includes(raw), false);
});

test("switching modes clears secrets, visibility and stale feedback", () => {
  const next = resetAuthModeState({
    mode: "signup",
    fullName: "Asha",
    companyName: "Asha Engineering",
    email: "asha@example.com",
    password: "secret123",
    showPassword: true,
    error: { title: "Old" },
    waitlisted: { status: "waitlisted" },
  }, "login");

  assert.equal(next.mode, "login");
  assert.equal(next.password, "");
  assert.equal(next.showPassword, false);
  assert.equal(next.error, null);
  assert.equal(next.waitlisted, null);
  assert.equal(next.fullName, "");
  assert.equal(next.companyName, "");
  assert.equal(next.email, "asha@example.com");
});

test("auth recovery and support copy is explicit in all four languages", () => {
  const keys = [
    "authHelpTitle", "loginHelpBody", "signupHelpBody", "emailSupport", "callSupport",
    "emailPlaceholder",
  ];
  const errorKeys = ["credentials", "accountExists", "details", "wait", "connection", "general"];
  for (const language of ["en", "hi", "gu", "mr"]) {
    for (const key of keys) assert.ok(T[language][key], `${language}.${key} is missing`);
    for (const key of errorKeys) {
      assert.ok(T[language].authErrors?.[key]?.title, `${language}.authErrors.${key}.title is missing`);
      assert.ok(T[language].authErrors?.[key]?.body, `${language}.authErrors.${key}.body is missing`);
    }
  }
  for (const language of ["hi", "gu", "mr"]) {
    assert.notEqual(T[language].authErrors.connection.body, T.en.authErrors.connection.body);
  }
});
