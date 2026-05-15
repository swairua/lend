// PDF Templates for Receipts and Invoices
// Generates HTML content for both browser printing and server-side PDF generation

export interface ReceiptData {
  loanId: number;
  borrowerName: string;
  borrowerPhone?: string;
  repaymentId: number;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  paymentMethod: string;
  referenceNumber?: string;
  paidAt: string;
  remainingBalance: number;
}

export interface InvoiceData {
  loanId: number;
  borrowerName: string;
  borrowerPhone?: string;
  borrowerEmail?: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  termMonths: number;
  principalPaid: number;
  interestPaid: number;
  amountDue: number;
  dueDate?: string;
  createdAt: string;
}

export function generateReceiptHTML(data: ReceiptData): string {
  const paidAt = new Date(data.paidAt);
  const formattedDate = paidAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .receipt-container {
          border: 1px solid #ddd;
          padding: 30px;
          background-color: #f9f9f9;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2c3e50;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #2c3e50;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }
        .content {
          margin: 20px 0;
        }
        .section {
          margin: 20px 0;
        }
        .section-title {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        .info-row label {
          font-weight: 500;
          color: #666;
        }
        .info-row span {
          color: #333;
        }
        .amount-section {
          background-color: #f0f4f8;
          padding: 20px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 14px;
        }
        .amount-row label {
          font-weight: 500;
          color: #666;
        }
        .amount-row.total {
          border-top: 2px solid #2c3e50;
          padding-top: 15px;
          margin-top: 10px;
        }
        .amount-row.total label,
        .amount-row.total span {
          font-weight: 600;
          font-size: 16px;
          color: #2c3e50;
        }
        .currency {
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .receipt-id {
          text-align: center;
          margin-top: 20px;
          padding: 10px;
          background-color: #e8f4f8;
          border-radius: 4px;
          font-size: 12px;
          color: #2c3e50;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>PAYMENT RECEIPT</h1>
          <p>Transaction Record</p>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">BORROWER INFORMATION</div>
            <div class="info-row">
              <label>Name:</label>
              <span>${escapeHtml(data.borrowerName)}</span>
            </div>
            ${data.borrowerPhone ? `<div class="info-row">
              <label>Phone:</label>
              <span>${escapeHtml(data.borrowerPhone)}</span>
            </div>` : ''}
            <div class="info-row">
              <label>Loan ID:</label>
              <span>#${data.loanId}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">PAYMENT DETAILS</div>
            <div class="info-row">
              <label>Receipt No:</label>
              <span>#RCP-${data.repaymentId}</span>
            </div>
            <div class="info-row">
              <label>Payment Date:</label>
              <span>${formattedDate}</span>
            </div>
            <div class="info-row">
              <label>Payment Method:</label>
              <span>${escapeHtml(data.paymentMethod)}</span>
            </div>
            ${data.referenceNumber ? `<div class="info-row">
              <label>Reference:</label>
              <span>${escapeHtml(data.referenceNumber)}</span>
            </div>` : ''}
          </div>

          <div class="amount-section">
            <div class="amount-row">
              <label>Principal Paid:</label>
              <span class="currency">KES ${formatNumber(data.principalPaid)}</span>
            </div>
            <div class="amount-row">
              <label>Interest Paid:</label>
              <span class="currency">KES ${formatNumber(data.interestPaid)}</span>
            </div>
            ${data.penaltyPaid > 0 ? `<div class="amount-row">
              <label>Penalty Paid:</label>
              <span class="currency">KES ${formatNumber(data.penaltyPaid)}</span>
            </div>` : ''}
            <div class="amount-row total">
              <label>Total Paid:</label>
              <span class="currency">KES ${formatNumber(data.amount)}</span>
            </div>
          </div>

          <div class="section">
            <div class="info-row">
              <label>Remaining Balance:</label>
              <span class="currency">KES ${formatNumber(data.remainingBalance)}</span>
            </div>
          </div>
        </div>

        <div class="receipt-id">
          Receipt ID: #RCP-${data.repaymentId}-${Date.now()}
        </div>

        <div class="footer">
          <p>This is an electronically generated receipt. Thank you for your payment.</p>
          <p>For inquiries, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const createdDate = new Date(data.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Loan Invoice</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .invoice-container {
          border: 1px solid #ddd;
          padding: 30px;
          background-color: #f9f9f9;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2c3e50;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #2c3e50;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }
        .content {
          margin: 20px 0;
        }
        .section {
          margin: 20px 0;
        }
        .section-title {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        .info-row label {
          font-weight: 500;
          color: #666;
        }
        .info-row span {
          color: #333;
        }
        .amount-section {
          background-color: #f0f4f8;
          padding: 20px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 14px;
        }
        .amount-row label {
          font-weight: 500;
          color: #666;
        }
        .amount-row.total {
          border-top: 2px solid #2c3e50;
          padding-top: 15px;
          margin-top: 10px;
        }
        .amount-row.total label,
        .amount-row.total span {
          font-weight: 600;
          font-size: 16px;
          color: #2c3e50;
        }
        .amount-row.due {
          background-color: #fff3cd;
          margin: 10px -20px -20px -20px;
          padding: 15px 20px;
          border-radius: 0 0 4px 4px;
        }
        .amount-row.due label,
        .amount-row.due span {
          font-weight: 600;
          color: #856404;
        }
        .currency {
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .invoice-id {
          text-align: center;
          margin-top: 20px;
          padding: 10px;
          background-color: #e8f4f8;
          border-radius: 4px;
          font-size: 12px;
          color: #2c3e50;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>LOAN INVOICE</h1>
          <p>Outstanding Balance Statement</p>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">BORROWER INFORMATION</div>
            <div class="info-row">
              <label>Name:</label>
              <span>${escapeHtml(data.borrowerName)}</span>
            </div>
            ${data.borrowerPhone ? `<div class="info-row">
              <label>Phone:</label>
              <span>${escapeHtml(data.borrowerPhone)}</span>
            </div>` : ''}
            ${data.borrowerEmail ? `<div class="info-row">
              <label>Email:</label>
              <span>${escapeHtml(data.borrowerEmail)}</span>
            </div>` : ''}
            <div class="info-row">
              <label>Loan ID:</label>
              <span>#${data.loanId}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">LOAN DETAILS</div>
            <div class="info-row">
              <label>Loan Duration:</label>
              <span>${data.termMonths} months</span>
            </div>
            <div class="info-row">
              <label>Invoice Date:</label>
              <span>${formattedDate}</span>
            </div>
            ${data.dueDate ? `<div class="info-row">
              <label>Due Date:</label>
              <span>${new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>` : ''}
          </div>

          <div class="amount-section">
            <div class="amount-row">
              <label>Principal Amount:</label>
              <span class="currency">KES ${formatNumber(data.principalAmount)}</span>
            </div>
            <div class="amount-row">
              <label>Interest Amount:</label>
              <span class="currency">KES ${formatNumber(data.interestAmount)}</span>
            </div>
            <div class="amount-row total">
              <label>Total Loan Amount:</label>
              <span class="currency">KES ${formatNumber(data.totalAmount)}</span>
            </div>
            <div class="amount-row">
              <label>Principal Paid:</label>
              <span class="currency">KES ${formatNumber(data.principalPaid)}</span>
            </div>
            <div class="amount-row">
              <label>Interest Paid:</label>
              <span class="currency">KES ${formatNumber(data.interestPaid)}</span>
            </div>
            <div class="amount-row due">
              <label>AMOUNT DUE:</label>
              <span class="currency">KES ${formatNumber(data.amountDue)}</span>
            </div>
          </div>
        </div>

        <div class="invoice-id">
          Invoice ID: #INV-${data.loanId}-${Date.now()}
        </div>

        <div class="footer">
          <p>This invoice represents your outstanding loan balance.</p>
          <p>Please make payment as per the agreed schedule. Contact us for any clarifications.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
