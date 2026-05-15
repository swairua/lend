import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, AlertTriangle, CheckCircle2, Clock, Edit2, Loader2 } from "lucide-react";
import { adminApi, repaymentsApi, formatKES, formatDate } from "../types/api";
import { useAlert } from "@/hooks/use-alert";

interface ScheduleItem {
  no: number;
  due: Date;
  amount: number;
  principal: number;
  interest: number;
  penalty: number;
  balance: number;
  isPaid: boolean;
  isLate: boolean;
}

const GRACE_DAYS = 7;
const LATE_FEE_RATE = 0.02;

function generateSchedule(loan: any): ScheduleItem[] {
  if (!loan || !loan.term_months) return [];
  
  const start = new Date(loan.disbursed_at || loan.approved_at || loan.created_at);
  const totalAmount = loan.total_amount;
  const principal = loan.principal_amount;
  const interest = loan.interest_amount || 0;
  
  const monthlyPayment = totalAmount / loan.term_months;
  const monthlyPrincipal = principal / loan.term_months;
  const monthlyInterest = interest / loan.term_months;
  
  const paid = loan.total_paid || 0;
  const schedule: ScheduleItem[] = [];
  
  for (let i = 1; i <= loan.term_months; i++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i);
    
    const cumulative = monthlyPayment * i;
    const isPaid = paid >= cumulative;
    
    const grace = new Date(due);
    grace.setDate(grace.getDate() + GRACE_DAYS);
    const isLate = !isPaid && Date.now() > grace.getTime();
    
    const remainingBalance = Math.max(0, totalAmount - cumulative);
    
    schedule.push({
      no: i,
      due,
      amount: monthlyPayment,
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      penalty: isLate ? (loan.balance || remainingBalance) * LATE_FEE_RATE : 0,
      balance: remainingBalance,
      isPaid,
      isLate,
    });
  }
  
  return schedule;
}

