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
import { Loader2, Plus, Eye, Trash2, Printer, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { adminApi, formatKES, formatDate } from '../types/api';
import { useAlert } from '@/hooks/use-alert';
import { toast } from 'sonner';
import { normalizeList } from '../utils/normalize';
import { buildBrandedDocumentHtml, openPrintWindow } from '../utils/documentHtml';

interface Invoice { id: number; invoice_number: string; quotation_id: number | null; quote_number?: string; customer_id: number | null; customer_name?: string; client_name: string; client_email: string; client_phone: string; client_address: string; invoice_date: string; due_date: string; subtotal: number; tax_total: number; discount: number; grand_total: number; notes: string; status: string; created_by_name?: string; created_at: string; items?: InvoiceItem[]; }

interface InvoiceItem { id?: number; invoice_product_id: number | null; description: string; quantity: number; unit_price: number; tax_rate: number; amount: number; product_name?: string; }

interface InvoiceProduct { id: number; name: string; unit_price: number; tax_rate: number; }

interface Customer { id: number; name: string; email: string; phone: string; address: string; company: string; }

const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-800', sent: 'bg-blue-100 text-blue-800', paid: 'bg-green-100 text-green-800', overdue: 'bg-red-100 text-red-800', cancelled: 'bg-gray-100 text-gray-500' };

const emptyItem = { invoice_product_id: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, amount: 0 };

export default function AdminInvoices() {
  const alert = useAlert();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [invoiceProducts, setInvoiceProducts] = useState<InvoiceProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const [form, setForm] = useState({
    customer_id: null as number | null,
    client_name: '', client_email: '', client_phone: '', client_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', notes: '', subtotal: 0, tax_total: 0, discount: 0, grand_total: 0,
    items: [{ ...emptyItem }],
  });

  const load = async (p = 1) => {
    setLoading(true); setPage(p);
    try {
      const res = await adminApi.getInvoices({ page: p, limit });
      setInvoices(normalizeList(res.data.invoices) as Invoice[]);
      setTotal(res.data.pagination.total);
    } catch (e: any) { toast.error(e.message || 'Failed to load invoices');
    } finally { setLoading(false); }
  };

  const loadProducts = async () => {
    try { const res = await adminApi.getInvoiceProducts(); setInvoiceProducts((normalizeList(res.data) as InvoiceProduct[]).filter(p => p.is_active)); } catch (_) {}
  };

  const loadCustomers = async (search = '') => {
    try { const res = await adminApi.getCustomers(search || undefined); setCustomers(normalizeList(res.data) as Customer[]); } catch (_) {}
  };

  useEffect(() => { load(); loadProducts(); loadCustomers(); }, []);

  const recalc = (items: typeof form.items, discount = form.discount) => {
    let subtotal = 0, tax_total = 0;
    items.forEach(it => { const amt = it.quantity * it.unit_price; it.amount = amt; subtotal += amt; tax_total += amt * (it.tax_rate / 100); });
    setForm(prev => ({ ...prev, items, subtotal, tax_total, grand_total: subtotal + tax_total - discount }));
  };

  const addItem = () => recalc([...form.items, { ...emptyItem }]);
  const removeItem = (idx: number) => { if (form.items.length <= 1) return; recalc(form.items.filter((_, i) => i !== idx)); };

  const updateItem = (idx: number, field: string, value: any) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === 'invoice_product_id' && value) {
        const prod = invoiceProducts.find(p => p.id === value);
        if (prod) { updated.description = prod.name; updated.unit_price = prod.unit_price; updated.tax_rate = prod.tax_rate; }
      }
      return updated;
    });
    recalc(items);
  };

  const selectCustomer = (id: number) => {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    setForm(prev => ({ ...prev, customer_id: id, client_name: c.name, client_email: c.email || '', client_phone: c.phone || '', client_address: c.address || '' }));
  };

  const openCreate = () => {
    setForm({ customer_id: null, client_name: '', client_email: '', client_phone: '', client_address: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', notes: '', subtotal: 0, tax_total: 0, discount: 0, grand_total: 0, items: [{ ...emptyItem }] });
    setDialogOpen(true);
  };

  const openDetail = async (inv: Invoice) => {
    try { const res = await adminApi.getInvoice(inv.id); setSelected(res.data); setDetailOpen(true); } catch (e: any) { toast.error(e.message || 'Failed to load invoice'); }
  };

  const handleSave = async () => {
    if (!form.client_name.trim()) { toast.error('Client name is required'); return; }
    try {
      await adminApi.createInvoice({ ...form, items: form.items.map(it => ({ ...it })) });
      toast.success('Invoice created'); setDialogOpen(false); load(1);
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const handleDelete = (id: number, num: string) => {
    alert.show({ title: 'Delete Invoice', message: `Delete ${num}?`, confirmText: 'Delete', variant: 'destructive',
      onConfirm: async () => { try { await adminApi.deleteInvoice(id); toast.success('Invoice deleted'); load(page); } catch (e: any) { toast.error(e.message || 'Delete failed'); } } });
  };

  const handleStatus = async (id: number, status: string) => {
    try { await adminApi.updateInvoiceStatus(id, status); toast.success('Status updated'); load(page); if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev); } catch (e: any) { toast.error(e.message || 'Status update failed'); }
  };

  const handlePrint = async (inv: Invoice) => {
    try {
      let invoice = inv;
      if (!inv.items) { const res = await adminApi.getInvoice(inv.id); invoice = res.data; }
      const config = await adminApi.getConfig();
      const company = { company_name: config.data.company_name || 'Company', company_logo: config.data.company_logo || '', company_email: config.data.company_email || '', company_phone: config.data.company_phone || '', company_address: config.data.company_address || '' };
      const html = buildBrandedDocumentHtml({
        number: invoice.invoice_number, title: 'INVOICE',
        client_name: invoice.client_name, client_email: invoice.client_email, client_phone: invoice.client_phone, client_address: invoice.client_address,
        date_label: 'Invoice Date', date_value: formatDate(invoice.invoice_date), due_label: 'Due Date', due_value: invoice.due_date ? formatDate(invoice.due_date) : undefined,
        items: (invoice.items || []).map(it => ({ description: it.description, quantity: it.quantity, unit_price: it.unit_price, tax_rate: it.tax_rate, amount: it.amount })),
        subtotal: invoice.subtotal, tax_total: invoice.tax_total, discount: invoice.discount, grand_total: invoice.grand_total,
        notes: invoice.notes || '', status: invoice.status,
      }, company);
      await openPrintWindow(html);
    } catch (e: any) { toast.error(e.message || 'Print failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Invoices</h1><p className="text-gray-600">Manage client invoices</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load(page)}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? (<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>)
          : invoices.length === 0 ? (<p className="text-center text-gray-500 py-8">No invoices yet.</p>)
          : (<ResponsiveTable>
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead>Invoice #</ResponsiveTableHead>
                  <ResponsiveTableHead>Client</ResponsiveTableHead>
                  <ResponsiveTableHead>Date</ResponsiveTableHead>
                  <ResponsiveTableHead>Due</ResponsiveTableHead>
                  <ResponsiveTableHead>Amount</ResponsiveTableHead>
                  <ResponsiveTableHead>Status</ResponsiveTableHead>
                  <ResponsiveTableHead className="text-right">Actions</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {invoices.map(inv => (
                  <ResponsiveTableRow key={inv.id}>
                    <ResponsiveTableCell className="font-medium">{inv.invoice_number}</ResponsiveTableCell>
                    <ResponsiveTableCell>
                      {inv.client_name}
                      {inv.customer_name && <span className="text-xs text-gray-400 ml-1">({inv.customer_name})</span>}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell>{formatDate(inv.invoice_date)}</ResponsiveTableCell>
                    <ResponsiveTableCell>{formatDate(inv.due_date)}</ResponsiveTableCell>
                    <ResponsiveTableCell>{formatKES(inv.grand_total)}</ResponsiveTableCell>
                    <ResponsiveTableCell><Badge className={statusColors[inv.status] || ''}>{inv.status}</Badge></ResponsiveTableCell>
                    <ResponsiveTableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDetail(inv)}><Eye className="w-3 h-3" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(inv)}><Printer className="w-3 h-3" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(inv.id, inv.invoice_number)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTable>)}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">Total: {total} invoices</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => load(page - 1)} disabled={page <= 1 || loading}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => load(page + 1)} disabled={page * limit >= total || loading}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Customer (optional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                  <Input className="pl-8" placeholder="Search customers..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); loadCustomers(e.target.value); }} />
                </div>
                <Select value={form.customer_id?.toString() || ''} onValueChange={v => selectCustomer(parseInt(v))}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Choose customer..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}{c.company ? ` (${c.company})` : ''}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Client Name *</Label><Input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} /></div>
              <div><Label>Client Email</Label><Input value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} /></div>
              <div><Label>Client Phone</Label><Input value={form.client_phone} onChange={e => setForm({...form, client_phone: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} /></div>
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
              </div>
              <div className="col-span-2"><Label>Client Address</Label><Input value={form.client_address} onChange={e => setForm({...form, client_address: e.target.value})} /></div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2"><Label className="text-base font-semibold">Line Items</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add Item</Button></div>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-3"><Label className="text-xs">Product</Label>
                    <Select value={item.invoice_product_id?.toString() || ''} onValueChange={v => updateItem(idx, 'invoice_product_id', parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{invoiceProducts.map(p => (<SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3"><Label className="text-xs">Description</Label><Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></div>
                  <div className="col-span-1"><Label className="text-xs">Qty</Label><Input type="number" min="0.01" step="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2"><Label className="text-xs">Price</Label><Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-1"><Label className="text-xs">Tax %</Label><Input type="number" min="0" max="100" value={item.tax_rate} onChange={e => updateItem(idx, 'tax_rate', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-1"><Label className="text-xs">Amt</Label><div className="text-sm font-medium py-2">{formatKES(item.amount)}</div></div>
                  <div className="col-span-1"><Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(idx)} disabled={form.items.length <= 1}><Trash2 className="w-3 h-3" /></Button></div>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatKES(form.subtotal)}</span></div>
                <div className="flex justify-between"><span>Tax:</span><span>{formatKES(form.tax_total)}</span></div>
                <div className="flex justify-between items-center"><span>Discount:</span><Input type="number" min="0" className="w-32 h-7 text-sm" value={form.discount} onChange={e => { const d = parseFloat(e.target.value) || 0; setForm(prev => ({...prev, discount: d, grand_total: prev.subtotal + prev.tax_total - d})); }} /></div>
                <div className="flex justify-between font-bold text-base"><span>Grand Total:</span><span>{formatKES(form.grand_total)}</span></div>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave}>Create Invoice</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.invoice_number || 'Invoice'}</DialogTitle></DialogHeader>
          {selected && (<div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge className={statusColors[selected.status] || ''}>{selected.status}</Badge>
              <div className="flex gap-2">
                {selected.status === 'draft' && <Button size="sm" onClick={() => handleStatus(selected.id, 'sent')}>Mark Sent</Button>}
                {selected.status === 'sent' && (<><Button size="sm" variant="outline" onClick={() => handleStatus(selected.id, 'paid')}>Mark Paid</Button><Button size="sm" variant="outline" onClick={() => handleStatus(selected.id, 'overdue')}>Mark Overdue</Button></>)}
                {selected.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => handleStatus(selected.id, 'cancelled')}>Cancel</Button>}
                <Button size="sm" onClick={() => handlePrint(selected)}><Printer className="w-3 h-3 mr-1" />Print</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Bill To</p>
                <p className="font-medium">{selected.client_name}</p>
                {selected.customer_name && <p className="text-xs text-gray-400">Customer: {selected.customer_name}</p>}
                {selected.client_email && <p className="text-sm">{selected.client_email}</p>}
                {selected.client_phone && <p className="text-sm">{selected.client_phone}</p>}
                {selected.client_address && <p className="text-sm">{selected.client_address}</p>}
              </div>
              <div className="text-right"><p className="text-xs text-gray-500">Dates</p><p>Invoice: {formatDate(selected.invoice_date)}</p>{selected.due_date && <p>Due: {formatDate(selected.due_date)}</p>}{selected.quote_number && <p className="text-xs mt-1">From: {selected.quote_number}</p>}</div>
            </div>

            {(selected.items && selected.items.length > 0) ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Price</th><th className="text-right py-2">Tax</th><th className="text-right py-2">Amount</th></tr></thead>
                <tbody>{selected.items.map((it, i) => (<tr key={i} className="border-b"><td className="py-2">{it.description}</td><td className="text-right py-2">{it.quantity}</td><td className="text-right py-2">{formatKES(it.unit_price)}</td><td className="text-right py-2">{it.tax_rate}%</td><td className="text-right py-2 font-medium">{formatKES(it.amount)}</td></tr>))}</tbody>
              </table>
            ) : <p className="text-gray-500 text-sm">No line items</p>}

            <div className="border-t pt-2 space-y-1 text-sm text-right">
              <p>Subtotal: {formatKES(selected.subtotal)}</p><p>Tax: {formatKES(selected.tax_total)}</p>
              {selected.discount > 0 && <p>Discount: -{formatKES(selected.discount)}</p>}
              <p className="font-bold text-base">Total: {formatKES(selected.grand_total)}</p>
            </div>
            {selected.notes && (<div><p className="text-xs text-gray-500">Notes</p><p className="text-sm whitespace-pre-wrap">{selected.notes}</p></div>)}
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
