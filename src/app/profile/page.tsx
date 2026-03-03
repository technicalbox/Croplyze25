'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useTranslation, useTheme } from '@/lib/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2, Edit, User as UserIcon, LogOut, Sun, Moon, Bell,
    MapPin, Tractor, Droplets, Mountain, Download, WifiOff, Info,
    ChevronRight, Leaf, FlaskConical, ExternalLink, Shield, Sparkles,
} from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { Diagnosis, UserDocument } from '@/lib/types';
import { format } from 'date-fns';
import { useNotification } from '@/providers/notification-provider';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import AlertBanner from '@/components/dashboard/alert-banner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUserDoc } from '@/services/userService';
import ProfileForm from '@/components/profile/profile-form';

// ─── localStorage hook (kept only for non-profile settings) ──────────────────

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch { return initialValue; }
    });
    const setValue = (value: T) => {
        try {
            setStoredValue(value);
            if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
        } catch { /* noop */ }
    };
    return [storedValue, setValue];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnimatedStat({ value, label }: { value: number; label: string }) {
    const controls = useAnimation();
    useEffect(() => {
        controls.start({ scale: [1, 1.2, 1], transition: { duration: 0.5, ease: 'easeOut' } });
    }, [value, controls]);
    return (
        <div className="text-center">
            <motion.p animate={controls} className="text-2xl font-bold text-primary">{Math.round(value)}</motion.p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function HealthScoreCircle({ score }: { score: number }) {
    const scoreColor = score > 80 ? 'hsl(var(--primary))' : score > 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
    return (
        <div className="relative w-28 h-28">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <motion.circle cx="50" cy="50" r="45" strokeWidth="10" className="stroke-secondary" fill="transparent" />
                <motion.circle cx="50" cy="50" r="45" strokeWidth="10" strokeLinecap="round" fill="transparent"
                    stroke={scoreColor}
                    strokeDasharray={2 * Math.PI * 45}
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - score / 100) }}
                    transition={{ duration: 1.5, ease: 'circOut' }}
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-foreground">{Math.round(score)}%</span>
                <span className="text-[10px] text-muted-foreground">Health</span>
            </div>
        </div>
    );
}

/** A settings row — always renders as div to avoid nested-button hydration errors */
function SettingsRow({
    icon, label, sub, right, onClick, dangerous,
}: {
    icon: React.ReactNode;
    label: string;
    sub?: string;
    right?: React.ReactNode;
    onClick?: () => void;
    dangerous?: boolean;
}) {
    const isClickable = !!onClick && !right; // only apply button semantics if no interactive right child
    return (
        <div
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={onClick}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
            className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 text-left select-none',
                isClickable && 'cursor-pointer active:bg-muted/50 transition-colors duration-100',
                !isClickable && !right && 'cursor-default',
            )}
        >
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-none', dangerous ? 'bg-destructive/10' : 'bg-muted')}>
                <span className={cn('text-muted-foreground', dangerous && 'text-destructive')}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', dangerous && 'text-destructive')}>{label}</p>
                {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
            </div>
            {right ?? (isClickable && <ChevronRight className="h-4 w-4 text-muted-foreground flex-none" />)}
        </div>
    );
}

