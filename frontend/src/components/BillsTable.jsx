import { formatMoney } from "../api";
import { IconFile } from "../icons";

function friendlyDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function BillsTable({ bills, t }) {
  return (
    <div className="card bills-card">
      <h3><span className="ico"><IconFile /></span>{t.billsTable}</h3>
      <p className="sub">{t.invoices(bills.length)}</p>

      {bills.length === 0 ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.party}</th>
                <th>{t.billRef}</th>
                <th>{t.due}</th>
                <th>{t.overdueDays}</th>
                <th className="num">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b, i) => (
                <tr key={`${b.party}-${b.bill_ref}-${i}`}>
                  <td>{b.party}</td>
                  <td>{b.bill_ref || "—"}</td>
                  <td>{friendlyDate(b.due_date)}</td>
                  <td>
                    {b.overdue_days > 0 ? (
                      <span className="pill late">
                        {b.overdue_days} {t.days}
                      </span>
                    ) : (
                      <span className="pill ok">{t.notDue}</span>
                    )}
                  </td>
                  <td className="num">{formatMoney(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
