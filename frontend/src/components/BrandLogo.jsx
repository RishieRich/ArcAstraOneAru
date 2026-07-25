export default function BrandLogo({ className = "", compact = false }) {
  return (
    <span className={`brand-logo${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}>
      <img src="/arq-logo.jpeg" alt="ARQ One AI Labs" />
    </span>
  );
}
