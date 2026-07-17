import { prisma } from '@/lib/prisma';

export interface NotificationData {
  userId: string;
  taskId?: string;
  title: string;
  message: string;
  type: 'task' | 'reminder' | 'system';
  read?: boolean;
}

export async function sendNotification(data: NotificationData): Promise<{ success: boolean; notification?: any; error?: string }> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        taskId: data.taskId,
        title: data.title,
        message: data.message,
        type: data.type,
        read: data.read ?? false,
      },
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

export async function getUserNotifications(userId: string, options?: { read?: boolean; limit?: number }): Promise<any[]> {
  try {
    const where: { userId: string; read?: boolean } = { userId };
    
    if (options?.read !== undefined) {
      where.read = options.read;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<{ success: boolean; notification?: any; error?: string }> {
  try {
    const notification = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    if (notification.count === 0) {
      return { success: false, error: 'Notification not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

export async function createTaskNotification(taskId: string, userId: string, action: 'created' | 'updated' | 'completed'): Promise<void> {
  const messages = {
    created: 'A new task has been created',
    updated: 'A task has been updated',
    completed: 'A task has been completed',
  };

  await sendNotification({
    userId,
    taskId,
    title: 'Task Update',
    message: messages[action],
    type: 'task',
  });
}

export async function createReminderNotification(userId: string, taskId: string, dueDate: Date): Promise<void> {
  await sendNotification({
    userId,
    taskId,
    title: 'Task Reminder',
    message: `This task is due on ${dueDate.toISOString()}`,
    type: 'reminder',
  });
}