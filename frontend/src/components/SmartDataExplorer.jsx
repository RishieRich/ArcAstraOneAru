import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../api";
import {
  IconChart,
  IconCheck,
  IconFile,
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

function smartKpiLabel(kpi, t) {
  const render = t.smartKpiLabels?.[kpi.label_key];
  return render ? render(kpi.source_label) : kpi.label;
}

function smartChartCopy(chart, t) {
  const title = t.smartChartTitles?.[chart.id];
  const subtitle = t.smartChartSubtitles?.[chart.id];
  return {
    ...chart,
    title: title
      ? title(chart.metric_label, chart.dimension_label)
      : chart.title,
    subtitle: subtitle
      ? subtitle(chart.metric_label, chart.dimension_label)
      : chart.subtitle,
  };
}

function smartWarningCopy(warning, t) {
  const count = Number(String(warning).match(/\d+/)?.[0] || 0);
  if (warning.includes("printed total row")) return t.smartWarnings?.totalRows?.(count) || warning;
  if (warning.includes("possible duplicates")) return t.smartWarnings?.duplicates?.(count) || warning;
  if (warning.includes("No reliable numeric")) return t.smartWarnings?.noMetric || warning;
  if (warning.includes("No reliable date")) return t.smartWarnings?.noDate || warning;
  if (warning.includes("row-analysis limit")) return t.smartWarnings?.rowLimit || warning;
  return warning;
}

function formatValue(value, format, compact = false) {
  if (format === "currency") return formatMoney(value, { compact });
  if (format === "percent") {
    return `${Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}%`;
  }
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact && Math.abs(value) >= 100000 ? "compact" : "standard",
  });
}

