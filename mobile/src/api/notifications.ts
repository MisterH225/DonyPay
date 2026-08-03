import { apiRequest } from './client';
import type { NotificationItem } from './types';

export function listNotifications(userId: string) {
  return apiRequest<NotificationItem[]>(`/notifications/users/${userId}`);
}
