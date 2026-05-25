export interface User {
  id: number;
  name: string;
  email?: string;
  slug?: string;
  avatar?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginInput {
  email: string;
  password?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password?: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
}
