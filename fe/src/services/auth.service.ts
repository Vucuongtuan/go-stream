import { apiClient } from "@/lib/api-client";
import { User, LoginInput, RegisterInput, LoginResponse } from "@/lib/types";

export const authService = {
  login: async (input: LoginInput): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/api/auth/login", input);
  },

  register: async (input: RegisterInput): Promise<User> => {
    return apiClient.post<User>("/api/auth/register", input);
  },
};
