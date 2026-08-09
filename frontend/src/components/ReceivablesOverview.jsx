import { formatMoney, formatMonth } from "../api";
import { IconChart, IconClock, IconRupee } from "../icons";

export default function ReceivablesOverview({ summary, trajectory, filtered, t }) {
  const max = Math.max(...trajectory.map((month) => month.amount), 1);
  const overduePct = Math.min(Math.max(summary.overdue_pct || 0, 0), 100);

  return (
    <section className="card receivables-overview" aria-labelledby="portfolio-pulse-title">
      <div className="portfolio-heading">
        <div>
          <span className="eyebrow">{filtered ? t.filteredPortfolio : t.livePortfolio}</span>
          <h3 id="portfolio-pulse-title"><span className="ico"><IconChart /></span>{t.portfolioPulse}</h3>
          <p className="sub">{t.portfolioPulseSub}</p>
        </div>
        <span className="portfolio-total">
          <small>{t.outstanding}</small>
          <strong>{formatMoney(summary.outstanding, { compact: true })}</strong>
        </span>
      </div>

      <div className="portfolio-visual-grid">
        <div className="health-panel">
          <div
            className="health-ring"
            style={{ "--overdue-share": `${overduePct}%` }}
            role="img"
            aria-label={t.overdueShareAria(overduePct)}
          >
            <div>
              <strong>{overduePct}%</strong>
              <span>{t.overdueShare}</span>
            </div>
          </div>

          <div className="health-facts">
            <div>
              <span><IconClock />{t.ninetyPlusExposure}</span>
              <strong>{formatMoney(summary.ninety_plus_amount, { compact: true })}</strong>
              <small>{t.invoices(summary.ninety_plus_count)}</small>
            </div>
            <div>
              <span><IconRupee />{t.averageOpenBill}</span>
              <strong>{formatMoney(summary.average_bill, { compact: true })}</strong>
              <small>{t.invoices(summary.bill_count)}</small>
            </div>
          </div>
        </div>

        <div className="exposure-panel">
          <div className="exposure-heading">
            <div>
              <strong>{t.openExposureTrajectory}</strong>
              <span>{t.openExposureTrajectorySub}</span>
            </div>
            <span className="exposure-legend"><i />{t.outstanding}</span>
          </div>

          {trajectory.length === 0 ? (
            <div className="empty-mini">{t.empty}</div>
          ) : (
            <div className="exposure-scroll">
              <div className="exposure-chart">
                {trajectory.map((month) => {
                  const label = month.earlier ? t.earlier : formatMonth(month.month);
                  const height = Math.max((month.amount / max) * 100, 4);
                  return (
                    <div className="exposure-column" key={month.month}>
                      <span className="exposure-value">{formatMoney(month.amount, { compact: true })}</span>
                      <div className="exposure-track">
                        <i
                          style={{ height: `${height}%` }}
                          title={`${label}: ${formatMoney(month.amount)} · ${t.invoices(month.bills)}`}
                        />
                      </div>
                      <span className="exposure-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
