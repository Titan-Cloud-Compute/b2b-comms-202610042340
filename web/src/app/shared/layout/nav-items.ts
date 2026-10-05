export interface NavItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  tab?: string;
  /** Sidebar group (Vendor / Customer / Admin) for story feature pages. */
  group?: NavGroup;
}

export type NavGroup = 'Vendor' | 'Customer' | 'Admin';

/** Order in which feature nav groups render in the sidebar. */
export const NAV_GROUPS: NavGroup[] = ['Vendor', 'Customer', 'Admin'];

/** Entries shown to signed-in users (non-admin shell). */
export const FIRM_NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  },
];

/** Entries shown to EVERY signed-in role, rendered outside the role branches. */
export const SHARED_NAV_ITEMS: NavItem[] = [];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    path: '/admin/overview',
    label: 'Overview',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    adminOnly: true,
    tab: 'overview',
  },
  {
    path: '/admin/users',
    label: 'Users',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    adminOnly: true,
    tab: 'users',
  },
  {
    path: '/admin/app-settings',
    label: 'App Settings',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8 7 17M17 7l2.8-2.8"/></svg>',
    adminOnly: true,
    tab: 'app-settings',
  },
];

export const ADMIN_TAB_MAP: Record<string, string> = {
  'Overview': 'overview',
  'Users': 'users',
  'App Settings': 'app-settings',
};
/** Story feature pages, rendered for every signed-in role under their nav group. */
export const FEATURE_NAV_ITEMS: NavItem[] = [];
// <<codegen:nav-items:start>>
FEATURE_NAV_ITEMS.push(
  { path: '/vendor/profile', label: 'Vendor Profile', group: 'Vendor', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>' },
  { path: '/channels', label: 'Channels', group: 'Vendor', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  { path: '/invoices', label: 'Invoices', group: 'Vendor', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>' },
  { path: '/settings/notifications', label: 'Notification Settings', group: 'Vendor', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>' },
  { path: '/orders', label: 'Orders', group: 'Customer', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>' },
  { path: '/admin/customers', label: 'Customer Management', group: 'Admin', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>' },
  { path: '/admin/audit-log', label: 'Audit Log', group: 'Admin', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
);
// <<codegen:nav-items:end>>
