import { formatMoney, formatMonth } from "../api";
import { IconCalendar } from "../icons";

/* Money by due month, stacked overdue (status red) vs on-track (series blue).
   Older months are combined when the available tenure would make the chart
   too tall to scan. Legends and direct labels keep meaning independent of colour. */
export default function DueTimeline({ timeline, t }) {
  const max = Math.max(...timeline.map((month) => month.overdue + month.on_track), 1);
  const lateTotal = timeline.reduce((sum, month) => sum + month.overdue, 0);
  const onTrackTotal = timeline.reduce((sum, month) => sum + month.on_track, 0);

  return (
    <div className="card">
      <h3><span className="ico"><IconCalendar /></span>{t.dueTimeline}</h3>
      <p className="sub">{t.dueTimelineSub}</p>
      {timeline.length > 0 && (
        <div className="chart-insight">
          {t.dueInsight(
            formatMoney(lateTotal, { compact: true }),
            formatMoney(onTrackTotal, { compact: true }),
          )}
        </div>
      )}

      {timeline.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <>
          <div className="bars">
            {timeline.map((month) => {
              const total = month.overdue + month.on_track;
              const label = month.earlier ? t.earlier : formatMonth(month.month);
              return (
                <div className="bar-row" key={month.month}>
                  <div className="name">{label}</div>
                  <div className="bar-track" style={{ gap: 2 }}>
                    {month.overdue > 0 && (
                      <div
                        className="bar-fill seg"
                        style={{
                          width: `${(month.overdue / max) * 100}%`,
                          background: "var(--critical)",
                        }}
                        title={`${label} · ${t.overdue}: ${formatMoney(month.overdue)}`}
                      />
                    )}
                    {month.on_track > 0 && (
                      <div
                        className="bar-fill seg"
                        style={{
                          width: `${(month.on_track / max) * 100}%`,
                          background: "var(--series-1)",
                        }}
                        title={`${label} · ${t.onTrack}: ${formatMoney(month.on_track)}`}
                      />
                    )}
                  </div>
                  <div className="val">
                    {formatMoney(total, { compact: true })}
                    <small>{t.invoices(month.bills)}</small>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="legend">
            <span><i className="swatch" style={{ background: "var(--critical)" }} />{t.overdue}</span>
            <span><i className="swatch" style={{ background: "var(--series-1)" }} />{t.onTrack}</span>
          </div>
        </>
      )}
    </div>
  );
}
