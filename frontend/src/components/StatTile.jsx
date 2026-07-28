export default function StatTile({ label, value, foot, footTone, help, icon, tone, delay = 0 }) {
  return (
    <div className={`card tile${tone ? ` ${tone}` : ""}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="top">
        <div className="label">
          {label}
          {help && <span className="tile-help" title={help} aria-label={help} tabIndex={0}>?</span>}
        </div>
        {icon && <div className="chip">{icon}</div>}
      </div>
      <div className="value">{value}</div>
      {foot && <div className={`foot${footTone ? ` ${footTone}` : ""}`}>{foot}</div>}
    </div>
  );
}
