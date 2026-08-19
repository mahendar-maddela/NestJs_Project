/**
 * Replicates the `monthdata` clamp logic duplicated across several legacy "each month" analytics
 * controllers (fleet/analyticController.js, roaming session controllers): resolves how many months
 * (0-based, inclusive) to iterate given optional `month`/`year` query filters.
 */
export function resolveMaxMonthIndex(month: number | undefined, year: number | undefined, currentMonth: number, currentYear: number): number {
  let monthdata: number;

  if (month) {
    monthdata = month - 1;
  } else {
    monthdata = currentYear === year ? currentMonth : year ? 11 : currentMonth;
  }

  if (currentYear === year && month !== undefined && currentMonth < month - 1) {
    monthdata = currentMonth;
  }

  return monthdata;
}
