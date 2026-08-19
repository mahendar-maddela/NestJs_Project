export interface OcpiResponse<T> {
  data: T;
  status_code: number;
  status_message: string;
  timestamp: string;
}

export function generateResponse<T>(data: T, statusCode: number, message: string): OcpiResponse<T> {
  return {
    data,
    status_code: statusCode,
    status_message: message,
    timestamp: new Date().toISOString(),
  };
}

export function encodeBase64(value?: string | null): string {
  return value ? Buffer.from(value, 'utf8').toString('base64') : '';
}

export function decodeBase64(value?: string | null): string {
  return value ? Buffer.from(value, 'base64').toString('utf8') : '';
}

export function calculateTotalTime(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const diffHours = (end - start) / (1000 * 60 * 60);
  return Number(diffHours.toFixed(3));
}

export function safeParseJson<T = any>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export function parsePagination(query: { offset?: string | number; limit?: string | number }) {
  return {
    skip: query.offset !== undefined ? Number(query.offset) : 0,
    take: query.limit !== undefined ? Number(query.limit) : 10,
  };
}

export function parsePage(query: { page?: string | number; limit?: string | number }) {
  const page = query.page !== undefined ? Number(query.page) : 1;
  const limit = query.limit !== undefined ? Number(query.limit) : 20;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
