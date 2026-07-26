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

export default function ProductShowcase({ t, compact = false }) {
  return (
    <section
      className={`auth-product-showcase${compact ? " compact" : ""}`}
      aria-label={t.showcaseTitle}
    >
      <div className="showcase-caption">
        <span><i />{t.showcaseLivePreview}</span>
        <strong>{t.showcaseTitle}</strong>
      </div>

      <div className="showcase-stage">
        <article className="showcase-window source-window">
          <header>
            <span><IconChart />{t.showcaseBusinessPulse}</span>
            <small>{t.showcaseConnected}</small>
          </header>
          <div className="showcase-source-row">
            {t.showcaseSources.map((source, index) => (
              <span key={source}>
                {index === 0 && <IconChart />}
                {index === 1 && <IconBox />}
                {index === 2 && <IconUpload />}
                {source}
              </span>
            ))}
          </div>
          <div className="showcase-big-kpis">
            <div><span>{t.showcaseRevenue}</span><strong>₹39.2L</strong><small>↗ 18.4%</small></div>
            <div><span>{t.showcaseMargin}</span><strong>26.0%</strong><small>{t.showcaseHealthy}</small></div>
            <div><span>{t.showcaseCashDue}</span><strong>₹8.7L</strong><small>{t.showcaseNeedsLove}</small></div>
          </div>
          <div className="showcase-mini-chart">
            {[36, 48, 42, 61, 57, 73, 68, 88].map((height, index) => (
              <i key={index} style={{ height: `${height}%`, "--bar-delay": `${index * 55}ms` }} />
            ))}
          </div>
        </article>

        <article className="showcase-window ai-window">
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

        <article className="showcase-window action-window">
          <header>
            <span><IconTrendUp />{t.showcaseAgenticTitle}</span>
            <small>{t.comingNext}</small>
          </header>
          <div className="showcase-action-alert">
            <span><strong>12</strong><small>{t.showcaseInvoicesPending}</small></span>
            <p>{t.showcaseActionQuestion}</p>
          </div>
          <div className="showcase-action-buttons">
            <button type="button"><IconSend />{t.showcaseEmail}</button>
            <button type="button"><IconMessage />{t.showcaseMessage}</button>
            <button type="button">{t.showcaseReview}</button>
          </div>
          <div className="showcase-action-progress">
            <i><b /></i>
            <span><IconCheck />{t.showcaseDemoQueued}</span>
          </div>
        </article>

        <article className="showcase-window research-window">
          <header>
            <span><IconSpark />{t.showcaseResearchTitle}</span>
            <small>{t.comingNext}</small>
          </header>
          <p>{t.showcaseResearchQuestion}</p>
          <div className="showcase-materials">
            {t.showcaseMaterials.map((material, index) => (
              <div key={material.name}>
                <span>{material.name}</span>
                <strong className={index === 1 ? "down" : ""}>{material.move}</strong>
                <i><b style={{ width: material.signal }} /></i>
                <small>{material.note}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="showcase-dots" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
    </section>
  );
}
