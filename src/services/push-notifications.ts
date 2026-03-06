/**
 * @fileOverview Browser push notification service for weather alerts.
 *
 * Uses the Web Notifications API (works on desktop + mobile browsers).
 * Sends notifications only for Moderate or High severity alerts.
 * Throttles to max 3 notifications per day to avoid spamming.
 *
 * When a user taps a notification, it opens the Weather Alerts page.
 */

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_NOTIFICATIONS_PER_DAY = 3;
const LS_KEY_NOTIFICATION_COUNT = 'croplyze_notif_count';
const LS_KEY_NOTIFICATION_DATE = 'croplyze_notif_date';

// ── Permission helpers ───────────────────────────────────────────────────────

export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!isNotificationSupported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';

    const result = await Notification.requestPermission();
    return result;
}

// ── Daily throttle ───────────────────────────────────────────────────────────

function getTodayKey(): string {
    return new Date().toISOString().slice(0, 10); // "2026-03-05"
}

function getDailyCount(): number {
    if (typeof window === 'undefined') return 0;
    const storedDate = localStorage.getItem(LS_KEY_NOTIFICATION_DATE);
    const today = getTodayKey();

    if (storedDate !== today) {
        // Reset counter for new day
        localStorage.setItem(LS_KEY_NOTIFICATION_DATE, today);
        localStorage.setItem(LS_KEY_NOTIFICATION_COUNT, '0');
        return 0;
    }

    return parseInt(localStorage.getItem(LS_KEY_NOTIFICATION_COUNT) ?? '0', 10);
}

function incrementDailyCount(): void {
    if (typeof window === 'undefined') return;
    const count = getDailyCount() + 1;
    localStorage.setItem(LS_KEY_NOTIFICATION_COUNT, count.toString());
    localStorage.setItem(LS_KEY_NOTIFICATION_DATE, getTodayKey());
}

function canSendNotification(): boolean {
    return getDailyCount() < MAX_NOTIFICATIONS_PER_DAY;
}

// ── Severity icons (text emoji for notifications) ────────────────────────────

const SEVERITY_EMOJI: Record<string, string> = {
    critical: '🚨',
    high: '⚠️',
    moderate: '📢',
    low: 'ℹ️',
};

const TYPE_EMOJI: Record<string, string> = {
    pest_disease: '🦠',
    weather: '🌧️',
    irrigation: '💧',
    disaster: '🚨',
    crop_risk: '🌾',
    harvest: '🌻',
};

// ── Send notification ────────────────────────────────────────────────────────

export interface AlertNotification {
    type: string;
    severity: string;
    title: string;
    message: string;
    alertId?: string;
}

/**
 * Send a browser push notification for a weather alert.
 * Only sends for warning/critical severity.
 * Throttled to max 3 per day.
 * Clicking opens the /alerts page.
 */
export function sendAlertNotification(alert: AlertNotification): boolean {
    // Only send for high/critical severity (+ disaster alerts)
    if (alert.severity !== 'high' && alert.severity !== 'critical') {
        return false;
    }

    // Check if notifications are supported and permitted
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return false;
    }

    // Check daily throttle
    if (!canSendNotification()) {
        console.log('[notifications] Daily limit reached, skipping notification.');
        return false;
    }

    try {
        const emoji = TYPE_EMOJI[alert.type] ?? SEVERITY_EMOJI[alert.severity] ?? '🌾';
        const notification = new Notification(`${emoji} ${alert.title}`, {
            body: alert.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `weather-alert-${alert.type}-${alert.severity}`,
            requireInteraction: alert.severity === 'critical',
        } as NotificationOptions);

        // Open alerts page when tapped
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            window.location.href = '/alerts';
        };

        incrementDailyCount();
        return true;
    } catch (err) {
        console.error('[notifications] Failed to send:', err);
        return false;
    }
}

/**
 * Send notifications for a batch of alerts.
 * Filters to only warning/critical and respects daily limit.
 */
export function sendAlertNotifications(alerts: AlertNotification[]): number {
    let sent = 0;

    // Sort: critical first, then high
    const eligible = alerts
        .filter(a => a.severity === 'critical' || a.severity === 'high')
        .sort((a, b) => {
            if (a.severity === 'critical' && b.severity !== 'critical') return -1;
            if (b.severity === 'critical' && a.severity !== 'critical') return 1;
            return 0;
        });

    for (const alert of eligible) {
        if (sendAlertNotification(alert)) {
            sent++;
        }
        if (!canSendNotification()) break;
    }

    return sent;
}
