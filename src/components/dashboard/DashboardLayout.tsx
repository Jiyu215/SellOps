'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { UserProfile, Notification } from '@/types/dashboard';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentUser: UserProfile;
  pageTitle?: string;
  notifications?: Notification[];
}

/**
 * 대시보드 공통 레이아웃
 * Sidebar + Header + Main Content 구조
 *
 * - active 메뉴 상태: Sidebar 내부에서 usePathname()으로 URL 기반 판별
 *   → 로컬 state 불필요, 새로고침·공유 URL에서도 정확히 동작
 * - mobileOpen 상태: Header(햄버거 버튼) ↔ Sidebar(슬라이드인) 공유
 * - notifications 상태: 읽음 처리를 포함한 알림 목록 관리
 */
export const DashboardLayout = ({
  children,
  currentUser,
  pageTitle = '대시보드',
  notifications: initialNotifications = [],
}: DashboardLayoutProps) => {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  /** 단건 읽음 처리 */
  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  /** 전체 읽음 처리 */
  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  /** 로그아웃: 쿠키 삭제 후 로그인 페이지로 이동 */
  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  }, [router]);

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
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
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
