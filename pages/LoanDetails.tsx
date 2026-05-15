import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InvoiceReceipt from "../components/InvoiceReceipt";
import LoanStatusTimeline from "../components/LoanStatusTimeline";
import { loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from "../types/api";
import { downloadLoanAgreementPDF } from "../utils/loanPdfGenerator";
import { calculateAPR } from "../utils/aprCalculator";
import { Loader2, ArrowLeft, Calendar, FileText, Receipt, AlertTriangle, CheckCircle2, XCircle, Clock, Download } from "lucide-react";

const GRACE_DAYS = 7;
const LATE_FEE_RATE = 0.02;

function calcLatePayment(loan: any) {
  if (!loan || loan.status !== "active" || !loan.due_date) return { isLate: false, daysOverdue: 0, lateFee: 0 };
  const grace = new Date(loan.due_date);
  grace.setDate(grace.getDate() + GRACE_DAYS);
  const daysOverdue = Math.floor((Date.now() - grace.getTime()) / 86400000);
  const isLate = daysOverdue > 0;
  return { isLate, daysOverdue, lateFee: isLate ? (loan.balance || 0) * LATE_FEE_RATE : 0 };
}

function generateSchedule(loan: any) {
  if (!loan || !loan.term_months) return [];
  const start = new Date(loan.disbursed_at || loan.approved_at || loan.created_at);
  const monthly = loan.total_amount / loan.term_months;
  const paid = loan.total_paid || 0;
  const schedule = [];
  for (let i = 1; i <= loan.term_months; i++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i);
    const cumulative = monthly * i;
    const isPaid = paid >= cumulative;
    const grace = new Date(due);
    grace.setDate(grace.getDate() + GRACE_DAYS);
    const isLate = !isPaid && Date.now() > grace.getTime();
    schedule.push({ no: i, due, amount: monthly, isPaid, isLate, lateFee: isLate ? (loan.balance || 0) * LATE_FEE_RATE : 0 });
  }
  return schedule;
}

function getTimelineSteps(loan: any) {
  const steps = [
    {
      label: 'Applied',
      status: 'completed' as const,
      date: formatDate(loan.created_at),
    },
    {
      label: 'Under Review',
      status: loan.status === 'pending' ? 'current' : loan.status === 'rejected' ? 'rejected' : 'completed' as const,
      date: loan.status === 'pending' ? undefined : formatDate(loan.approved_at || loan.created_at),
    },
    {
      label: 'Approved',
      status: ['approved', 'active', 'completed'].includes(loan.status) ? 'completed' : loan.status === 'rejected' ? 'rejected' : 'pending' as const,
      date: loan.approved_at ? formatDate(loan.approved_at) : undefined,
    },
    {
      label: 'Disbursed',
      status: ['active', 'completed'].includes(loan.status) ? 'completed' : 'pending' as const,
      date: loan.disbursed_at ? formatDate(loan.disbursed_at) : undefined,
    },
    {
      label: 'Repayment',
      status: loan.status === 'active' ? 'current' : loan.status === 'completed' ? 'completed' : 'pending' as const,
    },
    {
      label: 'Completed',
      status: loan.status === 'completed' ? 'completed' : 'pending' as const,
    },
  ];
  return steps;
}

