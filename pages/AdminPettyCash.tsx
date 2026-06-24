import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi, formatKES, formatDate, PettyCashAccount, PettyCashTransaction } from '../types/api';
import { useNavigate } from 'react-router-dom';
import { secureStorage } from '@/utils/secureStorage';
import { Loader2, Plus, Check, X, Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAlert } from '@/hooks/use-alert';
import { toast } from 'sonner';

export default function AdminPettyCash() {
  const navigate = useNavigate();
  const { showAlert, confirm, AlertComponent } = useAlert();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState<PettyCashAccount[]>([]);
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const txnLimit = 20;
  const [acctDialogOpen, setAcctDialogOpen] = useState(false);
  const [txnDialogOpen, setTxnDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PettyCashAccount | null>(null);
  const [editTransaction, setEditTransaction] = useState<PettyCashTransaction | null>(null);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);
  const [topUpTarget, setTopUpTarget] = useState<PettyCashAccount | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState<PettyCashAccount | null>(null);
  const [issueAmount, setIssueAmount] = useState('');
  const [issueReason, setIssueReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [acctForm, setAcctForm] = useState({ name: '', type: 'cash_float', branch: '', balance: '' });
  const [txnForm, setTxnForm] = useState({ account_id: '', transaction_type: 'expense', amount: '', description: '', category: '' });

  const [reportTab, setReportTab] = useState('cashbook');
  const [cashBookData, setCashBookData] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStart, setReportStart] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [reportEnd, setReportEnd] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().split('T')[0]; });
  const [statementAccountId, setStatementAccountId] = useState('');

  useEffect(() => {
    const check = async () => {
      const token = await secureStorage.getToken();
      const storedUser = await secureStorage.getUser();
      if (!token || !storedUser || !['admin', 'manager'].includes(storedUser.role)) {
        navigate('/login');
        return;
      }
      loadData();
    };
    check();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const aRes = await adminApi.getPettyCashAccounts();
      setAccounts(aRes?.data?.accounts || []);
      await loadTransactions();
    } catch { } finally { setLoading(false); }
  };

  const loadTransactions = async (page = 1) => {
    setTxnPage(page);
    try {
      const res = await adminApi.getPettyCashTransactions({ page, limit: txnLimit });
      setTransactions(res?.data?.transactions || []);
      setTxnTotal(res?.data?.pagination?.total || 0);
    } catch { }
  };

  const handleSaveAccount = async () => {
    if (!acctForm.name) { showAlert({ type: 'warning', message: 'Account name is required' }); return; }
    setSaving(true);
    try {
      if (editAccount) {
        await adminApi.updatePettyCashAccount(editAccount.id, acctForm);
        toast.success('Account updated');
      } else {
        await adminApi.createPettyCashAccount({ ...acctForm, balance: Number(acctForm.balance) || 0 });
        toast.success('Account created');
      }
      setAcctDialogOpen(false);
      await loadData();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDeleteAccount = (acct: PettyCashAccount) => {
    confirm('Deactivate this account?', async () => {
      try {
        await adminApi.deletePettyCashAccount(acct.id);
        toast.success('Account deactivated');
        await loadData();
      } catch (e: any) { toast.error(e.message); }
    });
  };

  const handleActivateAccount = async (acct: PettyCashAccount) => {
    try {
      await adminApi.updatePettyCashAccount(acct.id, {
        name: acct.name, type: acct.type, branch: acct.branch || '', is_active: 1,
      });
      toast.success('Account activated');
      await loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleTopUp = async () => {
    if (!topUpTarget || !topUpAmount || Number(topUpAmount) <= 0) {
      showAlert({ type: 'warning', message: 'Enter a valid top-up amount' }); return;
    }
    setSaving(true);
    try {
      const res = await adminApi.createPettyCashTransaction({
        account_id: topUpTarget.id,
        transaction_type: 'adjustment',
        amount: Number(topUpAmount),
        description: 'Top-up / balance adjustment',
        category: 'top-up',
      });
      await adminApi.approvePettyCashTransaction(res.data.id, 'approved');
      toast.success(`Account topped up by ${formatKES(Number(topUpAmount))}`);
      setTopUpDialogOpen(false);
      setTopUpTarget(null);
      setTopUpAmount('');
      await loadData();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleIssueExpense = async () => {
    if (!issueTarget || !issueAmount || Number(issueAmount) <= 0) {
      showAlert({ type: 'warning', message: 'Enter a valid amount' }); return;
    }
    if (Number(issueAmount) > issueTarget.balance) {
      showAlert({ type: 'warning', message: 'Amount exceeds current balance' }); return;
    }
    setSaving(true);
    try {
      const res = await adminApi.createPettyCashTransaction({
        account_id: issueTarget.id,
        transaction_type: 'expense',
        amount: Number(issueAmount),
        description: issueReason || 'Petty cash expense',
        category: issueReason ? 'expense' : undefined,
      });
      await adminApi.approvePettyCashTransaction(res.data.id, 'approved');
      toast.success(`${formatKES(Number(issueAmount))} issued to ${issueTarget.name}`);
      setIssueDialogOpen(false);
      setIssueTarget(null);
      setIssueAmount('');
      setIssueReason('');
      await loadData();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleSaveTransaction = async () => {
    if (!txnForm.account_id || !txnForm.amount) { showAlert({ type: 'warning', message: 'Account and amount required' }); return; }
    setSaving(true);
    try {
      if (editTransaction) {
        await adminApi.updatePettyCashTransaction(editTransaction.id, {
          transaction_type: txnForm.transaction_type,
          amount: Number(txnForm.amount),
          description: txnForm.description || null,
          category: txnForm.category || null,
        });
        toast.success('Transaction updated');
      } else {
        await adminApi.createPettyCashTransaction({
          account_id: Number(txnForm.account_id),
          transaction_type: txnForm.transaction_type,
          amount: Number(txnForm.amount),
          description: txnForm.description || null,
          category: txnForm.category || null,
        });
        toast.success('Transaction created (pending approval)');
      }
      setTxnDialogOpen(false);
      setEditTransaction(null);
      setTxnForm({ account_id: '', transaction_type: 'expense', amount: '', description: '', category: '' });
      await loadTransactions();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleApprove = async (id: number, status: string) => {
    try {
      await adminApi.approvePettyCashTransaction(id, status);
      toast.success(`Transaction ${status}`);
      await loadTransactions();
      await loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const loadCashBook = async () => {
    try {
      const res = await adminApi.getPettyCashCashBook(reportStart, reportEnd);
      setCashBookData(res?.data);
    } catch { }
  };

  const loadDailySummary = async () => {
    try {
      const res = await adminApi.getPettyCashDailySummary(reportDate);
      setDailySummary(res?.data);
    } catch { }
  };

  const loadStatement = async () => {
    if (!statementAccountId) return;
    try {
      const res = await adminApi.getPettyCashStatement(Number(statementAccountId));
      setStatementData(res?.data);
    } catch { }
  };

  useEffect(() => { if (activeTab === 'reports') { loadCashBook(); } }, [activeTab]);

  const downloadCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows.length) { toast.error('No data to export'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const v = r[h] ?? '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const acctTypeLabel: Record<string, string> = { cash_float: 'Cash Float', branch_float: 'Branch Float', mobile_money: 'Mobile Money' };
  const txnTypeColor: Record<string, string> = { expense: 'text-red-600', reimbursement: 'text-green-600', transfer: 'text-blue-600', adjustment: 'text-orange-600' };
  const statusColor: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Petty Cash Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="accounts" className="text-xs sm:text-sm"><Wallet className="h-4 w-4 mr-1" /> Accounts</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs sm:text-sm"><RefreshCw className="h-4 w-4 mr-1" /> Transactions</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm"><FileText className="h-4 w-4 mr-1" /> Reports</TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditAccount(null); setAcctForm({ name: '', type: 'cash_float', branch: '', balance: '' }); setAcctDialogOpen(true); }} className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" /> Add Account
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acct) => (
              <Card key={acct.id} className={acct.is_active ? '' : 'opacity-60'}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{acct.name}</CardTitle>
                      <CardDescription>{acctTypeLabel[acct.type]}{acct.branch ? ` - ${acct.branch}` : ''}</CardDescription>
                    </div>
                    <Badge variant={acct.is_active ? 'default' : 'secondary'}>{acct.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-2xl font-bold">{formatKES(acct.balance)}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => { setEditAccount(acct); setAcctForm({ name: acct.name, type: acct.type, branch: acct.branch || '', balance: '' }); setAcctDialogOpen(true); }}>
                      Edit
                    </Button>
                    {acct.is_active ? (
                      <Button size="sm" variant="destructive" className="flex-1 min-h-[44px]" onClick={() => handleDeleteAccount(acct)}>
                        <X className="h-4 w-4 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => handleActivateAccount(acct)}>
                        <Check className="h-4 w-4 mr-1" /> Activate
                      </Button>
                    )}
                  </div>
                  {acct.is_active && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="secondary" className="flex-1 min-h-[44px]" onClick={() => { setIssueTarget(acct); setIssueAmount(''); setIssueReason(''); setIssueDialogOpen(true); }}>
                        <ArrowUpRight className="h-4 w-4 mr-1" /> Issue
                      </Button>
                      <Button size="sm" variant="secondary" className="flex-1 min-h-[44px]" onClick={() => { setTopUpTarget(acct); setTopUpAmount(''); setTopUpDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Top Up
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {accounts.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">No accounts yet</div>
            )}
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              <Select value={txnForm.account_id} onValueChange={(v) => setTxnForm({ ...txnForm, account_id: v })}>
                <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="All accounts" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditTransaction(null); setTxnForm({ account_id: accounts[0]?.id ? String(accounts[0].id) : '', transaction_type: 'expense', amount: '', description: '', category: '' }); setTxnDialogOpen(true); }} className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" /> New Transaction
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Account</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Type</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">Description</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-xs sm:text-sm">{txn.account_name}</TableCell>
                      <TableCell className={`hidden sm:table-cell text-xs sm:text-sm capitalize ${txnTypeColor[txn.transaction_type] || ''}`}>{txn.transaction_type}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{formatKES(txn.amount)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm truncate max-w-[200px]">{txn.description || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${statusColor[txn.status] || ''} text-xs`}>{txn.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{formatDate(txn.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {txn.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-green-600" onClick={() => handleApprove(txn.id, 'approved')} title="Approve"><Check className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-600" onClick={() => handleApprove(txn.id, 'rejected')} title="Reject"><X className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => { setEditTransaction(txn); setTxnForm({ account_id: String(txn.account_id), transaction_type: txn.transaction_type, amount: String(txn.amount), description: txn.description || '', category: txn.category || '' }); setTxnDialogOpen(true); }} title="Edit"><FileText className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {transactions.length === 0 && <p className="text-center py-8 text-muted-foreground">No transactions</p>}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {txnPage}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadCSV(transactions.map(t => ({ ID: t.id, Account: t.account_name, Type: t.transaction_type, Amount: t.amount, Description: t.description || '', Status: t.status, Date: t.created_at })), `petty-cash-transactions.csv`)}>
                Export CSV
              </Button>
              <Button onClick={() => loadTransactions(txnPage - 1)} disabled={txnPage <= 1} variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
              <Button onClick={() => loadTransactions(txnPage + 1)} disabled={txnPage * txnLimit >= txnTotal} variant="outline" size="sm"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Tabs value={reportTab} onValueChange={(v) => { setReportTab(v); if (v === 'daily') loadDailySummary(); }}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="cashbook" className="text-xs sm:text-sm">Cash Book</TabsTrigger>
              <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily Summary</TabsTrigger>
              <TabsTrigger value="statement" className="text-xs sm:text-sm">Statement</TabsTrigger>
            </TabsList>

            <TabsContent value="cashbook" className="space-y-3 mt-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div><Label className="text-xs">Start</Label><Input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="text-sm" /></div>
                <div><Label className="text-xs">End</Label><Input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="text-sm" /></div>
                <div className="flex items-end"><Button onClick={loadCashBook} className="min-h-[44px]">Load</Button></div>
              </div>
              {cashBookData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Opening Balance: <span className="font-bold">{formatKES(cashBookData.opening_balance)}</span></p>
                    <Button variant="outline" size="sm" onClick={() => downloadCSV((cashBookData.transactions || []).map((t: any) => ({ ID: t.id, Account: t.account_name, Type: t.transaction_type, Amount: t.amount, Description: t.description || '', Date: t.created_at })), `cash-book-${reportStart}-${reportEnd}.csv`)}>
                      Export CSV
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Account</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-right text-xs">Amount</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">Description</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashBookData.transactions?.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-xs">{txn.account_name}</TableCell>
                          <TableCell className="text-xs capitalize">{txn.transaction_type}</TableCell>
                          <TableCell className="text-right text-xs">{formatKES(txn.amount)}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs truncate max-w-[200px]">{txn.description || '-'}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs">{formatDate(txn.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="daily" className="space-y-3 mt-4">
              <div className="flex gap-2">
                <div><Label className="text-xs">Date</Label><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="text-sm" /></div>
                <div className="flex items-end"><Button onClick={loadDailySummary} className="min-h-[44px]">Load</Button></div>
              </div>
              {dailySummary && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Summary for {reportDate}</p>
                      {dailySummary.summary?.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => downloadCSV(dailySummary.summary.map((s: any) => ({ Account: s.account_name, Type: s.transaction_type, Count: s.count, Total: s.total })), `daily-summary-${reportDate}.csv`)}>
                          Export CSV
                        </Button>
                      )}
                    </div>
                    {dailySummary.summary?.length === 0 ? <p className="text-sm text-muted-foreground">No approved transactions on this date</p> : (
                      dailySummary.summary?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div>
                            <p className="text-sm font-medium">{s.account_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{s.transaction_type} ({s.count} txns)</p>
                          </div>
                          <p className="font-bold">{formatKES(s.total)}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="statement" className="space-y-3 mt-4">
              <div className="flex gap-2">
                <div className="w-64">
                  <Label className="text-xs">Account</Label>
                  <Select value={statementAccountId} onValueChange={setStatementAccountId}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end"><Button onClick={loadStatement} disabled={!statementAccountId} className="min-h-[44px]">Load</Button></div>
              </div>
              {statementData && (
                <>
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{statementData.account?.name}</CardTitle>
                          <CardDescription>{acctTypeLabel[statementData.account?.type || '']} {statementData.account?.branch ? `- ${statementData.account.branch}` : ''} | Balance: {formatKES(statementData.account?.balance || 0)}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => downloadCSV((statementData.transactions || []).map((t: any) => ({ ID: t.id, Type: t.transaction_type, Amount: t.amount, Description: t.description || '', Status: t.status, Date: t.created_at })), `statement-${statementData.account?.name || 'account'}.csv`)}>
                          Export CSV
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-right text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-center text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statementData.transactions?.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-xs capitalize">{txn.transaction_type}</TableCell>
                          <TableCell className="text-right text-xs">{formatKES(txn.amount)}</TableCell>
                          <TableCell className="text-xs truncate max-w-[200px]">{txn.description || '-'}</TableCell>
                          <TableCell className="text-center"><Badge className={`${statusColor[txn.status] || ''} text-xs`}>{txn.status}</Badge></TableCell>
                          <TableCell className="text-xs">{formatDate(txn.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Top Up Dialog */}
      <Dialog open={topUpDialogOpen} onOpenChange={(open) => { if (!open) { setTopUpDialogOpen(false); setTopUpTarget(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Top Up Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {topUpTarget && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-sm font-medium">{topUpTarget.name}</p>
                <p className="text-xs text-muted-foreground">Current Balance: {formatKES(topUpTarget.balance)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount (KES) *</Label>
              <Input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="Enter amount to add" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTopUpDialogOpen(false); setTopUpTarget(null); }}>Cancel</Button>
            <Button onClick={handleTopUp} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Top Up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Expense Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={(open) => { if (!open) { setIssueDialogOpen(false); setIssueTarget(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Issue Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {issueTarget && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-sm font-medium">{issueTarget.name}</p>
                <p className="text-xs text-muted-foreground">Current Balance: {formatKES(issueTarget.balance)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount (KES) *</Label>
              <Input type="number" value={issueAmount} onChange={(e) => setIssueAmount(e.target.value)} placeholder="Enter expense amount" />
            </div>
            {issueTarget && issueAmount && Number(issueAmount) > 0 && (
              <div className={`rounded-md p-3 ${Number(issueAmount) <= issueTarget.balance ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-sm font-medium">
                  Remaining Balance: <span className={Number(issueAmount) <= issueTarget.balance ? 'text-green-700' : 'text-red-700'}>{formatKES(issueTarget.balance - Number(issueAmount))}</span>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason / Description *</Label>
              <Input value={issueReason} onChange={(e) => setIssueReason(e.target.value)} placeholder="e.g., Office supplies, travel, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIssueDialogOpen(false); setIssueTarget(null); }}>Cancel</Button>
            <Button onClick={handleIssueExpense} disabled={saving || !issueAmount || Number(issueAmount) <= 0 || !issueReason}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Dialog */}
      <Dialog open={acctDialogOpen} onOpenChange={setAcctDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{editAccount ? 'Edit Account' : 'New Account'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input value={acctForm.name} onChange={(e) => setAcctForm({ ...acctForm, name: e.target.value })} placeholder="e.g., Main Cash Float" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={acctForm.type} onValueChange={(v) => setAcctForm({ ...acctForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_float">Cash Float</SelectItem>
                  <SelectItem value="branch_float">Branch Float</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money Float</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch (optional)</Label>
              <Input value={acctForm.branch} onChange={(e) => setAcctForm({ ...acctForm, branch: e.target.value })} placeholder="e.g., Nairobi Branch" />
            </div>
            {!editAccount && (
              <div className="space-y-2">
                <Label>Opening Balance (KES)</Label>
                <Input type="number" value={acctForm.balance} onChange={(e) => setAcctForm({ ...acctForm, balance: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcctDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAccount} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}{editAccount ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={txnDialogOpen} onOpenChange={(open) => { if (!open) setEditTransaction(null); setTxnDialogOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{editTransaction ? 'Edit Transaction' : 'New Transaction'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account *</Label>
              {editTransaction ? (
                <Input value={accounts.find(a => a.id === editTransaction.account_id)?.name || ''} disabled className="text-sm" />
              ) : (
                <Select value={txnForm.account_id} onValueChange={(v) => setTxnForm({ ...txnForm, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.is_active).map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={txnForm.transaction_type} onValueChange={(v) => setTxnForm({ ...txnForm, transaction_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="reimbursement">Reimbursement</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES) *</Label>
              <Input type="number" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={txnForm.description} onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })} placeholder="What is this for?" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={txnForm.category} onChange={(e) => setTxnForm({ ...txnForm, category: e.target.value })} placeholder="e.g., Office Supplies" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTxnDialogOpen(false); setEditTransaction(null); }}>Cancel</Button>
            <Button onClick={handleSaveTransaction} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}{editTransaction ? 'Update' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {AlertComponent}
    </div>
  );
}
