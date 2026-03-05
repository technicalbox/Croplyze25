/**
 * @fileOverview Geolocation utilities — GPS detection + reverse geocoding.
 * Uses BigDataCloud free API (no key required) for reverse geocoding.
 * Works on mobile browser, PWA, and desktop.
 */

export interface GeoPosition {
    lat: number;
    lng: number;
}

export interface GeoRegion {
    country: string;
    countryCode: string;
    state: string;
    city: string;
    lat: number;
    lng: number;
}

/**
 * Detect current GPS position using browser Geolocation API.
 * Returns lat/lng or throws if denied/unavailable.
 */
export function detectGPS(): Promise<GeoPosition> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !navigator?.geolocation) {
            reject(new Error('Geolocation is not supported in this environment.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('PERMISSION_DENIED'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('POSITION_UNAVAILABLE'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('TIMEOUT'));
                        break;
                    default:
                        reject(new Error('Unknown geolocation error'));
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000, // Cache for 5 minutes
            },
        );
    });
}

/**
 * Reverse geocode lat/lng into structured region data.
 * Uses BigDataCloud free API — no API key needed.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoRegion> {
    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geocoding API returned ${res.status}`);

        const data = await res.json();

        return {
            country: data.countryName || '',
            countryCode: data.countryCode || '',
            state: data.principalSubdivision || '',
            city: data.city || data.locality || '',
            lat,
            lng,
        };
    } catch (err) {
        console.error('[geolocation] Reverse geocode failed:', err);
        // Return partial data
        return {
            country: '',
            countryCode: '',
            state: '',
            city: '',
            lat,
            lng,
        };
    }
}

/**
 * Full flow: Detect GPS → Reverse geocode → Return structured region.
 */
export async function detectAndGeocodeLocation(): Promise<GeoRegion> {
    const pos = await detectGPS();
    return reverseGeocode(pos.lat, pos.lng);
}

/**
 * Check if geolocation permission has been granted, denied, or is prompt.
 */
export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
    if (typeof window === 'undefined' || !navigator?.permissions) return 'prompt';
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
    } catch {
        return 'prompt';
    }
}
