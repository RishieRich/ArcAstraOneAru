import { useEffect, useId, useMemo, useState } from "react";
import {
  chartExtent,
  comparisonFromPrevious,
  directLabelIndexes,
  donutEligibility,
  shareOfPositiveTotal,
} from "../chartModel.js";
import {
  buildSmartPresentation,
  formatSmartValue,
  smartUnitKey,
} from "../smartPresentation.js";
import BusinessSummary from "./BusinessSummary.jsx";
import BusinessChart, {
  ChartTooltip,
  useChartSelection,
} from "./BusinessChart.jsx";
import {
  IconChart,
  IconCheck,
  IconSpark,
  IconTrendUp,
} from "../icons";

const CHART_COLORS = [
  "#18a86b",
  "#4467f2",
  "#f2a33a",
  "#e15d6f",
  "#8a63e8",
  "#20a8bd",
  "#7b8c4d",
  "#cf6fa8",
];

function aggregationCopy(aggregation, t) {
  if (aggregation === "sum") return t.ux.aggregationSum;
  if (aggregation === "count") return t.ux.aggregationCount;
  return t.smartAggregation?.[aggregation] || t.ux.aggregationUnknown;
}

function unitCopy(format, aggregation, t) {
  return t.ux[smartUnitKey(format, aggregation)] || t.ux.unknownUnit;
}

function kpiLabel(kpi, t) {
  const render = t.smartKpiLabels?.[kpi.label_key];
  if (render) return render(kpi.source_label);
  return kpi.source_label || t.ux.notSupplied;
}

function kpiFact(kpi, index, t) {
  const aggregation = kpi.aggregation || "unknown";
  return {
    key: `${kpi.key || "kpi"}-${index}`,
    label: kpiLabel(kpi, t),
    value: formatSmartValue(kpi.value, kpi.format),
    help: `${aggregationCopy(aggregation, t)} · ${unitCopy(kpi.format, aggregation, t)}`,
  };
}

function warningCopy(warning, t) {
  const copy = t.ux;
  if (warning.key === "totalRows") return copy.warningTotalRows(warning.count);
  if (warning.key === "duplicates") return copy.warningDuplicates(warning.count);
  if (warning.key === "noMetric") return copy.warningNoMetric;
  if (warning.key === "noDate") return copy.warningNoDate;
  if (warning.key === "rowLimit") return copy.warningRowLimit;
  if (warning.key === "sheetLimit") return copy.warningSheetLimit;
  if (warning.key === "skippedSheets") return copy.warningSkippedSheets;
  return copy.smartWarningGeneric;
}

