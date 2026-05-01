import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChevronLeft, Home, FileText, Users, Package, Settings, BarChart3, User, LogOut, Menu, X, MessageSquare, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  user: User | null;
}

const menuItems = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  { label: 'Loans', href: '/admin/loans', icon: FileText },
  { label: 'Categories', href: '/admin/categories', icon: Package },
  { label: 'Products', href: '/admin/products', icon: CreditCard },
  { label: 'Borrowers', href: '/admin/borrowers', icon: Users },
  { label: 'Users', href: '/admin/users', icon: User },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Settings', href: '/admin/config', icon: Settings },
];

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (href: string) => location.pathname === href || (href !== '/admin' && location.pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-300 fixed left-0 top-0 h-full z-40",
        sidebarOpen ? "w-64" : "w-16"
      )}>
  <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <>
              <h1 className="font-bold text-lg mr-2">Admin</h1>
              {typeof user?.name === 'string' && (
                <span className="text-sm text-muted-foreground align-middle">{user.name}</span>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
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
                  : "hover:bg-muted",
                !sidebarOpen && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50", !sidebarOpen && "justify-center")}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            {sidebarOpen && "Logout"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        "md:ml-64"
      )}>
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
                <div className="p-4 border-b flex items-center justify-between">
                  <h1 className="font-bold text-lg">Admin Menu</h1>
                  <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
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
            <h1 className="font-bold">Admin Panel</h1>
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
