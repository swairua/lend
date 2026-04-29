import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
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
    <div className="container mx-auto py-4 md:py-6 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Borrowers</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xl md:text-2xl font-bold">{filteredBorrowers.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xl md:text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xl md:text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
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
          <ResponsiveTable>
            <ResponsiveTableHeader className="bg-muted/50">
              <tr>
                <ResponsiveTableHead className="text-left">Borrower</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden sm:table-cell text-left">Contact</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden md:table-cell text-left">Business</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden lg:table-cell text-right">Income</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Score</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Actions</ResponsiveTableHead>
              </tr>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {filteredBorrowers.map((borrower) => (
                <ResponsiveTableRow key={borrower.id}>
                  <ResponsiveTableCell label="Borrower" className="md:p-3 p-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                        <User className="h-3 w-3 md:h-5 md:w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs md:text-base truncate">{borrower.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {borrower.id}</p>
                      </div>
                    </div>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Contact" className="hidden sm:table-cell md:p-3 p-2">
                    <p className="text-xs md:text-sm">{borrower.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{borrower.phone || '-'}</p>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Business" className="hidden md:table-cell md:p-3 p-2">
                    <p className="text-xs md:text-sm">{borrower.business_name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{borrower.business_type || '-'}</p>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Income" className="hidden lg:table-cell text-right md:p-3 p-2">
                    <p className="text-xs md:text-sm">{borrower.monthly_income ? formatKES(borrower.monthly_income) : '-'}</p>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Score" className="text-center md:p-3 p-2">
                    <Badge variant={borrower.credit_score >= 700 ? 'default' : 'secondary'} className="text-xs">
                      {borrower.credit_score || '-'}
                    </Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Actions" className="md:p-3 p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleViewBorrower(borrower)}>
                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigate(`/admin/loans?borrower=${borrower.id}`)}>
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
          {filteredBorrowers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No borrowers found</div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-2xl">Borrower Details</DialogTitle>
          </DialogHeader>
          {selectedBorrower && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">Name</Label>
                  <p className="font-medium text-sm md:text-base">{selectedBorrower.name}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium text-sm md:text-base truncate">{selectedBorrower.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">Phone</Label>
                  <p className="font-medium text-sm md:text-base">{selectedBorrower.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm text-muted-foreground">National ID</Label>
                  <p className="font-medium text-sm md:text-base">{selectedBorrower.national_id || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs md:text-sm text-muted-foreground">Address</Label>
                <p className="font-medium text-sm md:text-base">{selectedBorrower.address || '-'}</p>
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
