import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Terms of Service</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-sm md:prose-base max-w-none text-foreground">
          <p className="text-sm text-muted-foreground mb-6">
            <strong>Last Updated:</strong> January 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing and using LendHub's services, you accept and agree to be bound by and abide by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on LendHub's Service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on LendHub's Service</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Using any tools, software, or utilities to access the Service without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. Loan Terms and Conditions</h2>
            
            <h3 className="text-lg font-semibold mb-3">3.1 Loan Application</h3>
            <p className="mb-4">
              By submitting a loan application through LendHub, you represent that all information provided is accurate, complete, and truthful. False information may result in application rejection, loan cancellation, and legal action.
            </p>

            <h3 className="text-lg font-semibold mb-3">3.2 Loan Approval</h3>
            <p className="mb-4">
              LendHub reserves the right to approve or reject any loan application at our sole discretion. Approval is contingent upon verification of all provided information and credit assessment. We are not obligated to provide reasons for denial.
            </p>

            <h3 className="text-lg font-semibold mb-3">3.3 Interest Rates and Fees</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Interest Rate:</strong> Applied as per the selected loan product (e.g., 19.5% per annum for Asset-Backed Loans)</li>
              <li><strong>Processing Fee:</strong> 4-5% of principal amount, deducted from disbursement</li>
              <li><strong>Late Payment Penalty:</strong> 2.5% per annum on outstanding balance, applied daily after due date</li>
              <li><strong>Asset Transfer Fee:</strong> KES 7,000 (for asset-backed loans)</li>
              <li><strong>Tracking System Fee:</strong> KES 25,000 (optional, for vehicle tracking)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3">3.4 Loan Disbursement</h3>
            <p className="mb-4">
              Upon approval, funds will be disbursed to your M-Pesa phone number via B2C transfer within 1-2 business days. You acknowledge that the disbursed amount is net of all applicable fees.
            </p>

            <h3 className="text-lg font-semibold mb-3">3.5 Repayment Obligation</h3>
            <p className="mb-4">
              You agree to repay the full loan amount plus interest and charges according to the repayment schedule provided at loan approval. Repayments must be made by the due date. We accept M-Pesa payments and bank transfers.
            </p>

            <h3 className="text-lg font-semibold mb-3">3.6 Late Payments</h3>
            <p className="mb-4">
              Any payment not received by the due date is considered late. Late payments incur penalties as per section 3.3 above. After 90 days of non-payment, your loan may be reported to credit bureaus as defaulted.
            </p>

            <h3 className="text-lg font-bold mb-3">3.7 Annual Percentage Rate (APR)</h3>
            <p className="mb-4">
              The Annual Percentage Rate (APR) is the total annual cost of borrowing expressed as a percentage. It includes the interest rate plus all applicable fees (processing fee, asset transfer fee, late fees) amortized over the loan term. The APR is calculated and disclosed in your loan agreement before approval.
            </p>
            <p className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <strong>APR Calculation Example:</strong> For a KES 500,000 loan at 19.5% interest over 12 months with a 4% processing fee (KES 20,000), the APR would be approximately 21.5% (higher than the interest rate alone due to the processing fee).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. Security Requirements</h2>
            <p className="mb-4">
              For asset-backed loans, you agree to:
            </p>
            <ul className="list-disc pl-6">
              <li>Transfer the logbook or title deeds of the asset to JECRI BUREAU as security</li>
              <li>Maintain the asset in good condition</li>
              <li>Not sell or dispose of the asset without written permission</li>
              <li>Obtain comprehensive insurance for the asset (if required)</li>
            </ul>
            <p className="mt-4">
              Upon full repayment, the asset ownership documents will be returned to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Payment Processing via M-Pesa</h2>
            <p className="mb-4">
              You authorize LendHub to process payments through Safaricom M-Pesa. By providing your phone number, you consent to:
            </p>
            <ul className="list-disc pl-6">
              <li>Receiving SMS notifications about loan status and payment reminders</li>
              <li>M-Pesa STK push prompts for payment authorization</li>
              <li>Processing of your repayments through M-Pesa</li>
            </ul>
            <p className="mt-4">
              You remain responsible for all M-Pesa charges levied by Safaricom.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Data Privacy</h2>
            <p>
              Your personal, financial, and identity data will be processed according to our Privacy Policy and the Data Protection Act, 2019 (Kenya). We may share your information with credit bureaus, payment processors, and regulatory authorities as required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Credit Bureau Reporting</h2>
            <p className="mb-4">
              LendHub reports loan accounts and repayment history to licensed credit bureaus in Kenya. This information is used by other lenders for credit decisions. You have the right to:
            </p>
            <ul className="list-disc pl-6">
              <li>Request a copy of your credit report</li>
              <li>Dispute inaccurate information</li>
              <li>File complaints with the credit bureau if you believe your report is incorrect</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Disclaimers</h2>
            <p className="mb-4">
              <strong>No Guarantee of Approval:</strong> Submitting an application does not guarantee loan approval. All decisions are final and at LendHub's discretion.
            </p>
            <p className="mb-4">
              <strong>Regulatory Changes:</strong> Interest rates and terms are subject to changes in regulatory requirements by the Central Bank of Kenya.
            </p>
            <p>
              <strong>Service Availability:</strong> LendHub is provided "as-is" without warranties. We are not responsible for service interruptions or data loss due to technical failures beyond our control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Dispute Resolution</h2>
            <p className="mb-4">
              Any disputes arising from these Terms of Service or loan agreements shall be resolved through:
            </p>
            <ol className="list-decimal pl-6 mb-4">
              <li>Amicable negotiation between the parties</li>
              <li>Mediation by a neutral third party</li>
              <li>Binding arbitration under Kenyan law</li>
            </ol>
            <p>
              These terms are governed by and construed in accordance with the laws of Kenya.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Limitation of Liability</h2>
            <p>
              LendHub shall not be liable for indirect, incidental, special, consequential, or punitive damages, including lost profits, even if advised of the possibility of such damages. Our total liability is limited to the amount of fees paid by you in the 12 months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
            <p>
              LendHub reserves the right to modify these Terms of Service at any time. Changes will be posted on this page, and your continued use of the Service constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Contact Information</h2>
            <div className="bg-muted p-4 rounded-lg">
              <p className="mb-2"><strong>JECRI BUREAU Customer Support</strong></p>
              <p>Email: support@jecribureau.ke</p>
              <p>Phone: +254 (0) 700 000 000</p>
              <p>Mailing Address: Nairobi, Kenya</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Button 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
        </div>
      </main>
    </div>
  );
}
