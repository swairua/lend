import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import DocumentsPanel from "../components/DocumentsPanel";
import ProfilePhoto from "../components/ProfilePhoto";
import { adminApi, formatKES, formatDate } from '../types/api';
import { uploadsApi } from '../utils/api';
import { Loader2, Plus, Edit, Trash2, Search, ChevronLeft, Filter, User, Users, FileText, CreditCard, Eye, Shield } from 'lucide-react';
import { toast } from 'sonner';

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
  const [photoUrl, setPhotoUrl] = useState('');
  const [borrowerLoans, setBorrowerLoans] = useState<Loan[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kycForm, setKycForm] = useState({ kra_pin: "", tcc_number: "", national_id: "", client_type: "individual", is_verified: false });
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ client_type: 'individual', name: '', email: '', phone: '', password: '', national_id: '', address: '', business_name: '', business_type: '', monthly_income: '', company_name: '', nature_of_business: '' });

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

  const handleOpenKYC = (borrower: any) => {
    setSelectedBorrower(borrower);
    setKycForm({
      kra_pin: borrower.kra_pin || "",
      tcc_number: borrower.tcc_number || "",
      national_id: borrower.national_id || "",
      client_type: borrower.client_type || "individual",
      is_verified: borrower.is_verified || false,
    });
    setKycDialogOpen(true);
  };

  const handleSaveKYC = async () => {
    if (!selectedBorrower) return;
    setSaving(true);
    try {
      await adminApi.updateBorrowerKYC(selectedBorrower.id, kycForm);
      toast.success(`KYC for ${selectedBorrower.name} updated successfully`);
      await loadBorrowers();
      setKycDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to update KYC');
    } finally {
      setSaving(false);
    }
  };

  const handleViewBorrower = async (borrower: any) => {
    setSelectedBorrower(borrower);
    setPhotoUrl((borrower as any)?.photo_url || '');
    setViewDialogOpen(true);
  };

  const handleCreateBorrower = async () => {
    if (!createForm.name || !createForm.email) {
      toast.error('Name and email are required');
      return;
    }
    if (createForm.client_type === 'individual' && !createForm.national_id) {
      toast.error('National ID is required for individuals');
      return;
    }
    if (createForm.client_type === 'corporate' && (!createForm.company_name || !createForm.nature_of_business)) {
      toast.error('Company name and nature of business are required for corporates');
      return;
    }
    setCreating(true);
    try {
      const payload: any = {
        client_type: createForm.client_type,
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone || undefined,
        password: createForm.password || undefined,
        address: createForm.address || undefined,
        monthly_income: createForm.monthly_income ? Number(createForm.monthly_income) : undefined,
      };
      if (createForm.client_type === 'individual') {
        payload.national_id = createForm.national_id || undefined;
        payload.business_type = createForm.business_type || undefined;
      } else {
        payload.company_name = createForm.company_name || undefined;
        payload.nature_of_business = createForm.nature_of_business || undefined;
      }
      const res = await adminApi.createBorrower(payload);
      toast.success(`Borrower ${createForm.name} created successfully`);
      if (res.generated_password) {
        toast.info(`Generated password: ${res.generated_password}`, { duration: 10000 });
      }
      setCreateDialogOpen(false);
      setCreateForm({ client_type: 'individual', name: '', email: '', phone: '', password: '', national_id: '', address: '', business_name: '', business_type: '', monthly_income: '', company_name: '', nature_of_business: '' });
      await loadBorrowers();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create borrower');
    } finally {
      setCreating(false);
    }
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
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Borrower
        </Button>
      </div>

      {/* Borrowers Table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable>
            <caption className="sr-only">Admin borrowers table showing borrower profiles with contact information, business details, and credit scores</caption>
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
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit KYC" onClick={() => handleOpenKYC(borrower)}>
                        <Shield className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                      </Button>
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


      {/* Create Borrower Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>New Borrower</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Client Type *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="client_type"
                    value="individual"
                    checked={createForm.client_type === 'individual'}
                    onChange={(e) => setCreateForm({ ...createForm, client_type: 'individual' })}
                    className="accent-primary"
                  />
                  <span className="text-sm">Individual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="client_type"
                    value="corporate"
                    checked={createForm.client_type === 'corporate'}
                    onChange={(e) => setCreateForm({ ...createForm, client_type: 'corporate' })}
                    className="accent-primary"
                  />
                  <span className="text-sm">Corporate</span>
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="Email address" type="email" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div className="space-y-1">
              <Label>Password (leave blank to auto-generate)</Label>
              <Input value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Auto-generated if empty" type="text" />
            </div>
            {createForm.client_type === 'individual' && (
              <>
                <div className="space-y-1">
                  <Label>National ID *</Label>
                  <Input value={createForm.national_id} onChange={(e) => setCreateForm({ ...createForm, national_id: e.target.value })} placeholder="ID number" />
                </div>
                <div className="space-y-1">
                  <Label>Business Type</Label>
                  <Input value={createForm.business_type} onChange={(e) => setCreateForm({ ...createForm, business_type: e.target.value })} placeholder="e.g. retail, services" />
                </div>
              </>
            )}
            {createForm.client_type === 'corporate' && (
              <>
                <div className="space-y-1">
                  <Label>Company Name *</Label>
                  <Input value={createForm.company_name} onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })} placeholder="Company name" />
                </div>
                <div className="space-y-1">
                  <Label>Nature of Business *</Label>
                  <Input value={createForm.nature_of_business} onChange={(e) => setCreateForm({ ...createForm, nature_of_business: e.target.value })} placeholder="e.g. retail, services" />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} placeholder="Physical address" />
            </div>
            <div className="space-y-1">
              <Label>Monthly Income (KES)</Label>
              <Input value={createForm.monthly_income} onChange={(e) => setCreateForm({ ...createForm, monthly_income: e.target.value })} placeholder="0" type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBorrower} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Borrower
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Edit Dialog */}
      <Dialog open={kycDialogOpen} onOpenChange={setKycDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>Edit KYC Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">These fields are mandatory and admin-only. TCC Number should be renewed annually.</p>
            </div>
            <div className="space-y-1">
              <Label>Client Type *</Label>
              <Select value={kycForm.client_type} onValueChange={(v)=>setKycForm({...kycForm,client_type:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>National ID / Passport *</Label>
              <Input value={kycForm.national_id} onChange={(e)=>setKycForm({...kycForm,national_id:e.target.value})} placeholder="ID number" />
            </div>
            <div className="space-y-1">
              <Label>KRA PIN *</Label>
              <Input value={kycForm.kra_pin} onChange={(e)=>setKycForm({...kycForm,kra_pin:e.target.value})} placeholder="e.g. A000123456B" />
            </div>
            <div className="space-y-1">
              <Label>TCC Number * (update annually)</Label>
              <Input value={kycForm.tcc_number} onChange={(e)=>setKycForm({...kycForm,tcc_number:e.target.value})} placeholder="Tax Compliance Certificate number" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_verified" checked={kycForm.is_verified} onChange={(e)=>setKycForm({...kycForm,is_verified:e.target.checked})} className="accent-primary" />
              <Label htmlFor="is_verified">Mark as Admin Verified</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setKycDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveKYC} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <ProfilePhoto name={(selectedBorrower as any)?.name} currentUrl={photoUrl} size="sm" borrowerId={(selectedBorrower as any)?.id} onUploaded={(url) => setPhotoUrl(url)} />
              <div><DialogTitle className="text-lg">{(selectedBorrower as any)?.name}</DialogTitle><p className="text-xs text-muted-foreground">{(selectedBorrower as any)?.email}</p></div>
            </div>
          </DialogHeader>
          {selectedBorrower && (
            <Tabs defaultValue="info">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">Profile</TabsTrigger>
                <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
              </TabsList>
              <TabsContent value="info">
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
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-xs font-bold text-amber-800 uppercase">KYC Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Client Type</Label><p className="font-medium capitalize text-sm">{(selectedBorrower as any).client_type || "individual"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Verified</Label><p className="font-medium text-sm">{(selectedBorrower as any).is_verified ? "Yes" : "Pending"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">KRA PIN</Label><p className="font-medium text-sm">{(selectedBorrower as any).kra_pin || "-"}</p></div>
                  <div><Label className="text-xs text-muted-foreground">TCC Number</Label><p className="font-medium text-sm">{(selectedBorrower as any).tcc_number || "-"}</p></div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Credit Score</Label>
                <p className="font-medium text-lg">{selectedBorrower.credit_score || '-'}</p>
              </div>
            </div>
              </TabsContent>
              <TabsContent value="documents" className="mt-2">
                <DocumentsPanel borrowerId={(selectedBorrower as any).id} readOnly={false} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
