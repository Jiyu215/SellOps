export type NotificationType  = 'order' | 'inventory' | 'product' | 'system'
export type NotificationLevel = 'critical' | 'warning' | 'info'

export type Notification = {
  id:         string
  type:       NotificationType
  level:      NotificationLevel
  title:      string
  message:    string
  link:       string | null
  is_read:    boolean
  created_at: string
}

export type NotificationSummary = {
  total_unread: number
  has_critical: boolean
}

export type NotificationListQuery = {
  status?: 'unread'
  type?:   NotificationType
  level?:  NotificationLevel
  period?: 'today' | '7d' | '30d'
  page?:   number
  limit?:  number
}

export type NotificationListSummary = {
  total:    number
  unread:   number
  critical: number
  warning:  number
}

export type NotificationListResponse = {
  items:   Notification[]
  total:   number
  page:    number
  limit:   number
  summary: NotificationListSummary
}
