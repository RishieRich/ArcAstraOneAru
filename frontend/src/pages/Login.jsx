import { useRef, useState } from "react";
import { login } from "../api";
import { LANGS } from "../i18n";

export default function Login({ t, lang, setLang, onSuccess }) {
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const boxes = [useRef(), useRef(), useRef(), useRef()];

  const pin = digits.join("");
  const ready = /\S+@\S+\.\S+/.test(email) && pin.length === 4 && !busy;

  function setDigit(i, raw) {
    const v = raw.replace(/\D/g, "");
    const next = [...digits];
    if (v.length > 1) {
      // pasted several digits — spread them across the boxes
      v.slice(0, 4 - i).split("").forEach((ch, k) => (next[i + k] = ch));
      setDigits(next);
      boxes[Math.min(i + v.length, 3)].current?.focus();
      return;
    }
    next[i] = v;
    setDigits(next);
    if (v && i < 3) boxes[i + 1].current?.focus();
  }

  function onKey(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) boxes[i - 1].current?.focus();
    if (e.key === "Enter" && ready) submit();
  }

  async function submit(e) {
    e?.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      onSuccess(await login(email.trim().toLowerCase(), pin));
    } catch (err) {
      setError(err.message);
      setDigits(["", "", "", ""]);
      boxes[0].current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className={`login-card${error ? " error" : ""}`} onSubmit={submit}>
        <div className="login-brand">
          <div className="logo">ARQ</div>
          <div>
            <h1>ARQ Receivables</h1>
            <p>{t.tagline}</p>
          </div>
        </div>

        <div className="login-lang">
          <div className="lang-group">
            {LANGS.map((l) => (
              <button type="button" key={l.id} onClick={() => setLang(l.id)}
                      aria-pressed={lang === l.id}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <h2>{t.loginTitle}</h2>
        <p className="sub">{t.loginSub}</p>

        <label htmlFor="email">{t.email}</label>
        <input
          id="email" type="email" autoComplete="email" autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>{t.pin}</label>
        <div className="pin-row">
          {digits.map((d, i) => (
            <input
              key={i} ref={boxes[i]} className="pin-box"
              type="password" inputMode="numeric" maxLength={i === 0 ? 4 : 1}
              value={d} autoComplete="off"
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              aria-label={`PIN digit ${i + 1}`}
            />
          ))}
        </div>

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" type="submit" disabled={!ready}>
          {busy ? t.loggingIn : t.loginBtn}
        </button>

        <div className="login-foot">{t.loginFooter}</div>
      </form>
    </div>
  );
}
