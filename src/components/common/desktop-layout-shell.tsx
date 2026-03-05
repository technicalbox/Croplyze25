'use client';

import { useState } from 'react';
import DesktopSidebar from '@/components/common/desktop-sidebar';
import DesktopHeader from '@/components/common/desktop-header';

interface DesktopLayoutShellProps {
    children: React.ReactNode;
}

/**
 * Desktop layout shell — renders sidebar + header on desktop (lg:),
 * passes children through untouched on mobile.
 * All responsive logic is handled via Tailwind classes,
 * no JS window-width detection.
 */
export default function DesktopLayoutShell({ children }: DesktopLayoutShellProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen">
            {/* Sidebar — hidden below lg: via its own classes */}
            <DesktopSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((prev) => !prev)}
            />

            {/* Main column — takes full width on mobile, flex-1 on desktop */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header — hidden below lg: via its own classes */}
                <DesktopHeader />

                {/* Content area */}
                {children}
            </div>
        </div>
    );
}
