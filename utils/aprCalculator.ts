/**
 * APR (Annual Percentage Rate) Calculator
 * Calculates the total annual cost of borrowing including all fees
 */

export interface APRInput {
  principalAmount: number;
  interestRate: number; // Annual interest rate (e.g., 19.5)
  loanTermMonths: number;
  processingFeePercent: number; // e.g., 4 for 4%
  processingFeeFixed?: number; // Fixed fee amount if applicable
  assetTransferFee?: number;
  trackingSystemFee?: number;
  lateFeePenalty?: number; // Not included in APR calculation
}

export interface APRResult {
  apr: number; // Annual Percentage Rate as percentage
  monthlyRate: number;
  totalCost: number; // Total amount to be paid back
  totalFees: number; // Sum of all fees
  interestCost: number;
  processingFee: number;
  disbursedAmount: number; // Principal minus deducted fees
}

/**
 * Calculate APR using the Newton-Raphson method
 * APR is the discount rate that makes NPV of cash flows = 0
 */
function calculateAPRNewtonRaphson(
  principalAmount: number,
  monthlyPayment: number,
  loanTermMonths: number,
  processingFee: number
): number {
  const disbursedAmount = principalAmount - processingFee;

  if (disbursedAmount <= 0 || monthlyPayment <= 0 || loanTermMonths <= 0) {
    return 0;
  }

  // Initial guess: simple annualized interest rate
  let r = 0.02; // 2% per month initial guess
  let iterations = 0;
  const maxIterations = 50;
  const tolerance = 0.0001;

  while (iterations < maxIterations) {
    // Calculate NPV and derivative for Newton-Raphson
    let npv = -disbursedAmount;
    let derivative = 0;

    for (let t = 1; t <= loanTermMonths; t++) {
      const discountFactor = Math.pow(1 + r, -t);
      npv += monthlyPayment * discountFactor;
      derivative -= t * monthlyPayment * discountFactor / (1 + r);
    }

    if (Math.abs(npv) < tolerance) {
      break;
    }

    if (Math.abs(derivative) < 1e-10) {
      break;
    }

    const rNew = r - npv / derivative;

    // Constrain r to valid range to prevent NaN
    if (rNew <= -0.99 || rNew > 1) {
      break;
    }

    r = rNew;
    iterations++;
  }

  // Guard against invalid r values
  if (r <= -0.99 || isNaN(r)) {
    return 0;
  }

  // Convert monthly rate to annual APR
  const apr = ((1 + r) ** 12 - 1) * 100;
  return Math.max(0, isNaN(apr) ? 0 : apr); // Ensure non-negative and valid
}

/**
 * Calculate monthly payment using amortization formula
 * P = [r(PV)] / [1 - (1 + r)^-n]
 * Where: P = payment, r = monthly rate, PV = present value, n = number of payments
 */
function calculateMonthlyPayment(
  principalAmount: number,
  annualInterestRate: number,
  loanTermMonths: number
): number {
  const monthlyRate = annualInterestRate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principalAmount / loanTermMonths;
  }

  const numerator = monthlyRate * principalAmount;
  const denominator = 1 - Math.pow(1 + monthlyRate, -loanTermMonths);
  
  return numerator / denominator;
}

/**
 * Main APR calculation function
 */
export function calculateAPR(input: APRInput): APRResult {
  const {
    principalAmount,
    interestRate,
    loanTermMonths,
    processingFeePercent,
    processingFeeFixed,
    assetTransferFee = 0,
    trackingSystemFee = 0,
  } = input;

  // Calculate processing fee
  const processingFee = processingFeeFixed || (principalAmount * processingFeePercent) / 100;

  // Total upfront fees
  const totalUpfrontFees = processingFee + assetTransferFee + trackingSystemFee;

  // Amount actually disbursed to borrower
  const disbursedAmount = principalAmount - totalUpfrontFees;

  // Calculate monthly payment (simple interest method for consistency)
  const monthlyPayment = calculateMonthlyPayment(
    principalAmount,
    interestRate,
    loanTermMonths
  );

  // Total amount to be repaid
  const totalCost = monthlyPayment * loanTermMonths;

  // Total interest paid
  const interestCost = totalCost - principalAmount;

  // Total fees (interest + upfront fees)
  const totalFees = interestCost + totalUpfrontFees;

  // Calculate APR using Newton-Raphson method
  let apr = calculateAPRNewtonRaphson(
    principalAmount,
    monthlyPayment,
    loanTermMonths,
    totalUpfrontFees
  );

  // Fallback to simple APR if Newton-Raphson fails
  if (isNaN(apr) || apr <= 0) {
    apr = calculateSimpleAPR(input);
  }

  return {
    apr: Math.round(apr * 100) / 100, // Round to 2 decimal places
    monthlyRate: interestRate / 12,
    totalCost: Math.round(totalCost * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    interestCost: Math.round(interestCost * 100) / 100,
    processingFee: Math.round(processingFee * 100) / 100,
    disbursedAmount: Math.round(disbursedAmount * 100) / 100,
  };
}

/**
 * Simple APR calculation (used for quick estimates)
 * APR ≈ Interest Rate + (Fees / Principal Amount / Term in Years)
 */
export function calculateSimpleAPR(input: APRInput): number {
  const {
    principalAmount,
    interestRate,
    loanTermMonths,
    processingFeePercent,
    processingFeeFixed,
    assetTransferFee = 0,
    trackingSystemFee = 0,
  } = input;

  const processingFee = processingFeeFixed || (principalAmount * processingFeePercent) / 100;
  const totalFees = processingFee + assetTransferFee + trackingSystemFee;
  const termInYears = loanTermMonths / 12;

  // Simple APR = Interest Rate + (Total Fees / Principal / Term in Years)
  const feeComponent = (totalFees / principalAmount / termInYears) * 100;
  const apr = interestRate + feeComponent;

  return Math.round(apr * 100) / 100;
}

/**
 * Format APR for display
 */
export function formatAPR(apr: number): string {
  return `${apr.toFixed(2)}% APR`;
}

/**
 * Example usage:
 * const aprResult = calculateAPR({
 *   principalAmount: 500000,
 *   interestRate: 19.5,
 *   loanTermMonths: 12,
 *   processingFeePercent: 4,
 *   assetTransferFee: 7000,
 *   trackingSystemFee: 25000,
 * });
 * console.log(`APR: ${aprResult.apr}%`);
 * console.log(`Monthly Payment: KES ${(aprResult.totalCost / 12).toFixed(2)}`);
 */