export default function LoanDetails() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<any>(null);
  const [error, setError] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedRepayment, setSelectedRepayment] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => { loadLoan(); }, [loanId]);

  const loadLoan = async () => {
    if (!loanId) { setError("No loan ID provided"); setLoading(false); return; }
    try {
      const res: any = await loansApi.getMyLoan(parseInt(loanId));
      const data = res.data?.data || res.data || res;
      if (!data) { setError("Loan not found"); } else { setLoan(data); }
    } catch (err: any) {
      console.error("Failed to load loan:", err);
      setError(err.message || "Failed to load loan details");
    } finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (error || !loan) return (
    <div className="p-4 text-center">
      <p className="text-muted-foreground mb-4">{error || "Loan not found"}</p>
      <Button onClick={() => navigate("/loans")}>Back to Loans</Button>
    </div>
  );

  const progress = loan.total_paid && loan.total_amount ? Math.min((loan.total_paid / loan.total_amount) * 100, 100) : 0;
  const { isLate, daysOverdue, lateFee } = calcLatePayment(loan);
  const schedule = generateSchedule(loan);

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const aprResult = calculateAPR({
        principalAmount: loan.principal_amount,
        interestRate: loan.interest_rate,
        loanTermMonths: loan.term_months,
        processingFeePercent: loan.processing_fee > 0 ? (loan.processing_fee / loan.principal_amount) * 100 : 0,
        assetTransferFee: loan.asset_transfer_fee || 0,
        trackingSystemFee: loan.tracking_system_fee || 0,
      });

      await downloadLoanAgreementPDF({
        loanId: loan.id,
        borrowerName: user.name,
        borrowerEmail: user.email,
        borrowerPhone: user.phone || '',
        borrowerIdNumber: loan.national_id || 'N/A',
        borrowerAddress: loan.address || 'N/A',
        loanAmount: loan.principal_amount,
        principalAmount: loan.principal_amount,
        interestRate: loan.interest_rate,
        loanTermMonths: loan.term_months,
        monthlyPayment: loan.total_amount / loan.term_months,
        processingFee: loan.processing_fee,
        assetTransferFee: loan.asset_transfer_fee || 0,
        trackingSystemFee: loan.tracking_system_fee || 0,
        totalFees: (loan.processing_fee || 0) + (loan.asset_transfer_fee || 0) + (loan.tracking_system_fee || 0),
        totalRepayableAmount: loan.total_amount,
        disbursementDate: formatDate(loan.disbursed_at || loan.approved_at),
        maturityDate: loan.due_date,
        firstPaymentDueDate: new Date(loan.disbursed_at || loan.approved_at || loan.created_at).toLocaleDateString('en-KE'),
        apr: aprResult.apr,
        lateFeePenalty: 2.5,
        loanProductName: loan.product_name || 'Loan',
        assetDescription: loan.asset_description || 'Asset(s)',
        assetValue: loan.asset_value,
        securityDetails: loan.security_details || 'As per agreement',
        companyName: 'LendHub',
        companyAddress: 'P.O. Box XXXX, Nairobi, Kenya',
        companyPhone: '+254 (0) 700 000 000',
        companyEmail: 'support@lendhub.io',
      });
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/loans")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold truncate">Loan #{loan.id}</h1>
        <Badge className={getStatusColor(loan.status) + " ml-auto text-xs flex-shrink-0"}>{getStatusLabel(loan.status)}</Badge>
      </div>

      {/* Late Payment Alert */}
      {isLate && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Payment Overdue by {daysOverdue} day{daysOverdue > 1 ? "s" : ""}</p>
            <p className="text-xs text-red-600">A 2% late fee of {formatKES(lateFee)} applies on your outstanding balance. Please pay immediately.</p>
          </div>
        </div>
      )}

      {/* Invoice / Receipt / Schedule / PDF Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowInvoice(true)}>
          <FileText className="h-4 w-4 mr-1" /> Invoice
        </Button>
        {(loan.repayments?.length > 0) && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedRepayment(loan.repayments[loan.repayments.length - 1]); setShowReceipt(true); }}>
            <Receipt className="h-4 w-4 mr-1" /> Receipt
          </Button>
        )}
        {loan.status === "active" && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/loans/${loan.id}/repayment-schedule`)}>
            <Calendar className="h-4 w-4 mr-1" /> Schedule
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDownloadPDF}
          disabled={downloadingPDF}
        >
          {downloadingPDF ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-1" /> Agreement
            </>
          )}
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-3 md:p-4">
          <p className="font-bold text-xl md:text-2xl">{formatKES(loan.principal_amount)}</p>
          <p className="text-xs md:text-sm text-muted-foreground">{loan.product_name || "Loan"}</p>
          <div className="mt-3">
            <div className="flex justify-between mb-1 text-xs">
              <span>Repayment Progress</span><span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: progress + "%" }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Paid: {formatKES(loan.total_paid || 0)}</span>
              <span>Balance: {formatKES(loan.balance || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="p-3 md:p-4 pb-2"><CardTitle className="text-xs md:text-sm">Application Status</CardTitle></CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <LoanStatusTimeline steps={getTimelineSteps(loan)} />
        </CardContent>
      </Card>

      {/* Loan Details */}
      <Card>
        <CardHeader className="p-3 md:p-4 pb-1"><CardTitle className="text-xs md:text-sm">Loan Details</CardTitle></CardHeader>
        <CardContent className="p-3 md:p-4 pt-0 space-y-2">
          {[
            {label:"Applied",value:formatDate(loan.created_at)},
            {label:"Term",value:loan.term_months+" months"},
            {label:"Interest Rate",value:(loan.interest_rate||0)+"% p.a."},
            {label:"Annual Percentage Rate (APR)",value:(() => {
              const aprResult = calculateAPR({
                principalAmount: loan.principal_amount,
                interestRate: loan.interest_rate,
                loanTermMonths: loan.term_months,
                processingFeePercent: loan.processing_fee > 0 ? (loan.processing_fee / loan.principal_amount) * 100 : 0,
                assetTransferFee: loan.asset_transfer_fee || 0,
                trackingSystemFee: loan.tracking_system_fee || 0,
              });
              return aprResult.apr.toFixed(2) + "% APR";
            })()},
            {label:"Total Repayable",value:formatKES(loan.total_amount)},
            {label:"Due Date",value:formatDate(loan.due_date)},
            {label:"Disbursed",value:formatDate(loan.disbursed_at)}
          ].map(row => row.value && row.value !== "N/A" ? (
            <div key={row.label} className="flex justify-between gap-2 text-xs md:text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="text-right font-medium">{row.value}</span>
            </div>
          ) : null)}
        </CardContent>
      </Card>

      {/* Fees */}
      {(loan.processing_fee > 0 || loan.interest_amount > 0 || loan.asset_transfer_fee > 0) && (
        <Card>
          <CardHeader className="p-3 md:p-4 pb-1"><CardTitle className="text-xs md:text-sm">Fee Breakdown</CardTitle></CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 space-y-2">
            {loan.interest_amount > 0 && <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Interest</span><span>{formatKES(loan.interest_amount)}</span></div>}
            {loan.processing_fee > 0 && <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Processing Fee</span><span>{formatKES(loan.processing_fee)}</span></div>}
            {loan.asset_transfer_fee > 0 && <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Asset Transfer Fee</span><span>{formatKES(loan.asset_transfer_fee)}</span></div>}
            {loan.tracking_system_fee > 0 && <div className="flex justify-between text-xs md:text-sm"><span className="text-muted-foreground">Tracking Fee</span><span>{formatKES(loan.tracking_system_fee)}</span></div>}
          </CardContent>
        </Card>
      )}

      {/* Repayment Schedule */}
      {loan.status === "active" && schedule.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Repayment Schedule</h2>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 text-xs font-semibold bg-muted p-2 border-b">
              <span>#</span><span>Due Date</span><span className="text-right">Amount</span><span className="text-center">Status</span>
            </div>
            {schedule.map((s) => (
              <div key={s.no} className={"grid grid-cols-4 gap-1 px-2 py-2 border-b last:border-0 text-xs " + (s.isPaid ? "bg-green-50" : s.isLate ? "bg-red-50" : "")}>
                <span className="font-medium">{s.no}</span>
                <span className="text-muted-foreground">{s.due.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
                <div className="text-right">
                  <span>{formatKES(s.amount)}</span>
                  {s.isLate && <p className="text-red-500 text-[10px]">+{formatKES(s.lateFee)} fee</p>}
                </div>
                <div className="flex justify-center">
                  {s.isPaid ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : s.isLate ? <XCircle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-gray-300" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {loan.repayments?.length > 0 && (
        <Card>
          <CardHeader className="p-3 md:p-4 pb-1"><CardTitle className="text-xs md:text-sm">Payment History</CardTitle></CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 space-y-2">
            {loan.repayments.map((pmt: any) => (
              <div key={pmt.id} className="flex justify-between items-center py-2 border-b last:border-0 gap-2">
                <div>
                  <p className="text-xs md:text-sm font-medium">{formatKES(pmt.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(pmt.paid_at)}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{pmt.payment_method || "payment"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoice / Receipt Modals */}
      <InvoiceReceipt open={showInvoice} onClose={() => setShowInvoice(false)} type="invoice" loan={loan} userName={user?.name} />
      <InvoiceReceipt open={showReceipt} onClose={() => setShowReceipt(false)} type="receipt" loan={loan} repayment={selectedRepayment} userName={user?.name} />
    </div>
  );
}
