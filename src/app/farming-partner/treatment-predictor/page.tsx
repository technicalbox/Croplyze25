'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FlaskConical, Loader2, RotateCcw, ChevronRight, Bug, PlusCircle, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUser as useUserFromAuth } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

import MedicineInput from '@/components/treatment-predictor/medicine-input';
import PredictionResultCard from '@/components/treatment-predictor/prediction-result-card';
import AlternativeSuggestions from '@/components/treatment-predictor/alternative-suggestions';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import { DiseaseSearchInput } from '@/components/treatment-predictor/disease-search-input';
import type { TreatmentOutcomePredictorOutput } from '@/ai/flows/treatment-outcome-predictor-flow';
import { saveTreatmentPrediction, listTreatmentPredictions, deleteTreatmentPrediction } from '@/farming-partner/treatment-predictor-client';
import type { TreatmentPredictionRecord } from '@/farming-partner/treatment-predictor-client';
import SavedPlansList from '@/components/common/saved-plans-list';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IdentifiedMedicine {
    medicineName: string;
    activeIngredient: string;
    category: string;
    source: 'photo' | 'search' | 'dictionary';
}

type Step = 'medicine' | 'context' | 'result';
type Tab = 'new' | 'history';

/** Convert a TreatmentPredictionRecord to display metadata for the history list. */
function recordToMeta(record: TreatmentPredictionRecord) {
    const score = record.prediction?.suitabilityScore;
    const control = record.prediction?.diseaseControlLevel ?? '';
    return {
        id: record.id ?? record.createdAt.toString(),
        title: `${record.medicineName} → ${record.cropType}`,
        subtitle: `${record.diseaseName} · Score: ${score ?? '—'}/100 · ${control} control`,
        createdAt: record.createdAt,
    };
}

// ── Soil / weather / season options ───────────────────────────────────────────

