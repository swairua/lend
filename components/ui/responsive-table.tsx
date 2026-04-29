import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLTableElement> {
  isMobileView?: boolean;
}

const ResponsiveTable = React.forwardRef<
  HTMLTableElement,
  ResponsiveTableProps
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
ResponsiveTable.displayName = "ResponsiveTable";

const ResponsiveTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn("[&_tr]:border-b hidden md:table-header-group", className)} 
    {...props} 
  />
));
ResponsiveTableHeader.displayName = "ResponsiveTableHeader";

const ResponsiveTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0 block md:table-row-group", className)}
    {...props}
  />
));
ResponsiveTableBody.displayName = "ResponsiveTableBody";

const ResponsiveTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      "block mb-4 border border-gray-200 rounded-lg md:table-row md:border-b md:border-0 md:mb-0 md:rounded-none",
      className,
    )}
    {...props}
  />
));
ResponsiveTableRow.displayName = "ResponsiveTableRow";

const ResponsiveTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
ResponsiveTableHead.displayName = "ResponsiveTableHead";

const ResponsiveTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { label?: string }
>(({ className, label, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0",
      "block md:table-cell mb-2 md:mb-0 relative md:static",
      label ? "pl-24 md:pl-4" : "",
      className,
    )}
    {...props}
  >
    {label && (
      <span className="absolute left-4 top-2 md:hidden font-bold text-sm text-muted-foreground">
        {label}:
      </span>
    )}
    <span className="block md:inline">{children}</span>
  </td>
));
ResponsiveTableCell.displayName = "ResponsiveTableCell";

const ResponsiveTableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
ResponsiveTableCaption.displayName = "ResponsiveTableCaption";

export {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableHead,
  ResponsiveTableCell,
  ResponsiveTableCaption,
};
