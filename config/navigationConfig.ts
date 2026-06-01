import {
  Home,
  FileText,
  Users,
  Package,
  Settings,
  BarChart3,
  User,
  MessageSquare,
  CreditCard,
  DollarSign,
  History,
  Wallet,
  Receipt,
} from 'lucide-react';

export type UserRole = 'borrower' | 'admin';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: UserRole[];
  badge?: 'messages';
}

export const navigationItems: NavItem[] = [
  // Shared
  { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['borrower'] },
  { label: 'Dashboard', href: '/admin', icon: Home, roles: ['admin'] },

  // Borrower
  { label: 'My Loans', href: '/loans', icon: FileText, roles: ['borrower'] },
  { label: 'Apply for Loan', href: '/apply', icon: CreditCard, roles: ['borrower'] },
  { label: 'Payments', href: '/payments', icon: History, roles: ['borrower'] },
  { label: 'Profile', href: '/profile', icon: User, roles: ['borrower'] },
  { label: 'Messages', href: '/messages', icon: MessageSquare, roles: ['borrower'], badge: 'messages' },

  // Admin
  { label: 'Loan Applications', href: '/admin/loans', icon: FileText, roles: ['admin'] },
  { label: 'Create Loan', href: '/admin/loans/create', icon: CreditCard, roles: ['admin'] },
  { label: 'Categories', href: '/admin/categories', icon: Package, roles: ['admin'] },
  { label: 'Products', href: '/admin/products', icon: CreditCard, roles: ['admin'] },
  { label: 'Borrowers', href: '/admin/borrowers', icon: Users, roles: ['admin'] },
  { label: 'Repayments', href: '/admin/repayments', icon: DollarSign, roles: ['admin'] },
  { label: 'Disbursements', href: '/admin/disbursements', icon: Wallet, roles: ['admin'] },
  { label: 'Users', href: '/admin/users', icon: User, roles: ['admin'] },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin'] },
  { label: 'System Logs', href: '/admin/logs', icon: History, roles: ['admin'] },
  { label: 'Admin Messages', href: '/admin/messages', icon: MessageSquare, roles: ['admin'], badge: 'messages' },
  { label: 'Invoice Products', href: '/admin/invoice-products', icon: Package, roles: ['admin'] },
  { label: 'Quotations', href: '/admin/quotations', icon: FileText, roles: ['admin'] },
  { label: 'Invoices', href: '/admin/invoices', icon: Receipt, roles: ['admin'] },
  { label: 'Settings', href: '/admin/config', icon: Settings, roles: ['admin'] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navigationItems.filter(item => item.roles.includes(role));
}

export function getPortalTitle(role: UserRole): string {
  return role === 'admin' ? 'Admin Portal' : 'Borrower Portal';
}
