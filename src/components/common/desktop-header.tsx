'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, MapPin, Navigation, LogOut, User, ChevronDown } from 'lucide-react';
import { useRegion } from '@/providers/region-provider';
import RegionSelector from '@/components/region/RegionSelector';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CropSearchInput } from '@/components/crops/CropSearchInput';
import { cn } from '@/lib/utils';

export default function DesktopHeader() {
    const { region, hasRegion, isDetecting, detectGPS, setManualRegion } = useRegion();
    const [regionSelectorOpen, setRegionSelectorOpen] = useState(false);
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        setDropdownOpen(false);
        await signOut(auth);
        router.push('/login');
    };

    const regionLabel =
        region.city && region.state
            ? `${region.city}, ${region.state}`
            : region.state || region.country || 'Set region';

    return (
        <>
            <header className="hidden lg:flex items-center h-16 px-6 border-b border-border bg-card backdrop-blur-sm sticky top-0 z-40 gap-4 flex-shrink-0">
                {/* ── Region display (clickable) ── */}
                <button
                    onClick={() => setRegionSelectorOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors flex-shrink-0 max-w-[200px]"
                >
                    {region.source === 'gps' ? (
                        <Navigation className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    ) : (
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-foreground truncate">{regionLabel}</span>
                </button>

                {/* ── Spacer ── */}
                <div className="flex-1" />

                {/* ── Global Crop Search (same component as dashboard) ── */}
                <div className="w-full max-w-md relative z-[200]">
                    <CropSearchInput
                        placeholder="Search any crop (e.g., Rice, Tomato)..."
                        onSelect={(id) => router.push(`/crop/${id}`)}
                        className="[&>div:first-child]:h-10 [&>div:first-child]:rounded-xl [&>div:first-child]:shadow-none [&>div:first-child]:border-border [&>div:first-child]:bg-muted/50"
                    />
                </div>

                {/* ── Spacer ── */}
                <div className="flex-1" />

                {/* ── Right section ── */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Notifications */}
                    <button
                        className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors duration-150"
                        title="Notifications"
                    >
                        <Bell className="h-4.5 w-4.5 text-muted-foreground" />
                        {/* Unread dot */}
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
                    </button>

                    {/* User avatar dropdown */}
                    <div className="relative" ref={dropdownRef} style={{ zIndex: 200 }}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/50 transition-colors duration-150"
                        >
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                                <AvatarFallback className="text-xs">
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <ChevronDown className={cn(
                                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                                dropdownOpen && 'rotate-180',
                            )} />
                        </button>

                        {/* Dropdown menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-2xl ring-1 ring-black/5 py-1.5 z-[200] animate-in fade-in-0 zoom-in-95 duration-150">
                                <div className="px-3 py-2 border-b border-border">
                                    <p className="text-sm font-medium truncate">{user?.displayName || 'Farmer'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => { setDropdownOpen(false); router.push('/profile'); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                    <User className="h-4 w-4" /> Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Region Selector Modal ── */}
            <RegionSelector
                open={regionSelectorOpen}
                onClose={() => setRegionSelectorOpen(false)}
                onSelect={(country, countryCode, state, city) => {
                    setManualRegion(country, countryCode, state, city);
                    setRegionSelectorOpen(false);
                }}
                onDetectGPS={async () => {
                    await detectGPS();
                    setRegionSelectorOpen(false);
                }}
                isDetecting={isDetecting}
            />
        </>
    );
}

