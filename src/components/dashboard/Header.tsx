'use client';

import { useState, useRef, useEffect } from 'react';
import {
  SearchOutlined,
  BellOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { UserProfile, Notification } from '@/types/dashboard';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  currentUser: UserProfile;
  notifications?: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  /** 벨 아이콘 클릭 시 최신 알림 fetch 트리거 */
  onRefreshNotifications?: () => void;
  pageTitle?: string;
  /** 모바일 사이드바 열림 상태 (DashboardLayout 에서 전달) */
  mobileMenuOpen?: boolean;
  /** 햄버거 버튼 클릭 핸들러 */
  onMobileMenuToggle?: () => void;
}

/**
 * 대시보드 상단 헤더
 *
 * 모바일 햄버거 버튼을 헤더 내부 좌측에 배치하여
 * 콘텐츠를 가리는 부유 버튼 없이 자연스러운 UI 흐름 구현.
 *
 * - [모바일] 햄버거(☰/✕) · 페이지 제목 · 알림 · 아바타
 * - [태블릿+] 페이지 제목 · 검색바(확장) · 다크모드 · 알림 · 설정 · 아바타
 *
 * 알림 드롭다운:
 * - 벨 버튼 클릭 시 토글
 * - 래퍼 div(ref) 바깥 클릭 시 닫힘
 */
export const Header = ({
  currentUser,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onRefreshNotifications,
  pageTitle = '대시보드',
  mobileMenuOpen = false,
  onMobileMenuToggle,
}: HeaderProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { isDark, toggle } = useThemeToggle();

  const notificationWrapperRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const initials = currentUser.name.slice(0, 2);

  // 알림 드롭다운 바깥 클릭 또는 Escape 키 입력 시 닫기
  useEffect(() => {
    if (!notificationOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        notificationWrapperRef.current &&
        !notificationWrapperRef.current.contains(e.target as Node)
      ) {
        setNotificationOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotificationOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationOpen]);

  return (
    <header className="sticky top-0 z-10 w-full bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border shadow-xs">
      <div className="flex items-center justify-between px-sm sm:px-md py-sm gap-xs sm:gap-md h-14 sm:h-16">

        {/* 좌측: 햄버거(모바일 전용) + 페이지 제목 */}
        <div className="flex items-center gap-sm min-w-0">
          {/* 햄버거 버튼 — 모바일 전용, 헤더 내부 배치로 부유 버튼 제거 */}
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className={[
              'flex md:hidden items-center justify-center w-9 h-9 rounded-md flex-shrink-0',
              'text-light-textSecondary dark:text-dark-textSecondary',
              'hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors',
            ].join(' ')}
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
          >
            {/* 상태에 따라 아이콘 전환: 열림=✕, 닫힘=☰ */}
            <span
              className="transition-transform duration-200"
              style={{ display: 'inline-flex', transform: mobileMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
            </span>
          </button>

          <h1 className="text-h6 sm:text-h5 font-bold text-light-textPrimary dark:text-dark-textPrimary whitespace-nowrap truncate">
            {pageTitle}
          </h1>
        </div>

        {/* 가운데: 검색바 (태블릿+ 전용) */}
        <div className="hidden sm:flex flex-1 max-w-sm lg:max-w-md items-center gap-sm rounded-md px-sm py-xs border border-transparent focus-within:border-light-primary dark:focus-within:border-dark-primary transition-colors">
          <SearchOutlined
            className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="검색..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="flex-1 bg-transparent text-bodySm text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textSecondary dark:placeholder:text-dark-textSecondary outline-none"
            aria-label="대시보드 검색"
          />
        </div>

        {/* 우측: 액션 그룹 */}
        <div className="flex items-center gap-xs sm:gap-sm flex-shrink-0">
          {/* 다크모드 토글 */}
          <button
            type="button"
            onClick={toggle}
            className="flex items-center justify-center w-9 h-9 rounded-md text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {isDark ? <SunOutlined /> : <MoonOutlined />}
          </button>

          {/* 알림 — 래퍼 div 기준으로 드롭다운 absolute 배치 */}
          <div ref={notificationWrapperRef} className="relative">
            <button
              type="button"
              onClick={() => {
                const opening = !notificationOpen;
                setNotificationOpen(opening);
                if (opening) onRefreshNotifications?.();
              }}
              className="relative flex items-center justify-center w-9 h-9 rounded-md text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
              aria-label={`알림 ${unreadCount}건`}
              aria-expanded={notificationOpen}
              aria-haspopup="dialog"
            >
              <BellOutlined />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-[3px] rounded-full bg-light-error dark:bg-dark-error text-white text-overline font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* 알림 드롭다운 */}
            {notificationOpen && (
              <NotificationDropdown
                notifications={notifications}
                onMarkRead={(id) => { onMarkRead?.(id); }}
                onMarkAllRead={() => { onMarkAllRead?.(); }}
                onClose={() => setNotificationOpen(false)}
              />
            )}
          </div>

          {/* 설정 */}
          <button
            type="button"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-md text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
            aria-label="설정"
          >
            <SettingOutlined />
          </button>

          {/* 사용자 아바타 */}
          <div className="flex items-center gap-sm ml-0 sm:ml-xs">
            <div className="w-9 h-9 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center text-white text-bodySm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="hidden md:block min-w-0">
              <p className="text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary truncate max-w-28">
                {currentUser.name}
              </p>
              <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary truncate max-w-28">
                {currentUser.role}
              </p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
