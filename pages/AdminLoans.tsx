import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { adminApi, formatKES, formatDate, getFileUrl, Loan } from '../types/api';
import { generateInvoiceHTML, resolveLogoUrl } from '../utils/pdfTemplates';
import { normalizeList } from '../utils/normalize';
import { secureStorage } from '../utils/secureStorage';
import { Loader2, Eye, Check, X, Wallet, Send, Download, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle, RefreshCw, Calendar, FileText } from 'lucide-react';
import { useAlert } from '@/hooks/use-alert';
import { toast } from 'sonner';


interface LoanCounts {
  all: number;
  pending: number;
  approved: number;
  released: number;
  active: number;
  completed: number;
  rejected: number;
  defaulted: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-blue-100 text-blue-800';
    case 'released': return 'bg-teal-100 text-teal-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'defaulted': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function AdminLoans() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [counts, setCounts] = useState<LoanCounts>({ all: 0, pending: 0, approved: 0, released: 0, active: 0, completed: 0, rejected: 0, defaulted: 0 });
  const [userRole, setUserRole] = useState<string>('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLoans, setTotalLoans] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [companyName, setCompanyName] = useState('LENDING PLATFORM');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const response = await adminApi.getLoans({ status, page, limit: 20 });
      const loansData = normalizeList<Loan>(response);
      setLoans(loansData as Loan[]);
      const total = (response?.data?.pagination?.total) ?? 0;
      setTotalLoans(total);
      setTotalPages(Math.ceil(total / 20));
    } catch (error) {
      console.error('Failed to load loans:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  const loadCounts = useCallback(async () => {
    try {
      const response: any = await adminApi.getLoans({ limit: 1 });
      const total = response?.data?.pagination?.total ?? response?.pagination?.total ?? 0;
      setCounts(prev => ({ ...prev, all: total }));
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  }, []);

  const loadCountsByStatus = useCallback(async (status: string) => {
    try {
      const res: any = await adminApi.getLoans({ status, limit: 1 });
      const total = res?.data?.pagination?.total ?? res?.pagination?.total ?? 0;
      setCounts(prev => ({ ...prev, [status]: total }));
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  }, []);

  useEffect(() => {
    loadLoans();
  }, [page, statusFilter]);

  useEffect(() => {
    if (statusFilter !== 'all') {
      loadCountsByStatus(statusFilter);
    } else {
      loadCounts();
    }
  }, [statusFilter, loadCountsByStatus, loadCounts]);

  useEffect(() => {
    const preloadAllStatusCounts = async () => {
      const statuses = ['pending', 'approved', 'released', 'active', 'completed', 'rejected', 'defaulted'];
      for (const status of statuses) {
        await loadCountsByStatus(status);
      }
    };
    preloadAllStatusCounts();
  }, [loadCountsByStatus]);

  useEffect(() => {
    secureStorage.getUser().then(u => { if (u?.role) setUserRole(u.role); });
  }, []);

  const loadCompanySettings = useCallback(async () => {
    try {
      const res = await adminApi.getConfig();
      if (res.success && res.data) {
        const configArray = Array.isArray(res.data) ? res.data :
          res.data.data ? res.data.data :
          Object.entries(res.data).map(([k, v]) => ({ key_name: k, key_value: v }));
        const settings = Object.fromEntries(configArray.map((item: any) => [item.key_name, item.key_value]));
        setCompanyName(settings.company_name || 'LENDING PLATFORM');
        setCompanyLogoUrl(getFileUrl(settings.company_logo) || null);
      }
    } catch (err) {
      console.warn('Could not load company settings:', err);
    }
  }, []);

  useEffect(() => {
    loadCompanySettings();
  }, [loadCompanySettings]);

  const handleRefresh = async () => {
    const now = Date.now();
    const cooldownMs = 500;
    if (now - lastRefreshTime < cooldownMs) return;

    setLastRefreshTime(now);
    setRefreshing(true);
    try {
      await loadLoans();
      await loadCounts();
      if (statusFilter !== 'all') {
        await loadCountsByStatus(statusFilter);
      }
    } finally {
      setTimeout(() => setRefreshing(false), cooldownMs);
    }
  };

  const refreshAfterUpdate = async () => {
    await loadLoans();
    if (statusFilter !== 'all') {
      await loadCountsByStatus(statusFilter);
    } else {
      await loadCounts();
    }
    if (selectedLoan) {
      try {
        const res: any = await adminApi.getLoan(selectedLoan.id);
        const freshData = res.data?.data || res.data || res;
        setSelectedLoan(freshData);
      } catch (error) {
        console.error('Failed to refresh selected loan:', error);
      }
    }
  };
  
  const { showAlert, confirm, AlertComponent } = useAlert();
  
  const handleApprove = async (loanId: number, approve: boolean) => {
    if (approve) {
      confirm('Approve this loan application?', async () => {
        setActionLoading(true);
        try {
          await adminApi.approveLoan(loanId, true);
          toast.success('Loan approved successfully');
          await refreshAfterUpdate();
        } catch (error: any) {
          showAlert({ type: 'error', message: error.message });
          toast.error(error.message || 'Failed to approve loan');
        } finally {
          setActionLoading(false);
        }
      });
    } else {
      setSelectedLoan(loans.find(l => l.id === loanId) || null);
      setRejectDialogOpen(true);
      return;
    }
  };

  const handleReject = async () => {
    if (!selectedLoan) return;
    setActionLoading(true);
    try {
      await adminApi.approveLoan(selectedLoan.id, false, rejectionReason);
      toast.success('Loan rejected successfully');
      await refreshAfterUpdate();
      setRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
      toast.error(error.message || 'Failed to reject loan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async (loanId: number) => {
    confirm('Release this loan for disbursement?', async () => {
      setActionLoading(true);
      try {
        await adminApi.releaseLoan(loanId);
        toast.success('Loan released for disbursement');
        await refreshAfterUpdate();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
        toast.error(error.message || 'Failed to release loan');
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleDisburse = async (loanId: number) => {
    confirm('Disburse this loan?', async () => {
      setActionLoading(true);
      try {
        await adminApi.disburseLoan(loanId);
        toast.success('Loan disbursed successfully');
        await refreshAfterUpdate();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
        toast.error(error.message || 'Failed to disburse loan');
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleGenerateInvoice = async (loan: Loan) => {
    setDownloadingInvoiceId(loan.id);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.createElement('div');
      const pdfLogoUrl = await resolveLogoUrl(companyLogoUrl);
      element.innerHTML = generateInvoiceHTML({
        loan,
        borrowerName: loan.borrower_name || 'N/A',
        borrowerEmail: loan.borrower_email || 'N/A',
        totalPaid: loan.total_paid || 0,
        balance: loan.balance || 0,
        companyName,
        companyLogoUrl: pdfLogoUrl,
      });
      await Promise.all([...element.querySelectorAll('img')].map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); })));
      const opt = { margin: 0.5, filename: `Invoice_Loan${loan.id}.pdf`, image: { type: 'png' as const, quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { orientation: 'portrait' as const, unit: 'in', format: 'a4' } };
      await html2pdf().set(opt).from(element).save();
      toast.success('Invoice downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download invoice');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleMarkDefaulted = async (loanId: number) => {
    confirm('Mark this loan as defaulted?', async () => {
      setActionLoading(true);
      try {
        await adminApi.markDefaulted(loanId);
        toast.success('Loan marked as defaulted');
        await refreshAfterUpdate();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
        toast.error(error.message || 'Failed to mark loan as defaulted');
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleReactivate = async (loanId: number) => {
    confirm('Reactivate this loan? It will be set back to pending.', async () => {
      setActionLoading(true);
      try {
        await adminApi.reactivateLoan(loanId);
        toast.success('Loan reactivated successfully');
        await refreshAfterUpdate();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
        toast.error(error.message || 'Failed to reactivate loan');
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleSyncPayments = async (loanId: number) => {
    setActionLoading(true);
    try {
      const result = await adminApi.syncMpesaPayments(loanId);
      toast.success(`Applied: ${result.data.applied}, Created: ${result.data.created}`);
      await refreshAfterUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync payments');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLoans = loans.filter((loan: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      loan.borrower_name?.toLowerCase().includes(search) ||
      loan.borrower_email?.toLowerCase().includes(search) ||
      loan.product_name?.toLowerCase().includes(search) ||
      String(loan.id).includes(search)
    );
  });

  if (loading && loans.length === 0) {
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
          <h1 className="text-xl md:text-2xl font-bold">Loan Management</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <span className="text-xs md:text-sm text-muted-foreground self-start sm:self-center">{totalLoans} loans</span>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/reports')} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-8 gap-2 mb-4">
        <Card className={`cursor-pointer hover:border-primary ${statusFilter === 'all' ? 'border-primary bg-primary/5' : ''}`} onClick={() => { setStatusFilter('all'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold">{counts.all}</p>
            <p className="text-xs text-muted-foreground">All</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-yellow-500 ${statusFilter === 'pending' ? 'border-yellow-500 bg-yellow-50' : ''}`} onClick={() => { setStatusFilter('pending'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-yellow-600">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-blue-500 ${statusFilter === 'approved' ? 'border-blue-500 bg-blue-50' : ''}`} onClick={() => { setStatusFilter('approved'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-blue-600">{counts.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-teal-500 ${statusFilter === 'released' ? 'border-teal-500 bg-teal-50' : ''}`} onClick={() => { setStatusFilter('released'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-teal-600">{counts.released}</p>
            <p className="text-xs text-muted-foreground">Released</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-green-500 ${statusFilter === 'active' ? 'border-green-500 bg-green-50' : ''}`} onClick={() => { setStatusFilter('active'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-green-600">{counts.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-gray-500 ${statusFilter === 'completed' ? 'border-gray-500 bg-gray-50' : ''}`} onClick={() => { setStatusFilter('completed'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-gray-600">{counts.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-red-500 ${statusFilter === 'rejected' ? 'border-red-500 bg-red-50' : ''}`} onClick={() => { setStatusFilter('rejected'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-red-600">{counts.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-purple-500 ${statusFilter === 'defaulted' ? 'border-purple-500 bg-purple-50' : ''}`} onClick={() => { setStatusFilter('defaulted'); setPage(1); }}>
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-purple-600">{counts.defaulted}</p>
            <p className="text-xs text-muted-foreground">Defaulted</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by name, email, product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Loans Table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable>
            <caption className="sr-only">Admin loans table showing loan details including borrower, product, amount, balance, and status</caption>
            <ResponsiveTableHeader className="bg-muted/50">
              <tr>
                <ResponsiveTableHead className="text-left">ID</ResponsiveTableHead>
                <ResponsiveTableHead className="text-left">Borrower</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden sm:table-cell text-left">Product</ResponsiveTableHead>
                <ResponsiveTableHead className="text-right">Amount</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden sm:table-cell text-right">Balance</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Status</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden md:table-cell text-left">Applied</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Actions</ResponsiveTableHead>
              </tr>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {filteredLoans.map((loan) => (
                <ResponsiveTableRow key={loan.id}>
                  <ResponsiveTableCell label="ID" className="font-medium md:p-3 p-2 text-xs md:text-sm">#{loan.id}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Borrower" className="md:p-3 p-2">
                    <p className="font-medium text-xs md:text-base">{loan.borrower_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loan.borrower_email}</p>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Product" className="hidden sm:table-cell md:p-3 p-2">
                    <p className="text-xs md:text-sm">{loan.product_name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{loan.category_name || '-'}</p>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Amount" className="text-right font-medium md:p-3 p-2 text-xs md:text-sm">{formatKES(loan.principal_amount)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Balance" className="hidden sm:table-cell text-right md:p-3 p-2 text-xs md:text-sm">{formatKES(loan.balance || loan.total_amount)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Status" className="text-center md:p-3 p-2">
                    <Badge className={`${getStatusColor(loan.status)} text-xs`}>{getStatusLabel(loan.status)}</Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Applied" className="hidden md:table-cell text-xs md:text-sm text-muted-foreground md:p-3 p-2">{formatDate(loan.created_at)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Actions" className="md:p-3 p-2">
                    <div className="flex items-center justify-center gap-0.5 flex-wrap md:flex-nowrap">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedLoan(loan); setDialogOpen(true); }} title="View">
                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      {loan.status === 'pending' && userRole === 'admin' && (
                        <>
                          <Button size="sm" variant="ghost" className="text-green-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleApprove(loan.id, true)} title="Approve">
                            <Check className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleApprove(loan.id, false)} title="Reject">
                            <X className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </>
                      )}
                      {loan.status === 'approved' && (userRole === 'admin' || userRole === 'releaser') && (
                        <Button size="sm" variant="ghost" className="text-teal-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleRelease(loan.id)} title="Release">
                          <Send className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      )}
                      {loan.status === 'released' && (userRole === 'admin' || userRole === 'releaser') && (
                        <Button size="sm" variant="ghost" className="text-blue-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleDisburse(loan.id)} title="Disburse">
                          <Wallet className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      )}
                      {loan.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2"
                            onClick={() => handleGenerateInvoice(loan)}
                            title="Generate Invoice"
                            disabled={downloadingInvoiceId === loan.id}
                          >
                            {downloadingInvoiceId === loan.id ? (
                              <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                            ) : (
                              <FileText className="h-3 w-3 md:h-4 md:w-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-blue-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => navigate(`/admin/loans/${loan.id}/repayment-schedule`)} title="Repayment Schedule">
                            <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-orange-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleMarkDefaulted(loan.id)} title="Default">
                            <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </>
                      )}
                      {(loan.status === 'rejected' || loan.status === 'defaulted') && (
                        <Button size="sm" variant="ghost" className="text-purple-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleReactivate(loan.id)} title="Reactivate">
                          <RotateCcw className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      )}
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
          {filteredLoans.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'No loans found'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Loan Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-2xl">Loan #{selectedLoan?.id}</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Borrower</p>
                  <p className="font-medium text-sm md:text-base">{selectedLoan.borrower_name}</p>
                  <p className="text-xs md:text-sm">{selectedLoan.borrower_email}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Product</p>
                  <p className="font-medium text-sm md:text-base">{selectedLoan.product_name || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Principal</p>
                  <p className="text-lg md:text-xl font-bold">{formatKES(selectedLoan.principal_amount)}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg md:text-xl font-bold">{formatKES(selectedLoan.total_amount)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs md:text-sm text-muted-foreground">Interest</p><p className="font-medium text-sm md:text-base">{formatKES(selectedLoan.interest_amount)}</p></div>
                <div><p className="text-xs md:text-sm text-muted-foreground">Fee</p><p className="font-medium text-sm md:text-base">{formatKES(selectedLoan.processing_fee)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs md:text-sm text-muted-foreground">Paid</p><p className="font-medium text-sm md:text-base text-green-600">{formatKES(selectedLoan.total_paid)}</p></div>
                <div><p className="text-xs md:text-sm text-muted-foreground">Balance</p><p className="font-medium text-sm md:text-base text-orange-600">{formatKES(selectedLoan.balance)}</p></div>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(selectedLoan.status)}>{getStatusLabel(selectedLoan.status)}</Badge>
              </div>
              {(selectedLoan as any)?.rejection_reason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs md:text-sm text-red-600 font-medium">Rejection Reason</p>
                  <p className="text-xs md:text-sm">{(selectedLoan as any).rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Close</Button>
            {(selectedLoan?.status === 'active' || selectedLoan?.status === 'completed') && (
              <Button
                variant="secondary"
                onClick={() => handleSyncPayments(selectedLoan.id)}
                disabled={actionLoading}
                className="w-full sm:w-auto"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sync Payments
              </Button>
            )}
            {selectedLoan?.status === 'pending' && userRole === 'admin' && (
              <>
                <Button variant="destructive" onClick={() => { setDialogOpen(false); handleApprove(selectedLoan.id, false); }} className="w-full sm:w-auto">Reject</Button>
                <Button onClick={() => { setDialogOpen(false); handleApprove(selectedLoan.id, true); }} className="w-full sm:w-auto">Approve</Button>
              </>
            )}
            {selectedLoan?.status === 'approved' && (userRole === 'admin' || userRole === 'releaser') && (
              <Button onClick={() => { setDialogOpen(false); handleRelease(selectedLoan.id); }} className="w-full sm:w-auto">Release</Button>
            )}
            {selectedLoan?.status === 'released' && (userRole === 'admin' || userRole === 'releaser') && (
              <Button onClick={() => { setDialogOpen(false); handleDisburse(selectedLoan.id); }} className="w-full sm:w-auto">Disburse</Button>
            )}
            {(selectedLoan?.status === 'rejected' || selectedLoan?.status === 'defaulted') && <Button onClick={() => { setDialogOpen(false); handleReactivate(selectedLoan.id); }} className="w-full sm:w-auto">Reactivate</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Please provide a reason for rejecting this loan application.</p>
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <textarea className="w-full p-2 border rounded-md mt-1" rows={4} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Enter reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject Loan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Custom Alert */}
      {AlertComponent}
    </div>
  );
}