/** Grouped settings card */
function SettingsGroup({ children }: { children: React.ReactNode }) {
    return (
        <Card className="rounded-2xl overflow-hidden divide-y divide-border">
            {children}
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const { t, language, setLanguage, languages } = useTranslation();
    const { theme, setTheme } = useTheme();
    const addNotification = useNotification();

    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isOfflineSheetOpen, setIsOfflineSheetOpen] = useState(false);
    const [demoMode, setDemoMode] = useLocalStorage<boolean>('croplyze_demo_mode', false);

    // ── Firestore profile data ───────────────────────────────────────────────
    const [profileData, setProfileData] = useState<UserDocument | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const fetchProfile = async () => {
        if (!user) return;
        try {
            const doc = await getUserDoc(user.uid);
            setProfileData(doc);
        } catch {
            // Silently fail — profile will show fallback data
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        if (!user && !userLoading) router.push('/login');
    }, [user, userLoading, router]);

    useEffect(() => {
        if (user) fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const { data: pastDiagnoses } = useCollection<Diagnosis>(
        user ? `users/${user.uid}/cropDiagnoses` : undefined,
    );

    const handleLogout = async () => {
        haptics.heavy();
        await signOut(auth);
        router.push('/login');
    };

    // ── PDF export ────────────────────────────────────────────────────────────
    const handleExportPdf = () => {
        haptics.light();
        if (!pastDiagnoses || pastDiagnoses.length === 0) {
            addNotification({ type: 'warning', title: 'No Data', message: 'No diagnosis history to export.' });
            return;
        }
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Croplyze — Crop Health History', 14, 22);
        const rows = pastDiagnoses.map(d => [
            d.cropType,
            d.diagnosis.diseaseName,
            d.diagnosis.severityLevel as string,
            d.createdAt ? format(d.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A',
        ]);
        autoTable(doc, {
            head: [['Crop', 'Diagnosis', 'Severity', 'Date']],
            body: rows,
            startY: 30,
            headStyles: { fillColor: [4, 120, 87] },
            theme: 'striped',
        });
        doc.save('croplyze-history.pdf');
        addNotification({ type: 'success', title: 'Export Successful', message: 'History exported to PDF.' });
    };

    // ── Stats ─────────────────────────────────────────────────────────────────
    const totalScans = pastDiagnoses?.length ?? 0;
    const diseasesDetected = pastDiagnoses?.filter(d =>
        d.diagnosis.diseaseName !== 'Healthy' && d.diagnosis.diseaseName !== 'No disease detected'
    ).length ?? 0;
    const healthyScans = totalScans - diseasesDetected;
    const healthPercentage = totalScans > 0 ? (healthyScans / totalScans) * 100 : 100;

    if (userLoading || !user || profileLoading) {
        return <div className="flex-1 bg-background flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    // Derived display values from Firestore profile (with auth fallbacks)
    const displayName = profileData?.name || user.displayName || 'Farmer';
    const displayEmail = profileData?.email || user.email || '';
    const displayPhoto = profileData?.photoURL || user.photoURL || undefined;
    const displayState = profileData?.state || '—';
    const displayFarmName = profileData?.farmName || '—';
    const displayCrop = profileData?.primaryCrop || '—';
    const displayLandArea = profileData?.landArea ? `${profileData.landArea} acres` : '—';
    const displaySoilType = profileData?.soilType || '—';
    const displayLanguage = profileData?.language || language;

    return (
        <div className="flex-1 bg-background">
            {/* ── Header ── */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 bg-background/80 backdrop-blur-sm border-b">
                <h1 className="text-xl font-bold">Me</h1>
                {demoMode && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                        <Sparkles className="h-3 w-3" />DEMO
                    </span>
                )}
            </header>

            <main className="flex flex-col gap-4 p-4">

                {/* ── Profile Card ── */}
                <Card className="rounded-2xl overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4 mb-4">
                            <Avatar className="h-16 w-16 border-2 border-primary">
                                <AvatarImage src={displayPhoto} alt={displayName} />
                                <AvatarFallback><UserIcon /></AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold truncate">{displayName}</h2>
                                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3" />{displayState}
                                </p>
                            </div>
                            <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon"><Edit className="h-5 w-5" /></Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                                    <SheetHeader className="text-left mb-4">
                                        <SheetTitle>Edit Profile</SheetTitle>
                                    </SheetHeader>
                                    <div className="pb-6">
                                        <ProfileForm
                                            uid={user.uid}
                                            defaultValues={{
                                                name: profileData?.name || user.displayName || '',
                                                phone: profileData?.phone || '',
                                                email: profileData?.email || user.email || '',
                                                farmName: profileData?.farmName || '',
                                                state: profileData?.state || '',
                                                primaryCrop: profileData?.primaryCrop || '',
                                                landArea: profileData?.landArea || '',
                                                soilType: profileData?.soilType || '',
                                                language: profileData?.language || language,
                                                photoURL: profileData?.photoURL || user.photoURL || '',
                                            }}
                                            submitLabel="Save Changes"
                                            onSuccess={() => {
                                                setIsEditSheetOpen(false);
                                                fetchProfile(); // Re-fetch fresh data
                                            }}
                                        />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-around pt-2 border-t border-border">
                            <AnimatedStat value={totalScans} label="Scans" />
                            <AnimatedStat value={diseasesDetected} label="Diseases" />
                            <HealthScoreCircle score={healthPercentage} />
                        </div>
                    </CardContent>
                </Card>

                {/* ── Alerts ── */}
                <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">🚨 Alerts</p>
                    <AlertBanner />
                    <Link href="/alerts" className="mt-2 flex items-center justify-end gap-1 text-xs text-primary font-semibold">
                        View all alerts <ChevronRight className="h-3 w-3" />
                    </Link>
                </div>

                {/* ── My Farm (from Firestore) ── */}
                <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">🏡 My Farm</p>
                    <SettingsGroup>
                        <SettingsRow icon={<Leaf className="h-4 w-4" />} label="Farm Name" sub={displayFarmName} />
                        <SettingsRow icon={<MapPin className="h-4 w-4" />} label="State / Location" sub={displayState} />
                        <SettingsRow icon={<FlaskConical className="h-4 w-4" />} label="Primary Crop" sub={displayCrop} />
                        <SettingsRow icon={<Tractor className="h-4 w-4" />} label="Land Area" sub={displayLandArea} />
                        <SettingsRow icon={<Mountain className="h-4 w-4" />} label="Soil Type" sub={displaySoilType} />
                    </SettingsGroup>
                </div>

                {/* ── Settings ── */}
                <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">⚙️ Settings</p>
                    <SettingsGroup>
                        <SettingsRow
                            icon={theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                            label="Dark Mode"
                            sub={theme === 'dark' ? 'On' : 'Off'}
                            right={
                                <Switch
                                    checked={theme === 'dark'}
                                    onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
                                />
                            }
                        />
                        <div className="flex items-center gap-3 px-4 py-3.5">
                            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-none">
                                <span className="text-muted-foreground text-sm">🌐</span>
                            </div>
                            <p className="flex-1 text-sm font-medium">Language</p>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {languages.map(lang => (
                                        <SelectItem key={lang.code} value={lang.code}>{lang.nativeName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <SettingsRow
                            icon={<Bell className="h-4 w-4" />}
                            label="Push Notifications"
                            sub="Disease & weather alerts"
                            right={<Switch />}
                        />
                    </SettingsGroup>
                </div>

                {/* ── Data & Reports ── */}
                <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📦 Data & Reports</p>
                    <SettingsGroup>
                        <SettingsRow
                            icon={<Download className="h-4 w-4" />}
                            label="Download PDF Report"
                            sub="Export full scan history"
                            onClick={handleExportPdf}
                        />
                        <SettingsRow
                            icon={<WifiOff className="h-4 w-4" />}
                            label="Offline Mode"
                            sub="What works without internet"
                            onClick={() => setIsOfflineSheetOpen(true)}
                        />
                    </SettingsGroup>
                </div>

                {/* ── Demo Mode ── */}
                <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">🎭 Demo Mode</p>
                    <SettingsGroup>
                        <SettingsRow
                            icon={<Sparkles className="h-4 w-4" />}
                            label="Demo Mode"
                            sub={demoMode ? 'Active — ideal for judges & investors' : 'Shows DEMO badge in header'}
                            right={
                                <Switch
                                    checked={demoMode}
                                    onCheckedChange={v => { setDemoMode(v); haptics.light(); }}
                                />
                            }
                        />
                    </SettingsGroup>
                    {demoMode && (
                        <p className="text-[11px] text-primary/80 mt-1.5 px-1">
                            ✨ Demo mode is active. A "DEMO" badge appears in the header so judges can identify this is a live demo.
                        </p>
                    )}
                </div>

                {/* ── About ── */}
                <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">ℹ️ About</p>
                    <SettingsGroup>
                        <SettingsRow icon={<Leaf className="h-4 w-4" />} label="Croplyze" sub="AI Farming Partner · v1.0.0" />
                        <SettingsRow icon={<Shield className="h-4 w-4" />} label="Powered by Gemini AI" sub="Google DeepMind · Genkit" />
                        <SettingsRow
                            icon={<ExternalLink className="h-4 w-4" />}
                            label="Privacy Policy"
                            sub="How we protect your data"
                            onClick={() => { /* placeholder */ }}
                        />
                        <SettingsRow icon={<Info className="h-4 w-4" />} label="Built for farmers" sub="Scan · Diagnose · Heal · Grow" />
                    </SettingsGroup>
                </div>

                {/* ── Sign Out ── */}
                <SettingsGroup>
                    <SettingsRow
                        icon={<LogOut className="h-4 w-4" />}
                        label="Sign Out"
                        dangerous
                        onClick={handleLogout}
                    />
                </SettingsGroup>

                {/* Bottom padding */}
                <div className="h-6" />
            </main>

            {/* ── Offline Info Sheet ── */}
            <Sheet open={isOfflineSheetOpen} onOpenChange={setIsOfflineSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader className="text-left mb-4">
                        <SheetTitle className="flex items-center gap-2">
                            <WifiOff className="h-5 w-5 text-primary" />
                            Offline Mode
                        </SheetTitle>
                    </SheetHeader>
                    <div className="space-y-3 pb-6">
                        {[
                            { ok: true, label: 'View past scan history' },
                            { ok: true, label: 'Download PDF reports' },
                            { ok: true, label: 'View farm profile & settings' },
                            { ok: true, label: 'Toggle dark mode & language' },
                            { ok: false, label: 'New AI crop scans (requires internet)' },
                            { ok: false, label: 'Fasal AI chatbot (requires internet)' },
                            { ok: false, label: 'AI Risk Engine predictions (requires internet)' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className={cn('text-base', item.ok ? 'text-green-500' : 'text-muted-foreground/40')}>
                                    {item.ok ? '✓' : '✗'}
                                </span>
                                <p className={cn('text-sm', !item.ok && 'text-muted-foreground/60')}>{item.label}</p>
                            </div>
                        ))}
                        <Button onClick={() => setIsOfflineSheetOpen(false)} className="w-full mt-2 rounded-xl">Got it</Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
