import { useEffect, useRef, useState } from "react";
import { askAI } from "../api";

export default function AskPanel({ tenantId, t }) {
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

    // Only clean turns become history — an error bubble is not a model turn.
    const history = turns.filter((x) => x.role !== "error");
    setTurns([...turns, { role: "user", content: q }]);
    setDraft("");
    setBusy(true);

    try {
      const answer = await askAI({ tenantId, question: q, history });
      setTurns((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      setTurns((prev) => [...prev, { role: "error", content: e.message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card ask">
      <div>
        <h3>{t.askTitle}</h3>
        <p className="sub" style={{ marginBottom: 0 }}>{t.askSub}</p>
      </div>

      {turns.length > 0 && (
        <div className="thread" ref={threadRef}>
          {turns.map((turn, i) => (
            <div
              key={i}
              className={`bubble ${turn.role === "user" ? "user" : turn.role === "error" ? "err" : "ai"}`}
            >
              {turn.content}
            </div>
          ))}
          {busy && <div className="bubble ai">{t.thinking}</div>}
        </div>
      )}

      <div className="chips">
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
        <button type="submit" disabled={busy || !draft.trim()}>
          {busy ? t.thinking : t.send}
        </button>
      </form>
    </div>
  );
}
