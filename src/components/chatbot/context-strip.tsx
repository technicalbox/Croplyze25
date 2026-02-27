'use client';

/**
 * @fileOverview Context strip — shows current crop/soil/region as pill badges.
 * Horizontally scrollable below the chat header.
 */

import { useState } from 'react';
import { Wheat, MapPin, Layers, Calendar, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useChatbot } from './chat-provider';

const CROPS = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Tomato', 'Potato'];
const SOILS = ['Clay', 'Sandy', 'Loamy', 'Silt', 'Peat'];

export default function ContextStrip() {
    const { cropContext, setCropContext } = useChatbot();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ cropType: '', region: '', soilType: '' });

    if (!cropContext && !editing) {
        return (
            <button
                onClick={() => { haptics.light(); setEditing(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-green-700 dark:text-green-300 bg-white/20 dark:bg-green-900/20 border border-white/20 backdrop-blur-md"
            >
                <Plus className="h-3 w-3" /> Set crop context
            </button>
        );
    }

    if (editing) {
        return (
            <div className="flex items-center gap-2 flex-wrap px-1 py-1">
                <input
                    placeholder="Crop (e.g. Wheat)"
                    value={draft.cropType}
                    onChange={e => setDraft(d => ({ ...d, cropType: e.target.value }))}
                    className="text-xs bg-white/60 dark:bg-green-900/30 border border-white/30 rounded-full px-3 py-1.5 outline-none w-28 text-gray-800 dark:text-white placeholder-gray-400"
                />
                <input
                    placeholder="Region"
                    value={draft.region}
                    onChange={e => setDraft(d => ({ ...d, region: e.target.value }))}
                    className="text-xs bg-white/60 dark:bg-green-900/30 border border-white/30 rounded-full px-3 py-1.5 outline-none w-28 text-gray-800 dark:text-white placeholder-gray-400"
                />
                <input
                    placeholder="Soil (optional)"
                    value={draft.soilType}
                    onChange={e => setDraft(d => ({ ...d, soilType: e.target.value }))}
                    className="text-xs bg-white/60 dark:bg-green-900/30 border border-white/30 rounded-full px-3 py-1.5 outline-none w-28 text-gray-800 dark:text-white placeholder-gray-400"
                />
                <button
                    onClick={() => {
                        haptics.light();
                        if (draft.cropType && draft.region) {
                            setCropContext({ cropType: draft.cropType, region: draft.region, soilType: draft.soilType || undefined });
                        }
                        setEditing(false);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-green-500 text-white font-semibold"
                >Done</button>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {cropContext?.cropType && (
                <Pill icon={<Wheat className="h-3 w-3 text-green-500" />} label={cropContext.cropType} />
            )}
            {cropContext?.soilType && (
                <Pill icon={<Layers className="h-3 w-3 text-green-500" />} label={cropContext.soilType} />
            )}
            {cropContext?.region && (
                <Pill icon={<MapPin className="h-3 w-3 text-green-500" />} label={cropContext.region} />
            )}
            {cropContext?.season && (
                <Pill icon={<Calendar className="h-3 w-3 text-green-500" />} label={cropContext.season} />
            )}
            <button
                onClick={() => { haptics.light(); setCropContext(null); }}
                className="flex-none p-1 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                title="Clear context"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 dark:bg-green-900/30 border border-white/20 backdrop-blur-md text-xs text-gray-700 dark:text-green-100 whitespace-nowrap">
            {icon}{label}
        </div>
    );
}
