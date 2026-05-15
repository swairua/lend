/**
 * Loan Agreement PDF Generator
 * Generates downloadable PDF loan agreements
 * Uses HTML to PDF conversion (requires pdfkit library or server-side implementation)
 */

export interface LoanAgreementData {
  loanId: number;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  borrowerIdNumber: string;
  borrowerAddress: string;
  
  loanAmount: number;
  principalAmount: number;
  interestRate: number;
  loanTermMonths: number;
  monthlyPayment: number;
  
  processingFee: number;
  assetTransferFee: number;
  trackingSystemFee: number;
  totalFees: number;
  totalRepayableAmount: number;
  
  disbursementDate: string;
  maturityDate: string;
  firstPaymentDueDate: string;
  
  apr: number;
  lateFeePenalty: number;
  
  loanProductName: string;
  assetDescription?: string;
  assetValue?: number;
  securityDetails?: string;
  
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

/**
 * Generate HTML content for PDF
 */
export function generateLoanAgreementHTML(data: LoanAgreementData): string {
  const maturityDate = new Date(data.maturityDate);
  const formattedMaturityDate = maturityDate.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loan Agreement - Loan #${data.loanId}</title>
    <style>
        * { margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        .container {
            max-width: 8.5in;
            height: 11in;
            margin: 0 auto;
            padding: 0.5in;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        header {
            text-align: center;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 24px;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .header-subtitle {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
        }
        .loan-number {
            font-weight: bold;
            font-size: 14px;
            color: #1e40af;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            background: #f0f0f0;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            color: #1e40af;
            margin-bottom: 10px;
            border-left: 4px solid #1e40af;
        }
        .section-content {
            margin-left: 15px;
            font-size: 12px;
        }
        .info-row {
            display: flex;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px dotted #ddd;
        }
        .info-label {
            font-weight: bold;
            width: 40%;
            color: #1e40af;
        }
        .info-value {
            width: 60%;
            text-align: right;
        }
        .terms-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 12px;
        }
        .terms-table th,
        .terms-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .terms-table th {
            background: #f0f0f0;
            font-weight: bold;
            color: #1e40af;
        }
        .terms-table td:nth-child(2) {
            text-align: right;
        }
        .amount {
            text-align: right;
            font-weight: bold;
        }
        .notice-box {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 10px;
            margin: 10px 0;
            font-size: 11px;
            border-radius: 3px;
            color: #856404;
        }
        .agreement-text {
            font-size: 11px;
            line-height: 1.5;
            text-align: justify;
            margin: 15px 0;
        }
        .signature-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
        }
        .signature-block {
            width: 45%;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 30px;
            padding-top: 5px;
        }
        .highlight {
            background: #fff3cd;
            padding: 2px 4px;
            font-weight: bold;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${data.companyName}</h1>
            <div class="header-subtitle">Loan Agreement</div>
            <div class="loan-number">Loan #${data.loanId}</div>
        </header>

        <!-- Loan Details -->
        <div class="section">
            <div class="section-title">LOAN DETAILS</div>
            <div class="section-content">
                <div class="info-row">
                    <span class="info-label">Loan Product:</span>
                    <span class="info-value">${data.loanProductName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Principal Amount:</span>
                    <span class="info-value">KES ${data.principalAmount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Annual Interest Rate:</span>
                    <span class="info-value">${data.interestRate}% per annum</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Annual Percentage Rate (APR):</span>
                    <span class="info-value highlight">${data.apr}%</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Loan Term:</span>
                    <span class="info-value">${data.loanTermMonths} months</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Monthly Payment:</span>
                    <span class="info-value">KES ${data.monthlyPayment.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>

        <!-- Borrower Information -->
        <div class="section">
            <div class="section-title">BORROWER INFORMATION</div>
            <div class="section-content">
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${data.borrowerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ID Number:</span>
                    <span class="info-value">${data.borrowerIdNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${data.borrowerPhone}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${data.borrowerEmail}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${data.borrowerAddress}</span>
                </div>
            </div>
        </div>

        <!-- Fee Breakdown -->
        <div class="section">
            <div class="section-title">FEE BREAKDOWN</div>
            <div class="section-content">
                <table class="terms-table">
                    <tr>
                        <th>Description</th>
                        <th>Amount (KES)</th>
                    </tr>
                    <tr>
                        <td>Principal Amount</td>
                        <td>${data.principalAmount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                        <td>Processing Fee</td>
                        <td>${data.processingFee.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    ${data.assetTransferFee > 0 ? `
                    <tr>
                        <td>Asset Transfer Fee</td>
                        <td>${data.assetTransferFee.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    ` : ''}
                    ${data.trackingSystemFee > 0 ? `
                    <tr>
                        <td>Tracking System Fee</td>
                        <td>${data.trackingSystemFee.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    ` : ''}
                    <tr style="background: #f0f0f0; font-weight: bold;">
                        <td>Total Fees</td>
                        <td>${data.totalFees.toLocaleString('en-KE', { maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr style="background: #e8f4f8; font-weight: bold;">
                        <td>Amount Disbursed to You</td>
                        <td>${(data.principalAmount - data.totalFees).toLocaleString('en-KE', { maximumFractionDigits: 2 })}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Important Terms -->
        <div class="section">
            <div class="section-title">IMPORTANT TERMS & CONDITIONS</div>
            <div class="section-content">
                <div class="notice-box">
                    <strong>Late Payment Penalty:</strong> ${data.lateFeePenalty}% per annum on outstanding balance, applied daily after the due date.
                </div>
                <div class="agreement-text">
                    <strong>1. REPAYMENT SCHEDULE:</strong> The borrower agrees to repay the loan in ${data.loanTermMonths} equal monthly installments of KES ${data.monthlyPayment.toLocaleString('en-KE', { maximumFractionDigits: 2 })} each, starting from ${data.firstPaymentDueDate}.<br><br>
                    
                    <strong>2. SECURITY:</strong> This loan is secured by ${data.assetDescription || 'the assets described in the loan application'}. The borrower authorizes ${data.companyName} to hold the asset documents as security until full repayment.<br><br>
                    
                    <strong>3. DEFAULT:</strong> If the borrower fails to make any payment within 30 days of the due date, ${data.companyName} may demand immediate repayment of the entire outstanding balance, accelerate the loan, and/or report the default to credit bureaus.<br><br>
                    
                    <strong>4. DATA PROTECTION:</strong> The borrower's personal and financial information will be processed in accordance with the Data Protection Act, 2019 (Kenya).<br><br>
                    
                    <strong>5. CREDIT BUREAU REPORTING:</strong> Loan account information and repayment history will be reported to licensed credit bureaus in Kenya.
                </div>
            </div>
        </div>

        <!-- Company Info -->
        <div class="section">
            <div class="section-title">LENDER INFORMATION</div>
            <div class="section-content">
                <div class="info-row">
                    <span class="info-label">Company:</span>
                    <span class="info-value">${data.companyName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Address:</span>
                    <span class="info-value">${data.companyAddress}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${data.companyPhone}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${data.companyEmail}</span>
                </div>
            </div>
        </div>

        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-block">
                <div>Borrower Signature</div>
                <div class="signature-line"></div>
                <div style="margin-top: 5px; font-size: 10px;">Date: __________________</div>
            </div>
            <div class="signature-block">
                <div>For ${data.companyName}</div>
                <div class="signature-line"></div>
                <div style="margin-top: 5px; font-size: 10px;">Date: __________________</div>
            </div>
        </div>

        <div class="footer">
            <p>This is an automated document. Please review all terms carefully before signing.</p>
            <p>Generated on ${new Date().toLocaleDateString('en-KE')}</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Download loan agreement as PDF
 * For browser implementation: converts HTML to PDF using a library like html2pdf or pdfkit
 */
export function downloadLoanAgreementPDF(data: LoanAgreementData): void {
  // This implementation uses html2pdf library
  // Install: npm install html2pdf.js
  
  const element = document.createElement('div');
  element.innerHTML = generateLoanAgreementHTML(data);
  
  // Check if html2pdf is available
  if (typeof (window as any).html2pdf !== 'undefined') {
    const opt = {
      margin: 0.5,
      filename: `Loan-Agreement-${data.loanId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'in', format: 'letter' }
    };
    
    (window as any).html2pdf().set(opt).from(element).save();
  } else {
    // Fallback: open HTML in new window for printing
    const printWindow = window.open('', '', 'height=900,width=900');
    if (printWindow) {
      printWindow.document.write(generateLoanAgreementHTML(data));
      printWindow.document.close();
      printWindow.print();
    }
  }
}

/**
 * Get loan agreement HTML for preview
 */
export function previewLoanAgreement(data: LoanAgreementData): string {
  return generateLoanAgreementHTML(data);
}
