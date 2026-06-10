import { useEffect, useState, useMemo, useCallback } from 'react';
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
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    try {
      const res = await loansApi.getMyLoans({ limit: 500 });
      const loansList = normalizeList<any>(res);
      setLoans(Array.isArray(loansList) ? loansList : []);
    } catch (error) {
      console.error('Failed to load loans:', error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    if (user.role === 'admin') {
      navigate('/admin');
      return;
    }

    loadLoans();
    const interval = setInterval(loadLoans, 4000);
    return () => clearInterval(interval);
  }, [user, authLoading, navigate, loadLoans]);

  const stats = useMemo(() => {
    const active = loans.filter(l => l.status === 'active' || l.status === 'approved');
    const pending = loans.filter(l => l.status === 'pending');
    const disbursed = loans.filter(l => l.status === 'active' || l.status === 'completed');
    const totalDisbursed = disbursed.reduce((sum, l) => sum + Number(l.total_amount || 0), 0);
    const totalRepaid = loans.reduce((sum, l) => sum + Number(l.total_paid || 0), 0);
    return {
      active_loans: active.length,
      pending_loans: pending.length,
      total_loans: loans.length,
      total_disbursed: totalDisbursed,
      total_repaid: totalRepaid,
      balance_due: totalDisbursed - totalRepaid,
    };
  }, [loans]);

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

        <Card className="bg-gradient-to-r from-primary to-primary/90 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Need funds?</p>
                <p className="text-xl font-bold mt-1">Apply for a loan</p>
                <p className="text-white/80 text-xs mt-1">Apply and track your loan status</p>
              </div>
              <Button asChild size="sm" className="bg-white text-primary hover:bg-primary/10">
                <Link to="/apply">
                  <Plus className="h-4 w-4 mr-1" /> Apply
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <StatCard label="Active Loans" value={stats.active_loans} variant="success" />
          <StatCard label="Pending" value={stats.pending_loans} variant="warning" />
          <StatCard label="Total Borrowed" value={formatKES(stats.total_disbursed)} />
        </div>

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

        {pendingLoans.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-sm">Pending Applications</h2>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm">{pendingLoans.length} application(s) awaiting review</p>
                    <p className="text-xs text-muted-foreground">We'll notify you once processed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
      </div>
    );
  }
