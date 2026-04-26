'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * 로그인 폼 컴포넌트
 * - useSearchParams로 callbackUrl 직접 읽기 (prop 직렬화 의존 제거)
 * - 상태/fetch 로직 인라인 (hook 의존 체인 제거)
 * - 로그인 성공 시 window.location.replace로 쿠키 포함 풀 리로드
 */
export const LoginForm = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { success: boolean; error: string | null };

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? '로그인에 실패했습니다.');
        return;
      }

      // 쿠키가 포함된 풀 리로드 → 미들웨어가 토큰 확인 후 대시보드 허용
      window.location.replace(callbackUrl);
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ minHeight: '100vh' }}
      className="flex items-center justify-center bg-light-background dark:bg-dark-background px-4"
    >
      <div className="w-full" style={{ maxWidth: '520px' }}>

        {/* 로고 */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.svg"
            alt="SellOps"
            style={{ height: '40px' }}
            className="inline-block"
          />
        </div>

        {/* 카드 */}
        <div
          className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg"
          style={{ padding: '40px 48px' }}
        >
          {/* 헤더 */}
          <div style={{ marginBottom: '32px' }}>
            <h1
              className="font-bold text-light-textPrimary dark:text-dark-textPrimary"
              style={{ fontSize: '24px', lineHeight: '32px', marginBottom: '6px' }}
            >
              관리자 로그인
            </h1>
            <p
              className="text-light-textSecondary dark:text-dark-textSecondary"
              style={{ fontSize: '14px' }}
            >
              SellOps 운영자 계정으로 로그인하세요.
            </p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit}>

            {/* 이메일 필드 */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="login-email"
                className="block font-medium text-light-textPrimary dark:text-dark-textPrimary"
                style={{ fontSize: '14px', marginBottom: '6px' }}
              >
                이메일
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sellops.com"
                className="w-full rounded-md border border-light-border dark:border-dark-border bg-white dark:bg-dark-background text-light-textPrimary dark:text-dark-textPrimary"
                style={{
                  height: '44px',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#5D5FEF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(93,95,239,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              />
            </div>

            {/* 비밀번호 필드 */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor="login-password"
                className="block font-medium text-light-textPrimary dark:text-dark-textPrimary"
                style={{ fontSize: '14px', marginBottom: '6px' }}
              >
                비밀번호
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-md border border-light-border dark:border-dark-border bg-white dark:bg-dark-background text-light-textPrimary dark:text-dark-textPrimary"
                style={{
                  height: '44px',
                  padding: '0 14px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#5D5FEF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(93,95,239,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              />
            </div>

            {/* 에러 메시지 */}
            {errorMsg && (
              <div
                role="alert"
                className="rounded-md"
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(220,53,69,0.08)',
                  border: '1px solid rgba(220,53,69,0.25)',
                  color: '#DC3545',
                  fontSize: '13px',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '24px',
                width: '100%',
                height: '46px',
                backgroundColor: loading ? '#9496C8' : '#5D5FEF',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s, opacity 0.15s',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#4A4DD1'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#5D5FEF'; }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 개발 환경 테스트 계정 */}
          {process.env.NODE_ENV === 'development' && (
            <div
              className="rounded-md"
              style={{
                marginTop: '28px',
                padding: '14px 16px',
                backgroundColor: 'rgba(93,95,239,0.06)',
                border: '1px solid rgba(93,95,239,0.2)',
              }}
            >
              <p
                className="font-medium text-light-textSecondary dark:text-dark-textSecondary"
                style={{ fontSize: '12px', marginBottom: '4px' }}
              >
                개발 환경 테스트 계정
              </p>
              <p
                className="font-mono text-light-textSecondary dark:text-dark-textSecondary"
                style={{ fontSize: '12px' }}
              >
                admin@sellops.com / Admin1234!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
