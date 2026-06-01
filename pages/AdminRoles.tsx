import { Shield, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';

const roles = [
  { role: 'Admin', key: 'admin', desc: 'Full system access — can manage users, settings, loans, and all modules' },
  { role: 'Releaser', key: 'releaser', desc: 'Approves loan release and disbursement after admin approval' },
  { role: 'Manager', key: 'manager', desc: 'Day-to-day operations — loans, products, borrowers, repayments, reports, and invoicing' },
  { role: 'Agent', key: 'agent', desc: 'View loans and borrowers for field work' },
  { role: 'Borrower', key: 'borrower', desc: 'Apply for loans, make payments, view own loans' },
];

const permissions = [
  { area: 'Dashboard', admin: true, releaser: true, manager: true, agent: true, borrower: true },
  { area: 'Loan Applications (view)', admin: true, releaser: true, manager: true, agent: true, borrower: false },
  { area: 'Approve Loans', admin: true, releaser: false, manager: false, agent: false, borrower: false },
  { area: 'Release Loans', admin: true, releaser: true, manager: false, agent: false, borrower: false },
  { area: 'Disburse Loans', admin: true, releaser: true, manager: false, agent: false, borrower: false },
  { area: 'Create Loan', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'Loan Categories', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'Loan Products', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'Borrowers', admin: true, releaser: false, manager: true, agent: true, borrower: false },
  { area: 'Repayments', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'Disbursements', admin: true, releaser: true, manager: false, agent: false, borrower: false },
  { area: 'Reports', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'Users', admin: true, releaser: false, manager: false, agent: false, borrower: false },
  { area: 'Settings', admin: true, releaser: false, manager: false, agent: false, borrower: false },
  { area: 'System Logs', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'Customers / Invoicing', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'Admin Messages', admin: true, releaser: false, manager: true, agent: false, borrower: false },
  { area: 'My Loans', admin: false, releaser: false, manager: false, agent: false, borrower: true },
  { area: 'Apply for Loan', admin: false, releaser: false, manager: false, agent: false, borrower: true },
  { area: 'Payments', admin: false, releaser: false, manager: false, agent: false, borrower: true },
  { area: 'Profile', admin: true, releaser: true, manager: true, agent: true, borrower: true },
  { area: 'Messages', admin: true, releaser: true, manager: true, agent: true, borrower: true },
];

const roleKeys = ['admin', 'releaser', 'manager', 'agent', 'borrower'] as const;

export default function AdminRoles() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Roles & Permissions</h1>
        <p className="text-gray-600">Overview of user roles and their access levels in the system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {roles.map((r) => (
          <Card key={r.key} className={r.key === 'admin' ? 'border-red-200' : r.key === 'releaser' ? 'border-teal-200' : r.key === 'manager' ? 'border-blue-200' : r.key === 'agent' ? 'border-orange-200' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                {r.role}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveTable>
            <caption className="sr-only">Role permission matrix showing which roles can access which features</caption>
            <ResponsiveTableHeader className="bg-muted/50">
              <tr>
                <ResponsiveTableHead className="text-left">Feature</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Admin</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Releaser</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Manager</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Agent</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Borrower</ResponsiveTableHead>
              </tr>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {permissions.map((perm) => (
                <ResponsiveTableRow key={perm.area}>
                  <ResponsiveTableCell label="Feature" className="font-medium text-sm">{perm.area}</ResponsiveTableCell>
                  {roleKeys.map((k) => (
                    <ResponsiveTableCell key={k} label={k} className="text-center">
                      {perm[k] ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-red-300 mx-auto" />
                      )}
                    </ResponsiveTableCell>
                  ))}
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}