const DEFAULT_API_URL = 'http://localhost:3000/api';

export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  const body = await parseBody(response);

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
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

export async function apiUpload<T>(
  path: string,
  file: { uri: string; name: string; type: string },
): Promise<T> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  return apiRequest<T>(path, {
    method: 'POST',
    body: form,
  });
}
