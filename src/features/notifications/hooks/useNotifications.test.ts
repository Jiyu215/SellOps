import { act, renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import type { Notification } from '@/types/dashboard';

const mockRemoveChannel = jest.fn();
const channelOn = jest.fn();
const channelSubscribe = jest.fn();

let deleteCallback: ((payload: { old: { id: string } }) => void) | null = null;

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: channelOn,
      subscribe: channelSubscribe,
    }),
    removeChannel: mockRemoveChannel,
  }),
}));

const BASE_NOTIFICATION: Notification = {
  id: 'notif-001',
  type: 'order',
  level: 'info',
  title: '주문 알림',
  message: '테스트 메시지',
  link: '/dashboard/orders/order-001',
  is_read: false,
  created_at: '2026-04-26T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  deleteCallback = null;

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ items: [BASE_NOTIFICATION] }),
  }) as jest.Mock;

  channelOn.mockImplementation((
    _event: string,
    config: { event: string },
    callback: (payload: unknown) => void,
  ) => {
    if (config.event === 'DELETE') {
      deleteCallback = callback as (payload: { old: { id: string } }) => void;
    }

    return {
      on: channelOn,
      subscribe: channelSubscribe,
    };
  });

  channelSubscribe.mockReturnValue({ id: 'channel-1' });
});

describe('useNotifications', () => {
  test('realtime DELETE 이벤트가 오면 해당 알림을 즉시 제거한다', async () => {
    const { result } = renderHook(() => useNotifications([BASE_NOTIFICATION]));

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    expect(deleteCallback).not.toBeNull();

    await act(async () => {
      deleteCallback?.({ old: { id: 'notif-001' } });
    });

    expect(result.current.notifications).toEqual([]);
  });
});
