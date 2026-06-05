import React from 'react';

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
  const descriptionIds = [helperId, errorId].filter(Boolean).join(' ');

  // Clone children to inject aria-invalid and aria-describedby
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && baseId) {
      return React.cloneElement(child, {
        'aria-invalid': error ? 'true' : 'false',
        'aria-describedby': descriptionIds || undefined,
      } as React.HTMLAttributes<HTMLElement>);
    }
    return child;
  });

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
      {enhancedChildren}
      {error && <p id={errorId} className="text-sm text-red-500" role="alert">{error}</p>}
      {helper && !error && <p id={helperId} className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
