'use client';

import { AnimatePresence } from 'framer-motion';
import { NotificationCard } from './notification-card';
import type { NotificationPayload } from '@/providers/notification-provider';

interface NotificationContainerProps {
  notifications: NotificationPayload[];
  onDismiss: (id: string) => void;
}

const NotificationContainer = ({ notifications, onDismiss }: NotificationContainerProps) => {
  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-auto md:top-0 md:right-0 z-50 p-4 flex flex-col items-center md:items-end pointer-events-none">
       <div className="w-full max-w-sm">
        <AnimatePresence>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              {...notification}
              onDismiss={() => onDismiss(notification.id)}
            />
          ))}
        </AnimatePresence>
       </div>
    </div>
  );
};

export default NotificationContainer;
