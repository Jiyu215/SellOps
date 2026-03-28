'use client';

import { useState, useCallback } from 'react';
import type { LoginCredentials, LoginResult, AuthUser, ApiResponse } from '../types/auth';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = (await res.json()) as ApiResponse<AuthUser>;

      if (!res.ok || !data.success) {
        const msg = data.error ?? '로그인에 실패했습니다.';
        setError(msg);
        return { success: false, error: msg };
      }

      return { success: true, user: data.data ?? undefined };
    } catch {
      const msg = '네트워크 오류가 발생했습니다.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { login, loading, error };
};
