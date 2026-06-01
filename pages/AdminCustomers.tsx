import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { adminApi } from '../types/api';
import { useAlert } from '@/hooks/use-alert';
import { toast } from 'sonner';
import { normalizeList } from '../utils/normalize';

interface Customer { id: number; name: string; email: string; phone: string; address: string; company: string; notes: string; created_at: string; updated_at: string; }

const defaultCustomer = { name: '', email: '', phone: '', address: '', company: '', notes: '' };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(defaultCustomer);
  const alert = useAlert();

  const load = async (q = '') => {
    setLoading(true);
    try {
      const res = await adminApi.getCustomers(q || undefined);
      setCustomers(normalizeList(res.data) as Customer[]);
    } catch (e: any) { toast.error(e.message || 'Failed to load customers');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(defaultCustomer); setDialogOpen(true); };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', company: c.company || '', notes: c.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Customer name is required'); return; }
    try {
      if (editing) {
        await adminApi.updateCustomer(editing.id, form);
        toast.success('Customer updated');
      } else {
        await adminApi.createCustomer(form);
        toast.success('Customer created');
      }
      setDialogOpen(false);
      load(search);
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const handleDelete = (id: number, name: string) => {
    alert.show({
      title: 'Delete Customer', message: `Delete "${name}"? This cannot be undone.`, confirmText: 'Delete', variant: 'destructive',
      onConfirm: async () => { try { await adminApi.deleteCustomer(id); toast.success('Customer deleted'); load(search); } catch (e: any) { toast.error(e.message || 'Delete failed'); } },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Customers</h1><p className="text-gray-600">Manage customers for quotations and invoices</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Customers</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <Input className="pl-8" placeholder="Search by name, email, phone..." value={search} onChange={e => { setSearch(e.target.value); load(e.target.value); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>)
          : customers.length === 0 ? (<p className="text-center text-gray-500 py-8">No customers found.</p>)
          : (<ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead>Name</ResponsiveTableHead>
                  <ResponsiveTableHead>Company</ResponsiveTableHead>
                  <ResponsiveTableHead>Email</ResponsiveTableHead>
                  <ResponsiveTableHead>Phone</ResponsiveTableHead>
                  <ResponsiveTableHead>Address</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {customers.map(c => (
                  <ResponsiveTableRow key={c.id}>
                    <ResponsiveTableCell className="font-medium">{c.name}</ResponsiveTableCell>
                    <ResponsiveTableCell>{c.company || '-'}</ResponsiveTableCell>
                    <ResponsiveTableCell>{c.email || '-'}</ResponsiveTableCell>
                    <ResponsiveTableCell>{c.phone || '-'}</ResponsiveTableCell>
                    <ResponsiveTableCell className="max-w-xs truncate">{c.address || '-'}</ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id, c.name)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>)}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Customer Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@example.com" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+254 7XX XXX XXX" /></div>
            </div>
            <div><Label>Company</Label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company name (optional)" /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Physical address" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Internal notes" /></div>
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
