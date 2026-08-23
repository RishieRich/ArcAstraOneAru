import {
  chartExtent,
  directLabelIndexes,
  finiteChartValue,
  formatChartValue,
} from "../chartModel";
import BusinessChart, { ChartTooltip, useChartSelection } from "../components/BusinessChart";
import { T } from "../i18n";

const FIXTURES = [
  { key: "zero", points: [{ label: "Jan 26", value: 0 }] },
  { key: "negative", points: [{ label: "Jan 26", value: -125000.5 }, { label: "Feb 26", value: 75000.25 }] },
  { key: "null", points: [{ label: "Jan 26", value: null }, { label: "Feb 26", value: 40000 }] },
  { key: "missing", points: [{ label: "Jan 26" }, { label: "Feb 26", value: 40000 }] },
  { key: "one-point", points: [{ label: "Jan 26", value: 8250000.75 }] },
  {
    key: "36-periods",
    points: Array.from({ length: 36 }, (_, index) => ({
      label: `${index + 1}`,
      value: (index + 1) * 10000.25,
    })),
  },
  { key: "large", points: [{ label: "Jan 26", value: 9876543210.75 }] },
];

function FixtureChart({ fixture, t }) {
  const selection = useChartSelection();
  const extent = chartExtent(fixture.points.map((point) => point.value));
  const maxMagnitude = Math.max(Math.abs(extent.minimum), Math.abs(extent.maximum), 1);
  const labelled = new Set(directLabelIndexes(fixture.points));

  function factFor(point) {
    const exact = formatChartValue(point.value, "currency");
    return {
      key: point.label,
      label: point.label,
      metric: t.ux.value,
      value: exact,
      ariaLabel: `${point.label}. ${t.ux.value}: ${exact}`,
    };
  }

  return (
    <BusinessChart
      title={`${t.ux.sampleData}: ${fixture.key}`}
      metric={t.ux.value}
      unit={t.ux.currencyUnit}
      period={t.ux.samplePeriod}
      source={t.ux.sampleSource}
      freshness={t.notAvailable}
      axes={{ x: t.ux.category, y: t.ux.value }}
      legend={[
        { key: "positive", label: t.ux.value, color: "var(--accent)" },
        { key: "negative", label: t.ux.partialNegativeResult, color: "var(--critical)" },
      ]}
      summary={t.ux.sampleChartSummary}
      rows={fixture.points.map((point, index) => ({ ...point, key: `${point.label}-${index}` }))}
      columns={[
        { key: "label", label: t.ux.category },
        {
          key: "value",
          label: t.ux.value,
          numeric: true,
          render: (row) => formatChartValue(row.value, "currency"),
        },
      ]}
      copy={t.ux}
    >
      <div style={{ display: "grid", gap: 8, maxHeight: 460, overflow: "auto" }}>
        {fixture.points.map((point, index) => {
          const value = finiteChartValue(point.value);
          return (
            <div
              key={`${point.label}-${index}`}
              style={{ display: "grid", gridTemplateColumns: "64px minmax(100px, 1fr) 110px", gap: 8, alignItems: "center" }}
            >
              <span>{point.label}</span>
              {value === null ? (
                <span className="chart-missing-mark">{t.ux.missingValue}</span>
              ) : (
                <button
                  type="button"
                  className="chart-mark-button"
                  style={{
                    width: `${Math.max((Math.abs(value) / maxMagnitude) * 100, 2)}%`,
                    minWidth: 36,
                    minHeight: 36,
                    border: 0,
                    borderRadius: 7,
                    background: value < 0 ? "var(--critical)" : "var(--accent)",
                    cursor: "pointer",
                  }}
                  {...selection.bind(factFor(point))}
                />
              )}
              <strong>{labelled.has(index) ? formatChartValue(point.value, "currency") : "\u00a0"}</strong>
            </div>
          );
        })}
      </div>
      <ChartTooltip fact={selection.active} copy={t.ux} id={selection.tooltipId} />
    </BusinessChart>
  );
}

export default function ChartFixtureGallery() {
  const t = T.en;
  return (
    <main style={{ display: "grid", gap: 18, maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      {FIXTURES.map((fixture) => (
        <FixtureChart fixture={fixture} t={t} key={fixture.key} />
      ))}
    </main>
  );
}