function formatFreshness(value, t) {
  if (!value) return t.ux.notSupplied;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return t.ux.notSupplied;
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceCopy(presentation, t) {
  const source = t.ux.smartSource(presentation.sheet || t.ux.notSupplied);
  return presentation.filename ? `${presentation.filename} · ${source}` : source;
}

function summaryPeriod(presentation, t) {
  const scope = `${t.smartRowCount(presentation.rows)} · ${t.ux.allRowsScope}`;
  if (!presentation.trendPeriod) return scope;
  return `${scope} ${t.ux.trendShownPeriod(
    presentation.trendPeriod.first,
    presentation.trendPeriod.last,
  )}`;
}

function summaryBody(presentation, t) {
  if (presentation.metric && presentation.dimension) {
    return t.ux.smartBody(presentation.metric, presentation.dimension);
  }
  return [
    !presentation.metric ? t.ux.smartMissingMetric : null,
    !presentation.dimension ? t.ux.smartMissingDimension : null,
  ].filter(Boolean).join(" ");
}

function nextCheck(presentation, t) {
  if (presentation.warnings.length) {
    return `${warningCopy(presentation.warnings[0], t)} ${t.ux.smartNext}`;
  }
  if (!presentation.metric) return `${t.ux.smartMissingMetric} ${t.ux.smartNext}`;
  if (!presentation.dimension) return `${t.ux.smartMissingDimension} ${t.ux.smartNext}`;
  if (smartUnitKey(presentation.format, presentation.aggregation) === "unknownUnit") {
    return `${t.ux.unknownUnit}. ${t.ux.smartNext}`;
  }
  return t.ux.smartNext;
}

function comparisonCopy(points, index, format, t) {
  const comparison = comparisonFromPrevious(points, index);
  if (!comparison) return null;
  if (comparison.direction === "same") return t.ux.markComparedSame;
  if (comparison.percent === null) {
    return `${formatSmartValue(comparison.previous, format)} → ${formatSmartValue(
      points[index].value,
      format,
    )}`;
  }
  const percent = Math.abs(comparison.percent).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  return comparison.direction === "up"
    ? t.ux.markComparedUp(percent)
    : t.ux.markComparedDown(percent);
}

function safeChartCopy(view, presentation, t) {
  const metric = view.metric || (view.id === "mix" ? t.smartMeasures : t.ux.notSupplied);
  const dimension = view.dimension || (view.id === "mix" ? t.ux.series : t.ux.notSupplied);
  const titleRenderer = t.smartChartTitles?.[view.id];
  const subtitleRenderer = t.smartChartSubtitles?.[view.id];
  const title = titleRenderer
    ? titleRenderer(metric, dimension)
    : t.smartExplorerTitle;
  const baseSubtitle = subtitleRenderer
    ? subtitleRenderer(metric, dimension)
    : t.ux.smartChartSummary(metric, dimension);
  const aggregation = aggregationCopy(view.aggregation, t);
  const unit = unitCopy(view.format, view.aggregation, t);
  const period = view.period
    ? t.ux.trendShownPeriod(view.period.first, view.period.last)
    : t.ux.allRowsScope;
  const summary = view.id === "mix"
    ? t.ux.donutCaveat
    : view.metric && view.dimension
      ? t.ux.smartChartSummary(view.metric, view.dimension)
      : [
          !view.metric ? t.ux.smartMissingMetric : null,
          !view.dimension ? t.ux.smartMissingDimension : null,
        ].filter(Boolean).join(" ");
  return {
    metric,
    dimension,
    title,
    subtitle: `${baseSubtitle} · ${t.ux.grouping}: ${dimension} · ${t.ux.aggregation}: ${aggregation}`,
    aggregation,
    unit,
    period,
    summary,
    source: sourceCopy(presentation, t),
    freshness: formatFreshness(presentation.lastImportAt, t),
  };
}

function chartFacts(view, copy, t) {
  return view.points.map((point, index) => {
    const label = point.label || t.ux.notSupplied;
    const missing = point.value === null;
    const value = missing ? t.ux.notSupplied : formatSmartValue(point.value, view.format);
    const comparison = view.id === "trend"
      ? comparisonCopy(view.points, index, view.format, t)
      : null;
    const shareValue = view.type === "donut"
      ? shareOfPositiveTotal(point.value, view.points)
      : null;
    const share = shareValue === null
      ? null
      : formatSmartValue(shareValue, "percent");
    const metric = view.id === "mix" ? label : copy.metric;
    const spokenValue = missing ? t.ux.missingValue : value;
    return {
      ...point,
      label,
      metric,
      value,
      rawNumericValue: point.value,
      comparison,
      share,
      interpretation: missing ? t.ux.missingValue : copy.summary,
      ariaLabel: `${label}. ${t.ux.metric}: ${metric}. ${t.ux.value}: ${spokenValue}.`,
    };
  });
}

function directLabelKind(points, index, t) {
  const valid = points
    .map((point, pointIndex) => ({ pointIndex, value: point.value }))
    .filter((point) => point.value !== null);
  if (!valid.length) return t.ux.latest;
  if (index === valid.at(-1).pointIndex) return t.ux.latest;
  const highest = valid.reduce(
    (winner, point) => (point.value > winner.value ? point : winner),
    valid[0],
  );
  return index === highest.pointIndex ? t.ux.highest : t.ux.lowest;
}

function lineSegments(points, x, y) {
  const segments = [];
  let current = [];
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push(`${x(index)},${y(point.value)}`);
  });
  if (current.length) segments.push(current);
  return segments;
}

