import { useId } from "react";

export default function BusinessSummary({
  eyebrow,
  title,
  body,
  facts = [],
  source,
  period,
  freshness,
  nextLabel,
  nextText,
  nextHref,
  notice,
  copy,
  className = "",
}) {
  const titleId = useId();
  return (
    <section className={`answer-summary ${className}`.trim()} aria-labelledby={titleId}>
      <div className="answer-summary-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 id={titleId}>{title}</h2>
        <p>{body}</p>
        {notice && <p className="answer-summary-notice">{notice}</p>}
      </div>

      <div className="answer-facts">
        {facts.map((fact) => (
          <article className={fact.tone || ""} key={fact.key || fact.label}>
            <span>{fact.label}</span>
            <strong>{fact.value}</strong>
            {fact.help && <small>{fact.help}</small>}
          </article>
        ))}
      </div>

      <dl className="answer-context">
        <div><dt>{copy.source}</dt><dd>{source}</dd></div>
        <div><dt>{copy.period}</dt><dd>{period}</dd></div>
        <div><dt>{copy.freshness}</dt><dd>{freshness}</dd></div>
      </dl>

      {nextText && (
        <div className="answer-next">
          <strong>{nextLabel}</strong>
          {nextHref
            ? <a href={nextHref}>{nextText}</a>
            : <span>{nextText}</span>}
        </div>
      )}
    </section>
  );
}
