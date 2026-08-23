import { formatMoney, formatMonth } from "../api";
import { IconCalendar } from "../icons";
import {
  formatReceivableExactMoney,
  formatReceivableShare,
} from "../receivablesChartModel";
import BusinessChart, { ChartTooltip, useChartSelection } from "./BusinessChart";

/* This is a current due-month split, not collection history. Missing due dates
   remain in portfolio totals and are reconciled in the exact table below. */
export default function DueTimeline({ timeline, coverage, t, period, source, freshness }) {
  const selection = useChartSelection();
  const rows = timeline.map((month) => ({
    ...month,
    key: month.month,
    label: month.earlier ? t.earlier : formatMonth(month.month),
    amount: month.overdue + month.on_track,
  }));
  const plottedTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  const lateTotal = rows.reduce((sum, row) => sum + row.overdue, 0);
  const onTrackTotal = rows.reduce((sum, row) => sum + row.on_track, 0);
  const max = Math.max(...rows.map((row) => row.amount), 1);
  const tableRows = coverage?.missingCount
    ? [...rows, {
      key: "missing-date",
      label: t.notAvailable,
      amount: coverage.missingAmount,
      overdue: coverage.missingOverdue,
      on_track: coverage.missingOnTrack,
      bills: coverage.missingCount,
    }]
    : rows;
  const missingNote = coverage?.missingCount
    ? ` ${t.ux.missingDueDates(coverage.missingCount)}`
    : "";

  function factFor(row) {
    const exact = formatReceivableExactMoney(row.amount);
    return {
      key: row.key,
      label: row.label,
      metric: t.ux.openBillValue,
      value: exact,
      share: formatReceivableShare(row.amount, plottedTotal),
      interpretation: `${t.ux.dueSummary(
        formatReceivableExactMoney(row.overdue),
        formatReceivableExactMoney(row.on_track),
      )} ${t.invoices(row.bills)}`,
      ariaLabel: `${row.label}. ${t.ux.openBillValue}: ${exact}. ${t.invoices(row.bills)}`,
    };
  }

  return (
    <BusinessChart
      title={t.dueTimeline}
      subtitle={t.dueTimelineSub}
      metric={t.ux.openBillValue}
      unit={t.ux.currencyUnit}
      period={period}
      source={source}
      freshness={freshness}
      axes={{ x: t.ux.amountAxis, y: t.ux.dueAxis }}
      legend={[
        { key: "overdue", label: t.overdue, color: "var(--critical)" },
        { key: "on-track", label: t.onTrack, color: "var(--series-1)" },
      ]}
      summary={`${t.ux.dueSummary(
        formatMoney(lateTotal, { compact: true }),
        formatMoney(onTrackTotal, { compact: true }),
      )}${missingNote}`}
      rows={tableRows}
      columns={[
        { key: "label", label: t.ux.category },
        {
          key: "overdue",
          label: t.ux.overdueValue,
          numeric: true,
          render: (row) => formatReceivableExactMoney(row.overdue),
        },
        {
          key: "on_track",
          label: t.ux.notLateValue,
          numeric: true,
          render: (row) => formatReceivableExactMoney(row.on_track),
        },
        {
          key: "amount",
          label: t.ux.value,
          numeric: true,
          render: (row) => formatReceivableExactMoney(row.amount),
        },
        { key: "bills", label: t.ux.billCount, numeric: true },
      ]}
      copy={t.ux}
      icon={<span className="ico"><IconCalendar /></span>}
    >
      {rows.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div className="bars">
          {rows.map((row) => (
            <div className="bar-row" key={row.key}>
              <div className="name">{row.label}</div>
              <div
                className="bar-track chart-mark"
                style={{ gap: 2, height: 36 }}
                {...selection.bind(factFor(row))}
              >
                {row.overdue > 0 && (
                  <div
                    className="bar-fill seg"
                    style={{
                      width: `${(row.overdue / max) * 100}%`,
                      background: "var(--critical)",
                    }}
                  />
                )}
                {row.on_track > 0 && (
                  <div
                    className="bar-fill seg"
                    style={{
                      width: `${(row.on_track / max) * 100}%`,
                      background: "var(--series-1)",
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
