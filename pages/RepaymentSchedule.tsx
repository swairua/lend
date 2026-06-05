import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { generateRepaymentSchedule, daysOverdue } from '../utils/calculations';
import { adminApi } from '../utils/api';
import { useAlert } from '@/hooks/use-alert';
import { Loader2, ChevronLeft, AlertCircle, Smartphone } from 'lucide-react';

interface LoanDetail {
  id: number;
  product_name?: string;
  principal_amount: number;
  interest_amount: number;
  processing_fee: number;
  asset_transfer_fee: number;
  tracking_system_fee: number;
  total_amount: number;
  term_months: number;
  status: string;
  created_at: string;
  disbursed_at: string | null;
  balance?: number;
  borrower_phone?: string;
  repayments?: Array<{
    id: number;
    amount: number;
    principal_paid: number;
    interest_paid: number;
    penalty_paid: number;
    paid_at: string;
  }>;
}

export default function RepaymentSchedule() {
  const navigate = useNavigate();
  const { loanId } = useParams<{ loanId: string }>();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null);
  const [borrowerPhone, setBorrowerPhone] = useState<string>('');

  useEffect(() => {
    if (loanId) loadLoan();
  }, [loanId]);

  const loadLoan = async () => {
    try {
      const res = await loansApi.getMyLoan(parseInt(loanId!));
      setLoan(res.data);
      setBorrowerPhone(res.data.borrower_phone || '');

      if (res.data && res.data.disbursed_at) {
        const loanCalc = {
          principal: res.data.principal_amount,
          processingFee: res.data.processing_fee,
          logbookTransferFee: res.data.asset_transfer_fee,
          trackingSystemCost: res.data.tracking_system_fee,
          interest: res.data.interest_amount,
          latePenalty: 0,
          totalAmount: res.data.total_amount,
        };
        const disbursalDate = new Date(res.data.disbursed_at);
        const generatedSchedule = generateRepaymentSchedule(loanCalc, disbursalDate, res.data.term_months);
        
        if (res.data.repayments && res.data.repayments.length > 0) {
          generatedSchedule.forEach((payment, idx) => {
            const repayment = res.data.repayments?.find((r: any) => {
              const paymentDue = new Date(payment.dueDate);
              const repaidDate = new Date(r.paid_at);
              return Math.abs(paymentDue.getTime() - repaidDate.getTime()) < 24 * 60 * 60 * 1000;
            });
            if (repayment) {
              generatedSchedule[idx].isPaid = true;
              generatedSchedule[idx].paidDate = new Date(repayment.paid_at);
            }
          });
        }
        setSchedule(generatedSchedule);
      }
    } catch (error) {
      console.error('Failed to load loan:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !loan) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPaid = loan?.repayments?.reduce((sum, r) => sum + r.amount, 0) || 0;
  const upcomingPayments = schedule.filter(p => !p.isPaid && new Date() <= new Date(p.dueDate));
  const overduePayments = schedule.filter(p => !p.isPaid && new Date() > new Date(p.dueDate));

  const initiateSTKPush = async (payment: any) => {
    if (!borrowerPhone || borrowerPhone.trim().length === 0) {
      showAlert({ type: 'error', message: 'Phone number not found. Please update your profile.' });
      return;
    }

    setPaymentLoading(payment.dueDate);
    try {
      const response = await adminApi.mpesaInitiatePayment(
        parseInt(loanId!),
        borrowerPhone.trim(),
        payment.amount
      );

      if (response.success) {
        showAlert({
          type: 'success',
          message: `STK prompt sent to ${borrowerPhone}. Check your phone for the M-Pesa popup.`,
        });
      } else {
        showAlert({ type: 'error', message: response.error || 'Failed to send payment prompt' });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      showAlert({ type: 'error', message: error.message || 'Payment initiation failed' });
    } finally {
      setPaymentLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold truncate">Repayment Schedule</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">{loan.product_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Principal</p>
              <p className="text-base md:text-lg font-bold">{formatKES(loan.principal_amount)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Interest</p>
              <p className="text-base md:text-lg font-bold">{formatKES(loan.interest_amount)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
              <p className="text-base md:text-lg font-bold">{formatKES(loan.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Term</p>
              <p className="text-base md:text-lg font-bold">{loan.term_months} months</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Paid</p>
              <p className="text-base md:text-lg font-bold text-green-600">{formatKES(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Balance</p>
              <p className="text-base md:text-lg font-bold">{formatKES(loan.balance || 0)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Status</p>
              <Badge className={getStatusColor(loan.status)}>{getStatusLabel(loan.status)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {overduePayments.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-red-900">
                {overduePayments.length} payment{overduePayments.length > 1 ? 's' : ''} overdue
              </p>
              <p className="text-xs text-red-700">
                Please contact admin to arrange payment
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingPayments.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="font-medium text-sm text-blue-900">
              Next payment: {formatKES(upcomingPayments[0].amount)} due {formatDate(upcomingPayments[0].dueDate)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <ResponsiveTable>
              <caption className="sr-only">Loan repayment schedule showing payment dates, principal amounts, interest charges, and payment status</caption>
              <ResponsiveTableHeader className="bg-muted/50">
                <tr>
                  <ResponsiveTableHead className="text-left">Due Date</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Principal</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Interest</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Payment</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Balance</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-center">Status</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-center">Action</ResponsiveTableHead>
                </tr>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {schedule.map((payment, idx) => (
                  <ResponsiveTableRow key={idx}>
                    <ResponsiveTableCell label="Due Date" className="text-xs md:text-sm">
                      {formatDate(payment.dueDate)}
                      {!payment.isPaid && new Date() > new Date(payment.dueDate) && (
                        <div className="text-red-600 text-xs font-medium">
                          {daysOverdue(new Date(payment.dueDate))} days late
                        </div>
                      )}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Principal" className="text-xs md:text-sm text-right">
                      {formatKES(payment.principal)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Interest" className="text-xs md:text-sm text-right">
                      {formatKES(payment.interest)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Payment" className="text-xs md:text-sm text-right font-medium">
                      {formatKES(payment.amount)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Balance" className="text-xs md:text-sm text-right">
                      {formatKES(payment.balance)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Status" className="text-center">
                      <Badge variant={payment.isPaid ? 'default' : 'outline'} className="text-xs">
                        {payment.isPaid ? '✓ Paid' : 'Pending'}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell label="Action" className="text-center">
                      {!payment.isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => initiateSTKPush(payment)}
                          disabled={paymentLoading === payment.dueDate || !borrowerPhone?.trim() || loan.status !== 'active'}
                          title={!borrowerPhone?.trim() ? 'Add your phone number in profile to pay' : loan.status !== 'active' ? `Loan is ${loan.status} - payments not allowed` : ''}
                          className="text-xs"
                        >
                          {paymentLoading === payment.dueDate ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : !borrowerPhone?.trim() ? (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Add Phone
                            </>
                          ) : loan.status !== 'active' ? (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {loan.status === 'completed' ? 'Paid' : 'Not Active'}
                            </>
                          ) : (
                            <>
                              <Smartphone className="h-3 w-3 mr-1" />
                              Pay
                            </>
                          )}
                        </Button>
                      )}
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
