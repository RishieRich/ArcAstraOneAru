import { formatMoney, formatMonth } from "../api";
import { IconCalendar } from "../icons";

/* Money by due month, stacked overdue (status red) vs on-track (series blue).
   Two segments with a hairline gap; legend below names them. */
export default function DueTimeline({ timeline, t }) {
  const max = Math.max(...timeline.map((m) => m.overdue + m.on_track), 1);

  return (
    <div className="card">
      <h3><span className="ico"><IconCalendar /></span>{t.dueTimeline}</h3>
      <p className="sub">{t.dueTimelineSub}</p>

      {timeline.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <>
          <div className="bars">
            {timeline.map((m) => {
              const total = m.overdue + m.on_track;
              return (
                <div className="bar-row" key={m.month}>
                  <div className="name">{formatMonth(m.month)}</div>
                  <div className="bar-track" style={{ gap: 2 }}>
                    {m.overdue > 0 && (
                      <div className="bar-fill seg" style={{
                        width: `${(m.overdue / max) * 100}%`,
                        background: "var(--critical)",
                      }} title={`${formatMonth(m.month)} · ${t.overdue}: ${formatMoney(m.overdue)}`} />
                    )}
                    {m.on_track > 0 && (
                      <div className="bar-fill seg" style={{
                        width: `${(m.on_track / max) * 100}%`,
                        background: "var(--series-1)",
                      }} title={`${formatMonth(m.month)} · ${t.onTrack}: ${formatMoney(m.on_track)}`} />
                    )}
                  </div>
                  <div className="val">
                    {formatMoney(total, { compact: true })}
                    <small>{t.invoices(m.bills)}</small>
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
