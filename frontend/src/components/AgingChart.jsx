import { formatMoney } from "../api";
import { IconClock } from "../icons";

/* Aging buckets are ordered, so they get the ordinal blue ramp:
   light = fresh, dark = old. Each bar is directly labelled, and the
   legend below names the buckets — identity is never colour-alone. */
const RAMP = ["var(--axis)", "var(--step-1)", "var(--step-2)", "var(--step-3)", "var(--step-4)"];

export default function AgingChart({ aging, t }) {
  const max = Math.max(...aging.map((a) => a.amount), 1);
  const anyAmount = aging.some((a) => a.amount > 0);

  return (
    <div className="card">
      <h3><span className="ico"><IconClock /></span>{t.aging}</h3>
      <p className="sub">{t.agingSub}</p>

      {!anyAmount ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <>
          <div className="bars">
            {aging.map((bucket, i) => (
              <div className="bar-row" key={bucket.bucket}>
                <div className="name">{i === 0 ? t.notDue : bucket.bucket}</div>
                <div className="bar-track">
                  {bucket.amount > 0 && (
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max((bucket.amount / max) * 100, 2)}%`,
                        background: RAMP[i],
                      }}
                      title={`${bucket.bucket}: ${formatMoney(bucket.amount)}`}
                    />
                  )}
                </div>
                <div className="val">
                  {formatMoney(bucket.amount, { compact: true })}
                  <small>{t.invoices(bucket.bills)}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="legend">
            {aging.map((bucket, i) => (
              <span key={bucket.bucket}>
                <i className="swatch" style={{ background: RAMP[i] }} />
                {i === 0 ? t.notDue : bucket.bucket}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
