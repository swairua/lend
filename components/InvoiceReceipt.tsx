import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

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
    const el = document.getElementById("print-doc");
    if (!el) return;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write("<html><head><title>" + title + "</title>");
    w.document.write("<style>body{font-family:Arial,sans-serif;padding:40px;color:#111;} table{width:100%;border-collapse:collapse;} td,th{padding:8px 12px;border:1px solid #ddd;} th{background:#f3f4f6;} .header{display:flex;justify-content:space-between;margin-bottom:24px;} .total{font-weight:bold;font-size:1.1em;} .badge{display:inline-block;padding:4px 12px;border-radius:20px;background:#dcfce7;color:#166534;font-weight:bold;}</style>");
    w.document.write("</head><body>");
    w.document.write(el.innerHTML);
    w.document.write("</body></html>");
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
              <h1 className="text-2xl font-bold text-blue-800">LendHub</h1>
              <p className="text-sm text-gray-500">Modern Lending Platform</p>
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
            <p className="font-semibold text-gray-600 mb-1">Thank you for banking with LendHub</p>
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
