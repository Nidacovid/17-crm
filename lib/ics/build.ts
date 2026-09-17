// D-13 / 10.7: generación del feed .ics propio con plantillas de cadenas,
// saltos \r\n y plegado de líneas a 75 octetos (sin romper UTF-8), sin
// dependencias externas.
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/dates";

export type IcsEvent = {
  // UID del VEVENT: pago-{id}@crm
  uid: string;
  // Cobro · {negocio} · {importe}
  summary: string;
  // Día del evento (yyyy-MM-dd), ya desplazado por reminder_days_before.
  date: string;
  // Enlace al proyecto y contexto.
  description: string;
};

// Fecha básica RFC 5545 (YYYYMMDD) a partir de yyyy-MM-dd.
function basicDate(date: string): string {
  return date.replaceAll("-", "");
}

// Instante UTC básico (YYYYMMDDTHHMMSSZ): hora del aviso en Europe/Madrid
// del día del evento. TRIGGER absoluto: con eventos de día completo los
// disparadores relativos se interpretan contra medianoche de formas
// distintas según el cliente; el absoluto es inequívoco.
export function alarmTriggerUtc(date: string, reminderTime: string): string {
  // Postgres devuelve "HH:MM:SS"; se recorta a "HH:MM".
  const [hours = "09", minutes = "00"] = reminderTime.split(":");
  const hhmm = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  const instant = fromZonedTime(`${date}T${hhmm}:00`, APP_TIMEZONE);
  return formatInTimeZone(instant, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

// Escape de texto RFC 5545: barra invertida, punto y coma, coma y saltos.
function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

// Plegado a 75 octetos por línea (RFC 5545 3.1), sin partir secuencias
// UTF-8: se acumulan caracteres mientras el contador de octetos no supere
// el límite; las continuaciones empiezan con un espacio.
function foldLine(line: string): string {
  const LIMIT = 75;
  const folded: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8");
    const isStart = currentBytes === 0;
    const budget = isStart ? LIMIT : LIMIT - 1;
    if (currentBytes + charBytes > budget) {
      folded.push(current);
      current = " ";
      currentBytes = 1;
    }
    current += char;
    currentBytes += charBytes;
  }
  folded.push(current);
  return folded.join("\r\n");
}

function dtStamp(): string {
  return formatInTimeZone(new Date(), "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

export function buildIcsCalendar(
  events: IcsEvent[],
  reminderTime: string,
): string {
  const lines: string[] = [];

  lines.push(foldLine("BEGIN:VCALENDAR"));
  lines.push(foldLine("VERSION:2.0"));
  lines.push(foldLine("PRODID:-//17-crm//Cobros CRM//ES"));
  lines.push(foldLine("CALSCALE:GREGORIAN"));
  lines.push(foldLine("METHOD:PUBLISH"));

  for (const event of events) {
    lines.push(foldLine("BEGIN:VEVENT"));
    lines.push(foldLine(`UID:${event.uid}`));
    lines.push(foldLine(`DTSTAMP:${dtStamp()}`));
    lines.push(foldLine(`DTSTART;VALUE=DATE:${basicDate(event.date)}`));
    lines.push(foldLine(`SUMMARY:${escapeText(event.summary)}`));
    lines.push(foldLine(`DESCRIPTION:${escapeText(event.description)}`));
    lines.push(foldLine("BEGIN:VALARM"));
    lines.push(foldLine("ACTION:DISPLAY"));
    lines.push(foldLine(`DESCRIPTION:${escapeText(event.summary)}`));
    lines.push(
      foldLine(`TRIGGER;VALUE=DATE-TIME:${alarmTriggerUtc(event.date, reminderTime)}`),
    );
    lines.push(foldLine("END:VALARM"));
    lines.push(foldLine("END:VEVENT"));
  }

  lines.push(foldLine("END:VCALENDAR"));
  return lines.map((line) => `${line}\r\n`).join("");
}