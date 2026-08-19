import type { Dayjs } from 'dayjs';
import type {} from 'dayjs/plugin/utc';
import type {} from 'dayjs/plugin/timezone';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dayjs: typeof import('dayjs') = require('dayjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
dayjs.extend(require('dayjs/plugin/utc'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
dayjs.extend(require('dayjs/plugin/timezone'));

const TZ = 'Asia/Kolkata';

/** Mirrors `utils/dateAndTimeUTC.js:iSTToUTC`. */
export function istToUtc(date: string | Date): Date {
  return (dayjs(date) as Dayjs).tz(TZ).utc().toDate();
}

/** Mirrors `utils/dateAndTimeUTC.js:getISTDateRangeInUTC` — start/end of day in IST, converted to UTC instants. */
export function getIstDateRangeInUtc(startDate: string | Date, endDate: string | Date): { startDate: Date; endDate: Date } {
  return {
    startDate: (dayjs(startDate) as Dayjs).tz(TZ).startOf('day').utc().toDate(),
    endDate: (dayjs(endDate) as Dayjs).tz(TZ).endOf('day').utc().toDate(),
  };
}

/** Mirrors `utils/dateAndTimeUTC.js:getTodayDateISTToUTC`. */
export function getTodayDateIstToUtc(): Date {
  return (dayjs() as Dayjs).tz(TZ).startOf('day').utc().toDate();
}

/** Mirrors `utils/dateAndTimeUTC.js:getTodayEndDateISTToUTC`. */
export function getTodayEndDateIstToUtc(): Date {
  return (dayjs() as Dayjs).tz(TZ).endOf('day').utc().toDate();
}

/** Mirrors `utils/dateAndTimeUTC.js:getStartOfMonthISTToUTC`. */
export function getStartOfMonthIstToUtc(year: number | string, month: number | string): Date {
  return (dayjs.tz(`${year}-${month}-01`, TZ) as Dayjs).startOf('month').utc().toDate();
}

/** Mirrors `utils/dateAndTimeUTC.js:getEndOfMonthISTToUTC`. */
export function getEndOfMonthIstToUtc(year: number | string, month: number | string): Date {
  return (dayjs.tz(`${year}-${month}-01`, TZ) as Dayjs).endOf('month').utc().toDate();
}

/** Mirrors `utils/dateAndTimeUTC.js:getStartOfYearISTToUTC`. */
export function getStartOfYearIstToUtc(year: number | string): Date {
  return (dayjs.tz(`${year}-01-01`, TZ) as Dayjs).startOf('year').utc().toDate();
}

/** Mirrors `utils/dateAndTimeUTC.js:getEndOfYearISTToUTC`. */
export function getEndOfYearIstToUtc(year: number | string): Date {
  return (dayjs.tz(`${year}-01-01`, TZ) as Dayjs).endOf('year').utc().toDate();
}

/** Mirrors `utils/dateAndTimeUTC.js:getMonthRangeISTToUTC`. */
export function getMonthRangeIstToUtc(year: number | string, month: number | string): { startDate: Date; endDate: Date } {
  return { startDate: getStartOfMonthIstToUtc(year, month), endDate: getEndOfMonthIstToUtc(year, month) };
}

/** Mirrors `utils/dateAndTimeUTC.js:getYesterdayRangeISTToUTC`. */
export function getYesterdayRangeIstToUtc(): { startDate: Date; endDate: Date } {
  return {
    startDate: (dayjs() as Dayjs).tz(TZ).subtract(1, 'day').startOf('day').utc().toDate(),
    endDate: (dayjs() as Dayjs).tz(TZ).subtract(1, 'day').endOf('day').utc().toDate(),
  };
}
