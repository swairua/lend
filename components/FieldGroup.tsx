interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  helper?: string;
  required?: boolean;
}

export function FieldGroup({ label, children, error, helper, required }: FieldGroupProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {helper && !error && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
