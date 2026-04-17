export function formatDate(d: any): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(d: any): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return map[severity] || 'bg-gray-100 text-gray-800';
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    pending_review: 'bg-blue-100 text-blue-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-emerald-100 text-emerald-700',
    matched: 'bg-green-100 text-green-700',
    exception: 'bg-red-100 text-red-700',
    paid: 'bg-emerald-100 text-emerald-800',
    converted_to_po: 'bg-purple-100 text-purple-700',
    created: 'bg-blue-100 text-blue-700',
    sent_to_vendor: 'bg-indigo-100 text-indigo-700',
    fully_received: 'bg-green-100 text-green-700',
    partially_received: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-slate-100 text-slate-700',
    blacklisted: 'bg-red-100 text-red-700',
    linked_to_mo: 'bg-purple-100 text-purple-700',
    reviewed: 'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

export function formatStatus(status: string): string {
  return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
