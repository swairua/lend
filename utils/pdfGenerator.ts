import PDFDocument from 'pdfkit';
import { ReceiptData, InvoiceData } from './pdfTemplates.js';

export async function generateReceiptPDF(receiptData: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text('Transaction Record', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // Borrower Information
    doc.fontSize(10).font('Helvetica-Bold').text('BORROWER INFORMATION');
    doc.fontSize(9).font('Helvetica');
    drawInfoRow(doc, 'Name:', receiptData.borrowerName);
    if (receiptData.borrowerPhone) {
      drawInfoRow(doc, 'Phone:', receiptData.borrowerPhone);
    }
    drawInfoRow(doc, 'Loan ID:', `#${receiptData.loanId}`);
    doc.moveDown(0.3);

    // Payment Details
    doc.fontSize(10).font('Helvetica-Bold').text('PAYMENT DETAILS');
    doc.fontSize(9).font('Helvetica');
    drawInfoRow(doc, 'Receipt No:', `#RCP-${receiptData.repaymentId}`);
    const paidAt = new Date(receiptData.paidAt);
    const formattedDate = paidAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    drawInfoRow(doc, 'Payment Date:', formattedDate);
    drawInfoRow(doc, 'Payment Method:', receiptData.paymentMethod);
    if (receiptData.referenceNumber) {
      drawInfoRow(doc, 'Reference:', receiptData.referenceNumber);
    }
    doc.moveDown(0.5);

    // Amount Section
    doc.rect(40, doc.y, doc.page.width - 80, 110).fill('#f0f4f8');
    doc.fillColor('black');
    const amountY = doc.y + 10;
    doc.fontSize(9).font('Helvetica').text('Principal Paid:', 50, amountY);
    doc.text(`KES ${formatNumber(receiptData.principalPaid)}`, doc.page.width - 100, amountY, { align: 'right' });
    
    doc.text('Interest Paid:', 50, amountY + 20);
    doc.text(`KES ${formatNumber(receiptData.interestPaid)}`, doc.page.width - 100, amountY + 20, { align: 'right' });
    
    if (receiptData.penaltyPaid > 0) {
      doc.text('Penalty Paid:', 50, amountY + 40);
      doc.text(`KES ${formatNumber(receiptData.penaltyPaid)}`, doc.page.width - 100, amountY + 40, { align: 'right' });
      
      doc.font('Helvetica-Bold').text('Total Paid:', 50, amountY + 70);
      doc.text(`KES ${formatNumber(receiptData.amount)}`, doc.page.width - 100, amountY + 70, { align: 'right' });
    } else {
      doc.font('Helvetica-Bold').text('Total Paid:', 50, amountY + 40);
      doc.text(`KES ${formatNumber(receiptData.amount)}`, doc.page.width - 100, amountY + 40, { align: 'right' });
    }
    doc.moveDown(7);

    // Remaining Balance
    doc.fontSize(9).font('Helvetica');
    drawInfoRow(doc, 'Remaining Balance:', `KES ${formatNumber(receiptData.remainingBalance)}`);
    doc.moveDown(1);

    // Receipt ID
    doc.rect(40, doc.y, doc.page.width - 80, 30).fill('#e8f4f8');
    doc.fillColor('#2c3e50');
    doc.fontSize(9).font('Helvetica').text(`Receipt ID: #RCP-${receiptData.repaymentId}-${Date.now()}`, 50, doc.y + 8, { width: doc.page.width - 100 });
    doc.fillColor('black');
    doc.moveDown(2.5);

    // Footer
    doc.moveDown(0.5);
    doc.fontSize(8).text('This is an electronically generated receipt. Thank you for your payment.', { align: 'center' });
    doc.text('For inquiries, please contact our support team.', { align: 'center' });

    doc.end();
  });
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('LOAN INVOICE', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text('Outstanding Balance Statement', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.5);

    // Borrower Information
    doc.fontSize(10).font('Helvetica-Bold').text('BORROWER INFORMATION');
    doc.fontSize(9).font('Helvetica');
    drawInfoRow(doc, 'Name:', invoiceData.borrowerName);
    if (invoiceData.borrowerPhone) {
      drawInfoRow(doc, 'Phone:', invoiceData.borrowerPhone);
    }
    if (invoiceData.borrowerEmail) {
      drawInfoRow(doc, 'Email:', invoiceData.borrowerEmail);
    }
    drawInfoRow(doc, 'Loan ID:', `#${invoiceData.loanId}`);
    doc.moveDown(0.3);

    // Loan Details
    doc.fontSize(10).font('Helvetica-Bold').text('LOAN DETAILS');
    doc.fontSize(9).font('Helvetica');
    drawInfoRow(doc, 'Loan Duration:', `${invoiceData.termMonths} months`);
    const createdDate = new Date(invoiceData.createdAt);
    const formattedDate = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    drawInfoRow(doc, 'Invoice Date:', formattedDate);
    if (invoiceData.dueDate) {
      const dueDate = new Date(invoiceData.dueDate);
      const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      drawInfoRow(doc, 'Due Date:', formattedDueDate);
    }
    doc.moveDown(0.5);

    // Amount Section
    doc.rect(40, doc.y, doc.page.width - 80, 160).fill('#f0f4f8');
    doc.fillColor('black');
    const amountY = doc.y + 10;
    doc.fontSize(9).font('Helvetica');
    
    let currentY = amountY;
    doc.text('Principal Amount:', 50, currentY);
    doc.text(`KES ${formatNumber(invoiceData.principalAmount)}`, doc.page.width - 100, currentY, { align: 'right' });
    
    currentY += 20;
    doc.text('Interest Amount:', 50, currentY);
    doc.text(`KES ${formatNumber(invoiceData.interestAmount)}`, doc.page.width - 100, currentY, { align: 'right' });
    
    currentY += 20;
    doc.font('Helvetica-Bold');
    doc.text('Total Loan Amount:', 50, currentY);
    doc.text(`KES ${formatNumber(invoiceData.totalAmount)}`, doc.page.width - 100, currentY, { align: 'right' });
    
    currentY += 25;
    doc.font('Helvetica');
    doc.text('Principal Paid:', 50, currentY);
    doc.text(`KES ${formatNumber(invoiceData.principalPaid)}`, doc.page.width - 100, currentY, { align: 'right' });
    
    currentY += 20;
    doc.text('Interest Paid:', 50, currentY);
    doc.text(`KES ${formatNumber(invoiceData.interestPaid)}`, doc.page.width - 100, currentY, { align: 'right' });
    
    currentY += 25;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('AMOUNT DUE:', 50, currentY);
    doc.text(`KES ${formatNumber(invoiceData.amountDue)}`, doc.page.width - 100, currentY, { align: 'right' });
    
    doc.moveDown(8.5);

    // Invoice ID
    doc.rect(40, doc.y, doc.page.width - 80, 30).fill('#e8f4f8');
    doc.fillColor('#2c3e50').fontSize(9).font('Helvetica');
    doc.text(`Invoice ID: #INV-${invoiceData.loanId}-${Date.now()}`, 50, doc.y + 8, { width: doc.page.width - 100 });
    doc.fillColor('black');
    doc.moveDown(2.5);

    // Footer
    doc.moveDown(0.5);
    doc.fontSize(8).text('This invoice represents your outstanding loan balance.', { align: 'center' });
    doc.text('Please make payment as per the agreed schedule. Contact us for any clarifications.', { align: 'center' });

    doc.end();
  });
}

function drawInfoRow(doc: any, label: string, value: string): void {
  const x1 = 50;
  const x2 = doc.page.width - 90;
  doc.text(label, x1, doc.y);
  doc.text(value, x2, doc.y - doc.currentLineHeight(), { align: 'right' });
  doc.moveDown(0.35);
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
