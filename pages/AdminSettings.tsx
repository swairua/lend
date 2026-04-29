import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '../types/api';
import { Loader2, Save, ChevronLeft, Building, Bell, Shield, CreditCard, Users, FileText, Plus, Edit, Trash2, Package, DollarSign, AlertTriangle, Calculator, Percent, Calendar, Check, X } from 'lucide-react';
import { useAlert } from '@/hooks/use-alert';

interface SystemConfig {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  default_interest_rate: string;
  late_fee_percentage: string;
  processing_fee_percentage: string;
  max_loan_amount: string;
  min_loan_amount: string;
  default_loan_term: string;
  allow_online_applications: string;
  require_id_verification: string;
  require_income_verification: string;
  enable_notifications: string;
  enable_email_notifications: string;
  enable_sms_notifications: string;
  maintenance_mode: string;
  collateral_required: string;
  guarantor_required: string;
  auto_approve_threshold: string;
  default_currency: string;
  grace_period_days: string;
  penalty_rate_daily: string;
  max_loan_duration_months: string;
  min_credit_score: string;
  require_guarantor_collateral: string;
  allow_early_repayment: string;
  early_repayment_penalty: string;
}

interface Category {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: number;
  category_id: number;
  name: string;
  code: string;
  description: string;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  interest_rate: number;
  interest_type: string;
  processing_fee_percent: number;
  is_active: boolean;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '' });
  const [productForm, setProductForm] = useState({
    category_id: '',
    name: '',
    code: '',
    description: '',
    min_amount: '',
    max_amount: '',
    min_term_months: '',
    max_term_months: '',
    interest_rate: '',
    interest_type: 'flat',
    processing_fee_percent: '',
  });
  const [categorySaving, setCategorySaving] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const { showAlert, confirm, AlertComponent } = useAlert();
  const [config, setConfig] = useState<SystemConfig>({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    default_interest_rate: '10',
    late_fee_percentage: '5',
    processing_fee_percentage: '2',
    max_loan_amount: '500000',
    min_loan_amount: '5000',
    default_loan_term: '12',
    allow_online_applications: '1',
    require_id_verification: '1',
    require_income_verification: '1',
    enable_notifications: '1',
    enable_email_notifications: '1',
    enable_sms_notifications: '1',
    maintenance_mode: '0',
    collateral_required: '0',
    guarantor_required: '0',
    auto_approve_threshold: '10000',
    default_currency: 'KES',
    grace_period_days: '7',
    penalty_rate_daily: '0.5',
    max_loan_duration_months: '60',
    min_credit_score: '550',
    require_guarantor_collateral: '0',
    allow_early_repayment: '1',
    early_repayment_penalty: '0',
  });

  useEffect(() => {
    loadSettings();
    loadCategories();
    loadProducts();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await adminApi.getConfig();
      if (response.data?.data) {
        const configObj: any = {};
        response.data.data.forEach((s: any) => {
          configObj[s.key_name] = s.key_value;
        });
        setConfig(prev => ({ ...prev, ...configObj }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await adminApi.getCategories();
      console.log('Categories response:', response);
      const cats = response.data || response || [];
      console.log('Setting categories:', cats);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await adminApi.getProducts();
      setProducts(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.saveConfig(config);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof SystemConfig, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  const handleToggle = (key: keyof SystemConfig, checked: boolean) => {
    setConfig({ ...config, [key]: checked ? '1' : '0' });
  };

  // Category handlers
  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, code: category.code, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', code: '', description: '' });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.code) {
      showAlert({ type: 'warning', message: 'Name and code are required' });
      return;
    }
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, categoryForm);
      } else {
        await adminApi.createCategory(categoryForm);
      }
      await loadCategories();
      setCategoryDialogOpen(false);
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    confirm('Delete this category?', async () => {
      try {
        await adminApi.deleteCategory(id);
        await loadCategories();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
      }
    });
  };

  const handleToggleCategory = async (id: number, currentStatus: boolean) => {
    try {
      await adminApi.toggleCategory(id, !currentStatus);
      await loadCategories();
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
    }
  };

  // Product handlers
  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        category_id: String(product.category_id) || '',
        name: product.name,
        code: product.code,
        description: product.description || '',
        min_amount: String(product.min_amount),
        max_amount: String(product.max_amount),
        min_term_months: String(product.min_term_months),
        max_term_months: String(product.max_term_months),
        interest_rate: String(product.interest_rate),
        interest_type: product.interest_type,
        processing_fee_percent: String(product.processing_fee_percent),
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        category_id: '',
        name: '',
        code: '',
        description: '',
        min_amount: '',
        max_amount: '',
        min_term_months: '',
        max_term_months: '',
        interest_rate: '',
        interest_type: 'flat',
        processing_fee_percent: '',
      });
    }
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.min_amount || !productForm.max_amount) {
      showAlert({ type: 'warning', message: 'Name and amount range are required' });
      return;
    }
    setProductSaving(true);
    try {
      const data = {
        category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
        name: productForm.name,
        code: productForm.code,
        description: productForm.description,
        min_amount: parseFloat(productForm.min_amount),
        max_amount: parseFloat(productForm.max_amount),
        min_term_months: parseInt(productForm.min_term_months) || 1,
        max_term_months: parseInt(productForm.max_term_months) || 12,
        interest_rate: parseFloat(productForm.interest_rate) || 10,
        interest_type: productForm.interest_type,
        processing_fee_percent: parseFloat(productForm.processing_fee_percent) || 2,
      };
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, data);
      } else {
        await adminApi.createProduct(data);
      }
      await loadProducts();
      setProductDialogOpen(false);
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
    } finally {
      setProductSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    confirm('Delete this loan product?', async () => {
      try {
        await adminApi.deleteProduct(id);
        await loadProducts();
      } catch (error: any) {
        showAlert({ type: 'error', message: error.message });
      }
    });
  };

  const handleToggleProduct = async (id: number, currentStatus: boolean) => {
    try {
      await adminApi.updateProduct(id, { is_active: !currentStatus });
      await loadProducts();
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
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="company"><Building className="h-4 w-4 mr-1" />Company</TabsTrigger>
          <TabsTrigger value="loans"><DollarSign className="h-4 w-4 mr-1" />Loan Defaults</TabsTrigger>
          <TabsTrigger value="categories"><Package className="h-4 w-4 mr-1" />Categories</TabsTrigger>
          <TabsTrigger value="products"><CreditCard className="h-4 w-4 mr-1" />Products</TabsTrigger>
          <TabsTrigger value="requirements"><Shield className="h-4 w-4 mr-1" />Requirements</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" />Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input value={config.company_name} onChange={(e) => handleChange('company_name', e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={config.company_email} onChange={(e) => handleChange('company_email', e.target.value)} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={config.company_phone} onChange={(e) => handleChange('company_phone', e.target.value)} />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={config.company_address} onChange={(e) => handleChange('company_address', e.target.value)} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={config.default_currency} onChange={(e) => handleChange('default_currency', e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Loan Default Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Min Loan Amount</Label>
                  <Input type="number" value={config.min_loan_amount} onChange={(e) => handleChange('min_loan_amount', e.target.value)} />
                </div>
                <div>
                  <Label>Max Loan Amount</Label>
                  <Input type="number" value={config.max_loan_amount} onChange={(e) => handleChange('max_loan_amount', e.target.value)} />
                </div>
                <div>
                  <Label>Default Loan Term (months)</Label>
                  <Input type="number" value={config.default_loan_term} onChange={(e) => handleChange('default_loan_term', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Default Interest Rate (%)</Label>
                  <Input type="number" step="0.1" value={config.default_interest_rate} onChange={(e) => handleChange('default_interest_rate', e.target.value)} />
                </div>
                <div>
                  <Label>Processing Fee (%)</Label>
                  <Input type="number" step="0.1" value={config.processing_fee_percentage} onChange={(e) => handleChange('processing_fee_percentage', e.target.value)} />
                </div>
                <div>
                  <Label>Late Fee (%)</Label>
                  <Input type="number" step="0.1" value={config.late_fee_percentage} onChange={(e) => handleChange('late_fee_percentage', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Grace Period (days)</Label>
                  <Input type="number" value={config.grace_period_days} onChange={(e) => handleChange('grace_period_days', e.target.value)} />
                </div>
                <div>
                  <Label>Daily Penalty Rate (%)</Label>
                  <Input type="number" step="0.1" value={config.penalty_rate_daily} onChange={(e) => handleChange('penalty_rate_daily', e.target.value)} />
                </div>
                <div>
                  <Label>Max Loan Duration (months)</Label>
                  <Input type="number" value={config.max_loan_duration_months} onChange={(e) => handleChange('max_loan_duration_months', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Allow Online Applications</Label>
                    <p className="text-sm text-muted-foreground">Enable borrowers to apply for loans online</p>
                  </div>
                  <Switch checked={config.allow_online_applications === '1'} onCheckedChange={(c) => handleToggle('allow_online_applications', c)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Allow Early Repayment</Label>
                    <p className="text-sm text-muted-foreground"> Borrowers can repay early</p>
                  </div>
                  <Switch checked={config.allow_early_repayment === '1'} onCheckedChange={(c) => handleToggle('allow_early_repayment', c)} />
                </div>
              </div>
              <div>
                <Label>Early Repayment Penalty (%)</Label>
                <Input type="number" step="0.1" value={config.early_repayment_penalty} onChange={(e) => handleChange('early_repayment_penalty', e.target.value)} className="w-48" />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Loan Categories</CardTitle>
              <Button size="sm" onClick={() => openCategoryDialog()}>
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No categories found. Add your first category.</p>
              ) : (
                <div className="border rounded-lg divide-y">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {cat.code} | {cat.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={cat.is_active} onCheckedChange={() => handleToggleCategory(cat.id, cat.is_active)} />
                        <Button size="sm" variant="ghost" onClick={() => openCategoryDialog(cat)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Loan Products</CardTitle>
              <Button size="sm" onClick={() => openProductDialog()}>
                <Plus className="h-4 w-4 mr-1" /> Add Product
              </Button>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No products found. Add your first loan product.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-2 md:p-3 text-xs md:text-sm">Product</th>
                        <th className="hidden sm:table-cell text-left p-2 md:p-3 text-xs md:text-sm">Category</th>
                        <th className="text-right p-2 md:p-3 text-xs md:text-sm">Amount</th>
                        <th className="hidden md:table-cell text-center p-2 md:p-3 text-xs md:text-sm">Term</th>
                        <th className="text-right p-2 md:p-3 text-xs md:text-sm">Interest</th>
                        <th className="text-center p-2 md:p-3 text-xs md:text-sm">Status</th>
                        <th className="text-center p-2 md:p-3 text-xs md:text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {products.map((prod) => {
                        const cat = categories.find(c => c.id === prod.category_id);
                        return (
                          <tr key={prod.id} className="hover:bg-muted/50">
                            <td className="p-2 md:p-3">
                              <p className="font-medium text-xs md:text-sm">{prod.name}</p>
                              <p className="text-xs text-muted-foreground">{prod.code}</p>
                            </td>
                            <td className="hidden sm:table-cell p-2 md:p-3 text-xs md:text-sm">{cat?.name || '-'}</td>
                            <td className="p-2 md:p-3 text-right text-xs md:text-sm">KSh {prod.min_amount.toLocaleString()}</td>
                            <td className="hidden md:table-cell p-2 md:p-3 text-center text-xs md:text-sm">{prod.min_term_months}-{prod.max_term_months}mo</td>
                            <td className="p-2 md:p-3 text-right text-xs md:text-sm">{prod.interest_rate}%</td>
                            <td className="p-2 md:p-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${prod.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {prod.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-2 md:p-3">
                              <div className="flex items-center justify-center gap-0.5 flex-wrap">
                                <Button size="sm" variant="ghost" className="text-xs h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleToggleProduct(prod.id, prod.is_active)} title={prod.is_active ? 'Deactivate' : 'Activate'}>
                                  {prod.is_active ? <X className="h-3 w-3 md:h-4 md:w-4" /> : <Check className="h-3 w-3 md:h-4 md:w-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => openProductDialog(prod)}><Edit className="h-3 w-3 md:h-4 md:w-4" /></Button>
                                <Button size="sm" variant="ghost" className="text-red-600 h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleDeleteProduct(prod.id)}><Trash2 className="h-3 w-3 md:h-4 md:w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Borrower Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Credit Score</Label>
                  <Input type="number" value={config.min_credit_score} onChange={(e) => handleChange('min_credit_score', e.target.value)} />
                </div>
                <div>
                  <Label>Auto-Approve Threshold (KES)</Label>
                  <Input type="number" value={config.auto_approve_threshold} onChange={(e) => handleChange('auto_approve_threshold', e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Require ID Verification</Label>
                    <p className="text-sm text-muted-foreground">Borrowers must verify their national ID</p>
                  </div>
                  <Switch checked={config.require_id_verification === '1'} onCheckedChange={(c) => handleToggle('require_id_verification', c)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Require Income Verification</Label>
                    <p className="text-sm text-muted-foreground">Verify borrower income documents</p>
                  </div>
                  <Switch checked={config.require_income_verification === '1'} onCheckedChange={(c) => handleToggle('require_income_verification', c)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Collateral Required</Label>
                    <p className="text-sm text-muted-foreground">Require collateral for all loans</p>
                  </div>
                  <Switch checked={config.collateral_required === '1'} onCheckedChange={(c) => handleToggle('collateral_required', c)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Guarantor Required</Label>
                    <p className="text-sm text-muted-foreground">Require guarantor for all loans</p>
                  </div>
                  <Switch checked={config.guarantor_required === '1'} onCheckedChange={(c) => handleToggle('guarantor_required', c)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Require Guarantor/Collateral</Label>
                    <p className="text-sm text-muted-foreground">At least one of guarantor or collateral required</p>
                  </div>
                  <Switch checked={config.require_guarantor_collateral === '1'} onCheckedChange={(c) => handleToggle('require_guarantor_collateral', c)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div>
                    <Label className="font-medium">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Put system in maintenance mode</p>
                  </div>
                  <Switch checked={config.maintenance_mode === '1'} onCheckedChange={(c) => handleToggle('maintenance_mode', c)} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">Enable in-app notifications</p>
                </div>
                <Switch checked={config.enable_notifications === '1'} onCheckedChange={(c) => handleToggle('enable_notifications', c)} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send email notifications to users</p>
                </div>
                <Switch checked={config.enable_email_notifications === '1'} onCheckedChange={(c) => handleToggle('enable_email_notifications', c)} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send SMS notifications to users</p>
                </div>
                <Switch checked={config.enable_sms_notifications === '1'} onCheckedChange={(c) => handleToggle('enable_sms_notifications', c)} />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Personal Loans" />
            </div>
            <div>
              <Label>Code *</Label>
              <Input value={categoryForm.code} onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })} placeholder="e.g., PERSONAL" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={categorySaving}>
              {categorySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingCategory ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Loan Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select className="w-full p-2 border rounded-md" value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Name *</Label>
                <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g., Quick Loan" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code</Label>
                <Input value={productForm.code} onChange={(e) => setProductForm({ ...productForm, code: e.target.value })} placeholder="e.g., QUICK" />
              </div>
              <div>
                <Label>Interest Type</Label>
                <select className="w-full p-2 border rounded-md" value={productForm.interest_type} onChange={(e) => setProductForm({ ...productForm, interest_type: e.target.value })}>
                  <option value="flat">Flat</option>
                  <option value="reducing">Reducing Balance</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Amount *</Label>
                <Input type="number" value={productForm.min_amount} onChange={(e) => setProductForm({ ...productForm, min_amount: e.target.value })} />
              </div>
              <div>
                <Label>Max Amount *</Label>
                <Input type="number" value={productForm.max_amount} onChange={(e) => setProductForm({ ...productForm, max_amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Term (months)</Label>
                <Input type="number" value={productForm.min_term_months} onChange={(e) => setProductForm({ ...productForm, min_term_months: e.target.value })} />
              </div>
              <div>
                <Label>Max Term (months)</Label>
                <Input type="number" value={productForm.max_term_months} onChange={(e) => setProductForm({ ...productForm, max_term_months: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interest Rate (%)</Label>
                <Input type="number" step="0.1" value={productForm.interest_rate} onChange={(e) => setProductForm({ ...productForm, interest_rate: e.target.value })} />
              </div>
              <div>
                <Label>Processing Fee (%)</Label>
                <Input type="number" step="0.1" value={productForm.processing_fee_percent} onChange={(e) => setProductForm({ ...productForm, processing_fee_percent: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProduct} disabled={productSaving}>
              {productSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingProduct ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Custom Alert */}
      {AlertComponent}
    </div>
  );
}
