'use client';

import {
  DashboardOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  LogoutOutlined,
  PlusOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { UserProfile } from '@/types/dashboard';

interface SidebarProps {
  currentUser: UserProfile;
  activeMenu?: string;
  onMenuChange?: (menu: string) => void;
  /** DashboardLayout 에서 관리하는 모바일 열림 상태 */
  mobileOpen: boolean;
  /** 오버레이 클릭 또는 메뉴 선택 시 닫기 콜백 */
  onMobileClose: () => void;
  /** 로그아웃 콜백 */
  onLogout?: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: '대시보드', icon: <DashboardOutlined />, href: '/dashboard/dashboard' },
  { key: 'products', label: '재고 관리', icon: <ShoppingOutlined />, href: '/dashboard/products' },
  { key: 'analytics', label: '데이터 분석', icon: <BarChartOutlined />, href: '/dashboard/analytics' },
  { key: 'orders', label: '주문 관리', icon: <ShoppingCartOutlined />, href: '/dashboard/sales' },
  { key: 'customers', label: '사용자 관리', icon: <TeamOutlined />, href: '/dashboard/customers' },
];

/**
 * 대시보드 사이드바
 *
 * - 모바일 (< 768px): 기본 숨김 → mobileOpen 시 좌측에서 슬라이드인
 *   햄버거 버튼은 Header 에 통합됨 (부유 버튼 없음)
 * - 태블릿 (768px~1279px): 아이콘 전용 w-16 고정 표시
 * - PC (≥ 1280px): w-[190px] 전체 레이블 표시
 *
 * 로고:
 *   - 태블릿: logo-128.png (정방형 아이콘)
 *   - 모바일/PC: logo.svg (가로형 워드마크)
 */
export const Sidebar = ({
  currentUser,
  activeMenu = 'dashboard',
  onMenuChange,
  mobileOpen,
  onMobileClose,
  onLogout,
}: SidebarProps) => {
  const handleMenuClick = (key: string) => {
    onMenuChange?.(key);
    onMobileClose();
  };

  const initials = currentUser.name.slice(0, 2);

  return (
    <>
      {/* 모바일 오버레이 배경 — 클릭 시 사이드바 닫기 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden backdrop-blur-[1px]"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        className={[
          'fixed top-0 left-0 h-screen z-30 flex flex-col',
          'bg-light-surface dark:bg-dark-surface',
          'border-r border-light-border dark:border-dark-border',
          'shadow-md',
          'transition-transform duration-300 ease-in-out',
          // 모바일: mobileOpen 에 따라 슬라이드 인/아웃
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // 태블릿 이상: 항상 표시
          'md:translate-x-0',
          // 너비: 모바일 w-64 / 태블릿 w-16 (아이콘 전용) / PC w-[190px]
          'w-64 md:w-16 xl:w-[190px]',
        ].join(' ')}
        aria-label="사이드바 메뉴"
      >
        {/* ① 브랜드 로고 영역 */}
        <div className="flex items-center justify-center xl:justify-start h-16 px-sm md:px-0 xl:px-md border-b border-light-border dark:border-dark-border flex-shrink-0">
          {/*
            태블릿 (아이콘 전용 w-16): 정방형 로고 아이콘
            모바일 / PC: 가로형 워드마크 SVG
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-128.png"
            alt=""
            aria-hidden="true"
            className="hidden md:block xl:hidden w-8 h-8 object-contain flex-shrink-0"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.svg"
            alt="SellOps"
            className="block md:hidden xl:block h-8 w-auto max-w-[140px] flex-shrink-0"
          />
        </div>

        {/* ② 로그인 사용자 프로필 카드 */}
        <div className="flex items-center justify-center xl:justify-start gap-sm px-md py-md border-b border-light-border dark:border-dark-border flex-shrink-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-light-primary dark:bg-dark-primary flex items-center justify-center text-white text-bodySm font-bold">
            {initials}
          </div>
          <div className="block md:hidden xl:block min-w-0">
            <p className="text-bodySm font-semibold text-light-textPrimary dark:text-dark-textPrimary truncate">
              {currentUser.name}
            </p>
            <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary truncate">
              {currentUser.role}
            </p>
          </div>
        </div>

        {/* ③ 내비게이션 메뉴 */}
        <nav className="flex-1 overflow-y-auto py-sm" aria-label="주요 메뉴">
          <ul className="space-y-xs px-sm">
            {NAV_ITEMS.map((item) => {
              const isActive = activeMenu === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => handleMenuClick(item.key)}
                    title={item.label}
                    className={[
                      'w-full flex items-center gap-sm px-sm py-sm rounded-md',
                      'text-bodySm font-medium transition-all duration-150',
                      'justify-center xl:justify-start',
                      isActive
                        ? 'bg-light-secondary dark:bg-dark-secondary text-light-primary dark:text-dark-primary border-l-[3px] border-light-primary dark:border-dark-primary pl-[5px]'
                        : 'text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="text-bodyLg flex-shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="block md:hidden xl:block whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ④ 하단 고정 영역 */}
        <div className="px-sm py-md border-t border-light-border dark:border-dark-border space-y-xs flex-shrink-0">
          {/* 새 보고서 생성 */}
          <button
            type="button"
            title="새 보고서 생성"
            className={[
              'w-full flex items-center gap-sm px-sm py-sm rounded-md',
              'bg-light-primary dark:bg-dark-primary text-white',
              'text-bodySm font-semibold transition-opacity hover:opacity-90',
              'justify-center xl:justify-start',
            ].join(' ')}
          >
            <PlusOutlined className="flex-shrink-0 text-bodyLg" aria-hidden="true" />
            <span className="block md:hidden xl:block whitespace-nowrap">새 보고서 생성</span>
          </button>

          {/* 매뉴얼 */}
          <button
            type="button"
            title="매뉴얼"
            className={[
              'w-full flex items-center gap-sm px-sm py-sm rounded-md',
              'text-bodySm font-medium text-light-textSecondary dark:text-dark-textSecondary',
              'hover:bg-light-secondary dark:hover:bg-dark-secondary hover:text-light-textPrimary dark:hover:text-dark-textPrimary transition-colors',
              'justify-center xl:justify-start',
            ].join(' ')}
          >
            <BookOutlined className="flex-shrink-0 text-bodyLg" aria-hidden="true" />
            <span className="block md:hidden xl:block whitespace-nowrap">매뉴얼</span>
          </button>

          {/* 로그아웃 */}
          <button
            type="button"
            title="로그아웃"
            onClick={onLogout}
            className={[
              'w-full flex items-center gap-sm px-sm py-sm rounded-md',
              'text-bodySm font-medium text-light-error dark:text-dark-error',
              'hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors',
              'justify-center xl:justify-start',
            ].join(' ')}
          >
            <LogoutOutlined className="flex-shrink-0 text-bodyLg" aria-hidden="true" />
            <span className="block md:hidden xl:block whitespace-nowrap">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 태블릿/PC 공간 확보 플레이스홀더 */}
      <div
        className="hidden md:block flex-shrink-0 w-16 xl:w-[190px]"
        aria-hidden="true"
      />
    </>
  );
};
