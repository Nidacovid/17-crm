import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const APP_TIMEZONE = "Europe/Madrid";

export type DateRange = {
  start: Date;
  end: Date;
};

function buildRange(
  date: Date,
  startFn: (d: Date) => Date,
  endFn: (d: Date) => Date
): DateRange {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return {
    start: fromZonedTime(startFn(zoned), APP_TIMEZONE),
    end: fromZonedTime(endFn(zoned), APP_TIMEZONE),
  };
}

export function monthRange(date: Date = new Date()): DateRange {
  return buildRange(date, startOfMonth, endOfMonth);
}

export function quarterRange(date: Date = new Date()): DateRange {
  return buildRange(date, startOfQuarter, endOfQuarter);
}

export function yearRange(date: Date = new Date()): DateRange {
  return buildRange(date, startOfYear, endOfYear);
}

export function weekRange(date: Date = new Date()): DateRange {
  return buildRange(
    date,
    (d) => startOfWeek(d, { weekStartsOn: 1 }),
    (d) => endOfWeek(d, { weekStartsOn: 1 })
  );
}
