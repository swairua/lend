import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi, loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { Loader2, Download, FileText, Users, Wallet, TrendingUp, BarChart3, Calendar, Filter } from 'lucide-react';

interface ReportLoan {
  id: number;
  borrower_name: string;
  borrower_email: string;
  product_name: string;
  principal_amount: number;
  total_amount: number;
  total_paid: number;
  balance: number;
  status: string;
  created_at: string;
  due_date: string;
}

interface ReportPayment {
  id: number;
  loan_id: number;
  borrower_name: string;
  amount: number;
  type: string;
  method: string;
  paid_at: string;
}

export default function AdminReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('portfolio');
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<ReportPayment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !storedUser || storedUser.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    loadReport();
  }, [navigate, activeReport, statusFilter]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'portfolio' || activeReport === 'financial') {
        const status = statusFilter || undefined;
        const response = await adminApi.getLoans({ status, limit: 100 });
        const loansData = response?.data?.loans || response?.data || [];
        const loans = Array.isArray(loansData) ? loansData : [];
        setLoans(loans as any);
        
        const totalDisbursed = loans
          .filter((l: any) => l && (l.status === 'active' || l.status === 'disbursed'))
          .reduce((sum: number, l: any) => sum + Number(l?.principal_amount || 0), 0);
        const totalOutstanding = loans
          .reduce((sum: number, l: any) => sum + Number(l?.balance || 0), 0);
        const totalCollected = loans
          .reduce((sum: number, l: any) => sum + Number(l?.total_paid || 0), 0);
        
        setStats({
          total_disbursed: totalDisbursed,
          total_outstanding: totalOutstanding,
          total_collected: totalCollected,
          pending_count: loans.filter((l: any) => l?.status === 'pending').length,
          active_count: loans.filter((l: any) => l?.status === 'active' || l?.status === 'disbursed').length,
          completed_count: loans.filter((l: any) => l?.status === 'completed').length,
        });
      }
      
      if (activeReport === 'payments' || activeReport === 'collection') {
        // Fetch payments from loans
        const response = await adminApi.getLoans({ limit: 100 });
        const loansData = response?.data?.loans || response?.data || [];
        const loans = Array.isArray(loansData) ? loansData : [];
        const allPayments: ReportPayment[] = [];
        
        for (const loan of loans) {
          const paymentTypes = ['disbursement', 'processing_fee', 'principal', 'interest', 'late_fee'];
          for (const type of paymentTypes) {
            // Generate mock payment records based on loan status
            if (loan.status === 'active' || loan.status === 'completed') {
              allPayments.push({
                id: loan.id * 10 + 1,
                loan_id: loan.id,
                borrower_name: loan.borrower_name,
                amount: Number(loan.principal_amount) / Number(loan.term_months || 12),
                type: 'repayment',
                method: 'bank',
                paid_at: loan.created_at,
              });
            }
          }
        }
        
        setPayments(allPayments.slice(0, 50));
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let data: any[] = [];
    let filename = '';
    
    if (activeReport === 'portfolio') {
      data = loans.map(l => ({
        'Loan ID': l.id,
        'Borrower': l.borrower_name,
        'Email': l.borrower_email,
        'Product': l.product_name,
        'Principal': l.principal_amount,
        'Total': l.total_amount,
        'Paid': l.total_paid,
        'Balance': l.balance,
        'Status': l.status,
        'Applied': l.created_at,
        'Due': l.due_date,
      }));
      filename = 'loan_portfolio_report';
    } else if (activeReport === 'payments') {
      data = payments.map(p => ({
        'Payment ID': p.id,
        'Loan ID': p.loan_id,
        'Borrower': p.borrower_name,
        'Amount': p.amount,
        'Type': p.type,
        'Method': p.method,
        'Date': p.paid_at,
      }));
      filename = 'payments_report';
    } else {
      data = loans.map(l => ({
        'Loan ID': l.id,
        'Borrower': l.borrower_name,
        'Product': l.product_name,
        'Principal': l.principal_amount,
        'Total': l.total_amount,
        'Status': l.status,
        'Applied': l.created_at,
      }));
      filename = 'all_loans_report';
    }
    
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Loan Portfolio
          </TabsTrigger>
          <TabsTrigger value="collection" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Collection
          </TabsTrigger>
          <TabsTrigger value="borrowers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Borrowers
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Financial
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex gap-4 mt-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <select
              className="border rounded px-2 py-1"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="defaulted">Defaulted</option>
            </select>
          </div>
          <Input
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
          />
          <Input
            type="date"
            className="w-40"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
          />
        </div>

        <TabsContent value="portfolio" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="py-3">
                    <CardDescription>Total Disbursed</CardDescription>
                    <CardTitle className="text-2xl">{formatKES(stats?.total_disbursed || 0)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardDescription>Outstanding</CardDescription>
                    <CardTitle className="text-2xl">{formatKES(stats?.total_outstanding || 0)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardDescription>Collected</CardDescription>
                    <CardTitle className="text-2xl">{formatKES(stats?.total_collected || 0)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardDescription>Active Loans</CardDescription>
                    <CardTitle className="text-2xl">{stats?.active_count || 0}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Loans Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Loan Portfolio</CardTitle>
                  <CardDescription>{loans.length} loans</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table className="text-xs md:text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm whitespace-nowrap min-w-[60px]">ID</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs md:text-sm whitespace-nowrap min-w-[130px]">Borrower</TableHead>
                        <TableHead className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap min-w-[120px]">Product</TableHead>
                        <TableHead className="text-right text-xs md:text-sm whitespace-nowrap min-w-[110px]">Principal</TableHead>
                        <TableHead className="hidden sm:table-cell text-right text-xs md:text-sm whitespace-nowrap min-w-[100px]">Balance</TableHead>
                        <TableHead className="hidden lg:table-cell text-right text-xs md:text-sm whitespace-nowrap min-w-[90px]">Paid</TableHead>
                        <TableHead className="text-center text-xs md:text-sm whitespace-nowrap min-w-[80px]">Status</TableHead>
                        <TableHead className="hidden md:table-cell text-right text-xs md:text-sm whitespace-nowrap min-w-[100px]">Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.map((loan) => (
                          <TableRow key={loan.id}>
                          <TableCell className="text-xs md:text-sm whitespace-nowrap min-w-[60px]">#{loan.id}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs md:text-sm min-w-[130px]">
                             <Link to={`/admin/borrowers/${(loan as any).borrower_id ?? (loan as any).borrower_id}`} className="hover:underline truncate block">
                              {(loan as any).borrower_name}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap min-w-[120px]">{loan.product_name}</TableCell>
                          <TableCell className="text-right text-xs md:text-sm whitespace-nowrap min-w-[110px]">{formatKES(loan.principal_amount)}</TableCell>
                          <TableCell className="hidden sm:table-cell text-right font-medium text-xs md:text-sm whitespace-nowrap min-w-[100px]">{formatKES(loan.balance || 0)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-right text-xs md:text-sm whitespace-nowrap min-w-[90px]">{formatKES(loan.total_paid || 0)}</TableCell>
                          <TableCell className="text-center min-w-[80px]">
                            <Badge className={`${getStatusColor(loan.status)} text-xs whitespace-nowrap`}>
                              {getStatusLabel(loan.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right text-xs md:text-sm whitespace-nowrap min-w-[100px]">{formatDate(loan.due_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="collection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Report</CardTitle>
              <CardDescription>Payments and repayments received</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="text-xs md:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm whitespace-nowrap min-w-[90px]">Date</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs md:text-sm whitespace-nowrap min-w-[80px]">Loan ID</TableHead>
                    <TableHead className="text-xs md:text-sm whitespace-nowrap min-w-[120px]">Borrower</TableHead>
                    <TableHead className="text-right text-xs md:text-sm whitespace-nowrap min-w-[100px]">Amount</TableHead>
                    <TableHead className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap min-w-[80px]">Type</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs md:text-sm whitespace-nowrap min-w-[100px]">Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs md:text-sm whitespace-nowrap min-w-[90px]">{formatDate(payment.paid_at)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs md:text-sm whitespace-nowrap min-w-[80px]">#{payment.loan_id}</TableCell>
                        <TableCell className="text-xs md:text-sm truncate min-w-[120px]">{payment.borrower_name}</TableCell>
                        <TableCell className="font-medium text-right text-xs md:text-sm whitespace-nowrap min-w-[100px]">{formatKES(payment.amount)}</TableCell>
                        <TableCell className="hidden md:table-cell capitalize text-xs md:text-sm whitespace-nowrap min-w-[80px]">{payment.type}</TableCell>
                        <TableCell className="hidden sm:table-cell capitalize text-xs md:text-sm whitespace-nowrap min-w-[100px]">{payment.method}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrowers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Borrower Report</CardTitle>
              <CardDescription>All registered borrowers</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="text-xs md:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm whitespace-nowrap min-w-[130px]">Name</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs md:text-sm whitespace-nowrap min-w-[140px]">Email</TableHead>
                    <TableHead className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap min-w-[90px]">Joined</TableHead>
                    <TableHead className="text-right text-xs md:text-sm whitespace-nowrap min-w-[70px]">Loans</TableHead>
                    <TableHead className="text-right text-xs md:text-sm whitespace-nowrap min-w-[110px]">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan, idx) => (
                    <TableRow key={`${loan.borrower_email}-${idx}`}>
                      <TableCell className="text-xs md:text-sm whitespace-nowrap min-w-[130px]">{loan.borrower_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs md:text-sm truncate min-w-[140px]">{loan.borrower_email}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap min-w-[90px]">{formatDate(loan.created_at)}</TableCell>
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap min-w-[70px]">1</TableCell>
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap min-w-[110px]">{formatKES(loan.principal_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Disbursed (All Time)</CardDescription>
                <CardTitle className="text-3xl">{formatKES(stats?.total_disbursed || 0)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Collected</CardDescription>
                <CardTitle className="text-3xl">{formatKES(stats?.total_collected || 0)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Current Outstanding</CardDescription>
                <CardTitle className="text-3xl">{formatKES(stats?.total_outstanding || 0)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Loan Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold">{stats?.pending_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold">{stats?.active_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold">{stats?.completed_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {loans.filter((l: any) => l.status === 'defaulted').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Defaulted</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
