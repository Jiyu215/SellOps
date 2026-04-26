'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import type { UserProfile, Notification } from '@/types/dashboard';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentUser: UserProfile;
  pageTitle?: string;
  notifications?: Notification[];
  /** true이면 내부 overflow-y-auto 스크롤을 제거하고 브라우저 네이티브 스크롤 사용 */
  nativeScroll?: boolean;
}

/**
 * 대시보드 공통 레이아웃
 * Sidebar + Header + Main Content 구조
 *
 * - active 메뉴 상태: Sidebar 내부에서 usePathname()으로 URL 기반 판별
 *   → 로컬 state 불필요, 새로고침·공유 URL에서도 정확히 동작
 * - mobileOpen 상태: Header(햄버거 버튼) ↔ Sidebar(슬라이드인) 공유
 * - notifications: useNotifications 훅으로 초기값 + 30초 폴링 + 읽음 처리 API 연동
 */
export const DashboardLayout = ({
  children,
  currentUser,
  pageTitle = '대시보드',
  notifications: initialNotifications = [],
  nativeScroll = false,
}: DashboardLayoutProps) => {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { notifications, refresh, markRead, markAllRead } = useNotifications(initialNotifications);

  /** 로그아웃: 쿠키 삭제 후 로그인 페이지로 이동 */
  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  }, [router]);

  if (nativeScroll) {
    return (
      /* nativeScroll: 브라우저 기본 스크롤 사용, 사이드바만 sticky 고정 */
      <div className="min-h-screen bg-light-background dark:bg-dark-background flex">
        {/* 사이드바: sticky로 스크롤 시에도 뷰포트 좌측에 고정 */}
        <div className="sticky top-0 self-start h-screen shrink-0 overflow-hidden w-0 md:w-16 xl:w-[190px]">
          <Sidebar
            currentUser={currentUser}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />
        </div>

        {/* 메인 영역: 내용 길이에 따라 자유롭게 확장 */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            currentUser={currentUser}
            pageTitle={pageTitle}
            notifications={notifications}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onRefreshNotifications={refresh}
            mobileMenuOpen={mobileOpen}
            onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
          />

          <main className="p-sm md:p-md xl:p-lg">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    /* h-screen: 사이드바·헤더 고정, 메인 영역만 수직 스크롤 */
    <div className="h-screen bg-light-background dark:bg-dark-background flex overflow-hidden">
      <Sidebar
        currentUser={currentUser}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* 메인 영역 (헤더 고정 + 본문 스크롤) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentUser={currentUser}
          pageTitle={pageTitle}
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          mobileMenuOpen={mobileOpen}
          onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
        />

        {/* 본문 스크롤 컨테이너 */}
        <main className="flex-1 overflow-y-auto p-sm md:p-md xl:p-lg">
          {children}
        </main>
      </div>
    </div>
  );
};
