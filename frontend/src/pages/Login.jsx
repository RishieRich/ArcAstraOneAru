import { useState } from "react";
import { login, signup } from "../api";
import BrandLogo from "../components/BrandLogo";
import ConversionContactBar from "../components/ConversionContactBar";
import ProductShowcase from "../components/ProductShowcase";
import ThemeToggle from "../components/ThemeToggle";
import WaitlistPreview from "../components/WaitlistPreview";
import { LANGS } from "../i18n";
import {
  IconCheck,
  IconEye,
  IconEyeOff,
  IconShield,
  IconSpark,
} from "../icons";

export default function Login({
  t,
  lang,
  setLang,
  theme,
  setTheme,
  onSuccess,
}) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitlisted, setWaitlisted] = useState(null);

  const validEmail = /\S+@\S+\.\S+/.test(email);
  const ready =
    !busy &&
    validEmail &&
    (mode === "login"
      ? password.length >= 4
      : fullName.trim().length >= 2 &&
        companyName.trim().length >= 2 &&
        password.length >= 8 &&
        /[A-Za-z]/.test(password) &&
        /\d/.test(password));

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setWaitlisted(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        onSuccess(await login(email.trim().toLowerCase(), password));
        return;
      }
      const result = await signup({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (result.status === "active") {
        onSuccess(result);
      } else {
        setWaitlisted(result);
        setPassword("");
      }
    } catch (requestError) {
      setError(requestError.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  if (waitlisted) {
    return (
      <WaitlistPreview
        t={t}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        result={waitlisted}
        onBack={() => switchMode("login")}
      />
    );
  }

  return (
    <div className="login-screen">
      <header className="login-topbar">
        <div className="login-topbrand">
          <BrandLogo compact />
          <div>
            <strong>ARQ Astra</strong>
            <span>{t.tagline}</span>
          </div>
        </div>

        <ConversionContactBar t={t} />

        <div className="login-topcontrols">
          <div className="lang-group" aria-label={t.languagePicker}>
            {LANGS.map((language) => (
              <button
                type="button"
                key={language.id}
                onClick={() => setLang(language.id)}
                aria-pressed={lang === language.id}
              >
                {language.label}
              </button>
            ))}
          </div>
          <ThemeToggle
            theme={theme}
            setTheme={setTheme}
            t={t}
            compact
          />
        </div>
      </header>

      <main className="auth-shell">
        <section className="auth-story">
          <span className="auth-story-kicker">
            <IconSpark width={14} height={14} />
            {t.freeBusinessIntelligence}
          </span>
          <h2>{t.signupHero}</h2>
          <p>{t.signupHeroSub}</p>
          <ProductShowcase t={t} />
          <div className="auth-benefits">
            {t.signupBenefits.map((benefit) => (
              <div key={benefit}>
                <IconCheck width={16} height={16} />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          <div className="auth-connect-note">
            <strong>{t.beyondExcel}</strong>
            <span>{t.beyondExcelBody}</span>
          </div>
        </section>

        <form
          className={`login-card${error ? " error" : ""}`}
          onSubmit={submit}
        >
          <div className="auth-tabs" role="tablist" aria-label={t.accountAccess}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
            >
              {t.signInTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => switchMode("signup")}
            >
              {t.signUpTab}
            </button>
          </div>

          <>
              <span className="login-eyebrow">
                {mode === "login" ? t.secureWorkspace : t.limitedFreeTrial}
              </span>
              <h2>{mode === "login" ? t.loginTitle : t.signupTitle}</h2>
              <p className="sub">
                {mode === "login" ? t.loginSub : t.signupSub}
              </p>

              {mode === "signup" && (
                <>
                  <label htmlFor="full-name">{t.fullName}</label>
                  <input
                    className="auth-input"
                    id="full-name"
                    type="text"
                    autoComplete="name"
                    autoFocus
                    placeholder={t.fullNamePlaceholder}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />

                  <label htmlFor="company-name">{t.companyName}</label>
                  <input
                    className="auth-input"
                    id="company-name"
                    type="text"
                    autoComplete="organization"
                    placeholder={t.companyNamePlaceholder}
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </>
              )}

              <label htmlFor="email">{t.email}</label>
              <input
                className="auth-input"
                id="email"
                type="email"
                autoComplete="email"
                autoFocus={mode === "login"}
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <label htmlFor="password">{t.password}</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? t.passwordPlaceholder
                      : t.createPasswordPlaceholder
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {mode === "signup" && (
                <small className="password-hint">{t.passwordRule}</small>
              )}

              {error && <div className="login-error">{error}</div>}

              <button className="login-btn" type="submit" disabled={!ready}>
                {busy
                  ? mode === "login"
                    ? t.loggingIn
                    : t.creatingWorkspace
                  : mode === "login"
                    ? t.loginBtn
                    : t.startFreeTrial}
              </button>

              <div className="login-foot">
                <IconShield width={14} height={14} />
                {mode === "login" ? t.loginFooter : t.signupSecurity}
              </div>
          </>
        </form>
        <div className="mobile-product-preview">
          <ProductShowcase t={t} compact />
        </div>
      </main>
    </div>
  );
}
