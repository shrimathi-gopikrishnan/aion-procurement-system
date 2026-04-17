'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notificationsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { Bell, CheckCheck, Trash2, ArrowRight, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  resubmit_request: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  status_update:    { icon: Info,          color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  mo_approved:      { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  mo_rejected:      { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  general:          { icon: Bell,          color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' },
};

export default function InboxPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getAll();
      setNotifications(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const remove = async (id: number) => {
    await notificationsApi.deleteOne(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <TopBar
        title="Inbox"
        subtitle={unread ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}
      />
      <div className="p-6 max-w-3xl space-y-4">
        {unread > 0 && (
          <div className="flex justify-end">
            <button onClick={markAllRead} className="btn-secondary flex items-center gap-2">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          </div>
        )}

        {loading && (
          <div className="card p-10 text-center text-slate-500">Loading…</div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="card p-12 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Your inbox is empty</p>
            <p className="text-slate-400 text-sm mt-1">Notifications about your submissions will appear here</p>
          </div>
        )}

        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.general;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`card border px-4 py-4 flex gap-3 transition-all ${
                  !n.isRead ? cfg.bg : 'bg-white border-slate-200 opacity-75'
                }`}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.isRead ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                  <Icon className={`w-4 h-4 ${n.isRead ? 'text-slate-400' : cfg.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-500' : 'text-slate-800'}`}>
                      {n.title}
                      {!n.isRead && <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full align-middle" />}
                    </p>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className={`text-sm mt-0.5 ${n.isRead ? 'text-slate-400' : 'text-slate-600'}`}>{n.message}</p>

                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      onClick={() => markRead(n.id)}
                      className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${cfg.color} hover:underline`}
                    >
                      View details <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  className="flex-shrink-0 text-slate-300 hover:text-red-500 mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
