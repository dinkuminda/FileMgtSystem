import React, { useState, useEffect } from 'react';
import { supabase, logger } from '../lib/supabase';
import { Shield, Key, Loader2, Search, CheckCircle, AlertCircle, UserCog, Calendar, Clock, Mail, Users, LayoutDashboard, Plus, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminUser {
  id: string;
  email: string;
  last_sign_in_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  full_name: string | null;
  role: string;
  modules: string[];
}

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);
  const [modifyingRoleUser, setModifyingRoleUser] = useState<AdminUser | null>(null);
  const [modifyingModulesUser, setModifyingModulesUser] = useState<AdminUser | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!resettingUser || !newPassword) return;
    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: resettingUser.id,
          newPassword: newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      await logger.log('ADMIN_ACTION', 'User', `Reset password for user: ${resettingUser.email}`, resettingUser.id);
      
      setStatus({ type: 'success', message: `Password for ${resettingUser.email} has been updated.` });
      setNewPassword('');
      setTimeout(() => setResettingUser(null), 2000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateRole() {
    if (!modifyingRoleUser || !selectedRole) return;

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: modifyingRoleUser.id,
          newRole: selectedRole
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role');
      }

      await logger.log('ADMIN_ACTION', 'User', `Updated role for ${modifyingRoleUser.email} to ${selectedRole}`, modifyingRoleUser.id);
      
      setStatus({ type: 'success', message: `Role for ${modifyingRoleUser.email} updated to ${selectedRole}.` });
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === modifyingRoleUser.id ? { ...u, role: selectedRole } : u));
      
      setTimeout(() => setModifyingRoleUser(null), 2000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateUser() {
    if (!newUserEmail || !newPassword || !selectedRole) {
      setStatus({ type: 'error', message: 'All fields are required' });
      return;
    }

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newPassword,
          fullName: newUserFullName,
          role: selectedRole
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to create user');

      await logger.log('ADMIN_ACTION', 'User', `Created new user: ${newUserEmail} with role ${selectedRole}`);
      
      setStatus({ type: 'success', message: `User ${newUserEmail} created successfully.` });
      
      // Refresh list
      fetchUsers();
      
      setTimeout(() => {
        setIsAddingUser(false);
        setNewUserEmail('');
        setNewUserFullName('');
        setNewPassword('');
        setSelectedRole('');
      }, 2000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateModules() {
    if (!modifyingModulesUser) return;

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/admin/update-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: modifyingModulesUser.id,
          modules: selectedModules
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update modules');
      }

      await logger.log('ADMIN_ACTION', 'User', `Updated accessible modules for ${modifyingModulesUser.email}`, modifyingModulesUser.id);
      
      setStatus({ type: 'success', message: `Permissions for ${modifyingModulesUser.email} updated successfully.` });
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === modifyingModulesUser.id ? { ...u, modules: selectedModules } : u));
      
      setTimeout(() => setModifyingModulesUser(null), 2000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserCog className="w-8 h-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control system access, roles, and authentication security</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => { setIsAddingUser(true); setSelectedRole('staff'); setStatus(null); }}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Users className="w-5 h-5" />
            <span>Create New User</span>
          </button>
          <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30">
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">Total Accounts</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-white">{users.length}</p>
            <Users className="w-6 h-6 text-blue-500/50" />
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-3xl border border-purple-100 dark:border-purple-900/30">
          <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1.5">Administrators</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-white">{users.filter(u => u.role === 'admin').length}</p>
            <Shield className="w-6 h-6 text-purple-500/50" />
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5">Staff Members</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-white">{users.filter(u => ['staff', 'airport_staff'].includes(u.role)).length}</p>
            <CheckCircle className="w-6 h-6 text-emerald-500/50" />
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Active Today</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-gray-900 dark:text-white">
              {users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at).toDateString() === new Date().toDateString()).length}
            </p>
            <Clock className="w-6 h-6 text-gray-500/30" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Hydrating Auth Management...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((user) => (
            <motion.div 
              layout
              key={user.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/30 transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center space-x-5">
                  <div className={`p-4 rounded-2xl shadow-inner ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                  }`}>
                    <Shield className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                        {user.full_name || 'Anonymous User'}
                      </h3>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {user.email}
                      </div>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <div className="flex items-center gap-1">
                        {user.confirmed_at ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            <AlertCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Created
                    </p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Last Active
                    </p>
                    <p className={`text-sm font-bold tabular-nums ${user.last_sign_in_at ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}`}>
                      {formatDate(user.last_sign_in_at)}
                    </p>
                  </div>
                </div>

                  <div className="flex lg:justify-end gap-2">
                    <button 
                      onClick={() => { setModifyingModulesUser(user); setSelectedModules(user.modules || []); setStatus(null); }}
                      className="w-full lg:w-auto flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 hover:text-white px-5 py-4 rounded-2xl transition-all shadow-sm"
                      title="Manage accessible modules"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Edit Access</span>
                    </button>
                    <button 
                      onClick={() => { setModifyingRoleUser(user); setSelectedRole(user.role); setStatus(null); }}
                      className="w-full lg:w-auto flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-600 hover:text-white px-5 py-4 rounded-2xl transition-all shadow-sm"
                    >
                      <UserCog className="w-4 h-4" />
                      <span>Role</span>
                    </button>
                    <button 
                      onClick={() => { setResettingUser(user); setStatus(null); }}
                      className="w-full lg:w-auto flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-600 hover:text-white px-5 py-4 rounded-2xl transition-all shadow-sm"
                    >
                      <Key className="w-4 h-4" />
                      <span>Key</span>
                    </button>
                  </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Customize Modules Modal */}
      <AnimatePresence>
        {modifyingModulesUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-blue-600" />
                    Module Permissions
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Configure which features are visible in the sidebar</p>
                </div>
                <button 
                  onClick={() => setModifyingModulesUser(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Search className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl mb-6">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Customizing access for: <span className="font-bold underline">{modifyingModulesUser.email}</span>
                </p>
              </div>

              <div className="overflow-y-auto pr-2 space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'OVERVIEW', label: 'Dashboard', desc: 'Main statistics and highlights' },
                    { id: 'USERS', label: 'User Management', desc: 'Admin tools for controlling access' },
                    { id: 'REPORTS', label: 'Reports', desc: 'Graphical analytics and data maps' },
                    { id: 'VISA', label: 'VISA Records', desc: 'Standard visa database' },
                    { id: 'EOID', label: 'EOID', desc: 'Exit/Entry records' },
                    { id: 'Residence ID', label: 'Residence ID', desc: 'Permanent resident data' },
                    { id: 'ETD', label: 'ETD', desc: 'Emergency Travel Documents' },
                    { id: 'AIRPORT', label: 'Bole Airport', desc: 'Main Airport Operations' },
                    { id: 'AIRPORT_ADD', label: 'Airport: Add', desc: 'Create new airport records' },
                    { id: 'AIRPORT_VIEW', label: 'Airport: View', desc: 'Search and view airport entries' },
                    { id: 'AIRPORT_EDIT', label: 'Airport: Edit', desc: 'Modify existing airport entries' },
                    { id: 'AUDIT', label: 'System Audit', desc: 'Track all system changes' }
                  ].map((module) => {
                    const isSelected = selectedModules.includes(module.id);
                    return (
                      <button
                        key={module.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedModules(prev => prev.filter(m => m !== module.id));
                          } else {
                            setSelectedModules(prev => [...prev, module.id]);
                          }
                        }}
                        className={`text-left p-4 rounded-2xl border-2 transition-all group ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-wider">{module.label}</span>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-700'
                          }`}>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">{module.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
                        status.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <p>{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                <button 
                  onClick={() => setModifyingModulesUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateModules}
                  disabled={actionLoading}
                  className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Save Access Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  Create Access Account
                </h3>
                <button 
                  onClick={() => setIsAddingUser(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Search className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                    <input 
                      type="email"
                      className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input 
                      type="text"
                      className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Initial Password</label>
                  <input 
                    type="password"
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">System Role</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'admin', label: 'Administrator', desc: 'Full system access' },
                      { id: 'staff', label: 'Immigration Staff', desc: 'Standard records' },
                      { id: 'airport_staff', label: 'Airport Staff', desc: 'Bole Airport only' },
                      { id: 'viewer', label: 'Viewer', desc: 'Read-only access' }
                    ].map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all ${
                          selectedRole === role.id 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                        }`}
                      >
                        <div className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{role.label}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{role.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
                        status.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <p>{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                <button 
                  onClick={() => setIsAddingUser(false)}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateUser}
                  disabled={actionLoading || !newUserEmail || !newPassword}
                  className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create User Account</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Management Modal */}
      <AnimatePresence>
        {modifyingRoleUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Shield className="w-6 h-6 text-emerald-600" />
                  Update Access Role
                </h3>
                <button 
                  onClick={() => setModifyingRoleUser(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Search className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl mb-6">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Changing access level for: <span className="font-bold underline">{modifyingRoleUser.email}</span>
                </p>
              </div>

              <div className="overflow-y-auto pr-2 flex-1 scrollbar-hide">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">
                      Select New Role
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'admin', label: 'Administrator', desc: 'Full system access' },
                        { id: 'staff', label: 'Immigration Staff', desc: 'Standard records access' },
                        { id: 'airport_staff', label: 'Airport Staff', desc: 'Bole Airport records only' },
                        { id: 'viewer', label: 'Viewer', desc: 'Read-only standard records' },
                        { id: 'airport_viewer', label: 'Airport Viewer', desc: 'Read-only airport records' }
                      ].map((role) => (
                        <button
                          key={role.id}
                          onClick={() => setSelectedRole(role.id)}
                          className={`text-left p-4 rounded-2xl border-2 transition-all group ${
                            selectedRole === role.id 
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                              : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{role.label}</span>
                            <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                              selectedRole === role.id ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200 dark:border-gray-700'
                            }`} />
                          </div>
                          <p className="text-[10px] text-gray-500 leading-relaxed">{role.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {status && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
                          status.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                        <p>{status.message}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                <button 
                  onClick={() => setModifyingRoleUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateRole}
                  disabled={actionLoading || !selectedRole}
                  className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Update Role</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Key className="w-6 h-6 text-blue-600" />
                  Reset Password
                </h3>
                <button 
                  onClick={() => setResettingUser(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Search className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl mb-6">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Changing password for: <span className="font-bold underline">{resettingUser.email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    New Password
                  </label>
                  <input 
                    type="password"
                    autoFocus
                    placeholder="Minimal 6 characters"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <AnimatePresence>
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${
                        status.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <p>{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setResettingUser(null)}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleResetPassword}
                    disabled={actionLoading || !newPassword}
                    className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>Confirm Reset</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
