import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InvoiceReceipt from "../components/InvoiceReceipt";
import { loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { Loader2, ArrowLeft, Calendar, DollarSign, Clock, FileText, CreditCard, AlertCircle, Printer, Receipt, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

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
        <h1 className="text-base md:text-xl font-bold">Loan #{loan.id}</h1>
      </div>


      {/* Late Payment Alert */}
      {(() => { const { isLate, daysOverdue, lateFee } = calcLatePayment(loan); return isLate ? (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Payment Overdue by {daysOverdue} day{daysOverdue>1?"s":""}</p>
            <p className="text-xs text-red-600">A 2% late fee of {formatKES(lateFee)} applies on your outstanding balance. Please pay immediately to avoid further penalties.</p>
          </div>
        </div>
      ) : null; })()}

      {/* Invoice / Receipt Buttons */}
      <div className="flex gap-2">
        <button onClick={()=>setShowInvoice(true)} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium">
          <FileText className="h-4 w-4" /> Invoice
        </button>
        {loan.repayments?.length > 0 && (
          <button onClick={()=>{setSelectedRepayment(loan.repayments[loan.repayments.length-1]);setShowReceipt(true);}} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium">
            <Receipt className="h-4 w-4" /> Receipt
          </button>
        )}
      </div>
      {/* Status Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-3 md:p-4">
          <Badge className={`${getStatusColor(loan.status)} mb-2 text-xs`}>
            {getStatusLabel(loan.status)}
          </Badge>
          <p className="font-bold text-xl md:text-2xl">{formatKES(loan.principal_amount)}</p>
          <p className="text-xs md:text-sm text-muted-foreground">{loan.product_name || 'Loan'}</p>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex justify-between mb-2 gap-2">
            <span className="text-xs md:text-sm font-medium">Repayment Progress</span>
            <span className="text-xs md:text-sm flex-shrink-0">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs md:text-sm gap-2">
            <span>Paid: {formatKES(loan.total_paid || 0)}</span>
            <span className="hidden sm:inline">Balance: {formatKES(loan.balance || 0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Loan Details */}
      <Card>
        <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
          <CardTitle className="text-xs md:text-sm">Loan Information</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0 space-y-2 md:space-y-3">
          <div className="flex justify-between gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground">Applied</span>
            <span className="text-right">{formatDate(loan.created_at)}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground">Term</span>
            <span>{loan.term_months} months</span>
          </div>
          <div className="flex justify-between gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground">Interest Rate</span>
            <span>{loan.interest_rate || loan.product_rate || 0}% p.a.</span>
          </div>
          <div className="flex justify-between gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground">Total Repayable</span>
            <span className="font-medium">{formatKES(loan.total_amount)}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground">Due Date</span>
            <span className="text-right">{formatDate(loan.due_date)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Fees */}
      {(loan.processing_fee > 0 || loan.interest_amount > 0) && (
        <Card>
          <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm">Fees</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 space-y-2">
            {loan.interest_amount > 0 && (
              <div className="flex justify-between gap-2 text-xs md:text-sm">
                <span className="text-muted-foreground">Interest</span>
                <span>{formatKES(loan.interest_amount)}</span>
              </div>
            )}
            {loan.processing_fee > 0 && (
              <div className="flex justify-between gap-2 text-xs md:text-sm">
                <span className="text-muted-foreground">Processing Fee</span>
                <span>{formatKES(loan.processing_fee)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Repayment Schedule */}
      {loan.status === "active" && loan.term_months && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Repayment Schedule</h2>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 text-xs font-semibold bg-muted p-2 gap-2">
              <span>#</span><span>Due Date</span><span className="text-right">Amount</span><span className="text-center">Status</span>
            </div>
            {generateSchedule(loan).map((s) => (
              <div key={s.no} className={("grid grid-cols-4 gap-2 px-2 py-2 border-t text-xs ")+(s.isPaid?"bg-green-50":s.isLate?"bg-red-50":"")}>
                <span className="font-medium">{s.no}</span>
                <span>{s.due.toLocaleDateString("en-KE",{month:"short",day:"numeric",year:"numeric"})}</span>
                <span className="text-right">{formatKES(s.amount)}{s.isLate&&<span className="text-red-500 block">+{formatKES(s.lateFee)} fee</span>}</span>
                <span className="text-center">{s.isPaid?<CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />:s.isLate?<XCircle className="h-4 w-4 text-red-500 mx-auto" />:<Clock className="h-4 w-4 text-gray-400 mx-auto" />}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceReceipt open={showInvoice} onClose={()=>setShowInvoice(false)} type="invoice" loan={loan} userName={user?.name} />
      <InvoiceReceipt open={showReceipt} onClose={()=>setShowReceipt(false)} type="receipt" loan={loan} repayment={selectedRepayment} userName={user?.name} />
      {/* Repayments */}
      {loan.repayments?.length > 0 && (
        <Card>
          <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 space-y-2">
            {loan.repayments.map((payment: any) => (
              <div key={payment.id} className="flex justify-between items-start md:items-center py-2 border-b last:border-0 gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium">{formatKES(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(payment.paid_at)}</p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">{payment.payment_method || 'Payment'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
