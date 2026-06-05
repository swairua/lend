import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { Loader2, ChevronLeft, RefreshCw, Eye, Trash2, Plus } from 'lucide-react';
import { adminApi, formatKES, formatDate } from '../types/api';
import { toast } from 'sonner';
import { normalizeList } from '../utils/normalize';
import { useAlert } from '@/hooks/use-alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Disbursement {
  id: number;
  loan_id: number;
  borrower_name: string;
  borrower_email: string;
  amount: number;
  disbursement_method: string;
  reference_number: string;
  status: string;
  created_at: string;
  loan_status: string;
}

interface DisbursementForm {
  loan_id: string;
  amount: string;
  disbursement_method: 'bank_transfer' | 'mpesa' | 'cheque' | 'cash';
  reference_number: string;
}

export default function AdminDisbursements() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDisbursementDialogOpen, setAddDisbursementDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalDisbursements, setTotalDisbursements] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [disbursementForm, setDisbursementForm] = useState<DisbursementForm>({
    loan_id: '',
    amount: '',
    disbursement_method: 'bank_transfer',
    reference_number: '',
  });
  const { showAlert, confirm, AlertComponent } = useAlert();

  useEffect(() => {
    loadDisbursements();
  }, []);

  const loadDisbursements = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.getDisbursements?.() || { data: [] };

      const data = normalizeList<Disbursement>(response);
      setDisbursements(data as Disbursement[]);
      setTotalDisbursements((data as Disbursement[]).length);
      setTotalAmount(
        Array.isArray(data)
          ? (data as Disbursement[]).reduce((sum: number, d: any) => sum + (Number((d as any).amount) || 0), 0)
          : 0
      );
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to load disbursements';
      console.error('Failed to load disbursements:', errorMsg);
      setError(errorMsg);
      setDisbursements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    confirm('Delete this disbursement record?', async () => {
      try {
        await adminApi.deleteDisbursement?.(id);
        await loadDisbursements();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
      }
    });
  };

  const handleAddDisbursement = async () => {
    if (!disbursementForm.loan_id || !disbursementForm.amount) {
      showAlert({ type: 'error', message: 'Please fill in loan ID and amount' });
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createDisbursement?.({
        loan_id: parseInt(disbursementForm.loan_id),
        amount: parseFloat(disbursementForm.amount),
        disbursement_method: disbursementForm.disbursement_method,
        reference_number: disbursementForm.reference_number || undefined,
      });

      toast.success(`Disbursement of ${formatKES(parseFloat(disbursementForm.amount))} recorded successfully`);

      setDisbursementForm({
        loan_id: '',
        amount: '',
        disbursement_method: 'bank_transfer',
        reference_number: '',
      });
      setAddDisbursementDialogOpen(false);
      await loadDisbursements();
    } catch (err: any) {
      showAlert({
        type: 'error',
        message: err.message || 'Failed to record disbursement',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDisbursements = disbursements.filter(d => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      d.borrower_name?.toLowerCase().includes(search) ||
      d.borrower_email?.toLowerCase().includes(search) ||
      String(d.loan_id).includes(search) ||
      d.reference_number?.toLowerCase().includes(search)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && disbursements.length === 0) {
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
          <h1 className="text-lg md:text-2xl font-bold">Disbursements</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={loadDisbursements} className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDisbursementDialogOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Add Disbursement
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
              <div className="flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Total Disbursed</p>
                <p className="text-lg md:text-2xl font-bold">{formatKES(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 md:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Disbursements</p>
                <p className="text-lg md:text-2xl font-bold">{totalDisbursements}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="p-2 md:p-3 lg:p-4">
          <Input
            placeholder="Search borrower, loan ID, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-2 md:p-3 lg:p-4">
          {filteredDisbursements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No disbursements found</p>
          ) : (
            <ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableHead>Loan ID</ResponsiveTableHead>
                <ResponsiveTableHead>Borrower</ResponsiveTableHead>
                <ResponsiveTableHead>Amount</ResponsiveTableHead>
                <ResponsiveTableHead>Method</ResponsiveTableHead>
                <ResponsiveTableHead>Status</ResponsiveTableHead>
                <ResponsiveTableHead>Date</ResponsiveTableHead>
                <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {filteredDisbursements.map(disbursement => (
                  <ResponsiveTableRow key={disbursement.id}>
                    <ResponsiveTableCell className="font-medium">#{disbursement.loan_id}</ResponsiveTableCell>
                    <ResponsiveTableCell className="text-sm">
                      <div>{disbursement.borrower_name}</div>
                      <div className="text-xs text-muted-foreground">{disbursement.borrower_email}</div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="font-semibold">{formatKES(disbursement.amount)}</ResponsiveTableCell>
                    <ResponsiveTableCell className="text-sm capitalize">
                      {disbursement.disbursement_method.replace('_', ' ')}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <Badge className={getStatusColor(disbursement.status)}>
                        {disbursement.status}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-sm text-muted-foreground">
                      {formatDate(disbursement.created_at)}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDisbursement(disbursement);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(disbursement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disbursement Details</DialogTitle>
          </DialogHeader>
          {selectedDisbursement && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Loan ID</p>
                <p className="text-lg font-semibold">#{selectedDisbursement.loan_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Borrower</p>
                <p className="text-lg font-semibold">{selectedDisbursement.borrower_name}</p>
                <p className="text-sm text-muted-foreground">{selectedDisbursement.borrower_email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold">{formatKES(selectedDisbursement.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Method</p>
                <p className="text-lg capitalize">{selectedDisbursement.disbursement_method.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={getStatusColor(selectedDisbursement.status)}>
                  {selectedDisbursement.status}
                </Badge>
              </div>
              {selectedDisbursement.reference_number && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reference</p>
                  <p className="text-sm">{selectedDisbursement.reference_number}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-sm">{formatDate(selectedDisbursement.created_at)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Disbursement Dialog */}
      <Dialog open={addDisbursementDialogOpen} onOpenChange={setAddDisbursementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Disbursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="loan-id">Loan ID</Label>
              <Input
                id="loan-id"
                type="number"
                placeholder="Enter loan ID"
                value={disbursementForm.loan_id}
                onChange={(e) => setDisbursementForm({ ...disbursementForm, loan_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={disbursementForm.amount}
                onChange={(e) => setDisbursementForm({ ...disbursementForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="method">Disbursement Method</Label>
              <Select value={disbursementForm.disbursement_method} onValueChange={(value: any) => setDisbursementForm({ ...disbursementForm, disbursement_method: value })}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                placeholder="Enter reference number"
                value={disbursementForm.reference_number}
                onChange={(e) => setDisbursementForm({ ...disbursementForm, reference_number: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDisbursementDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDisbursement} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Disbursement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {AlertComponent}
    </div>
  );
}
