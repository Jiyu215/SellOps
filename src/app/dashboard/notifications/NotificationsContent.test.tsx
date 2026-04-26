import { act, render, screen, waitFor } from '@testing-library/react';
import { NotificationsContent } from './NotificationsContent';
import type {
  Notification,
  NotificationListSummary,
} from '@/features/notifications/types/notification.types';
import { deleteNotification } from '@/features/notifications/api/notification.api';

let latestListProps: {
  notifications: Notification[];
  onMarkRead: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
} | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
  usePathname: () => '/dashboard/notifications',
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

jest.mock('@/features/notifications/api/notification.api', () => ({
  fetchNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

jest.mock('@/components/dashboard/notifications/NotificationSummaryBar', () => ({
  NotificationSummaryBar: ({
    summary,
  }: {
    summary: NotificationListSummary;
  }) => (
    <div>
      <span data-testid="summary-total">{summary.total}</span>
      <span data-testid="summary-unread">{summary.unread}</span>
      <span data-testid="summary-critical">{summary.critical}</span>
      <span data-testid="summary-warning">{summary.warning}</span>
    </div>
  ),
}));

jest.mock('@/components/dashboard/notifications/NotificationFilterBar', () => ({
  NotificationFilterBar: () => <div data-testid="filter-bar" />,
}));

jest.mock('@/components/dashboard/notifications/NotificationEmptyState', () => ({
  NotificationEmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock('@/components/dashboard/notifications/NotificationSkeleton', () => ({
  NotificationSkeleton: () => <div data-testid="loading-state" />,
}));

jest.mock('@/components/dashboard/notifications/NotificationList', () => ({
  NotificationList: (props: typeof latestListProps) => {
    latestListProps = props;
    return <div data-testid="notification-count">{props?.notifications.length ?? 0}</div>;
  },
}));

const mockDeleteNotification = deleteNotification as jest.MockedFunction<typeof deleteNotification>;

const READ_NOTIFICATION: Notification = {
  id: 'notif-001',
  type: 'system',
  level: 'info',
  title: '읽은 알림',
  message: '읽은 알림 메시지',
  link: null,
  is_read: true,
  created_at: '2026-04-26T00:00:00.000Z',
};

const INITIAL_SUMMARY: NotificationListSummary = {
  total: 1,
  unread: 0,
  critical: 0,
  warning: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  latestListProps = null;
  mockDeleteNotification.mockResolvedValue();
});

describe('NotificationsContent', () => {
  test('읽은 알림 삭제 시 summary total도 함께 감소한다', async () => {
    render(
      <NotificationsContent
        initialNotifications={[READ_NOTIFICATION]}
        initialTotal={1}
        initialSummary={INITIAL_SUMMARY}
      />,
    );

    expect(screen.getByTestId('summary-total')).toHaveTextContent('1');
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');

    await act(async () => {
      await latestListProps?.onDelete('notif-001');
    });

    await waitFor(() => {
      expect(screen.getByTestId('summary-total')).toHaveTextContent('0');
    });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(mockDeleteNotification).toHaveBeenCalledWith('notif-001');
  });
});
