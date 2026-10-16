import { useState } from 'react';
import {
  LayoutDashboard, Film, Layers, LayoutGrid, Plug, Settings as SettingsIcon,
  BarChart3, ScrollText, LogOut, Menu, X, ChevronsLeft, Clapperboard, ExternalLink,
} from 'lucide-react';
import type { AdminUser } from '@/lib/adminApi';
import { navigate } from '@/lib/router';

export type AdminPageKey =
  | 'dashboard' | 'titles' | 'collections' | 'sections'
  | 'providers' | 'analytics' | 'audit' | 'settings';

const NAV: { key: AdminPageKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'titles', label: 'Titles', icon: Film },
  { key: 'collections', label: 'Collections', icon: Layers },
  { key: 'sections', label: 'Homepage', icon: LayoutGrid },
  { key: 'providers', label: 'Providers', icon: Plug },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'audit', label: 'Audit Log', icon: ScrollText },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AdminLayout({
  admin, page, onNavigate, onLogout, children,
}: {
  admin: AdminUser;
  page: AdminPageKey;
  onNavigate: (p: AdminPageKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (p: AdminPageKey) => {
    onNavigate(p);
    setMobileOpen(false);
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-zinc-800/80 shrink-0">
        <span className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
          <Clapperboard className="w-5 h-5 text-white" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">Muteeb Movie</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Admin</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" aria-label="Admin navigation">
        {NAV.map((item) => {
          const active = page === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => go(item.key)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-red-600/15 text-red-400 border border-red-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/70 border border-transparent'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-3 shrink-0 space-y-1">
        <button
          onClick={() => navigate('/')}
          title="View public site"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/70 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <ExternalLink className="w-5 h-5 shrink-0" />
          {!collapsed && <span>View site</span>}
        </button>
        <div className={`flex items-center gap-2.5 px-1 ${collapsed ? 'justify-center' : ''}`}>
          <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
            {(admin.display_name || admin.email).slice(0, 1).toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-200 truncate">{admin.display_name || admin.email}</p>
              <button onClick={onLogout} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-400 transition-colors">
                <LogOut className="w-3 h-3" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 bottom-0 z-40 bg-zinc-900/60 backdrop-blur border-r border-zinc-800/80 flex-col transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {sidebar}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 bottom-0 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className={`transition-all duration-200 ${collapsed ? 'md:pl-[68px]' : 'md:pl-60'}`}>
        <header className="md:hidden sticky top-0 z-30 h-14 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/80 flex items-center gap-3 px-4">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-zinc-300" aria-label="Open admin menu">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white">Admin Panel</span>
        </header>
        <main className="p-4 md:p-8 max-w-[1200px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
