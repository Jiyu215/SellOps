export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/** API 공통 응답 구조 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
