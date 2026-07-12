import { formatMoney } from "../api";

export default function BillsTable({ bills, t }) {
  return (
    <div className="card">
      <h3>{t.billsTable}</h3>
      <p className="sub">
        {bills.length} {bills.length === 1 ? "bill" : "bills"}
      </p>

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
                  <td>{b.due_date || "—"}</td>
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
