// Tiny REST fetch wrapper with JSON helpers + backend URL resolution.
// Per specs/02-front.md §6 — VITE_BACKEND_URL drives prod vs local.

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ?? "";

/** Returns "" in same-origin mode (dev proxy or coalesced backend) or the full URL otherwise. */
export function getBackendUrl(): string {
  return BACKEND;
}

export interface FetchOpts extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${BACKEND}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(opts.headers ?? {});
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, {
    ...opts,
    headers,
    body:
      opts.body === undefined
        ? undefined
        : opts.body instanceof FormData
        ? opts.body
        : JSON.stringify(opts.body),
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) throw new ApiError(res.status, parsed);
  return parsed as T;
}
