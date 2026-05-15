import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatKES, formatDate, getStatusColor, getStatusLabel } from '@/utils/api';

interface LoanSummaryCardProps {
  loan: any;
  onClick?: () => void;
}

export function LoanSummaryCard({ loan, onClick }: LoanSummaryCardProps) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={onClick}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{loan.product_name}</p>
            <p className="text-xs text-muted-foreground">{loan.category_name || 'Loan'}</p>
          </div>
          <Badge className={`text-[10px] ${getStatusColor(loan.status)}`}>
            {getStatusLabel(loan.status)}
          </Badge>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-sm">{formatKES(loan.principal_amount)}</span>
          <span className="text-xs text-muted-foreground">Due: {formatDate(loan.due_date)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
