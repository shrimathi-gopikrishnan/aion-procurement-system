'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SeverityBadge } from '@/components/shared/SeverityBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  AlertCircle, Wrench, FileText, ShoppingCart,
  RefreshCw, TrendingUp, Package, CheckCircle2, Clock,
} from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color, href }: any) {
  const inner = (
    <div className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function MiniBarChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-20">
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-slate-600">{d.value}</span>
          <div className="w-full rounded-t-sm" style={{ height: `${(d.value / max) * 56}px`, backgroundColor: colors[i % colors.length] }} />
          <span className="text-xs text-slate-500 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
        {segments.map((s, i) => {
          const dash = (s.value / total) * circ;
          const gap = circ - dash;
          const rotate = (offset / total) * 360 - 90;
          offset += s.value;
          return (
            <circle
              key={i} cx="50" cy="50" r={r} fill="none"
              stroke={s.color} strokeWidth="16"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={0}
              style={{ transform: `rotate(${rotate}deg)`, transformOrigin: '50px 50px' }}
            />
          );
        })}
        <text x="50" y="54" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{total}</text>
      </svg>
      <div className="space-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-semibold text-slate-800 ml-auto pl-2">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Operators go straight to the scan page
  useEffect(() => {
    const user = getUser();
    if (user?.role === 'operator') router.replace('/defects/new');
  }, [router]);

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, invRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getInventoryStatus(),
      ]);
      setData(sumRes.data);
      setInventory(invRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const defectSeverityData = data ? [
    { label: 'Critical', value: data.recentActivity?.defects?.filter((d: any) => d.severity === 'critical').length ?? 0, color: '#ef4444' },
    { label: 'High', value: data.recentActivity?.defects?.filter((d: any) => d.severity === 'high').length ?? 0, color: '#f97316' },
    { label: 'Medium', value: data.recentActivity?.defects?.filter((d: any) => d.severity === 'medium').length ?? 0, color: '#eab308' },
    { label: 'Low', value: data.recentActivity?.defects?.filter((d: any) => d.severity === 'low').length ?? 0, color: '#22c55e' },
  ] : [];

  const moStatusData = data ? [
    { label: 'Pending', value: data.maintenanceOrders?.pending ?? 0 },
    { label: 'Approved', value: data.maintenanceOrders?.approved ?? 0 },
    { label: 'Total', value: data.maintenanceOrders?.total ?? 0 },
  ] : [];

  return (
    <>
      <TopBar title="Dashboard" subtitle="System overview and real-time activity" />
      <div className="p-6 space-y-6 max-w-7xl">

        <div className="flex justify-end">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading dashboard…</div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Defects" value={data.defects?.total ?? 0}
                sub={`${data.defects?.pending ?? 0} pending review`}
                icon={AlertCircle} color="bg-red-50 text-red-600" href="/defects" />
              <StatCard label="Maintenance Orders" value={data.maintenanceOrders?.total ?? 0}
                sub={`${data.maintenanceOrders?.pending ?? 0} awaiting approval`}
                icon={Wrench} color="bg-blue-50 text-blue-600" href="/maintenance-orders" />
              <StatCard label="Purchase Requisitions" value={data.purchaseRequisitions?.total ?? 0}
                sub={`${data.purchaseRequisitions?.pending ?? 0} pending approval`}
                icon={FileText} color="bg-amber-50 text-amber-600" href="/purchase-requisitions" />
              <StatCard label="Purchase Orders" value={data.purchaseOrders?.total ?? 0}
                sub={formatCurrency(data.purchaseOrders?.totalValue ?? 0)}
                icon={ShoppingCart} color="bg-green-50 text-green-600" href="/purchase-orders" />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg"><TrendingUp className="w-4 h-4 text-purple-600" /></div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{data.invoices?.pending ?? 0}</p>
                  <p className="text-xs text-slate-500">Invoices Pending</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{data.invoices?.paid ?? 0}</p>
                  <p className="text-xs text-slate-500">Invoices Paid</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg"><Package className="w-4 h-4 text-orange-600" /></div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{inventory?.lowStockCount ?? 0}</p>
                  <p className="text-xs text-slate-500">Low Stock Items</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><Clock className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{data.maintenanceOrders?.approved ?? 0}</p>
                  <p className="text-xs text-slate-500">MOs In Progress</p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Defect Severity Donut */}
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Defect Severity Breakdown</h3>
                <DonutChart segments={defectSeverityData} />
              </div>

              {/* MO Status Bar */}
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Maintenance Order Status</h3>
                <MiniBarChart
                  data={moStatusData}
                  colors={['#f97316', '#3b82f6', '#64748b']}
                />
              </div>

              {/* Low Stock */}
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-3">Low Stock Alert</h3>
                {inventory?.lowStockItems?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-20 text-green-600">
                    <CheckCircle2 className="w-8 h-8 mb-1" />
                    <p className="text-sm font-medium">All stock levels healthy</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inventory?.lowStockItems?.slice(0, 4).map((item: any) => {
                      const available = item.quantityOnHand - item.quantityReserved;
                      const pct = Math.min(100, (available / (item.reorderPoint || 1)) * 100);
                      return (
                        <div key={item.id}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-slate-700 truncate max-w-[120px]">{item.component?.name || `#${item.componentId}`}</span>
                            <span className="text-red-600 font-semibold">{available} left</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.max(4, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {(inventory?.lowStockItems?.length ?? 0) > 4 && (
                      <Link href="/inventory" className="text-xs text-blue-600 hover:underline">
                        +{inventory.lowStockItems.length - 4} more →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Recent Defects</h2>
                  <Link href="/defects" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                <div className="divide-y divide-slate-50">
                  {!data.recentActivity?.defects?.length && (
                    <div className="px-5 py-8 text-center text-slate-500 text-sm">No defects recorded yet</div>
                  )}
                  {data.recentActivity?.defects?.map((d: any) => (
                    <Link key={d.id} href={`/defects/${d.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{d.aiDetectedComponent || 'Unknown Component'}</div>
                        <div className="text-xs text-slate-500">{d.damageType} · {formatDate(d.createdAt)}</div>
                      </div>
                      <SeverityBadge severity={d.severity} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Recent Maintenance Orders</h2>
                  <Link href="/maintenance-orders" className="text-xs text-blue-600 hover:underline">View all →</Link>
                </div>
                <div className="divide-y divide-slate-50">
                  {!data.recentActivity?.maintenanceOrders?.length && (
                    <div className="px-5 py-8 text-center text-slate-500 text-sm">No maintenance orders yet</div>
                  )}
                  {data.recentActivity?.maintenanceOrders?.map((mo: any) => (
                    <Link key={mo.id} href={`/maintenance-orders/${mo.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{mo.moNumber}</div>
                        <div className="text-xs text-slate-500">{formatDate(mo.createdAt)}</div>
                      </div>
                      <StatusBadge status={mo.status} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-slate-500">Failed to load dashboard data</div>
        )}
      </div>
    </>
  );
}
