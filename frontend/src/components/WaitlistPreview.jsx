import { formatMoney } from "../api";
import {
  comparisonFromPrevious,
  directLabelIndexes,
  formatChartValue,
} from "../chartModel";
import { buildSamplePreview } from "../financePresentation";
import { LANGS } from "../i18n";
import {
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
import BusinessChart, { ChartTooltip, useChartSelection } from "./BusinessChart";
import ProductShowcase from "./ProductShowcase";
import ThemeToggle from "./ThemeToggle";

function comparisonText(comparison, t) {
  if (!comparison || comparison.percent === null) return null;
  const percent = Math.abs(comparison.percent).toFixed(1);
  if (comparison.direction === "up") return t.ux.markComparedUp(percent);
  if (comparison.direction === "down") return t.ux.markComparedDown(percent);
  return t.ux.markComparedSame;
}

function sampleFact(row, metric, format, t, comparison = null) {
  const value = formatChartValue(row.value, format, { maximumFractionDigits: 1 });
  return {
    label: row.label,
    metric,
    value,
    comparison: comparisonText(comparison, t),
    ariaLabel: `${row.label}. ${metric}. ${value}`,
  };
}

export default function WaitlistPreview({
  t,
  lang,
  setLang,
  theme,
  setTheme,
  result,
  onBack,
}) {
  const sample = buildSamplePreview(t.demoMonths, t.demoExpenseLabels, t.demoProducts);
  const salesSelection = useChartSelection();
  const costSelection = useChartSelection();
  const productSelection = useChartSelection();
  const directSales = new Set(directLabelIndexes(sample.monthly));
  const maxSales = Math.max(...sample.monthly.map((row) => row.value));
  const maxProduct = Math.max(...sample.products.map((row) => row.value));
  const kpis = [
    [t.demoSales, 3920000, t.demoSalesFoot, <IconChart />],
    [t.demoProfit, 1020000, t.demoProfitFoot, <IconTrendUp />],
    [t.demoMargin, "26.0%", t.demoMarginFoot, <IconRupee />],
    [t.demoOutstanding, 870000, t.demoOutstandingFoot, <IconUsers />],
  ];

  return (
    <div className="waitlist-experience">
      <header className="waitlist-topbar">
        <BrandLogo compact onHome={onBack} homeLabel={t.goHome} />
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
            <div className="report-teaser-bars" aria-hidden="true">
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
            <BusinessChart
              title={t.demoSalesTrend}
              subtitle={t.demoTrendEyebrow}
              metric={t.demoSales}
              unit={t.ux.currencyUnit}
              period={t.ux.samplePeriod}
              source={t.ux.sampleSource}
              freshness={t.ux.sampleFreshness}
              axes={{ x: t.ux.monthAxis, y: t.ux.amountAxis }}
              summary={`${t.ux.sampleChartSummary} ${t.ux.sampleFirstToLatest(sample.firstToLatestPercent.toFixed(1))}`}
              rows={sample.monthly}
              columns={[
                { key: "label", label: t.month },
                {
                  key: "value",
                  label: t.demoSales,
                  numeric: true,
                  render: (row) => formatChartValue(row.value, "currency"),
                },
              ]}
              copy={t.ux}
              className="demo-panel demo-sales-panel"
            >
              <div
                className="demo-sales-chart"
              >
                {sample.monthly.map((row, index) => (
                  <div
                    className="demo-month chart-mark-button"
                    key={row.key}
                    {...salesSelection.bind(sampleFact(
                      row,
                      t.demoSales,
                      "currency",
                      t,
                      comparisonFromPrevious(sample.monthly, index),
                    ))}
                  >
                    <span style={directSales.has(index) ? { opacity: 1 } : undefined}>
                      {formatChartValue(row.value, "currency", { compact: true })}
                    </span>
                    <div>
                      <i style={{ height: `${(row.value / maxSales) * 100}%` }} />
                    </div>
                    <small>{row.label}</small>
                  </div>
                ))}
              </div>
              <p className="demo-panel-note">
                <IconTrendUp width={14} height={14} />
                {t.demoTrendInsight}
              </p>
              <ChartTooltip fact={salesSelection.active} copy={t.ux} id={salesSelection.tooltipId} />
            </BusinessChart>

            <BusinessChart
              title={t.demoCostMix}
              subtitle={t.demoCostEyebrow}
              metric={t.demoCostMix}
              unit={t.ux.percentUnit}
              period={t.ux.samplePeriod}
              source={t.ux.sampleSource}
              freshness={t.ux.sampleFreshness}
              legend={sample.costs.map((row, index) => ({
                key: row.key,
                label: row.label,
                color: ["var(--purchase)", "var(--accent)", "var(--sales)", "var(--text-muted)"][index],
                shape: index % 2 ? "circle" : "square",
              }))}
              summary={t.ux.sampleChartSummary}
              rows={sample.costs}
              columns={[
                { key: "label", label: t.ux.category },
                {
                  key: "value",
                  label: t.ux.percentage,
                  numeric: true,
                  render: (row) => formatChartValue(row.value, "percent", { maximumFractionDigits: 1 }),
                },
              ]}
              copy={t.ux}
              className="demo-panel demo-mix-panel"
            >
              <div className="demo-mix-body">
                <div
                  className="demo-donut"
                  aria-hidden="true"
                >
                  <div>
                    <strong>{formatChartValue(sample.costs[0].value, "percent", { maximumFractionDigits: 1 })}</strong>
                    <span>{t.demoLargestCost}</span>
                  </div>
                </div>
                <div className="demo-mix-list">
                  {sample.costs.map((row, index) => (
                    <div
                      className="chart-mark-button"
                      key={row.key}
                      {...costSelection.bind(sampleFact(row, t.demoCostMix, "percent", t))}
                    >
                      <i className={`mix-${index}`} />
                      <span>{row.label}</span>
                      <strong>{formatChartValue(row.value, "percent", { maximumFractionDigits: 1 })}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <ChartTooltip fact={costSelection.active} copy={t.ux} id={costSelection.tooltipId} />
            </BusinessChart>

            <BusinessChart
              title={t.demoTopProducts}
              subtitle={t.demoProductEyebrow}
              metric={t.productValue}
              unit={t.ux.currencyUnit}
              period={t.ux.samplePeriod}
              source={t.ux.sampleSource}
              freshness={t.ux.sampleFreshness}
              axes={{ x: t.ux.amountAxis, y: t.productName }}
              summary={t.ux.sampleChartSummary}
              rows={sample.products}
              columns={[
                { key: "label", label: t.productName },
                {
                  key: "value",
                  label: t.productValue,
                  numeric: true,
                  render: (row) => formatChartValue(row.value, "currency"),
                },
              ]}
              copy={t.ux}
              className="demo-panel demo-products-panel"
            >
              <div className="demo-product-list">
                {sample.products.map((row, index) => (
                  <div
                    className="chart-mark-button"
                    key={row.key}
                    {...productSelection.bind(sampleFact(row, t.productValue, "currency", t))}
                  >
                    <span className="demo-product-rank">0{index + 1}</span>
                    <div>
                      <span>{row.label}</span>
                      <i>
                        <b
                          style={{
                            width: `${(row.value / maxProduct) * 100}%`,
                          }}
                        />
                      </i>
                    </div>
                    <strong>{formatChartValue(row.value, "currency")}</strong>
                  </div>
                ))}
              </div>
              <ChartTooltip fact={productSelection.active} copy={t.ux} id={productSelection.tooltipId} />
            </BusinessChart>

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

        <ProductShowcase t={t} compact />

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