function SmartLineChart({ chart }) {
  const points = chart.points || [];
  const width = 680;
  const height = 230;
  const left = 28;
  const right = 18;
  const top = 22;
  const bottom = 42;
  const values = points.map((point) => Number(point.value) || 0);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const range = maximum - minimum || 1;
  const x = (index) =>
    left + (index / Math.max(points.length - 1, 1)) * (width - left - right);
  const y = (value) =>
    top + ((maximum - value) / range) * (height - top - bottom);
  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return (
    <svg
      className="smart-line-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={chart.title}
    >
      <defs>
        <linearGradient id="smart-line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18a86b" stopOpacity=".28" />
          <stop offset="100%" stopColor="#18a86b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((ratio) => {
        const value = minimum + range * ratio;
        return (
          <line
            key={ratio}
            x1={left}
            x2={width - right}
            y1={y(value)}
            y2={y(value)}
            className="smart-chart-gridline"
          />
        );
      })}
      <polygon
        className="smart-line-area"
        points={`${x(0)},${height - bottom} ${line} ${x(points.length - 1)},${height - bottom}`}
      />
      <polyline className="smart-line-path" points={line} />
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={x(index)} cy={y(point.value)} r="4">
            <title>{`${point.label}: ${formatValue(point.value, chart.format)}`}</title>
          </circle>
          {(index % labelStep === 0 || index === points.length - 1) && (
            <text x={x(index)} y={height - 16} textAnchor="middle">
              {point.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function SmartBarChart({ chart }) {
  const maximum = Math.max(1, ...(chart.points || []).map((point) => point.value));
  return (
    <div className="smart-rank-chart" role="img" aria-label={chart.title}>
      {(chart.points || []).map((point, index) => (
        <div key={`${point.label}-${index}`}>
          <span title={point.label}>{point.label}</span>
          <i>
            <b
              style={{
                width: `${Math.max((point.value / maximum) * 100, 1.5)}%`,
                background: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
          </i>
          <strong>{formatValue(point.value, chart.format, true)}</strong>
        </div>
      ))}
    </div>
  );
}

function SmartDonut({ chart, t }) {
  const points = chart.points || [];
  const total = points.reduce((sum, point) => sum + Number(point.value || 0), 0) || 1;
  let cursor = 0;
  const stops = points.map((point, index) => {
    const start = cursor;
    cursor += (point.value / total) * 100;
    return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${cursor}%`;
  });
  return (
    <div className="smart-donut-wrap">
      <div
        className="smart-donut"
        style={{ background: `conic-gradient(${stops.join(",")})` }}
        role="img"
        aria-label={chart.title}
      >
        <span>
          <strong>{points.length}</strong>
          <small>{t.smartMeasures}</small>
        </span>
      </div>
      <div className="smart-donut-legend">
        {points.map((point, index) => (
          <div key={`${point.label}-${index}`}>
            <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
            <span>{point.label}</span>
            <strong>{formatValue(point.value, chart.format, true)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartChart({ chart, t }) {
  const displayChart = smartChartCopy(chart, t);
  return (
    <article className={`smart-chart-card ${displayChart.type}`}>
      <header>
        <div>
          <h3>{displayChart.title}</h3>
          <p>{displayChart.subtitle}</p>
        </div>
        <IconChart />
      </header>
      {displayChart.type === "line" && <SmartLineChart chart={displayChart} />}
      {displayChart.type === "bar" && <SmartBarChart chart={displayChart} />}
      {displayChart.type === "donut" && <SmartDonut chart={displayChart} t={t} />}
    </article>
  );
}

export default function SmartDataExplorer({ smartData, t }) {
  const [selectedSheet, setSelectedSheet] = useState(0);
  const datasets = smartData?.datasets || [];

  useEffect(() => {
    setSelectedSheet(0);
  }, [smartData?.import_id]);

  const dataset = datasets[selectedSheet] || datasets[0];
  const confidence = useMemo(
    () => Math.round((dataset?.confidence || 0) * 100),
    [dataset],
  );
  if (!dataset) return null;

  return (
    <section className="smart-explorer">
      <div className="smart-explorer-hero">
        <div>
          <span className="eyebrow">
            <IconSpark width={14} height={14} />
            {t.smartExplorerEyebrow}
          </span>
          <h2>{t.smartExplorerTitle}</h2>
          <p>{t.smartExplorerBody}</p>
        </div>
        <div className="smart-file-fact">
          <IconFile />
          <span>
            <strong>{smartData.filename}</strong>
            <small>
              {t.smartWorkbookSummary(smartData.dataset_count, smartData.row_count)}
            </small>
          </span>
        </div>
      </div>

      {datasets.length > 1 && (
        <div className="smart-sheet-tabs" role="tablist" aria-label={t.smartSheets}>
          {datasets.map((item, index) => (
            <button
              type="button"
              role="tab"
              key={`${item.sheet_name}-${index}`}
              aria-selected={selectedSheet === index}
              onClick={() => setSelectedSheet(index)}
            >
              <span>{item.sheet_name}</span>
              <small>{t.smartRowCount(item.rows)}</small>
            </button>
          ))}
        </div>
      )}

      <div className="smart-dataset-head">
        <div>
          <span className={`smart-domain ${dataset.domain}`}>{t.smartDomains[dataset.domain] || dataset.domain}</span>
          <h3>{`${t.smartDomains[dataset.domain] || dataset.domain} · ${dataset.sheet_name}`}</h3>
          <p>{t.smartDatasetUnderstood(dataset.metric_columns.length, dataset.dimension_columns.length)}</p>
        </div>
        <div className="smart-confidence" title={t.smartConfidenceHelp}>
          <span>{t.smartConfidence}</span>
          <strong>{confidence}%</strong>
          <i><b style={{ width: `${confidence}%` }} /></i>
        </div>
      </div>

      <div className="smart-kpis">
        {(dataset.kpis || []).map((kpi, index) => (
          <article key={`${kpi.key}-${index}`} style={{ "--smart-delay": `${index * 70}ms` }}>
            <span>{smartKpiLabel(kpi, t)}</span>
            <strong>{formatValue(kpi.value, kpi.format, true)}</strong>
            <small>{t.smartAggregation[kpi.aggregation] || kpi.aggregation}</small>
          </article>
        ))}
      </div>

      <div className="smart-chart-grid">
        {(dataset.charts || []).map((chart) => (
          <SmartChart key={chart.id} chart={chart} t={t} />
        ))}
      </div>

      <div className="smart-intelligence-strip">
        <div>
          <span className="smart-strip-icon"><IconCheck /></span>
          <span>
            <strong>{t.smartColumnsMapped}</strong>
            <small>{t.smartColumnsMappedBody}</small>
          </span>
        </div>
        <div className="smart-column-pills">
          {[...(dataset.date_columns || []), ...(dataset.dimension_columns || []), ...(dataset.metric_columns || [])]
            .slice(0, 12)
            .map((column) => (
              <span key={column.key} className={column.role}>{column.label}</span>
            ))}
        </div>
      </div>

      {(dataset.warnings || []).length > 0 && (
        <div className="smart-notes">
          <IconTrendUp />
          <div>
            <strong>{t.smartHonestNotes}</strong>
            {(dataset.warnings || []).map((warning) => (
              <p key={warning}>{smartWarningCopy(warning, t)}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
