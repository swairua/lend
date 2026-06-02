export interface DocSection {
  id: string;
  title: string;
  description: string;
  icon?: string;
  subsections: DocSubsection[];
}

export interface DocSubsection {
  id: string;
  title: string;
  content: string;
  relatedTopics?: string[];
}

export const adminDocumentation: DocSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Overview of key metrics and quick actions',
    subsections: [
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        content: `# Dashboard Overview

The Admin Dashboard provides a comprehensive at-a-glance view of your lending platform's key metrics and activities.

## Key Metrics
- **Total Loans**: The total number of active and completed loans in the system
- **Active Borrowers**: Number of registered borrowers with an active status
- **Monthly Disbursements**: Total amount disbursed in the current month
- **Monthly Collections**: Total repayments received in the current month
- **Portfolio Health**: Overall credit quality indicator based on borrower credit scores
- **Default Rate**: Percentage of loans that are overdue or in default

## Quick Actions
From the dashboard, you can quickly navigate to:
- Create a new loan
- Register a new borrower
- Record a payment/repayment
- View pending approvals
- Access system reports

## Understanding the Charts
- **Loan Status Distribution**: Shows breakdown of loans by status (pending, approved, released, repaid, defaulted)
- **Monthly Trend**: Visualizes disbursements and collections over time
- **Top Borrowers by Volume**: Shows borrowers with highest loan amounts
- **Repayment Performance**: Tracks on-time vs late repayments

## Tips
- Use the dashboard daily to monitor platform health
- Pay attention to the default rate - rising defaults may indicate credit quality issues
- Use quick actions to access frequently used features without navigating menus`,
        relatedTopics: ['dashboard-metrics']
      }
    ]
  },
  {
    id: 'loan-management',
    title: 'Loan Management',
    description: 'Creating, reviewing, approving, and releasing loans',
    subsections: [
      {
        id: 'loan-creation',
        title: 'Creating a Loan',
        content: `# Creating a New Loan

You can create loans manually or borrowers can apply through the mobile/web portal.

## Manual Loan Creation
1. Navigate to **Loan Applications** > **Create Loan**
2. Select a borrower from the dropdown (or create one if they don't exist)
3. Fill in loan details:
   - **Principal Amount**: The amount being borrowed (in KES)
   - **Interest Rate**: Annual percentage rate
   - **Loan Term**: Duration in months
   - **Category**: Asset-Backed, Short-Term, LPO, etc.
   - **Product**: The loan product being used
   - **Disbursement Method**: Direct to account or M-Pesa
4. Review the loan summary showing:
   - Calculated monthly repayment amount
   - Total interest charges
   - Final maturity date
5. Click **Create Loan**

## Loan Status Workflow
A newly created loan starts with status **Pending**. It moves through these states:
- **Pending**: Awaiting approval
- **Approved**: Approved but not yet disbursed
- **Released**: Funds disbursed to borrower
- **Repaid**: Loan fully repaid
- **Defaulted**: Loan in default status`,
        relatedTopics: ['loan-approval', 'loan-release']
      },
      {
        id: 'loan-approval',
        title: 'Loan Approval Process',
        content: `# Approving Loans

Loan approval is typically handled by managers or admins with approval authority.

## Review Process
1. Navigate to **Loan Applications**
2. Find loans with **Pending** status
3. Click on a loan to view details:
   - Borrower credit information
   - Loan amount and terms
   - Borrower KYC status
   - Payment history (if any)
   - Linked collateral/documents

## Decision Criteria
When evaluating a loan for approval, consider:
- **Credit Score**: Higher scores indicate lower risk
- **Monthly Income**: Ensure repayment capacity (loan payment ≤ 30% of income)
- **KYC Verification**: Must be complete before approval
- **Payment History**: Previous on-time payments are positive signal
- **Purpose**: Align with lending policy
- **Collateral**: Verify collateral value if required

## Approval Actions
- **Approve**: Move loan to Approved status
- **Reject**: Return loan to Pending with rejection reason
- **Request Info**: Ask borrower for additional documentation

## Important Notes
- Approvals create audit trail for compliance
- Approved loans must be released within specified timeframe
- Some products require additional approvals`,
        relatedTopics: ['loan-creation', 'loan-release', 'borrower-kyc']
      },
      {
        id: 'loan-release',
        title: 'Loan Release & Disbursement',
        content: `# Releasing and Disbursing Loans

Release is the final step before funds are disbursed to the borrower.

## Release Process
1. Navigate to **Loan Applications**
2. Filter for **Approved** status loans
3. Select loan and click **Release Loan**
4. Verify:
   - Borrower bank account or M-Pesa number
   - Disbursement method
   - Amount to disburse
5. Confirm release
6. Loan status changes to **Released**

## Disbursement Methods
- **Direct Bank Transfer**: Funds sent directly to borrower's bank account
- **M-Pesa**: Funds sent to borrower's M-Pesa number
- **LIPO**: Funds paid directly to supplier (for asset-backed loans)

## After Release
- Monitor the disbursement in **Disbursements** page
- Repayment period begins on release date
- First repayment due on scheduled date
- System automatically sends payment reminders to borrower

## Troubleshooting
- If disbursement fails, check borrower's account details
- M-Pesa limits may prevent large disbursements
- Coordinate with finance team for large amounts`,
        relatedTopics: ['loan-approval', 'disbursements']
      }
    ]
  },
  {
    id: 'borrower-management',
    title: 'Borrower Management',
    description: 'Creating and managing borrower profiles, individual vs corporate',
    subsections: [
      {
        id: 'individual-borrower',
        title: 'Creating Individual Borrowers',
        content: `# Creating Individual Borrowers

Individual borrowers are self-employed or salaried individuals.

## Registration Steps
1. Go to **Borrowers** > **New Borrower**
2. Select **Individual** as client type
3. Fill in required information:
   - **Full Name**: Legal name
   - **Email**: For communications and portal access
   - **Phone**: Contact number
   - **National ID**: Government ID number (required)
   - **Business Type**: (Optional) Type of business if self-employed
   - **Address**: Physical address
   - **Monthly Income**: Estimated monthly income (KES)
4. Set a password or let system auto-generate
5. Click **Create Borrower**

## Fields for Individuals Only
- **National ID**: Used for identification and KYC
- **Business Type**: Optional field for self-employed individuals

## Fields NOT Available for Individuals
Individual borrowers do NOT have:
- Company Name
- Nature of Business
- Business Registration Number
- Company Tax ID

These corporate-specific fields are only available when creating **Corporate** borrowers.

## Next Steps After Registration
1. Borrower receives login credentials via email
2. Complete KYC verification (admin must update KRA PIN and TCC)
3. Borrower can apply for loans or admin can create loans manually`,
        relatedTopics: ['corporate-borrower', 'borrower-kyc']
      },
      {
        id: 'corporate-borrower',
        title: 'Creating Corporate Borrowers',
        content: `# Creating Corporate Borrowers

Corporate borrowers are registered businesses, companies, or organizations.

## Registration Steps
1. Go to **Borrowers** > **New Borrower**
2. Select **Corporate** as client type
3. Fill in required information:
   - **Full Name**: Company name or contact person name
   - **Email**: Company email address
   - **Phone**: Company contact number
   - **Company Name**: Official registered company name (required)
   - **Nature of Business**: Description of business activities (required)
   - **Address**: Business address
   - **Monthly Income**: Company revenue or average monthly turnover
4. Set a password or let system auto-generate
5. Click **Create Borrower**

## Corporate-Specific Fields
- **Company Name**: Official legal name of the company
- **Nature of Business**: Type of business (e.g., retail, manufacturing, services)

## When to Use Corporate Registration
- Limited companies
- Partnerships
- Sole proprietorships with registered business
- NGOs and non-profit organizations
- Government entities
- Any business with registration certificate

## Differences from Individual Registration
Corporate borrowers do NOT require:
- National ID (company registration certificate used instead)

Corporate borrowers have:
- Company Name field
- Nature of Business field

## Next Steps
1. Complete company KYC (KRA PIN, TCC number)
2. Collect company registration documents
3. Borrower can apply for business loans`,
        relatedTopics: ['individual-borrower', 'borrower-kyc']
      },
      {
        id: 'borrower-kyc',
        title: 'KYC Verification Process',
        content: `# Know Your Customer (KYC) Verification

KYC is mandatory for all borrowers before loan approval.

## KYC Requirements
All borrowers must provide:
- **National ID** (individuals) or **Company Registration Certificate** (corporates)
- **KRA PIN**: Kenya Revenue Authority PIN
- **TCC Number**: Tax Compliance Certificate

## Updating KYC Information
1. Navigate to **Borrowers**
2. Find the borrower, click the **Shield** icon
3. Enter or update:
   - KRA PIN
   - TCC Number
   - National ID (or certificate number)
   - Mark as **Verified** when all documents are confirmed
4. Save

## Verification Checklist
- [ ] National ID or Registration Certificate obtained
- [ ] KRA PIN verified with KRA database
- [ ] TCC Number current (renewed annually)
- [ ] All documents scanned and uploaded
- [ ] Admin marked as verified

## TCC Annual Renewal
- TCC (Tax Compliance Certificate) expires annually
- Must be updated every year in June
- Set calendar reminders for borrower renewal dates
- Cannot approve new loans with expired TCC

## Borrower Credit Score
- System automatically calculates credit score based on:
  - Payment history
  - Loan amount history
  - Default history
  - Time since registration
- Scores range from 300-850
- Higher scores = lower risk`,
        relatedTopics: ['individual-borrower', 'corporate-borrower', 'loan-approval']
      }
    ]
  },
  {
    id: 'repayments',
    title: 'Repayments',
    description: 'Recording payments, reconciliation, and M-Pesa integration',
    subsections: [
      {
        id: 'recording-payment',
        title: 'Recording Repayments',
        content: `# Recording Repayments

Repayments can be recorded manually or automatically via M-Pesa integration.

## Manual Payment Recording
1. Navigate to **Repayments**
2. Click **Record Payment**
3. Select the loan (or search for borrower)
4. Enter payment details:
   - **Payment Date**: Date payment was received
   - **Amount**: Amount paid in KES
   - **Payment Method**: M-Pesa, Bank Transfer, Cash, Cheque
   - **Reference Number**: Transaction ID or cheque number
   - **Notes**: Additional information
5. Click **Record**

## Payment Application
- Payments first apply to penalties/fees
- Then to interest accrued
- Finally to principal balance
- System shows remaining balance after payment

## Important Notes
- Record payments promptly for accurate reconciliation
- Overpayments are held as credit for next installment
- Document all cash payments with receipts
- Send payment confirmation to borrower immediately`,
        relatedTopics: ['reconciliation', 'mpesa-integration']
      },
      {
        id: 'reconciliation',
        title: 'Repayment Reconciliation',
        content: `# Repayment Reconciliation

Regular reconciliation ensures records match actual payments received.

## Daily Reconciliation Process
1. Navigate to **Repayments** > **Reconciliation**
2. Select date range
3. Review:
   - Payments recorded in system
   - M-Pesa reports (if using M-Pesa)
   - Bank statements
   - Cash collected
4. Match entries between systems
5. Record any discrepancies

## Reconciliation Steps
- Export system payment records
- Export M-Pesa transaction report
- Cross-reference payment amounts and dates
- Note any missing or duplicate entries
- Adjust records if needed

## Common Issues
- **Missing M-Pesa entries**: Check if transaction processed successfully
- **Duplicate records**: Delete erroneous duplicate entries
- **Unidentified payments**: Contact borrower for reference number
- **Overpayments**: Apply to future installments or refund

## Monthly Close-Out
- Perform full reconciliation at month-end
- Generate reconciliation report
- Archive payment records
- Review for any unresolved issues`,
        relatedTopics: ['recording-payment', 'mpesa-integration']
      },
      {
        id: 'mpesa-integration',
        title: 'M-Pesa Integration & Payment',
        content: `# M-Pesa Integration

The system integrates with M-Pesa for seamless payment processing.

## M-Pesa Payment Flow
1. Borrower sends repayment via M-Pesa to company's paybill
2. M-Pesa transaction completes
3. System receives M-Pesa callback notification
4. Payment automatically recorded in system
5. Borrower receives SMS confirmation

## Benefits
- Instant payment confirmation
- Reduced manual data entry
- Better reconciliation
- 24/7 availability
- Low transaction fees

## M-Pesa Account Details
Borrowers pay to:
- **Paybill Number**: [Your Paybill Number]
- **Account Reference**: Their loan account number
- **Amount**: Their scheduled payment amount

## Testing M-Pesa
For testing in sandbox environment:
- Use M-Pesa test account
- Send test transactions
- Verify callbacks are received
- Check payment records in system

## M-Pesa Limits
- Transaction minimum: KES 10
- Daily limit per user: KES 70,000
- Monthly limit: KES 300,000
- Check current limits on M-Pesa website

## Troubleshooting
- If payment doesn't appear after 24 hours, check M-Pesa logs
- Verify callback URL is configured correctly
- Contact Safaricom support for failed transactions`,
        relatedTopics: ['recording-payment', 'reconciliation']
      }
    ]
  },
  {
    id: 'user-management',
    title: 'User & Role Management',
    description: 'Managing admin users and role-based access control',
    subsections: [
      {
        id: 'create-admin-user',
        title: 'Creating Admin Users',
        content: `# Creating Admin Users

Only admin users can create new admin accounts.

## User Registration Steps
1. Navigate to **Users** (Admin only)
2. Click **New User**
3. Enter user details:
   - **Full Name**: User's name
   - **Email**: Unique email address
   - **Phone**: Contact number
   - **Role**: Select from available roles
   - **Password**: Set or auto-generate
4. Click **Create User**
5. New user receives login email with credentials

## Available Admin Roles
- **Admin**: Full system access, can manage users and configuration
- **Manager**: Can approve loans, manage borrowers, view reports
- **Releaser**: Can release loans and manage disbursements
- **Agent**: Can create borrowers and manage applications

## Role Assignment
- Carefully assign roles based on job function
- Each role has specific permissions
- Users can have only one primary role
- Consider segregation of duties when possible

## User Status
- **Active**: User can login and use system
- **Inactive**: User cannot access system
- Deactivate users when they leave organization`,
        relatedTopics: ['role-permissions', 'user-roles-overview']
      },
      {
        id: 'role-permissions',
        title: 'Understanding Roles & Permissions',
        content: `# Roles and Permissions Matrix

## Admin Role
**Permissions**:
- Create/edit/delete users
- Assign roles
- Change system configuration
- View all reports
- Approve/reject loans
- Release loans
- Create loan products
- Manage categories
- View audit logs

**Use For**: System administrators, senior management

## Manager Role
**Permissions**:
- Approve and manage loans
- Create and edit borrowers
- Record repayments
- View reports
- Manage loan products
- View audit logs
- Cannot delete users or change system config

**Use For**: Loan managers, credit managers

## Releaser Role
**Permissions**:
- Release approved loans
- Manage disbursements
- View loan list
- Cannot approve loans or manage users

**Use For**: Finance/disbursement officers

## Agent Role
**Permissions**:
- Create new borrowers
- View borrower list
- Apply for loans
- View own loans
- Record repayments (manual entry)
- Cannot approve or release loans

**Use For**: Loan officers, field agents

## Segregation of Duties
For controls and oversight:
- Different person approves vs releases loans
- Manager handles approval, Releaser handles release
- Audit trail captures all changes
- Regular reconciliation by manager`,
        relatedTopics: ['create-admin-user']
      }
    ]
  },
  {
    id: 'system-config',
    title: 'System Configuration',
    description: 'Managing loan categories, products, and system settings',
    subsections: [
      {
        id: 'loan-categories',
        title: 'Managing Loan Categories',
        content: `# Loan Categories

Categories organize loans by type and help with reporting and management.

## Default Categories
The system includes default categories:
- **Asset-Backed**: Loans backed by collateral
- **Short-Term**: Loans for working capital (typically 3-12 months)
- **LPO** (Local Purchase Order): Loans for business with LPO commitment

## Creating a New Category
1. Navigate to **Categories** (Admin/Manager)
2. Click **New Category**
3. Enter:
   - **Name**: Category name
   - **Description**: What loans this covers
   - **Max Loan Amount**: Maximum amount allowed
   - **Min Loan Amount**: Minimum amount allowed
4. Save

## Editing Categories
- Click category to edit name/description
- Update max/min limits as needed
- Changes apply to new loans only
- Existing loans keep original category

## Using Categories
- Select category when creating loan
- Categories appear in reports
- Used for organization and analysis
- Each category can have different policies`,
        relatedTopics: ['loan-products', 'system-settings']
      },
      {
        id: 'loan-products',
        title: 'Managing Loan Products',
        content: `# Loan Products

Products define specific loan offerings with pre-configured terms.

## Creating a Loan Product
1. Navigate to **Products** (Admin/Manager)
2. Click **New Product**
3. Configure:
   - **Product Name**: E.g., "Quick Loan", "Business Loan"
   - **Category**: Asset-Backed, Short-Term, LPO
   - **Min Amount**: Minimum loan amount (KES)
   - **Max Amount**: Maximum loan amount (KES)
   - **Min Term**: Minimum duration in months
   - **Max Term**: Maximum duration in months
   - **Interest Rate**: Annual percentage rate (%)
   - **Processing Fee**: One-time fee (%)
   - **Insurance Fee**: Insurance cost if applicable
   - **Description**: Product description for borrowers
4. Save

## Product Configuration
- Define terms upfront for consistency
- Can have multiple products per category
- Each loan uses one product
- Products appear in borrower portal

## Editing Products
- Can modify future loans
- Cannot retroactively change existing loans
- Keep version history for compliance
- Notify borrowers of changes`,
        relatedTopics: ['loan-categories', 'system-settings']
      },
      {
        id: 'system-settings',
        title: 'System Settings & Configuration',
        content: `# System Settings

Core configuration for platform operations.

## Financial Settings
- **Default Interest Rate**: Used if product doesn't specify
- **Late Payment Penalty**: % of installment (e.g., 5%)
- **Insurance Premium**: % of loan amount
- **Processing Fee**: Standard processing fee

## Operational Settings
- **Auto-Approve Amount**: Loans below this approve automatically
- **Payment Reminder Days**: How many days before due date to remind
- **Grace Period**: Days allowed past due date before marking late
- **SMS Provider**: Integrated SMS service for notifications

## Disbursement Settings
- **M-Pesa Paybill Number**: Your M-Pesa business number
- **Bank Account Details**: For bank transfer disbursements
- **LIPO Supplier List**: Authorized suppliers for asset-backed loans

## KYC Requirements
- **KYC Mandatory**: Require KYC before approval (on/off)
- **TCC Renewal Frequency**: Months between TCC renewals
- **KRA PIN Format**: Validation rules for KRA PIN

## Reporting
- **Fiscal Year Start**: Month fiscal year begins
- **Default Report Period**: Pre-selected report date range
- **Archive After**: Auto-archive old records after N days`,
        relatedTopics: ['loan-categories', 'loan-products']
      }
    ]
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Generating and interpreting system reports',
    subsections: [
      {
        id: 'available-reports',
        title: 'Available Report Types',
        content: `# Available Reports

The system provides detailed reports for analysis and compliance.

## Portfolio Reports
- **Loan Portfolio Summary**: Overview of all loans by status
- **Active Loans Report**: Details of loans currently active
- **Matured Loans Report**: Loans that have reached end of term

## Repayment Reports
- **Repayment Schedule**: Forward-looking schedule for all loans
- **Payment History**: All payments received by date
- **Late Payments Report**: Loans with overdue payments
- **Repayment Performance**: On-time vs late payment trends

## Financial Reports
- **Revenue Report**: Interest and fees collected
- **Disbursement Report**: Loans released by period
- **Bad Debt Report**: Defaulted loans and write-offs
- **Collection Rate**: Percentage of payments collected

## Borrower Reports
- **Borrower List**: All borrowers with contact info
- **Borrower Credit Scores**: Credit analysis data
- **New Borrowers Report**: Recently registered borrowers
- **Inactive Borrowers**: Borrowers with no recent activity

## Compliance Reports
- **Audit Log Report**: All system changes and access
- **KYC Status Report**: Verification status of borrowers
- **User Activity Report**: Admin user actions`,
        relatedTopics: ['generating-reports', 'interpreting-data']
      },
      {
        id: 'generating-reports',
        title: 'Generating Reports',
        content: `# How to Generate Reports

Reports are generated on-demand with custom date ranges.

## Report Generation Steps
1. Navigate to **Reports**
2. Select report type from list
3. Configure:
   - **Start Date**: Report begin date
   - **End Date**: Report end date
   - **Filters**: Optional filters (borrower, loan category, status)
4. Click **Generate**
5. Review report preview
6. **Export** as PDF or CSV

## Report Filtering
- **By Loan Status**: Pending, Approved, Released, Repaid, Defaulted
- **By Borrower Type**: Individual or Corporate
- **By Loan Category**: Asset-Backed, Short-Term, LPO
- **By Loan Product**: Specific product names
- **By User**: Reports on specific admin user's actions

## Scheduling Reports
- Setup recurring reports (daily, weekly, monthly)
- Reports auto-email to designated recipients
- Configure in **Settings** > **Report Scheduling**
- Export automatically to shared folder

## Export Formats
- **PDF**: For sharing and printing
- **CSV**: For analysis in Excel
- **Email**: Direct delivery to inbox
- **Archive**: Store for compliance`,
        relatedTopics: ['available-reports', 'interpreting-data']
      },
      {
        id: 'interpreting-data',
        title: 'Interpreting Report Data',
        content: `# Reading and Interpreting Reports

Reports contain key metrics for business analysis.

## Key Metrics Explained

### Loan Metrics
- **Loan Count**: Number of loans
- **Total Volume**: Sum of all loan amounts
- **Average Loan Size**: Total volume ÷ count
- **Portfolio Growth**: Month-over-month change

### Repayment Metrics
- **Total Collections**: Amount repaid
- **Collection Rate**: Collections ÷ Total Outstanding (%)
- **On-Time Payment Rate**: Payments by due date (%)
- **Default Rate**: Defaulted ÷ Total Loans (%)

### Financial Metrics
- **Gross Revenue**: Interest + fees
- **Net Revenue**: After provisions for losses
- **Cost of Funds**: Operating expenses
- **Return on Portfolio**: Revenue ÷ Loan Portfolio (%)

## Report Analysis Tips
- Compare current period to previous period
- Identify trends: improving or declining?
- High default rate = credit quality issue
- Low collection rate = borrower liquidity issue
- Track metrics monthly for trends

## Red Flags
- Rising default rate > 5%
- Collection rate dropping below 90%
- Unusual spike in late payments
- New borrower credit scores below 600
- High concentration in single borrower`,
        relatedTopics: ['available-reports', 'generating-reports']
      }
    ]
  },
  {
    id: 'messaging',
    title: 'Messaging',
    description: 'Communication with borrowers',
    subsections: [
      {
        id: 'send-messages',
        title: 'Sending Messages to Borrowers',
        content: `# Messaging System

Send updates and reminders to borrowers through the messaging system.

## Sending a Message
1. Navigate to **Messages** (or Admin Messages for admin)
2. Click **New Message**
3. Select **Recipient**:
   - Single borrower
   - Multiple borrowers
   - All borrowers with specific criteria
4. Enter:
   - **Subject**: Brief subject line
   - **Message**: Message content
   - **Type**: Notification, Reminder, Alert
5. Schedule or send immediately
6. Click **Send**

## Message Types
- **Notification**: General information (new features, policy changes)
- **Reminder**: Payment due reminders (before due date)
- **Alert**: Important alerts (overdue payment, account changes)
- **Update**: Status updates (loan approved, payment received)

## Scheduled Messages
- Set message to send automatically on specific date/time
- Useful for payment reminders (5 days before due)
- Can target based on loan maturity date
- System sends automatically

## Message History
- View all messages sent to borrower
- See read/unread status
- Track responses from borrower
- Archive old conversations

## Best Practices
- Keep messages brief and clear
- Use templates for common messages
- Schedule reminder messages in advance
- Monitor read rates for engagement`,
        relatedTopics: []
      }
    ]
  },
  {
    id: 'disbursements',
    title: 'Disbursements',
    description: 'Managing loan disbursement process and tracking',
    subsections: [
      {
        id: 'disbursement-tracking',
        title: 'Disbursement Status & Tracking',
        content: `# Managing Disbursements

Track and manage the disbursement of released loans.

## Disbursement Status Flow
1. **Pending**: Loan released, disbursement initiated
2. **Processing**: Funds being transferred
3. **Completed**: Funds successfully delivered
4. **Failed**: Disbursement unsuccessful (requires action)

## Disbursement Methods
- **M-Pesa**: Send to borrower's M-Pesa number (instant)
- **Bank Transfer**: Funds to borrower's bank account (1-2 days)
- **Cheque**: Physical cheque issued (3-5 days)
- **LIPO**: Direct payment to supplier for asset-backed loans

## Viewing Disbursements
1. Navigate to **Disbursements**
2. View all released loans pending disbursement
3. Filter by:
   - Status (Pending, Processing, Completed, Failed)
   - Method (M-Pesa, Bank, etc.)
   - Date range
4. Click to view details and history

## Failed Disbursement
If disbursement fails:
1. Check error message for reason
2. Verify borrower account details
3. Retry disbursement after fixing details
4. Try alternative method if needed
5. Contact borrower if issues persist

## M-Pesa Disbursement Limits
- Max per transaction: KES 300,000
- Daily limit: KES 1,000,000
- Use multiple transactions for large amounts
- Check balance before initiating`,
        relatedTopics: ['loan-release', 'mpesa-integration']
      },
      {
        id: 'bulk-disbursement',
        title: 'Bulk Disbursements',
        content: `# Bulk Disbursement Process

Process multiple disbursements efficiently.

## Bulk Disbursement Steps
1. Navigate to **Disbursements** > **Bulk Process**
2. Select loans to disburse:
   - Manually select checkboxes
   - Or filter and select all matching
3. Review selected loans:
   - Verify count and total amount
   - Check all details are correct
4. Choose disbursement method:
   - All same method, or
   - Mixed methods based on each borrower
5. Submit for processing
6. Monitor progress on dashboard

## Bulk Disbursement Notes
- Always verify before submitting
- Bulk jobs process overnight
- Receive completion report next morning
- Failed items can be retried individually
- Recommended for 10+ loans

## Best Practices
- Schedule bulk runs during off-peak hours
- Group by disbursement method
- Keep bulk size manageable (under 200)
- Archive completed bulk runs`,
        relatedTopics: ['disbursement-tracking']
      }
    ]
  },
  {
    id: 'invoicing',
    title: 'Invoicing',
    description: 'Customers, quotations, invoices, and products',
    subsections: [
      {
        id: 'customer-management',
        title: 'Customer Management',
        content: `# Managing Customers

The invoicing module includes separate customer management from borrowers.

## Creating a Customer
1. Navigate to **Customers**
2. Click **New Customer**
3. Enter:
   - **Name**: Business or person name
   - **Email**: For invoicing and notifications
   - **Phone**: Contact number
   - **Address**: Billing address
   - **Type**: Business or Individual
   - **Tax ID**: Company tax/registration number
4. Save

## Customer Profiles
- Store multiple customers for quotations and invoices
- Can be same as borrowers or separate entities
- Use for service/product billing outside loans
- Track invoicing history per customer

## Customer Categories
- **Regular**: Standard customer
- **Preferred**: Discounted rates
- **Wholesale**: Bulk pricing`,
        relatedTopics: ['quotations', 'invoices']
      },
      {
        id: 'quotations',
        title: 'Creating Quotations',
        content: `# Quotations

Create and manage sales quotations for customers.

## Creating a Quotation
1. Navigate to **Quotations**
2. Click **New Quotation**
3. Select **Customer**
4. Add line items:
   - **Product**: Select from product list
   - **Quantity**: Units
   - **Unit Price**: Price per unit
   - **Description**: Item details
5. Set:
   - **Validity Date**: When quote expires
   - **Terms**: Payment terms
   - **Notes**: Special instructions
6. Save and optionally email to customer

## Quote Status
- **Draft**: Not yet sent
- **Sent**: Shared with customer
- **Accepted**: Customer agreed
- **Expired**: Past validity date
- **Converted**: Converted to invoice

## Quote to Invoice
- Once customer accepts, convert quote to invoice
- Click **Convert to Invoice**
- Review and adjust if needed
- Invoice includes same items and pricing`,
        relatedTopics: ['invoices', 'products']
      },
      {
        id: 'invoices',
        title: 'Managing Invoices',
        content: `# Invoicing System

Create and track invoices for customers.

## Creating an Invoice
1. Navigate to **Invoices**
2. Click **New Invoice** or convert from quotation
3. Select **Customer**
4. Add line items with products and quantities
5. Configure:
   - **Invoice Date**: Date issued
   - **Due Date**: When payment due
   - **Payment Terms**: Net 30, Net 60, etc.
6. Add notes or special instructions
7. Generate and send to customer

## Invoice Status
- **Draft**: Not yet sent to customer
- **Sent**: Shared with customer
- **Overdue**: Past due date without payment
- **Paid**: Full payment received
- **Partial**: Partial payment received

## Recording Invoice Payments
1. Navigate to invoice
2. Click **Record Payment**
3. Enter amount paid and date
4. Save
5. Status updates to Paid or Partial

## Invoice Products
Manage products that appear on invoices:
- Navigate to **Invoice Products**
- Create product with:
  - **Name**: Product name
  - **Description**: What it is
  - **Unit Price**: Price per unit
  - **Tax Rate**: % tax
- Use on multiple invoices`,
        relatedTopics: ['quotations', 'products', 'customer-management']
      }
    ]
  },
  {
    id: 'audit-logs',
    title: 'Audit & Logs',
    description: 'System logs, audit trail, and compliance',
    subsections: [
      {
        id: 'system-logs',
        title: 'Viewing System Logs',
        content: `# System Logs

System logs record all user actions for compliance and troubleshooting.

## Accessing Logs
1. Navigate to **System Logs** (Admin/Manager only)
2. View all logged actions with:
   - **User**: Who performed action
   - **Action**: What was done (created, updated, deleted)
   - **Entity**: What was modified (Loan, Borrower, User)
   - **Timestamp**: When action occurred
   - **Details**: Additional information
3. Filter by:
   - **Date Range**: When action occurred
   - **User**: Specific admin user
   - **Action Type**: Create, Update, Delete, Approve, etc.
   - **Entity Type**: Loan, Borrower, User, etc.

## Log Retention
- Logs retained for 7 years (compliance requirement)
- Automatically archived to secure storage
- Cannot be deleted or modified (immutable)
- Regular backups performed

## Compliance Uses
- Audit trail for loan approvals
- Track who accessed sensitive data
- Compliance with regulations
- Investigate suspicious activities
- Performance evaluation of staff`,
        relatedTopics: []
      }
    ]
  }
];

export function getDocumentationByModule(moduleId: string): DocSection | undefined {
  return adminDocumentation.find(doc => doc.id === moduleId);
}

export function getDocumentationByTopic(moduleId: string, topicId: string): DocSubsection | undefined {
  const module = getDocumentationByModule(moduleId);
  if (!module) return undefined;
  return module.subsections.find(sub => sub.id === topicId);
}

export function searchDocumentation(query: string): Array<{ module: DocSection; subsection: DocSubsection }> {
  const results: Array<{ module: DocSection; subsection: DocSubsection }> = [];
  const lowerQuery = query.toLowerCase();

  adminDocumentation.forEach(module => {
    module.subsections.forEach(subsection => {
      const titleMatch = subsection.title.toLowerCase().includes(lowerQuery);
      const contentMatch = subsection.content.toLowerCase().includes(lowerQuery);
      
      if (titleMatch || contentMatch) {
        results.push({ module, subsection });
      }
    });
  });

  return results;
}
