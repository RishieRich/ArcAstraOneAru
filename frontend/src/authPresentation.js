const NETWORK_MESSAGE = /failed to fetch|network|load failed|connection|internet/i;

export function authErrorKind(error, mode) {
  const status = Number(error?.status || 0);

  if (status === 401 || status === 403) return "credentials";
  if (status === 409 && mode === "signup") return "accountExists";
  if (status === 400 || status === 422) return "details";
  if (status === 429) return "wait";
  if (status >= 500 || error instanceof TypeError || NETWORK_MESSAGE.test(error?.message || "")) {
    return "connection";
  }
  return "general";
}

export function authErrorCopy(error, t, mode) {
  const kind = authErrorKind(error, mode);
  return t.authErrors[kind] || t.authErrors.general;
}

export function resetAuthModeState(current, nextMode) {
  const mode = nextMode === "signup" ? "signup" : "login";
  return {
    ...current,
    mode,
    password: "",
    showPassword: false,
    error: null,
    waitlisted: null,
    ...(mode === "login" ? { fullName: "", companyName: "" } : {}),
  };
}
