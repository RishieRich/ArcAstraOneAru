import { formatMoney } from "../api";
import { LANGS } from "../i18n";
import {
  IconBox,
  IconChart,
  IconCheck,
  IconFile,
  IconMessage,
  IconRupee,
  IconSpark,
  IconTrendUp,
  IconUpload,
  IconUsers,
  IconWallet,
} from "../icons";
import BrandLogo from "./BrandLogo";
import ThemeToggle from "./ThemeToggle";

const MONTHLY_SALES = [310000, 370000, 420000, 400000, 510000, 550000, 640000, 720000];
const PRODUCT_VALUES = [1240000, 980000, 710000, 450000];
const MAX_SALES = Math.max(...MONTHLY_SALES);
const MAX_PRODUCT = Math.max(...PRODUCT_VALUES);

export default function WaitlistPreview({
  t,
  lang,
  setLang,
  theme,
  setTheme,
  result,
  onBack,
}) {
  const kpis = [
    [t.demoSales, 3920000, t.demoSalesFoot, <IconChart />],
    [t.demoProfit, 1020000, t.demoProfitFoot, <IconTrendUp />],
    [t.demoMargin, "26.0%", t.demoMarginFoot, <IconRupee />],
    [t.demoOutstanding, 870000, t.demoOutstandingFoot, <IconUsers />],
  ];

  return (
    <div className="waitlist-experience">
      <header className="waitlist-topbar">
        <BrandLogo compact />
        <div className="waitlist-brand">
          <strong>ARQ Astra</strong>
          <span>{t.demoIntelligencePreview}</span>
        </div>
        <span className="demo-data-pill">
          <i />
          {t.demoDataBadge}
        </span>
        <div className="spacer" />
        <div className="lang-group">
          {LANGS.map((language) => (
            <button
              type="button"
              key={language.id}
              onClick={() => setLang(language.id)}
              aria-pressed={lang === language.id}
            >
              {language.label}
            </button>
          ))}
        </div>
        <ThemeToggle theme={theme} setTheme={setTheme} t={t} compact />
        <button className="preview-login-link" type="button" onClick={onBack}>
          {t.backToLogin}
        </button>
      </header>

      <main className="waitlist-main">
        <section className="waitlist-hero">
          <div className="waitlist-hero-copy">
            <span className="waitlist-confirmed">
              <IconCheck width={14} height={14} />
              {t.waitlistEyebrow}
            </span>
            <h1>{t.waitlistPreviewHello(result.display_name)}</h1>
            <p>{t.waitlistPreviewBody}</p>
            <div className="waitlist-hero-actions">
              <a
                className="waitlist-primary-cta"
                href={`tel:${result.contact_phone.replace(/\s/g, "")}`}
              >
                {t.callOurTeam}
                <strong>{result.contact_phone}</strong>
              </a>
              <a
                className="waitlist-secondary-cta"
                href={`mailto:${result.contact_email}`}
              >
                {t.emailOurTeam}
                <strong>{result.contact_email}</strong>
              </a>
            </div>
          </div>
          <div className="waitlist-report-teaser">
            <span className="report-teaser-kicker">
              <IconFile width={13} height={13} />
              {t.demoReportReady}
            </span>
            <strong>{t.demoExecutiveReport}</strong>
            <p>{t.demoReportBody}</p>
            <div className="report-teaser-bars">
              <i style={{ height: "38%" }} />
              <i style={{ height: "52%" }} />
              <i style={{ height: "47%" }} />
              <i style={{ height: "68%" }} />
              <i style={{ height: "82%" }} />
            </div>
            <span className="report-teaser-foot">{t.demoPrintPdf}</span>
          </div>
        </section>

        <section className="demo-dashboard" aria-label={t.demoDashboardTitle}>
          <div className="demo-dashboard-head">
            <div>
              <span className="eyebrow">{t.demoDataBadge}</span>
              <h2>{t.demoDashboardTitle}</h2>
              <p>{t.sampleForCompany(result.company_name)}</p>
            </div>
            <span className="demo-disclaimer">{t.demoDataNotice}</span>
          </div>

          <div className="demo-kpis">
            {kpis.map(([label, value, foot, icon]) => (
              <article key={label}>
                <span className="demo-kpi-icon">{icon}</span>
                <span>{label}</span>
                <strong>
                  {typeof value === "number"
                    ? formatMoney(value, { compact: true })
                    : value}
                </strong>
                <small>{foot}</small>
              </article>
            ))}
          </div>

          <div className="demo-visual-grid">
            <article className="demo-panel demo-sales-panel">
              <div className="demo-panel-head">
                <div>
                  <span>{t.demoTrendEyebrow}</span>
                  <h3>{t.demoSalesTrend}</h3>
                </div>
                <strong>+132%</strong>
              </div>
              <div
                className="demo-sales-chart"
                role="img"
                aria-label={t.demoSalesTrend}
              >
                {MONTHLY_SALES.map((value, index) => (
                  <div className="demo-month" key={t.demoMonths[index]}>
                    <span>{formatMoney(value, { compact: true })}</span>
                    <div>
                      <i style={{ height: `${(value / MAX_SALES) * 100}%` }} />
                    </div>
                    <small>{t.demoMonths[index]}</small>
                  </div>
                ))}
              </div>
              <p className="demo-panel-note">
                <IconTrendUp width={14} height={14} />
                {t.demoTrendInsight}
              </p>
            </article>

            <article className="demo-panel demo-mix-panel">
              <div className="demo-panel-head">
                <div>
                  <span>{t.demoCostEyebrow}</span>
                  <h3>{t.demoCostMix}</h3>
                </div>
              </div>
              <div className="demo-mix-body">
                <div
                  className="demo-donut"
                  role="img"
                  aria-label={t.demoCostMix}
                >
                  <div>
                    <strong>54.6%</strong>
                    <span>{t.demoLargestCost}</span>
                  </div>
                </div>
                <div className="demo-mix-list">
                  {t.demoExpenseLabels.map((label, index) => (
                    <div key={label}>
                      <i className={`mix-${index}`} />
                      <span>{label}</span>
                      <strong>{[54.6, 21.8, 14.1, 9.5][index]}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="demo-panel demo-products-panel">
              <div className="demo-panel-head">
                <div>
                  <span>{t.demoProductEyebrow}</span>
                  <h3>{t.demoTopProducts}</h3>
                </div>
                <IconBox />
              </div>
              <div className="demo-product-list">
                {t.demoProducts.map((product, index) => (
                  <div key={product}>
                    <span className="demo-product-rank">0{index + 1}</span>
                    <div>
                      <span>{product}</span>
                      <i>
                        <b
                          style={{
                            width: `${(PRODUCT_VALUES[index] / MAX_PRODUCT) * 100}%`,
                          }}
                        />
                      </i>
                    </div>
                    <strong>{formatMoney(PRODUCT_VALUES[index], { compact: true })}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="demo-panel demo-ai-panel">
              <div className="demo-ai-orb"><IconSpark /></div>
              <span className="eyebrow">{t.demoAiEyebrow}</span>
              <h3>{t.demoAiQuestion}</h3>
              <p>{t.demoAiAnswer}</p>
              <div className="demo-ai-actions">
                <span><IconMessage width={13} height={13} />{t.demoAskFollowup}</span>
                <span><IconFile width={13} height={13} />{t.demoGenerateReport}</span>
              </div>
            </article>
          </div>
        </section>

        <section className="waitlist-unlock">
          <div className="waitlist-unlock-copy">
            <span className="eyebrow">{t.waitlistMoreEyebrow}</span>
            <h2>{t.waitlistMoreTitle}</h2>
            <p>{t.waitlistMoreBody}</p>
          </div>
          <div className="waitlist-feature-grid">
            {t.waitlistUnlocks.map((feature, index) => (
              <article key={feature.title}>
                <span>
                  {index === 0 && <IconUpload />}
                  {index === 1 && <IconSpark />}
                  {index === 2 && <IconChart />}
                  {index === 3 && <IconWallet />}
                </span>
                <div>
                  <strong>{feature.title}</strong>
                  <p>{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="waitlist-final-cta">
            <div>
              <IconSpark />
              <span>
                <strong>{t.waitlistContactTitle}</strong>
                <small>{t.waitlistContactBody}</small>
              </span>
            </div>
            <a href={`tel:${result.contact_phone.replace(/\s/g, "")}`}>
              {result.contact_phone}
            </a>
            <a href={`mailto:${result.contact_email}`}>
              {result.contact_email}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
