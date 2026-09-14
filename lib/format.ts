const TZ = "Europe/Madrid";

const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: true,
});

export function formatEUR(n: number): string {
  return eurFormatter.format(n);
}

export function formatHours(minutes: number): string {
  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(minutes / 60)} h`;
}

function asDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

export function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(asDate(d));
}

export function formatDateLong(d: Date | string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(asDate(d));
}

export function formatPercent(n: number): string {
  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(n)} %`;
}

export function formatPhone(s: string): string {
  const value = s.trim();
  if (!value) return "";
  const hasPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  const groupsOf3 = (d: string) => d.match(/.{1,3}/g) ?? [];
  if (hasPlus && digits.startsWith("34") && digits.length >= 11) {
    return `+34 ${groupsOf3(digits.slice(2)).join(" ")}`;
  }
  return `${hasPlus ? "+" : ""}${groupsOf3(digits).join(" ")}`;
}
