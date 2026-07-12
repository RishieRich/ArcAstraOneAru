import { formatMoney } from "../api";
import { IconTrophy } from "../icons";

/* Ranked list with share bars — one measure, one hue, no legend
   (the title names the series). */
export default function TopDebtors({ debtors, t }) {
  const topPct = debtors[0]?.pct ?? 0;

  return (
    <div className="card">
      <h3><span className="ico"><IconTrophy /></span>{t.topDebtors}</h3>
      <p className="sub">{t.topDebtorsSub(topPct)}</p>

      {debtors.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div className="rank">
          {debtors.map((d, i) => (
            <div key={d.party}>
              <div className="rank-row">
                <div className="n">{i + 1}</div>
                <div className="who" title={d.party}>
                  {d.party}
                  <small>
                    {d.max_overdue_days > 0
                      ? `${d.max_overdue_days} ${t.days} ${t.overdueDays.toLowerCase()} · ${t.invoices(d.bills)}`
                      : `${t.notDue} · ${t.invoices(d.bills)}`}
                  </small>
                </div>
                <div className="amt">{formatMoney(d.amount, { compact: true })}</div>
                <div className="pct">{d.pct}%</div>
              </div>
              <div className="rank-bar">
                <i style={{ width: `${Math.max(d.pct, 1.5)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
