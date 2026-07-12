import { formatMoney } from "../api";
import { IconAlarm, IconCheck } from "../icons";

/* Backend sends language-neutral facts ({id, severity, data});
   the templates in i18n turn them into copy in the active language. */
export default function Alerts({ alerts, t }) {
  const fm = (v) => formatMoney(v, { compact: true });

  return (
    <div className="card">
      <h3><span className="ico"><IconAlarm /></span>{t.alerts}</h3>
      <p className="sub">{t.alertsSub}</p>

      {alerts.length === 0 ? (
        <div className="all-clear"><IconCheck />{t.allClear}</div>
      ) : (
        alerts.map((a) => {
          const render = t.alertText[a.id];
          if (!render) return null;
          const [title, desc] = render(a.data, fm);
          return (
            <div className={`alert-row ${a.severity}`} key={a.id}>
              <div className="body">
                <div className="head">
                  <span className="title">{title}</span>
                  <span className="alert-tag">
                    {a.severity === "urgent" ? t.urgent : t.watch}
                  </span>
                </div>
                <div className="desc">{desc}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
