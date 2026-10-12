import { DELETE, GET, PATCH, POST, PUT } from '@/app/api/[...route]/route';

const handlers = { GET, POST, PUT, PATCH, DELETE };

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiOptions = {
  /** Sent as `Authorization: Bearer <token>`. */
  token?: string;
  /** Serialized as JSON. */
  body?: unknown;
  /** Sent as is, for malformed bodies. */
  rawBody?: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

// biome-ignore lint/suspicious/noExplicitAny: a response body has no static shape, each test asserts what it needs
export type JsonBody = any;

/**
 * Calls the API through the same handlers Next mounts at `/api/[...route]`, so
 * the prefixes, the controllers and the middlewares are the real ones — only
 * the HTTP server is skipped.
 */
export async function api(
  method: Method,
  path: string,
  { token, body, rawBody, query, headers = {} }: ApiOptions = {},
) {
  const url = new URL(`/api${path}`, 'http://localhost:3000');

  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, item);
    }
  }

  const payload =
    rawBody ?? (body === undefined ? undefined : JSON.stringify(body));

  const response = await handlers[method](
    new Request(url, {
      method,
      body: payload,
      headers: {
        ...(payload === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    }),
  );

  const text = await response.text();
  let json: JsonBody = null;

  try {
    json = JSON.parse(text);
  } catch {
    // redirects and empty responses carry no JSON
  }

  return {
    status: response.status,
    headers: response.headers,
    text,
    body: json,
  };
}

/** The bearer token header for the cron endpoints. */
export const cronHeaders = {
  Authorization: 'Bearer test-cron-secret',
};
