import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { PageTitle } from '@/components/PageTitle';
import { Loader2, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { loansApi, adminApi, repaymentsApi, formatKES, formatDate, getFileUrl, Receipt } from '../types/api';
import { generateReceiptHTML, resolveLogoUrl } from '../utils/pdfTemplates';
import { toast } from 'sonner';

interface RepaymentWithLoan {
  id: number;
  loan_id: number;
  amount: number;
  principal_paid: number;
  interest_paid: number;
  penalty_paid: number;
  payment_method: 'cash' | 'mpesa' | 'bank' | 'other';
  reference_number: string | null;
  paid_at: string;
  paid_by: number | null;
  loan_name?: string;
}

export default function BorrowerPayments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [repayments, setRepayments] = useState<RepaymentWithLoan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('LENDING PLATFORM');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('payments');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptTotal, setReceiptTotal] = useState(0);
  const [receiptSearch, setReceiptSearch] = useState('');
  const receiptLimit = 20;

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    const loadCompanySettings = async () => {
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
    };
    loadCompanySettings();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await loansApi.getMyLoans();
      const loans = (response as any)?.data?.loans || (response as any)?.loans || [];

      // Extract all repayments from all loans
      const allRepayments: RepaymentWithLoan[] = [];

      for (const loan of loans) {
        const loanDetails = await loansApi.getMyLoan(loan.id);
        const loanData = (loanDetails as any)?.data || loanDetails;
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

  const loadReceipts = async (page = 1) => {
    setReceiptsLoading(true);
    setReceiptPage(page);
    try {
      const res = await repaymentsApi.getMyReceipts({ page, limit: receiptLimit });
      const data = res?.data;
      setReceipts(data?.receipts || []);
      setReceiptTotal(data?.pagination?.total || 0);
    } catch { } finally { setReceiptsLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'receipts') loadReceipts();
  }, [activeTab]);

  const handleDownloadReceiptPdf = async (receipt: Receipt) => {
    try {
      setDownloadingReceiptId(receipt.id);
      const blob = await adminApi.getReceiptPdf(receipt.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${receipt.receipt_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch { toast.error('Failed to download receipt'); } finally { setDownloadingReceiptId(null); }
  };

  const handleDownloadReceipt = async (repayment: RepaymentWithLoan) => {
    try {
      setDownloadingReceiptId(repayment.id);
      const totalAmount = Number((repayment as any).total_amount) || 0;
      const totalPaid = Number((repayment as any).total_paid) || 0;
      const thisAmount = Number(repayment.amount) || 0;
      const balance = totalAmount - totalPaid;
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.createElement('div');
      const pdfLogoUrl = await resolveLogoUrl(companyLogoUrl);
      element.innerHTML = generateReceiptHTML({
        repayment: { ...repayment, loan_id: repayment.loan_id },
        loan: { id: repayment.loan_id } as any,
        borrowerName: '',
        borrowerEmail: '',
        companyName,
        companyLogoUrl: pdfLogoUrl,
        loanAmount: totalAmount || undefined,
        loanStatus: (repayment as any).loan_status || undefined,
        disbursedAt: (repayment as any).disbursed_at || undefined,
        remainingBalance: balance > 0 ? balance : 0,
      });
      await Promise.all([...element.querySelectorAll('img')].map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); })));
      const opt = { margin: 0.5, filename: `Receipt_${repayment.loan_id}_${repayment.id}.pdf`, image: { type: 'png' as const, quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { orientation: 'portrait' as const, unit: 'in', format: 'a4' } };
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

  return (
    <div className="space-y-4">
      <PageTitle title="Payment History" onBackClick={() => navigate('/loans')} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs sm:text-sm">Receipts</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {repayments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No payment history yet</p>
                <Button onClick={() => navigate('/loans')}>View My Loans</Button>
              </CardContent>
            </Card>
          ) : (
            <>
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
                        {formatKES(repayments.reduce((sum, r) => sum + Number(r.amount), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
            </>
          )}
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search receipt number..."
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {receiptsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <>
                  <ResponsiveTable>
                    <caption className="sr-only">Receipts history</caption>
                    <ResponsiveTableHeader>
                      <ResponsiveTableHead>Receipt #</ResponsiveTableHead>
                      <ResponsiveTableHead className="text-right">Loan ID</ResponsiveTableHead>
                      <ResponsiveTableHead className="text-right">Amount</ResponsiveTableHead>
                      <ResponsiveTableHead>Date</ResponsiveTableHead>
                      <ResponsiveTableHead className="text-center">Action</ResponsiveTableHead>
                    </ResponsiveTableHeader>
                    <ResponsiveTableBody>
                      {receipts.filter(r => !receiptSearch || r.receipt_number.toLowerCase().includes(receiptSearch.toLowerCase())).map((receipt) => (
                        <ResponsiveTableRow key={receipt.id}>
                          <ResponsiveTableCell label="Receipt #" className="font-mono text-xs sm:text-sm font-medium">{receipt.receipt_number}</ResponsiveTableCell>
                          <ResponsiveTableCell label="Loan ID" className="text-right text-xs sm:text-sm">#{receipt.loan_id}</ResponsiveTableCell>
                          <ResponsiveTableCell label="Amount" className="text-right font-bold text-green-600 text-xs sm:text-sm">{formatKES(receipt.amount)}</ResponsiveTableCell>
                          <ResponsiveTableCell label="Date" className="text-xs sm:text-sm text-muted-foreground">{formatDate(receipt.generated_at)}</ResponsiveTableCell>
                          <ResponsiveTableCell label="Action" className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadReceiptPdf(receipt)} disabled={downloadingReceiptId === receipt.id}>
                              {downloadingReceiptId === receipt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          </ResponsiveTableCell>
                        </ResponsiveTableRow>
                      ))}
                    </ResponsiveTableBody>
                  </ResponsiveTable>
                  {receipts.filter(r => !receiptSearch || r.receipt_number.toLowerCase().includes(receiptSearch.toLowerCase())).length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">No receipts found</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {receiptPage}</p>
            <div className="flex gap-2">
              <Button onClick={() => loadReceipts(receiptPage - 1)} disabled={receiptPage <= 1} variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
              <Button onClick={() => loadReceipts(receiptPage + 1)} disabled={receiptPage * receiptLimit >= receiptTotal} variant="outline" size="sm"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
