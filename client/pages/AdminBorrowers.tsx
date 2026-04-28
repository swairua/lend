import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi, formatKES, formatDate } from '../types/api';
import { Loader2, Plus, Edit, Trash2, Search, ChevronLeft, Filter, User, Users, FileText, CreditCard, Eye } from 'lucide-react';

interface Borrower {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  national_id: string;
  address: string;
  business_name: string;
  business_type: string;
  monthly_income: number;
  credit_score: number;
  created_at: string;
}

interface Loan {
  id: number;
  borrower_id: number;
  principal_amount: number;
  status: string;
  created_at: string;
}

export default function AdminBorrowers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [borrowerLoans, setBorrowerLoans] = useState<Loan[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    loadBorrowers();
  }, []);

  const loadBorrowers = async () => {
    try {
      const response = await adminApi.getBorrowers({ limit: 100 });
      setBorrowers(response.data?.borrowers || []);
    } catch (error) {
      console.error('Failed to load borrowers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBorrower = async (borrower: any) => {
    setSelectedBorrower(borrower);
    setViewDialogOpen(true);
  };

  const filteredBorrowers = borrowers.filter(b => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      b.name?.toLowerCase().includes(search) ||
      b.email?.toLowerCase().includes(search) ||
      b.phone?.includes(search);
    return matchesSearch;
  });

  const activeCount = filteredBorrowers.filter(b => b.is_active).length;
  const inactiveCount = filteredBorrowers.filter(b => !b.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Borrowers Management</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{filteredBorrowers.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Borrowers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Borrower</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Business</th>
                  <th className="text-right p-3 font-medium">Income</th>
                  <th className="text-center p-3 font-medium">Score</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBorrowers.map((borrower) => (
                  <tr key={borrower.id} className="hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{borrower.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {borrower.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="text-sm">{borrower.email}</p>
                      <p className="text-xs text-muted-foreground">{borrower.phone || '-'}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm">{borrower.business_name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{borrower.business_type || '-'}</p>
                    </td>
                    <td className="p-3 text-right">
                      {borrower.monthly_income ? formatKES(borrower.monthly_income) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={borrower.credit_score >= 700 ? 'default' : 'secondary'}>
                        {borrower.credit_score || '-'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleViewBorrower(borrower)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/loans?borrower=${borrower.id}`)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredBorrowers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No borrowers found</div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Borrower Details</DialogTitle>
          </DialogHeader>
          {selectedBorrower && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedBorrower.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedBorrower.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedBorrower.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">National ID</Label>
                  <p className="font-medium">{selectedBorrower.national_id || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium">{selectedBorrower.address || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Business</Label>
                  <p className="font-medium">{selectedBorrower.business_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Monthly Income</Label>
                  <p className="font-medium">{selectedBorrower.monthly_income ? formatKES(selectedBorrower.monthly_income) : '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Credit Score</Label>
                <p className="font-medium text-lg">{selectedBorrower.credit_score || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}