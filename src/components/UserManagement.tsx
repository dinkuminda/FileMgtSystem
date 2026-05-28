import React, { useState, useEffect } from 'react';
import { supabase, logger } from '../lib/supabase';
import { Shield, Key, Loader2, Search, CheckCircle, AlertCircle, UserCog, Calendar, Clock, Mail, Users, LayoutDashboard, Plus, Activity, X, MoreHorizontal, User, ChevronDown } from 'lucide-react';
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

  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Admin API endpoint not found (404). If you are on Vercel, the backend server might not be configured correctly.');
        }
        throw new Error('Failed to fetch users: ' + response.statusText);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
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

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role.toUpperCase() === roleFilter;
    // Status filter is mocked as everything is "ACTIVE" in this view
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  const toggleSelectAll = () => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUserIds(newSelected);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-700 bg-[#f8fafc] min-h-screen">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-4 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search identities..."
              className="w-full pl-12 pr-4 py-3 bg-[#eef2f6] border-none rounded-full text-slate-600 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select 
            className="px-4 py-3 bg-[#eef2f6] border-none rounded-xl text-slate-600 font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">ALL ROLES</option>
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
            <option value="VIEWER">VIEWER</option>
          </select>

          <select 
            className="px-4 py-3 bg-[#eef2f6] border-none rounded-xl text-slate-600 font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">ALL STATUS</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <button 
          onClick={() => { setIsAddingUser(true); setSelectedRole('staff'); setStatus(null); }}
          className="flex items-center gap-2 px-6 py-3.5 bg-[#0d47a1] text-white rounded-full font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-[#1565c0] transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Invite User
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem] shadow-sm border border-slate-100">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin opacity-20 mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing Registry...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-900 mb-2">Protocol Error</h3>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button onClick={() => fetchUsers()} className="px-8 py-3 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-widest">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="p-6 text-left w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={paginatedUsers.length > 0 && selectedUserIds.size === paginatedUsers.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                  <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Active</th>
                  <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {paginatedUsers.map((user) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={user.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-6">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                        />
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 tracking-tight leading-tight">{user.full_name || 'System Subject'}</p>
                            <p className="text-[11px] font-medium text-slate-400 mt-1">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        {user.role === 'admin' ? (
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                            <Shield className="w-3 h-3" />
                            Standard Access
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setModifyingRoleUser(user); setSelectedRole(user.role); }}
                            className="flex items-center justify-between w-44 px-4 py-2 bg-[#eef2f6] rounded-full text-[10px] font-black text-slate-700 uppercase tracking-widest hover:bg-slate-200 transition-all border border-transparent focus:border-blue-500/30"
                          >
                            <span>{user.role}</span>
                            <ChevronDown className="w-4 h-4 opacity-40" />
                          </button>
                        )}
                      </td>
                      <td className="p-6">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#e6f4f1] text-[#2e8b79] rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-medium text-slate-500">
                          {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => { setModifyingModulesUser(user); setSelectedModules(user.modules || []); }}
                            className="px-5 py-2 text-[10px] font-black text-slate-900 uppercase tracking-[0.1em] hover:bg-slate-100 rounded-lg transition-all active:scale-95"
                          >
                            Edit
                          </button>
                          <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="max-w-xs mx-auto">
                        <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching subjects found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-6 flex items-center justify-between border-t border-slate-50 bg-white">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-lg disabled:opacity-30 transition-all"
              >
                Prev
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-full text-[10px] font-black transition-all ${
                      currentPage === i + 1 
                        ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/20' 
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-lg disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modules Modal */}
      <AnimatePresence>
        {modifyingModulesUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--m3-surface-scrim)]/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="m3-card-elevated p-8 max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--m3-primary-container)] rounded-2xl text-[var(--m3-on-primary-container)]">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--m3-on-surface)]">Subject Matrix Access</h3>
                    <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] opacity-50">Feature availability override</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModifyingModulesUser(null)}
                  className="p-3 hover:bg-[var(--m3-surface-container-high)] rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[var(--m3-on-surface-variant)]" />
                </button>
              </div>

              <div className="p-4 bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)] rounded-2xl mb-8 border border-[var(--m3-outline-variant)]/30">
                <p className="text-xs font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 opacity-40" />
                  Target: <span className="font-black underline">{modifyingModulesUser.email}</span>
                </p>
              </div>

              <div className="overflow-y-auto pr-2 space-y-4 flex-1 scrollbar-hide">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'OVERVIEW', label: 'Command Deck', desc: 'Main terminal statistics' },
                    { id: 'USERS', label: 'Auth Matrix', desc: 'Administrative user controls' },
                    { id: 'REPORTS', label: 'Intelligence', desc: 'Visual data maps & analytics' },
                    { id: 'VISA', label: 'VISA Records', desc: 'Standard entry database' },
                    { id: 'EOID', label: 'EOID Feed', desc: 'Exit/Entry event logistics' },
                    { id: 'Residence ID', label: 'Residency', desc: 'Permanent subject data' },
                    { id: 'ETD', label: 'Emergency', desc: 'Travel document exceptions' },
                    { id: 'AIRPORT', label: 'Yellow Card Division', desc: 'Yellow Card / Diaspora file registry' },
                    { id: 'AUDIT', label: 'Black Box', desc: 'Immutable system audit logs' }
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
                        className={`text-left p-5 rounded-2xl border-2 transition-all group relative overflow-hidden ${
                          isSelected 
                            ? 'border-[var(--m3-primary)] bg-[var(--m3-primary-container)]/20' 
                            : 'border-[var(--m3-outline-variant)]/30 hover:border-[var(--m3-primary)]/40 hover:bg-[var(--m3-surface-container)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold text-xs uppercase tracking-tight ${isSelected ? 'text-[var(--m3-primary)]' : 'text-[var(--m3-on-surface)]'}`}>
                            {module.label}
                          </span>
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-[var(--m3-primary)] border-[var(--m3-primary)] shadow-sm scale-110' : 'border-[var(--m3-outline)]/40'
                          }`}>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[var(--m3-on-primary)]" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-60 leading-snug">{module.desc}</p>
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
                      className={`flex items-center gap-3 p-5 rounded-2xl text-xs font-bold border ${
                        status.type === 'success' 
                          ? 'bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] border-[var(--m3-tertiary)]/20' 
                          : 'bg-[var(--m3-error-container)] text-[var(--m3-on-error-container)] border-[var(--m3-error)]/20'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <p className="uppercase tracking-wide">{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-4 pt-8 border-t border-[var(--m3-outline-variant)]/30 mt-8">
                <button 
                  onClick={() => setModifyingModulesUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[var(--m3-surface-container-highest)] transition-all"
                >
                  Return
                </button>
                <button 
                  onClick={handleUpdateModules}
                  disabled={actionLoading}
                  className="m3-button-filled flex-[2] flex items-center justify-center gap-3 px-8 py-4 shadow-xl shadow-[var(--m3-primary)]/20"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LayoutDashboard className="w-5 h-5" />
                      <span className="uppercase tracking-[0.2em] text-[10px] font-black">Apply Matrix Update</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--m3-surface-scrim)]/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="m3-card-elevated p-10 max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--m3-secondary-container)] rounded-2xl text-[var(--m3-on-secondary-container)]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--m3-on-surface)]">Init Subject Provisioning</h3>
                    <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] opacity-50">Authorized registry creation</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddingUser(false)}
                  className="p-3 hover:bg-[var(--m3-surface-container-high)] rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[var(--m3-on-surface-variant)]" />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-8 flex-1 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1 opacity-60">Authentication ID (Email)</label>
                    <input 
                      type="email"
                      className="m3-input w-full"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="subject@boleregistry.gov"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1 opacity-60">Full Identity Name</label>
                    <input 
                      type="text"
                      className="m3-input w-full"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="Official Subject Name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1 opacity-60">Root Access Key</label>
                  <input 
                    type="password"
                    className="m3-input w-full font-mono"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 alphanumeric characters"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1 opacity-60">Clearance Tier</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'admin', label: 'Command/Admin', desc: 'Unrestricted matrix control' },
                      { id: 'staff', label: 'Field Staff', desc: 'Standard registry access' },
                      { id: 'airport_staff', label: 'Hub Personnel', desc: 'Localized bole operations' },
                      { id: 'viewer', label: 'Observer', desc: 'Passive record monitoring' }
                    ].map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`text-left p-5 rounded-2xl border-2 transition-all flex flex-col gap-1 ${
                          selectedRole === role.id 
                            ? 'border-[var(--m3-secondary)] bg-[var(--m3-secondary-container)]/20' 
                            : 'border-[var(--m3-outline-variant)]/30 hover:border-[var(--m3-secondary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${selectedRole === role.id ? 'text-[var(--m3-secondary)]' : 'text-[var(--m3-on-surface)]'}`}>
                            {role.label}
                          </span>
                          {selectedRole === role.id && <CheckCircle className="w-4 h-4 text-[var(--m3-secondary)]" />}
                        </div>
                        <div className="text-[9px] text-[var(--m3-on-surface-variant)] opacity-50 uppercase tracking-tighter">{role.desc}</div>
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
                      className={`flex items-center gap-3 p-5 rounded-2xl text-xs font-bold border ${
                        status.type === 'success' 
                          ? 'bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] border-[var(--m3-tertiary)]/20' 
                          : 'bg-[var(--m3-error-container)] text-[var(--m3-on-error-container)] border-[var(--m3-error)]/20'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <p className="uppercase tracking-wide">{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-4 pt-8 border-t border-[var(--m3-outline-variant)]/30 mt-8">
                <button 
                  onClick={() => setIsAddingUser(false)}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[var(--m3-surface-container-highest)] transition-all"
                >
                   Abort
                </button>
                <button 
                  onClick={handleCreateUser}
                  disabled={actionLoading || !newUserEmail || !newPassword}
                  className="m3-button-filled flex-[2] flex items-center justify-center gap-3 px-8 py-4 shadow-xl shadow-[var(--m3-primary)]/20 disabled:opacity-30"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span className="uppercase tracking-[0.2em] text-[10px] font-black">Provision Entry</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--m3-surface-scrim)]/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, x: 20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.95, opacity: 0, x: 20 }}
              className="m3-card-elevated p-8 max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--m3-tertiary-container)] rounded-2xl text-[var(--m3-on-tertiary-container)]">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--m3-on-surface)]">Clearance Escalation</h3>
                    <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] opacity-50">Subject role modification</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModifyingRoleUser(null)}
                  className="p-3 hover:bg-[var(--m3-surface-container-high)] rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[var(--m3-on-surface-variant)]" />
                </button>
              </div>

              <div className="p-4 bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] rounded-2xl mb-8 border border-[var(--m3-tertiary)]/20">
                <p className="text-xs font-bold">
                  Escalating status for: <span className="font-black underline">{modifyingRoleUser.email}</span>
                </p>
              </div>

              <div className="overflow-y-auto pr-2 flex-1 scrollbar-hide">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'admin', label: 'Command/Admin', desc: 'Full matrix oversight' },
                      { id: 'staff', label: 'Immigration Staff', desc: 'Standard records processing' },
                      { id: 'airport_staff', label: 'Hub Personnel', desc: 'Bole localized access' },
                      { id: 'viewer', label: 'Standard Observer', desc: 'Global read-only clearance' },
                      { id: 'airport_viewer', label: 'Hub Observer', desc: 'Bole restricted monitoring' }
                    ].map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`text-left p-5 rounded-2xl border-2 transition-all flex flex-col gap-1 ${
                          selectedRole === role.id 
                            ? 'border-[var(--m3-tertiary)] bg-[var(--m3-tertiary-container)]/20' 
                            : 'border-[var(--m3-outline-variant)]/30 hover:border-[var(--m3-tertiary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-sm ${selectedRole === role.id ? 'text-[var(--m3-tertiary)]' : 'text-[var(--m3-on-surface)]'}`}>
                            {role.label}
                          </span>
                          <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                            selectedRole === role.id ? 'bg-[var(--m3-tertiary)] border-[var(--m3-tertiary)]' : 'border-[var(--m3-outline)]/40'
                          }`} />
                        </div>
                        <p className="text-[10px] text-[var(--m3-on-surface-variant)] opacity-50 leading-relaxed font-medium">{role.desc}</p>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {status && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-center gap-3 p-5 rounded-2xl text-xs font-bold border ${
                          status.type === 'success' 
                            ? 'bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] border-[var(--m3-tertiary)]/20' 
                            : 'bg-[var(--m3-error-container)] text-[var(--m3-on-error-container)] border-[var(--m3-error)]/20'
                        }`}
                      >
                        {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                        <p className="uppercase tracking-wide">{status.message}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-[var(--m3-outline-variant)]/30 mt-8">
                <button 
                  onClick={() => setModifyingRoleUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-4 bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateRole}
                  disabled={actionLoading || !selectedRole}
                  className="m3-button-filled flex-[2] bg-[var(--m3-tertiary)] text-[var(--m3-on-tertiary)] flex items-center justify-center gap-3 px-8 py-4 shadow-xl shadow-[var(--m3-tertiary)]/20"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      <span className="uppercase tracking-[0.2em] text-[10px] font-black">Commit Tier Shift</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--m3-surface-scrim)]/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="m3-card-elevated p-8 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--m3-primary-container)] rounded-2xl text-[var(--m3-on-primary-container)]">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--m3-on-surface)]">Auth Override</h3>
                    <p className="text-[10px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] opacity-50">Critical password shift</p>
                  </div>
                </div>
                <button 
                  onClick={() => setResettingUser(null)}
                  className="p-3 hover:bg-[var(--m3-surface-container-high)] rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-[var(--m3-on-surface-variant)]" />
                </button>
              </div>

              <div className="p-4 bg-[var(--m3-primary-container)]/10 text-[var(--m3-on-surface)] rounded-2xl border border-[var(--m3-primary)]/10">
                <p className="text-xs font-bold truncate">
                  Resetting for: <span className="font-black underline">{resettingUser.email}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-[var(--m3-on-surface-variant)] uppercase tracking-[0.1em] px-1 opacity-60">
                    New Security Key
                  </label>
                  <input 
                    type="password"
                    autoFocus
                    placeholder="Minimal 6 characters required"
                    className="m3-input w-full font-mono text-center tracking-widest"
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
                      className={`flex items-center gap-3 p-5 rounded-2xl text-xs font-bold border ${
                        status.type === 'success' 
                          ? 'bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] border-[var(--m3-tertiary)]/20' 
                          : 'bg-[var(--m3-error-container)] text-[var(--m3-on-error-container)] border-[var(--m3-error)]/20'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                      <p className="uppercase tracking-wide">{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setResettingUser(null)}
                    disabled={actionLoading}
                    className="flex-1 px-6 py-4 bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleResetPassword}
                    disabled={actionLoading || !newPassword}
                    className="m3-button-filled flex-[2] flex items-center justify-center gap-3 px-8 py-4 shadow-xl shadow-[var(--m3-primary)]/20"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        <span className="uppercase tracking-[0.2em] text-[10px] font-black">Commit Shift</span>
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
