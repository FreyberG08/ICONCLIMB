export function formatMoney(amount: number | null | undefined, currency = "USD") {
  if (amount == null) return "";
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Suma monetaria exacta trabajando en centavos. */
export function toCents(n: number) {
  return Math.round(n * 100);
}
export function fromCents(c: number) {
  return Math.round(c) / 100;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "producto";
}

export function normalizeSearch(input: string) {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function normalizeSku(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "-");
}
