'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getToken, getUser } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { notificationsApi, defectsApi } from '@/lib/api';

const AIChatbot = dynamic(
  () => import('@/components/chatbot/AIChatbot').then((m) => m.AIChatbot),
  { ssr: false }
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch { /* silent */ }
  }, []);

  const fetchPendingReviews = useCallback(async (role: string) => {
    if (role !== 'supervisor' && role !== 'admin') return;
    try {
      const res = await defectsApi.getPendingReviews();
      setPendingReviewsCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    setUser(u);
    if (!getToken()) { router.replace('/login'); return; }
    fetchUnread();
    if (u?.role) fetchPendingReviews(u.role);
    const interval = setInterval(() => {
      fetchUnread();
      if (u?.role) fetchPendingReviews(u.role);
    }, 30000);
    return () => clearInterval(interval);
  }, [router, fetchUnread, fetchPendingReviews]);

  const showChatbot = mounted && (
    user?.role === 'supervisor' ||
    user?.role === 'admin' ||
    user?.role === 'procurement_manager'
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar unreadCount={unreadCount} pendingReviewsCount={pendingReviewsCount} />
      <div className="flex-1 flex flex-col ml-60 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      {showChatbot && <AIChatbot />}
    </div>
  );
}
