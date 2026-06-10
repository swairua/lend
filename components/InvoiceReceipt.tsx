import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { buildPDFHeaderHTML } from "@/utils/pdfHeader";

interface InvoiceReceiptProps {
  open: boolean;
  onClose: () => void;
  type: "invoice" | "receipt";
  loan: any;
  repayment?: any;
  userName?: string;
}

export default function InvoiceReceipt({ open, onClose, type, loan, repayment, userName }: InvoiceReceiptProps) {
  const isInvoice = type === "invoice";
  const title = isInvoice ? "LOAN INVOICE" : "PAYMENT RECEIPT";
  const docNo = isInvoice ? "INV-" + loan?.id + "-" + new Date().getFullYear() : "RCP-" + (repayment?.id || loan?.id);
  const today = new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });

  const formatKES = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n || 0);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;

    const headerHtml = buildPDFHeaderHTML({
      companyName: "JECRI BUREAU",
      title,
      documentNumber: docNo,
      date: today,
    });

    const lineItemsHtml = isInvoice
      ? `
        <tr><td class="p">Principal Amount</td><td class="p tr">${formatKES(loan?.principal_amount)}</td></tr>
        ${loan?.interest_amount > 0 ? `<tr><td class="p">Interest</td><td class="p tr">${formatKES(loan?.interest_amount)}</td></tr>` : ''}
        ${loan?.processing_fee > 0 ? `<tr><td class="p">Processing Fee</td><td class="p tr">${formatKES(loan?.processing_fee)}</td></tr>` : ''}
        ${loan?.asset_transfer_fee > 0 ? `<tr><td class="p">Asset Transfer Fee</td><td class="p tr">${formatKES(loan?.asset_transfer_fee)}</td></tr>` : ''}
        <tr class="fb bg-g"><td class="p">Total Repayable</td><td class="p tr">${formatKES(loan?.total_amount)}</td></tr>
        <tr><td class="p">Amount Paid</td><td class="p tr cg">${formatKES(loan?.total_paid)}</td></tr>
        <tr class="fb"><td class="p">Outstanding Balance</td><td class="p tr cr">${formatKES(loan?.balance)}</td></tr>`
      : `
        <tr><td class="p">Payment Amount</td><td class="p tr">${formatKES(repayment?.amount || loan?.total_paid)}</td></tr>
        ${repayment?.principal_paid > 0 ? `<tr><td class="p pl">Principal</td><td class="p tr">${formatKES(repayment?.principal_paid)}</td></tr>` : ''}
        ${repayment?.interest_paid > 0 ? `<tr><td class="p pl">Interest</td><td class="p tr">${formatKES(repayment?.interest_paid)}</td></tr>` : ''}
        ${repayment?.penalty_paid > 0 ? `<tr><td class="p pl">Penalties</td><td class="p tr cr">${formatKES(repayment?.penalty_paid)}</td></tr>` : ''}
        <tr><td class="p">Payment Method</td><td class="p tr cap">${repayment?.payment_method || '-'}</td></tr>
        ${repayment?.reference_number ? `<tr><td class="p">Reference</td><td class="p tr">${repayment?.reference_number}</td></tr>` : ''}
        <tr><td class="p">Remaining Balance</td><td class="p tr">${formatKES(loan?.balance)}</td></tr>`;

    w.document.write(`<html><head><title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;padding:40px;color:#111;font-size:13px;}
  .container{max-width:700px;margin:0 auto;}
  table{width:100%;border-collapse:collapse;margin:20px 0;}
  td,th{padding:10px 12px;border:1px solid #ddd;}
  th{background:#f3f4f6;text-align:left;}
  .tr{text-align:right;}
  .fb{font-weight:bold;}
  .bg-g{background:#f9fafb;}
  .cg{color:#16a34a;}
  .cr{color:#dc2626;}
  .cap{text-transform:capitalize;}
  .pl{padding-left:24px!important;color:#666;}
  .p{padding:10px 12px;border:1px solid #ddd;}
  .footer{text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:11px;color:#999;}
</style></head><body>
<div class="container">
  ${headerHtml}
  <div style="display:flex;gap:40px;margin:20px 0;">
    <div>
      <div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:4px;">${isInvoice ? 'Bill To' : 'Received From'}</div>
      <div style="font-weight:600;">${userName || loan?.borrower_name || 'Borrower'}</div>
      <div style="font-size:12px;color:#666;">Loan #${loan?.id}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:4px;">Loan Product</div>
      <div style="font-weight:600;">${loan?.product_name || 'Loan'}</div>
      <div style="font-size:12px;color:#666;">${loan?.term_months} months term</div>
    </div>
  </div>
  <table><thead><tr><th>Description</th><th class="tr">Amount (KES)</th></tr></thead><tbody>${lineItemsHtml}</tbody></table>
  <div class="footer">
    <p style="font-weight:600;color:#444;margin:0 0 4px;">Thank you for banking with JECRI BUREAU</p>
    <p style="margin:0;">This is a computer-generated document. No signature required.</p>
  </div>
</div></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isInvoice ? "Loan Invoice" : "Payment Receipt"}</DialogTitle>
        </DialogHeader>

        <div id="print-doc" className="border rounded-lg p-6 space-y-6 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-amber-900">JECRI BUREAU</h1>
              <p className="text-sm text-gray-500">Lending Institution</p>
              <p className="text-sm text-gray-500">lending.wayrus.co.ke</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-700">{title}</p>
              <p className="text-sm text-gray-500">No: {docNo}</p>
              <p className="text-sm text-gray-500">Date: {today}</p>
            </div>
          </div>

          <hr />

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{isInvoice ? "Bill To" : "Received From"}</p>
              <p className="font-semibold">{userName || loan?.borrower_name || "Borrower"}</p>
              <p className="text-sm text-gray-500">Loan #{loan?.id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Loan Product</p>
              <p className="font-semibold">{loan?.product_name || "Loan"}</p>
              <p className="text-sm text-gray-500">{loan?.term_months} months term</p>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-gray-50">
              <th className="text-left p-3 border">Description</th>
              <th className="text-right p-3 border">Amount (KES)</th>
            </tr></thead>
            <tbody>
              {isInvoice ? (
                <>
                  <tr><td className="p-3 border">Principal Amount</td><td className="p-3 border text-right">{formatKES(loan?.principal_amount)}</td></tr>
                  {loan?.interest_amount > 0 && <tr><td className="p-3 border">Interest</td><td className="p-3 border text-right">{formatKES(loan?.interest_amount)}</td></tr>}
                  {loan?.processing_fee > 0 && <tr><td className="p-3 border">Processing Fee</td><td className="p-3 border text-right">{formatKES(loan?.processing_fee)}</td></tr>}
                  {loan?.asset_transfer_fee > 0 && <tr><td className="p-3 border">Asset Transfer Fee</td><td className="p-3 border text-right">{formatKES(loan?.asset_transfer_fee)}</td></tr>}
                  <tr className="font-bold bg-gray-50"><td className="p-3 border">Total Repayable</td><td className="p-3 border text-right">{formatKES(loan?.total_amount)}</td></tr>
                  <tr><td className="p-3 border">Amount Paid</td><td className="p-3 border text-right text-green-600">{formatKES(loan?.total_paid)}</td></tr>
                  <tr className="font-bold"><td className="p-3 border">Outstanding Balance</td><td className="p-3 border text-right text-red-600">{formatKES(loan?.balance)}</td></tr>
                </>
              ) : (
                <>
                  <tr><td className="p-3 border">Payment Amount</td><td className="p-3 border text-right">{formatKES(repayment?.amount || loan?.total_paid)}</td></tr>
                  {repayment?.principal_paid > 0 && <tr><td className="p-3 border pl-6 text-gray-500">Principal</td><td className="p-3 border text-right">{formatKES(repayment?.principal_paid)}</td></tr>}
                  {repayment?.interest_paid > 0 && <tr><td className="p-3 border pl-6 text-gray-500">Interest</td><td className="p-3 border text-right">{formatKES(repayment?.interest_paid)}</td></tr>}
                  {repayment?.penalty_paid > 0 && <tr><td className="p-3 border pl-6 text-gray-500">Penalties</td><td className="p-3 border text-right text-red-600">{formatKES(repayment?.penalty_paid)}</td></tr>}
                  <tr><td className="p-3 border">Payment Method</td><td className="p-3 border text-right capitalize">{repayment?.payment_method || "-"}</td></tr>
                  {repayment?.reference_number && <tr><td className="p-3 border">Reference</td><td className="p-3 border text-right">{repayment?.reference_number}</td></tr>}
                  <tr><td className="p-3 border">Remaining Balance</td><td className="p-3 border text-right">{formatKES(loan?.balance)}</td></tr>
                </>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p className="font-semibold text-gray-600 mb-1">Thank you for banking with JECRI BUREAU</p>
            <p>This is a computer-generated document. No signature required.</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}><X className="mr-2 h-4 w-4" />Close</Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print / Download</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
