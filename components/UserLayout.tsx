import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChevronLeft, Home, FileText, Users, Package, Settings, BarChart3, User, LogOut, Menu, MessageSquare, CreditCard, DollarSign, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface UserLayoutProps {
  children: React.ReactNode;
  user: User | null;
}

const userMenuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'My Loans', href: '/loans', icon: FileText },
  { label: 'Apply', href: '/apply', icon: CreditCard },
  { label: 'Payments', href: '/payments', icon: History },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Profile', href: '/profile', icon: User },
];

const adminMenuItems = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  { label: 'Loans', href: '/admin/loans', icon: FileText },
  { label: 'Categories', href: '/admin/categories', icon: Package },
  { label: 'Products', href: '/admin/products', icon: CreditCard },
  { label: 'Borrowers', href: '/admin/borrowers', icon: Users },
  { label: 'Repayments', href: '/admin/repayments', icon: DollarSign },
  { label: 'Users', href: '/admin/users', icon: User },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', href: '/admin/config', icon: Settings },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
];

export default function UserLayout({ children, user }: UserLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isAdmin = user?.role === 'admin';
  const menuItems = isAdmin ? adminMenuItems : userMenuItems;
  const portalTitle = isAdmin ? 'Admin Portal' : 'Borrower Portal';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (href: string) => location.pathname === href || (href !== '/admin' && href !== '/dashboard' && location.pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col border-r bg-card w-64 fixed left-0 top-0 h-full z-40">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg">{portalTitle}</h1>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive(item.href) 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 bg-background border-b">
          <div className="flex items-center justify-between p-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <div className="p-4 border-b">
                  <h1 className="font-bold text-lg">{portalTitle}</h1>
                </div>
                <nav className="p-2 space-y-1">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                        isActive(item.href) 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 mt-4"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            <h1 className="font-bold">{portalTitle}</h1>
            <div className="w-8" />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
