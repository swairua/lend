import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <h1 className="text-2xl md:text-3xl font-bold">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-sm md:prose-base max-w-none text-foreground">
          <p className="text-sm text-muted-foreground mb-6">
            <strong>Last Updated:</strong> January 2026
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="mb-4">
              LendHub ("we", "us", "our", or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, platform, and services (collectively, the "Service").
            </p>
            <p>
              This Privacy Policy is compliant with the <strong>Data Protection Act, 2019</strong> (Cap. 32A) of Kenya ("KDPA") and other applicable data protection regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <p className="mb-4">We collect information you provide directly to us, such as:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Personal Information:</strong> Name, email address, phone number, date of birth</li>
              <li><strong>Identity Verification:</strong> National ID number, KRA PIN, TCC number</li>
              <li><strong>Financial Information:</strong> Monthly income, bank account details, M-Pesa phone number</li>
              <li><strong>Business Information:</strong> Business name, type, registration details</li>
              <li><strong>Credit Information:</strong> Credit history, repayment records, loan applications</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, cookies</li>
            </ul>
            <p>
              We collect this information to process your loan application, manage your account, process payments, prevent fraud, and improve our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6">
              <li>Process and evaluate loan applications</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Manage and service your loans</li>
              <li>Process payments and repayments via M-Pesa</li>
              <li>Send SMS notifications about loan status and payment reminders</li>
              <li>Improve our service quality and user experience</li>
              <li>Comply with legal and regulatory obligations</li>
              <li>Conduct credit risk assessment and analysis</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. Legal Basis for Processing (KDPA Section 25)</h2>
            <p className="mb-4">We process your personal data based on:</p>
            <ul className="list-disc pl-6">
              <li><strong>Contract Performance:</strong> Processing necessary to perform the loan contract</li>
              <li><strong>Legal Obligation:</strong> Compliance with Central Bank of Kenya and tax regulations</li>
              <li><strong>Legitimate Interests:</strong> Fraud prevention, risk assessment, service improvement</li>
              <li><strong>Consent:</strong> Marketing communications (optional, you can opt out anytime)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Sharing of Information</h2>
            <p className="mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Payment Processors:</strong> Safaricom (M-Pesa) for payment processing</li>
              <li><strong>SMS Providers:</strong> Africa's Talking or Twilio for notifications</li>
              <li><strong>Credit Bureau:</strong> To report your repayment history</li>
              <li><strong>Government Agencies:</strong> As required by law (KRA, CBK)</li>
              <li><strong>Service Providers:</strong> Hosting, analytics, and technical support providers</li>
            </ul>
            <p>
              We do not sell, rent, or lease your personal data to third parties for marketing purposes without your explicit consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your personal data, including:
            </p>
            <ul className="list-disc pl-6">
              <li>SSL/TLS encryption for data in transit</li>
              <li>Password hashing for stored credentials</li>
              <li>Access controls limiting data access to authorized personnel</li>
              <li>Regular security audits and updates</li>
              <li>Secure data centers with physical security measures</li>
            </ul>
            <p className="mt-4">
              However, no system is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Your Rights (KDPA Chapter 4)</h2>
            <p className="mb-4">Under the Data Protection Act, 2019, you have the right to:</p>
            <ul className="list-disc pl-6">
              <li><strong>Right of Access:</strong> Request a copy of your personal data held by us</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data (subject to legal obligations)</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to processing for marketing purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
            <p className="mb-4">
              We retain your personal data for as long as necessary to provide our services and comply with legal obligations. Specifically:
            </p>
            <ul className="list-disc pl-6">
              <li><strong>Account Data:</strong> Retained for the duration of your account and 7 years after closure</li>
              <li><strong>Transaction Data:</strong> Retained for 10 years (as per CBK requirements)</li>
              <li><strong>Credit Information:</strong> Retained for the loan term plus 5 years</li>
              <li><strong>Technical Data:</strong> Retained for 1 year</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Cookies and Tracking</h2>
            <p className="mb-4">
              Our platform uses cookies to improve user experience, remember login information, and track usage patterns. You can disable cookies in your browser settings, but this may affect functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Third-Party Links</h2>
            <p>
              Our Service may contain links to third-party websites. We are not responsible for their privacy practices. Please review their privacy policies before providing personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. Contact Us</h2>
            <p className="mb-4">
              For questions about this Privacy Policy or to exercise your data rights, please contact:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="mb-2"><strong>Data Protection Officer</strong></p>
              <p>Email: privacy@lendhub.io</p>
              <p>Phone: +254 (0) 700 000 000</p>
              <p>Mailing Address: P.O. Box XXXX, Nairobi, Kenya</p>
            </div>
            <p className="mt-4">
              You also have the right to lodge a complaint with the <strong>Office of the Data Protection Commissioner (ODPC)</strong> if you believe your rights have been violated.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of the Service constitutes your acceptance of the updated Privacy Policy.
            </p>
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
