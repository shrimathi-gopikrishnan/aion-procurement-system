'use client';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.getAll().then((r) => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar title="Inventory" subtitle="Stock levels and reservations" />
      <div className="p-6 space-y-4">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Component</th>
                <th className="table-header">On Hand</th>
                <th className="table-header">Reserved</th>
                <th className="table-header">Available</th>
                <th className="table-header">Reorder Point</th>
                <th className="table-header">Location</th>
                <th className="table-header">Unit Cost</th>
                <th className="table-header">UOM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-500">Loading…</td></tr>}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center py-10 text-slate-400">No inventory records</td></tr>
              )}
              {items.map((item) => {
                const available = (item.quantityOnHand || 0) - (item.quantityReserved || 0);
                const isLow = available <= (item.reorderPoint || 0);
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 ${isLow ? 'bg-amber-50' : ''}`}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        <span className="font-medium">{item.component?.name || `Component #${item.componentId}`}</span>
                      </div>
                    </td>
                    <td className="table-cell">{item.quantityOnHand}</td>
                    <td className="table-cell text-blue-600">{item.quantityReserved}</td>
                    <td className={`table-cell font-medium ${isLow ? 'text-amber-700' : 'text-green-700'}`}>{available}</td>
                    <td className="table-cell text-slate-500">{item.reorderPoint}</td>
                    <td className="table-cell text-slate-500">{item.location || '—'}</td>
                    <td className="table-cell">{item.unitCost ? formatCurrency(item.unitCost) : '—'}</td>
                    <td className="table-cell text-slate-500">{item.unitOfMeasure || 'pcs'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
