import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import { repaymentsApi, loansApi, formatKES, formatDate, pdfApi } from '../types/api';
import { useToast } from '@/hooks/use-toast';

interface RepaymentWithLoan {
  id: number;
  loan_id: number;
  amount: number;
  principal_paid: number;
  interest_paid: number;
  penalty_paid: number;
  payment_method: string;
  reference_number: string | null;
  paid_at: string;
  loan_name?: string;
}

export default function BorrowerPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [repayments, setRepayments] = useState<RepaymentWithLoan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await repaymentsApi.getMyRepayments();
      const data = response.data?.data || response.data || [];
      
      if (!Array.isArray(data)) {
        setRepayments([]);
        return;
      }

      // Fetch loan details to enrich repayments with loan names
      const enrichedRepayments = await Promise.all(
        data.map(async (rep: any) => {
          try {
            const loanRes = await loansApi.getMyLoan(rep.loan_id);
            const loanData = loanRes.data?.data || loanRes.data;
            return {
              ...rep,
              loan_name: loanData?.product_name || `Loan #${rep.loan_id}`,
            };
          } catch {
            return {
              ...rep,
              loan_name: `Loan #${rep.loan_id}`,
            };
          }
        })
      );

      setRepayments(enrichedRepayments as RepaymentWithLoan[]);
    } catch (err: any) {
      console.error('Failed to load repayments:', err);
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (repayment: RepaymentWithLoan) => {
    try {
      setDownloadingReceiptId(repayment.id);
      const res = await pdfApi.generateReceipt(repayment.loan_id, repayment.id);
      if (res.success && res.data?.pdfUrl) {
        const link = document.createElement('a');
        link.href = res.data.pdfUrl;
        link.download = res.data.fileName || `Receipt_${repayment.loan_id}_${repayment.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Success', description: 'Receipt downloaded successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to generate receipt', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Failed to download receipt:', err);
      toast({ title: 'Error', description: 'Failed to download receipt', variant: 'destructive' });
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  if (repayments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/loans')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold">Payment History</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No payment history yet</p>
            <Button onClick={() => navigate('/loans')}>View My Loans</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/loans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold">Payment History</h1>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Payments</p>
              <p className="text-lg md:text-2xl font-bold">{repayments.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Amount Paid</p>
              <p className="text-lg md:text-2xl font-bold">
                {formatKES(repayments.reduce((sum, r) => sum + r.amount, 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader className="p-3 md:p-4 pb-2">
          <CardTitle className="text-xs md:text-sm">All Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <div className="overflow-x-auto">
            <ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableHead className="hidden md:table-cell">Loan</ResponsiveTableHead>
                <ResponsiveTableHead>Date</ResponsiveTableHead>
                <ResponsiveTableHead className="text-right">Amount</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden md:table-cell">Principal</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden lg:table-cell">Interest</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden lg:table-cell">Penalty</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden sm:table-cell">Method</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Receipt</ResponsiveTableHead>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {repayments.map((repayment) => (
                  <ResponsiveTableRow key={repayment.id}>
                    <ResponsiveTableCell className="hidden md:table-cell font-medium text-sm">
                      {repayment.loan_name}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Date" className="font-medium text-sm">
                      {formatDate(repayment.paid_at)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Amount" className="text-right font-bold text-primary">
                      {formatKES(repayment.amount)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Principal" className="hidden md:table-cell text-sm">
                      {formatKES(repayment.principal_paid)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Interest" className="hidden lg:table-cell text-sm">
                      {formatKES(repayment.interest_paid)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Penalty" className="hidden lg:table-cell text-sm">
                      {formatKES(repayment.penalty_paid)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Method" className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">
                        {repayment.payment_method || 'payment'}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Receipt" className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(repayment)}
                        disabled={downloadingReceiptId === repayment.id}
                      >
                        {downloadingReceiptId === repayment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
