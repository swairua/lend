import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const bgClasses = {
    default: 'bg-muted',
    success: 'bg-primary/10',
    warning: 'bg-primary/20',
    danger: 'bg-primary/30',
  };

  const iconClasses = {
    default: 'text-muted-foreground',
    success: 'text-primary',
    warning: 'text-primary',
    danger: 'text-primary',
  };

  return (
    <Card className={bgClasses[variant]}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          {Icon && <Icon className={`h-8 w-8 ${iconClasses[variant]}`} />}
        </div>
      </CardContent>
    </Card>
  );
}
