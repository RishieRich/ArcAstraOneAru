import { useEffect, useState } from "react";
import {
  IconBox,
  IconChart,
  IconCheck,
  IconFile,
  IconMessage,
  IconSend,
  IconSpark,
  IconTrendUp,
  IconUpload,
} from "../icons";

const SLIDE_COUNT = 4;
const AUTO_ADVANCE_MS = 4300;

export default function ProductShowcase({ t, compact = false }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const slideLabels = [
    t.showcaseBusinessPulse,
    t.showcaseAiTitle,
    t.showcaseAgenticTitle,
    t.showcaseResearchTitle,
  ];

  useEffect(() => {
    if (paused) return undefined;
    if (
      typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % SLIDE_COUNT),
      AUTO_ADVANCE_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  function windowClass(index, name) {
    const previous = (activeSlide - 1 + SLIDE_COUNT) % SLIDE_COUNT;
    const next = (activeSlide + 1) % SLIDE_COUNT;
    return [
      "showcase-window",
      name,
      index === activeSlide ? "is-active" : "",
      index === previous ? "is-previous" : "",
      index === next ? "is-next" : "",
    ].filter(Boolean).join(" ");
  }

  return (
    <section
      className={`auth-product-showcase${compact ? " compact" : ""}`}
      aria-label={t.showcaseTitle}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="showcase-caption">
        <span><i />{t.showcaseLivePreview}</span>
        <strong>{t.showcaseTitle}</strong>
      </div>

      <div className="showcase-stage" aria-live="polite">
        <article
          className={windowClass(0, "source-window")}
          aria-hidden={activeSlide !== 0}
        >
          <header>
            <span><IconChart />{t.showcaseBusinessPulse}</span>
            <small>{t.showcaseConnected}</small>
          </header>
          <div className="showcase-source-row">
            {t.showcaseSources.map((source, index) => (
              <span key={source} style={{ "--item-delay": `${index * 80}ms` }}>
                {index === 0 && <IconChart />}
                {index === 1 && <IconBox />}
                {index === 2 && <IconUpload />}
                {source}
              </span>
            ))}
          </div>
          <div className="showcase-big-kpis">
            <div style={{ "--item-delay": "80ms" }}><span>{t.showcaseRevenue}</span><strong>₹39.2L</strong><small>↗ 18.4%</small></div>
            <div style={{ "--item-delay": "150ms" }}><span>{t.showcaseMargin}</span><strong>26.0%</strong><small>{t.showcaseHealthy}</small></div>
            <div style={{ "--item-delay": "220ms" }}><span>{t.showcaseCashDue}</span><strong>₹8.7L</strong><small>{t.showcaseNeedsLove}</small></div>
          </div>
          <div className="showcase-mini-chart">
            {[36, 48, 42, 61, 57, 73, 68, 88].map((height, index) => (
              <i key={index} style={{ height: `${height}%`, "--bar-delay": `${index * 55}ms` }} />
            ))}
          </div>
        </article>

        <article
          className={windowClass(1, "ai-window")}
          aria-hidden={activeSlide !== 1}
        >
          <header>
            <span><IconSpark />{t.showcaseAiTitle}</span>
            <small>{t.showcaseGrounded}</small>
          </header>
          <div className="showcase-question">
            <IconMessage />
            <span>{t.showcaseAiQuestion}</span>
          </div>
          <div className="showcase-answer">
            <i><IconSpark /></i>
            <p>{t.showcaseAiAnswer}</p>
          </div>
          <div className="showcase-ai-foot">
            <span><IconFile />{t.showcaseOnePager}</span>
            <span><IconCheck />{t.showcaseNumbersChecked}</span>
          </div>
        </article>

        <article
          className={windowClass(2, "action-window")}
          aria-hidden={activeSlide !== 2}
        >
          <header>
            <span><IconTrendUp />{t.showcaseAgenticTitle}</span>
            <small>{t.comingNext}</small>
          </header>
          <div className="showcase-action-alert">
            <span><strong>12</strong><small>{t.showcaseInvoicesPending}</small></span>
            <p>{t.showcaseActionQuestion}</p>
          </div>
          <div className="showcase-action-buttons">
            <button type="button" tabIndex={-1}><IconSend />{t.showcaseEmail}</button>
            <button type="button" tabIndex={-1}><IconMessage />{t.showcaseMessage}</button>
            <button type="button" tabIndex={-1}>{t.showcaseReview}</button>
          </div>
          <div className="showcase-action-progress">
            <i><b /></i>
            <span><IconCheck />{t.showcaseDemoQueued}</span>
          </div>
        </article>

        <article
          className={windowClass(3, "research-window")}
          aria-hidden={activeSlide !== 3}
        >
          <header>
            <span><IconSpark />{t.showcaseResearchTitle}</span>
            <small>{t.comingNext}</small>
          </header>
          <p>{t.showcaseResearchQuestion}</p>
          <div className="showcase-materials">
            {t.showcaseMaterials.map((material, index) => (
              <div key={material.name} style={{ "--item-delay": `${index * 110}ms` }}>
                <span>{material.name}</span>
                <strong className={index === 1 ? "down" : ""}>{material.move}</strong>
                <i><b style={{ width: material.signal }} /></i>
                <small>{material.note}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="showcase-dots" aria-label={t.showcaseTitle}>
        {slideLabels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-current={activeSlide === index ? "step" : undefined}
            onClick={() => setActiveSlide(index)}
          >
            <i />
          </button>
        ))}
      </div>
    </section>
  );
}
