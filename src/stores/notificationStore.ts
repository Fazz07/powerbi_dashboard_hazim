// src/stores/notificationStore.ts
import { AppNotification } from '@/types/notification';
import { toast } from '@/hooks/use-toast'; // Type from useToast, need to ensure it's exported or define similar local type
import { ToastActionElement, ToastProps } from "@/components/ui/toast" // Import for variant type


// Make sure this type aligns with what useToast's toast() function receives
type ToastInputProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastProps["variant"];
  action?: ToastActionElement;
  // Add any other properties from the toast() function's argument
};


let notifications: AppNotification[] = [];
const listeners: Array<() => void> = [];
let nextId = 0;

const MAX_NOTIFICATIONS_IN_PANEL = 50;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const notificationStore = {
    
  addNotification: (toastProps: ToastInputProps) => {
    const newNotification: AppNotification = {
      id: `notif-${nextId++}`,
      title: toastProps.title,
      description: toastProps.description,
      timestamp: new Date(),
      read: false, // New notifications are unread
      variant: toastProps.variant,
      action: toastProps.action,
    };
    notifications = [newNotification, ...notifications];
    if (notifications.length > MAX_NOTIFICATIONS_IN_PANEL) {
      notifications = notifications.slice(0, MAX_NOTIFICATIONS_IN_PANEL);
    }
    emitChange();
  },
  getNotifications: (): Readonly<AppNotification[]> => notifications,
  getUnreadCount: (): number => notifications.filter(n => !n.read).length,
  markAsRead: (id: string) => {
    notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    emitChange();
  },
  markAllAsRead: () => {
    notifications = notifications.map(n => ({ ...n, read: true }));
    emitChange();
  },
  clearAll: () => {
    notifications = [];
    emitChange();
  },
  clearRead: () => {
    notifications = notifications.filter(n => !n.read);
    emitChange();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  },
  removeNotification: (id: string) => {
    notifications = notifications.filter(n => n.id !== id);
    emitChange();
  },
};