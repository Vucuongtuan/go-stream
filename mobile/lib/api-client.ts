import {
  AxiosHeaders,
  create,
  isAxiosError,
  type AxiosRequestConfig,
} from 'axios';

import { getAccessToken, setAccessToken } from '@/lib/auth-token';

type ApiEnvelope<T> = {
  status: boolean;
  statusCode: number;
  message?: string;
  data?: T;
};

type RefreshResponse = {
  access_token: string;
};

type RetryableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL must be set before making API requests.');
}

const clientOptions = {
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
  timeout: 20_000,
  withCredentials: true,
};

export const apiClient = create(clientOptions);
const refreshClient = create(clientOptions);

export const api = {
  async get<T>(url: string, config?: AxiosRequestConfig) {
    const { data } = await apiClient.get<T>(url, config);
    return data;
  },
  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    const { data } = await apiClient.post<T>(url, body, config);
    return data;
  },
  async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    const { data } = await apiClient.put<T>(url, body, config);
    return data;
  },
  async patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    const { data } = await apiClient.patch<T>(url, body, config);
    return data;
  },
  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const { data } = await apiClient.delete<T>(url, config);
    return data;
  },
};

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (isApiEnvelope(response.data)) {
      response.data = response.data.data;
    }

    return response;
  },
  async (error: unknown) => {
    if (!isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      return Promise.reject(error);
    }

    const request = error.config as RetryableRequestConfig;
    if (request._retry || request.url === '/api/auth/refresh') {
      return Promise.reject(error);
    }

    request._retry = true;

    try {
      const nextAccessToken = await refreshAccessToken();
      request.headers = {
        ...request.headers,
        Authorization: `Bearer ${nextAccessToken}`,
      };

      return apiClient.request(request);
    } catch (refreshError) {
      setAccessToken(null);
      return Promise.reject(refreshError);
    }
  }
);

export async function restoreSession() {
  const token = await refreshAccessToken();
  setAccessToken(token);
  return token;
}

export function uploadFile<T>(
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
) {
  return apiClient.post<T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: ({ loaded, total }) => {
      if (total) {
        onProgress?.(loaded / total);
      }
    },
  });
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiEnvelope<RefreshResponse>>('/api/auth/refresh')
      .then(({ data }) => {
        const token = data.data?.access_token;

        if (!token) {
          throw new Error('The refresh response did not include an access token.');
        }

        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'statusCode' in value
  );
}
