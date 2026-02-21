'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScanLine, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] h-20 bg-background/70 backdrop-blur-lg border-t border-border z-50 md:hidden">
      <div className="flex justify-around items-center h-full mx-auto px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/scan' && pathname.startsWith('/scan'));
          return (
            <Link key={item.href} href={item.href} onClick={handlePress} className="flex-1">
              <div className={cn(
                'flex flex-col items-center justify-center gap-1 transition-all duration-200 p-2 rounded-lg',
                'active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
