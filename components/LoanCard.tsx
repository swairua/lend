import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatKES, formatDate, getStatusColor, getStatusLabel } from '@/utils/api';

interface LoanCardProps {
  loan: any;
  onClick?: () => void;
}

export function LoanCard({ loan, onClick }: LoanCardProps) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={onClick}>
      <CardContent className="p-3 md:p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-base md:text-lg">{formatKES(loan.principal_amount)}</p>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{loan.product_name || 'Loan'}</p>
          </div>
          <Badge className={`${getStatusColor(loan.status)} text-xs flex-shrink-0`}>
            {getStatusLabel(loan.status)}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs md:text-sm mb-2">
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="font-medium truncate">{loan.category_name || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Term</p>
            <p className="font-medium">{loan.term_months || '—'} mo</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due Date</p>
            <p className="font-medium">{loan.due_date ? formatDate(loan.due_date) : '—'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
