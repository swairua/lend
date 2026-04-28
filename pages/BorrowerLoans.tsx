import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { Loader2, Plus, FileText, CreditCard } from 'lucide-react';

interface Loan {
  id: number;
  principal_amount: number;
  total_amount: number;
  status: string;
  product_name: string;
  category_name: string;
  term_months: number;
  created_at: string;
  due_date: string;
  total_paid: number;
  balance: number;
}

export default function BorrowerLoans() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const res = await loansApi.getMyLoans();
      setLoans(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to load loans:', error);
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Loans</h1>
        <Button size="sm" onClick={() => navigate('/apply')}>
          <Plus className="h-4 w-4 mr-1" /> Apply
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {['all', 'pending', 'active', 'completed', 'rejected'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize whitespace-nowrap"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No loans found</p>
            <Button onClick={() => navigate('/apply')}>
              <Plus className="h-4 w-4 mr-2" /> Apply for a Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((loan) => (
            <Card key={loan.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/loans/${loan.id}`)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-lg">{formatKES(loan.principal_amount)}</p>
                    <p className="text-sm text-muted-foreground">{loan.product_name || 'Loan'}</p>
                  </div>
                  <Badge className={getStatusColor(loan.status)}>
                    {getStatusLabel(loan.status)}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{loan.term_months} months</span>
                  <span>{formatDate(loan.created_at)}</span>
                </div>
                {loan.status === 'active' && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
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