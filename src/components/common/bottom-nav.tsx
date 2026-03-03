'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScanLine, User, Wheat, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, center: false },
  { href: '/scan', label: 'Scan', icon: ScanLine, center: false },
  { href: '/farming-partner', label: 'Farm AI', icon: Wheat, center: true },
  { href: '/insights', label: 'Farm', icon: BarChart2, center: false },
  { href: '/profile', label: 'Me', icon: User, center: false },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/signup') return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] h-[68px] bg-background/90 backdrop-blur-xl border-t border-border z-50 lg:hidden">
      <div className="flex justify-around items-end h-full mx-auto px-2 pb-[calc(env(safe-area-inset-bottom)+6px)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/scan' && pathname.startsWith('/scan')) ||
            (item.href === '/farming-partner' && (
              pathname.startsWith('/farming-partner') || pathname.startsWith('/growth-timeline')
            ));

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => haptics.medium()}
                className="flex-1 flex justify-center -mt-4"
              >
                <div className={cn(
                  'flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl',
                  'transition-all duration-200 active:scale-90',
                  isActive
                    ? 'bg-primary shadow-lg shadow-primary/40 animate-pulse-glow'
                    : 'bg-primary shadow-md shadow-primary/30',
                )}>
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                  <span className="text-[9px] font-bold text-primary-foreground leading-none">{item.label}</span>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptics.light()}
              className="flex-1"
            >
              <div className={cn(
                'flex flex-col items-center gap-0.5 pt-1.5 pb-1 mx-0.5 rounded-xl',
                'transition-all duration-200 active:scale-90',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>
                {/* Active pill indicator — iOS App Store style */}
                <div className={cn(
                  'h-0.5 w-5 rounded-full mb-0.5 transition-all duration-300',
                  isActive ? 'bg-primary opacity-100 scale-100' : 'opacity-0 scale-0',
                )} />
                <item.icon className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isActive && 'scale-110',
                )} />
                <span className={cn(
                  'text-[10px] leading-none transition-all duration-200',
                  isActive ? 'font-bold' : 'font-medium',
                )}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
