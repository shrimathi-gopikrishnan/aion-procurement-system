'use client';
import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import api from '@/lib/api';
import { formatDateTime, formatStatus } from '@/lib/utils';
import {
  Activity, Filter, ChevronDown, User,
  Wrench, FileText, ShoppingCart, Truck, Receipt, Package,
  AlertCircle,
} from 'lucide-react';

const entityIcons: Record<string, any> = {
  maintenance_order: Wrench,
  defect: AlertCircle,
  purchase_requisition: FileText,
  purchase_order: ShoppingCart,
  goods_receipt: Truck,
  invoice: Receipt,
  inventory: Package,
};

const actionColors: Record<string, string> = {
  CREATED:   'bg-green-100 text-green-700',
  APPROVED:  'bg-blue-100 text-blue-700',
  REJECTED:  'bg-red-100 text-red-700',
  UPDATED:   'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  PAID:      'bg-emerald-100 text-emerald-700',
};

function getActionColor(action: string) {
  for (const [key, cls] of Object.entries(actionColors)) {
    if (action.includes(key)) return cls;
  }
  return 'bg-slate-100 text-slate-600';
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/audit-log', { params: { entityType: entityFilter || undefined, take: PAGE_SIZE, skip: page * PAGE_SIZE } })
      .then((r) => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [entityFilter, page]);

  const entityTypes = [
    { value: '', label: 'All Activities' },
    { value: 'maintenance_order', label: 'Maintenance Orders' },
    { value: 'defect', label: 'Defects' },
    { value: 'purchase_requisition', label: 'Purchase Requisitions' },
    { value: 'purchase_order', label: 'Purchase Orders' },
    { value: 'goods_receipt', label: 'Goods Receipts' },
    { value: 'invoice', label: 'Invoices' },
  ];

  return (
    <>
      <TopBar title="History & Audit Trail" subtitle="Complete record of all system activities" />
      <div className="p-6 space-y-4 max-w-5xl">

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
              className="input pl-8 pr-8 py-2 w-52 appearance-none"
            >
              {entityTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-sm text-slate-500">{logs.length} events</span>
        </div>

        {/* Timeline */}
        <div className="card overflow-hidden">
          {loading && <div className="p-10 text-center text-slate-500">Loading…</div>}
          {!loading && logs.length === 0 && (
            <div className="p-10 text-center">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No activity recorded yet</p>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {logs.map((log, i) => {
              const Icon = entityIcons[log.entityType] || Activity;
              return (
                <div key={log.id ?? i} className="flex gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  {/* Icon */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    {i < logs.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1 min-h-[16px]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-slate-700 capitalize">
                          {formatStatus(log.entityType)} #{log.entityId}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        {log.performedBy?.name || 'System'}
                      </span>
                      {log.fromState && log.toState && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-400">
                            {log.fromState} → {log.toState}
                          </span>
                        </>
                      )}
                    </div>

                    {log.metadata && (() => {
                      try {
                        const meta = JSON.parse(log.metadata);
                        const keys = Object.keys(meta).slice(0, 2);
                        if (!keys.length) return null;
                        return (
                          <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 inline-block">
                            {keys.map((k) => `${k}: ${meta[k]}`).join(' · ')}
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        {logs.length >= PAGE_SIZE && (
          <div className="flex justify-center gap-3">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary">Previous</button>
            <span className="flex items-center text-sm text-slate-600">Page {page + 1}</span>
            <button onClick={() => setPage((p) => p + 1)} className="btn-secondary">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
