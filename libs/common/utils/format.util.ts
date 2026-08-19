/** Mirrors `utils/formatDuration.js:formatDuration`. */
export function formatDuration(ms: number | null | undefined): string {
  const value = Number(ms) || 0;
  const hours = Math.floor(value / (1000 * 60 * 60));
  const minutes = Math.floor((value % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} hrs ${minutes} mins`;
}

/** Mirrors `utils/formatDuration.js:formatToIST`. */
export function formatToIst(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(date));
}
