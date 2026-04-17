'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { invoicesApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Eye } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    invoicesApi.getAll(statusFilter ? { status: statusFilter } : {}).then((r) => setInvoices(r.data)).catch(() => setInvoices([])).finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <>
      <TopBar title="Invoices" subtitle="3-way match and payment tracking" />
      <div className="p-6 space-y-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-52">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="matched">Matched</option>
          <option value="exception">Exception</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>

        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Invoice #</th>
                <th className="table-header">Vendor Invoice #</th>
                <th className="table-header">PO Number</th>
                <th className="table-header">Vendor</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-400">No invoices found</td></tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="table-cell font-mono text-blue-700 font-medium">{inv.invoiceNumber}</td>
                  <td className="table-cell text-slate-500">{inv.vendorInvoiceNumber || '—'}</td>
                  <td className="table-cell font-mono text-xs">{inv.purchaseOrder?.poNumber || '—'}</td>
                  <td className="table-cell">{inv.purchaseOrder?.vendor?.name || '—'}</td>
                  <td className="table-cell font-medium">{formatCurrency(inv.amount)}</td>
                  <td className="table-cell"><StatusBadge status={inv.status} /></td>
                  <td className="table-cell text-slate-500">{formatDate(inv.createdAt)}</td>
                  <td className="table-cell">
                    <Link href={`/invoices/${inv.id}`} className="btn-secondary flex items-center gap-1 w-fit py-1 px-2">
                      <Eye className="w-3.5 h-3.5" /> View
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
