import { isAxiosError } from 'axios';

import { api } from '@/lib/api-client';
import { setAccessToken } from '@/lib/auth-token';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  slug?: string;
  avatar?: string;
  bio?: string;
};

type LoginResponse = {
  user: AuthUser;
  access_token: string;
};

let currentUser: AuthUser | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();

export function getCurrentUser() {
  return currentUser;
}

export function subscribeToCurrentUser(listener: (user: AuthUser | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setCurrentUser(user: AuthUser | null) {
  currentUser = user;
  listeners.forEach((listener) => listener(user));
}

export async function login(email: string, password: string) {
  const session = await api.post<LoginResponse>('/api/auth/login', { email, password });
  setAccessToken(session.access_token);
  setCurrentUser(session.user);
  return session.user;
}

export async function register(name: string, email: string, password: string) {
  await api.post<AuthUser>('/api/auth/register', { name, email, password });
  return login(email, password);
}

export function getAuthErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    const message = error.response?.data?.message;
    if (message && /duplicate key|email already registered/i.test(message)) {
      return 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.';
    }
    return message ?? 'Không thể kết nối đến máy chủ. Hãy thử lại.';
  }

  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Hãy thử lại.';
}
