/**
 * Loan calculation utilities for all three categories
 */

export interface LoanCalculation {
  principal: number;
  processingFee: number;
  logbookTransferFee: number;
  trackingSystemCost: number;
  interest: number;
  latePenalty: number;
  totalAmount: number;
  monthlyPayment?: number;
  dueDate?: Date;
}

export interface RepaymentSchedule {
  paymentNumber: number;
  dueDate: Date;
  amount: number;
  principal: number;
  interest: number;
  penalty: number;
  balance: number;
  isPaid: boolean;
  paidDate?: Date;
}

// ============================================
// Category 1: Asset-Backed Financing
// ============================================

/**
 * Calculate loan for Category 1: Asset-Backed Financing
 * - Interest Rate: 19.5% per annum
 * - Processing Fee: 4% (upfront)
 * - Logbook Transfer Fee: KES 7,000 (mandatory)
 * - Tracking System Cost: KES 25,000 (optional)
 */
export function calculateCategory1Loan(
  principal: number,
  loanTermMonths: number = 12,
  includeTrackingSystem: boolean = false
): LoanCalculation {
  const ANNUAL_INTEREST_RATE = 0.195;
  const PROCESSING_FEE_RATE = 0.04;
  const LOGBOOK_TRANSFER_FEE = 7000;
  const TRACKING_SYSTEM_COST = 25000;

  const processingFee = principal * PROCESSING_FEE_RATE;
  const monthlyInterestRate = ANNUAL_INTEREST_RATE / 12;
  const interest = principal * monthlyInterestRate * loanTermMonths;
  const trackingSystemCost = includeTrackingSystem ? TRACKING_SYSTEM_COST : 0;

  const totalAmount =
    principal +
    processingFee +
    LOGBOOK_TRANSFER_FEE +
    trackingSystemCost +
    interest;

  const monthlyPayment = totalAmount / loanTermMonths;

  return {
    principal,
    processingFee,
    logbookTransferFee: LOGBOOK_TRANSFER_FEE,
    trackingSystemCost,
    interest,
    latePenalty: 0,
    totalAmount,
    monthlyPayment,
  };
}

// ============================================
// Category 2: Short-Term Loans
// ============================================

/**
 * Calculate loan for Category 2: Short-Term Loans
 * - Loan Amount: KES 5,000 - KES 10,000 (generally below KES 50,000)
 * - Interest Rate: 15% over a 30-day period
 * - Processing Fee: 4% (upfront)
 * - Security: Postdated cheques + collateral
 */
export function calculateCategory2Loan(
  principal: number,
  loanTermDays: number = 30
): LoanCalculation {
  if (principal < 5000 || principal > 50000) {
    console.warn(
      "Category 2 loan amount should be between KES 5,000 - KES 50,000"
    );
  }

  const PROCESSING_FEE_RATE = 0.04;
  const INTEREST_RATE_30_DAYS = 0.15;

  const processingFee = principal * PROCESSING_FEE_RATE;
  const interest = (principal * INTEREST_RATE_30_DAYS * loanTermDays) / 30;

  const totalAmount = principal + processingFee + interest;

  return {
    principal,
    processingFee,
    logbookTransferFee: 0,
    trackingSystemCost: 0,
    interest,
    latePenalty: 0,
    totalAmount,
  };
}

// ============================================
// Category 3: LPOS (Lipa Pole Pole)
// ============================================

/**
 * Calculate loan for Category 3: LPOS (Lipa Pole Pole)
 * - Flexible payment structure
 * - Admin-configurable rates
 */
export function calculateCategory3Loan(
  principal: number,
  adminConfig: {
    interestRate: number; // percentage per annum
    processingFeeRate: number; // as percentage
    loanTermMonths: number;
  }
): LoanCalculation {
  const processingFee = principal * (adminConfig.processingFeeRate / 100);
  const monthlyInterestRate = adminConfig.interestRate / 100 / 12;
  const interest =
    principal * monthlyInterestRate * adminConfig.loanTermMonths;

  const totalAmount = principal + processingFee + interest;
  const monthlyPayment = totalAmount / adminConfig.loanTermMonths;

  return {
    principal,
    processingFee,
    logbookTransferFee: 0,
    trackingSystemCost: 0,
    interest,
    latePenalty: 0,
    totalAmount,
    monthlyPayment,
  };
}

// ============================================
// Late Payment Penalty Calculation
// ============================================

/**
 * Calculate late payment penalty
 * - Uniform penalty: 2.5% per annum on outstanding balance
 */
export function calculateLatePenalty(
  outstandingBalance: number,
  daysLate: number
): number {
  const ANNUAL_PENALTY_RATE = 0.025;
  const dailyPenaltyRate = ANNUAL_PENALTY_RATE / 365;
  return outstandingBalance * dailyPenaltyRate * daysLate;
}

// ============================================
// Repayment Schedule Generation
// ============================================

/**
 * Generate repayment schedule for a loan
 */
export function generateRepaymentSchedule(
  loanData: LoanCalculation,
  disbursalDate: Date,
  loanTermMonths: number
): RepaymentSchedule[] {
  const schedule: RepaymentSchedule[] = [];
  // Removed unused monthly payment guard to simplify type handling
  let remainingBalance = loanData.totalAmount;

  for (let i = 1; i <= loanTermMonths; i++) {
    const dueDate = new Date(disbursalDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const principalPayment = loanData.principal / loanTermMonths;
    const interestPayment = loanData.interest / loanTermMonths;
    const paymentAmount = principalPayment + interestPayment;

    remainingBalance = Math.max(0, remainingBalance - paymentAmount);

    schedule.push({
      paymentNumber: i,
      dueDate,
      amount: paymentAmount,
      principal: principalPayment,
      interest: interestPayment,
      penalty: 0,
      balance: remainingBalance,
      isPaid: false,
    });
  }

  return schedule;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format amount as Kenyan Shillings
 */
export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(amount);
}

/**
 * Calculate number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
}

/**
 * Check if payment is overdue
 */
export function isPaymentOverdue(dueDate: Date): boolean {
  return new Date() > dueDate;
}

/**
 * Calculate days overdue
 */
export function daysOverdue(dueDate: Date): number {
  if (!isPaymentOverdue(dueDate)) return 0;
  return daysBetween(dueDate, new Date());
}
