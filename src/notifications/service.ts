// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { v4 as uuidv4 } from "uuid";
import type { Notification, NotificationType } from "../types/index.js";

const notifications: Notification[] = [];
const webhookUrls: string[] = [];

/**
 * Create and store a notification.
 */
export function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  sessionId: string,
  taskId?: string,
  agentId?: string
): Notification {
  const notification: Notification = {
    id: uuidv4(),
    type,
    title,
    message,
    sessionId,
    taskId: taskId || null,
    agentId: agentId || null,
    timestamp: new Date().toISOString(),
    read: false,
  };

  notifications.push(notification);

  // Fire webhooks asynchronously
  fireWebhooks(notification).catch(() => {});

  return notification;
}

/**
 * Get unread notifications for a session.
 */
export function getUnreadNotifications(sessionId: string): Notification[] {
  return notifications.filter(
    (n) => n.sessionId === sessionId && !n.read
  );
}

/**
 * Mark a notification as read.
 */
export function markRead(notificationId: string): void {
  const n = notifications.find((n) => n.id === notificationId);
  if (n) n.read = true;
}

/**
 * Mark all notifications for a session as read.
 */
export function markAllRead(sessionId: string): number {
  let count = 0;
  for (const n of notifications) {
    if (n.sessionId === sessionId && !n.read) {
      n.read = true;
      count++;
    }
  }
  return count;
}

/**
 * Register a webhook URL for notifications.
 */
export function registerWebhook(url: string): void {
  if (!webhookUrls.includes(url)) {
    webhookUrls.push(url);
  }
}

/**
 * Fire webhooks for a notification.
 */
async function fireWebhooks(notification: Notification): Promise<void> {
  for (const url of webhookUrls) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Silently ignore webhook failures
    }
  }
}
