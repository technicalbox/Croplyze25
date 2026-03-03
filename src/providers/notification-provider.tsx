'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import NotificationContainer from '@/components/ui/notification-container';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  addNotification: (notification: Omit<NotificationPayload, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let idCounter = 0;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationPayload, 'id'>) => {
    const id = (idCounter++).toString();
    const newNotification = { ...notification, id };
    setNotifications(current => [newNotification, ...current]); // Prepend new notifications

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        removeNotification(id);
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(current => current.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context.addNotification;
};
