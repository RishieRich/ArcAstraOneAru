export function defaultHomeView(metrics) {
  if (metrics?.has_receivables_data) return "receivables";
  if (metrics?.has_financial_data) return "financial";
  return "receivables";
}

export function homeNavigationState(current, metrics) {
  return {
    ...current,
    view: defaultHomeView(metrics),
    showUpload: false,
    chatOpen: false,
    showCleanup: false,
    toolsOpen: false,
  };
}

export function workspaceLocation(view, t, researchSection = "home") {
  if (view === "financial") {
    return { area: t.financialView, subsection: t.financialViewSub };
  }
  if (view === "research") {
    const knownSection = ["home", "icp", "customers", "suppliers"].includes(researchSection)
      ? researchSection
      : "home";
    return { area: t.research.nav, subsection: t.research[knownSection] };
  }
  return { area: t.receivablesView, subsection: t.receivablesViewSub };
}
