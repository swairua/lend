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
  Shield,
  BookOpen,
} from 'lucide-react';

export type UserRole = 'borrower' | 'admin' | 'releaser' | 'manager' | 'agent';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: UserRole[];
  badge?: 'messages';
}

export const navigationItems: NavItem[] = [
  // Shared - Borrower
  { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['borrower'] },
  { label: 'My Loans', href: '/loans', icon: FileText, roles: ['borrower'] },
  { label: 'Apply for Loan', href: '/apply', icon: CreditCard, roles: ['borrower'] },
  { label: 'Payments', href: '/payments', icon: History, roles: ['borrower'] },
  { label: 'Profile', href: '/profile', icon: User, roles: ['borrower'] },
  { label: 'Messages', href: '/messages', icon: MessageSquare, roles: ['borrower'], badge: 'messages' },

  // Admin Dashboards
  { label: 'Dashboard', href: '/admin', icon: Home, roles: ['admin', 'releaser', 'manager', 'agent'] },

  // Admin - Loans & Core
  { label: 'Loan Applications', href: '/admin/loans', icon: FileText, roles: ['admin', 'releaser', 'manager', 'agent'] },
  { label: 'Create Loan', href: '/admin/loans/create', icon: CreditCard, roles: ['admin', 'manager'] },
  { label: 'Categories', href: '/admin/categories', icon: Package, roles: ['admin', 'manager'] },
  { label: 'Products', href: '/admin/products', icon: CreditCard, roles: ['admin', 'manager'] },
  { label: 'Borrowers', href: '/admin/borrowers', icon: Users, roles: ['admin', 'manager', 'agent'] },

  // Admin - Financial
  { label: 'Repayments', href: '/admin/repayments', icon: DollarSign, roles: ['admin', 'manager'] },
  { label: 'Disbursements', href: '/admin/disbursements', icon: Wallet, roles: ['admin', 'releaser'] },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin', 'manager'] },

  // Admin - Management
  { label: 'Users', href: '/admin/users', icon: User, roles: ['admin'] },
  { label: 'Roles', href: '/admin/roles', icon: Shield, roles: ['admin'] },
  { label: 'System Logs', href: '/admin/logs', icon: History, roles: ['admin', 'manager'] },
  { label: 'Admin Messages', href: '/admin/messages', icon: MessageSquare, roles: ['admin', 'manager'], badge: 'messages' },

  // Admin - Settings
  { label: 'Settings', href: '/admin/config', icon: Settings, roles: ['admin'] },

  // Admin - Documentation
  { label: 'Documentation', href: '/admin/documentation', icon: BookOpen, roles: ['admin', 'releaser', 'manager', 'agent'] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navigationItems.filter(item => item.roles.includes(role));
}

export function getPortalTitle(role: UserRole): string {
  switch (role) {
    case 'admin': return 'Admin Portal';
    case 'releaser': return 'Releaser Portal';
    case 'manager': return 'Manager Portal';
    case 'agent': return 'Agent Portal';
    default: return 'Borrower Portal';
  }
}
