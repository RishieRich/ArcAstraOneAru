import { useState } from "react";
import { cleanupCompanyData } from "../api";
import { IconShield, IconTrash } from "../icons";

export default function DataCleanup({
  tenantId,
  companyName,
  ownerEmail,
  t,
  onCleared,
  onClose,
}) {
  const [email, setEmail] = useState(ownerEmail || "");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const ready =
    email.trim().length >= 3 &&
    password.length >= 4 &&
    !working;

  async function submit(event) {
    event.preventDefault();
    if (!ready) return;
    setWorking(true);
    setError("");
    try {
      const result = await cleanupCompanyData({
        tenantId,
        email: email.trim(),
        password,
      });
      await onCleared(result);
      onClose();
    } catch (cleanupError) {
      setError(cleanupError.message || t.cleanupFailed);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="danger-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !working) onClose();
      }}
    >
      <section
        className="danger-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !working) onClose();
        }}
      >
        <div className="danger-dialog-icon"><IconTrash /></div>
        <span className="eyebrow">{t.cleanupEyebrow}</span>
        <h2 id="cleanup-title">{t.cleanupTitle}</h2>
        <p className="danger-lead">{t.cleanupWarning(companyName)}</p>

        <div className="cleanup-scope">
          <div>
            <strong>{t.cleanupDeletes}</strong>
            <span>{t.cleanupDeletesBody}</span>
          </div>
          <div>
            <strong>{t.cleanupKeeps}</strong>
            <span>{t.cleanupKeepsBody}</span>
          </div>
        </div>

        <form onSubmit={submit}>
          <label htmlFor="cleanup-email">{t.cleanupEmail}</label>
          <input
            id="cleanup-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            autoComplete="username"
            maxLength={254}
            autoFocus
          />

          <label htmlFor="cleanup-password">{t.cleanupPassword}</label>
          <input
            id="cleanup-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            autoComplete="current-password"
          />

          {error && <div className="cleanup-error" role="alert">{error}</div>}

          <div className="danger-actions">
            <button type="button" onClick={onClose} disabled={working}>
              {t.cancel}
            </button>
            <button className="danger-confirm" type="submit" disabled={!ready}>
              <IconShield width={15} height={15} />
              {working ? t.cleanupWorking : t.cleanupConfirm}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
