import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableHead, ResponsiveTableCell } from '@/components/ui/responsive-table';
import { adminApi, formatKES, formatDate } from '../types/api';
import { Loader2, Plus, Edit, Trash2, ChevronLeft, Check, X, User, UserPlus, Mail, Phone } from 'lucide-react';
import { useAlert } from '@/hooks/use-alert';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { showAlert, confirm, AlertComponent } = useAlert();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'borrower',
    password: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers();
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setForm({ name: '', email: '', phone: '', role: 'borrower', password: '' });
    setIsEditing(false);
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: ''
    });
    setIsEditing(true);
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      showAlert({ type: 'warning', message: 'Name and email are required' });
      return;
    }
    if (!isEditing && !form.password) {
      showAlert({ type: 'warning', message: 'Password is required for new users' });
      return;
    }
    setSaving(true);
    try {
      if (isEditing && selectedUser) {
        await adminApi.updateUser(selectedUser.id, form);
      } else {
        await adminApi.createUser(form);
      }
      await loadUsers();
      setDialogOpen(false);
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (user: User) => {
    try {
      await adminApi.toggleUser(user.id);
      await loadUsers();
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const counts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    borrower: users.filter(u => u.role === 'borrower').length,
    active: users.filter(u => u.is_active).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Users</h1>
        </div>
        <Button onClick={handleOpenNew} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
        <Card>
          <CardContent className="p-2 md:p-3">
            <p className="text-lg md:text-2xl font-bold">{counts.all}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 md:p-3">
            <p className="text-lg md:text-2xl font-bold">{counts.admin}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 md:p-3">
            <p className="text-lg md:text-2xl font-bold">{counts.borrower}</p>
            <p className="text-xs text-muted-foreground">Borrowers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 md:p-3">
            <p className="text-lg md:text-2xl font-bold">{counts.active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all})</SelectItem>
            <SelectItem value="admin">Admin ({counts.admin})</SelectItem>
            <SelectItem value="borrower">Borrower ({counts.borrower})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable>
            <ResponsiveTableHeader className="bg-muted/50">
              <tr>
                <ResponsiveTableHead className="text-left">User</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden sm:table-cell text-left">Role</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden md:table-cell text-left">Phone</ResponsiveTableHead>
                <ResponsiveTableHead className="hidden lg:table-cell text-left">Joined</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Status</ResponsiveTableHead>
                <ResponsiveTableHead className="text-center">Actions</ResponsiveTableHead>
              </tr>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {filteredUsers.map((user) => (
                <ResponsiveTableRow key={user.id}>
                  <ResponsiveTableCell label="User" className="md:p-3 p-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                        <User className="h-3 w-3 md:h-4 md:w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs md:text-base truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Role" className="hidden sm:table-cell md:p-3 p-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                      {user.role}
                    </Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Phone" className="hidden md:table-cell text-xs md:text-sm md:p-3 p-2">{user.phone || '-'}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Joined" className="hidden lg:table-cell text-xs md:text-sm text-muted-foreground md:p-3 p-2">{formatDate(user.created_at)}</ResponsiveTableCell>
                  <ResponsiveTableCell label="Status" className="text-center md:p-3 p-2">
                    <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-xs">
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell label="Actions" className="md:p-3 p-2">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 md:h-auto md:w-auto md:p-2" onClick={() => handleEdit(user)}>
                        <Edit className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active ? 'destructive' : 'default'}
                        className="h-7 w-7 p-0 md:h-auto md:w-auto md:p-2"
                        onClick={() => handleToggle(user)}
                      >
                        {user.is_active ? <X className="h-3 w-3 md:h-4 md:w-4" /> : <Check className="h-3 w-3 md:h-4 md:w-4" />}
                      </Button>
                    </div>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No users found</div>
          )}
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+254 700 000000"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrower">Borrower</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isEditing && (
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Custom Alert */}
      {AlertComponent}
    </div>
  );
}
