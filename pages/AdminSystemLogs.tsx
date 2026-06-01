import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { Loader2, ChevronLeft, ChevronRight, RefreshCw, Download, Eye } from 'lucide-react';
import { adminApi, formatDate } from '../types/api';
import { useToast } from '@/hooks/use-toast';
import { normalizeList } from '../utils/normalize';

interface SystemLog {
  id: number;
  log_type: string;
  action: string;
  details: any;
  entity_type?: string;
  entity_id?: number;
  user_id: number;
  user_name: string;
  user_email: string;
  created_at: string;
  status: 'success' | 'failed';
}

interface PaginationInfo {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export default function AdminSystemLogs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ offset: 0, limit: 20, total: 0, hasMore: false });
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [filters, setFilters] = useState({
    logType: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const logTypes = ['loan_action', 'payment', 'sms', 'admin_action', 'user_mgmt', 'document'];
  const statusOptions = ['success', 'failed'];

  useEffect(() => {
    loadLogs(1);
  }, []);

  const loadLogs = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const offset = (pageNum - 1) * 20;
      const params = new URLSearchParams();
      params.set('offset', offset.toString());
      params.set('limit', '20');
      if (filters.logType) params.set('log_type', filters.logType);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.startDate) params.set('dateFrom', filters.startDate);
      if (filters.endDate) params.set('dateTo', filters.endDate);

      const response = await fetch(`/api/admin/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to load logs`);
      }

      const result = await response.json();
      setLogs(result.data || []);
      setPagination(result.pagination || { offset, limit: 20, total: 0, hasMore: false });
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load system logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadLogs(1);
  };

  const handleClearFilters = () => {
    setFilters({ logType: '', status: '', search: '', startDate: '', endDate: '' });
  };

  const handleExportCsv = () => {
    try {
      const headers = ['ID', 'Type', 'Action', 'Status', 'User', 'Timestamp', 'Details'];
      const rows = logs.map(log => [
        log.id,
        log.log_type,
        log.action,
        log.status,
        log.user_name || '-',
        new Date(log.created_at).toLocaleString(),
        typeof log.details === 'string' ? log.details : JSON.stringify(log.details || ''),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Logs exported successfully',
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export logs',
        variant: 'destructive',
      });
    }
  };

  const getLogTypeColor = (logType: string) => {
    const colors: Record<string, string> = {
      loan_action: 'bg-blue-100 text-blue-800',
      payment: 'bg-green-100 text-green-800',
      sms: 'bg-purple-100 text-purple-800',
      admin_action: 'bg-orange-100 text-orange-800',
      user_mgmt: 'bg-indigo-100 text-indigo-800',
      document: 'bg-yellow-100 text-yellow-800',
    };
    return colors[logType] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const parseDetails = (details: any) => {
    if (!details) return null;
    if (typeof details === 'string') {
      try {
        return JSON.parse(details);
      } catch {
        return details;
      }
    }
    return details;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Logs</h1>
        <p className="text-gray-600">View and manage system activity logs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Log Type</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={filters.logType}
                onChange={(e) => handleFilterChange('logType', e.target.value)}
              >
                <option value="">All Types</option>
                {logTypes.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search action or details..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} className="bg-blue-600">
              Apply Filters
            </Button>
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
            <Button onClick={handleExportCsv} variant="outline" className="ml-auto">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No logs found</p>
          ) : (
            <>
              <ResponsiveTable>
                <ResponsiveTableHeader>
                  <ResponsiveTableHead>Type</ResponsiveTableHead>
                  <ResponsiveTableHead>Action</ResponsiveTableHead>
                  <ResponsiveTableHead>Status</ResponsiveTableHead>
                  <ResponsiveTableHead>User</ResponsiveTableHead>
                  <ResponsiveTableHead>Timestamp</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                  {logs.map(log => (
                    <ResponsiveTableRow key={log.id}>
                      <ResponsiveTableCell>
                        <Badge className={getLogTypeColor(log.log_type)}>
                          {log.log_type.replace('_', ' ')}
                        </Badge>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="font-medium">{log.action}</ResponsiveTableCell>
                      <ResponsiveTableCell>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="text-sm">
                        {log.user_name || '-'}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="text-sm">
                        {formatDate(log.created_at)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="text-right">
                        <Button
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailsOpen(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTable>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Showing {pagination.offset + 1} to{' '}
                  {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                  {pagination.total} logs
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => loadLogs(Math.floor(pagination.offset / pagination.limit))}
                    disabled={pagination.offset === 0 || loading}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => loadLogs(Math.floor(pagination.offset / pagination.limit) + 2)}
                    disabled={!pagination.hasMore || loading}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Type</p>
                <Badge className={getLogTypeColor(selectedLog.log_type)}>
                  {selectedLog.log_type.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Action</p>
                <p className="text-base font-semibold">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge className={getStatusColor(selectedLog.status)}>
                  {selectedLog.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">User</p>
                <p className="text-sm">{selectedLog.user_name || '-'} ({selectedLog.user_email || '-'})</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Timestamp</p>
                <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>
              {selectedLog.details && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Details</p>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(parseDetails(selectedLog.details), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
