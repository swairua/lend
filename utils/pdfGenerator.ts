// Server-side PDF generation using pdfkit
import PDFDocument from 'pdfkit';
import { drawPDFHeader } from './pdfHeader';

interface ReceiptData {
  loanId: number;
  borrowerName: string;
  borrowerPhone: string;
  repaymentId: number;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  paymentMethod: string;
  referenceNumber: string | null;
  paidAt: string;
  remainingBalance: number;
}

interface InvoiceData {
  loanId: number;
  borrowerName: string;
  borrowerPhone: string;
  borrowerEmail: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  termMonths: number;
  principalPaid: number;
  interestPaid: number;
  amountDue: number;
  dueDate: string | null;
  createdAt: string;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.y = drawPDFHeader(doc, {
        companyName: 'JECRI BUREAU',
        title: 'Payment Receipt',
        documentNumber: `Receipt #${data.repaymentId}`,
        date: new Date().toLocaleDateString('en-KE'),
      });

      // Borrower Information
      doc.fontSize(12).font('Helvetica-Bold').text('Borrower Information');
      doc.fontSize(10).font('Helvetica').moveDown(0.3);

      const col1X = 50;
      const col2X = 300;
      const lineHeight = 20;
      let y = doc.y;

      doc.text('Name:', col1X, y);
      doc.text(data.borrowerName, col2X, y);
      y += lineHeight;

      doc.text('Phone:', col1X, y);
      doc.text(data.borrowerPhone || 'N/A', col2X, y);
      y += lineHeight;

      doc.text('Loan ID:', col1X, y);
      doc.text(`LOAN-${data.loanId}`, col2X, y);

      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      doc.moveDown(1);

      // Payment Details
      doc.fontSize(12).font('Helvetica-Bold').text('Payment Details');
      doc.fontSize(10).font('Helvetica').moveDown(0.3);

      y = doc.y;
      doc.text('Payment Date:', col1X, y);
      doc.text(formatDate(data.paidAt), col2X, y);
      y += lineHeight;

      doc.text('Payment Method:', col1X, y);
      doc.text(data.paymentMethod.toUpperCase(), col2X, y);
      y += lineHeight;

      if (data.referenceNumber) {
        doc.text('Reference:', col1X, y);
        doc.text(data.referenceNumber, col2X, y);
      }

      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      doc.moveDown(1);

      // Payment Breakdown
      doc.fontSize(12).font('Helvetica-Bold').text('Payment Breakdown');
      doc.fontSize(10).font('Helvetica').moveDown(0.3);

      y = doc.y;
      doc.text('Principal Paid:', col1X, y);
      doc.text(formatCurrency(data.principalPaid), col2X, y, { align: 'right', width: 200 });
      y += lineHeight;

      doc.text('Interest Paid:', col1X, y);
      doc.text(formatCurrency(data.interestPaid), col2X, y, { align: 'right', width: 200 });
      y += lineHeight;

      doc.text('Penalty/Late Fee:', col1X, y);
      doc.text(formatCurrency(data.penaltyPaid), col2X, y, { align: 'right', width: 200 });
      y += lineHeight;

      doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
      y += 10;

      doc.font('Helvetica-Bold').fontSize(12).text('Total Paid:', col1X, y);
      doc.text(formatCurrency(data.amount), col2X, y, { align: 'right', width: 200 });

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

      // Footer
      doc.moveDown(1);
      doc.fontSize(9).fillColor('#666666').text('This is an automatically generated receipt. Please keep this for your records.', { align: 'center' });
      doc.text(`Generated on ${formatDate(new Date().toISOString())}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.y = drawPDFHeader(doc, {
        companyName: 'JECRI BUREAU',
        title: 'Loan Invoice',
        documentNumber: `Invoice #INV-${data.loanId}`,
        date: new Date().toLocaleDateString('en-KE'),
      });

      // Alert if amount due
      if (data.amountDue > 0) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#991b1b');
        doc.text(`⚠️ Amount Due: ${formatCurrency(data.amountDue)}`, { align: 'left' });
        doc.fillColor('black').moveDown(0.5);
      }

      // Borrower Information
      doc.fontSize(12).font('Helvetica-Bold').text('Borrower Information');
      doc.fontSize(10).font('Helvetica').moveDown(0.3);

      const col1X = 50;
      const col2X = 300;
      const lineHeight = 20;
      let y = doc.y;

      doc.text('Name:', col1X, y);
      doc.text(data.borrowerName, col2X, y);
      y += lineHeight;

      doc.text('Email:', col1X, y);
      doc.text(data.borrowerEmail, col2X, y);
      y += lineHeight;

      doc.text('Phone:', col1X, y);
      doc.text(data.borrowerPhone || 'N/A', col2X, y);
      y += lineHeight;

      doc.text('Loan ID:', col1X, y);
      doc.text(`LOAN-${data.loanId}`, col2X, y);

      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      doc.moveDown(1);

      // Loan Summary
      doc.fontSize(12).font('Helvetica-Bold').text('Loan Summary');
      doc.fontSize(10).font('Helvetica').moveDown(0.3);

      y = doc.y;
      doc.text('Loan Term:', col1X, y);
      doc.text(`${data.termMonths} months`, col2X, y);
      y += lineHeight;

      doc.text('Due Date:', col1X, y);
      doc.text(data.dueDate ? formatDate(data.dueDate) : 'N/A', col2X, y);
      y += lineHeight;

      doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
      doc.moveDown(1);

      // Financial Summary
      doc.fontSize(12).font('Helvetica-Bold').text('Financial Summary');
      doc.fontSize(10).font('Helvetica').moveDown(0.3);

      y = doc.y;
      doc.text('Principal Amount:', col1X, y);
      doc.text(formatCurrency(data.principalAmount), col2X, y, { align: 'right', width: 200 });
      y += lineHeight;

      doc.text('Interest Charges:', col1X, y);
      doc.text(formatCurrency(data.interestAmount), col2X, y, { align: 'right', width: 200 });
      y += lineHeight;

      doc.text('Total Loan Amount:', col1X, y);
      doc.font('Helvetica-Bold').text(formatCurrency(data.totalAmount), col2X, y, { align: 'right', width: 200 });
      y += lineHeight;

      doc.font('Helvetica');
      doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
      y += 10;

      doc.text('Amount Paid:', col1X, y);
      doc.text(formatCurrency(data.principalPaid + data.interestPaid), col2X, y, { align: 'right', width: 200 });
      y += lineHeight;

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#2563eb');
      doc.text('Balance Due:', col1X, y);
      doc.text(formatCurrency(data.amountDue), col2X, y, { align: 'right', width: 200 });

      doc.fillColor('black');
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

      // Footer
      doc.moveDown(1);
      doc.fontSize(9).fillColor('#666666').text('Please remit payment for the balance due to complete this loan.', { align: 'center' });
      doc.text(`Generated on ${formatDate(new Date().toISOString())}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
