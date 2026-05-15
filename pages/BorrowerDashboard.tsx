import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { loansApi, formatKES } from '@/utils/api';
import { normalizeList } from '@/utils/normalize';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { PageTitle } from '@/components/PageTitle';
import { StatCard } from '@/components/StatCard';
import { LoanSummaryCard } from '@/components/LoanSummaryCard';
import { Loader2, Plus, TrendingUp, User, AlertCircle } from 'lucide-react';

export default function BorrowerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthenticatedUser();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    if (user.role === 'admin') {
      navigate('/admin');
      return;
    }

    loadDashboard();
  }, [user, authLoading, navigate]);

  const loadDashboard = async () => {
    try {
      const [dashRes, loansRes] = await Promise.all([
        loansApi.getDashboard() as Promise<any>,
        loansApi.getMyLoans()
      ]);
      setDashboard(dashRes.data?.data ?? dashRes.data ?? dashRes);
      const loansList = normalizeList<any>(loansRes);
      setLoans(loansList as any[]);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const activeLoans = useMemo(() => loans.filter(l => l.status === 'active' || l.status === 'approved'), [loans]);
  const pendingLoans = useMemo(() => loans.filter(l => l.status === 'pending'), [loans]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
        <PageTitle title="Dashboard" subtitle={`Welcome back, ${user?.name}`} />

        {/* Quick Apply Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Need funds?</p>
                <p className="text-xl font-bold mt-1">Apply for a loan</p>
                <p className="text-blue-100 text-xs mt-1">Apply and track your loan status</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <StatCard label="Active Loans" value={dashboard?.active_loans || 0} variant="success" />
          <StatCard label="Pending" value={dashboard?.pending_loans || 0} variant="warning" />
          <StatCard label="Total Borrowed" value={formatKES(dashboard?.total_borrowed || 0)} />
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
                <LoanSummaryCard
                  key={loan.id}
                  loan={loan}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                />
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
    );
  }
