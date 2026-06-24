import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminApi, formatKES, formatDate, Receipt, getFileUrl } from '../types/api';
import { generateReceiptHTML, getPdfLogoUrl } from '../utils/pdfTemplates';
import { secureStorage } from '@/utils/secureStorage';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function AdminReceipts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('Jecri Bureau');
  const limit = 20;

  useEffect(() => {
    const check = async () => {
      const token = await secureStorage.getToken();
      const storedUser = await secureStorage.getUser();
      if (!token || !storedUser || !['admin', 'manager'].includes(storedUser.role)) {
        navigate('/login');
        return;
      }
      try {
        const settings = await adminApi.getConfig();
        setCompanyName(settings?.data?.company_name || 'Jecri Bureau');
      } catch { /* ignore */ }
      loadReceipts();
    };
    check();
  }, [page]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReceipts({ page, limit, search: search || undefined });
      setReceipts(res?.data?.receipts || []);
      setTotal(res?.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: number, receiptNumber: string) => {
    setDownloadingReceiptId(id);
    try {
      const res = await adminApi.getReceipt(id);
      const r = res?.data;
      if (!r) throw new Error('Receipt not found');

      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.createElement('div');
      element.innerHTML = generateReceiptHTML({
        repayment: {
          id: r.repayment_id,
          loan_id: r.loan_id,
          amount: Number(r.repayment_amount) || Number(r.amount) || 0,
          principal_paid: Number(r.principal_paid) || 0,
          interest_paid: Number(r.interest_paid) || 0,
          penalty_paid: Number(r.penalty_paid) || 0,
          payment_method: r.payment_method || 'mpesa',
          reference_number: r.reference_number || '',
          paid_at: r.paid_at || r.generated_at,
        } as any,
        loan: { id: r.loan_id } as any,
        borrowerName: r.borrower_name || 'N/A',
        borrowerEmail: r.borrower_email || '',
        companyName,
        companyLogoUrl: getPdfLogoUrl(),
        loanAmount: Number(r.total_amount) || undefined,
        loanStatus: r.loan_status || undefined,
        disbursedAt: r.disbursed_at || undefined,
        remainingBalance: r.remaining_balance != null ? Number(r.remaining_balance) : undefined,
      });
      const opt = { margin: 0.5, filename: `${receiptNumber}.pdf`, image: { type: 'png' as const, quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { orientation: 'portrait' as const, unit: 'in', format: 'a4' } };
      await html2pdf().set(opt).from(element).save();
      toast.success('Receipt downloaded successfully');
    } catch (err: any) {
      console.error('Failed to download receipt:', err);
      toast.error(err.message || 'Failed to download receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Payment Receipts</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search receipts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadReceipts(); } }}
          />
          <Button variant="outline" className="min-h-[44px]" onClick={() => { setPage(1); loadReceipts(); }}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
          <CardDescription>Manage payment receipts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : receipts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No receipts found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead className="hidden sm:table-cell">Loan ID</TableHead>
                      <TableHead className="hidden md:table-cell">Borrower</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{r.receipt_number}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">#{r.loan_id}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs sm:text-sm">{r.borrower_name || '-'}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">{formatKES(r.amount)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{formatDate(r.generated_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="min-h-[44px] h-auto" onClick={() => handleDownload(r.id, r.receipt_number)} disabled={downloadingReceiptId === r.id}>
                            {downloadingReceiptId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} variant="outline" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
