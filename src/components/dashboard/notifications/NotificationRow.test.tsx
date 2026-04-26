import { fireEvent, render, screen } from '@testing-library/react';
import { NotificationRow } from './NotificationRow';
import type { Notification } from '@/features/notifications/types/notification.types';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const BASE_NOTIFICATION: Notification = {
  id: 'notif-001',
  type: 'order',
  level: 'info',
  title: '주문 상태 변경',
  message: '배송을 시작해주세요.',
  link: '/dashboard/orders/order-001',
  is_read: false,
  created_at: '2026-04-25T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NotificationRow', () => {
  test('링크가 있어도 중첩된 anchor를 만들지 않는다', () => {
    const { container } = render(
      <ul>
        <NotificationRow
          notification={BASE_NOTIFICATION}
          onMarkRead={jest.fn()}
          onDelete={jest.fn()}
        />
      </ul>,
    );

    expect(container.querySelectorAll('a')).toHaveLength(1);
  });

  test('행 클릭 시 읽음 처리 후 router.push로 이동한다', () => {
    const onMarkRead = jest.fn();

    render(
      <ul>
        <NotificationRow
          notification={BASE_NOTIFICATION}
          onMarkRead={onMarkRead}
          onDelete={jest.fn()}
        />
      </ul>,
    );

    fireEvent.click(screen.getByText('주문 상태 변경').closest('li') as HTMLElement);

    expect(onMarkRead).toHaveBeenCalledWith('notif-001');
    expect(mockPush).toHaveBeenCalledWith('/dashboard/orders/order-001');
  });

  test('바로가기 링크 클릭은 부모 클릭과 겹치지 않는다', () => {
    const onMarkRead = jest.fn();

    render(
      <ul>
        <NotificationRow
          notification={BASE_NOTIFICATION}
          onMarkRead={onMarkRead}
          onDelete={jest.fn()}
        />
      </ul>,
    );

    fireEvent.click(screen.getByText('바로가기'));

    expect(onMarkRead).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
