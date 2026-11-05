const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api").replace(
  /\/+$/,
  "",
);

export function apiMediaUrl(path: string): string {
  const apiUrl = new URL(API_BASE_URL, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  return new URL(path.startsWith("/") ? path : `/${path}`, apiUrl.origin).toString();
}

export const TOKEN_STORAGE_KEY = "hflow_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
    { ...init, headers },
  );

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const body =
      typeof payload === "object" && payload !== null
        ? (payload as { error?: { message?: unknown }; message?: unknown })
        : undefined;
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : typeof body?.message === "string"
          ? body.message
          : `API request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function apiDownload(
  path: string,
  fallbackFileName: string,
  accessToken?: string,
  accept = "application/pdf",
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("File downloads are only available in the browser.");
  }

  const headers = new Headers({ Accept: accept });
  const token = accessToken ?? window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
    { headers },
  );
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const payload: unknown = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const body =
      typeof payload === "object" && payload !== null
        ? (payload as { error?: { message?: unknown }; message?: unknown })
        : undefined;
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : typeof body?.message === "string"
          ? body.message
          : `API request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fallbackFileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function apiFetchBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const headers = new Headers({ Accept: "*/*" });
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
    { headers, signal },
  );
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const payload: unknown = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const body =
      typeof payload === "object" && payload !== null
        ? (payload as { error?: { message?: unknown }; message?: unknown })
        : undefined;
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : typeof body?.message === "string"
          ? body.message
          : `API request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return response.blob();
}
