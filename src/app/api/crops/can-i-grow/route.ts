import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
    cropId: z.string(),
    cropName: z.string(),
    region: z.object({
        country: z.string(),
        state: z.string(),
        city: z.string().optional(),
    }),
    soilType: z.string().optional(),
    season: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
        }

        const { cropName, region, soilType, season } = parsed.data;
        const regionStr = [region.city, region.state, region.country].filter(Boolean).join(', ');

        // Use Google AI (Gemini) via fetch
        const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'AI API key not configured.' }, { status: 500 });
        }

        const prompt = `You are an expert agricultural scientist and farming advisor.

A farmer in ${regionStr} wants to know if they can grow "${cropName}" in their location.
${soilType ? `Soil type: ${soilType}` : ''}
${season ? `Current/planned season: ${season}` : ''}

Provide a JSON response with this EXACT structure (no markdown, just JSON):
{
  "canGrow": true/false,
  "suitabilityScore": 0-100,
  "summary": "2-3 sentence summary",
  "risks": ["risk1", "risk2"],
  "tips": ["tip1", "tip2", "tip3"],
  "profitability": "low/medium/high",
  "bestSeason": "recommended season",
  "soilPrep": "soil preparation advice"
}`;

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
                }),
            },
        );

        if (!res.ok) {
            const errText = await res.text();
            console.error('[can-i-grow] AI API error:', errText);
            return NextResponse.json({ error: 'AI service unavailable.' }, { status: 502 });
        }

        const aiRes = await res.json();
        const text = aiRes.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'Invalid AI response.' }, { status: 500 });
        }

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ success: true, data: result });

    } catch (err: unknown) {
        console.error('[POST /api/crops/can-i-grow]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