function SmartLineChart({ view, facts, t }) {
  const selection = useChartSelection();
  const width = 680;
  const height = 260;
  const left = 82;
  const right = 28;
  const top = 42;
  const bottom = 54;
  const extent = chartExtent(view.points.map((point) => point.value));
  const range = extent.maximum - extent.minimum || 1;
  const x = (index) => left
    + (index / Math.max(view.points.length - 1, 1)) * (width - left - right);
  const y = (value) => top
    + ((extent.maximum - value) / range) * (height - top - bottom);
  const labelStep = Math.max(1, Math.ceil(view.points.length / 7));
  const directLabels = new Set(directLabelIndexes(view.points));
  const ticks = [...new Set([
    extent.minimum,
    extent.minimum + range / 2,
    extent.maximum,
  ])];

  if (!extent.hasValues) {
    return <p className="smart-chart-empty" role="status">{t.ux.noChartValues}</p>;
  }

  return (
    <>
      <svg
        className="smart-line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={t.ux.interactionHint}
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={left}
              x2={width - right}
              y1={y(value)}
              y2={y(value)}
              className="smart-chart-gridline"
            />
            <text
              x={left - 10}
              y={y(value) + 4}
              textAnchor="end"
              style={{ fontSize: 12 }}
            >
              {formatSmartValue(value, view.format, { compact: true })}
            </text>
          </g>
        ))}
        {extent.minimum < 0 && extent.maximum > 0 && (
          <line
            x1={left}
            x2={width - right}
            y1={y(0)}
            y2={y(0)}
            className="smart-chart-gridline smart-chart-zero"
          />
        )}
        {lineSegments(view.points, x, y).map((segment, index) => (
          <polyline
            className="smart-line-path"
            points={segment.join(" ")}
            key={`segment-${index}`}
          />
        ))}
        {view.points.map((point, index) => {
          const fact = facts[index];
          const active = selection.active?.key === fact.key;
          const anchor = index === 0 ? "start" : index === view.points.length - 1 ? "end" : "middle";
          return (
            <g key={point.key}>
              {point.value !== null && directLabels.has(index) && (
                <text
                  x={x(index)}
                  y={y(point.value) < 64 ? y(point.value) + 22 : y(point.value) - 19}
                  textAnchor={anchor}
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  <tspan x={x(index)}>{directLabelKind(view.points, index, t)}</tspan>
                  <tspan x={x(index)} dy="14">
                    {formatSmartValue(point.value, view.format, { compact: true })}
                  </tspan>
                </text>
              )}
              {point.value !== null && (
                <g className="chart-mark" {...selection.bind(fact)}>
                  <circle
                    cx={x(index)}
                    cy={y(point.value)}
                    r="14"
                    style={{ fill: "transparent", stroke: "transparent", cursor: "pointer" }}
                  />
                  <circle
                    cx={x(index)}
                    cy={y(point.value)}
                    r={active ? 6 : 4}
                    pointerEvents="none"
                  />
                  <title>{fact.ariaLabel}</title>
                </g>
              )}
              {(index % labelStep === 0 || index === view.points.length - 1) && (
                <text
                  x={x(index)}
                  y={height - 16}
                  textAnchor={anchor}
                  style={{ fontSize: 12 }}
                >
                  {point.label || t.ux.notSupplied}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ChartTooltip
        fact={selection.active}
        copy={t.ux}
        id={selection.tooltipId}
      />
    </>
  );
}

function shortenedLabel(label) {
  return label.length > 24 ? `${label.slice(0, 23)}…` : label;
}

function SmartBarChart({ view, facts, t }) {
  const selection = useChartSelection();
  const width = 680;
  const rowHeight = 46;
  const height = Math.max(112, view.points.length * rowHeight + 24);
  const plotLeft = 178;
  const plotRight = width - 118;
  const extent = chartExtent(view.points.map((point) => point.value));
  const range = extent.maximum - extent.minimum || 1;
  const x = (value) => plotLeft
    + ((value - extent.minimum) / range) * (plotRight - plotLeft);
  const zeroX = x(0);

  if (!extent.hasValues) {
    return <p className="smart-chart-empty" role="status">{t.ux.noChartValues}</p>;
  }

  return (
    <>
      <svg
        className="smart-bar-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={t.ux.interactionHint}
      >
        <line
          x1={zeroX}
          x2={zeroX}
          y1="5"
          y2={height - 5}
          className="smart-chart-gridline smart-chart-zero"
        />
        {view.points.map((point, index) => {
          const fact = facts[index];
          const centerY = 24 + index * rowHeight;
          const valueX = point.value === null ? zeroX : x(point.value);
          const active = selection.active?.key === fact.key;
          return (
            <g
              className="chart-mark"
              {...selection.bind(fact)}
              key={point.key}
            >
              <rect
                x="0"
                y={centerY - 18}
                width={width}
                height="36"
                rx="6"
                style={{
                  fill: active ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                }}
              />
              <text x="6" y={centerY + 4} style={{ fontSize: 12 }}>
                {shortenedLabel(fact.label)}
              </text>
              {point.value !== null && (
                <rect
                  x={Math.min(zeroX, valueX)}
                  y={centerY - 7}
                  width={Math.abs(valueX - zeroX)}
                  height="14"
                  rx="4"
                  fill={CHART_COLORS[0]}
                  pointerEvents="none"
                />
              )}
              <text
                x={width - 6}
                y={centerY + 4}
                textAnchor="end"
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {fact.value}
              </text>
              <title>{fact.ariaLabel}</title>
            </g>
          );
        })}
      </svg>
      <ChartTooltip
        fact={selection.active}
        copy={t.ux}
        id={selection.tooltipId}
      />
    </>
  );
}

function SmartDonut({ view, facts, eligibility, copy, t }) {
  const selection = useChartSelection();
  if (!eligibility.eligible) {
    return <p className="smart-chart-empty" role="status">{t.ux.donutUnavailable}</p>;
  }

  let cursor = 0;
  const segments = view.points.map((point, index) => {
    const share = (point.value / eligibility.total) * 100;
    const segment = { index, share, start: cursor };
    cursor += share;
    return segment;
  });

  return (
    <>
      <div className="smart-donut-wrap">
        <svg
          className="smart-donut"
          viewBox="0 0 180 180"
          role="group"
          aria-label={t.ux.interactionHint}
        >
          <circle cx="90" cy="90" r="56" fill="none" stroke="var(--surface-3)" strokeWidth="24" />
          {segments.map((segment) => {
            const fact = facts[segment.index];
            const active = selection.active?.key === fact.key;
            const angle = (segment.start + segment.share / 2) * 3.6 - 90;
            const radians = angle * (Math.PI / 180);
            return (
              <g key={fact.key}>
                <circle
                  className="chart-mark"
                  {...selection.bind(fact)}
                  cx="90"
                  cy="90"
                  r="56"
                  fill="none"
                  pathLength="100"
                  stroke={CHART_COLORS[segment.index % CHART_COLORS.length]}
                  strokeDasharray={`${segment.share} ${100 - segment.share}`}
                  strokeWidth={active ? 29 : 24}
                  transform={`rotate(${segment.start * 3.6 - 90} 90 90)`}
                  style={{ cursor: "pointer" }}
                >
                  <title>{fact.ariaLabel}</title>
                </circle>
                {segment.share >= 5 && (
                  <text
                    className="smart-donut-index"
                    x={90 + Math.cos(radians) * 56}
                    y={94 + Math.sin(radians) * 56}
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {segment.index + 1}
                  </text>
                )}
              </g>
            );
          })}
          <text
            x="90"
            y="86"
            textAnchor="middle"
            style={{ fill: "var(--text-primary)", fontSize: 15, fontWeight: 800 }}
          >
            {formatSmartValue(eligibility.total, view.format, { compact: true })}
          </text>
          <text
            x="90"
            y="105"
            textAnchor="middle"
            style={{ fill: "var(--text-muted)", fontSize: 12 }}
          >
            {copy.unit}
          </text>
        </svg>
        <div className="smart-donut-legend">
          {facts.map((fact, index) => {
            const active = selection.active?.key === fact.key;
            return (
              <div
                className={`chart-mark-button${active ? " active" : ""}`}
                {...selection.bind(fact)}
                key={fact.key}
              >
                <i
                  aria-hidden="true"
                  style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                >
                  {index + 1}
                </i>
                <span>{fact.label}</span>
                <strong>{`${fact.value} · ${fact.share || t.ux.notSupplied}`}</strong>
              </div>
            );
          })}
        </div>
      </div>
      <ChartTooltip
        fact={selection.active}
        copy={t.ux}
        id={selection.tooltipId}
      />
    </>
  );
}

function chartColumns(view, t) {
  const columns = [
    { key: "label", label: t.ux.category },
    { key: "value", label: t.ux.value, numeric: true },
  ];
  if (view.id === "trend") {
    columns.push({
      key: "comparison",
      label: t.ux.comparison,
      render: (row) => row.comparison || t.ux.notSupplied,
    });
  }
  if (view.type === "donut") {
    columns.push({
      key: "share",
      label: t.ux.share,
      numeric: true,
      render: (row) => row.share || t.ux.notSupplied,
    });
  }
  return columns;
}

function SmartChart({ view, presentation, t }) {
  const copy = safeChartCopy(view, presentation, t);
  const facts = chartFacts(view, copy, t);
  const eligibility = view.type === "donut"
    ? donutEligibility(view.points)
    : null;
  const summary = view.type === "donut" && !eligibility.eligible
    ? t.ux.donutUnavailable
    : copy.summary;

  return (
    <BusinessChart
      title={copy.title}
      subtitle={copy.subtitle}
      metric={copy.metric}
      unit={copy.unit}
      period={copy.period}
      source={copy.source}
      freshness={copy.freshness}
      axes={view.type === "line" || view.type === "bar"
        ? { x: copy.dimension, y: `${copy.metric} · ${copy.unit}` }
        : null}
      summary={summary}
      rows={facts}
      columns={chartColumns(view, t)}
      copy={t.ux}
      className={`smart-chart-card ${view.type === "line" ? "line" : view.type}`}
      icon={<IconChart />}
    >
      {view.type === "line" && <SmartLineChart view={view} facts={facts} t={t} />}
      {view.type === "bar" && <SmartBarChart view={view} facts={facts} t={t} />}
      {view.type === "donut" && (
        <SmartDonut view={view} facts={facts} eligibility={eligibility} copy={copy} t={t} />
      )}
      {view.type === "unknown" && (
        <p className="smart-chart-empty" role="status">{t.ux.noChartValues}</p>
      )}
    </BusinessChart>
  );
}

function SupportingKpi({ kpi, index, t }) {
  const fact = kpiFact(kpi, index, t);
  return (
    <article style={{ "--smart-delay": `${index * 70}ms` }}>
      <span>{fact.label}</span>
      <strong>{fact.value}</strong>
      <small>{fact.help}</small>
    </article>
  );
}

export default function SmartDataExplorer({ smartData, t }) {
  const [selectedSheet, setSelectedSheet] = useState(0);
  const tabBase = useId();
  const datasets = smartData?.datasets || [];

  useEffect(() => {
    setSelectedSheet(0);
  }, [smartData?.import_id]);

  const safeSelectedSheet = datasets[selectedSheet] ? selectedSheet : 0;
  const dataset = datasets[safeSelectedSheet];
  const confidence = useMemo(
    () => Math.round((Number(dataset?.confidence) || 0) * 100),
    [dataset],
  );
  const presentation = useMemo(
    () => dataset ? buildSmartPresentation(smartData, dataset) : null,
    [dataset, smartData],
  );
  if (!dataset || !presentation) return null;

  function moveSheetTab(event, index) {
    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % datasets.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + datasets.length) % datasets.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = datasets.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setSelectedSheet(nextIndex);
    event.currentTarget.parentElement
      ?.querySelectorAll('[role="tab"]')[nextIndex]
      ?.focus();
  }

  const metric = presentation.metric || t.ux.notSupplied;
  const grouping = presentation.dimension || t.ux.notSupplied;
  const aggregation = aggregationCopy(presentation.aggregation, t);
  const unit = unitCopy(presentation.format, presentation.aggregation, t);
  const domain = t.smartDomains?.[dataset.domain] || t.ux.smartDomainOther;
  const allColumns = [
    ...(dataset.date_columns || []),
    ...(dataset.dimension_columns || []),
    ...(dataset.metric_columns || []),
  ];

  return (
    <section className="smart-explorer">
      <BusinessSummary
        eyebrow={(
          <>
            <IconSpark width={14} height={14} />
            {t.ux.smartEyebrow}
          </>
        )}
        title={t.ux.smartTitle}
        body={summaryBody(presentation, t)}
        facts={presentation.summaryKpis.map((kpi, index) => kpiFact(kpi, index, t))}
        source={sourceCopy(presentation, t)}
        period={summaryPeriod(presentation, t)}
        freshness={formatFreshness(presentation.lastImportAt, t)}
        nextLabel={t.ux.nextCheck}
        nextText={nextCheck(presentation, t)}
        notice={t.ux.smartGenericNotice}
        copy={t.ux}
        className="smart-answer-summary"
      />

      {datasets.length > 1 && (
        <div className="smart-sheet-tabs" role="tablist" aria-label={t.smartSheets}>
          {datasets.map((item, index) => (
            <button
              type="button"
              role="tab"
              id={`${tabBase}-tab-${index}`}
              aria-controls={`${tabBase}-panel`}
              key={`${item.sheet_name}-${index}`}
              aria-selected={safeSelectedSheet === index}
              tabIndex={safeSelectedSheet === index ? 0 : -1}
              onClick={() => setSelectedSheet(index)}
              onKeyDown={(event) => moveSheetTab(event, index)}
            >
              <span>{item.sheet_name}</span>
              <small>{t.smartRowCount(item.rows)}</small>
            </button>
          ))}
        </div>
      )}

      <div
        id={`${tabBase}-panel`}
        role={datasets.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={datasets.length > 1 ? `${tabBase}-tab-${safeSelectedSheet}` : undefined}
        className="smart-dataset-panel"
      >
        <dl className="chart-context smart-meaning-context">
          <div><dt>{t.ux.sheet}</dt><dd>{dataset.sheet_name}</dd></div>
          <div><dt>{t.ux.metric}</dt><dd>{metric}</dd></div>
          <div><dt>{t.ux.grouping}</dt><dd>{grouping}</dd></div>
          <div><dt>{t.ux.aggregation}</dt><dd>{aggregation}</dd></div>
          <div><dt>{t.ux.unit}</dt><dd>{unit}</dd></div>
        </dl>

        {presentation.supportingKpis.length > 0 && (
          <div className="smart-kpis">
            {presentation.supportingKpis.map((kpi, index) => (
              <SupportingKpi key={`${kpi.key || "kpi"}-${index}`} kpi={kpi} index={index} t={t} />
            ))}
          </div>
        )}

        <div className="smart-chart-grid">
          {presentation.charts.map((chart, index) => (
            <SmartChart key={`${chart.id}-${index}`} view={chart} presentation={presentation} t={t} />
          ))}
        </div>

        <details className="smart-intelligence-strip">
          <summary>
            <span className="smart-strip-icon"><IconCheck /></span>
            <span>
              <strong>{t.ux.technicalProfile}</strong>
              <small>{t.smartColumnsMappedBody}</small>
            </span>
          </summary>
          <div className="smart-dataset-head">
            <div>
              <span className={`smart-domain ${presentation.domainKey}`}>{domain}</span>
              <h3>{`${domain} · ${dataset.sheet_name}`}</h3>
              <p>{t.smartDatasetUnderstood(
                (dataset.metric_columns || []).length,
                (dataset.dimension_columns || []).length,
              )}</p>
            </div>
            <div className="smart-confidence">
              <span>{t.smartConfidence}</span>
              <strong>{confidence}%</strong>
              <i
                role="progressbar"
                aria-label={t.smartConfidence}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={confidence}
              >
                <b style={{ width: `${confidence}%` }} />
              </i>
              <p>{t.smartConfidenceHelp}</p>
            </div>
          </div>
          <div className="smart-column-pills" aria-label={t.smartColumnsMapped}>
            {allColumns.slice(0, 12).map((column) => (
              <span key={column.key} className={column.role}>{column.label}</span>
            ))}
          </div>
        </details>

        {presentation.warnings.length > 0 && (
          <div className="smart-notes" role="note">
            <IconTrendUp />
            <div>
              <strong>{t.smartHonestNotes}</strong>
              {presentation.warnings.map((warning) => (
                <div key={warning.id}>
                  <p>{warningCopy(warning, t)}</p>
                  {warning.sheetNames?.length > 0 && (
                    <small>{warning.sheetNames.join(", ")}</small>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
