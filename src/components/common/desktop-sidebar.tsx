'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ScanLine,
    BarChart2,
    Wrench,
    Wheat,
    TrendingUp,
    GitCompareArrows,
    User,
    ChevronLeft,
    ChevronRight,
    Leaf,
    Sprout,
    FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/logo';

/* ── Navigation structure ─────────────────────────────────────────────────── */

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const navSections: NavSection[] = [
    {
        title: 'Main',
        items: [
            { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
            { href: '/scan', label: 'Scan', icon: ScanLine },
            { href: '/insights', label: 'Insights', icon: BarChart2 },
        ],
    },
    {
        title: 'Planning',
        items: [
            { href: '/farming-partner', label: 'Tools', icon: Wrench },
            { href: '/crops', label: 'Crop Database', icon: Wheat },
            { href: '/farming-partner/profit-predictor', label: 'Profit Predictor', icon: TrendingUp },
            { href: '/farming-partner/crop-compare', label: 'Crop Comparison', icon: GitCompareArrows },
            { href: '/farming-partner/crop-combination', label: 'Crop Combination', icon: Sprout },
            { href: '/farming-partner/treatment-predictor', label: 'Treatment Predictor', icon: FlaskConical },
        ],
    },
    {
        title: 'User',
        items: [
            { href: '/profile', label: 'Profile', icon: User },
        ],
    },
];

/* ── Component ────────────────────────────────────────────────────────────── */

interface DesktopSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function DesktopSidebar({ collapsed, onToggle }: DesktopSidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        if (href === '/scan') return pathname.startsWith('/scan');
        if (href === '/farming-partner') return pathname === '/farming-partner';
        return pathname.startsWith(href);
    };

    return (
        <aside
            className={cn(
                'hidden lg:flex flex-col h-screen sticky top-0 z-40',
                'bg-card border-r border-border',
                'transition-all duration-300 ease-in-out flex-shrink-0',
                collapsed ? 'w-[72px]' : 'w-[260px]',
            )}
        >
            {/* ── Logo / Brand ── */}
            <div className={cn(
                'flex items-center h-16 border-b border-border flex-shrink-0',
                collapsed ? 'justify-center px-2' : 'px-5 gap-3',
            )}>
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Leaf className="h-5 w-5 text-primary" />
                </div>
                {!collapsed && (
                    <span className="text-lg font-bold text-foreground tracking-tight truncate">
                        Croplyze
                    </span>
                )}
            </div>

            {/* ── Navigation sections ── */}
            <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
                {navSections.map((section) => (
                    <div key={section.title} className="mb-4">
                        {/* Section header */}
                        {!collapsed && (
                            <p className="px-5 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                {section.title}
                            </p>
                        )}
                        {collapsed && <div className="h-px bg-border mx-3 mb-2" />}

                        {/* Items */}
                        <ul className="space-y-0.5 px-2">
                            {section.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                'group flex items-center gap-3 rounded-xl px-3 py-2.5',
                                                'text-sm font-medium transition-all duration-150',
                                                active
                                                    ? 'bg-primary/10 text-primary font-semibold'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                                collapsed && 'justify-center px-0',
                                            )}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <item.icon
                                                className={cn(
                                                    'h-5 w-5 flex-shrink-0 transition-colors duration-150',
                                                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                                                )}
                                            />
                                            {!collapsed && <span className="truncate">{item.label}</span>}
                                            {/* Active indicator pill */}
                                            {active && !collapsed && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* ── Collapse toggle ── */}
            <div className="border-t border-border p-3 flex-shrink-0">
                <button
                    suppressHydrationWarning
                    onClick={onToggle}
                    className={cn(
                        'flex items-center gap-2 w-full rounded-xl px-3 py-2.5',
                        'text-sm font-medium text-muted-foreground',
                        'hover:bg-muted hover:text-foreground transition-colors duration-150',
                        collapsed && 'justify-center px-0',
                    )}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? (
                        <ChevronRight className="h-5 w-5" />
                    ) : (
                        <>
                            <ChevronLeft className="h-5 w-5" />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
