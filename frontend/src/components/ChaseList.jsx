import { formatMoney } from "../api";
import { IconFlag } from "../icons";

/* The bills to phone about today: oldest overdue first. */
export default function ChaseList({ bills, t }) {
  return (
    <div className="card">
      <h3><span className="ico"><IconFlag /></span>{t.chase}</h3>
      <p className="sub">{t.chaseSub}</p>

      {bills.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div>
          {bills.map((b, i) => (
            <div className="chase-row" key={`${b.party}-${b.bill_ref}-${i}`}>
              <div className="chase-days">
                {b.overdue_days}
                <small>{t.daysShort.toUpperCase()}</small>
              </div>
              <div className="chase-body">
                <div className="who">{b.party}</div>
                <div className="ref">
                  {t.billRef} {b.bill_ref || "—"} · {t.due} {b.due_date || "—"}
                </div>
              </div>
              <div className="chase-amt">{formatMoney(b.amount, { compact: true })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
