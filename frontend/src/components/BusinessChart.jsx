import { useId, useState } from "react";

export function useChartSelection() {
  const [active, setActive] = useState(null);
  const tooltipId = useId();
  function bind(fact) {
    return {
      tabIndex: 0,
      role: "button",
      "aria-label": fact.ariaLabel,
      "aria-describedby": tooltipId,
      onMouseEnter: () => setActive(fact),
      onMouseLeave: () => setActive(null),
      onFocus: () => setActive(fact),
      onBlur: () => setActive(null),
      onClick: () => setActive(fact),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActive(fact);
        } else if (event.key === "Escape") {
          setActive(null);
        }
      },
    };
  }
  return { active, bind, clear: () => setActive(null), tooltipId };
}

export function ChartTooltip({ fact, copy, id }) {
  return (
    <div
      className={`chart-tooltip${fact ? " visible" : ""}`}
      id={id}
      role="tooltip"
      aria-live="polite"
    >
      {fact ? (
        <>
          <strong>{fact.label}</strong>
          <span>{fact.metric}: <b>{fact.value}</b></span>
          {fact.comparison && <span>{copy.comparison}: {fact.comparison}</span>}
          {fact.share && <span>{copy.share}: {fact.share}</span>}
          {fact.interpretation && <small>{fact.interpretation}</small>}
        </>
      ) : (
        <span>{copy.interactionHint}</span>
      )}
    </div>
  );
}

function ChartDataTable({ title, rows, columns, copy }) {
  return (
    <details className="chart-data-details">
      <summary>{copy.showExactValues}</summary>
      <div className="table-wrap chart-data-table">
        <table>
          <caption>{copy.exactValuesFor(title)}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.numeric ? "num" : ""} scope="col" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key || `${index}-${row.label || ""}`}>
                {columns.map((column, columnIndex) => {
                  const content = column.render ? column.render(row) : row[column.key];
                  const Tag = columnIndex === 0 ? "th" : "td";
                  return (
                    <Tag
                      className={column.numeric ? "num" : ""}
                      scope={columnIndex === 0 ? "row" : undefined}
                      key={column.key}
                    >
                      {content ?? "—"}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function BusinessChart({
  title,
  subtitle,
  metric,
  unit,
  period,
  source,
  freshness,
  axes,
  legend = [],
  summary,
  rows = [],
  columns = [],
  copy,
  children,
  className = "",
  icon,
}) {
  const titleId = useId();
  const summaryId = useId();
  return (
    <section
      className={`business-chart card ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={summary ? summaryId : undefined}
    >
      <header className="business-chart-heading">
        <div>
          <h3 id={titleId}>{icon}{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>

      <dl className="chart-context">
        <div><dt>{copy.metric}</dt><dd>{metric}</dd></div>
        <div><dt>{copy.unit}</dt><dd>{unit}</dd></div>
        <div><dt>{copy.period}</dt><dd>{period}</dd></div>
        <div><dt>{copy.source}</dt><dd>{source}</dd></div>
        {freshness && <div><dt>{copy.freshness}</dt><dd>{freshness}</dd></div>}
      </dl>

      {axes && (
        <p className="chart-axes">
          <span><strong>{copy.horizontalAxis}:</strong> {axes.x}</span>
          <span><strong>{copy.verticalAxis}:</strong> {axes.y}</span>
        </p>
      )}

      {legend.length > 0 && (
        <div className="chart-legend" aria-label={copy.legend}>
          {legend.map((item) => (
            <span key={item.key || item.label}>
              <i
                className={`chart-legend-symbol ${item.shape || "square"}`}
                style={{ "--legend-color": item.color, background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {summary && <p className="chart-summary" id={summaryId}>{summary}</p>}
      <div className="business-chart-canvas">{children}</div>
      {rows.length > 0 && columns.length > 0 && (
        <ChartDataTable title={title} rows={rows} columns={columns} copy={copy} />
      )}
    </section>
  );
}
