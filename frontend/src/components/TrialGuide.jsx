import {
  IconChart,
  IconCheck,
  IconFile,
  IconMessage,
  IconSpark,
  IconUpload,
} from "../icons";

export default function TrialGuide({ t, onUpload, onAsk }) {
  return (
    <section className="trial-guide">
      <div className="trial-welcome">
        <div>
          <span className="eyebrow">
            <IconSpark width={14} height={14} />
            {t.trialWorkspaceReady}
          </span>
          <h2>{t.trialWelcomeTitle}</h2>
          <p>{t.trialWelcomeBody}</p>
          <div className="trial-welcome-actions">
            <button type="button" className="primary-cta" onClick={onUpload}>
              <IconUpload width={16} height={16} />
              {t.uploadMyWorkbook}
            </button>
            <button type="button" className="secondary-cta" onClick={onAsk}>
              <IconMessage width={16} height={16} />
              {t.seeAskArq}
            </button>
          </div>
        </div>
        <div className="trial-file-stack" aria-hidden="true">
          <span className="sales"><IconChart /></span>
          <span className="purchase"><IconFile /></span>
          <span className="expense"><IconUpload /></span>
        </div>
      </div>

      <div className="trial-steps">
        {t.trialSteps.map((step, index) => (
          <article key={step.title}>
            <span className="trial-step-number">{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
            {index === 0 && <IconUpload />}
            {index === 1 && <IconChart />}
            {index === 2 && <IconMessage />}
            {index === 3 && <IconFile />}
          </article>
        ))}
      </div>

      <div className="trial-trust">
        {t.trialTrustPoints.map((point) => (
          <span key={point}><IconCheck width={14} height={14} />{point}</span>
        ))}
      </div>

      <div className="trial-future">
        <div>
          <span className="eyebrow">{t.connectMoreEyebrow}</span>
          <h3>{t.connectMoreTitle}</h3>
          <p>{t.connectMoreBody}</p>
        </div>
        <div className="trial-contact-links">
          <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
          <a href={`tel:${t.contactPhone.replace(/\s/g, "")}`}>{t.contactPhone}</a>
        </div>
      </div>
    </section>
  );
}

export function TrialBanner({ t, hasData, onUpload }) {
  return (
    <section className="trial-banner">
      <span className="trial-banner-mark"><IconSpark /></span>
      <div>
        <strong>{hasData ? t.trialDataReady : t.trialWorkspaceReady}</strong>
        <p>{hasData ? t.trialDataReadyBody : t.trialBannerBody}</p>
      </div>
      <button type="button" onClick={onUpload}>
        <IconUpload width={14} height={14} />
        {t.addAnotherWorkbook}
      </button>
      <a href={`mailto:${t.contactEmail}`}>{t.talkToTeam}</a>
    </section>
  );
}
