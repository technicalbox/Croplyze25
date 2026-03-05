import { NextResponse } from 'next/server';
import { seedCropsFromJson } from '@/services/crops-service';

/**
 * POST /api/crops/seed
 *
 * Seeds the Firestore `crops` collection from data/crops_seed.json.
 * Idempotent (uses setDoc with merge).
 * Call once during setup or whenever seed data is updated.
 */
export async function POST() {
    try {
        const count = await seedCropsFromJson();
        return NextResponse.json({
            success: true,
            message: `Seeded ${count} crops to Firestore.`,
        });
    } catch (err) {
        console.error('[crops/seed] Error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Seed failed' },
            { status: 500 },
        );
    }
}
