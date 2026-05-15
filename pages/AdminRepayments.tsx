import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { Loader2, ChevronLeft, ChevronRight, RefreshCw, Wallet, Eye, Trash2, Plus } from 'lucide-react';
import { adminApi, formatKES, formatDate, Loan } from '../types/api';
import { normalizeList } from '../utils/normalize';
import { useAlert } from '@/hooks/use-alert';

interface Repayment {
  id: number;
  loan_id: number;
  borrower_name: string;
  borrower_email: string;
  amount: number;
  principal_paid: number;
  interest_paid: number;
  payment_method: string;
  reference_number: string;
  paid_at: string;
  created_at: string;
  loan_status: string;
}

export default function AdminRepayments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [selectedRepayment, setSelectedRepayment] = useState<Repayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalRepayments, setTotalRepayments] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [searchingLoans, setSearchingLoans] = useState(false);
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [addPaymentLoading, setAddPaymentLoading] = useState(false);
  const [formData, setFormData] = useState({
    loan_id: '',
    amount: '',
    principal_paid: '',
    interest_paid: '',
    payment_method: 'cash' as 'cash' | 'mpesa' | 'bank' | 'other',
    reference_number: '',
  });
  const { showAlert, confirm, AlertComponent } = useAlert();
  const loanSearchTimeoutRef = React.useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadRepayments();
    loadActiveLoans();
  }, []);

  const loadActiveLoans = async () => {
    setLoadingLoans(true);
    try {
      const response = await adminApi.getLoans({ status: 'active' });
      if (response.data?.loans) {
        setLoans(normalizeList<Loan>(response.data.loans) as Loan[]);
      }
    } catch (error: any) {
      console.error('Failed to load active loans:', error);
    } finally {
      setLoadingLoans(false);
    }
  };

  const handleLoanSearch = (searchTerm: string) => {
    setLoanSearchTerm(searchTerm);

    if (loanSearchTimeoutRef.current) {
      clearTimeout(loanSearchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      loadActiveLoans();
      return;
    }

    setSearchingLoans(true);
    loanSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await adminApi.getLoans({ status: 'active' });
        if (response.data?.loans) {
          const allLoans = normalizeList<Loan>(response.data.loans) as Loan[];
          const search = searchTerm.toLowerCase();
          const filtered = allLoans.filter(loan =>
            String(loan.id).includes(search) ||
            loan.borrower_name?.toLowerCase().includes(search) ||
            loan.borrower_email?.toLowerCase().includes(search)
          );
          setLoans(filtered);
        }
      } catch (error: any) {
        console.error('Failed to search loans:', error);
      } finally {
        setSearchingLoans(false);
      }
    }, 300);
  };

  const loadRepayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.getRepayments();
      
      console.log('Repayments API response:', response);
      
      // Normalize repayments array using helper
      const data = normalizeList<Repayment>(response);
      setRepayments(data as Repayment[]);
      setTotalRepayments((data as Repayment[]).length);
      setTotalAmount(
        Array.isArray(data)
          ? (data as Repayment[]).reduce((sum: number, r: any) => sum + (Number((r as any).amount) || 0), 0)
          : 0
      );
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to connect to the repayments API';
      console.error('Failed to load repayments:', errorMsg);
      setError(errorMsg);
      setRepayments([]);

      // For demo purposes, show a message about the backend
      if (errorMsg.includes('Empty response') || errorMsg.includes('fetch')) {
        showAlert({
          type: 'error',
          message: 'Unable to reach the backend API. Please ensure:\n1. The PHP backend is running on http://localhost:8082\n2. The /admin/repayments endpoint is properly configured'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    confirm('Delete this repayment record?', async () => {
      try {
        await adminApi.deleteRepayment(id);
        await loadRepayments();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
      }
    });
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.loan_id || !formData.amount || !formData.principal_paid || !formData.interest_paid) {
      showAlert({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    const amount = parseFloat(formData.amount);
    const principal = parseFloat(formData.principal_paid);
    const interest = parseFloat(formData.interest_paid);

    if (amount <= 0 || principal < 0 || interest < 0) {
      showAlert({ type: 'error', message: 'Amounts must be positive' });
      return;
    }

    if (Math.abs(amount - (principal + interest)) > 0.01) {
      showAlert({ type: 'error', message: 'Total amount must equal principal + interest' });
      return;
    }

    setAddPaymentLoading(true);
    try {
      await adminApi.createRepayment({
        loan_id: parseInt(formData.loan_id),
        amount,
        principal_paid: principal,
        interest_paid: interest,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
      });

      showAlert({ type: 'success', message: 'Payment added successfully' });
      setAddPaymentOpen(false);
      setFormData({
        loan_id: '',
        amount: '',
        principal_paid: '',
        interest_paid: '',
        payment_method: 'cash',
        reference_number: '',
      });
      await loadRepayments();
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
    } finally {
      setAddPaymentLoading(false);
    }
  };

  const filteredRepayments = repayments.filter(r => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      r.borrower_name?.toLowerCase().includes(search) ||
      r.borrower_email?.toLowerCase().includes(search) ||
      String(r.loan_id).includes(search) ||
      r.reference_number?.toLowerCase().includes(search)
    );
  });

  if (loading && repayments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Repayments</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="default" size="sm" onClick={() => setAddPaymentOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
          <Button variant="outline" size="sm" onClick={loadRepayments} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs md:text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-base md:text-2xl font-bold truncate">{formatKES(totalAmount)}</p>
                <p className="text-xs text-muted-foreground">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-base md:text-2xl font-bold">{totalRepayments}</p>
                <p className="text-xs text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by borrower, loan ID, or reference..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Repayments Table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable>
            <ResponsiveTableHeader className="bg-muted/50">
              <tr>
                <ResponsiveTableHead className="text-left">ID</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden sm:table-cell text-left">Loan ID</ResponsiveTableHead>
                <ResponsiveTableHead className="text-left">Borrower</ResponsiveTableHead>
                <ResponsiveTableHead className="text-right">Amount</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden md:table-cell text-right">Principal</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden lg:table-cell text-right">Interest</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden sm:table-cell text-left">Method</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden md:table-cell text-left">Date</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Actions</ResponsiveTableHead>
              </tr>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {filteredRepayments.map((repayment) => (
                <ResponsiveTableRow key={repayment.id}>
                  <ResponsiveTableCell label="ID" className="font-medium md:p-3 p-2 text-xs md:text-sm">#{repayment.id}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Loan ID" className="hidden sm:table-cell md:p-3 p-2 text-xs md:text-sm">#{repayment.loan_id}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Borrower" className="md:p-3 p-2">
                    <p className="font-medium text-xs md:text-sm">{repayment.borrower_name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground truncate">{repayment.borrower_email || ''}</p>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Amount" className="text-right font-medium text-green-600 md:p-3 p-2 text-xs md:text-sm">{formatKES(repayment.amount)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Principal" className="hidden md:table-cell text-right md:p-3 p-2 text-xs md:text-sm">{formatKES(repayment.principal_paid || 0)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Interest" className="hidden lg:table-cell text-right md:p-3 p-2 text-xs md:text-sm">{formatKES(repayment.interest_paid || 0)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Method" className="hidden sm:table-cell md:p-3 p-2">
                    <Badge variant="outline" className="capitalize text-xs">{repayment.payment_method || 'N/A'}</Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Date" className="hidden md:table-cell text-xs md:text-sm text-muted-foreground md:p-3 p-2">{formatDate(repayment.paid_at || repayment.created_at)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Actions" className="md:p-3 p-2">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => { setSelectedRepayment(repayment); setDialogOpen(true); }}>
                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleDelete(repayment.id)}>
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
          {filteredRepayments.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No repayments found'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog
        open={addPaymentOpen}
        onOpenChange={(open) => {
          setAddPaymentOpen(open);
          if (!open) {
            setLoanSearchTerm('');
            setLoans([]);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div>
              <label className="text-xs md:text-sm font-medium text-muted-foreground">Loan *</label>
              <Input
                type="text"
                placeholder="Search by loan ID, borrower name, or email..."
                value={loanSearchTerm}
                onChange={(e) => handleLoanSearch(e.target.value)}
                className="mt-1"
              />
              {(loanSearchTerm || loans.length > 0) && (
                <div className="mt-1 border rounded-md bg-white max-h-48 overflow-y-auto">
                  {searchingLoans ? (
                    <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : loans.length > 0 ? (
                    loans.map(loan => (
                      <button
                        key={loan.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, loan_id: loan.id.toString() });
                          setLoanSearchTerm('');
                          setLoans([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                      >
                        <div className="font-medium">#{loan.id} - {loan.borrower_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{loan.borrower_email || ''}</div>
                        <div className="text-xs text-muted-foreground">Balance: {formatKES(loan.balance || 0)}</div>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">No loans found</div>
                  )}
                </div>
              )}
              {formData.loan_id && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  Loan ID <strong>#{formData.loan_id}</strong> selected
                </div>
              )}
            </div>

            <div>
              <label className="text-xs md:text-sm font-medium text-muted-foreground">Total Amount (Ksh) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1"
                min="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs md:text-sm font-medium text-muted-foreground">Principal Paid (Ksh) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.principal_paid}
                  onChange={(e) => setFormData({ ...formData, principal_paid: e.target.value })}
                  className="mt-1"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs md:text-sm font-medium text-muted-foreground">Interest Paid (Ksh) *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.interest_paid}
                  onChange={(e) => setFormData({ ...formData, interest_paid: e.target.value })}
                  className="mt-1"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="text-xs md:text-sm font-medium text-muted-foreground">Payment Method *</label>
              <Select value={formData.payment_method} onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs md:text-sm font-medium text-muted-foreground">Reference Number</label>
              <Input
                type="text"
                placeholder="e.g., cheque number, transaction ID"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="mt-1"
              />
            </div>
          </form>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setAddPaymentOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleAddPayment} disabled={addPaymentLoading} className="w-full sm:w-auto">
              {addPaymentLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repayment Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Repayment #{selectedRepayment?.id}</DialogTitle>
          </DialogHeader>
          {selectedRepayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Borrower</p>
                  <p className="font-medium text-sm md:text-base">{selectedRepayment.borrower_name || 'N/A'}</p>
                  <p className="text-xs md:text-sm truncate">{selectedRepayment.borrower_email || ''}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Loan ID</p>
                  <p className="font-medium text-sm md:text-base">#{selectedRepayment.loan_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg md:text-xl font-bold text-green-600">{formatKES(selectedRepayment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Payment Method</p>
                  <Badge variant="outline" className="capitalize mt-1 text-xs">{selectedRepayment.payment_method || 'N/A'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Principal Paid</p>
                  <p className="font-medium text-sm md:text-base">{formatKES(selectedRepayment.principal_paid || 0)}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Interest Paid</p>
                  <p className="font-medium text-sm md:text-base">{formatKES(selectedRepayment.interest_paid || 0)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium text-sm md:text-base truncate">{selectedRepayment.reference_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Loan Status</p>
                  <Badge className="text-xs">{selectedRepayment.loan_status || 'N/A'}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Date</p>
                <p className="font-medium text-sm md:text-base">{formatDate(selectedRepayment.paid_at || selectedRepayment.created_at)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Custom Alert */}
      {AlertComponent}
    </div>
  );
}
