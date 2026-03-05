'use client';

import { cn } from '@/lib/utils';

interface Props {
    score: number; // 0–100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const gradeConfig = {
    A: { color: 'text-green-500', ring: 'stroke-green-500', bg: 'bg-green-500/10', label: 'Excellent' },
    B: { color: 'text-emerald-500', ring: 'stroke-emerald-500', bg: 'bg-emerald-500/10', label: 'Good' },
    C: { color: 'text-yellow-500', ring: 'stroke-yellow-500', bg: 'bg-yellow-500/10', label: 'Fair' },
    D: { color: 'text-orange-500', ring: 'stroke-orange-500', bg: 'bg-orange-500/10', label: 'Poor' },
    F: { color: 'text-red-500', ring: 'stroke-red-500', bg: 'bg-red-500/10', label: 'Unsuitable' },
};

export default function SuitabilityGauge({ score, grade }: Props) {
    const cfg = gradeConfig[grade];

    // SVG arc maths — half circle
    const r = 52;
    const cx = 70;
    const cy = 70;
    const circumference = Math.PI * r; // half-circle
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2">
            {/* SVG half-circle gauge */}
            <div className="relative w-[140px] h-[80px] overflow-hidden">
                <svg width="140" height="140" viewBox="0 0 140 140" className="absolute top-0 left-0">
                    {/* Track */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-muted/40"
                        strokeDasharray={`${circumference} ${circumference * 2}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        transform="rotate(180 70 70)"
                    />
                    {/* Filled arc (animated) */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        strokeWidth="12"
                        className={cn('transition-all duration-1000 ease-out', cfg.ring)}
                        strokeDasharray={`${circumference} ${circumference * 2}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(180 70 70)"
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                </svg>
                {/* Score text centred in arc */}
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1">
                    <span className={cn('text-3xl font-black leading-none', cfg.color)}>{score}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                </div>
            </div>

            {/* Grade badge */}
            <div className={cn('flex items-center gap-2 px-4 py-1.5 rounded-full', cfg.bg)}>
                <span className={cn('text-2xl font-black', cfg.color)}>{grade}</span>
                <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
            </div>
        </div>
    );
}
