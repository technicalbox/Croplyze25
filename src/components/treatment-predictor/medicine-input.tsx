'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, Camera, Search, X, Loader2, FlipHorizontal2, Pill, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { haptics } from '@/lib/haptics';
import { medicineDictionary, type Medicine } from '@/data/medicine-dictionary';
import Fuse from 'fuse.js';

// ── Fuse.js search index ──────────────────────────────────────────────────────

const fuse = new Fuse(medicineDictionary, {
    keys: ['name', 'activeIngredient', 'category', 'targetDiseases', 'recommendedCrops'],
    threshold: 0.35,
    includeScore: true,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface IdentifiedMedicine {
    medicineName: string;
    activeIngredient: string;
    category: string;
    source: 'photo' | 'search' | 'dictionary';
}

interface MedicineInputProps {
    onMedicineSelected: (medicine: IdentifiedMedicine) => void;
    isIdentifying: boolean;
    setIsIdentifying: (v: boolean) => void;
    userId: string;
}

// ── Category badge colours ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
    fungicide: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    insecticide: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    herbicide: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    organic: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    'bio-fungicide': 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    'bio-insecticide': 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MedicineInput({
    onMedicineSelected,
    isIdentifying,
    setIsIdentifying,
    userId,
}: MedicineInputProps) {
    // ── Search state ────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Medicine[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // ── Photo state ─────────────────────────────────────────────────────────────
    const [preview, setPreview] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

    // ── Cleanup camera on unmount ───────────────────────────────────────────────
    useEffect(() => () => { stream?.getTracks().forEach(t => t.stop()); }, [stream]);

    // ── Bind stream to video element after React renders it ──────────────────
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // ── Search handler ──────────────────────────────────────────────────────────
    const handleSearchChange = (q: string) => {
        setSearchQuery(q);
        if (q.trim().length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const results = fuse.search(q).map(r => r.item);
        setSearchResults(results.slice(0, 8));
        setShowDropdown(results.length > 0);
    };

    const selectFromDictionary = (med: Medicine) => {
        haptics.medium();
        setSearchQuery(med.name);
        setShowDropdown(false);
        onMedicineSelected({
            medicineName: med.name,
            activeIngredient: med.activeIngredient,
            category: med.category,
            source: 'dictionary',
        });
    };

    // ── Camera helpers ──────────────────────────────────────────────────────────
    const enableCamera = async (facing: 'environment' | 'user' = facingMode) => {
        haptics.light();
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
        try {
            const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } } });
            setStream(ms);
            setFacingMode(facing);
            if (videoRef.current) videoRef.current.srcObject = ms;
            setHasCameraPermission(true);
        } catch {
            haptics.error();
            setHasCameraPermission(false);
        }
    };

    const flipCamera = () => {
        haptics.light();
        enableCamera(facingMode === 'environment' ? 'user' : 'environment');
    };

    const handleCapture = () => {
        haptics.heavy();
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        setPreview(canvas.toDataURL('image/jpeg'));
        stream?.getTracks().forEach(t => t.stop());
        setStream(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const clearPreview = () => {
        setPreview(null);
    };

    // ── Submit photo for AI identification ──────────────────────────────────────
    const handlePhotoSubmit = async () => {
        if (!preview) return;
        haptics.heavy();
        setIsIdentifying(true);
        try {
            const res = await fetch('/api/treatment-predictor/identify-medicine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ photoDataUri: preview }),
            });
            if (!res.ok) throw new Error('Identification failed');
            const data = await res.json();
            const r = data.result;
            haptics.success();
            onMedicineSelected({
                medicineName: r.medicineName,
                activeIngredient: r.activeIngredient,
                category: r.category,
                source: 'photo',
            });
        } catch (err) {
            haptics.error();
            console.error('Medicine identification error:', err);
        } finally {
            setIsIdentifying(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="search" onClick={() => haptics.light()}>
                        <Search className="mr-2 h-4 w-4" /> Search Name
                    </TabsTrigger>
                    <TabsTrigger value="photo" onClick={() => haptics.light()}>
                        <Camera className="mr-2 h-4 w-4" /> Upload Photo
                    </TabsTrigger>
                </TabsList>

                {/* ── Search Tab ─────────────────────────────────────────────────── */}
                <TabsContent value="search" className="mt-4">
                    <div className="relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="medicine-search"
                                placeholder="Type medicine name... e.g. Mancozeb"
                                className="pl-10 h-12 text-base"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Dropdown results */}
                        {showDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-72 overflow-y-auto">
                                {searchResults.map((med) => (
                                    <button
                                        key={med.id}
                                        type="button"
                                        onClick={() => selectFromDictionary(med)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50 last:border-none"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Pill className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{med.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{med.activeIngredient}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[med.category] || 'bg-muted text-muted-foreground'}`}>
                                                    {med.category}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {med.effectivenessRange.min}–{med.effectivenessRange.max}% effective
                                                </span>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="h-4 w-4 text-primary/50 flex-shrink-0 mt-1" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ── Photo Tab ──────────────────────────────────────────────────── */}
                <TabsContent value="photo" className="mt-4">
                    <div className="space-y-3">
                        {/* Preview / camera / upload area */}
                        <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted bg-muted/20">
                            {preview ? (
                                <>
                                    <Image src={preview} alt="Medicine photo" fill style={{ objectFit: 'contain' }} className="rounded-lg" />
                                    <button
                                        type="button"
                                        onClick={clearPreview}
                                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </>
                            ) : stream ? (
                                <>
                                    <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                                    {hasCameraPermission && (
                                        <button
                                            type="button"
                                            onClick={flipCamera}
                                            className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full backdrop-blur-sm"
                                        >
                                            <FlipHorizontal2 className="h-4 w-4" />
                                            {facingMode === 'environment' ? 'Front' : 'Back'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                    <UploadCloud className="mb-2 h-10 w-10" />
                                    <p className="font-semibold text-sm">Tap to upload medicine photo</p>
                                    <p className="text-xs">PNG, JPG, or WEBP</p>
                                </div>
                            )}
                            {!preview && !stream && (
                                <Input
                                    type="file"
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    onChange={handleFileChange}
                                    accept="image/png, image/jpeg, image/webp"
                                />
                            )}
                        </div>

                        <canvas ref={canvasRef} className="hidden" />

                        {/* Camera / capture buttons */}
                        <div className="flex gap-2">
                            {!preview && !stream && (
                                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => enableCamera()}>
                                    <Camera className="mr-2 h-4 w-4" /> Open Camera
                                </Button>
                            )}
                            {stream && !preview && (
                                <Button type="button" className="flex-1 h-11" onClick={handleCapture} disabled={!hasCameraPermission}>
                                    <Camera className="mr-2 h-4 w-4" /> Capture
                                </Button>
                            )}
                            {preview && (
                                <Button
                                    type="button"
                                    className="flex-1 h-11"
                                    onClick={handlePhotoSubmit}
                                    disabled={isIdentifying}
                                >
                                    {isIdentifying ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Identifying...</>
                                    ) : (
                                        <><Pill className="mr-2 h-4 w-4" /> Identify Medicine</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
