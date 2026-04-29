import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { Loader2, Plus, FileText, CreditCard, TrendingUp, User, LogOut, Home, FileCheck, AlertCircle } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function BorrowerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }
    
    if (storedUser.role === 'admin') {
      navigate('/admin');
      return;
    }
    
    setUser(storedUser);
    loadDashboard();
  }, [navigate]);

  const loadDashboard = async () => {
    try {
      const [dashRes, loansRes] = await Promise.all([
        loansApi.getDashboard(),
        loansApi.getMyLoans()
      ]);
      setDashboard(dashRes.data?.data || dashRes.data);
      const loansData = loansRes.data?.data || loansRes.data || [];
      setLoans(Array.isArray(loansData) ? loansData : []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'approved');
  const pendingLoans = loans.filter(l => l.status === 'pending');
  const completedLoans = loans.filter(l => l.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-3 py-3">
          <div>
            <h1 className="text-lg font-bold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </header>

      <div className="p-3 pb-24 space-y-4 max-w-md mx-auto">
        {/* Quick Apply Card */}
        <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Need funds?</p>
                <p className="text-xl font-bold mt-1">Apply for a loan</p>
                <p className="text-green-100 text-xs mt-1">Quick approval in minutes</p>
              </div>
              <Button asChild size="sm" className="bg-white text-green-700 hover:bg-green-50">
                <Link to="/apply">
                  <Plus className="h-4 w-4 mr-1" /> Apply
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-green-600">{dashboard?.active_loans || 0}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-yellow-600">{dashboard?.pending_loans || 0}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{formatKES(dashboard?.total_borrowed || 0)}</p>
              <p className="text-[10px] text-muted-foreground">Borrowed</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Loans */}
        {activeLoans.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Active Loans</h2>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to="/loans">View All</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {activeLoans.slice(0, 3).map((loan) => (
                <Card key={loan.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/loans/${loan.id}`)}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{loan.product_name}</p>
                        <p className="text-xs text-muted-foreground">{loan.category_name || 'Loan'}</p>
                      </div>
                      <Badge className={`text-[10px] ${getStatusColor(loan.status)}`}>
                        {getStatusLabel(loan.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-sm">{formatKES(loan.principal_amount)}</span>
                      <span className="text-xs text-muted-foreground">Due: {formatDate(loan.due_date)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pending Applications */}
        {pendingLoans.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-sm">Pending Applications</h2>
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{pendingLoans.length} application(s) awaiting review</p>
                    <p className="text-xs text-muted-foreground">We'll notify you once processed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-16 flex-col gap-1" asChild>
              <Link to="/apply">
                <Plus className="h-4 w-4" />
                <span className="text-xs">New Loan</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1" asChild>
              <Link to="/profile">
                <User className="h-4 w-4" />
                <span className="text-xs">Profile</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Credit Score */}
        {dashboard?.credit_score > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Your Credit Score</p>
                  <p className="text-2xl font-bold text-green-600">{dashboard.credit_score}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex justify-around py-2 px-2 max-w-md mx-auto">
          <Button variant="ghost" size="sm" className="flex-col h-12 gap-0.5 text-primary">
            <Home className="h-4 w-4" />
            <span className="text-[10px]">Home</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-12 gap-0.5 text-muted-foreground" asChild>
            <Link to="/loans">
              <FileText className="h-4 w-4" />
              <span className="text-[10px]">Loans</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-12 gap-0.5 text-muted-foreground" asChild>
            <Link to="/apply">
              <Plus className="h-4 w-4" />
              <span className="text-[10px]">Apply</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-12 gap-0.5 text-muted-foreground" asChild>
            <Link to="/profile">
              <User className="h-4 w-4" />
              <span className="text-[10px]">Profile</span>
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  );
}
