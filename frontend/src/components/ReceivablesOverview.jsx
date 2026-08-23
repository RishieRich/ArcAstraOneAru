import { formatMoney, formatMonth } from "../api";
import { directLabelIndexes } from "../chartModel";
import { IconChart } from "../icons";
import {
  formatReceivableExactMoney,
  formatReceivableShare,
} from "../receivablesChartModel";
import BusinessChart, { ChartTooltip, useChartSelection } from "./BusinessChart";

export default function ReceivablesOverview({ trajectory, coverage, t, period, source, freshness }) {
  const selection = useChartSelection();
  const rows = trajectory.map((month) => ({
    ...month,
    key: month.month,
    label: month.earlier ? t.earlier : formatMonth(month.month),
    value: month.amount,
  }));
  const plottedTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  const max = Math.max(...rows.map((row) => row.amount), 1);
  const directLabels = new Set(directLabelIndexes(rows));
  const tableRows = coverage?.missingCount
    ? [...rows, {
      key: "missing-date",
      label: t.notAvailable,
      value: coverage.missingAmount,
      amount: coverage.missingAmount,
      bills: coverage.missingCount,
    }]
    : rows;
  const missingNote = coverage?.missingCount
    ? ` ${t.ux.missingBillDates(coverage.missingCount)}`
    : "";

  function factFor(row) {
    const exact = formatReceivableExactMoney(row.amount);
    return {
      key: row.key,
      label: row.label,
      metric: t.ux.openBillValue,
      value: exact,
      share: formatReceivableShare(row.amount, plottedTotal),
      interpretation: `${t.invoices(row.bills)}. ${t.ux.exposureSummary}`,
      ariaLabel: `${row.label}. ${t.ux.openBillValue}: ${exact}. ${t.invoices(row.bills)}`,
    };
  }

  return (
    <BusinessChart
      title={t.openExposureTrajectory}
      subtitle={t.openExposureTrajectorySub}
      metric={t.ux.openBillValue}
      unit={t.ux.currencyUnit}
      period={period}
      source={source}
      freshness={freshness}
      axes={{ x: t.ux.exposureAxis, y: t.ux.amountAxis }}
      legend={[{ key: "open", label: t.outstanding, color: "var(--accent)" }]}
      summary={`${t.ux.exposureSummary}${missingNote}`}
      rows={tableRows}
      columns={[
        { key: "label", label: t.ux.category },
        {
          key: "amount",
          label: t.ux.value,
          numeric: true,
          render: (row) => formatReceivableExactMoney(row.amount),
        },
        { key: "bills", label: t.ux.billCount, numeric: true },
      ]}
      copy={t.ux}
      className="receivables-overview"
      icon={<span className="ico"><IconChart /></span>}
    >
      {rows.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div className="exposure-scroll">
          <div className="exposure-chart">
            {rows.map((row, index) => (
              <div className="exposure-column" key={row.key}>
                <span className="exposure-value">
                  {directLabels.has(index)
                    ? formatMoney(row.amount, { compact: true })
                    : "\u00a0"}
                </span>
                <div
                  className="exposure-track chart-mark"
                  {...selection.bind(factFor(row))}
                >
                  <i style={{ height: `${Math.max((row.amount / max) * 100, 4)}%` }} />
                </div>
                <span className="exposure-label">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <ChartTooltip
          fact={selection.active}
          copy={t.ux}
          id={selection.tooltipId}
        />
      )}
    </BusinessChart>
  );
}
