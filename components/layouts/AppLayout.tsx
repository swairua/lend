import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, Menu, ChevronLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { secureStorage } from '@/utils/secureStorage';
import { publicApi, adminApi, messagesApi, getFileUrl } from '@/utils/api';
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

export function AppLayout({ children, user, unreadMessages }: AppLayoutProps) {
  const [fetchedUnread, setFetchedUnread] = useState(0);
  const effectiveUnread = unreadMessages ?? fetchedUnread;
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const role = (user?.role as UserRole) || 'borrower';
  const navItems = getNavItemsForRole(role);
  const portalTitle = getPortalTitle(role);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await publicApi.getSettings();
        if (res.success && res.data) {
          const arr = Array.isArray(res.data) ? res.data :
            res.data.data ? res.data.data :
            Object.entries(res.data).map(([k, v]) => ({ key_name: k, key_value: v }));
          const settings = Object.fromEntries(arr.map((item: any) => [item.key_name, item.key_value]));
          if (settings.company_logo) setLogoUrl(getFileUrl(settings.company_logo));
        }
      } catch {}
    };
    loadSettings();
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const res: any = await messagesApi.getUnreadCount();
      const count = res?.data?.unread ?? res?.data?.count ?? res?.unread ?? 0;
      setFetchedUnread(count);
    } catch {}
  };

  const handleLogout = async () => {
    await secureStorage.clear();
    navigate('/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') {
      return location.pathname === href;
    }
    if (location.pathname === href) {
      return true;
    }
    if (href.endsWith('/')) {
      return location.pathname.startsWith(href);
    }
    return false;
  };

  const isChildActive = (children: any[]) => children.some((c: any) => isActive(c.href));

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const navLink = (item: any) => {
    if (item.children) {
      const expanded = expandedGroups[item.label] === true;
      const active = isChildActive(item.children);
      return (
        <div key={item.label} className="space-y-1">
          <button
            onClick={() => toggleGroup(item.label)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <item.icon className={cn('h-5 w-5 flex-shrink-0', !sidebarOpen && 'h-6 w-6')} />
            <span className={cn('text-sm flex-1', !sidebarOpen && 'hidden')}>
              {item.label}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180', !sidebarOpen && 'hidden')} />
          </button>
          {expanded && (
            <div className={cn('space-y-1', sidebarOpen ? 'ml-4' : 'ml-0')}>
              {item.children.map((child: any) => (
                <Link
                  key={child.href}
                  to={child.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors',
                    isActive(child.href)
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <child.icon className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('text-xs', !sidebarOpen && 'hidden')}>
                    {child.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
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
        {item.badge === 'messages' && effectiveUnread > 0 && (
            <span className="ml-auto h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">
              {effectiveUnread}
            </span>
          )}
      </Link>
    );
  };

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
            <img src={logoUrl || '/icons/icon-192.png'} alt="JECRI BUREAU" className="h-8 w-auto" />
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
                <Button variant="ghost" aria-label="Open menu" className="min-h-[44px] min-w-[44px]">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <div className="p-4 border-b flex items-center gap-2">
                  <img src={logoUrl || '/icons/icon-192.png'} alt="JECRI BUREAU" className="h-8 w-auto" />
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
        <div className="p-4 pt-14 md:pt-4">{children}</div>
      </main>
    </div>
  );
}
