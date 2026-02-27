import { NextRequest, NextResponse } from 'next/server';
import {
    getGrowthTimelineServer,
    updateGrowthTimelineWeekServer,
    deleteGrowthTimelineServer,
} from '@/farming-partner/growth-timeline-firestore';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// ─── GET /api/growth-timeline/[id] ────────────────────────────────────────────
/**
 * Fetches a single growth timeline record by ID.
 * Headers: x-user-id (required)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized — x-user-id header required.' }, { status: 401 });
        }

        const { id } = await params;
        const record = await getGrowthTimelineServer(userId, id);

        if (!record) {
            return NextResponse.json({ error: 'Timeline not found.' }, { status: 404 });
        }

        return NextResponse.json({ timeline: record }, { status: 200 });
    } catch (err: unknown) {
        console.error('[growth-timeline GET]', err);
        return NextResponse.json({ error: 'Failed to fetch timeline.' }, { status: 500 });
    }
}

// ─── PATCH /api/growth-timeline/[id] ─────────────────────────────────────────
/**
 * Updates a single week within an existing timeline.
 * Supports partial week updates — only provide the fields you want to change.
 *
 * Body (JSON):
 *   weekNumber: number  (required — 1-based)
 *   weekData:   object  (required — partial WeeklyEntry fields to merge)
 *
 * Headers: x-user-id (required)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized — x-user-id header required.' }, { status: 401 });
        }

        let body: { weekNumber?: unknown; weekData?: unknown };
        try { body = await req.json(); }
        catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

        const { weekNumber, weekData } = body;

        if (typeof weekNumber !== 'number' || weekNumber < 1) {
            return NextResponse.json({ error: 'weekNumber must be a positive integer.' }, { status: 422 });
        }

        if (!weekData || typeof weekData !== 'object' || Array.isArray(weekData)) {
            return NextResponse.json({ error: 'weekData must be a non-null object.' }, { status: 422 });
        }

        const { id } = await params;
        await updateGrowthTimelineWeekServer(userId, id, weekNumber, weekData as Record<string, unknown>);

        return NextResponse.json({ success: true, updatedWeek: weekNumber }, { status: 200 });
    } catch (err: unknown) {
        console.error('[growth-timeline PATCH]', err);
        const message = err instanceof Error ? err.message : 'Failed to update timeline week.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ─── DELETE /api/growth-timeline/[id] ────────────────────────────────────────
/**
 * Permanently deletes a growth timeline document.
 * Headers: x-user-id (required)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized — x-user-id header required.' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership before delete
        const existing = await getGrowthTimelineServer(userId, id);
        if (!existing) {
            return NextResponse.json({ error: 'Timeline not found.' }, { status: 404 });
        }

        await deleteGrowthTimelineServer(userId, id);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err: unknown) {
        console.error('[growth-timeline DELETE]', err);
        return NextResponse.json({ error: 'Failed to delete timeline.' }, { status: 500 });
    }
}
