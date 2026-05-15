// PDF Template Generators for both client and server use
import { Loan, Repayment } from '../types/api';

interface ReceiptData {
  repayment: Repayment & { loan_id: number };
  loan: Loan;
  borrowerName: string;
  borrowerEmail: string;
}

interface InvoiceData {
  loan: Loan;
  borrowerName: string;
  borrowerEmail: string;
  totalPaid: number;
  balance: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function generateReceiptHTML(data: ReceiptData): string {
  const { repayment, loan, borrowerName, borrowerEmail } = data;
  const receiptDate = formatDate(repayment.paid_at);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .title { font-size: 20px; font-weight: bold; margin: 10px 0; }
        .receipt-no { color: #666; font-size: 12px; }
        .section { margin-bottom: 25px; }
        .section-title { font-weight: bold; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { color: #666; }
        .amount { font-weight: bold; text-align: right; }
        .total-row { border-top: 1px solid #ddd; padding-top: 10px; font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
        .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">LENDING PLATFORM</div>
          <div class="title">Payment Receipt</div>
          <div class="receipt-no">Receipt #${repayment.id}</div>
        </div>

        <div class="section">
          <div class="section-title">Borrower Information</div>
          <div class="row">
            <span class="label">Name:</span>
            <span>${borrowerName}</span>
          </div>
          <div class="row">
            <span class="label">Email:</span>
            <span>${borrowerEmail}</span>
          </div>
          <div class="row">
            <span class="label">Loan ID:</span>
            <span>LOAN-${loan.id}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Payment Details</div>
          <div class="summary">
            <div class="row">
              <span class="label">Payment Date:</span>
              <span>${receiptDate}</span>
            </div>
            <div class="row">
              <span class="label">Payment Method:</span>
              <span>${repayment.payment_method.toUpperCase()}</span>
            </div>
            ${repayment.reference_number ? `
            <div class="row">
              <span class="label">Reference:</span>
              <span>${repayment.reference_number}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Payment Breakdown</div>
          <div class="row">
            <span class="label">Principal Paid:</span>
            <span class="amount">${formatCurrency(repayment.principal_paid)}</span>
          </div>
          <div class="row">
            <span class="label">Interest Paid:</span>
            <span class="amount">${formatCurrency(repayment.interest_paid)}</span>
          </div>
          <div class="row">
            <span class="label">Penalty/Late Fee:</span>
            <span class="amount">${formatCurrency(repayment.penalty_paid)}</span>
          </div>
          <div class="row total-row">
            <span>Total Paid:</span>
            <span class="amount">${formatCurrency(repayment.amount)}</span>
          </div>
        </div>

        <div class="footer">
          <p>This is an automatically generated receipt. Please keep this for your records.</p>
          <p>Generated on ${formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const { loan, borrowerName, borrowerEmail, totalPaid, balance } = data;
  const dueDate = loan.due_date ? formatDate(loan.due_date) : 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .title { font-size: 20px; font-weight: bold; margin: 10px 0; }
        .invoice-no { color: #666; font-size: 12px; }
        .section { margin-bottom: 25px; }
        .section-title { font-weight: bold; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { color: #666; }
        .amount { font-weight: bold; text-align: right; }
        .total-row { border-top: 2px solid #2563eb; padding-top: 10px; font-weight: bold; font-size: 16px; color: #2563eb; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
        .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
        .alert { background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 5px; margin-bottom: 20px; }
        .alert-text { color: #991b1b; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">LENDING PLATFORM</div>
          <div class="title">Loan Invoice</div>
          <div class="invoice-no">Invoice #INV-${loan.id}</div>
        </div>

        ${balance > 0 ? `
        <div class="alert">
          <div class="alert-text">⚠️ Amount Due: ${formatCurrency(balance)}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Borrower Information</div>
          <div class="row">
            <span class="label">Name:</span>
            <span>${borrowerName}</span>
          </div>
          <div class="row">
            <span class="label">Email:</span>
            <span>${borrowerEmail}</span>
          </div>
          <div class="row">
            <span class="label">Loan ID:</span>
            <span>LOAN-${loan.id}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Loan Summary</div>
          <div class="summary">
            <div class="row">
              <span class="label">Product:</span>
              <span>${loan.product_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Status:</span>
              <span>${loan.status.toUpperCase()}</span>
            </div>
            <div class="row">
              <span class="label">Loan Term:</span>
              <span>${loan.term_months} months</span>
            </div>
            <div class="row">
              <span class="label">Due Date:</span>
              <span>${dueDate}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Financial Summary</div>
          <div class="row">
            <span class="label">Principal Amount:</span>
            <span class="amount">${formatCurrency(loan.principal_amount)}</span>
          </div>
          <div class="row">
            <span class="label">Interest Charges:</span>
            <span class="amount">${formatCurrency(loan.interest_amount)}</span>
          </div>
          <div class="row">
            <span class="label">Processing Fee:</span>
            <span class="amount">${formatCurrency(loan.processing_fee)}</span>
          </div>
          ${loan.asset_transfer_fee > 0 ? `
          <div class="row">
            <span class="label">Asset Transfer Fee:</span>
            <span class="amount">${formatCurrency(loan.asset_transfer_fee)}</span>
          </div>
          ` : ''}
          ${loan.tracking_system_fee > 0 ? `
          <div class="row">
            <span class="label">Tracking System Fee:</span>
            <span class="amount">${formatCurrency(loan.tracking_system_fee)}</span>
          </div>
          ` : ''}
          <div class="row" style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
            <span class="label">Total Loan Amount:</span>
            <span class="amount">${formatCurrency(loan.total_amount)}</span>
          </div>
          <div class="row">
            <span class="label">Amount Paid:</span>
            <span class="amount">${formatCurrency(totalPaid)}</span>
          </div>
          <div class="row total-row">
            <span>Balance Due:</span>
            <span class="amount">${formatCurrency(balance)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Please remit payment for the balance due to complete this loan.</p>
          <p>Generated on ${formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
