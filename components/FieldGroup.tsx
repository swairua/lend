interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  helper?: string;
  required?: boolean;
  htmlFor?: string;
  id?: string;
}

export function FieldGroup({ label, children, error, helper, required, htmlFor, id: fieldId }: FieldGroupProps) {
  const baseId = fieldId || htmlFor || '';
  const helperId = helper && !error ? `${baseId}-helper` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;

  return (
    <div className="space-y-1">
      {baseId && <label htmlFor={baseId} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>}
      {!baseId && <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>}
      {children}
      {error && <p id={errorId} className="text-sm text-red-500" role="alert">{error}</p>}
      {helper && !error && <p id={helperId} className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
