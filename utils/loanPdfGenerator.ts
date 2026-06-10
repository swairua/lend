import { buildPDFHeaderHTML } from './pdfHeader';

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
  companyLogoUrl?: string;
  companyKraPin?: string;
  companyRegNumber?: string;
}

function fmt(n: number): string {
  const num = Number(n);
  if (isNaN(num)) return 'KES 0.00';
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fdate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

export function generateLoanAgreementHTML(data: LoanAgreementData): string {
  const today = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  const disbursed = data.disbursementDate === 'Invalid Date' ? 'N/A' : data.disbursementDate;
  const dueDate = data.maturityDate === 'Invalid Date' ? 'N/A' : data.maturityDate;
  const firstDue = data.firstPaymentDueDate === 'Invalid Date' ? 'N/A' : data.firstPaymentDueDate;
  const totalRepayable = data.totalRepayableAmount || (data.principalAmount + data.totalFees);
  const disbursedAmount = data.principalAmount - data.totalFees;

  const feeRows = `
    <tr><td>Principal Amount</td><td class="r">${fmt(data.principalAmount)}</td></tr>
    <tr class="fee"><td>Processing Fee (${data.processingFee > 0 ? ((data.processingFee / data.principalAmount) * 100).toFixed(1) : '0'}%)</td><td class="r">${fmt(data.processingFee)}</td></tr>
    ${data.assetTransferFee > 0 ? `<tr class="fee"><td>Asset Transfer Fee</td><td class="r">${fmt(data.assetTransferFee)}</td></tr>` : ''}
    ${data.trackingSystemFee > 0 ? `<tr class="fee"><td>Tracking System Fee</td><td class="r">${fmt(data.trackingSystemFee)}</td></tr>` : ''}
    <tr class="total-fees"><td>Total Fees & Charges</td><td class="r">${fmt(data.totalFees)}</td></tr>
    <tr class="disbursed"><td>Amount Disbursed to Borrower</td><td class="r">${fmt(disbursedAmount)}</td></tr>
    <tr class="grand-total"><td>Total Repayable Amount</td><td class="r">${fmt(totalRepayable)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Loan Agreement - Loan #${data.loanId}</title>
<style>
  @page { margin: 30mm 20mm 25mm; size: A4; @bottom-center { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #999; font-family: Arial, sans-serif; } }
  @page:first { @bottom-center { content: none; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.6; }
  .container { max-width: 190mm; margin: 0 auto; }

  /* 2-column info grid */
  .info-grid { display: flex; gap: 24px; margin-bottom: 18px; }
  .info-grid > div { flex: 1; }
  .info-card { background: #f8fafc; border-radius: 6px; padding: 14px 16px; border: 1px solid #e2e8f0; }
  .info-card h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
  .info-row + .info-row { border-top: 1px dotted #e2e8f0; }
  .info-row .label { color: #64748b; }
  .info-row .value { font-weight: 600; text-align: right; }
  .info-row .highlight { background: #fef3c7; padding: 1px 6px; border-radius: 3px; color: #92400e; }

  /* Section titles */
  .section-title { font-size: 13px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px; margin-bottom: 12px; margin-top: 22px; page-break-after: avoid; }

  /* Fee table */
  .fee-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
  .fee-table td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  .fee-table .r { text-align: right; font-weight: 600; }
  .fee-table .fee td { color: #64748b; }
  .fee-table .total-fees td { background: #f1f5f9; font-weight: 700; }
  .fee-table .disbursed td { background: #ecfdf5; color: #065f46; font-weight: 700; }
  .fee-table .grand-total td { background: #1e3a5f; color: #fff; font-weight: 700; font-size: 12px; }

  /* Terms */
  .terms-container { page-break-inside: auto; }
  .clause { margin-bottom: 14px; page-break-inside: avoid; }
  .clause h4 { font-size: 11px; font-weight: 700; color: #1e3a5f; margin-bottom: 3px; }
  .clause p { font-size: 10.5px; color: #334155; text-align: justify; margin-left: 14px; }
  .clause .highlight-box { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; margin: 6px 0 0 14px; font-size: 10px; border-radius: 3px; }

  /* Signature */
  .signature-section { margin-top: 30px; display: flex; gap: 40px; page-break-inside: avoid; }
  .signature-block { flex: 1; }
  .signature-block h4 { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
  .signature-line { border-top: 1px solid #94a3b8; margin-top: 36px; padding-top: 4px; font-size: 10px; color: #64748b; }
  .signature-block .name { font-weight: 600; margin-top: 4px; font-size: 11px; }

  /* Footer */
  .doc-footer { text-align: center; margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; page-break-after: avoid; }

  /* Print page-break */
  .page-break { page-break-before: always; }

  /* Notice banner */
  .notice-banner { background: #1e3a5f; color: #fff; padding: 8px 14px; border-radius: 4px; font-size: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .notice-banner strong { font-size: 11px; }

  /* Status badge */
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: #dcfce7; color: #166534; }

  @media print {
    body { margin: 0; padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="container">

  ${buildPDFHeaderHTML({
    companyName: data.companyName,
    companyLogoUrl: data.companyLogoUrl || '/icons/icon-192.png',
    title: 'Loan Agreement',
    documentNumber: `Loan #${data.loanId}`,
    date: today,
  })}

  <!-- Notice Banner -->
  <div class="notice-banner">
    <span><strong>IMPORTANT:</strong> This document constitutes a legally binding agreement. Please read all terms carefully before signing.</span>
    <span class="status-badge">DRAFT</span>
  </div>

  <!-- Loan & Borrower Details (2-column) -->
  <div class="info-grid">
    <div class="info-card">
      <h3>Loan Details</h3>
      <div class="info-row"><span class="label">Product</span><span class="value">${data.loanProductName}</span></div>
      <div class="info-row"><span class="label">Principal Amount</span><span class="value">${fmt(data.principalAmount)}</span></div>
      <div class="info-row"><span class="label">Interest Rate</span><span class="value">${data.interestRate || 0}% p.a.</span></div>
      <div class="info-row"><span class="label">APR</span><span class="value highlight">${(data.apr || 0).toFixed(1)}%</span></div>
      <div class="info-row"><span class="label">Term</span><span class="value">${data.loanTermMonths} months</span></div>
      <div class="info-row"><span class="label">Monthly Installment</span><span class="value">${fmt(data.monthlyPayment)}</span></div>
      <div class="info-row"><span class="label">Amount Disbursed</span><span class="value">${fmt(disbursedAmount)}</span></div>
    </div>
    <div class="info-card">
      <h3>Borrower Information</h3>
      <div class="info-row"><span class="label">Full Name</span><span class="value">${data.borrowerName}</span></div>
      <div class="info-row"><span class="label">ID / Passport</span><span class="value">${data.borrowerIdNumber}</span></div>
      <div class="info-row"><span class="label">Phone</span><span class="value">${data.borrowerPhone}</span></div>
      <div class="info-row"><span class="label">Email</span><span class="value">${data.borrowerEmail}</span></div>
      <div class="info-row"><span class="label">Address</span><span class="value">${data.borrowerAddress}</span></div>
    </div>
  </div>

  <!-- Key Dates -->
  <div class="info-grid">
    <div class="info-card">
      <h3>Key Dates</h3>
      <div class="info-row"><span class="label">Disbursement Date</span><span class="value">${disbursed}</span></div>
      <div class="info-row"><span class="label">First Payment Due</span><span class="value">${firstDue}</span></div>
      <div class="info-row"><span class="label">Maturity Date</span><span class="value">${dueDate}</span></div>
    </div>
    <div class="info-card">
      <h3>Lender</h3>
      <div class="info-row"><span class="label">Company</span><span class="value">${data.companyName}</span></div>
      <div class="info-row"><span class="label">Address</span><span class="value">${data.companyAddress}</span></div>
      <div class="info-row"><span class="label">Phone</span><span class="value">${data.companyPhone}</span></div>
      <div class="info-row"><span class="label">Email</span><span class="value">${data.companyEmail}</span></div>
      ${data.companyKraPin ? `<div class="info-row"><span class="label">KRA PIN</span><span class="value">${data.companyKraPin}</span></div>` : ''}
      ${data.companyRegNumber ? `<div class="info-row"><span class="label">Reg. No.</span><span class="value">${data.companyRegNumber}</span></div>` : ''}
    </div>
  </div>

  <!-- Fee Breakdown -->
  <div class="section-title">Fee Breakdown &amp; Financing Structure</div>
  <table class="fee-table">
    ${feeRows}
  </table>

  <!-- Terms & Conditions -->
  <div class="section-title" style="page-break-before: always;">Terms &amp; Conditions</div>
  <div class="terms-container">

    <div class="clause">
      <h4>1. Repayment Schedule</h4>
      <p>The Borrower agrees to repay the principal amount together with all interest, fees, and charges in ${data.loanTermMonths} equal monthly installments of ${fmt(data.monthlyPayment)} each. The first installment shall be due on ${firstDue}, with subsequent installments due on the same calendar day of each following month until full repayment. All payments shall be made via M-Pesa paybill (Business Number: <strong>247247</strong>, Account: <strong>LOAN-${data.loanId}</strong>) or such other method as the Lender may designate from time to time.</p>
    </div>

    <div class="clause">
      <h4>2. Security &amp; Collateral</h4>
      <p>This loan is secured by ${data.assetDescription || 'the asset(s) described in the loan application'}. The Borrower irrevocably authorizes the Lender to hold the original certificate of title, logbook, or other security documents as continuing security until full repayment of all amounts outstanding under this Agreement. The Borrower shall maintain comprehensive insurance on the secured asset(s) for the full duration of the loan term, with the Lender noted as a loss payee, and shall provide proof of such insurance upon request.</p>
    </div>

    <div class="clause">
      <h4>3. Default &amp; Acceleration</h4>
      <p>The Borrower shall be in default if: (a) any installment remains unpaid for 30 days after its due date; (b) the Borrower provides false or misleading information; (c) the secured asset is damaged, destroyed, or disposed of without consent; or (d) the Borrower becomes insolvent or initiates bankruptcy proceedings. Upon default, the Lender may, without notice, declare the entire outstanding balance immediately due and payable (acceleration), seize and dispose of the secured asset, report the default to licensed credit reference bureaus, and pursue any other legal remedy available under Kenyan law.</p>
    </div>

    <div class="clause">
      <h4>4. Late Payment Penalty</h4>
      <p>If the Borrower fails to pay any installment by its due date, a late payment penalty of <strong>${data.lateFeePenalty}% per annum</strong> on the outstanding principal balance shall accrue daily from the due date until full payment is received. This penalty is in addition to the stated interest rate and shall not constitute a waiver of the Lender's rights regarding default.</p>
      <div class="highlight-box"><strong>Example:</strong> A late payment of a KES 50,000 installment overdue for 30 days would incur approximately KES ${(50000 * data.lateFeePenalty / 100 / 365 * 30).toFixed(0)} in penalty charges.</div>
    </div>

    <div class="clause">
      <h4>5. Interest Rates &amp; APR</h4>
      <p>The loan bears interest at <strong>${data.interestRate || 0}% per annum</strong> on the reducing balance. The Annual Percentage Rate (APR) is <strong>${(data.apr || 0).toFixed(1)}%</strong>, which reflects the total cost of credit including interest, processing fees, and other charges expressed as an annualized rate, enabling the Borrower to compare the true cost of this loan with other credit products. The APR is calculated in accordance with the Central Bank of Kenya (Credit Reference Bureau) Regulations, 2013.</p>
      <div class="highlight-box"><strong>Total Cost of Credit:</strong> The Borrower will pay a total of ${fmt(totalRepayable)} over ${data.loanTermMonths} months, comprising the principal of ${fmt(data.principalAmount)} plus total fees and interest of ${fmt(totalRepayable - data.principalAmount)}.</div>
    </div>

    <div class="clause">
      <h4>6. Fees &amp; Charges</h4>
      <p>The Borrower acknowledges and accepts the following fees and charges as set out in the Fee Breakdown section above: (a) <strong>Processing Fee</strong> of ${fmt(data.processingFee)} covering administrative, credit vetting, and loan origination costs; (b) <strong>Asset Transfer Fee</strong> of ${fmt(data.assetTransferFee)} for the registration and transfer of the security interest; and (c) <strong>Tracking System Fee</strong> of ${fmt(data.trackingSystemFee)} for GPS-enabled asset monitoring throughout the loan term. All fees are non-refundable once the loan has been disbursed.</p>
    </div>

    <div class="clause">
      <h4>7. Data Protection &amp; Privacy</h4>
      <p>The Borrower's personal and financial information shall be collected, processed, and stored in accordance with the Kenya Data Protection Act, 2019. The Borrower consents to the Lender: (a) conducting credit checks with licensed credit reference bureaus; (b) sharing information with guarantors, insurers, and regulatory authorities as required by law; (c) using automated decision-making for credit scoring and loan management; and (d) sending payment reminders and marketing communications via SMS, email, and phone. The Borrower has the right to access, correct, or request deletion of their data by contacting the Lender's Data Protection Officer.</p>
    </div>

    <div class="clause">
      <h4>8. Dispute Resolution &amp; Governing Law</h4>
      <p>This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any dispute arising out of or relating to this Agreement shall first be referred to amicable negotiation between the parties for a period of 14 days. If the dispute remains unresolved, it shall be referred to mediation at the Nairobi Centre for International Arbitration (NCIA). Should mediation fail, the dispute shall be finally resolved by binding arbitration in accordance with the Arbitration Act, 1995, by a single arbitrator appointed by the Chairman of the Chartered Institute of Arbitrators (Kenya Branch). The seat of arbitration shall be Nairobi, Kenya. The prevailing party shall be entitled to recover reasonable legal costs and expenses.</p>
    </div>

  </div>

  <!-- Lender Information Compact -->
  <div class="section-title">Lender Information</div>
  <div style="font-size:10.5px;color:#475569;margin-bottom:10px;">
    <strong>${data.companyName}</strong> &bull; ${data.companyAddress} &bull; Phone: ${data.companyPhone} &bull; Email: ${data.companyEmail}
    ${data.companyKraPin ? `&bull; KRA PIN: ${data.companyKraPin}` : ''}
    ${data.companyRegNumber ? `&bull; Reg: ${data.companyRegNumber}` : ''}
  </div>

  <!-- Signature -->
  <div class="signature-section">
    <div class="signature-block">
      <h4>Borrower</h4>
      <div class="name">${data.borrowerName}</div>
      <div class="signature-line">Signature _________________________</div>
      <div style="font-size:10px;color:#64748b;margin-top:4px;">Date: _________________________</div>
    </div>
    <div class="signature-block">
      <h4>Authorized Representative</h4>
      <div class="name">${data.companyName}</div>
      <div class="signature-line">Signature _________________________</div>
      <div style="font-size:10px;color:#64748b;margin-top:4px;">Date: _________________________</div>
    </div>
    <div class="signature-block">
      <h4>Witness</h4>
      <div class="name">_________________________</div>
      <div class="signature-line">Signature _________________________</div>
      <div style="font-size:10px;color:#64748b;margin-top:4px;">Date: _________________________</div>
    </div>
  </div>

  <div class="doc-footer">
    <p>This is a computer-generated document. The Borrower acknowledges receipt and confirms understanding of all terms herein.</p>
    <p>Generated on ${today} &bull; Loan #${data.loanId} &bull; ${data.companyName}</p>
  </div>

</div>
</body>
</html>`;
}

export async function downloadLoanAgreementPDF(data: LoanAgreementData): Promise<void> {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.createElement('div');
    element.innerHTML = generateLoanAgreementHTML(data);
    const opt: any = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `Loan-Agreement-${data.loanId}.pdf`,
      image: { type: 'png' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'in', format: 'a4' }
    };
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    const printWindow = window.open('', '', 'height=900,width=900');
    if (printWindow) {
      printWindow.document.write(generateLoanAgreementHTML(data));
      printWindow.document.close();
      printWindow.print();
    }
  }
}

export function previewLoanAgreement(data: LoanAgreementData): string {
  return generateLoanAgreementHTML(data);
}
