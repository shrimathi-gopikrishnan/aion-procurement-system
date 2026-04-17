'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { defectsApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { formatDate } from '@/lib/utils';
import { Plus, Eye } from 'lucide-react';

export default function DefectsPage() {
  const router = useRouter();
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await defectsApi.getAll(statusFilter ? { status: statusFilter } : {});
      setDefects(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <>
      <TopBar title="Defects" subtitle="Defect records and AI analysis" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-48"
          >
            <option value="">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="linked_to_mo">Linked to MO</option>
          </select>
          <Link href="/defects/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Upload Defect
          </Link>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">ID</th>
                <th className="table-header">AI Component</th>
                <th className="table-header">Damage Type</th>
                <th className="table-header">Severity</th>
                <th className="table-header">Confidence</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>
              )}
              {!loading && defects.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-400">No defects found. Upload one to get started.</td></tr>
              )}
              {defects.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell font-mono text-xs text-slate-500">#{d.id}</td>
                  <td className="table-cell font-medium">{d.aiDetectedComponent || '—'}</td>
                  <td className="table-cell">{d.damageType || '—'}</td>
                  <td className="table-cell"><SeverityBadge severity={d.severity} /></td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.round((d.aiConfidence || 0) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs">{Math.round((d.aiConfidence || 0) * 100)}%</span>
                    </div>
                  </td>
                  <td className="table-cell"><StatusBadge status={d.status} /></td>
                  <td className="table-cell text-slate-500">{formatDate(d.createdAt)}</td>
                  <td className="table-cell">
                    <Link href={`/defects/${d.id}`} className="btn-secondary flex items-center gap-1 w-fit py-1 px-2">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
