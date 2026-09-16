export { cn } from "cn"

/**
 * Normaliza un teléfono a formato E.164 (regla 2.2.11).
 * Si son 9 dígitos sin prefijo, se asume España (+34).
 * El original se guarda tal como se escribió.
 */
export function normalizePhoneE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 9) return `+34${digits}`;
  return `+${digits}`;
}

/**
 * Normaliza una URL añadiendo `https://` si falta el esquema (regla 2.2.10).
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
