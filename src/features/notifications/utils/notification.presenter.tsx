import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type {
  NotificationLevel,
  NotificationType,
} from '@/features/notifications/types/notification.types';

export const NOTIFICATION_LEVEL_CONFIG: Record<
  NotificationLevel,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  critical: {
    icon: <ExclamationCircleOutlined aria-hidden="true" />,
    color: 'text-light-error dark:text-dark-error',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: '긴급',
  },
  warning: {
    icon: <WarningOutlined aria-hidden="true" />,
    color: 'text-light-warning dark:text-dark-warning',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: '주의',
  },
  info: {
    icon: <InfoCircleOutlined aria-hidden="true" />,
    color: 'text-light-info dark:text-dark-info',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: '정보',
  },
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  order: '주문',
  inventory: '재고',
  product: '상품',
  system: '시스템',
};

export const formatNotificationRelativeTime = (isoString: string): string => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;

  return `${Math.floor(diffHr / 24)}일 전`;
};
