import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  onBackClick?: () => void;
}

export function PageTitle({ title, subtitle, size = 'lg', onBackClick }: PageTitleProps) {
  const titleClasses = {
    sm: 'text-lg sm:text-xl font-bold',
    md: 'text-xl sm:text-2xl font-bold',
    lg: 'text-2xl sm:text-3xl font-bold',
  };

  if (onBackClick) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="sm" onClick={onBackClick} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1 min-w-0">
          <h1 className={titleClasses[size]}>{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h1 className={titleClasses[size]}>{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
