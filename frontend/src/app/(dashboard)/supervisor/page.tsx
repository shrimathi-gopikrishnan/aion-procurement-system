'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupervisorHomePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/supervisor/reviews'); }, [router]);
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm">Redirecting to Pending Reviews…</div>
    </div>
  );
}
