import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';

/**
 * 로그인 페이지
 * - LoginForm이 useSearchParams를 사용하므로 Suspense 래퍼 필수 (Next.js App Router 요구사항)
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
