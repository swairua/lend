import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Pencil, Trash2, Package } from 'lucide-react';
import { adminApi, formatKES } from '../types/api';
import { useAlert } from '@/hooks/use-alert';
import { toast } from 'sonner';
import { normalizeList } from '../utils/normalize';

interface InvoiceProduct {
  id: number;
  name: string;
  description: string;
  unit_price: number;
  tax_rate: number;
  unit_type: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const defaultProduct = {
  name: '', description: '', unit_price: 0, tax_rate: 0, unit_type: 'piece', is_active: 1,
};

export default function AdminInvoiceProducts() {
  const [products, setProducts] = useState<InvoiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceProduct | null>(null);
  const [form, setForm] = useState(defaultProduct);
  const alert = useAlert();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getInvoiceProducts();
      setProducts(normalizeList(res.data) as InvoiceProduct[]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(defaultProduct); setDialogOpen(true); };

  const openEdit = (p: InvoiceProduct) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', unit_price: p.unit_price, tax_rate: p.tax_rate, unit_type: p.unit_type, is_active: p.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    try {
      if (editing) {
        await adminApi.updateInvoiceProduct(editing.id, form);
        toast.success('Product updated');
      } else {
        await adminApi.createInvoiceProduct(form);
        toast.success('Product created');
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    }
  };

  const handleDelete = (id: number, name: string) => {
    alert.showAlert({
      title: 'Delete Product',
      message: `Delete "${name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await adminApi.deleteInvoiceProduct(id);
          toast.success('Product deleted');
          load();
        } catch (e: any) {
          toast.error(e.message || 'Delete failed');
        }
      },
    });
  };

  const toggleActive = async (p: InvoiceProduct) => {
    try {
      await adminApi.updateInvoiceProduct(p.id, { is_active: p.is_active ? 0 : 1 });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Toggle failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Products</h1>
          <p className="text-gray-600">Manage products and services for quotations & invoices</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Products</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No products yet. Click "Add Product" to create one.</p>
          ) : (
            <ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead>Name</ResponsiveTableHead>
                  <ResponsiveTableHead>Unit Price</ResponsiveTableHead>
                  <ResponsiveTableHead>Tax Rate</ResponsiveTableHead>
                  <ResponsiveTableHead>Unit</ResponsiveTableHead>
                  <ResponsiveTableHead>Status</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {products.map(p => (
                  <ResponsiveTableRow key={p.id}>
                    <ResponsiveTableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-sm text-gray-500">{p.description}</div>}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>{formatKES(p.unit_price)}</ResponsiveTableCell>
                    <ResponsiveTableCell>{p.tax_rate}%</ResponsiveTableCell>
                    <ResponsiveTableCell className="capitalize">{p.unit_type}</ResponsiveTableCell>
                    <ResponsiveTableCell>
                      <button onClick={() => toggleActive(p)} className="cursor-pointer">
                        <Badge variant={p.is_active ? 'default' : 'secondary'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id, p.name)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Consulting Fee" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unit Price (KES)</Label>
                <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={e => setForm({...form, unit_price: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Tax Rate (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Unit Type</Label>
                <Select value={form.unit_type} onValueChange={v => setForm({...form, unit_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
