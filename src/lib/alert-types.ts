/**
 * @fileOverview Shared types for the Early Outbreak Alert system.
 * Used across the alert service, API route, AI flow, and UI components.
 */

// ── Alert severity & type enums ──────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType = 'disease' | 'weather' | 'irrigation';

// ── Data source attribution ──────────────────────────────────────────────────

export interface DataSource {
    name: string;           // e.g. "NASA POWER", "OpenWeatherMap"
    url?: string;           // link to the source
    description: string;    // e.g. "Satellite-derived weather data"
}

// ── Weather data from APIs ───────────────────────────────────────────────────

export interface WeatherData {
    temperature: number;        // °C
    humidity: number;           // %
    windSpeed: number;          // m/s
    rainfall24h: number;        // mm in last 24h
    forecastRain48h: number;    // mm expected in next 48h
    description: string;        // e.g. "light rain"
    source: DataSource;
    fetchedAt: number;          // timestamp ms
}

// ── NASA POWER climate data ──────────────────────────────────────────────────

export interface NASAPowerData {
    avgTemperature: number;     // °C (recent days average)
    avgHumidity: number;        // %
    totalPrecipitation: number; // mm (recent days total)
    source: DataSource;
    fetchedAt: number;
}

// ── Generated alert ──────────────────────────────────────────────────────────

export interface OutbreakAlert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    details: string;
    action: string;
    timestamp: string;          // human-readable relative time
    generatedAt: number;        // timestamp ms
    source: DataSource;         // which data source drove this alert
    thresholds?: {              // the conditions that triggered the alert
        metric: string;
        value: number;
        threshold: number;
        unit: string;
    }[];
}

// ── Alert request/response ───────────────────────────────────────────────────

export interface AlertRequest {
    lat: number;
    lng: number;
    cropType: string;
    region?: string;            // "city, state, country"
    soilType?: string;
}

export interface AlertResponse {
    alerts: OutbreakAlert[];
    weather: WeatherData | null;
    nasaPower: NASAPowerData | null;
    generatedAt: number;
    error?: string;
}
