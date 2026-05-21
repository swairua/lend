import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, Menu, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { secureStorage } from '@/utils/secureStorage';
import { getNavItemsForRole, getPortalTitle, UserRole } from '@/config/navigationConfig';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  user: User | null;
  unreadMessages?: number;
}

export function AppLayout({ children, user, unreadMessages = 0 }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const role = (user?.role as UserRole) || 'borrower';
  const navItems = getNavItemsForRole(role);
  const portalTitle = getPortalTitle(role);

  const handleLogout = async () => {
    await secureStorage.clear();
    navigate('/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname === href || location.pathname.startsWith(href);
  };

  const navLink = (item: any) => (
    <Link
      key={item.href}
      to={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative',
        isActive(item.href)
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      )}
      onClick={() => setMobileMenuOpen(false)}
    >
      <item.icon className={cn('h-5 w-5 flex-shrink-0', !sidebarOpen && 'h-6 w-6')} />
      <span className={cn('text-sm', !sidebarOpen && 'hidden')}>
        {item.label}
      </span>
      {item.badge === 'messages' && unreadMessages > 0 && (
        <span className="ml-auto h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">
          {unreadMessages}
        </span>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-card transition-all duration-300 fixed left-0 top-0 h-full z-40',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 flex-1">
            <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-8 w-auto" />
            {sidebarOpen && <h1 className="font-bold text-lg">{portalTitle}</h1>}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(navLink)}
        </nav>

        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className={cn(
              'w-full text-red-500 hover:text-red-600 hover:bg-red-50',
              sidebarOpen ? 'justify-start' : 'justify-center'
            )}
            onClick={handleLogout}
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn('flex-1 transition-all duration-300', sidebarOpen && 'md:ml-64', !sidebarOpen && 'md:ml-20')}>
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 bg-background border-b">
          <div className="flex items-center justify-between p-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <div className="p-4 border-b flex items-center gap-2">
                  <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-8 w-auto" />
                  <h1 className="font-bold text-lg">{portalTitle}</h1>
                </div>
                <nav className="p-2 space-y-1">
                  {navItems.map(navLink)}
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
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
