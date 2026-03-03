'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CloudRain, Droplet, Sprout, CheckCircle, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@/lib/i18n';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertType = 'disease' | 'weather' | 'irrigation' | 'system';

type Alert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  icon: React.ReactNode;
  title: string;
  message: string;
  timestamp: string;
  details: string;
  action: string;
};

// Auto-generates realistic demo alerts for hackathon presentation
const generateDemoAlerts = (): Alert[] => [
  {
    id: 'alert-1',
    type: 'disease',
    severity: 'critical',
    icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
    title: 'Blight Detected in Sector 4',
    message: 'High probability of Late Blight on your tomato crops.',
    timestamp: '5m ago',
    details: 'Our AI detected visual patterns consistent with Late Blight. High humidity and moderate temperatures are increasing the risk of a rapid spread. Immediate action is recommended to contain the outbreak.',
    action: 'View Treatment Plan',
  },
  {
    id: 'alert-2',
    type: 'weather',
    severity: 'warning',
    icon: <CloudRain className="h-5 w-5 text-warning" />,
    title: 'Heavy Rain Forecasted',
    message: 'Storm expected tomorrow at 6 PM. Potential for flooding.',
    timestamp: '1h ago',
    details: 'A weather system is moving into your area, with an 80% chance of precipitation exceeding 2 inches. Ensure proper drainage and consider harvesting any vulnerable crops.',
    action: 'Check Weather Details',
  },
  {
    id: 'alert-3',
    type: 'irrigation',
    severity: 'info',
    icon: <Droplet className="h-5 w-5 text-info" />,
    title: 'Irrigation Reminder',
    message: 'Sector 2 soil moisture is low. Time to water.',
    timestamp: '4h ago',
    details: 'Soil moisture levels in Sector 2 have dropped below the 25% threshold. We recommend running your irrigation system for 45 minutes to restore optimal moisture.',
    action: 'Start Irrigation Cycle',
  },
];


export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    // Load demo alerts on initial mount for hackathon showcase
    setTimeout(() => {
        setAlerts(generateDemoAlerts());
        setIsLoading(false);
    }, 500);
  }, []);

  const handleResolve = (id: string) => {
    haptics.success();
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
  };
  
  const severityClasses: Record<AlertSeverity, string> = {
    critical: 'border-l-4 border-destructive',
    warning: 'border-l-4 border-warning',
    info: 'border-l-4 border-info',
  };

  return (
    <div className="flex-1 bg-background flex flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
        <h1 className="text-xl font-bold">Alerts</h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {alerts.length > 0 ? (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 space-y-3"
            >
              <Accordion type="single" collapsible className="w-full space-y-3">
                {alerts.map((alert, index) => (
                    <motion.div
                        key={alert.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                     <Card className={cn("overflow-hidden shadow-sm", severityClasses[alert.severity])}>
                        <AccordionItem value={alert.id} className="border-b-0">
                            <AccordionTrigger className="p-4 hover:no-underline data-[state=open]:bg-secondary/50">
                                <div className="flex items-start gap-4 text-left">
                                    <div className="flex-shrink-0 mt-1">{alert.icon}</div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-card-foreground">{alert.title}</p>
                                        <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="border-t pt-4">
                                    <p className="text-muted-foreground mb-4">{alert.details}</p>
                                    <div className="flex gap-2">
                                        <Button className="flex-1" size="sm" onClick={() => haptics.heavy()}>
                                            {alert.action}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleResolve(alert.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                     </Card>
                    </motion.div>
                ))}
             </Accordion>
            </motion.div>
          ) : (
            !isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center h-full p-8"
              >
                <div className="p-6 bg-primary-soft-bg rounded-full mb-6">
                    <Sprout className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-xl font-bold">All Clear!</h2>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  No alerts right now. Your farm is looking healthy and happy.
                </p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
