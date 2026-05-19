import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { loansApi, formatKES, formatDate } from '@/utils/api';
import { normalizeList } from '@/utils/normalize';
import { filterLoansByStatus } from '@/utils/loanUtils';
import { PageTitle } from '@/components/PageTitle';
import { Loader2, Plus, Calendar } from 'lucide-react';
import { LoanCard } from '@/components/LoanCard';

export default function BorrowerLoans() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLoans();
    const pollInterval = setInterval(loadLoans, 4000);
    return () => clearInterval(pollInterval);
  }, []);

  const loadLoans = async () => {
    try {
      const res = await loansApi.getMyLoans();
      const loansData = normalizeList<any>(res);
      setLoans(Array.isArray(loansData) ? loansData : []);
    } catch (error) {
      console.error('Failed to load loans:', error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = useMemo(() => filterLoansByStatus(loans, filter), [loans, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageTitle title="My Loans" />
        <Button size="sm" onClick={() => navigate('/apply')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Apply
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'active', 'completed', 'rejected'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize whitespace-nowrap text-xs sm:text-sm"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="p-6 md:p-8 text-center">
            <p className="text-sm md:text-base text-muted-foreground mb-4">No loans found</p>
            <Button onClick={() => navigate('/apply')} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Apply for a Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((loan) => (
            <div key={loan.id}>
              <LoanCard loan={loan} onClick={() => navigate(`/loans/${loan.id}`)} />
              {loan.status === 'pending' && (
                <div className="text-xs text-yellow-600 p-1.5 bg-yellow-50 rounded -mt-2 mb-3">
                  ⏳ Pending review · Expected decision by {formatDate(new Date(new Date(loan.created_at).getTime() + 3 * 24 * 60 * 60 * 1000))}
                </div>
              )}
              {loan.status === 'active' && (
                <div className="flex justify-center pt-2 pb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-32 text-xs"
                    onClick={() => navigate(`/loans/${loan.id}/repayment-schedule`)}
                  >
                    <Calendar className="h-3 w-3 mr-1" /> View Schedule
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
