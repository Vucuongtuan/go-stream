import { useAuthStore } from "@/store/authStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}` : "http://localhost:80");

export interface ApiResponse<T> {
  status: boolean;
  statusCode: number;
  data?: T;
  message?: string;
}

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

let refreshRequest: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const result = (await response.json().catch(() => ({}))) as ApiResponse<{ access_token: string }>;

      if (!response.ok || !result.status || !result.data?.access_token) {
        if (response.status === 401 || response.status === 403) useAuthStore.getState().clearAuth();
        throw new ApiError(result.message || "Unable to refresh session", response.status || 500);
      }

      useAuthStore.getState().setAccessToken(result.data.access_token);
      return result.data.access_token;
    })().finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const token = useAuthStore.getState().accessToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, credentials: "include" });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network error", 0);
  }

  const normalizedPath = path.startsWith("http") ? new URL(path).pathname : path;
  const isAuthEndpoint = normalizedPath === "/api/auth/login" || normalizedPath === "/api/auth/refresh" || normalizedPath === "/api/auth/logout";
  if (response.status === 401 && !retried && !isAuthEndpoint) {
    await refreshAccessToken();
    return request<T>(path, options, true);
  }

  const text = await response.text();
  let result: ApiResponse<T>;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError("Failed to parse response JSON", response.status);
  }
  if (!response.ok || !result.status) throw new ApiError(result.message || `HTTP error! status: ${response.status}`, result.statusCode || response.status);
  return result.data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestInit) => request<T>(path, { ...options, method: "POST", body: body === undefined ? options?.body : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: RequestInit) => request<T>(path, { ...options, method: "PUT", body: body === undefined ? options?.body : JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "DELETE" }),
  refreshAccessToken,
};
