// src/components/NotificationPanel.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
// Remove Card related imports if not used directly in NotificationPanel itself
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, BellRing, Trash2 } from 'lucide-react'; // Removed CheckCheck, Layers. Kept Trash2 for "Clear All"
import { AppNotification } from '@/types/notification';
import { notificationStore } from '@/stores/notificationStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationItem: React.FC<{
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void; // New prop for removing individual notification
}> = ({ notification, onMarkRead, onRemove }) => {
  const variantStyles = {
    default: 'bg-card border-l-4 border-primary',
    destructive: 'bg-gray-600 border-l-4 border-gray-600 text-white dark:text-gray-200',
    // Add other variants if needed
  };

  const handleItemClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent onClick on parent div from firing
    onRemove(notification.id);
  };

  return (
    <div
      className={cn(
        "p-3 mb-2 rounded-lg shadow-sm transition-colors relative group",
        variantStyles[notification.variant || 'default'],
        notification.read && "opacity-100 hover:opacity-95"
      )}
      onClick={handleItemClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick()}}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-6"> {/* Added pr-6 to make space for close button */}
          {notification.title && <h4 className="font-semibold text-sm text-gray-200">{notification.title}</h4>}
          {notification.description && (
            <p className="text-xs text-muted-foreground mt-1 text-white">
              {typeof notification.description === 'string' ? notification.description : 'Notification event'}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground/80 mt-2 text-white">
        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
      </p>
      {notification.action && <div className="mt-2">{notification.action}</div>}

      {/* Individual Close (Mark as Read or Remove) Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 p-0 text-white opacity-50 group-hover:opacity-100 hover:bg-muted/50 rounded-full"
        onClick={handleRemoveClick}
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};


const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Readonly<AppNotification[]>>(notificationStore.getNotifications());
  const [panelWidth, setPanelWidth] = useState(380); // Initial width
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setNotifications([...notificationStore.getNotifications()]);
    });
    return unsubscribe;
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const handleClearAll = () => {
    notificationStore.clearAll();
  };

  const handleMarkRead = (id: string) => {
    notificationStore.markAsRead(id);
  };

  // New function to handle removing/dismissing a single notification from the panel
  // For now, let's make "removing" equivalent to "marking as read"
  // If you want to truly remove it from the store, you'd need a new method in notificationStore.ts
  const handleRemoveNotification = (id: string) => {
    notificationStore.removeNotification(id); // Call the new store method
  };


  // Resizing logic (remains the same)
  const handleMouseDownResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
    document.addEventListener('mousemove', handleMouseMoveResize);
    document.addEventListener('mouseup', handleMouseUpResize);
  };

  const handleMouseMoveResize = (e: MouseEvent) => {
    if (isResizing) {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current - deltaX;
      if (newWidth > 300 && newWidth < 700) {
        setPanelWidth(newWidth);
      }
    }
  };

  const handleMouseUpResize = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMoveResize);
    document.removeEventListener('mouseup', handleMouseUpResize);
  };


  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-card border-l border-border shadow-xl transition-transform duration-300 ease-in-out z-40 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: `${panelWidth}px` }}
      >
        {isOpen && (
            <div
              className="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize z-50 hover:bg-primary/20 transition-colors"
              onMouseDown={handleMouseDownResize}
              title="Resize panel"
            />
        )}
        <div className="bg-gray-300 flex items-center justify-between p-4 ">
          <div className="flex items-center">
            <BellRing className="h-5 w-5 mr-2 text-primary" />
            <h3 className="font-semibold text-lg text-foreground">Notifications</h3>
            {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
                 <Button
                    variant="ghost" // Changed from destructive to ghost for a less aggressive look
                    size="icon"
                    onClick={handleClearAll}
                    title="Clear all notifications"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                 </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Removed the actions bar with "Mark all read" and "Clear Read" */}

        <ScrollArea className="bg-gray-300 flex-1">
          {notifications.length > 0 ? (
            <div className="p-4 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onRemove={handleRemoveNotification} // Pass the new handler
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <BellRing className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No new notifications.</p>
              <p className="text-xs text-muted-foreground/80">You're all caught up!</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
};

export default NotificationPanel;