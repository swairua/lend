import { getFileUrl } from './api';

export interface CompanySettings {
  company_name: string;
  company_logo: string;
  company_email: string;
  company_phone: string;
  company_address: string;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export interface DocumentData {
  number: string;
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  date_label: string;
  date_value: string;
  due_label?: string;
  due_value?: string;
  items: DocumentItem[];
  subtotal: number;
  tax_total: number;
  discount: number;
  grand_total: number;
  notes: string;
  status: string;
}

function htmlEscape(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildBrandedDocumentHtml(data: DocumentData, company: CompanySettings): string {
  const logoUrl = company.company_logo ? getFileUrl(company.company_logo) : '';
  const logoHtml = logoUrl
    ? `<img src="${htmlEscape(logoUrl)}" alt="Logo" style="max-height:70px;max-width:200px;" />`
    : `<h1 style="margin:0;color:#1a1a2e;font-size:24px;">${htmlEscape(company.company_name || 'Company Name')}</h1>`;

  const itemsHtml = data.items.map(it => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">${htmlEscape(it.description)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">KES ${it.unit_price.toLocaleString('en-KE', {minimumFractionDigits:2})}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.tax_rate}%</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:500;">KES ${it.amount.toLocaleString('en-KE', {minimumFractionDigits:2})}</td>
    </tr>`).join('');

  const statusColors: Record<string, string> = {
    draft: '#94a3b8', sent: '#3b82f6', accepted: '#22c55e',
    paid: '#22c55e', overdue: '#ef4444', cancelled: '#94a3b8',
  };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${htmlEscape(data.title)} - ${htmlEscape(data.number)}</title>
<style>
  @page { margin: 20mm 15mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; font-size: 13px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1a1a2e; }
  .company-info p { margin: 2px 0; color: #64748b; font-size: 12px; }
  .doc-title { text-align: right; }
  .doc-title h2 { margin: 0; font-size: 28px; color: #1a1a2e; letter-spacing: 1px; }
  .doc-title .number { font-size: 16px; color: #64748b; margin: 4px 0; }
  .status-badge { display: inline-block; padding: 4px 14px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #fff; background: ${statusColors[data.status] || '#94a3b8'}; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .parties > div { width: 48%; }
  .parties h3 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
  .parties p { margin: 2px 0; }
  .dates { display: flex; gap: 30px; margin-bottom: 25px; font-size: 12px; color: #64748b; }
  .dates span { font-weight: 600; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #1a1a2e; color: #fff; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 6px 0 0 0; }
  thead th:last-child { border-radius: 0 6px 0 0; }
  tbody tr:hover { background: #f8fafc; }
  .totals { width: 350px; margin-left: auto; border-collapse: collapse; }
  .totals td { padding: 6px 8px; }
  .totals .label { text-align: left; color: #64748b; }
  .totals .value { text-align: right; }
  .totals .grand-total td { font-weight: 700; font-size: 16px; border-top: 2px solid #1a1a2e; padding-top: 10px; color: #1a1a2e; }
  .notes { margin-top: 30px; padding: 16px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #1a1a2e; }
  .notes h4 { margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #64748b; }
  .notes p { margin: 0; white-space: pre-wrap; font-size: 12px; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
</style></head>
<body>
  <div class="header">
    <div>
      ${logoHtml}
      <div class="company-info">
        ${company.company_email ? `<p>${htmlEscape(company.company_email)}</p>` : ''}
        ${company.company_phone ? `<p>${htmlEscape(company.company_phone)}</p>` : ''}
        ${company.company_address ? `<p>${htmlEscape(company.company_address)}</p>` : ''}
      </div>
    </div>
    <div class="doc-title">
      <h2>${htmlEscape(data.title)}</h2>
      <p class="number">${htmlEscape(data.number)}</p>
      <span class="status-badge">${htmlEscape(data.status)}</span>
    </div>
  </div>

  <div class="dates">
    <div>${htmlEscape(data.date_label)}: <span>${htmlEscape(data.date_value)}</span></div>
    ${data.due_value ? `<div>${htmlEscape(data.due_label || 'Due Date')}: <span>${htmlEscape(data.due_value)}</span></div>` : ''}
  </div>

  <div class="parties">
    <div>
      <h3>Bill To</h3>
      <p style="font-weight:600;font-size:15px;">${htmlEscape(data.client_name)}</p>
      ${data.client_email ? `<p>${htmlEscape(data.client_email)}</p>` : ''}
      ${data.client_phone ? `<p>${htmlEscape(data.client_phone)}</p>` : ''}
      ${data.client_address ? `<p>${htmlEscape(data.client_address)}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <h3>${htmlEscape(company.company_name || 'Company')}</h3>
      ${company.company_email ? `<p>${htmlEscape(company.company_email)}</p>` : ''}
      ${company.company_phone ? `<p>${htmlEscape(company.company_phone)}</p>` : ''}
    </div>
  </div>

  <table>
    <thead><tr>
      <th style="width:45%;">Description</th><th style="width:8%;">Qty</th>
      <th style="width:17%;">Unit Price</th><th style="width:8%;">Tax</th>
      <th style="width:17%;text-align:right;">Amount</th>
    </tr></thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <table class="totals">
    <tr><td class="label">Subtotal</td><td class="value">KES ${data.subtotal.toLocaleString('en-KE', {minimumFractionDigits:2})}</td></tr>
    <tr><td class="label">Tax Total</td><td class="value">KES ${data.tax_total.toLocaleString('en-KE', {minimumFractionDigits:2})}</td></tr>
    ${data.discount > 0 ? `<tr><td class="label">Discount</td><td class="value">-KES ${data.discount.toLocaleString('en-KE', {minimumFractionDigits:2})}</td></tr>` : ''}
    <tr class="grand-total"><td class="label">Grand Total</td><td class="value">KES ${data.grand_total.toLocaleString('en-KE', {minimumFractionDigits:2})}</td></tr>
  </table>

  ${data.notes ? `<div class="notes"><h4>Notes</h4><p>${htmlEscape(data.notes)}</p></div>` : ''}

  <div class="footer">
    <p>${htmlEscape(company.company_name || '')} &bull; Generated on ${new Date().toLocaleDateString('en-KE', {year:'numeric',month:'long',day:'numeric'})}</p>
  </div>
</body></html>`;
}

export async function openPrintWindow(html: string): Promise<void> {
  const w = window.open('', '_blank');
  if (!w) throw new Error('Pop-up blocked');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