const SOIL_TYPES = ['Alluvial', 'Black Cotton', 'Red', 'Laterite', 'Sandy', 'Clayey', 'Loamy', 'Saline'];
const WEATHER_OPTIONS = ['Hot and Humid', 'Hot and Dry', 'Cool and Humid', 'Cool and Dry', 'Rainy', 'Moderate'];
const SEASONS = ['Kharif', 'Rabi', 'Zaid'];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High'] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TreatmentPredictorPage() {
    const { user, loading } = useUserFromAuth();
    const router = useRouter();

    // Tab & Step state
    const [tab, setTab] = useState<Tab>('new');
    const [step, setStep] = useState<Step>('medicine');

    // Medicine state
    const [medicine, setMedicine] = useState<IdentifiedMedicine | null>(null);
    const [isIdentifying, setIsIdentifying] = useState(false);

    // Context state
    const [cropType, setCropType] = useState('');
    const [diseaseName, setDiseaseName] = useState('');
    const [soilType, setSoilType] = useState('');
    const [weather, setWeather] = useState('');
    const [season, setSeason] = useState('');
    const [severity, setSeverity] = useState<(typeof SEVERITY_LEVELS)[number] | ''>('');

    // Result state
    const [prediction, setPrediction] = useState<TreatmentOutcomePredictorOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // ── Handlers ────────────────────────────────────────────────────────────────

    const handleMedicineSelected = (med: IdentifiedMedicine) => {
        setMedicine(med);
        setStep('context');
    };

    const handleAnalyze = async () => {
        if (!medicine || !cropType || !diseaseName || !soilType || !weather || !season) return;
        haptics.heavy();
        setIsAnalyzing(true);
        setError(null);

        try {
            const res = await fetch('/api/treatment-predictor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': user.uid },
                body: JSON.stringify({
                    medicineName: medicine.medicineName,
                    activeIngredient: medicine.activeIngredient,
                    category: medicine.category,
                    cropType,
                    diseaseName,
                    soilType,
                    weatherConditions: weather,
                    season,
                    ...(severity ? { severityLevel: severity } : {}),
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Analysis failed');
            }

            const data = await res.json();
            haptics.success();
            setPrediction(data.prediction);
            setStep('result');

            // Save to Firestore (fire-and-forget)
            saveTreatmentPrediction({
                userId: user.uid,
                medicineName: medicine.medicineName,
                activeIngredient: medicine.activeIngredient,
                category: medicine.category,
                cropType,
                diseaseName,
                soilType,
                weatherConditions: weather,
                season,
                ...(severity ? { severityLevel: severity } : {}),
                prediction: data.prediction,
                createdAt: Date.now(),
            }).catch((err) => console.error('[treatment-predictor] Failed to save to Firestore:', err));
        } catch (err) {
            haptics.error();
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        haptics.light();
        setStep('medicine');
        setTab('new');
        setMedicine(null);
        setPrediction(null);
        setCropType('');
        setDiseaseName('');
        setSoilType('');
        setWeather('');
        setSeason('');
        setSeverity('');
        setError(null);
    };

    /** When user selects a record from history, show its result. */
    const handleHistorySelect = (record: TreatmentPredictionRecord) => {
        setMedicine({
            medicineName: record.medicineName,
            activeIngredient: record.activeIngredient,
            category: record.category,
            source: 'search',
        });
        setCropType(record.cropType);
        setDiseaseName(record.diseaseName);
        setSoilType(record.soilType);
        setWeather(record.weatherConditions);
        setSeason(record.season);
        setSeverity((record.severityLevel as typeof severity) || '');
        setPrediction(record.prediction);
        setStep('result');
    };

    const contextComplete = cropType && diseaseName && soilType && weather && season;

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 bg-background">
            {/* Sticky header */}
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4">
                <Button asChild variant="ghost" size="icon" className="shrink-0">
                    <Link href="/farming-partner">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 shrink-0">
                        <FlaskConical className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">Treatment Predictor</h1>
                        <p className="text-xs text-muted-foreground truncate">Verify medicine suitability</p>
                    </div>
                </div>
                {step !== 'medicine' && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                    </Button>
                )}
            </header>

            {/* Tab bar — shown only when not in multi-step flow */}
            {step === 'medicine' && (
                <div className="flex border-b bg-background/80 backdrop-blur-sm px-4 gap-1">
                    {([
                        { id: 'new', label: 'New Analysis', icon: PlusCircle },
                        { id: 'history', label: 'History', icon: History },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { haptics.light(); setTab(id); }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-colors',
                                tab === id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Step indicator — shown only in new analysis flow */}
            {tab === 'new' && <div className="flex items-center gap-0 px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
                {(['medicine', 'context', 'result'] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center">
                        <div
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors',
                                step === s
                                    ? 'bg-primary/10 text-primary'
                                    : s === 'result' && step !== 'result'
                                        ? 'text-muted-foreground/50'
                                        : 'text-muted-foreground',
                            )}
                        >
                            <span className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                                step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}>
                                {i + 1}
                            </span>
                            <span className="hidden sm:inline">
                                {s === 'medicine' ? 'Medicine' : s === 'context' ? 'Context' : 'Results'}
                            </span>
                        </div>
                        {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mx-1" />}
                    </div>
                ))}
            </div>}

            <main className="flex flex-col gap-6 p-4 pb-28">
                {/* ── History Tab ── */}
                {tab === 'history' && step === 'medicine' && (
                    <SavedPlansList<TreatmentPredictionRecord>
                        userId={user.uid}
                        loader={listTreatmentPredictions}
                        toMeta={recordToMeta}
                        onDelete={deleteTreatmentPrediction}
                        onSelect={handleHistorySelect}
                        title="Past Predictions"
                        emptyLabel="No saved predictions yet. Run your first treatment analysis above."
                    />
                )}

                {/* ── Step 1: Medicine Input ── */}
                {tab === 'new' && step === 'medicine' && (
                    <div className="animate-slide-up-fade">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold">Select Medicine</h2>
                            <p className="text-sm text-muted-foreground">
                                Search by name or upload a photo of the medicine bottle.
                            </p>
                        </div>
                        <MedicineInput
                            onMedicineSelected={handleMedicineSelected}
                            isIdentifying={isIdentifying}
                            setIsIdentifying={setIsIdentifying}
                            userId={user.uid}
                        />
                    </div>
                )}

                {/* ── Step 2: Context Form ── */}
                {step === 'context' && medicine && (
                    <div className="animate-slide-up-fade">
                        {/* Selected medicine summary */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <FlaskConical className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{medicine.medicineName}</p>
                                <p className="text-xs text-muted-foreground truncate">{medicine.activeIngredient}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { haptics.light(); setStep('medicine'); setMedicine(null); }}
                                className="text-xs font-semibold text-primary"
                            >
                                Change
                            </button>
                        </div>

                        <h2 className="text-lg font-bold mb-1">Farm Details</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Provide your crop and farm conditions for an accurate prediction.
                        </p>

                        <div className="space-y-4">
                            {/* Crop type */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Crop Type</Label>
                                {cropType ? (
                                    <div className="flex items-center gap-2 h-14 px-4 bg-white/80 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl">
                                        <span className="flex-1 text-[15px] font-medium text-foreground">{cropType}</span>
                                        <button
                                            type="button"
                                            onClick={() => setCropType('')}
                                            className="text-xs font-semibold text-primary"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <CropSearchInput
                                        onSelect={(_id, name) => setCropType(name)}
                                        placeholder="Search crops (e.g. Rice, Tomato)"
                                    />
                                )}
                            </div>

                            {/* Disease name */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Disease / Pest</Label>
                                {diseaseName ? (
                                    <div className="flex items-center gap-2 h-14 px-4 bg-white/80 dark:bg-black/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl">
                                        <Bug className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="flex-1 text-[15px] font-medium text-foreground">{diseaseName}</span>
                                        <button
                                            type="button"
                                            onClick={() => setDiseaseName('')}
                                            className="text-xs font-semibold text-primary"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <DiseaseSearchInput
                                        onSelect={(name) => setDiseaseName(name)}
                                        placeholder="Search diseases (e.g. Late Blight, Aphids)"
                                    />
                                )}
                            </div>

                            {/* Soil type */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Soil Type</Label>
                                <Select value={soilType} onValueChange={setSoilType}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select soil type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SOIL_TYPES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Weather */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Weather Conditions</Label>
                                <Select value={weather} onValueChange={setWeather}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Current weather" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WEATHER_OPTIONS.map((w) => (
                                            <SelectItem key={w} value={w}>{w}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Season */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Season</Label>
                                <Select value={season} onValueChange={setSeason}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select season" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SEASONS.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Severity (optional) */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Disease Severity <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select severity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SEVERITY_LEVELS.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                className="w-full h-14 text-base font-bold"
                                size="lg"
                                disabled={!contextComplete || isAnalyzing}
                                onClick={handleAnalyze}
                            >
                                {isAnalyzing ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Treatment...</>
                                ) : (
                                    <><FlaskConical className="mr-2 h-5 w-5" /> Predict Treatment Outcome</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Results ── */}
                {step === 'result' && prediction && medicine && (
                    <div className="space-y-5">
                        <PredictionResultCard
                            medicineName={medicine.medicineName}
                            category={medicine.category}
                            prediction={prediction}
                        />

                        <AlternativeSuggestions
                            alternatives={prediction.alternatives}
                            currentScore={prediction.suitabilityScore}
                        />

                        {/* New analysis button */}
                        <Button variant="outline" className="w-full h-12" onClick={handleReset}>
                            <RotateCcw className="mr-2 h-4 w-4" /> New Analysis
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
