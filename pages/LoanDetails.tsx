import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { Loader2, ArrowLeft, Calendar, DollarSign, Clock, FileText, CreditCard, AlertCircle } from 'lucide-react';

export default function LoanDetails() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLoan();
  }, [loanId]);

  const loadLoan = async () => {
    if (!loanId) {
      setError('No loan ID provided');
      setLoading(false);
      return;
    }
    try {
      const res = await loansApi.getMyLoan(parseInt(loanId));
      const data = res.data?.data || res.data;
      if (!data) {
        setError('Loan not found');
      } else {
        setLoan(data);
      }
    } catch (error: any) {
      console.error('Failed to load loan:', error);
      setError(error.message || 'Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground mb-4">{error || 'Loan not found'}</p>
        <Button onClick={() => navigate('/loans')}>Back to Loans</Button>
      </div>
    );
  }

  const progress = loan.total_paid && loan.total_amount 
    ? Math.min((loan.total_paid / loan.total_amount) * 100, 100) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/loans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Loan #{loan.id}</h1>
      </div>

      {/* Status Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <Badge className={`${getStatusColor(loan.status)} mb-2`}>
            {getStatusLabel(loan.status)}
          </Badge>
          <p className="font-bold text-2xl">{formatKES(loan.principal_amount)}</p>
          <p className="text-sm text-muted-foreground">{loan.product_name || 'Loan'}</p>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Repayment Progress</span>
            <span className="text-sm">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span>Paid: {formatKES(loan.total_paid || 0)}</span>
            <span>Balance: {formatKES(loan.balance || 0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Loan Details */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Loan Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Applied</span>
            <span>{formatDate(loan.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Term</span>
            <span>{loan.term_months} months</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest Rate</span>
            <span>{loan.interest_rate || loan.product_rate || 0}% p.a.</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Repayable</span>
            <span className="font-medium">{formatKES(loan.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due Date</span>
            <span>{formatDate(loan.due_date)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Fees */}
      {(loan.processing_fee > 0 || loan.interest_amount > 0) && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Fees</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {loan.interest_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interest</span>
                <span>{formatKES(loan.interest_amount)}</span>
              </div>
            )}
            {loan.processing_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing Fee</span>
                <span>{formatKES(loan.processing_fee)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Repayments */}
      {loan.repayments?.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {loan.repayments.map((payment: any) => (
              <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{formatKES(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(payment.paid_at)}</p>
                </div>
                <Badge variant="outline">{payment.payment_method || 'Payment'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}