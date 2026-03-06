/**
 * @fileOverview Comprehensive alert generation engine.
 *
 * Generates alerts across 9 categories using real-time weather data,
 * crop type, location, and agricultural thresholds from ICAR/FAO/IMD.
 *
 * Categories: weather, crop_risk, pest_disease, irrigation,
 *             harvest, market, government, farm_task, disaster
 */

import type {
    OutbreakAlert,
    AlertSeverity,
    AlertCategory,
    WeatherData,
    NASAPowerData,
    DataSource,
} from '@/lib/alert-types';

// ── ID generator ─────────────────────────────────────────────────────────────

let alertIdCounter = 0;
function genId(): string {
    return `alert-${Date.now()}-${++alertIdCounter}`;
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

function makeAlert(
    partial: Omit<OutbreakAlert, 'id' | 'timestamp' | 'generatedAt' | 'expiresAt' | 'read'> & {
        expiresIn?: number;
    },
): OutbreakAlert {
    const now = Date.now();
    return {
        ...partial,
        id: genId(),
        timestamp: 'Just now',
        generatedAt: now,
        expiresAt: now + (partial.expiresIn ?? TWENTY_FOUR_HOURS),
        read: false,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WEATHER ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export function generateWeatherAlerts(
    weather: WeatherData | null,
    nasaPower: NASAPowerData | null,
    cropType: string,
    region?: string,
): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const src = weather?.source ?? nasaPower?.source ?? { name: 'Weather Analysis', description: 'Combined data sources' };
    const temp = weather?.temperature ?? nasaPower?.avgTemperature;
    const humidity = weather?.humidity ?? nasaPower?.avgHumidity;
    const forecastRain = weather?.forecastRain48h ?? 0;
    const wind = weather?.windSpeed ?? 0;

    // Heavy rain
    if (forecastRain > 30) {
        const sev: AlertSeverity = forecastRain > 100 ? 'critical' : forecastRain > 50 ? 'high' : 'moderate';
        alerts.push(makeAlert({
            type: 'heavy_rain',
            category: 'weather',
            severity: sev,
            title: '🌧 Heavy Rain Warning',
            message: `${Math.round(forecastRain)}mm of rainfall expected in the next 48 hours. Protect your crops and ensure proper drainage.`,
            details: `Weather forecast indicates significant rainfall. Current conditions: ${weather?.description ?? 'unavailable'}. Delay pesticide spraying and ensure drainage channels are clear.`,
            action: 'View Forecast',
            crop: cropType,
            location: region,
            source: src,
            thresholds: [{ metric: 'Forecast Rain (48h)', value: Math.round(forecastRain), threshold: 50, unit: 'mm' }],
        }));
    }

    // Storm/cyclone
    if (wind > 15 && forecastRain > 50) {
        alerts.push(makeAlert({
            type: 'storm',
            category: 'weather',
            severity: wind > 25 ? 'critical' : 'high',
            title: '⛈ Storm Alert',
            message: `Strong winds (${Math.round(wind)} m/s) with heavy rain expected. Secure crop supports and shelter livestock.`,
            details: `A storm system is approaching your area with wind speeds of ${Math.round(wind)} m/s and ${Math.round(forecastRain)}mm rainfall expected. Take immediate precautions.`,
            action: 'Storm Safety Tips',
            crop: cropType,
            location: region,
            source: src,
            thresholds: [
                { metric: 'Wind Speed', value: Math.round(wind), threshold: 15, unit: 'm/s' },
                { metric: 'Rainfall', value: Math.round(forecastRain), threshold: 50, unit: 'mm' },
            ],
        }));
    }

    // Strong wind
    if (wind > 10 && !(wind > 15 && forecastRain > 50)) {
        alerts.push(makeAlert({
            type: 'strong_wind',
            category: 'weather',
            severity: wind > 20 ? 'high' : 'moderate',
            title: '💨 Strong Wind Warning',
            message: `Wind speed ${Math.round(wind)} m/s. Secure plant supports and avoid spraying pesticides.`,
            details: `High winds can damage crops and make spray application ineffective. Secure stakes, trellises, and any loose structures.`,
            action: 'Wind Protection Tips',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Heatwave
    if (temp && temp > 40) {
        alerts.push(makeAlert({
            type: 'heatwave',
            category: 'weather',
            severity: temp > 45 ? 'critical' : 'high',
            title: '🔥 Heatwave Alert',
            message: `Temperature ${Math.round(temp)}°C. High heat stress risk for crops. Increase irrigation frequency.`,
            details: `Extreme temperatures can cause wilting, flower drop, and reduced yield. Apply mulch, provide shade, and irrigate during cooler hours.`,
            action: 'Heat Protection Guide',
            crop: cropType,
            location: region,
            source: src,
            thresholds: [{ metric: 'Temperature', value: Math.round(temp), threshold: 40, unit: '°C' }],
        }));
    }

    // Frost
    if (temp && temp < 5) {
        alerts.push(makeAlert({
            type: 'frost',
            category: 'weather',
            severity: temp < 0 ? 'critical' : temp < 2 ? 'high' : 'moderate',
            title: '❄ Frost Warning',
            message: `Temperature dropping to ${Math.round(temp)}°C. Risk of frost damage to sensitive crops.`,
            details: `Cover tender plants with frost cloth or plastic sheets. Water soil before evening to provide thermal mass. Move potted plants indoors.`,
            action: 'Frost Protection Tips',
            crop: cropType,
            location: region,
            source: src,
            thresholds: [{ metric: 'Temperature', value: Math.round(temp), threshold: 5, unit: '°C' }],
        }));
    }

    // Lightning risk
    if (wind > 10 && humidity && humidity > 85 && forecastRain > 20) {
        alerts.push(makeAlert({
            type: 'lightning',
            category: 'weather',
            severity: 'moderate',
            title: '⚡ Lightning Risk',
            message: `Thunderstorm conditions detected. Avoid open fields and tall structures.`,
            details: `High humidity, wind, and rainfall indicate thunderstorm potential. Stay indoors and keep away from metal farm equipment during storms.`,
            action: 'Safety Tips',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Fog
    if (temp && temp < 15 && humidity && humidity > 90 && wind < 3) {
        alerts.push(makeAlert({
            type: 'fog',
            category: 'weather',
            severity: 'low',
            title: '🌫 Fog Alert',
            message: `Dense fog expected. Low visibility may affect farm operations and increase disease risk.`,
            details: `Prolonged fog increases fungal disease risk. Delay spraying until fog lifts. Drive carefully on farm roads.`,
            action: 'View Details',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CROP RISK ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCropRiskAlerts(
    weather: WeatherData | null,
    nasaPower: NASAPowerData | null,
    cropType: string,
    region?: string,
): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const src = nasaPower?.source ?? weather?.source ?? { name: 'Agro-Climate Analysis', description: 'Agricultural data' };
    const temp = weather?.temperature ?? nasaPower?.avgTemperature;
    const humidity = weather?.humidity ?? nasaPower?.avgHumidity;
    const rainfall = nasaPower?.totalPrecipitation ?? (weather ? weather.rainfall24h * 7 : 0);

    // Heat stress
    if (temp && temp > 35) {
        alerts.push(makeAlert({
            type: 'heat_stress',
            category: 'crop_risk',
            severity: temp > 42 ? 'high' : 'moderate',
            title: '🌡 Crop Heat Stress',
            message: `Temperature ${Math.round(temp)}°C may cause heat stress on ${cropType}. Monitor for wilting and leaf curl.`,
            details: `Prolonged temperatures above 35°C reduce photosynthesis and can cause flower drop, pollen sterility, and reduced grain filling. Apply light irrigation and mulch.`,
            action: 'View Mitigation Steps',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Waterlogging
    if (rainfall > 80) {
        alerts.push(makeAlert({
            type: 'waterlogging',
            category: 'crop_risk',
            severity: rainfall > 150 ? 'high' : 'moderate',
            title: '🌊 Waterlogging Risk',
            message: `Excessive rainfall (${Math.round(rainfall)}mm this week) may cause waterlogging. Check drainage.`,
            details: `Prolonged waterlogging suffocates roots and promotes root rot. Open drainage channels and consider ridging for susceptible crops.`,
            action: 'Drainage Tips',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Drought stress
    if (rainfall < 5 && temp && temp > 30) {
        alerts.push(makeAlert({
            type: 'drought_stress',
            category: 'crop_risk',
            severity: rainfall < 2 && temp > 38 ? 'high' : 'moderate',
            title: '☀ Drought Stress Warning',
            message: `Very low rainfall (${Math.round(rainfall)}mm) with high temperatures. ${cropType} may suffer water stress.`,
            details: `Insufficient moisture combined with heat accelerates crop water demand. Prioritize irrigation, apply mulch, and avoid tillage to conserve moisture.`,
            action: 'Conservation Tips',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Crop growth stage warning (seasonal)
    const month = new Date().getMonth() + 1;
    if ([3, 4, 10, 11].includes(month)) {
        alerts.push(makeAlert({
            type: 'growth_stage',
            category: 'crop_risk',
            severity: 'low',
            title: '🌱 Growth Stage Advisory',
            message: `Critical growth period for ${cropType}. Ensure adequate nutrition and pest monitoring.`,
            details: `Crops in active vegetative or reproductive stages require higher nutrient uptake and are more susceptible to stress. Monitor closely and apply top-dressing fertilizer if needed.`,
            action: 'Growth Guide',
            crop: cropType,
            location: region,
            source: { name: 'ICAR Guidelines', description: 'Crop management advisory', url: 'https://icar.org.in' },
        }));
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PEST & DISEASE ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

interface DiseaseProfile {
    name: string;
    subtype: string;
    crops: string[];
    humidityMin: number;
    tempMin: number;
    tempMax: number;
    rainfallMin: number;
    riskMonths: number[];
    diseaseType: 'fungal' | 'bacterial' | 'pest' | 'viral';
}

const DISEASE_PROFILES: DiseaseProfile[] = [
    { name: 'Late Blight', subtype: 'blight_risk', crops: ['tomato', 'potato', 'eggplant'], humidityMin: 80, tempMin: 15, tempMax: 25, rainfallMin: 10, riskMonths: [6, 7, 8, 9, 10, 11], diseaseType: 'fungal' },
    { name: 'Early Blight', subtype: 'early_blight', crops: ['tomato', 'potato'], humidityMin: 70, tempMin: 24, tempMax: 35, rainfallMin: 5, riskMonths: [3, 4, 5, 6, 7, 8, 9, 10], diseaseType: 'fungal' },
    { name: 'Blast Disease', subtype: 'blast', crops: ['rice', 'paddy', 'wheat'], humidityMin: 85, tempMin: 20, tempMax: 30, rainfallMin: 15, riskMonths: [6, 7, 8, 9, 10], diseaseType: 'fungal' },
    { name: 'Downy Mildew', subtype: 'downy_mildew', crops: ['grape', 'cucumber', 'onion'], humidityMin: 80, tempMin: 15, tempMax: 22, rainfallMin: 10, riskMonths: [1, 2, 3, 10, 11, 12], diseaseType: 'fungal' },
    { name: 'Powdery Mildew', subtype: 'powdery_mildew', crops: ['wheat', 'cotton', 'grape', 'cucumber'], humidityMin: 60, tempMin: 20, tempMax: 30, rainfallMin: 0, riskMonths: [2, 3, 4, 5, 10, 11], diseaseType: 'fungal' },
    { name: 'Rust Disease', subtype: 'rust', crops: ['wheat', 'barley', 'maize', 'sugarcane'], humidityMin: 75, tempMin: 15, tempMax: 25, rainfallMin: 5, riskMonths: [1, 2, 3, 11, 12], diseaseType: 'fungal' },
    { name: 'Bacterial Wilt', subtype: 'bacterial_wilt', crops: ['tomato', 'potato', 'banana', 'eggplant'], humidityMin: 70, tempMin: 25, tempMax: 35, rainfallMin: 20, riskMonths: [6, 7, 8, 9], diseaseType: 'bacterial' },
    { name: 'Brown Spot', subtype: 'brown_spot', crops: ['rice', 'paddy'], humidityMin: 80, tempMin: 25, tempMax: 35, rainfallMin: 10, riskMonths: [7, 8, 9, 10], diseaseType: 'fungal' },
    { name: 'Stem Borer', subtype: 'stem_borer', crops: ['rice', 'paddy', 'sugarcane', 'maize'], humidityMin: 65, tempMin: 25, tempMax: 35, rainfallMin: 5, riskMonths: [6, 7, 8, 9], diseaseType: 'pest' },
    { name: 'Aphid Infestation', subtype: 'aphid', crops: ['wheat', 'mustard', 'cotton', 'chili'], humidityMin: 50, tempMin: 15, tempMax: 28, rainfallMin: 0, riskMonths: [1, 2, 3, 11, 12], diseaseType: 'pest' },
    { name: 'Whitefly', subtype: 'whitefly', crops: ['cotton', 'tomato', 'chili', 'soybean'], humidityMin: 40, tempMin: 25, tempMax: 38, rainfallMin: 0, riskMonths: [4, 5, 6, 7, 8, 9, 10], diseaseType: 'pest' },
];

export function generatePestDiseaseAlerts(
    cropType: string,
    weather: WeatherData | null,
    nasaPower: NASAPowerData | null,
    region?: string,
): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const crop = cropType.toLowerCase();
    const month = new Date().getMonth() + 1;
    const temp = weather?.temperature ?? nasaPower?.avgTemperature ?? null;
    const humidity = weather?.humidity ?? nasaPower?.avgHumidity ?? null;
    const rainfall = weather?.rainfall24h ?? (nasaPower ? nasaPower.totalPrecipitation / 7 : null);
    const src = weather?.source ?? nasaPower?.source ?? { name: 'Agro-Climate Data', description: 'Combined sources' };

    if (temp === null || humidity === null) return alerts;

    for (const disease of DISEASE_PROFILES) {
        const isCropMatch = disease.crops.some(c => crop.includes(c) || c.includes(crop));
        if (!isCropMatch) continue;

        let riskScore = 0;
        const thresholds: OutbreakAlert['thresholds'] = [];

        if (humidity >= disease.humidityMin) {
            riskScore += 30;
            thresholds.push({ metric: 'Humidity', value: Math.round(humidity), threshold: disease.humidityMin, unit: '%' });
        }
        if (temp >= disease.tempMin && temp <= disease.tempMax) {
            riskScore += 25;
            thresholds.push({ metric: 'Temperature', value: Math.round(temp * 10) / 10, threshold: disease.tempMin, unit: '°C' });
        }
        if (rainfall !== null && rainfall >= disease.rainfallMin) {
            riskScore += 20;
        }
        if (disease.riskMonths.includes(month)) riskScore += 15;
        if (nasaPower && nasaPower.avgHumidity >= disease.humidityMin) riskScore += 10;

        if (riskScore < 40) continue;
        riskScore = Math.min(100, riskScore);

        const severity: AlertSeverity = riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 45 ? 'moderate' : 'low';
        const typeLabel = disease.diseaseType === 'pest' ? 'Pest' : disease.diseaseType === 'bacterial' ? 'Bacterial' : 'Fungal';

        alerts.push(makeAlert({
            type: disease.subtype,
            category: 'pest_disease',
            severity,
            title: `🦠 ${disease.name} Risk`,
            message: `${typeLabel} ${disease.diseaseType === 'pest' ? 'infestation' : 'infection'} risk for ${cropType} due to ${humidity >= disease.humidityMin ? 'high humidity' : 'favorable'} conditions.`,
            details: `Conditions are favorable for ${disease.name} on ${cropType}. Humidity: ${Math.round(humidity)}%, Temperature: ${Math.round(temp)}°C. ${disease.riskMonths.includes(month) ? 'This is a high-risk season. ' : ''}Apply preventive fungicide/pesticide and monitor crops closely.`,
            action: 'View Treatment Plan',
            crop: cropType,
            location: region,
            source: src,
            thresholds,
        }));
    }

    const sevOrder: Record<AlertSeverity, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
    alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
    return alerts.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. IRRIGATION ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

const CROP_WATER_NEEDS: Record<string, number> = {
    rice: 50, paddy: 50, wheat: 25, maize: 30, corn: 30, cotton: 35,
    sugarcane: 45, tomato: 30, potato: 25, onion: 20, soybean: 25,
    groundnut: 25, mustard: 20, chili: 25, banana: 40, grape: 20, mango: 25,
    default: 25,
};

export function generateIrrigationAlerts(
    cropType: string,
    weather: WeatherData | null,
    nasaPower: NASAPowerData | null,
    region?: string,
): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const crop = cropType.toLowerCase();
    const src = nasaPower?.source ?? weather?.source ?? { name: 'FAO Standards', description: 'Crop water requirements' };
    const weeklyNeed = CROP_WATER_NEEDS[crop] ?? CROP_WATER_NEEDS.default;
    const recentRain = nasaPower?.totalPrecipitation ?? (weather ? weather.rainfall24h * 7 : null);
    const forecastRain = weather?.forecastRain48h ?? 0;
    const temp = weather?.temperature ?? nasaPower?.avgTemperature ?? 25;

    if (recentRain === null) return alerts;

    const heatMult = temp > 35 ? 1.3 : temp > 30 ? 1.15 : 1.0;
    const adjustedNeed = weeklyNeed * heatMult;
    const deficit = adjustedNeed - recentRain;

    // Low soil moisture
    if (deficit > adjustedNeed * 0.6 && forecastRain < 10) {
        alerts.push(makeAlert({
            type: 'low_moisture',
            category: 'irrigation',
            severity: deficit > adjustedNeed * 0.85 ? 'high' : 'moderate',
            title: '💧 Soil Moisture Low',
            message: `Irrigation recommended for ${cropType}. Water deficit: ${Math.round(deficit)}mm this week.`,
            details: `Your ${cropType} needs ~${Math.round(adjustedNeed)}mm/week. Recent rain: ${Math.round(recentRain)}mm. Deficit: ${Math.round(deficit)}mm. ${forecastRain < 5 ? 'No rain expected soon.' : ''}`,
            action: 'Start Irrigation',
            crop: cropType,
            location: region,
            source: src,
            thresholds: [
                { metric: 'Weekly Rainfall', value: Math.round(recentRain), threshold: Math.round(adjustedNeed), unit: 'mm' },
            ],
        }));
    }

    // Overwatering
    if (recentRain > weeklyNeed * 2.5) {
        alerts.push(makeAlert({
            type: 'overwatering',
            category: 'irrigation',
            severity: 'moderate',
            title: '🚿 Overwatering Risk',
            message: `Excessive moisture (${Math.round(recentRain)}mm) detected. Skip irrigation to avoid root rot.`,
            details: `Surplus water can cause root suffocation and disease. Ensure drainage is clear and postpone irrigation until soil dries.`,
            action: 'Check Drainage',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Rain expected — delay irrigation
    if (forecastRain > 15 && deficit > 0 && deficit < adjustedNeed * 0.5) {
        alerts.push(makeAlert({
            type: 'delay_irrigation',
            category: 'irrigation',
            severity: 'low',
            title: '🌧 Rain Expected — Delay Irrigation',
            message: `${Math.round(forecastRain)}mm rain expected in 48h. Consider postponing irrigation.`,
            details: `Upcoming rainfall may meet your crop's water needs. Save water and energy by waiting for natural rainfall.`,
            action: 'View Forecast',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. HARVEST ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export function generateHarvestAlerts(
    cropType: string,
    weather: WeatherData | null,
    region?: string,
): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const month = new Date().getMonth() + 1;
    const forecastRain = weather?.forecastRain48h ?? 0;
    const src: DataSource = { name: 'ICAR Guidelines', description: 'Harvest advisory', url: 'https://icar.org.in' };

    // Harvest season months
    const harvestMonths: Record<string, number[]> = {
        rice: [10, 11, 12], paddy: [10, 11, 12], wheat: [3, 4, 5],
        maize: [9, 10, 11], corn: [9, 10, 11], cotton: [10, 11, 12],
        mustard: [2, 3], sugarcane: [11, 12, 1, 2, 3], tomato: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    };

    const crop = cropType.toLowerCase();
    const isHarvestSeason = harvestMonths[crop]?.includes(month);

    if (isHarvestSeason) {
        alerts.push(makeAlert({
            type: 'harvest_stage',
            category: 'harvest',
            severity: 'low',
            title: '🌻 Harvest Season Advisory',
            message: `${cropType} may be nearing harvest stage. Monitor crop maturity indicators.`,
            details: `Check grain moisture content, color changes, and plant senescence. Plan harvesting equipment and labor in advance.`,
            action: 'Harvest Checklist',
            crop: cropType,
            location: region,
            source: src,
        }));

        // Rain during harvest
        if (forecastRain > 20) {
            alerts.push(makeAlert({
                type: 'rain_during_harvest',
                category: 'harvest',
                severity: forecastRain > 50 ? 'high' : 'moderate',
                title: '🌧 Rain Risk During Harvest',
                message: `${Math.round(forecastRain)}mm rain expected. Consider harvesting early to protect crop quality.`,
                details: `Rain during harvest can cause grain sprouting, fungal growth, and quality loss. Harvest mature sections immediately and arrange drying facilities.`,
                action: 'Plan Early Harvest',
                crop: cropType,
                location: region,
                source: src,
            }));
        }

        // Optimal harvest window
        if (forecastRain < 5 && weather && weather.windSpeed < 5) {
            alerts.push(makeAlert({
                type: 'optimal_harvest',
                category: 'harvest',
                severity: 'low',
                title: '✅ Optimal Harvest Window',
                message: `Clear weather with low wind. Good conditions for harvesting ${cropType}.`,
                details: `No rain expected and wind is calm. Ideal conditions for harvesting and drying. Take advantage of this window.`,
                action: 'Start Harvesting',
                crop: cropType,
                location: region,
                source: src,
            }));
        }
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MARKET PRICE ALERTS (simulated)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateMarketAlerts(cropType: string, region?: string): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const month = new Date().getMonth() + 1;
    const src: DataSource = { name: 'Market Intelligence', description: 'Agricultural commodity data' };

    // Seasonal price patterns
    const peakDemandMonths: Record<string, number[]> = {
        rice: [1, 2, 3], wheat: [4, 5], tomato: [6, 7, 8], onion: [9, 10, 11],
        potato: [3, 4], cotton: [12, 1, 2], sugarcane: [12, 1, 2, 3],
    };

    const crop = cropType.toLowerCase();
    if (peakDemandMonths[crop]?.includes(month)) {
        alerts.push(makeAlert({
            type: 'high_demand',
            category: 'market',
            severity: 'low',
            title: '📈 High Market Demand',
            message: `${cropType} is in high demand this season. Good time to sell if your harvest is ready.`,
            details: `Market analysis indicates strong demand for ${cropType} during this period. Check local mandi prices and consider selling in bulk.`,
            action: 'View Prices',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GOVERNMENT SCHEME ALERTS (simulated)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateGovernmentAlerts(region?: string): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const src: DataSource = { name: 'Govt. Advisory', description: 'Agriculture department notifications' };
    const month = new Date().getMonth() + 1;

    // Crop insurance reminders (typically before kharif/rabi sowing)
    if ([5, 6, 10, 11].includes(month)) {
        alerts.push(makeAlert({
            type: 'crop_insurance',
            category: 'government',
            severity: 'low',
            title: '🏛 Crop Insurance Deadline',
            message: `Crop insurance enrollment deadline approaching. Apply before sowing season begins.`,
            details: `Pradhan Mantri Fasal Bima Yojana (PMFBY) enrollment is open. Visit your nearest CSC or bank branch to enroll. Protect your crops against natural calamities.`,
            action: 'Apply Now',
            location: region,
            source: src,
            expiresIn: FORTY_EIGHT_HOURS,
        }));
    }

    // Subsidy reminders
    if ([4, 5, 9, 10].includes(month)) {
        alerts.push(makeAlert({
            type: 'subsidy',
            category: 'government',
            severity: 'low',
            title: '🏛 Subsidy Applications Open',
            message: `Agricultural subsidy applications are open for this season. Check eligibility.`,
            details: `Various government subsidies for seeds, fertilizers, equipment, and irrigation are available. Visit the agriculture department portal or contact your block agriculture officer.`,
            action: 'Check Eligibility',
            location: region,
            source: src,
        }));
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. FARM TASK ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export function generateFarmTaskAlerts(
    cropType: string,
    weather: WeatherData | null,
    region?: string,
): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const src: DataSource = { name: 'Farm Calendar', description: 'Seasonal task reminders' };
    const month = new Date().getMonth() + 1;
    const forecastRain = weather?.forecastRain48h ?? 0;
    const temp = weather?.temperature ?? 25;

    // Fertilizer reminder (active growth months)
    if ([3, 4, 7, 8].includes(month)) {
        alerts.push(makeAlert({
            type: 'fertilizer',
            category: 'farm_task',
            severity: 'low',
            title: '📋 Fertilizer Application Reminder',
            message: `Time for top-dressing fertilizer on ${cropType}. Apply during cool hours.`,
            details: `Active crop growth requires supplemental nutrition. Apply recommended dose of nitrogen/potash based on soil test results. Avoid application before heavy rain.`,
            action: 'View Schedule',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Spray reminder (calm weather)
    if (forecastRain < 10 && weather && weather.windSpeed < 8) {
        // Only in months when spraying is common
        if ([2, 3, 4, 5, 7, 8, 9].includes(month)) {
            alerts.push(makeAlert({
                type: 'spray_reminder',
                category: 'farm_task',
                severity: 'low',
                title: '📋 Pesticide Spray Window',
                message: `Calm weather conditions — good time for preventive spraying on ${cropType}.`,
                details: `Wind speed is low and no rain expected. Apply pesticide/fungicide early morning or late evening for best results.`,
                action: 'Spray Guide',
                crop: cropType,
                location: region,
                source: src,
            }));
        }
    }

    // Weeding reminder
    if ([3, 4, 7, 8].includes(month)) {
        alerts.push(makeAlert({
            type: 'weeding',
            category: 'farm_task',
            severity: 'low',
            title: '📋 Weeding Recommended',
            message: `Weeds compete with ${cropType} for nutrients. Remove weeds during active growth.`,
            details: `Manual or mechanical weeding is recommended during this growth stage. Weeds can reduce yield by 20-50% if left unchecked.`,
            action: 'Weed Control Tips',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    // Soil testing
    if ([2, 3, 9, 10].includes(month)) {
        alerts.push(makeAlert({
            type: 'soil_testing',
            category: 'farm_task',
            severity: 'low',
            title: '📋 Soil Testing Reminder',
            message: `Get your soil tested before the upcoming sowing season. Contact your nearest soil testing lab.`,
            details: `Regular soil testing helps optimize fertilizer use and improve yield. Collect composite samples from different parts of your field.`,
            action: 'Find Lab',
            crop: cropType,
            location: region,
            source: src,
        }));
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. DISASTER ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export function generateDisasterAlerts(
    weather: WeatherData | null,
    nasaPower: NASAPowerData | null,
    region?: string,
): OutbreakAlert[] {
    const alerts: OutbreakAlert[] = [];
    const src = weather?.source ?? { name: 'Disaster Management', description: 'National disaster alerts' };
    const forecastRain = weather?.forecastRain48h ?? 0;
    const wind = weather?.windSpeed ?? 0;
    const rainfall7d = nasaPower?.totalPrecipitation ?? 0;

    // Flood warning
    if (forecastRain > 100 && rainfall7d > 80) {
        alerts.push(makeAlert({
            type: 'flood',
            category: 'disaster',
            severity: 'critical',
            title: '🚨 Flood Warning',
            message: `Severe flood risk. ${Math.round(forecastRain)}mm rain expected on already saturated soil.`,
            details: `Combined rainfall of ${Math.round(rainfall7d + forecastRain)}mm expected. Move livestock and valuables to higher ground. Do not attempt to cross flooded fields or roads.`,
            action: 'Emergency Contacts',
            location: region,
            source: src,
        }));
    }

    // Cyclone
    if (wind > 25 && forecastRain > 80) {
        alerts.push(makeAlert({
            type: 'cyclone',
            category: 'disaster',
            severity: 'critical',
            title: '🚨 Cyclone Warning',
            message: `Cyclonic conditions detected: wind ${Math.round(wind)} m/s. Take shelter immediately.`,
            details: `Extreme wind and rainfall expected. Secure all structures, move to a safe building, and keep emergency supplies ready. Follow local authority advisories.`,
            action: 'Safety Guide',
            location: region,
            source: src,
        }));
    }

    // Severe drought
    if (rainfall7d < 1 && nasaPower && nasaPower.avgTemperature > 38) {
        alerts.push(makeAlert({
            type: 'severe_drought',
            category: 'disaster',
            severity: 'high',
            title: '🚨 Severe Drought Alert',
            message: `Extended dry spell with extreme heat. Critical water shortage risk for crops and livestock.`,
            details: `No rainfall recorded in the past week with temperatures exceeding ${Math.round(nasaPower.avgTemperature)}°C. Conserve water, prioritize drinking water for livestock, and contact water supply authorities.`,
            action: 'Drought Relief Info',
            location: region,
            source: src,
        }));
    }

    return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function generateAllAlerts(
    cropType: string,
    weather: WeatherData | null,
    nasaPower: NASAPowerData | null,
    region?: string,
): OutbreakAlert[] {
    const all: OutbreakAlert[] = [
        ...generateDisasterAlerts(weather, nasaPower, region),
        ...generateWeatherAlerts(weather, nasaPower, cropType, region),
        ...generateCropRiskAlerts(weather, nasaPower, cropType, region),
        ...generatePestDiseaseAlerts(cropType, weather, nasaPower, region),
        ...generateIrrigationAlerts(cropType, weather, nasaPower, region),
        ...generateHarvestAlerts(cropType, weather, region),
        ...generateMarketAlerts(cropType, region),
        ...generateGovernmentAlerts(region),
        ...generateFarmTaskAlerts(cropType, weather, region),
    ];

    // Sort: critical → high → moderate → low, then by category priority
    const sevOrder: Record<AlertSeverity, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
    const catOrder: Record<string, number> = {
        disaster: 0, weather: 1, pest_disease: 2, crop_risk: 3,
        irrigation: 4, harvest: 5, market: 6, government: 7, farm_task: 8,
    };

    all.sort((a, b) => {
        const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return (catOrder[a.category] ?? 9) - (catOrder[b.category] ?? 9);
    });

    return all;
}
