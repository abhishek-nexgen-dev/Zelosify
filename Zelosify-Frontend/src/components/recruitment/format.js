export function formatDate(dateValue, { withTime = false } = {}) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";

  const options = withTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };

  return date.toLocaleString(undefined, options);
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || bytes === "") return "—";
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percent * 10) / 10}%`;
}

export function getId(item) {
  return item?.id ?? item?.openingId ?? item?.profileId ?? item?._id;
}