export default function AdminRepaymentSchedule() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const { showAlert, AlertComponent } = useAlert();
  
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<any>(null);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ScheduleItem | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    principalPaid: "",
    interestPaid: "",
    paymentMethod: "cash",
    referenceNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLoan();
  }, [loanId]);

  const loadLoan = async () => {
    if (!loanId) {
      setError("No loan ID provided");
      setLoading(false);
      return;
    }
    try {
      const res: any = await adminApi.getLoan(parseInt(loanId));
      const data = res.data?.data || res.data || res;
      if (!data) {
        setError("Loan not found");
      } else {
        setLoan(data);
        setSchedule(generateSchedule(data));
      }
    } catch (err: any) {
      console.error("Failed to load loan:", err);
      setError(err.message || "Failed to load loan details");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (item: ScheduleItem) => {
    setSelectedPayment(item);
    setPaymentForm({
      amount: item.amount.toString(),
      principalPaid: item.principal.toString(),
      interestPaid: item.interest.toString(),
      paymentMethod: "cash",
      referenceNumber: "",
    });
    setDialogOpen(true);
  };

  const handleMarkPaid = async () => {
    if (!selectedPayment || !loan) return;
    
    setSubmitting(true);
    try {
      const amount = parseFloat(paymentForm.amount) || selectedPayment.amount;
      const principalPaid = parseFloat(paymentForm.principalPaid) || selectedPayment.principal;
      const interestPaid = parseFloat(paymentForm.interestPaid) || selectedPayment.interest;

      await repaymentsApi.record({
        loan_id: loan.id,
        amount,
        principal_paid: principalPaid,
        interest_paid: interestPaid,
        payment_method: paymentForm.paymentMethod,
        reference_number: paymentForm.referenceNumber || undefined,
      });

      showAlert({
        type: "success",
        message: `Payment of ${formatKES(amount)} recorded successfully`,
      });

      setDialogOpen(false);
      setSelectedPayment(null);
      await loadLoan();
    } catch (err: any) {
      showAlert({
        type: "error",
        message: err.message || "Failed to record payment",
      });
    } finally {
      setSubmitting(false);
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
        <p className="text-muted-foreground mb-4">{error || "Loan not found"}</p>
        <Button onClick={() => navigate("/admin/loans")}>Back to Loans</Button>
      </div>
    );
  }

  const totalDue = schedule.reduce((sum, s) => sum + s.amount, 0);
  const totalPaid = loan.total_paid || 0;
  const totalPending = totalDue - totalPaid;
  const paidCount = schedule.filter(s => s.isPaid).length;
  const lateCount = schedule.filter(s => s.isLate).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/loans")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Repayment Schedule - Loan #{loan.id}</h1>
      </div>

      {/* Borrower Info */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Borrower</p>
              <p className="text-base md:text-lg font-bold">{loan.borrower_name || "N/A"}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{loan.borrower_email || ""}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Status</p>
              <Badge className="mt-1">{loan.status}</Badge>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Loan Product</p>
              <p className="text-base md:text-lg font-bold">{loan.product_name || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Summary */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Principal</p>
              <p className="text-lg md:text-xl font-bold">{formatKES(loan.principal_amount)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Repayable</p>
              <p className="text-lg md:text-xl font-bold">{formatKES(loan.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Collected</p>
              <p className="text-lg md:text-xl font-bold text-green-600">{formatKES(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Outstanding</p>
              <p className="text-lg md:text-xl font-bold text-orange-600">{formatKES(totalPending)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-muted-foreground">Duration</p>
            <p className="text-lg md:text-xl font-bold">{loan.term_months} months</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
            <p className="text-lg md:text-xl font-bold text-green-600">{paidCount}/{schedule.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-muted-foreground">Overdue</p>
            <p className={`text-lg md:text-xl font-bold ${lateCount > 0 ? "text-red-600" : "text-gray-400"}`}>
              {lateCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Late Payment Alert */}
      {lateCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">
              {lateCount} payment{lateCount > 1 ? "s" : ""} overdue
            </p>
            <p className="text-xs text-red-600 mt-1">
              Late fees are accumulating at 2% of outstanding balance. Mark payments to keep schedule current.
            </p>
          </div>
        </div>
      )}

      {/* Repayment Schedule Table */}
      <Card>
        <CardHeader className="p-4 md:p-6 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 md:px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-3 md:px-4 py-3 text-left font-semibold">Due Date</th>
                  <th className="px-3 md:px-4 py-3 text-right font-semibold">Principal</th>
                  <th className="px-3 md:px-4 py-3 text-right font-semibold">Interest</th>
                  <th className="px-3 md:px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-3 md:px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="px-3 md:px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 md:px-4 py-3 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((s) => (
                  <tr
                    key={s.no}
                    className={`border-b last:border-0 ${
                      s.isPaid ? "bg-green-50" : s.isLate ? "bg-red-50" : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="px-3 md:px-4 py-3 font-medium">{s.no}</td>
                    <td className="px-3 md:px-4 py-3 text-muted-foreground">
                      {s.due.toLocaleDateString("en-KE", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-right">{formatKES(s.principal)}</td>
                    <td className="px-3 md:px-4 py-3 text-right">{formatKES(s.interest)}</td>
                    <td className="px-3 md:px-4 py-3 text-right font-medium">
                      {formatKES(s.amount)}
                      {s.isLate && (
                        <div className="text-red-500 text-[10px] font-normal">
                          +{formatKES(s.penalty)} fee
                        </div>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-right">{formatKES(s.balance)}</td>
                    <td className="px-3 md:px-4 py-3 text-center">
                      {s.isPaid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                      ) : s.isLate ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mx-auto" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-center">
                      {!s.isPaid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEditPayment(s)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment for Installment #{selectedPayment?.no}</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">
                    {selectedPayment.due.toLocaleDateString("en-KE")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Amount:</span>
                  <span className="font-medium">{formatKES(selectedPayment.amount)}</span>
                </div>
                {selectedPayment.isLate && (
                  <div className="flex justify-between text-sm border-t pt-2 mt-2">
                    <span className="text-red-600 font-semibold">Late Fee:</span>
                    <span className="font-bold text-red-600">
                      {formatKES(selectedPayment.penalty)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="amount" className="text-xs md:text-sm">
                    Amount Paid
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    className="text-xs md:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="principal" className="text-xs md:text-sm">
                      Principal
                    </Label>
                    <Input
                      id="principal"
                      type="number"
                      step="0.01"
                      value={paymentForm.principalPaid}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          principalPaid: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interest" className="text-xs md:text-sm">
                      Interest
                    </Label>
                    <Input
                      id="interest"
                      type="number"
                      step="0.01"
                      value={paymentForm.interestPaid}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          interestPaid: e.target.value,
                        })
                      }
                      className="text-xs md:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="method" className="text-xs md:text-sm">
                    Payment Method
                  </Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, paymentMethod: value })
                    }
                  >
                    <SelectTrigger className="text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reference" className="text-xs md:text-sm">
                    Reference Number (optional)
                  </Label>
                  <Input
                    id="reference"
                    type="text"
                    placeholder="e.g., M-Pesa ref, cheque number"
                    value={paymentForm.referenceNumber}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        referenceNumber: e.target.value,
                      })
                    }
                    className="text-xs md:text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {AlertComponent}
    </div>
  );
}
