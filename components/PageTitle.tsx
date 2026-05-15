interface PageTitleProps {
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PageTitle({ title, subtitle, size = 'lg' }: PageTitleProps) {
  const titleClasses = {
    sm: 'text-lg sm:text-xl font-bold',
    md: 'text-xl sm:text-2xl font-bold',
    lg: 'text-2xl sm:text-3xl font-bold',
  };

  return (
    <div className="space-y-1">
      <h1 className={titleClasses[size]}>{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
