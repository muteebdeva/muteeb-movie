import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { navigate } from '@/lib/router';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 mx-auto mb-8" aria-label="Home">
          <Logo className="w-10 h-10 rounded object-contain" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Muteeb<span className="text-red-500"> Movie</span>
          </span>
        </button>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
