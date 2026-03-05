/**
 * @fileOverview Weather service — fetches real-time weather data from
 * OpenWeatherMap and NASA POWER APIs.
 *
 * OpenWeatherMap: Current weather + short-term forecast
 * NASA POWER:     Satellite-derived agro-climate averages (free, no key)
 *
 * Both are publicly available, trusted government/research-backed sources.
 */

import type { WeatherData, NASAPowerData, DataSource } from '@/lib/alert-types';

// ── Data source definitions ──────────────────────────────────────────────────

const OWM_SOURCE: DataSource = {
    name: 'OpenWeatherMap',
    url: 'https://openweathermap.org',
    description: 'Real-time weather data and forecasts',
};

const NASA_POWER_SOURCE: DataSource = {
    name: 'NASA POWER',
    url: 'https://power.larc.nasa.gov',
    description: 'NASA satellite-derived agro-climatology data',
};

// ── OpenWeatherMap ───────────────────────────────────────────────────────────

/**
 * Fetch current weather + 48h forecast from OpenWeatherMap.
 * Falls back gracefully if API key is missing.
 */
export async function fetchOpenWeatherData(
    lat: number,
    lng: number,
): Promise<WeatherData | null> {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
        console.warn('[weather] OPENWEATHERMAP_API_KEY not set, skipping OWM fetch.');
        return null;
    }

    try {
        // Current weather
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
        const currentRes = await fetch(currentUrl, { next: { revalidate: 1800 } }); // cache 30 min
        if (!currentRes.ok) throw new Error(`OWM current: ${currentRes.status}`);
        const current = await currentRes.json();

        // 5-day / 3-hour forecast (extract next 48h rainfall)
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&cnt=16&appid=${apiKey}`;
        const forecastRes = await fetch(forecastUrl, { next: { revalidate: 1800 } });
        let forecastRain48h = 0;
        if (forecastRes.ok) {
            const forecast = await forecastRes.json();
            // Sum rain.3h for the next 16 intervals (48h)
            for (const entry of forecast.list ?? []) {
                forecastRain48h += entry.rain?.['3h'] ?? 0;
            }
        }

        return {
            temperature: current.main?.temp ?? 0,
            humidity: current.main?.humidity ?? 0,
            windSpeed: current.wind?.speed ?? 0,
            rainfall24h: (current.rain?.['1h'] ?? 0) * 24, // rough estimate
            forecastRain48h,
            description: current.weather?.[0]?.description ?? 'unknown',
            source: OWM_SOURCE,
            fetchedAt: Date.now(),
        };
    } catch (err) {
        console.error('[weather] OWM fetch failed:', err);
        return null;
    }
}

// ── NASA POWER ───────────────────────────────────────────────────────────────

/**
 * Fetch recent agro-climate data from NASA POWER API.
 * This is a FREE, no-API-key-required government API.
 * Returns averages of temperature, humidity, and precipitation for the last 7 days.
 */
export async function fetchNASAPowerData(
    lat: number,
    lng: number,
): Promise<NASAPowerData | null> {
    try {
        // Get data for the last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
        const start = fmt(startDate);
        const end = fmt(endDate);

        const url = `https://power.larc.nasa.gov/api/temporal/daily/point?` +
            `parameters=T2M,RH2M,PRECTOTCORR` +
            `&community=AG` +
            `&longitude=${lng.toFixed(4)}` +
            `&latitude=${lat.toFixed(4)}` +
            `&start=${start}` +
            `&end=${end}` +
            `&format=JSON`;

        const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
        if (!res.ok) throw new Error(`NASA POWER: ${res.status}`);
        const data = await res.json();

        const params = data.properties?.parameter;
        if (!params) throw new Error('NASA POWER: no parameters in response');

        // Compute averages from the daily values
        const tempValues = Object.values(params.T2M ?? {}).filter((v): v is number => typeof v === 'number' && v > -900);
        const humidValues = Object.values(params.RH2M ?? {}).filter((v): v is number => typeof v === 'number' && v > -900);
        const precipValues = Object.values(params.PRECTOTCORR ?? {}).filter((v): v is number => typeof v === 'number' && v > -900);

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b) / arr.length : 0;
        const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

        return {
            avgTemperature: Math.round(avg(tempValues) * 10) / 10,
            avgHumidity: Math.round(avg(humidValues) * 10) / 10,
            totalPrecipitation: Math.round(sum(precipValues) * 10) / 10,
            source: NASA_POWER_SOURCE,
            fetchedAt: Date.now(),
        };
    } catch (err) {
        console.error('[weather] NASA POWER fetch failed:', err);
        return null;
    }
}
