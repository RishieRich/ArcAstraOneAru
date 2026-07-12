import { useEffect, useRef, useState } from "react";
import { askAI, AuthError } from "../api";
import { IconSend, IconSpark } from "../icons";

export default function Copilot({ tenantId, t, onAuthError }) {
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    setTurns([]); // a different company is a different conversation
  }, [tenantId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(question) {
    const q = question.trim();
    if (!q || busy) return;

    // Only clean turns become model history — error bubbles are UI, not turns.
    const history = turns.filter((x) => x.role !== "error");
    setTurns((prev) => [...prev, { role: "user", content: q }]);
    setDraft("");
    setBusy(true);

    try {
      const answer = await askAI({ tenantId, question: q, history });
      setTurns((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      setTurns((prev) => [...prev, { role: "error", content: e.message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="copilot">
      <div className="copilot-head">
        <div className="spark"><IconSpark /></div>
        <div>
          <h3>{t.askTitle}</h3>
          <p><span className="dot-live" />{t.askStatus}</p>
        </div>
      </div>

      <div className="copilot-thread" ref={threadRef}>
        <div className="bubble ai">{t.askHello}</div>
        {turns.map((turn, i) => (
          <div
            key={i}
            className={`bubble ${turn.role === "user" ? "user" : turn.role === "error" ? "err" : "ai"}`}
          >
            {turn.content}
          </div>
        ))}
        {busy && (
          <div className="bubble ai">
            <span className="typing"><i /><i /><i /></span>
          </div>
        )}
      </div>

      <div className="copilot-chips">
        {t.suggestions.map((s) => (
          <button className="chip" key={s} onClick={() => send(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !draft.trim()} aria-label={t.send}>
          <IconSend />
        </button>
      </form>
    </aside>
  );
}
