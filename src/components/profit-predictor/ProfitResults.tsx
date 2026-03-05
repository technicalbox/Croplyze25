'use client';

import React from 'react';
import {
    TrendingUp, TrendingDown, IndianRupee, BarChart3, Target,
    RefreshCw, Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import type { ProfitCalculation } from '@/farming-partner/profit-predictor-types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
    if (Math.abs(n) >= 1_00_000) {
        return `₹${(n / 1_00_000).toFixed(2)}L`;
    }
    if (Math.abs(n) >= 1000) {
        return `₹${(n / 1000).toFixed(1)}K`;
    }
    return `₹${n.toFixed(0)}`;
}

function formatNumber(n: number, decimals = 1): string {
    return n.toFixed(decimals);
}

function StatCard({ label, value, sub, accent }: {
    label: string; value: string; sub?: string; accent?: string;
}) {
    return (
        <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 p-3.5 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-extrabold leading-tight ${accent ?? 'text-foreground'}`}>{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface ProfitResultsProps {
    calc: ProfitCalculation;
    onReset: () => void;
}

export default function ProfitResults({ calc, onReset }: ProfitResultsProps) {
    const { input, result } = calc;
    const isProfit = result.isProfit;

    // Revenue vs Cost bar widths
    const maxBar = Math.max(result.totalRevenue, result.totalCost, 1);
    const revenuePct = (result.totalRevenue / maxBar) * 100;
    const costPct = (result.totalCost / maxBar) * 100;

    // Share text
    const handleShare = () => {
        haptics.light();
        const text = [
            `🌾 Crop Profit Estimate — ${input.cropName}`,
            `📐 Land: ${input.landSizeAcres} acres`,
            `📦 Yield: ${result.totalYield} qtl`,
            `💰 Revenue: ${formatCurrency(result.totalRevenue)}`,
            `💸 Cost: ${formatCurrency(result.totalCost)}`,
            `${isProfit ? '✅' : '❌'} Net ${isProfit ? 'Profit' : 'Loss'}: ${formatCurrency(Math.abs(result.netProfit))}`,
            `📊 Margin: ${formatNumber(result.profitMarginPercent)}%`,
            '',
            '— CROPlyze Profit Predictor',
        ].join('\n');

        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({ text }).catch(() => { });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => { });
        }
    };

    return (
        <div className="flex flex-col gap-4">

            {/* ── Hero: Net Profit/Loss ───────────────────────────────── */}
            <div className={`relative rounded-3xl overflow-hidden p-6 text-center ${isProfit
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : 'bg-gradient-to-br from-red-500 to-rose-600'
                } text-white shadow-xl ${isProfit ? 'shadow-emerald-500/30' : 'shadow-red-500/30'
                }`}>
                {/* Glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />

                <div className="flex items-center justify-center gap-2 mb-2">
                    {isProfit ? (
                        <TrendingUp className="w-6 h-6 text-white/80" />
                    ) : (
                        <TrendingDown className="w-6 h-6 text-white/80" />
                    )}
                    <span className="text-sm font-bold text-white/70 uppercase tracking-wider">
                        {isProfit ? 'Estimated Profit' : 'Estimated Loss'}
                    </span>
                </div>

                <p className="text-4xl font-black tracking-tight leading-none">
                    {isProfit ? '+' : '-'}{formatCurrency(Math.abs(result.netProfit))}
                </p>

                <p className="text-sm text-white/70 mt-2 font-medium">
                    {input.cropName} · {input.landSizeAcres} acres
                </p>

                {calc.region && (
                    <p className="text-xs text-white/50 mt-1">{calc.region}</p>
                )}
            </div>

            {/* ── Key Metrics Row ─────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2.5">
                <StatCard
                    label="Margin"
                    value={`${formatNumber(result.profitMarginPercent)}%`}
                    accent={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}
                />
                <StatCard
                    label="Revenue"
                    value={formatCurrency(result.totalRevenue)}
                    accent="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    label="Total Cost"
                    value={formatCurrency(result.totalCost)}
                    accent="text-amber-600 dark:text-amber-400"
                />
            </div>

            {/* ── Revenue vs Cost Bar ─────────────────────────────────── */}
            <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 p-4 flex flex-col gap-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Revenue vs Cost
                </p>

                {/* Revenue bar */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Revenue</span>
                        <span className="font-bold">{formatCurrency(result.totalRevenue)}</span>
                    </div>
                    <div className="h-5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${revenuePct}%` }}
                        />
                    </div>
                </div>

                {/* Cost bar */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Cost</span>
                        <span className="font-bold">{formatCurrency(result.totalCost)}</span>
                    </div>
                    <div className="h-5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${costPct}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Break-Even Section ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 p-3.5 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Target className="w-3 h-3" /> Break-even Price
                    </p>
                    <p className="text-lg font-extrabold text-foreground">
                        ₹{formatNumber(result.breakEvenPricePerUnit, 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">per quintal</p>
                </div>

                <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 p-3.5 flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Target className="w-3 h-3" /> Break-even Yield
                    </p>
                    <p className="text-lg font-extrabold text-foreground">
                        {formatNumber(result.breakEvenYield)} qtl
                    </p>
                    <p className="text-[11px] text-muted-foreground">minimum to cover costs</p>
                </div>
            </div>

            {/* ── Yield Summary ────────────────────────────────────────── */}
            <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-border dark:border-white/10 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" /> Calculation Details
                </p>
                <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Yield</span>
                        <span className="font-semibold">{formatNumber(result.totalYield)} qtl</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Yield × Price</span>
                        <span className="font-semibold">{formatNumber(result.totalYield, 0)} × ₹{formatNumber(input.marketPricePerUnit, 0)}</span>
                    </div>
                    <div className="h-px bg-border dark:bg-white/10 my-0.5" />
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Fertilizer</span>
                        <span className="font-semibold">{formatCurrency(input.fertilizerCost)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Labor</span>
                        <span className="font-semibold">{formatCurrency(input.laborCost)}</span>
                    </div>
                    {input.irrigationCost > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Irrigation</span>
                            <span className="font-semibold">{formatCurrency(input.irrigationCost)}</span>
                        </div>
                    )}
                    {input.otherExpenses > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Other</span>
                            <span className="font-semibold">{formatCurrency(input.otherExpenses)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="flex gap-3 pt-1">
                <Button
                    onClick={() => { haptics.medium(); onReset(); }}
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/20"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> New Calculation
                </Button>
                <Button
                    onClick={handleShare}
                    variant="outline"
                    className="h-12 rounded-2xl px-5 font-bold border-border dark:border-white/10"
                >
                    <Share2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
