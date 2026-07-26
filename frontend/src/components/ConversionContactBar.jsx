import { IconMessage, IconSpark } from "../icons";

export default function ConversionContactBar({ t }) {
  return (
    <aside className="conversion-contact" aria-label={t.fullAccessContact}>
      <span className="conversion-spark"><IconSpark /></span>
      <div>
        <strong>{t.fullAccessCta}</strong>
        <small>{t.fullAccessCtaBody}</small>
      </div>
      <a className="conversion-call" href={`tel:${t.contactPhone.replace(/\s/g, "")}`}>
        <IconMessage />
        {t.contactPhone}
      </a>
      <a href={`mailto:${t.contactEmail}`}>{t.contactEmail}</a>
    </aside>
  );
}
