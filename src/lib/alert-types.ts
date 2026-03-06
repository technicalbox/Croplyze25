/**
 * @fileOverview Shared types for the comprehensive Alerts system.
 * Supports 9 alert categories with extensible structure.
 */

// ── Alert severity ───────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'moderate' | 'low';

// ── Alert categories ─────────────────────────────────────────────────────────

export type AlertCategory =
    | 'weather'
    | 'crop_risk'
    | 'pest_disease'
    | 'irrigation'
    | 'harvest'
    | 'market'
    | 'government'
    | 'farm_task'
    | 'disaster';

// ── Category metadata (for display) ─────────────────────────────────────────

export interface CategoryMeta {
    id: AlertCategory;
    label: string;
    emoji: string;
}

export const ALERT_CATEGORIES: CategoryMeta[] = [
    { id: 'weather', label: 'Weather', emoji: '🌦' },
    { id: 'crop_risk', label: 'Crop Risk', emoji: '🌾' },
    { id: 'pest_disease', label: 'Pest & Disease', emoji: '🐛' },
    { id: 'irrigation', label: 'Irrigation', emoji: '💧' },
    { id: 'harvest', label: 'Harvest', emoji: '🌻' },
    { id: 'market', label: 'Market Price', emoji: '📈' },
    { id: 'government', label: 'Govt. Schemes', emoji: '🏛' },
    { id: 'farm_task', label: 'Farm Tasks', emoji: '📋' },
    { id: 'disaster', label: 'Disaster', emoji: '🚨' },
];

// ── Data source attribution ──────────────────────────────────────────────────

export interface DataSource {
    name: string;
    url?: string;
    description: string;
}

// ── Weather data from APIs ───────────────────────────────────────────────────

export interface WeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    rainfall24h: number;
    forecastRain48h: number;
    description: string;
    source: DataSource;
    fetchedAt: number;
}

export interface NASAPowerData {
    avgTemperature: number;
    avgHumidity: number;
    totalPrecipitation: number;
    source: DataSource;
    fetchedAt: number;
}

// ── Generated alert ──────────────────────────────────────────────────────────

export interface OutbreakAlert {
    id: string;
    type: string;               // sub-type e.g. "heavy_rain", "blight_risk"
    category: AlertCategory;
    severity: AlertSeverity;
    title: string;
    message: string;
    details: string;
    action: string;
    crop?: string;
    timestamp: string;
    generatedAt: number;
    expiresAt: number;
    source: DataSource;
    location?: string;
    read?: boolean;
    thresholds?: {
        metric: string;
        value: number;
        threshold: number;
        unit: string;
    }[];
}

// ── API request/response ─────────────────────────────────────────────────────

export interface AlertRequest {
    lat: number;
    lng: number;
    cropType: string;
    region?: string;
    soilType?: string;
}

export interface AlertResponse {
    alerts: OutbreakAlert[];
    weather: WeatherData | null;
    nasaPower: NASAPowerData | null;
    generatedAt: number;
    error?: string;
}

// ── Firestore document shape ─────────────────────────────────────────────────

export interface AlertDocument {
    id?: string;
    userId: string;
    alert_type: string;
    category: AlertCategory;
    title: string;
    description: string;
    severity: AlertSeverity;
    crop?: string;
    location: string;
    created_at: number;
    expires_at: number;
    read_status: boolean;
    source_name: string;
    source_url?: string;
    details: string;
    action: string;
}
