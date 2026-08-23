export function finiteChartValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function chartExtent(values, { includeZero = true } = {}) {
  const valid = (values || []).map(finiteChartValue).filter((value) => value !== null);
  if (!valid.length) return { minimum: 0, maximum: 1, hasValues: false };
  let minimum = Math.min(...valid);
  let maximum = Math.max(...valid);
  if (includeZero) {
    minimum = Math.min(0, minimum);
    maximum = Math.max(0, maximum);
  }
  if (minimum === maximum) {
    if (minimum === 0) return { minimum: 0, maximum: 1, hasValues: true };
    const padding = Math.max(Math.abs(minimum) * 0.1, 1);
    minimum -= padding;
    maximum += padding;
  }
  return { minimum, maximum, hasValues: true };
}

export function chartPeriod(points) {
  const labels = (points || [])
    .filter((point) => finiteChartValue(point?.value) !== null && point?.label)
    .map((point) => point.label);
  if (!labels.length) return null;
  return {
    first: labels[0],
    last: labels[labels.length - 1],
    count: labels.length,
  };
}

export function directLabelIndexes(points, {
  denseAfter = 12,
  compact = false,
} = {}) {
  const valid = (points || [])
    .map((point, index) => ({ index, value: finiteChartValue(point?.value) }))
    .filter((point) => point.value !== null);
  if (!valid.length) return [];

  const latest = valid[valid.length - 1];
  if (compact || valid.length > denseAfter) return [latest.index];

  const highest = valid.reduce(
    (winner, point) => (point.value > winner.value ? point : winner),
    valid[0],
  );
  const lowest = valid.reduce(
    (winner, point) => (point.value < winner.value ? point : winner),
    valid[0],
  );
  const selected = [latest];
  if (highest.value !== latest.value) selected.push(highest);
  if (!selected.some((point) => point.value === lowest.value)) selected.push(lowest);
  return selected.map((point) => point.index).sort((a, b) => a - b);
}

export function comparisonFromPrevious(points, index) {
  const current = finiteChartValue(points?.[index]?.value);
  if (current === null) return null;
  let previousIndex = index - 1;
  while (previousIndex >= 0 && finiteChartValue(points[previousIndex]?.value) === null) {
    previousIndex -= 1;
  }
  if (previousIndex < 0) return null;
  const previous = finiteChartValue(points[previousIndex].value);
  const delta = current - previous;
  return {
    previousIndex,
    previous,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
    percent: previous === 0 ? null : (delta / Math.abs(previous)) * 100,
  };
}

export function shareOfPositiveTotal(value, points) {
  const current = finiteChartValue(value);
  const valid = (points || []).map((point) => finiteChartValue(point?.value));
  if (current === null || current < 0 || valid.some((item) => item === null || item < 0)) {
    return null;
  }
  const total = valid.reduce((sum, item) => sum + item, 0);
  return total > 0 ? (current / total) * 100 : null;
}

export function donutEligibility(points) {
  const values = (points || []).map((point) => finiteChartValue(point?.value));
  if (values.length < 2 || values.some((value) => value === null || value < 0)) {
    return { eligible: false, reason: "invalid_values" };
  }
  const positive = values.filter((value) => value > 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (positive.length < 2 || total <= 0) {
    return { eligible: false, reason: "not_enough_positive_values" };
  }
  return { eligible: true, reason: null, total };
}

export function formatChartValue(value, format = "number", {
  compact = false,
  maximumFractionDigits = 2,
} = {}) {
  const parsed = finiteChartValue(value);
  if (parsed === null) return "—";
  const sign = parsed < 0 ? "−" : "";
  const magnitude = Math.abs(parsed);
  if (format === "currency") {
    let rendered;
    if (compact && magnitude >= 1e7) rendered = `₹${(magnitude / 1e7).toFixed(2)} Cr`;
    else if (compact && magnitude >= 1e5) rendered = `₹${(magnitude / 1e5).toFixed(2)} L`;
    else if (compact && magnitude >= 1e3) rendered = `₹${(magnitude / 1e3).toFixed(1)} K`;
    else {
      rendered = `₹${magnitude.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits,
      })}`;
    }
    return `${sign}${rendered}`;
  }
  const rendered = magnitude.toLocaleString("en-IN", {
    maximumFractionDigits,
    notation: compact && magnitude >= 100000 ? "compact" : "standard",
  });
  return format === "percent" ? `${sign}${rendered}%` : `${sign}${rendered}`;
}

export function smartWarningKey(warning) {
  const text = String(warning || "");
  const count = Number(text.match(/\d+/)?.[0] || 0);
  if (text.includes("printed total row")) return { key: "totalRows", count };
  if (text.includes("possible duplicates") || text.includes("Possible duplicate")) {
    return { key: "duplicates", count };
  }
  if (text.includes("No reliable numeric")) return { key: "noMetric", count };
  if (text.includes("No reliable date")) return { key: "noDate", count };
  if (text.includes("row-analysis limit")) return { key: "rowLimit", count };
  if (text.includes("sheet inspection limit") || text.includes("sheets were inspected")) {
    return { key: "sheetLimit", count };
  }
  if (text.includes("empty") || text.includes("hidden") || text.includes("non-tabular")) {
    return { key: "skippedSheets", count };
  }
  return { key: "generic", count: 0 };
}
