'use client';

import { useState, useEffect } from 'react';
import { AdminNavigation } from '@/components/admin-navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plus, Trash2, ShieldCheck, ShieldOff, ShieldAlert, Mail } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mfaEnabled: boolean;
  mfaRequired: boolean;
  createdAt: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'admin',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([loadUsers(), loadCurrentUser()]);
  }, []);

  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user?.id) setCurrentUserId(data.user.id);
    } catch {}
  }

  async function loadUsers() {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (response.ok) setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to create user');

      setSuccess('User created successfully!');
      setFormData({ email: '', name: '', password: '', role: 'admin' });
      setShowCreateForm(false);
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId: string, userName: string | null) {
    if (!confirm(`Are you sure you want to delete user "${userName || 'Unknown'}"?`)) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete user');
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Failed to delete user');
    }
  }

  async function handleMfaAction(userId: string, action: 'disable-mfa' | 'require-mfa' | 'unrequire-mfa') {
    const confirmMessages: Record<string, string> = {
      'disable-mfa': 'This will immediately disable MFA and log out that user from all sessions. Continue?',
      'require-mfa': 'This will require the user to set up MFA before they can access any admin pages. Continue?',
      'unrequire-mfa': 'Remove the MFA requirement for this user?',
    };
    if (!confirm(confirmMessages[action])) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed');
      setSuccess(data.message);
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Action failed');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage admin users and their access</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {showCreateForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>Create User</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">All Users ({users.length})</h2>
          </div>

          {loading && !users.length ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold">{user.name || 'Unnamed User'}</h3>
                        {user.mfaEnabled && (
                          <span className="inline-flex items-center text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            MFA On
                          </span>
                        )}
                        {user.mfaRequired && !user.mfaEnabled && (
                          <span className="inline-flex items-center text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            MFA Setup Pending
                          </span>
                        )}
                        {user.mfaRequired && user.mfaEnabled && (
                          <span className="inline-flex items-center text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            MFA Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Role: <span className="font-medium capitalize">{user.role}</span></span>
                        <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* MFA disable — only for other users with MFA active */}
                    {user.mfaEnabled && user.id !== currentUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMfaAction(user.id, 'disable-mfa')}
                        className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      >
                        <ShieldOff className="h-4 w-4 mr-1" />
                        Disable MFA
                      </Button>
                    )}

                    {/* Require / un-require MFA */}
                    {user.id !== currentUserId && (
                      user.mfaRequired ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMfaAction(user.id, 'unrequire-mfa')}
                          className="text-muted-foreground"
                        >
                          <ShieldAlert className="h-4 w-4 mr-1" />
                          Remove Requirement
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMfaAction(user.id, 'require-mfa')}
                          className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <ShieldAlert className="h-4 w-4 mr-1" />
                          Require MFA
                        </Button>
                      )
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}