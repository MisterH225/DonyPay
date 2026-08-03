import { getAdminApiKey, getApiUrl } from './config';

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set('X-Admin-Key', getAdminApiKey());
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body &&
      'message' in body &&
      (body as { message: unknown }).message
        ? Array.isArray((body as { message: unknown }).message)
          ? ((body as { message: string[] }).message).join(', ')
          : String((body as { message: unknown }).message)
        : `Erreur API ${response.status}`;
    throw new AdminApiError(message, response.status);
  }

  return body as T;
}
