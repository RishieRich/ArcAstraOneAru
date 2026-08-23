import { formatMoney } from "../api";
import { IconClock } from "../icons";
import {
  formatReceivableExactMoney,
  formatReceivableShare,
} from "../receivablesChartModel";
import BusinessChart, { ChartTooltip, useChartSelection } from "./BusinessChart";

/* The ordered ramp supports scanning, while direct bucket names, exact values,
   the legend, and the data table keep colour from carrying meaning alone. */
const RAMP = ["var(--axis)", "var(--step-1)", "var(--step-2)", "var(--step-3)", "var(--step-4)"];

export default function AgingChart({ aging, t, period, source, freshness }) {
  const selection = useChartSelection();
  const rows = aging.map((bucket, index) => ({
    ...bucket,
    key: bucket.bucket,
    label: index === 0 ? t.notDue : bucket.bucket,
    value: bucket.amount,
  }));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const max = Math.max(...rows.map((row) => row.amount), 1);
  const anyAmount = rows.some((row) => row.amount > 0);
  const oldestActive = [...rows].reverse().find((bucket) => bucket.amount > 0);

  function factFor(row) {
    const exact = formatReceivableExactMoney(row.amount);
    return {
      key: row.key,
      label: row.label,
      metric: t.ux.openBillValue,
      value: exact,
      share: formatReceivableShare(row.amount, total),
      interpretation: t.invoices(row.bills),
      ariaLabel: `${row.label}. ${t.ux.openBillValue}: ${exact}. ${t.invoices(row.bills)}`,
    };
  }

  return (
    <BusinessChart
      title={t.aging}
      subtitle={t.agingSub}
      metric={t.ux.openBillValue}
      unit={t.ux.currencyUnit}
      period={period}
      source={source}
      freshness={freshness}
      axes={{ x: t.ux.amountAxis, y: t.ux.agingAxis }}
      legend={rows.map((row, index) => ({
        key: row.key,
        label: row.label,
        color: RAMP[index],
      }))}
      summary={oldestActive
        ? t.ux.agingSummary(
          oldestActive.label,
          formatMoney(oldestActive.amount, { compact: true }),
        )
        : undefined}
      rows={rows}
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
      icon={<span className="ico"><IconClock /></span>}
    >
      {!anyAmount ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div className="bars">
          {rows.map((row, index) => (
            <div className="bar-row" key={row.key}>
              <div className="name">{row.label}</div>
              <div
                className="bar-track chart-mark"
                style={{ height: 36 }}
                {...selection.bind(factFor(row))}
              >
                {row.amount > 0 && (
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max((row.amount / max) * 100, 2)}%`,
                      background: RAMP[index],
                    }}
                  />
                )}
              </div>
              <div className="val">
                {formatMoney(row.amount, { compact: true })}
                <small>{t.invoices(row.bills)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
      {anyAmount && (
        <ChartTooltip
          fact={selection.active}
          copy={t.ux}
          id={selection.tooltipId}
        />
      )}
    </BusinessChart>
  );
}
