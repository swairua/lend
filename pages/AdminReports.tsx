import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi, loansApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { secureStorage } from '@/utils/secureStorage';
import { Loader2, Download, FileText, Users, Wallet, TrendingUp, BarChart3, Calendar, Filter, ChevronDown } from 'lucide-react';

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
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [borrowerLoanCounts, setBorrowerLoanCounts] = useState<Record<number, number>>({});
  const [borrowerLoanTotals, setBorrowerLoanTotals] = useState<Record<number, number>>({});
  const [stats, setStats] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [statusFilter, dateFrom, dateTo].filter(Boolean).length;

  useEffect(() => {
    const loadAndValidate = async () => {
      const token = await secureStorage.getToken();
      const storedUser = await secureStorage.getUser();

      if (!token || !storedUser || !['admin', 'releaser', 'manager', 'agent'].includes(storedUser.role)) {
        navigate('/login');
        return;
      }

      loadReport();
    };
    loadAndValidate();
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
          .filter((l: any) => l && (l.status === 'active' || l.status === 'disbursing' || l.status === 'disbursed' || l.status === 'completed'))
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
          active_count: loans.filter((l: any) => l?.status === 'active' || l?.status === 'disbursing' || l?.status === 'disbursed').length,
          completed_count: loans.filter((l: any) => l?.status === 'completed').length,
          defaulted_count: loans.filter((l: any) => l?.status === 'defaulted').length,
        });
      }
      
      if (activeReport === 'payments' || activeReport === 'collection') {
        const response = await adminApi.getRepayments({ limit: 1000 });
        const rows = response?.data?.repayments || [];
        const allPayments: ReportPayment[] = (Array.isArray(rows) ? rows : []).map((r: any) => ({
          id: r.id,
          loan_id: r.loan_id,
          borrower_name: r.borrower_name || 'Unknown',
          amount: Number(r.amount) || 0,
          type: 'repayment',
          method: r.payment_method || 'mpesa',
          paid_at: r.paid_at,
        }));
        setPayments(allPayments);
      }

      if (activeReport === 'borrowers') {
        const [bResp, lResp] = await Promise.all([
          adminApi.getBorrowers({ limit: 500 }),
          adminApi.getLoans({ limit: 500 }),
        ]);
        const bRows = bResp?.data?.borrowers || [];
        setBorrowers(Array.isArray(bRows) ? bRows : []);

        const loanRows = lResp?.data?.loans || lResp?.data || [];
        const allLoans = Array.isArray(loanRows) ? loanRows : [];
        const counts: Record<number, number> = {};
        const totals: Record<number, number> = {};
        for (const ln of allLoans) {
          const bid = ln.borrower_id;
          if (bid) {
            counts[bid] = (counts[bid] || 0) + 1;
            totals[bid] = (totals[bid] || 0) + Number(ln.principal_amount || 0);
          }
        }
        setBorrowerLoanCounts(counts);
        setBorrowerLoanTotals(totals);
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
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
          <h1 className="text-xl sm:text-2xl font-bold">Reports & Analytics</h1>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="w-full sm:w-auto min-h-[44px]">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="portfolio" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Loan Portfolio</span>
            <span className="sm:hidden">Portfolio</span>
          </TabsTrigger>
          <TabsTrigger value="collection" className="flex items-center gap-1 text-xs sm:text-sm">
            <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Collection</span>
            <span className="sm:hidden">Collection</span>
          </TabsTrigger>
          <TabsTrigger value="borrowers" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Borrowers</span>
            <span className="sm:hidden">Borrowers</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Financial</span>
            <span className="sm:hidden">Financial</span>
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card className="mt-4 mb-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:opacity-75 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs h-5 min-w-[20px] px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          {filtersOpen && (
            <CardContent className="space-y-3 border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs sm:text-sm font-medium">Status</label>
                  <select
                    className="w-full mt-1.5 px-2 py-2 text-sm border rounded-md"
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
                <div>
                  <label className="text-xs sm:text-sm font-medium">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1.5 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

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
                  {borrowers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        No borrowers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    borrowers.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs md:text-sm whitespace-nowrap min-w-[130px]">{b.name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs md:text-sm truncate min-w-[140px]">{b.email}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap min-w-[90px]">{formatDate(b.created_at)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm whitespace-nowrap min-w-[70px]">{borrowerLoanCounts[b.borrower_id] || 0}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm whitespace-nowrap min-w-[110px]">{formatKES(borrowerLoanTotals[b.borrower_id] || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
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
                    <div className="text-2xl font-bold">{stats?.defaulted_count || 0}</div>
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
