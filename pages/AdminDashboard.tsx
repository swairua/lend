import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi, formatKES, formatDate, getStatusColor, getStatusLabel } from '../types/api';
import { secureStorage } from '../utils/secureStorage';
import { Loader2, Users, DollarSign, TrendingUp, FileText, CreditCard, AlertTriangle, LogOut, Home, Settings, BarChart3, Calendar, Activity, PieChart, Wallet, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DashboardStats {
  total_borrowers: number;
  total_loans: number;
  active_loans: number;
  pending_loans: number;
  total_disbursed?: number;
  total_collected?: number;
  default_rate?: number;
  approval_rate?: number;
  changes?: {
    borrowers?: number;
    loans?: number;
    active_loans?: number;
    disbursed?: number;
    collected?: number;
  };
  monthly_disbursements?: Array<{month: string; count: number; total: number}>;
  category_distribution?: Array<{category: string; count: number; percentage: number}>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLoans, setRecentLoans] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await secureStorage.getToken();
      const storedUser = await secureStorage.getUser();

      if (!token || !storedUser || !['admin', 'releaser', 'manager', 'agent'].includes(storedUser.role)) {
        navigate('/login');
        return;
      }

      setUser(storedUser);
      loadDashboard();
    };
    checkAuth();
  }, [navigate]);

  const loadDashboard = async () => {
    try {
      setIsRefreshing(true);
      const response = await adminApi.getDashboard();
      setStats(response.data);
      setRecentLoans(response.data.recent_loans || []);
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Refresh dashboard when tab becomes visible (e.g., user returns from another tab/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleLogout = async () => {
    await secureStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Borrowers', value: stats?.total_borrowers ?? 0, icon: Users, color: 'bg-blue-500', change: (stats?.changes?.borrowers != null ? `${stats!.changes!.borrowers}%` : undefined) },
    { title: 'Total Loans', value: stats?.total_loans ?? 0, icon: FileText, color: 'bg-purple-500', change: (stats?.changes?.loans != null ? `${stats!.changes!.loans}%` : undefined) },
    { title: 'Active Loans', value: stats?.active_loans ?? 0, icon: CreditCard, color: 'bg-green-500', change: (stats?.changes?.active_loans != null ? `${stats!.changes!.active_loans}%` : undefined) },
    { title: 'Total Disbursed', value: formatKES(stats?.total_disbursed ?? 0), icon: DollarSign, color: 'bg-red-500', change: (stats?.changes?.disbursed != null ? `${stats!.changes!.disbursed}%` : undefined) },
    { title: 'Total Collected', value: formatKES(stats?.total_collected ?? 0), icon: Wallet, color: 'bg-emerald-500', change: (stats?.changes?.collected != null ? `${stats!.changes!.collected}%` : undefined) },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={loadDashboard} disabled={isRefreshing} title="Refresh dashboard data" className="min-h-[44px]">
              <Activity className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="min-h-[44px]">
              <LogOut className="h-4 w-4 text-red-500 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="p-2 sm:p-3 md:p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {statCards.map((stat, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/loans')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${stat.color}/10`}>
                    <stat.icon className={`h-4 w-4 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                  {stat.change && (
                    <Badge variant="outline" className="text-xs text-green-600">{stat.change}</Badge>
                  )}
                </div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-2">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="loans">Recent Loans</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Default Rate</span>
                    <Badge variant="destructive">{stats?.default_rate?.toFixed(1) || 0}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Collection Rate</span>
                    <Badge variant="default" className="bg-green-600">
                      {stats?.total_disbursed > 0 ? (((Number(stats.total_collected) / Number(stats.total_disbursed)) * 100).toFixed(1) || 0) : 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Approval Rate</span>
                    <Badge variant="outline">{stats?.approval_rate?.toFixed(1) || 0}%</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Loan Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-yellow-500">Pending: {stats?.pending_loans || 0}</Badge>
                    <Badge className="bg-blue-500">Approved: {(stats?.total_loans || 0) - (stats?.pending_loans || 0) - (stats?.active_loans || 0)}</Badge>
                    <Badge className="bg-green-500">Active: {stats?.active_loans || 0}</Badge>
                    <Badge className="bg-gray-500">Completed: {Math.max(0, (stats?.total_loans || 0) - (stats?.active_loans || 0) - (stats?.pending_loans || 0))}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Activity
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin/loans')}>View All</Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentLoans.slice(0, 5).map((loan: any) => (
                    <div key={loan.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          loan.status === 'pending' ? 'bg-yellow-500' :
                          loan.status === 'disbursing' ? 'bg-teal-500' :
                          loan.status === 'active' ? 'bg-green-500' :
                          loan.status === 'approved' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{loan.borrower_name}</p>
                          <p className="text-xs text-muted-foreground">{loan.product_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatKES(loan.principal_amount)}</p>
                        <Badge className={`text-xs ${getStatusColor(loan.status)}`}>
                          {getStatusLabel(loan.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {recentLoans.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No loan applications yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Loans Tab */}
          <TabsContent value="loans" className="space-y-4">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle>All Loan Applications</CardTitle>
                  <Button onClick={() => navigate('/admin/loans')}>Manage Loans</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentLoans.map((loan: any) => (
                    <div key={loan.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">#{loan.id} {loan.borrower_name}</p>
                        <p className="text-sm text-muted-foreground">{loan.product_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatKES(loan.principal_amount)}</p>
                        <Badge className={getStatusColor(loan.status)}>{getStatusLabel(loan.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Disbursements</CardTitle>
                  <CardDescription>Last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  {(stats?.monthly_disbursements || []).length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      No disbursements this period
                    </div>
                  ) : (
                    <>
                      <div className="h-40 flex items-end gap-2">
                        {stats?.monthly_disbursements.map((month: any, i: number) => {
                          const maxTotal = Math.max(...stats.monthly_disbursements.map((m: any) => m.total));
                          const height = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${height}%` }}>
                              <div className="w-full bg-primary rounded-t" style={{ height: '100%' }} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        {stats?.monthly_disbursements.map((month: any, i: number) => (
                          <span key={i}>{month.month?.split('-')[1] || ''}</span>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loan Purpose</CardTitle>
                  <CardDescription>Distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(stats?.category_distribution || []).map((cat: any, i: number) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{cat.category || 'Unknown'}</span>
                            <span>{parseFloat(cat.percentage || 0).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full">
                            <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${cat.percentage || 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {(stats?.category_distribution || []).length === 0 && (
                      <p className="text-center text-muted-foreground">No data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
