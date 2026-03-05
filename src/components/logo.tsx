'use client';

import { cn } from '@/lib/utils';

const CroplyzeLogoIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    className={className}
    aria-hidden="true"
  >
    {/* Outer circle and sun rays */}
    <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--accent))" strokeWidth="5" />
    <g stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round">
        <line x1="50" y1="5" x2="50" y2="15" />
        <line x1="27" y1="17" x2="32" y2="22" />
        <line x1="73" y1="17" x2="68" y2="22" />
    </g>

    {/* Fields with clip path to fit inside circle */}
    <defs>
        <clipPath id="circle-clip">
            <circle cx="50" cy="50" r="45" />
        </clipPath>
    </defs>
    <g clipPath="url(#circle-clip)">
        <path
        d="M-10,80 C 30,60 70,60 110,80"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--primary))"
        strokeWidth="25"
        />
        <path
        d="M-10,65 C 30,45 70,45 110,65"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.6"
        strokeWidth="20"
        />
    </g>
    
    {/* Sprout */}
    <g stroke="hsl(var(--background))" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 75 V 55" />
        <path d="M50 55 C 40 50 40 40 50 35" />
        <path d="M50 55 C 60 50 60 40 50 35" />
    </g>
  </svg>
);

export default function Logo({ className, iconClassName }: { className?: string, iconClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-primary", className)}>
      <CroplyzeLogoIcon className={cn("h-6 w-6", iconClassName)} />
      <span className="text-xl font-bold font-headline">Croplyze</span>
    </div>
  );
}
