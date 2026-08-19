/**
 * Outbound OCPI HTTP calls to partner CPO/eMSP platforms.
 * Mirrors legacy `src/utils/ocpiHelpers.js` (get/post/put/patch/deleteMethodOcpi),
 * using the platform `fetch` instead of axios (no axios dependency in this project).
 */
export interface OcpiHttpResult<T = any> {
  status: number;
  data: T;
}

async function request<T = any>(method: string, url: string, token: string, body?: unknown): Promise<OcpiHttpResult<T>> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error: any = new Error(`OCPI ${method} ${url} failed with status ${response.status}`);
    error.response = { status: response.status, data };
    error.config = { url, method, data: body };
    throw error;
  }

  return { status: response.status, data };
}

export const getMethodOcpi = <T = any>(url: string, token: string) => request<T>('GET', url, token);
export const postMethodOcpi = <T = any>(url: string, data: unknown, token: string) => request<T>('POST', url, token, data);
export const putMethodOcpi = <T = any>(url: string, data: unknown, token: string) => request<T>('PUT', url, token, data);
export const patchMethodOcpi = <T = any>(url: string, data: unknown, token: string) => request<T>('PATCH', url, token, data);
export const deleteMethodOcpi = <T = any>(url: string, token: string) => request<T>('DELETE', url, token);
