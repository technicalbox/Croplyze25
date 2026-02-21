'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/providers/notification-provider';

interface NotificationCardProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  onDismiss: () => void;
}

const icons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle className="h-6 w-6 text-success" />,
  error: <XCircle className="h-6 w-6 text-destructive" />,
  warning: <AlertTriangle className="h-6 w-6 text-warning" />,
  info: <Info className="h-6 w-6 text-info" />,
};

const hapticFeedback: Record<NotificationType, () => void> = {
    success: haptics.success,
    error: haptics.error,
    warning: haptics.light,
    info: haptics.light,
}

export const NotificationCard = ({ type, title, message, onDismiss }: NotificationCardProps) => {

  useEffect(() => {
    hapticFeedback[type]();
  }, [type]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative w-full p-4 mb-3 overflow-hidden rounded-xl shadow-lg bg-card text-card-foreground border border-border pointer-events-auto"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 100) {
          onDismiss();
        }
      }}
    >
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
            <div className="flex-grow">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <button onClick={onDismiss} className="flex-shrink-0 -mt-1 -mr-1 p-1 rounded-full hover:bg-secondary active:scale-90 transition-transform">
                <X className="h-5 w-5 text-muted-foreground" />
            </button>
        </div>
    </motion.div>
  );
};
