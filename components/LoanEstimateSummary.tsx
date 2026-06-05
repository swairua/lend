import { Loader2, AlertCircle } from 'lucide-react';
import { formatKES } from '@/utils/api';

interface LoanEstimateSummaryProps {
  calculating: boolean;
  estimate: any;
  estimateError: string;
}

export function LoanEstimateSummary({ calculating, estimate, estimateError }: LoanEstimateSummaryProps) {
  if (calculating) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Calculating...
      </div>
    );
  }

  if (estimateError) {
    return (
      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-yellow-800">Could not load exact estimate</p>
          <p className="text-yellow-700 text-xs">{estimateError}</p>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  return (
    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm space-y-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Est. Monthly Payment</span>
        <span className="font-bold">{formatKES(estimate.monthly_payment || 0)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Total Repayable</span>
        <span className="font-medium">{formatKES(estimate.total_amount || 0)}</span>
      </div>
    </div>
  );
}
