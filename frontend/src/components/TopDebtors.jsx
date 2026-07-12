import { formatMoney } from "../api";

/* One measure, one series -> one hue, no legend (the title names it).
   Overdue days ride along as text, not a second colour scale. */
export default function TopDebtors({ debtors, t }) {
  const max = Math.max(...debtors.map((d) => d.amount), 1);

  return (
    <div className="card">
      <h3>{t.topDebtors}</h3>
      <p className="sub">{t.topDebtorsSub}</p>

      {debtors.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div className="bars">
          {debtors.map((d) => (
            <div className="bar-row" key={d.party}>
              <div className="name" title={d.party}>{d.party}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max((d.amount / max) * 100, 2)}%`,
                    background: "var(--series-1)",
                  }}
                  title={`${d.party}: ${formatMoney(d.amount)}`}
                />
              </div>
              <div className="val">
                {formatMoney(d.amount, { compact: true })}
                <small>
                  {d.max_overdue_days > 0
                    ? `${d.max_overdue_days} ${t.days} ${t.overdueDays.toLowerCase()}`
                    : t.notDue}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
