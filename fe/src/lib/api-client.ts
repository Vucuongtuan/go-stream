import { useAuthStore } from "@/store/authStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

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

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers = new Headers(options.headers);

  // Set standard JSON headers
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Inject token from Zustand store (RAM) if it exists
  const token = useAuthStore.getState().accessToken;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }


  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);
    
    // Auto-recovery: If request returns 401 Unauthorized and we have a cookie session token, update the RAM store
    if (response.status === 401) {
      const { getCookie } = await import("@/utils/cookie");
      const cookieToken = getCookie("refresh_token");
      if (cookieToken && cookieToken !== token) {
        useAuthStore.getState().setAccessToken(cookieToken);
        headers.set("Authorization", `Bearer ${cookieToken}`);
        response = await fetch(url, config);
      }
    }

    const text = await response.text();
    let result: ApiResponse<T>;

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new ApiError("Failed to parse response JSON", response.status);
    }

    if (!response.ok || !result.status) {
      // Auto-clear auth state on actual expired credentials
      if (response.status === 401) {
        useAuthStore.getState().clearAuth();
        const { deleteCookie } = await import("@/utils/cookie");
        deleteCookie("refresh_token");
        deleteCookie("user_session");
      }
      const errorMessage = result.message || `HTTP error! status: ${response.status}`;
      throw new ApiError(errorMessage, result.statusCode || response.status);
    }

    return result.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "An unexpected network error occurred",
      500
    );
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
