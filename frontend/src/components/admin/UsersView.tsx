import React, { useState, useEffect } from 'react';
import {
  fetchUsersList,
  createNewUser,
  toggleUserActiveStatus,
  type UserProfile,
} from '../../api/client';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  ShieldAlert,
  Building,
  KeyRound,
  AlertCircle,
  UserCheck,
  Eye,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createDisplayName, setCreateDisplayName] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [createRole, setCreateRole] = useState<string>('REVIEWER');
  const [createInstitutionId, setCreateInstitutionId] = useState<string>('');
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Action status state
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  async function loadUsers() {
    setError(null);
    try {
      const res = await fetchUsersList({
        pageSize: 100,
        role: selectedRole || undefined,
        isActive: selectedStatus !== '' ? selectedStatus === 'active' : undefined,
      });
      setUsers(res.data || []);
    } catch (err: any) {
      console.error('Failed to load users', err);
      setError(err?.message || 'Failed to retrieve system user accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [selectedRole, selectedStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = !user.is_active;
    const confirmMsg = newStatus
      ? `Re-activate access for ${user.display_name} (${user.email})?`
      : `Deactivate access for ${user.display_name} (${user.email})? They will be immediately blocked from signing in or executing API calls.`;

    if (!window.confirm(confirmMsg)) return;

    setActionUserId(user.id);
    try {
      await toggleUserActiveStatus(user.id, newStatus);
      await loadUsers();
    } catch (err: any) {
      alert(`Failed to update status: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionUserId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createEmail || !createDisplayName || !createPassword) {
      setCreateError('Please complete all required fields.');
      return;
    }

    if (createPassword.length < 8) {
      setCreateError('Password must contain at least 8 characters.');
      return;
    }

    setCreateLoading(true);
    try {
      await createNewUser({
        email: createEmail.trim(),
        display_name: createDisplayName.trim(),
        password: createPassword,
        role: createRole,
        institution_id: createInstitutionId.trim() || undefined,
      });

      setShowCreateModal(false);
      setCreateEmail('');
      setCreateDisplayName('');
      setCreatePassword('');
      setCreateRole('REVIEWER');
      setCreateInstitutionId('');
      await loadUsers();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create user account.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Client-side text filter on email & display name
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.display_name.toLowerCase().includes(q) ||
      (u.institution_id && u.institution_id.toLowerCase().includes(q))
    );
  });

  const getRoleBadge = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1B1411] text-[#FAF5F0] text-[10px] font-mono font-bold px-2.5 py-0.5">
            <ShieldAlert className="w-3 h-3 text-[#33CC7A]" />
            Administrator
          </span>
        );
      case 'REVIEWER':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8F0] text-[#1B804D] text-[10px] font-mono font-bold px-2.5 py-0.5">
            <UserCheck className="w-3 h-3 text-[#33CC7A]" />
            Scrutiny Officer
          </span>
        );
      case 'VIEWER':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF2F7] text-[#1F3954] text-[10px] font-mono font-bold px-2.5 py-0.5">
            <Eye className="w-3 h-3 text-[#1F3954]" />
            Auditor / Viewer
          </span>
        );
      case 'INSTITUTION_USER':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF5F0] text-[#66574F] border border-[#EEE5DC] text-[10px] font-mono font-bold px-2.5 py-0.5">
            <Building className="w-3 h-3 text-[#66574F]" />
            Institution Rep
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF5F0] text-[#1B1411] border border-[#EEE5DC] text-[10px] font-mono font-bold px-2.5 py-0.5">
            <Shield className="w-3 h-3 text-[#1B1411]" />
            {role}
          </span>
        );
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEE5DC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1B1411]">User &amp; Role Administration</h1>
            <span className="rounded-full bg-[#1B1411] text-[#FAF5F0] font-mono text-[10px] font-bold px-2.5 py-0.5">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs text-[#66574F] mt-1">
            Manage authenticated regulatory officers, scrutiny reviewers, and role assignments with full audit tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5 text-xs text-[#1B1411] bg-white border-[#EEE5DC] hover:bg-[#FAF5F0] rounded-full px-4 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#33CC7A]' : 'text-[#66574F]'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#33CC7A] text-[#1B1411] hover:bg-[#2EB86E] font-bold text-xs rounded-full px-4 py-2 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.03)] p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66574F] pointer-events-none" />
          <Input
            id="users-admin-search-input"
            name="user_search"
            aria-label="Search users by name, email, or institution identifier"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or institution identifier..."
            className="pl-9 text-xs h-9 bg-[#FAF5F0] border-[#EEE5DC] rounded-full focus:bg-white text-[#1B1411]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#66574F]">
            <Filter className="w-3.5 h-3.5 text-[#1B1411]" />
            <span className="font-semibold">Role:</span>
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs rounded-full border border-[#EEE5DC] bg-[#FAF5F0] px-3.5 py-1.5 text-[#1B1411] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1B1411]"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Administrator</option>
            <option value="REVIEWER">Scrutiny Officer</option>
            <option value="VIEWER">Auditor / Viewer</option>
            <option value="INSTITUTION_USER">Institution User</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#66574F] ml-1">
            <span className="font-semibold">Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-full border border-[#EEE5DC] bg-[#FAF5F0] px-3.5 py-1.5 text-[#1B1411] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1B1411]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>{error}</span>
            <Button
              variant="link"
              size="sm"
              onClick={loadUsers}
              className="text-destructive font-semibold p-0 h-auto"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#EEE5DC] shadow-[0_2px_8px_rgba(27,20,17,0.04)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Loading system user accounts...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <Users className="w-8 h-8 text-muted-foreground/60 mx-auto" />
            <p className="font-semibold text-foreground">No matching user accounts found</p>
            <p className="text-[11px] text-muted-foreground">
              Try adjusting your search query or role filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAF5F0] border-b border-[#EEE5DC] text-[11px] font-mono font-bold text-[#66574F] uppercase tracking-wider">
                  <TableHead className="px-4 py-3 text-[#66574F]">User &amp; Email</TableHead>
                  <TableHead className="px-4 py-3 text-[#66574F]">Assigned Role</TableHead>
                  <TableHead className="px-4 py-3 text-[#66574F]">Institution Scope</TableHead>
                  <TableHead className="px-4 py-3 text-[#66574F]">Account Status</TableHead>
                  <TableHead className="px-4 py-3 text-[#66574F]">Last Active</TableHead>
                  <TableHead className="px-4 py-3 text-right text-[#66574F]">Access Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-[#FAF5F0]/60 border-b border-[#EEE5DC]/60 transition-colors">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-[#1B1411] text-[#33CC7A] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs font-mono">
                          {u.display_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1B1411]">{u.display_name}</div>
                          <div className="text-[11px] text-[#66574F] font-mono">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 whitespace-nowrap">{getRoleBadge(u.role)}</TableCell>

                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {u.institution_id ? (
                        <span className="font-mono text-[11px] rounded-full bg-[#EEE5DC] text-[#1B1411] px-2.5 py-0.5 font-bold">
                          {u.institution_id}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#66574F] italic">Global Regulatory</span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-[#E8F8F0] text-[#1B804D] px-2.5 py-0.5 font-bold font-mono">
                          <CheckCircle2 className="w-3 h-3 text-[#33CC7A]" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-[#FDF2F2] text-[#B91C1C] px-2.5 py-0.5 font-bold font-mono">
                          <XCircle className="w-3 h-3 text-[#EF4444]" /> Deactivated
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-3 whitespace-nowrap text-[11px] text-[#66574F] font-mono">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never logged in'}
                    </TableCell>

                    <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={actionUserId === u.id}
                        className={`text-xs h-7 px-3 rounded-full font-bold transition-all ${
                          u.is_active
                            ? 'text-[#B91C1C] bg-[#FDF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5]'
                            : 'text-[#1B804D] bg-[#E8F8F0] hover:bg-[#D1F2E0] border border-[#A7F3D0]'
                        }`}
                      >
                        {actionUserId === u.id
                          ? 'Updating...'
                          : u.is_active
                          ? 'Deactivate'
                          : 'Re-activate'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                Provision New User Account
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Create credentials for an authorized regulatory officer, auditor, or institutional contact.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">{createError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs py-1">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Full Name / Display Name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                required
                value={createDisplayName}
                onChange={(e) => setCreateDisplayName(e.target.value)}
                placeholder="e.g., Dr. Ananya Sharma"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Official Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="e.g., a.sharma@aicte-india.org"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Minimum 8 characters (Argon2id hashed)"
                  className="pl-9 text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                System Role <span className="text-destructive">*</span>
              </label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="REVIEWER">Scrutiny Officer (Reviewer)</option>
                <option value="ADMIN">Regulatory Administrator (Admin)</option>
                <option value="VIEWER">Auditor / Viewer (Read-only)</option>
                <option value="INSTITUTION_USER">Institution Representative</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Roles are enforced strictly at every API endpoint under the VerityAI Permission Matrix.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Institution ID <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                type="text"
                value={createInstitutionId}
                onChange={(e) => setCreateInstitutionId(e.target.value)}
                placeholder="Leave empty for global regulatory scope"
                className="text-xs h-8"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createLoading}
                className="gap-1.5"
              >
                {createLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{createLoading ? 'Provisioning...' : 'Provision Account'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
