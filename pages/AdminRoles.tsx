'use client';

import { useEffect, useState } from 'react';
import { Shield, Check, X, Edit2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { adminApi } from '@/utils/api';
import { toast } from 'sonner';

interface Role {
  key: string;
  name: string;
  description: string;
  system_role?: boolean;
}

interface Permission {
  area: string;
  [key: string]: any;
}

const staticPermissions: Permission[] = [
  { area: 'Dashboard' },
  { area: 'Loan Applications (view)' },
  { area: 'Approve Loans' },
  { area: 'Release Loans' },
  { area: 'Disburse Loans' },
  { area: 'Create Loan' },
  { area: 'Loan Categories' },
  { area: 'Loan Products' },
  { area: 'Borrowers' },
  { area: 'Repayments' },
  { area: 'Disbursements' },
  { area: 'Reports' },
  { area: 'Users' },
  { area: 'Settings' },
  { area: 'System Logs' },
  { area: 'Customers / Invoicing' },
  { area: 'Admin Messages' },
  { area: 'My Loans' },
  { area: 'Apply for Loan' },
  { area: 'Payments' },
  { area: 'Profile' },
  { area: 'Messages' },
];

export default function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '' });
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const roleKeys = roles.map(r => r.key);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const result = await adminApi.getRoles();
      if (result.success && Array.isArray(result.data)) {
        const rolesData = result.data as Role[];
        setRoles(rolesData);

        // Build permissions matrix from roles
        const permMatrix: Record<string, any> = {};
        staticPermissions.forEach(perm => {
          permMatrix[perm.area] = {};
          rolesData.forEach(role => {
            permMatrix[perm.area][role.key] = false;
          });
        });
        setPermissions(staticPermissions.map(perm => ({ ...perm, ...permMatrix[perm.area] })));
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setEditFormData({ name: role.name, description: role.description });
    setEditPermissions({});
    setEditDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;

    try {
      setSaving(true);
      const updateData: any = {
        name: editFormData.name,
        description: editFormData.description,
      };

      if (Object.keys(editPermissions).length > 0) {
        updateData.permissions = editPermissions;
      }

      await adminApi.updateRole(editingRole.key, updateData);
      toast.success('Role updated successfully');
      setEditDialogOpen(false);
      loadRoles();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (area: string) => {
    setEditPermissions(prev => ({
      ...prev,
      [area]: !prev[area],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  {r.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{r.description}</p>
              {!r.system_role && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(r)}
                  className="w-full mt-2"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
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
                {roleKeys.map((k) => (
                  <ResponsiveTableHead key={k} className="text-center">
                    {roles.find(r => r.key === k)?.name}
                  </ResponsiveTableHead>
                ))}
              </tr>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {staticPermissions.map((perm) => (
                <ResponsiveTableRow key={perm.area}>
                  <ResponsiveTableCell label="Feature" className="font-medium text-sm">{perm.area}</ResponsiveTableCell>
                  {roleKeys.map((k) => (
                    <ResponsiveTableCell key={k} label={roles.find(r => r.key === k)?.name} className="text-center">
                      <Check className="h-4 w-4 text-green-600 mx-auto" />
                    </ResponsiveTableCell>
                  ))}
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role: {editingRole?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Role Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Permissions</label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                {staticPermissions.map((perm) => (
                  <div key={perm.area} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${perm.area}`}
                      checked={editPermissions[perm.area] || false}
                      onCheckedChange={() => togglePermission(perm.area)}
                    />
                    <label htmlFor={`perm-${perm.area}`} className="text-sm cursor-pointer">
                      {perm.area}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
