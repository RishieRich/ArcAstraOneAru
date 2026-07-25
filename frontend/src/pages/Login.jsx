import { useState } from "react";
import { login } from "../api";
import BrandLogo from "../components/BrandLogo";
import ThemeToggle from "../components/ThemeToggle";
import { LANGS } from "../i18n";
import { IconEye, IconEyeOff, IconShield } from "../icons";

export default function Login({
  t,
  lang,
  setLang,
  theme,
  setTheme,
  onSuccess,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = /\S+@\S+\.\S+/.test(email) && password.length >= 4 && !busy;

  async function submit(event) {
    event?.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      onSuccess(await login(email.trim().toLowerCase(), password));
    } catch (loginError) {
      setError(loginError.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-theme">
        <ThemeToggle theme={theme} setTheme={setTheme} t={t} />
      </div>

      <form className={`login-card${error ? " error" : ""}`} onSubmit={submit}>
        <div className="login-brand">
          <BrandLogo />
          <div>
            <h1>ARQ Astra</h1>
            <p>{t.tagline}</p>
          </div>
        </div>

        <div className="login-lang">
          <div className="lang-group">
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
        </div>

        <span className="login-eyebrow">{t.secureWorkspace}</span>
        <h2>{t.loginTitle}</h2>
        <p className="sub">{t.loginSub}</p>

        <label htmlFor="email">{t.email}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="password">{t.password}</label>
        <div className="password-field">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t.passwordPlaceholder}
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

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" type="submit" disabled={!ready}>
          {busy ? t.loggingIn : t.loginBtn}
        </button>

        <div className="login-foot">
          <IconShield width={14} height={14} />
          {t.loginFooter}
        </div>
      </form>
    </div>
  );
}
