import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { adminApi, loansApi, formatKES, LoanProduct } from '../types/api';
import { normalizeList } from '../utils/normalize';
import { Loader2, Plus, Edit, Trash2, ChevronLeft, Check, X, Package } from 'lucide-react';
import { useAlert } from '@/hooks/use-alert';
import { toast } from 'sonner';

type Product = LoanProduct & { category_name?: string };

type Category = { id: number; name: string };

export default function AdminProducts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showAlert, confirm, AlertComponent } = useAlert();

  const emptyForm = {
    name: '',
    description: '',
    category_id: 0,
    min_amount: '',
    max_amount: '',
    min_term_months: '',
    max_term_months: '',
    interest_rate: '',
    interest_type: 'flat',
    processing_fee_percent: '',
    asset_transfer_fee: '',
    tracking_system_fee: '',
    late_fee_percent: '',
    requires_security: false,
    requires_guarantor: false,
    requires_postdated_checks: false,
    min_income: '',
    is_active: true
  };

  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        adminApi.getProducts(),
        adminApi.getCategories()
      ]);
      const p = normalizeList<Product>(productsRes as any);
      const c = normalizeList<Category>(categoriesRes as any);
      setProducts(p as any);
      setCategories(c as any);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenNew = () => {
    setForm({ ...emptyForm, category_id: categories[0]?.id || 0 });
    setIsEditing(false);
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      min_amount: product.min_amount,
      max_amount: product.max_amount,
      min_term_months: product.min_term_months,
      max_term_months: product.max_term_months,
      interest_rate: product.interest_rate,
      interest_type: product.interest_type,
      processing_fee_percent: product.processing_fee_percent,
      asset_transfer_fee: product.asset_transfer_fee,
      tracking_system_fee: product.tracking_system_fee,
      late_fee_percent: product.late_fee_percent,
      requires_security: product.requires_security,
      requires_guarantor: product.requires_guarantor,
      requires_postdated_checks: product.requires_postdated_checks,
      min_income: product.min_income,
      is_active: product.is_active
    });
    setIsEditing(true);
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category_id || !form.min_amount || !form.max_amount || !form.interest_rate) {
      showAlert({ type: 'warning', message: 'Please fill required fields' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        min_amount: Number(form.min_amount),
        max_amount: Number(form.max_amount),
        min_term_months: Number(form.min_term_months) || 1,
        max_term_months: Number(form.max_term_months) || 12,
        interest_rate: Number(form.interest_rate),
        processing_fee_percent: Number(form.processing_fee_percent) || 0,
        asset_transfer_fee: Number(form.asset_transfer_fee) || 0,
        tracking_system_fee: Number(form.tracking_system_fee) || 0,
        late_fee_percent: Number(form.late_fee_percent) || 2.5,
        min_income: Number(form.min_income) || 0,
      };

      if (isEditing && selectedProduct) {
        await adminApi.updateProduct(selectedProduct.id, data);
        toast.success(`Product "${form.name}" updated successfully`);
      } else {
        await adminApi.createProduct(data);
        toast.success(`Product "${form.name}" created successfully`);
      }
      await loadData();
      setDialogOpen(false);
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    confirm('Delete this loan product?', async () => {
      setSaving(true);
      try {
        await adminApi.deleteProduct(selectedProduct.id);
        toast.success(`Product "${selectedProduct.name}" deleted successfully`);
        await loadData();
        setDeleteDialogOpen(false);
        setDialogOpen(false);
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
        toast.error(error.message || 'Failed to delete product');
      } finally {
        setSaving(false);
      }
    });
  };

  const handleToggle = async (product: Product) => {
    try {
      await adminApi.updateProduct(product.id, { is_active: !product.is_active });
      await loadData();
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="h-10 px-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Loan Products</h1>
        </div>
        <Button onClick={handleOpenNew} className="w-full sm:w-auto min-h-[44px]">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium min-w-[250px]">Product</th>
                  <th className="text-left p-3 font-medium min-w-[120px]">Category</th>
                  <th className="text-right p-3 font-medium min-w-[180px]">Amount Range</th>
                  <th className="text-right p-3 font-medium min-w-[100px]">Term</th>
                  <th className="text-right p-3 font-medium min-w-[100px]">Rate</th>
                  <th className="text-center p-3 font-medium min-w-[90px]">Status</th>
                  <th className="text-center p-3 font-medium min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="p-3 align-top min-w-[250px]">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{product.description?.slice(0, 50)}</p>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap min-w-[120px]">{product.category_name}</td>
                    <td className="p-3 text-right align-top whitespace-nowrap min-w-[180px]">
                      {formatKES(product.min_amount)} - {formatKES(product.max_amount)}
                    </td>
                    <td className="p-3 text-right align-top whitespace-nowrap min-w-[100px]">{product.min_term_months}-{product.max_term_months} mo</td>
                    <td className="p-3 text-right align-top whitespace-nowrap min-w-[100px]">{product.interest_rate}% {product.interest_type}</td>
                    <td className="p-3 text-center align-top min-w-[90px]">
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 align-top min-w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={product.is_active ? 'destructive' : 'default'}
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggle(product)}
                        >
                          {product.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2 p-2">
            {products.map((product) => (
              <Card key={product.id} className="border">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{product.description?.slice(0, 40)}</p>
                    </div>
                    <Badge variant={product.is_active ? 'default' : 'secondary'} className="whitespace-nowrap text-xs">
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="font-medium text-xs">{product.category_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rate</p>
                      <p className="font-medium text-xs">{product.interest_rate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium text-xs">{formatKES(product.min_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Term</p>
                      <p className="font-medium text-xs">{product.min_term_months}-{product.max_term_months}mo</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={product.is_active ? 'destructive' : 'default'}
                      className="flex-1 min-h-[44px]"
                      onClick={() => handleToggle(product)}
                    >
                      {product.is_active ? <X className="h-4 w-4 mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                      {product.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No products found. Add your first product.</div>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Product' : 'New Loan Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Product Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Micro Loan - Small"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Product description"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={String(form.category_id)} onValueChange={(v) => setForm({ ...form, category_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interest Type</Label>
                <Select value={form.interest_type} onValueChange={(v) => setForm({ ...form, interest_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Rate</SelectItem>
                    <SelectItem value="reducing">Reducing Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Min Amount (KES) *</Label>
                <Input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Amount (KES) *</Label>
                <Input type="number" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Min Term (months)</Label>
                <Input type="number" value={form.min_term_months} onChange={(e) => setForm({ ...form, min_term_months: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Term (months)</Label>
                <Input type="number" value={form.max_term_months} onChange={(e) => setForm({ ...form, max_term_months: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%) *</Label>
                <Input type="number" step="0.01" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Processing Fee (%)</Label>
                <Input type="number" step="0.01" value={form.processing_fee_percent} onChange={(e) => setForm({ ...form, processing_fee_percent: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Asset Transfer Fee (KES)</Label>
                <Input type="number" value={form.asset_transfer_fee} onChange={(e) => setForm({ ...form, asset_transfer_fee: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tracking Fee (KES)</Label>
                <Input type="number" value={form.tracking_system_fee} onChange={(e) => setForm({ ...form, tracking_system_fee: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Late Fee (%)</Label>
                <Input type="number" step="0.01" value={form.late_fee_percent} onChange={(e) => setForm({ ...form, late_fee_percent: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Min Income (KES)</Label>
                <Input type="number" value={form.min_income} onChange={(e) => setForm({ ...form, min_income: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Requirements</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.requires_security} onCheckedChange={(v) => setForm({ ...form, requires_security: !!v })} />
                  <Label>Requires Security</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.requires_guarantor} onCheckedChange={(v) => setForm({ ...form, requires_guarantor: !!v })} />
                  <Label>Requires Guarantor</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.requires_postdated_checks} onCheckedChange={(v) => setForm({ ...form, requires_postdated_checks: !!v })} />
                  <Label>Postdated Checks</Label>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: !!v })} />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            {isEditing && selectedProduct && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{selectedProduct?.name}"?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Custom Alert */}
      {AlertComponent}
    </div>
  );
}
