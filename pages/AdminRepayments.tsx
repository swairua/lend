import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { Loader2, ChevronLeft, ChevronRight, RefreshCw, Wallet, Eye, Trash2, Plus, Check, ChevronsUpDown, Download } from 'lucide-react';
import { adminApi, repaymentsApi, formatKES, formatDate, pdfApi } from '../types/api';
import { toast } from 'sonner';
import { normalizeList } from '../utils/normalize';
import { useAlert } from '@/hooks/use-alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

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
  payment_status?: 'applied' | 'pending' | 'unreconciled';
}

interface LoanOption {
  id: number;
  borrower_name: string;
  principal_amount: number;
}

export default function AdminRepayments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [selectedRepayment, setSelectedRepayment] = useState<Repayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalRepayments, setTotalRepayments] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [loanSearchTerm, setLoanSearchTerm] = useState('');
  const [loans, setLoans] = useState<LoanOption[]>([]);
  const [loanPopoverOpen, setLoanPopoverOpen] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    loan_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
  });
  const [syncing, setSyncing] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [syncResultsDialogOpen, setSyncResultsDialogOpen] = useState(false);
  const [matchingDialogOpen, setMatchingDialogOpen] = useState(false);
  const [selectedRepaymentForMatch, setSelectedRepaymentForMatch] = useState<Repayment | null>(null);
  const [matchingLoanId, setMatchingLoanId] = useState('');
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const { showAlert, confirm, AlertComponent } = useAlert();

  useEffect(() => {
    loadRepayments();
    loadOrphanedPaymentsCount();
  }, []);

  const loadOrphanedPaymentsCount = async () => {
    try {
      const response = await adminApi.getOrphanedPayments();
      if (response.success && response.data) {
        setOrphanedCount(response.data.total_orphaned || 0);
      }
    } catch (error) {
      console.error('Failed to load orphaned payments count:', error);
    }
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollFallback: NodeJS.Timeout | null = null;

    const setupSSE = () => {
      try {
        const since = Math.floor(Date.now() / 1000) - 60;
        const url = `/api/admin/repayments/stream?since=${since}`;

        eventSource = new EventSource(url);

        eventSource.addEventListener('repayment-updated', (event) => {
          const repayment = JSON.parse(event.data);
          setRepayments(prev => {
            const existing = prev.findIndex(r => r.id === repayment.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], ...repayment };
              return updated;
            }
            return [repayment, ...prev];
          });
          setTotalRepayments(prev => prev + 1);
        });

        eventSource.addEventListener('connected', () => {
          if (pollFallback) {
            clearInterval(pollFallback);
            pollFallback = null;
          }
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!pollFallback) {
            pollFallback = setInterval(() => {
              loadRepayments();
              loadOrphanedPaymentsCount();
            }, 4000);
          }
        };
      } catch (error) {
        console.error('SSE connection failed, falling back to polling:', error);
        if (!pollFallback) {
          pollFallback = setInterval(() => {
            loadRepayments();
            loadOrphanedPaymentsCount();
          }, 4000);
        }
      }
    };

    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollFallback) {
        clearInterval(pollFallback);
      }
    };
  }, []);

  useEffect(() => {
    if (loanPopoverOpen) {
      searchLoans(loanSearchTerm);
    }
  }, [loanPopoverOpen]);

  useEffect(() => {
    if (loanSearchTerm.trim()) {
      const debounce = setTimeout(() => {
        searchLoans(loanSearchTerm);
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [loanSearchTerm]);

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

  const searchLoans = async (query: string) => {
    setLoadingLoans(true);
    try {
      const response = await adminApi.getLoans({ status: 'active', limit: 50 });
      const loansData = Array.isArray(response.data?.loans) ? response.data.loans : [];

      const filtered = loansData.filter(loan => {
        const searchStr = query.toLowerCase();
        return (
          String(loan.id).includes(searchStr) ||
          (loan.borrower_name && loan.borrower_name.toLowerCase().includes(searchStr))
        );
      });

      setLoans(filtered.map(loan => ({
        id: loan.id,
        borrower_name: loan.borrower_name || 'Unknown',
        principal_amount: loan.principal_amount,
      })));
    } catch (error: any) {
      console.error('Failed to search loans:', error);
      setLoans([]);
    } finally {
      setLoadingLoans(false);
    }
  };

  const handleDownloadReceipt = async (loanId: number, repaymentId: number) => {
    setDownloadingReceiptId(repaymentId);
    try {
      const result = await pdfApi.generateReceipt(loanId, repaymentId);
      const blob = await pdfApi.downloadDocument(result.data.document_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
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

  const handleAddPayment = async () => {
    if (!paymentForm.loan_id || !paymentForm.amount) {
      showAlert({ type: 'error', message: 'Please fill in loan ID and amount' });
      return;
    }

    setSubmitting(true);
    try {
      await repaymentsApi.record({
        loan_id: parseInt(paymentForm.loan_id),
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || undefined,
      });

      toast.success(`Payment of ${formatKES(parseFloat(paymentForm.amount))} recorded successfully`);

      setPaymentForm({
        loan_id: '',
        amount: '',
        payment_method: 'cash',
        reference_number: '',
      });
      setAddPaymentDialogOpen(false);
      await loadRepayments();
    } catch (err: any) {
      showAlert({
        type: 'error',
        message: err.message || 'Failed to record payment',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncAllPayments = async () => {
    setSyncing(true);
    try {
      const result = await adminApi.syncMpesaPayments();

      // Store detailed results for modal
      setSyncResults({
        success: result.success,
        message: result.message,
        stats: result.data
      });

      // Show summary toast
      const { created, applied, errors, skipped } = result.data;
      const summary = `Synced: ${created} created${applied > 0 ? `, ${applied} applied` : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}${errors > 0 ? `, ${errors} failed` : ''}`;

      if (result.success && errors === 0) {
        toast.success(summary || 'M-Pesa payments synchronized');
      } else if (errors > 0) {
        toast.error(summary || 'Some payments failed to sync');
      } else {
        toast.success(summary || 'M-Pesa payments synchronized');
      }

      // Show detailed results modal
      setSyncResultsDialogOpen(true);

      // Refresh orphaned count and repayments
      await loadOrphanedPaymentsCount();
      await loadRepayments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync payments');
    } finally {
      setSyncing(false);
    }
  };

  const handleMatchRepayment = async () => {
    if (!selectedRepaymentForMatch || !matchingLoanId) {
      showAlert({
        type: 'error',
        message: 'Please select a loan to match'
      });
      return;
    }

    setMatchingLoading(true);
    try {
      const response = await fetch('/api/admin/mpesa/match-repayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          repayment_id: selectedRepaymentForMatch.id,
          loan_id: parseInt(matchingLoanId)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to match repayment');
      }

      const result = await response.json();
      toast.success(result.data.warning ? `Matched with warning: ${result.data.warning}` : 'Repayment matched successfully');
      setMatchingDialogOpen(false);
      setSelectedRepaymentForMatch(null);
      setMatchingLoanId('');
      await loadRepayments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to match repayment');
    } finally {
      setMatchingLoading(false);
    }
  };

  const openMatchingDialog = (repayment: Repayment) => {
    setSelectedRepaymentForMatch(repayment);
    setMatchingLoanId('');
    setMatchingDialogOpen(true);
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
    <div className="w-full min-h-screen py-3 md:py-6 px-3 md:px-4 lg:px-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg md:text-2xl font-bold">Repayments</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={loadRepayments} className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncAllPayments}
            disabled={syncing || orphanedCount === 0}
            className="flex-1 sm:flex-none"
            title={orphanedCount === 0 ? 'No orphaned payments to sync' : `Sync ${orphanedCount} orphaned payment(s)`}
          >
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync M-Pesa ({orphanedCount})
          </Button>
          <Button size="sm" onClick={() => setAddPaymentDialogOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 md:mb-6 border-red-200 bg-red-50">
          <CardContent className="p-2 md:p-4">
            <p className="text-xs text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 lg:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-2 md:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg md:text-2xl lg:text-3xl font-bold truncate">{formatKES(totalAmount)}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Total Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 md:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold">{totalRepayments}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4 md:mb-5">
        <Input
          placeholder="Search borrower, loan ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs md:text-sm h-9 md:h-10"
        />
      </div>

      {/* Repayments Table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable>
            <caption className="sr-only">Admin repayments table showing borrower information, amounts, payment methods, and transaction status</caption>
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
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="capitalize text-xs w-fit">{repayment.payment_method || 'N/A'}</Badge>
                      {repayment.payment_status && (
                        <Badge
                          className={`capitalize text-xs w-fit ${
                            repayment.payment_status === 'applied'
                              ? 'bg-green-100 text-green-800'
                              : repayment.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {repayment.payment_status}
                        </Badge>
                      )}
                    </div>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Date" className="hidden md:table-cell text-xs md:text-sm text-muted-foreground md:p-3 p-2">{formatDate(repayment.paid_at || repayment.created_at)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Actions" className="md:p-3 p-2">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => { setSelectedRepayment(repayment); setDialogOpen(true); }}>
                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 md:h-auto md:w-auto md:p-2 text-blue-600 hover:text-blue-700"
                        onClick={() => handleDownloadReceipt(repayment.loan_id, repayment.id)}
                        disabled={downloadingReceiptId === repayment.id}
                      >
                        {downloadingReceiptId === repayment.id ? (
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3 md:h-4 md:w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 md:h-auto md:w-auto md:p-2 text-purple-600 hover:text-purple-700"
                        onClick={() => openMatchingDialog(repayment)}
                        title="Match to loan"
                      >
                        <Check className="h-3 w-3 md:h-4 md:w-4" />
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

      {/* Repayment Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw] md:w-full p-3 md:p-6 space-y-3 md:space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg lg:text-xl">Repayment #{selectedRepayment?.id}</DialogTitle>
          </DialogHeader>
          {selectedRepayment && (
            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg md:text-xl font-bold text-green-600">{formatKES(selectedRepayment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Payment Method</p>
                  <Badge variant="outline" className="capitalize mt-1 text-xs">{selectedRepayment.payment_method || 'N/A'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Principal Paid</p>
                  <p className="font-medium text-sm md:text-base">{formatKES(selectedRepayment.principal_paid || 0)}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Interest Paid</p>
                  <p className="font-medium text-sm md:text-base">{formatKES(selectedRepayment.interest_paid || 0)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Reference</p>
                  <p className="font-medium text-sm md:text-base truncate">{selectedRepayment.reference_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Status</p>
                  {selectedRepayment.payment_status ? (
                    <Badge
                      className={`capitalize text-xs ${
                        selectedRepayment.payment_status === 'applied'
                          ? 'bg-green-100 text-green-800'
                          : selectedRepayment.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedRepayment.payment_status}
                    </Badge>
                  ) : (
                    <p className="font-medium text-sm md:text-base">N/A</p>
                  )}
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

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentDialogOpen} onOpenChange={setAddPaymentDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-md p-3 md:p-6 space-y-3 md:space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 md:space-y-4">
            <div>
              <Label htmlFor="loan_id" className="text-xs md:text-sm">
                Loan ID *
              </Label>
              <Popover open={loanPopoverOpen} onOpenChange={setLoanPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={loanPopoverOpen}
                    className="w-full justify-between text-xs md:text-sm"
                  >
                    {paymentForm.loan_id
                      ? loans.find(l => String(l.id) === paymentForm.loan_id)?.borrower_name
                        ? `#${paymentForm.loan_id} - ${loans.find(l => String(l.id) === paymentForm.loan_id)?.borrower_name}`
                        : `#${paymentForm.loan_id}`
                      : "Select loan..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search loan ID or borrower..."
                      value={loanSearchTerm}
                      onValueChange={setLoanSearchTerm}
                    />
                    <CommandEmpty>
                      {loadingLoans ? 'Loading loans...' : 'No active loans found.'}
                    </CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {loans.map((loan) => (
                          <CommandItem
                            key={loan.id}
                            value={String(loan.id)}
                            onSelect={(currentValue) => {
                              setPaymentForm({
                                ...paymentForm,
                                loan_id: currentValue,
                              });
                              setLoanPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                paymentForm.loan_id === String(loan.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">#{loan.id}</span>
                              <span className="text-xs text-muted-foreground">
                                {loan.borrower_name} • {formatKES(loan.principal_amount)}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="amount" className="text-xs md:text-sm">
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                className="text-xs md:text-sm"
              />
            </div>

            <div>
              <Label htmlFor="method" className="text-xs md:text-sm">
                Payment Method
              </Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) =>
                  setPaymentForm({ ...paymentForm, payment_method: value })
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
                value={paymentForm.reference_number}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    reference_number: e.target.value,
                  })
                }
                className="text-xs md:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Payment Dialog */}
      <Dialog open={matchingDialogOpen} onOpenChange={setMatchingDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-md p-3 md:p-6 space-y-3 md:space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Match Repayment to Loan</DialogTitle>
          </DialogHeader>
          {selectedRepaymentForMatch && (
            <div className="space-y-4 md:space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-blue-900 font-medium mb-2">Selected Repayment</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs md:text-sm text-blue-800">Amount:</span>
                    <span className="text-xs md:text-sm font-semibold text-blue-900">{formatKES(selectedRepaymentForMatch.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs md:text-sm text-blue-800">Reference:</span>
                    <span className="text-xs md:text-sm font-mono text-blue-900 truncate">{selectedRepaymentForMatch.reference_number || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs md:text-sm text-blue-800">Date:</span>
                    <span className="text-xs md:text-sm text-blue-900">{formatDate(selectedRepaymentForMatch.paid_at || selectedRepaymentForMatch.created_at)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="match_loan_id" className="text-xs md:text-sm">
                  Select Loan *
                </Label>
                <Popover open={loanPopoverOpen} onOpenChange={setLoanPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={loanPopoverOpen}
                      className="w-full justify-between text-xs md:text-sm mt-1"
                    >
                      {matchingLoanId
                        ? loans.find(l => String(l.id) === matchingLoanId)?.borrower_name
                          ? `#${matchingLoanId} - ${loans.find(l => String(l.id) === matchingLoanId)?.borrower_name}`
                          : `#${matchingLoanId}`
                        : "Select a loan..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search loan ID or borrower..."
                        value={loanSearchTerm}
                        onValueChange={setLoanSearchTerm}
                      />
                      <CommandEmpty>
                        {loadingLoans ? 'Loading loans...' : 'No active loans found.'}
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {loans.map((loan) => (
                            <CommandItem
                              key={loan.id}
                              value={String(loan.id)}
                              onSelect={(currentValue) => {
                                setMatchingLoanId(currentValue);
                                setLoanPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  matchingLoanId === String(loan.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">#{loan.id}</span>
                                <span className="text-xs text-muted-foreground">
                                  {loan.borrower_name} • {formatKES(loan.principal_amount)}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {matchingLoanId && loans.find(l => String(l.id) === matchingLoanId) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-amber-900 font-medium mb-2">Loan Summary</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs md:text-sm text-amber-800">Loan Amount:</span>
                      <span className="text-xs md:text-sm font-semibold text-amber-900">
                        {formatKES(loans.find(l => String(l.id) === matchingLoanId)?.principal_amount || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs md:text-sm text-amber-800">Repayment Amount:</span>
                      <span className="text-xs md:text-sm font-semibold text-amber-900">{formatKES(selectedRepaymentForMatch.amount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setMatchingDialogOpen(false);
                setSelectedRepaymentForMatch(null);
                setMatchingLoanId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMatchRepayment}
              disabled={!matchingLoanId || matchingLoading}
            >
              {matchingLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Match Repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Results Dialog */}
      <Dialog open={syncResultsDialogOpen} onOpenChange={setSyncResultsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>M-Pesa Sync Results</DialogTitle>
          </DialogHeader>
          {syncResults && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                <p className="text-sm font-medium text-blue-900">{syncResults.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-green-50">
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-2xl font-bold text-green-600">{syncResults.stats?.created || 0}</p>
                </div>
                <div className="rounded-lg border p-3 bg-blue-50">
                  <p className="text-sm text-gray-600">Applied</p>
                  <p className="text-2xl font-bold text-blue-600">{syncResults.stats?.applied || 0}</p>
                </div>
                <div className="rounded-lg border p-3 bg-yellow-50">
                  <p className="text-sm text-gray-600">Skipped</p>
                  <p className="text-2xl font-bold text-yellow-600">{syncResults.stats?.skipped || 0}</p>
                </div>
                <div className="rounded-lg border p-3 bg-red-50">
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{syncResults.stats?.errors || 0}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncResultsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Alert */}
      {AlertComponent}
    </div>
  );
}
