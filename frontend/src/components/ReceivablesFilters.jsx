import { hasActiveReceivableFilters } from "../receivables";

export default function ReceivablesFilters({
  filters,
  parties,
  visibleCount,
  totalCount,
  onChange,
  onReset,
  t,
}) {
  const active = hasActiveReceivableFilters(filters);
  const update = (key) => (event) => onChange({ ...filters, [key]: event.target.value });

  return (
    <section className="card receivables-filters" aria-labelledby="receivable-filters-title">
      <div className="filter-heading">
        <div>
          <h3 id="receivable-filters-title">{t.receivableFilters}</h3>
          <p className="sub">{t.receivableFiltersSub}</p>
        </div>
        <span className="filter-result">{t.matchingBills(visibleCount, totalCount)}</span>
      </div>

      <div className="filter-grid">
        <label className="filter-search">
          <span>{t.searchBills}</span>
          <input
            type="search"
            value={filters.query}
            onChange={update("query")}
            placeholder={t.searchBillsPlaceholder}
          />
        </label>

        <label>
          <span>{t.party}</span>
          <select value={filters.party} onChange={update("party")}>
            <option value="all">{t.allCustomers}</option>
            {parties.map((party) => <option key={party} value={party}>{party}</option>)}
          </select>
        </label>

        <label>
          <span>{t.aging}</span>
          <select value={filters.aging} onChange={update("aging")}>
            <option value="all">{t.allAges}</option>
            <option value="not_due">{t.notDue}</option>
            <option value="1_30">1–30 {t.days}</option>
            <option value="31_60">31–60 {t.days}</option>
            <option value="61_90">61–90 {t.days}</option>
            <option value="90_plus">90+ {t.days}</option>
          </select>
        </label>

        <label>
          <span>{t.amount}</span>
          <select value={filters.amount} onChange={update("amount")}>
            <option value="all">{t.allAmounts}</option>
            <option value="under_1l">{t.amountUnder1L}</option>
            <option value="1l_5l">{t.amount1LTo5L}</option>
            <option value="5l_10l">{t.amount5LTo10L}</option>
            <option value="10l_plus">{t.amount10LPlus}</option>
          </select>
        </label>

        <label>
          <span>{t.sortBy}</span>
          <select value={filters.sort} onChange={update("sort")}>
            <option value="amount_desc">{t.sortAmount}</option>
            <option value="overdue_desc">{t.sortOldest}</option>
            <option value="due_asc">{t.sortDueDate}</option>
            <option value="newest">{t.sortNewest}</option>
          </select>
        </label>

        <button className="filter-reset" type="button" onClick={onReset} disabled={!active}>
          {t.resetFilters}
        </button>
      </div>
    </section>
  );
}
