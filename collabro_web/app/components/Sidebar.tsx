'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  icon: string;
  href: string;
  label: string;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems: SidebarItem[] = [
    { icon: 'home', href: '/', label: 'Prompt Center' },
    { icon: 'dashboard', href: '/workspace', label: 'Main Workspace' },
    { icon: 'folder_open', href: '/projects', label: 'Projects' },
    { icon: 'smart_toy', href: '/agents', label: 'AI Agents' },
    { icon: 'monitoring', href: '/analytics', label: 'Analytics' },
    { icon: 'history', href: '/history', label: 'History' },
  ];

  return (
    <aside className="fixed left-4 top-4 bottom-4 w-20 rounded-xl z-50 flex flex-col items-center py-8 bg-surface-container/70 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40">
      {/* Brand Logo */}
      <Link href="/" className="mb-10 flex flex-col items-center group">
        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 transition-transform group-hover:scale-105 duration-300">
          <span className="material-symbols-outlined text-primary text-[28px] animate-pulse">hub</span>
        </div>
        <span className="text-[10px] text-primary/80 font-bold mt-1 tracking-wider uppercase">Collabro</span>
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-5 w-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-12 h-12 flex items-center justify-center rounded-lg scale-95 hover:scale-100 active:scale-90 transition-all duration-200 relative group ${
                isActive
                  ? 'text-primary bg-primary/15 border border-primary/20 shadow-[0_0_15px_rgba(175,198,255,0.1)]'
                  : 'text-on-surface-variant hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              
              {/* Tooltip */}
              <span className="absolute left-24 px-3 py-1.5 rounded-md bg-surface-container-highest text-white font-label-md text-label-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl whitespace-nowrap border border-white/10 z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings Bottom Link */}
      <Link
        href="/settings"
        title="Settings"
        className={`w-12 h-12 flex items-center justify-center rounded-lg scale-95 hover:scale-100 active:scale-90 transition-all duration-200 mt-auto group relative ${
          pathname === '/settings'
            ? 'text-primary bg-primary/15 border border-primary/20 shadow-[0_0_15px_rgba(175,198,255,0.1)]'
            : 'text-on-surface-variant hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: pathname === '/settings' ? "'FILL' 1" : "'FILL' 0" }}>
          settings
        </span>
        <span className="absolute left-24 px-3 py-1.5 rounded-md bg-surface-container-highest text-white font-label-md text-label-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl whitespace-nowrap border border-white/10 z-50">
          Settings
        </span>
      </Link>
    </aside>
  );
};
