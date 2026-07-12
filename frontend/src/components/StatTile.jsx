export default function StatTile({ label, value, foot, alert }) {
  return (
    <div className="card tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {foot && <div className={`foot${alert ? " alert" : ""}`}>{foot}</div>}
    </div>
  );
}
