import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
