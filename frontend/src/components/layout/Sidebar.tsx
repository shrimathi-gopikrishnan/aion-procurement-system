'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, AlertCircle, Wrench, Package, FileText,
  Building2, ShoppingCart, Truck, Receipt, Users, LogOut,
  ChevronRight, Inbox, ClipboardList, History,
  MessageSquare, Upload, Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatStatus } from '@/lib/utils';

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-blue-100 text-blue-700',
  operator: 'bg-green-100 text-green-700',
  procurement_manager: 'bg-orange-100 text-orange-700',
  warehouse: 'bg-yellow-100 text-yellow-700',
  finance: 'bg-emerald-100 text-emerald-700',
};

type NavItem = {
  label: string;
  href: string;
  icon: any;
  badge?: number;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

function NavLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`sidebar-link ${active ? 'active' : 'text-slate-600'}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : active ? (
        <ChevronRight className="w-3 h-3 opacity-40" />
      ) : null}
    </Link>
  );
}

export function Sidebar({ unreadCount = 0, pendingReviewsCount = 0 }: { unreadCount?: number; pendingReviewsCount?: number }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const role = user?.role || '';

  const getNavGroups = (): NavGroup[] => {
    if (role === 'operator') {
      return [
        {
          label: 'My Work',
          items: [
            { label: 'Scan / Upload', href: '/defects/new', icon: Upload },
            { label: 'My Submissions', href: '/my-defects', icon: Eye },
            { label: 'Inbox', href: '/inbox', icon: Inbox, badge: unreadCount || undefined },
          ],
        },
      ];
    }

    if (role === 'supervisor') {
      return [
        {
          label: 'Review Queue',
          items: [
            { label: 'Pending Reviews', href: '/supervisor/reviews', icon: ClipboardList, badge: pendingReviewsCount || undefined },
            { label: 'All Defects', href: '/defects', icon: AlertCircle },
            { label: 'Maintenance Orders', href: '/maintenance-orders', icon: Wrench },
          ],
        },
        {
          label: 'Tools',
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'History & Audit', href: '/history', icon: History },
            { label: 'AI Assistant', href: '/supervisor/chat', icon: MessageSquare },
          ],
        },
      ];
    }

    if (role === 'procurement_manager') {
      return [
        {
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          label: 'Procurement',
          items: [
            { label: 'Purchase Requisitions', href: '/purchase-requisitions', icon: FileText },
            { label: 'Vendors', href: '/vendors', icon: Building2 },
            { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
          ],
        },
        {
          label: 'Visibility',
          items: [
            { label: 'Maintenance Orders', href: '/maintenance-orders', icon: Wrench },
            { label: 'History & Audit', href: '/history', icon: History },
          ],
        },
      ];
    }

    if (role === 'warehouse') {
      return [
        {
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          label: 'Warehouse',
          items: [
            { label: 'Inventory', href: '/inventory', icon: Package },
            { label: 'Goods Receipts', href: '/goods-receipts', icon: Truck },
          ],
        },
      ];
    }

    if (role === 'finance') {
      return [
        {
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          label: 'Finance',
          items: [
            { label: 'Invoices', href: '/invoices', icon: Receipt },
            { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
          ],
        },
      ];
    }

    // admin — full access
    return [
      {
        items: [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        ],
      },
      {
        label: 'Operations',
        items: [
          { label: 'Defects', href: '/defects', icon: AlertCircle },
          { label: 'Maintenance Orders', href: '/maintenance-orders', icon: Wrench },
          { label: 'Inventory', href: '/inventory', icon: Package },
        ],
      },
      {
        label: 'Procurement',
        items: [
          { label: 'Purchase Requisitions', href: '/purchase-requisitions', icon: FileText },
          { label: 'Vendors', href: '/vendors', icon: Building2 },
          { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
        ],
      },
      {
        label: 'Fulfilment',
        items: [
          { label: 'Goods Receipts', href: '/goods-receipts', icon: Truck },
          { label: 'Invoices', href: '/invoices', icon: Receipt },
        ],
      },
      {
        label: 'System',
        items: [
          { label: 'History & Audit', href: '/history', icon: History },
          { label: 'AI Assistant', href: '/supervisor/chat', icon: MessageSquare },
          { label: 'Users', href: '/admin/users', icon: Users },
        ],
      },
    ];
  };

  const groups = getNavGroups();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 flex flex-col z-20">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <div>
          <div className="font-bold text-slate-900 leading-tight">AION</div>
          <div className="text-xs text-slate-400 leading-tight">Industrial ERP</div>
        </div>
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 text-sm font-semibold">{user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{user.name}</div>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user.role] || 'bg-slate-100 text-slate-600'}`}>
                {formatStatus(user.role)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  badge={item.badge}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={logout}
          className="sidebar-link w-full text-slate-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
