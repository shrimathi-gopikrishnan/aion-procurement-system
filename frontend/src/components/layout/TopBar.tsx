'use client';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatStatus } from '@/lib/utils';

interface TopBarProps { title: string; subtitle?: string; }

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth();
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
          <Bell className="w-5 h-5" />
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center">
              <span className="text-white text-sm font-medium">{user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-slate-800">{user.name}</div>
              <div className="text-xs text-slate-500">{formatStatus(user.role)}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
