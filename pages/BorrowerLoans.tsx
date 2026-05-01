import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { normalizeList } from '../utils/normalize';
import { Loader2, Plus, FileText, CreditCard } from 'lucide-react';

// Loan type stabilized via API; kept loose for now

export default function BorrowerLoans() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLoans();
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

  const filteredLoans = loans.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'active') return l.status === 'active' || l.status === 'approved';
    return l.status === filter;
  });

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
        <h1 className="text-lg md:text-xl font-bold">My Loans</h1>
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
            <Card key={loan.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/loans/${loan.id}`)}>
              <CardContent className="p-3 md:p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-base md:text-lg">{formatKES(loan.principal_amount)}</p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{loan.product_name || 'Loan'}</p>
                  </div>
                  <Badge className={`${getStatusColor(loan.status)} text-xs flex-shrink-0`}>
                    {getStatusLabel(loan.status)}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
                  <span>{loan.term_months} months</span>
                  <span className="hidden sm:inline">{formatDate(loan.created_at)}</span>
                </div>
                {loan.status === 'active' && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span>Balance</span>
                      <span className="font-medium text-orange-600">{formatKES(loan.balance || 0)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
