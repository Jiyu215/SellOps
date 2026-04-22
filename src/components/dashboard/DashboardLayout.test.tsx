/**
 * DashboardLayout 유닛 테스트
 *
 * PR 변경 사항: nativeScroll prop 추가.
 * - nativeScroll=false (기본): h-screen + overflow-hidden 레이아웃
 * - nativeScroll=true: min-h-screen 레이아웃 (사이드바 sticky)
 * - 기타: notification 상태 관리, 로그아웃 등 기존 동작 유지 확인
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardLayout } from './DashboardLayout';
import type { UserProfile, Notification } from '@/types/dashboard';

// ── next/navigation 모킹 ──────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter:   jest.fn(() => ({ push: mockPush })),
  usePathname: jest.fn(() => '/dashboard/products'),
}));

// ── Sidebar / Header 경량 모킹 ────────────────────────────────────────────────

jest.mock('./Sidebar', () => ({
  Sidebar: ({ currentUser, mobileOpen, onMobileClose, onLogout }: {
    currentUser: UserProfile;
    mobileOpen: boolean;
    onMobileClose: () => void;
    onLogout: () => void;
  }) => (
    <aside data-testid="sidebar" data-mobile-open={mobileOpen}>
      <span data-testid="sidebar-user">{currentUser.name}</span>
      <button onClick={onMobileClose} data-testid="sidebar-close">닫기</button>
      <button onClick={onLogout} data-testid="sidebar-logout">로그아웃</button>
    </aside>
  ),
}));

jest.mock('./Header', () => ({
  Header: ({
    pageTitle,
    notifications,
    onMarkRead,
    onMarkAllRead,
    mobileMenuOpen,
    onMobileMenuToggle,
  }: {
    currentUser: UserProfile;
    pageTitle: string;
    notifications: Notification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: () => void;
    mobileMenuOpen: boolean;
    onMobileMenuToggle: () => void;
  }) => (
    <header data-testid="header" data-mobile-open={mobileMenuOpen}>
      <h1 data-testid="page-title">{pageTitle}</h1>
      <span data-testid="notif-count">{notifications.length}</span>
      <span data-testid="unread-count">
        {notifications.filter((n) => !n.isRead).length}
      </span>
      <button onClick={() => onMarkRead('notif-001')} data-testid="mark-read">읽음</button>
      <button onClick={onMarkAllRead} data-testid="mark-all-read">전체읽음</button>
      <button onClick={onMobileMenuToggle} data-testid="mobile-toggle">메뉴</button>
    </header>
  ),
}));

// ── fetch 모킹 (로그아웃) ─────────────────────────────────────────────────────

global.fetch = jest.fn().mockResolvedValue({ ok: true });

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const MOCK_USER: UserProfile = {
  id:        'u-001',
  name:      '김운영자',
  email:     'admin@sellops.com',
  role:      '슈퍼 어드민',
  avatarUrl: undefined,
};

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id:        'notif-001',
    title:     '알림',
    message:   '테스트 메시지',
    type:      'low_stock',
    isRead:    false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPush.mockClear();
  (global.fetch as jest.Mock).mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardLayout - 기본 렌더링', () => {
  test('에러 없이 렌더링된다', () => {
    expect(() =>
      render(
        <DashboardLayout currentUser={MOCK_USER}>
          <div>컨텐츠</div>
        </DashboardLayout>,
      ),
    ).not.toThrow();
  });

  test('children이 렌더링된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div data-testid="child-content">자식 컨텐츠</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  test('Sidebar 컴포넌트가 렌더링된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  test('Header 컴포넌트가 렌더링된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  test('pageTitle이 Header에 전달된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER} pageTitle="상품 관리">
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('page-title').textContent).toBe('상품 관리');
  });

  test('pageTitle 미전달 시 기본값 "대시보드"가 전달된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('page-title').textContent).toBe('대시보드');
  });

  test('currentUser가 Sidebar에 전달된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('sidebar-user').textContent).toBe('김운영자');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardLayout - nativeScroll prop (PR 변경사항)', () => {
  test('nativeScroll=false (기본): 최상위 컨테이너가 h-screen 클래스를 가진다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={false}>
        <div>content</div>
      </DashboardLayout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-screen');
  });

  test('nativeScroll=false (기본): 최상위 컨테이너가 overflow-hidden 클래스를 가진다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={false}>
        <div>content</div>
      </DashboardLayout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('overflow-hidden');
  });

  test('nativeScroll=true: 최상위 컨테이너가 min-h-screen 클래스를 가진다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={true}>
        <div>content</div>
      </DashboardLayout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('min-h-screen');
  });

  test('nativeScroll=true: 최상위 컨테이너가 h-screen을 포함하지 않는다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={true}>
        <div>content</div>
      </DashboardLayout>,
    );
    const root = container.firstChild as HTMLElement;
    // min-h-screen은 있어도 h-screen은 없어야 함
    expect(root.className.split(/\s+/)).not.toContain('h-screen');
  });

  test('nativeScroll=true: overflow-hidden 클래스가 없다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={true}>
        <div>content</div>
      </DashboardLayout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain('overflow-hidden');
  });

  test('nativeScroll=true: 사이드바가 sticky top-0 클래스를 가진 래퍼 안에 있다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={true}>
        <div>content</div>
      </DashboardLayout>,
    );
    const stickyWrapper = container.querySelector('.sticky.top-0');
    expect(stickyWrapper).not.toBeNull();
  });

  test('nativeScroll=false: sticky top-0 래퍼가 없다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={false}>
        <div>content</div>
      </DashboardLayout>,
    );
    const stickyWrapper = container.querySelector('.sticky.top-0');
    expect(stickyWrapper).toBeNull();
  });

  test('nativeScroll=true: main 태그에 overflow-y-auto가 없다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={true}>
        <div>content</div>
      </DashboardLayout>,
    );
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    expect(main!.className).not.toContain('overflow-y-auto');
  });

  test('nativeScroll=false: main 태그에 overflow-y-auto가 있다', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={false}>
        <div>content</div>
      </DashboardLayout>,
    );
    const main = container.querySelector('main');
    expect(main).not.toBeNull();
    expect(main!.className).toContain('overflow-y-auto');
  });

  test('nativeScroll prop 미전달 시 기본값 false 동작 (h-screen 있음)', () => {
    const { container } = render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-screen');
  });

  test('nativeScroll=true: children이 정상 렌더링된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={true}>
        <div data-testid="native-child">네이티브 스크롤 컨텐츠</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('native-child')).toBeInTheDocument();
  });

  test('nativeScroll=true: Sidebar와 Header 모두 렌더링된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER} nativeScroll={true}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardLayout - notifications 상태 관리', () => {
  const notifications = [
    makeNotification({ id: 'notif-001', isRead: false }),
    makeNotification({ id: 'notif-002', isRead: false }),
  ];

  test('초기 알림 목록이 전달된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER} notifications={notifications}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('notif-count').textContent).toBe('2');
  });

  test('알림 없을 때 count는 0이다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER} notifications={[]}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('notif-count').textContent).toBe('0');
  });

  test('onMarkRead 호출 시 해당 알림이 읽음 처리된다', async () => {
    render(
      <DashboardLayout currentUser={MOCK_USER} notifications={notifications}>
        <div>content</div>
      </DashboardLayout>,
    );

    expect(screen.getByTestId('unread-count').textContent).toBe('2');

    fireEvent.click(screen.getByTestId('mark-read'));

    await waitFor(() => {
      expect(screen.getByTestId('unread-count').textContent).toBe('1');
    });
  });

  test('onMarkAllRead 호출 시 모든 알림이 읽음 처리된다', async () => {
    render(
      <DashboardLayout currentUser={MOCK_USER} notifications={notifications}>
        <div>content</div>
      </DashboardLayout>,
    );

    fireEvent.click(screen.getByTestId('mark-all-read'));

    await waitFor(() => {
      expect(screen.getByTestId('unread-count').textContent).toBe('0');
    });
  });

  test('notifications 미전달 시 빈 배열로 처리된다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('notif-count').textContent).toBe('0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardLayout - 모바일 메뉴 토글', () => {
  test('초기에는 모바일 메뉴가 닫혀 있다', () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('header').getAttribute('data-mobile-open')).toBe('false');
    expect(screen.getByTestId('sidebar').getAttribute('data-mobile-open')).toBe('false');
  });

  test('모바일 메뉴 토글 클릭 시 mobileOpen이 true가 된다', async () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );

    fireEvent.click(screen.getByTestId('mobile-toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('header').getAttribute('data-mobile-open')).toBe('true');
    });
  });

  test('사이드바 닫기 버튼 클릭 시 mobileOpen이 false가 된다', async () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );

    // 먼저 열기
    fireEvent.click(screen.getByTestId('mobile-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('sidebar').getAttribute('data-mobile-open')).toBe('true');
    });

    // 닫기
    fireEvent.click(screen.getByTestId('sidebar-close'));
    await waitFor(() => {
      expect(screen.getByTestId('sidebar').getAttribute('data-mobile-open')).toBe('false');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardLayout - 로그아웃', () => {
  test('로그아웃 클릭 시 /api/auth/logout에 POST 요청을 보낸다', async () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );

    fireEvent.click(screen.getByTestId('sidebar-logout'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    });
  });

  test('로그아웃 후 /auth/login으로 이동한다', async () => {
    render(
      <DashboardLayout currentUser={MOCK_USER}>
        <div>content</div>
      </DashboardLayout>,
    );

    fireEvent.click(screen.getByTestId('sidebar-logout'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });
});
