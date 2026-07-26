import { useEffect, useRef, useState } from "react";
import { askAI, AuthError } from "../api";
import { IconClose, IconFile, IconRefresh, IconSend, IconSpark } from "../icons";
import BrandLogo from "./BrandLogo";
import OnePageReport from "./OnePageReport";

export default function Copilot({
  tenantId,
  t,
  lang,
  open,
  hasFinancialData,
  data,
  onClose,
  onAuthError,
}) {
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const threadRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    setTurns([]);
    setDraft("");
    setReport(null);
  }, [tenantId]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, busy]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    setTimeout(() => composerRef.current?.focus(), 120);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  async function send(question) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busy) return;

    const history = turns
      .filter((turn) => turn.role !== "error")
      .map(({ role, content }) => ({ role, content }));
    setTurns((current) => [
      ...current,
      { role: "user", content: cleanQuestion },
    ]);
    setDraft("");
    setBusy(true);

    try {
      const answer = await askAI({
        tenantId,
        question: cleanQuestion,
        history,
        language: lang,
      });
      setTurns((current) => [
        ...current,
        { role: "assistant", content: answer, question: cleanQuestion },
      ]);
      if (/\b(report|one[\s-]?page|pdf)\b/i.test(cleanQuestion) && data) {
        setReport({ question: cleanQuestion, answer });
      }
    } catch (error) {
      if (error instanceof AuthError) return onAuthError();
      setTurns((current) => [
        ...current,
        { role: "error", content: error.message },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const suggestions = hasFinancialData
    ? t.financialSuggestions
    : t.suggestions;
  const welcome = hasFinancialData
    ? t.chatFinancialHello
    : t.askHello;

  return (
    <>
      <button
        className="chat-backdrop"
        type="button"
        onClick={onClose}
        aria-label={t.closeChat}
      />
      <aside
        className="copilot"
        role="dialog"
        aria-modal="true"
        aria-label={t.askTitle}
      >
        <div className="copilot-head">
          <BrandLogo compact />
          <div className="copilot-head-copy">
            <span className="copilot-kicker">
              <IconSpark width={13} height={13} />
              {t.aiPowered}
            </span>
            <h3>{t.askTitle}</h3>
            <p>
              <span className="dot-live" />
              {hasFinancialData ? t.chatDataReady : t.askStatus}
            </p>
          </div>
          <div className="copilot-actions">
            {turns.length > 0 && (
              <button
                type="button"
                onClick={() => setTurns([])}
                aria-label={t.clearChat}
                title={t.clearChat}
              >
                <IconRefresh width={16} height={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeChat}
              title={t.closeChat}
            >
              <IconClose width={17} height={17} />
            </button>
          </div>
        </div>

        <div className="copilot-context">
          <span>{hasFinancialData ? t.excelConnected : t.tallyConnected}</span>
          <strong>{t.askFreely}</strong>
        </div>

        <div className="copilot-thread" ref={threadRef}>
          <div className="bubble ai">{welcome}</div>
          {turns.map((turn, index) => (
            <div
              key={`${turn.role}-${index}`}
              className={`bubble ${
                turn.role === "user"
                  ? "user"
                  : turn.role === "error"
                    ? "err"
                    : "ai"
              }`}
            >
              <span>{turn.content}</span>
              {turn.role === "assistant" && turn.question && data && (
                <button
                  className="bubble-report-action"
                  type="button"
                  onClick={() =>
                    setReport({ question: turn.question, answer: turn.content })
                  }
                >
                  <IconFile width={14} height={14} />
                  {t.createOnePageReport}
                </button>
              )}
            </div>
          ))}
          {busy && (
            <div className="bubble ai">
              <span className="typing">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
        </div>

        <div className="copilot-chips">
          {suggestions.map((suggestion) => (
            <button
              className="chip"
              type="button"
              key={suggestion}
              onClick={() => send(suggestion)}
              disabled={busy}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <textarea
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            placeholder={t.placeholder}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={t.send}
          >
            <IconSend />
          </button>
        </form>
        <div className="copilot-foot">{t.aiAccuracyNote}</div>
      </aside>
      {report && data && (
        <OnePageReport
          data={data}
          question={report.question}
          answer={report.answer}
          t={t}
          onClose={() => setReport(null)}
        />
      )}
    </>
  );
}
