'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScanLine, Bell, User, Wheat, BarChart2 } from 'lucide-react';
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

  const handlePress = () => {
    haptics.light();
  };

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] h-20 bg-background/80 backdrop-blur-lg border-t border-border z-50 md:hidden">
      <div className="flex justify-around items-center h-full mx-auto px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/scan' && pathname.startsWith('/scan')) ||
            (item.href === '/farming-partner' && (
              pathname.startsWith('/farming-partner') || pathname.startsWith('/growth-timeline')
            ));

          if (item.center) {
            return (
              <Link key={item.href} href={item.href} onClick={handlePress} className="flex-1 flex justify-center">
                <div className={cn(
                  'flex flex-col items-center justify-center gap-1 -mt-5 w-14 h-14 rounded-2xl shadow-lg transition-all duration-200 active:scale-90',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-primary/40'
                    : 'bg-primary text-primary-foreground shadow-primary/30',
                )}>
                  <item.icon className="h-6 w-6" />
                  <span className="text-[9px] font-bold leading-none">{item.label}</span>
                </div>
              </Link>
            );
          }

          return (
            <Link key={item.href} href={item.href} onClick={handlePress} className="flex-1">
              <div className={cn(
                'flex flex-col items-center justify-center gap-1 transition-all duration-200 p-2 rounded-xl',
                'active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
