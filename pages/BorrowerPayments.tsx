import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { PageTitle } from '@/components/PageTitle';
import { Loader2, Download } from 'lucide-react';
import { loansApi, formatKES, formatDate } from '../types/api';
import { generateReceiptHTML } from '../utils/pdfTemplates';
import { toast } from 'sonner';

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
      const response = await loansApi.getMyLoans();
      const loans = response.data?.data?.loans || response.data?.loans || [];

      // Extract all repayments from all loans
      const allRepayments: RepaymentWithLoan[] = [];

      for (const loan of loans) {
        const loanDetails = await loansApi.getMyLoan(loan.id);
        const loanData = loanDetails.data?.data || loanDetails.data;
        const loanRepayments = loanData?.repayments || [];

        // Add loan_name to each repayment
        const enrichedRepayments = loanRepayments.map((rep: any) => ({
          ...rep,
          loan_name: loanData?.product_name || `Loan #${loan.id}`,
        }));

        allRepayments.push(...enrichedRepayments);
      }

      // Sort by payment date (newest first)
      allRepayments.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
      setRepayments(allRepayments);
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
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.createElement('div');
      element.innerHTML = generateReceiptHTML({
        repayment: { ...repayment, loan_id: repayment.loan_id },
        loan: { id: repayment.loan_id } as any,
        borrowerName: '',
        borrowerEmail: '',
      });
      const opt = { margin: 0.5, filename: `Receipt_${repayment.loan_id}_${repayment.id}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { orientation: 'portrait', unit: 'in', format: 'a4' } };
      await html2pdf().set(opt).from(element).save();
      toast.success('Receipt downloaded successfully');
    } catch (err: any) {
      console.error('Failed to download receipt:', err);
      toast.error('Failed to download receipt');
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
        <PageTitle title="Payment History" onBackClick={() => navigate('/loans')} />
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
      <PageTitle title="Payment History" onBackClick={() => navigate('/loans')} />

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
              <caption className="sr-only">Payment history showing all loan repayments with dates, amounts, and payment methods</caption>
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
                        aria-label="Download receipt"
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
