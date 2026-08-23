export default function BrandLogo({
  className = "",
  compact = false,
  homeLabel,
  onHome,
}) {
  const classes = `brand-logo${compact ? " compact" : ""}${className ? ` ${className}` : ""}`;
  if (onHome) {
    return (
      <button
        className={`${classes} brand-logo-button`}
        type="button"
        onClick={onHome}
        aria-label={homeLabel}
        title={homeLabel}
      >
        <img src="/arq-logo.jpeg" alt="" aria-hidden="true" />
      </button>
    );
  }
  return (
    <span className={classes}>
      <img src="/arq-logo.jpeg" alt="ARQ One AI Labs" />
    </span>
  );
}
