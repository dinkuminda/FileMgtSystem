import React, { useState, useEffect } from 'react';
import { supabase, logger, UserRole } from '../lib/supabase';
import { 
  getPermissionRules, 
  savePermissionRules, 
  DEFAULT_PERMISSION_RULES, 
  type ModulePermissionRule 
} from '../lib/permissions';
import { 
  Shield, 
  Key, 
  Loader2, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  SlidersHorizontal,
  Download,
  Plus, 
  Activity, 
  X, 
  User, 
  ChevronRight,
  Pencil,
  Clock,
  Trash2,
  Lock,
  FileSpreadsheet,
  Check,
  ChevronLeft,
  Palette,
  AlertTriangle,
  LayoutDashboard,
  Users,
  FileText,
  Globe,
  Fingerprint,
  Archive,
  History,
  Plane
} from 'lucide-react';
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

type ThemeAccent = 'emerald' | 'blue' | 'amber' | 'slate';

interface ThemeStyles {
  primary: string;
  primaryText: string;
  borderClass: string;
  bgLight: string;
  badge: string;
  accentHex: string;
  accentIcon: string;
  focusRing: string;
  activeIndicator: string;
  hoverCard: string;
}

const THEMES: Record<ThemeAccent, ThemeStyles> = {
  emerald: {
    primary: 'bg-[#2b825a] hover:bg-[#1f6041] active:bg-[#1a5036] text-white',
    primaryText: 'text-[#1b8b58]',
    borderClass: 'border-[#2b825a]/90',
    bgLight: 'bg-[#ecf7f1]',
    badge: 'bg-emerald-50 border border-emerald-250 text-[#1b8b58]',
    accentHex: '#2b825a',
    accentIcon: 'text-emerald-500',
    focusRing: 'focus:ring-[#2b825a]/30 focus:border-[#2b825a]',
    activeIndicator: 'bg-emerald-500',
    hoverCard: 'bg-emerald-50/40 border-emerald-250/60 text-emerald-900',
  },
  blue: {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
    primaryText: 'text-blue-600',
    borderClass: 'border-blue-500/90',
    bgLight: 'bg-blue-50',
    badge: 'bg-blue-50 border border-blue-200 text-blue-750',
    accentHex: '#2563eb',
    accentIcon: 'text-blue-500',
    focusRing: 'focus:ring-blue-500/30 focus:border-blue-500',
    activeIndicator: 'bg-blue-500',
    hoverCard: 'bg-blue-50/40 border-blue-200/60 text-blue-900',
  },
  amber: {
    primary: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
    primaryText: 'text-amber-700',
    borderClass: 'border-amber-500/90',
    bgLight: 'bg-amber-50',
    badge: 'bg-amber-50 border border-amber-200 text-amber-800',
    accentHex: '#d97706',
    accentIcon: 'text-amber-500',
    focusRing: 'focus:ring-amber-500/30 focus:border-amber-500',
    activeIndicator: 'bg-amber-500',
    hoverCard: 'bg-amber-50/40 border-amber-200/60 text-amber-900',
  },
  slate: {
    primary: 'bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white',
    primaryText: 'text-slate-700',
    borderClass: 'border-slate-500/90',
    bgLight: 'bg-slate-100',
    badge: 'bg-slate-100 border border-slate-300 text-slate-800',
    accentHex: '#475569',
    accentIcon: 'text-slate-500',
    focusRing: 'focus:ring-slate-500/30 focus:border-slate-300',
    activeIndicator: 'bg-slate-500',
    hoverCard: 'bg-slate-100/60 border-slate-300/80 text-slate-900',
  }
};

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Dynamic Color Theme picker state
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('emerald');
  const theme = THEMES[themeAccent];

  // Active sub-tab under credential registry
  const [activeRegistryTab, setActiveRegistryTab] = useState<'OFFICERS' | 'MATRIX'>('OFFICERS');
  const [permissionRules, setPermissionRules] = useState<ModulePermissionRule[]>(DEFAULT_PERMISSION_RULES);
  const [savingRules, setSavingRules] = useState(false);
  const [matrixStatus, setMatrixStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    getPermissionRules().then(rules => {
      setPermissionRules(rules);
    });
  }, []);

  const handleSaveMatrixRules = async () => {
    setSavingRules(true);
    setMatrixStatus(null);
    try {
      await savePermissionRules(permissionRules);
      setMatrixStatus({ type: 'success', message: 'Clearance authorization matrix persisted and deployed successfully!' });
      setTimeout(() => setMatrixStatus(null), 4000);
    } catch (e: any) {
      setMatrixStatus({ type: 'error', message: `Matrix deployment error: ${e.message}` });
    } finally {
      setSavingRules(false);
    }
  };

  // Selected user for the right-side profile pane
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Administrative mod operations states
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);
  const [modifyingRoleUser, setModifyingRoleUser] = useState<AdminUser | null>(null);
  const [modifyingModulesUser, setModifyingModulesUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Form fields
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  
  // Status feedback elements
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inlineLoadingUserId, setInlineLoadingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters Panel
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [localSubPerms, setLocalSubPerms] = useState<Record<string, { list: boolean; show: boolean; edit: boolean }>>({});

  useEffect(() => {
    if (modifyingModulesUser) {
      const initialPerms: Record<string, { list: boolean; show: boolean; edit: boolean }> = {};
      const modulesList = [
        'OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 
        'Residence ID', 'ETD', 'CABINETS', 'AIRPORT', 'Yellow Card', 'AUDIT'
      ];
      const userSelected = modifyingModulesUser.modules || [];
      modulesList.forEach(mId => {
        const isSelected = userSelected.includes(mId);
        initialPerms[mId] = {
          list: isSelected,
          show: isSelected,
          edit: isSelected && modifyingModulesUser.role !== 'view_only' && modifyingModulesUser.role !== 'viewer'
        };
      });
      setLocalSubPerms(initialPerms);
    } else {
      setLocalSubPerms({});
    }
  }, [modifyingModulesUser]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active encryption session found. Please sign in again.');

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Administrative backend gateway endpoint could not be resolved (404).');
        }
        throw new Error('Failed to fetch administrative user database directory: ' + response.statusText);
      }
      
      const data = await response.json();
      const loadedUsers = data.users || [];
      setUsers(loadedUsers);
      
      // Select the first user by default if available
      if (loadedUsers.length > 0) {
        setSelectedUser(loadedUsers[0]);
      }
    } catch (err: any) {
      console.error('Error fetching users register:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle password reset
  async function handleResetPassword() {
    if (!resettingUser || !newPassword) return;
    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'The default security key must contain at least 6 alphanumeric characters.' });
      return;
    }

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Administrative credentials not active.');

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
        throw new Error(result.error || 'Failed to securely override user credentials.');
      }

      await logger.log('ADMIN_ACTION', 'User', `Credentials rewrite executed for account: ${resettingUser.email}`, resettingUser.id);
      
      setStatus({ type: 'success', message: `Authentication password rewrite complete for: ${resettingUser.email}` });
      setNewPassword('');
      setTimeout(() => {
        setResettingUser(null);
        setStatus(null);
      }, 1800);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle user role escalations
  async function handleUpdateRole() {
    if (!modifyingRoleUser || !selectedRole) return;

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No admin context active.');

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
        throw new Error(result.error || 'Failed to update administrative clearance tier.');
      }

      await logger.log('ADMIN_ACTION', 'User', `Escalated security clearance level for ${modifyingRoleUser.email} to ${selectedRole}`, modifyingRoleUser.id);
      
      setStatus({ type: 'success', message: `Authentication clearance elevated to: ${selectedRole.toUpperCase()}` });
      
      setUsers(prev => prev.map(u => u.id === modifyingRoleUser.id ? { ...u, role: selectedRole } : u));
      if (selectedUser?.id === modifyingRoleUser.id) {
        setSelectedUser(prev => prev ? { ...prev, role: selectedRole } : null);
      }
      
      setTimeout(() => {
        setModifyingRoleUser(null);
        setStatus(null);
      }, 1500);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle inline user role alterations directly from index table
  async function handleInlineUpdateRole(user: AdminUser, newRole: UserRole) {
    if (user.role === newRole) return;

    setInlineLoadingUserId(user.id);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No admin context active.');

      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: user.id,
          newRole: newRole
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update administrative clearance tier.');
      }

      await logger.log('ADMIN_ACTION', 'User', `Escalated security clearance level inline for ${user.email} to ${newRole}`, user.id);

      setStatus({ type: 'success', message: `Clearance successfully changed for ${user.email} to ${newRole.toUpperCase()}` });

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      if (selectedUser?.id === user.id) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      }

      setTimeout(() => {
        setStatus(null);
      }, 3000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setInlineLoadingUserId(null);
    }
  }

  // Handle user provisioning
  async function handleCreateUser() {
    if (!newUserEmail || !newPassword || !selectedRole) {
      setStatus({ type: 'error', message: 'All entry coordinates are essential.' });
      return;
    }

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authorization layer error');

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

      if (!response.ok) throw new Error(result.error || 'Failed to register new secure subject.');

      await logger.log('ADMIN_ACTION', 'User', `Created new secure registry account: ${newUserEmail} (${selectedRole})`);
      
      setStatus({ type: 'success', message: `Provisioned profile established for: ${newUserEmail}` });
      
      await fetchUsers();
      
      setTimeout(() => {
        setIsAddingUser(false);
        setNewUserEmail('');
        setNewUserFullName('');
        setNewPassword('');
        setSelectedRole('');
        setStatus(null);
      }, 1800);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle system modules credentials matrix
  async function handleUpdateModules() {
    if (!modifyingModulesUser) return;

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No authorization token present.');

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
        throw new Error(result.error || 'Error writing clearances schema.');
      }

      await logger.log('ADMIN_ACTION', 'User', `Overrode accessible module clearances for ${modifyingModulesUser.email}`, modifyingModulesUser.id);
      
      setStatus({ type: 'success', message: `Permissions assigned successfully for: ${modifyingModulesUser.email}` });
      
      setUsers(prev => prev.map(u => u.id === modifyingModulesUser.id ? { ...u, modules: selectedModules } : u));
      if (selectedUser?.id === modifyingModulesUser.id) {
        setSelectedUser(prev => prev ? { ...prev, modules: selectedModules } : null);
      }
      
      setTimeout(() => {
        setModifyingModulesUser(null);
        setStatus(null);
      }, 1800);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Real delete functionality
  async function handleDeleteUser() {
    if (!deletingUser) return;

    setActionLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session unverified.');

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: deletingUser.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Account teardown process rejected by core database.');
      }

      await logger.log('ADMIN_ACTION', 'User', `Permanent security decommission of account: ${deletingUser.email}`);
      
      setStatus({ type: 'success', message: `Decommission complete. Account key terminated: ${deletingUser.email}` });
      
      // Update local array
      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      setSelectedUser(null);

      setTimeout(() => {
        setDeletingUser(null);
        setStatus(null);
      }, 1600);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Filters computed
  const filteredUsers = users.filter(u => {
    const s = searchQuery.toLowerCase();
    const matchesSearch = u.email.toLowerCase().includes(s) || (u.full_name || '').toLowerCase().includes(s);
    
    const matchesRole = roleFilter === 'ALL' || 
                        (roleFilter === 'SUPER_ADMIN' && (u.role === 'admin' || u.role === 'super_admin')) ||
                        (roleFilter === 'ADMIN_GRANT' && u.role === 'admin_grant') ||
                        (roleFilter === 'ADMIN' && (u.role === 'staff' || u.role === 'admin')) ||
                        (roleFilter === 'VIEW_ONLY' && (u.role === 'view_only' || u.role === 'viewer')) ||
                        (roleFilter === 'ADD_RECORDS' && u.role === 'add_records') ||
                        u.role.split('_').join('').toUpperCase() === roleFilter.split('_').join('').toUpperCase();
    
    const isActive = u.last_sign_in_at !== null;
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && isActive) || 
                         (statusFilter === 'INACTIVE' && !isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Auto-preview alignment
  useEffect(() => {
    if (paginatedUsers.length > 0 && (!selectedUser || !paginatedUsers.some(u => u.id === selectedUser.id))) {
      setSelectedUser(paginatedUsers[0]);
    }
  }, [searchQuery, roleFilter, statusFilter, currentPage, users]);

  function getRelativeActiveTime(dateStr: string | null) {
    if (!dateStr) return 'Offline Directory';
    const timestamp = new Date(dateStr).getTime();
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (diffSeconds < 0) return 'Active now';
    if (diffSeconds < 60) return 'Just active';
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
 
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function getGradientAvatar(email: string) {
    const charCodeSum = email.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const gradients = [
      'from-emerald-500 to-teal-500 text-emerald-50',
      'from-blue-500 to-cyan-500 text-blue-50',
      'from-amber-500 to-amber-700 text-amber-50',
      'from-slate-500 to-slate-700 text-slate-100',
      'from-indigo-500 to-indigo-700 text-indigo-50',
      'from-rose-500 to-pink-500 text-rose-50'
    ];
    return gradients[charCodeSum % gradients.length];
  }

  function getInitials(name: string | null, email: string) {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  function handleExportUsersToCSV() {
    if (filteredUsers.length === 0) return;
    const headers = ['Record ID', 'Email', 'Full Name', 'Role Level', 'Modules Clearance', 'ConfirmedAt'];
    const rows = filteredUsers.map(u => [
      u.id,
      u.email,
      u.full_name || 'Anonymous Officer',
      u.role.toUpperCase(),
      (u.modules || []).join(';'),
      u.confirmed_at ? new Date(u.confirmed_at).toISOString() : 'Pending'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "immigration_system_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const toggleSelectAll = () => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedUserIds(newSelected);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-1 min-h-[calc(100vh-140px)] text-slate-700 font-sans transition-all duration-300">
      
      {/* LEFT AREA: MAIN SEARCH & STATS TABLE */}
      <div className="flex-1 space-y-6">
        
        {/* Dynamic Theme Customizer Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Security Credentials Registry</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Active identity entries: <strong className={theme.primaryText}>{filteredUsers.length} files</strong> listed out of {users.length} registered
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Dynamic Accent Color Chooser */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/50 rounded-lg shadow-inner">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1.5">Theme:</span>
              <div className="flex items-center gap-1.5">
                {(['emerald', 'blue', 'amber', 'slate'] as const).map((themeName) => (
                  <button
                    key={themeName}
                    onClick={() => setThemeAccent(themeName)}
                    title={`Switch registry theme to ${themeName}`}
                    className={`w-4 h-4 rounded-full border cursor-pointer transition-all ${
                      themeName === 'emerald' ? 'bg-[#2b825a]' :
                      themeName === 'blue' ? 'bg-blue-500' :
                      themeName === 'amber' ? 'bg-amber-500' : 'bg-slate-500'
                    } ${
                      themeAccent === themeName 
                        ? 'scale-125 ring-2 ring-white border-slate-800 shadow-md' 
                        : 'opacity-40 hover:opacity-100 border-transparent hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Fast Clearance Filter Action buttons */}
            <button 
              onClick={() => { setIsAddingUser(true); setSelectedRole('staff'); setStatus(null); }}
              className={`px-3.5 py-1.5 ${theme.primary} text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-950/5 cursor-pointer select-none border-none outline-none`}
            >
              <Plus className="w-3.5 h-3.5" />
              Provision Account
            </button>
          </div>
        </div>

        {/* Dynamic Credentials Registry Sub-Tabs Switcher */}
        <div className="flex border-b border-slate-200/80 mb-1">
          <button
            onClick={() => setActiveRegistryTab('OFFICERS')}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all outline-none cursor-pointer ${
              activeRegistryTab === 'OFFICERS'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Credential Registry Directory
          </button>
          <button
            onClick={() => setActiveRegistryTab('MATRIX')}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all outline-none cursor-pointer ${
              activeRegistryTab === 'MATRIX'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Clearance Matrix Settings
          </button>
        </div>

        {activeRegistryTab === 'OFFICERS' ? (
          <>
            {/* Action filter controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Find officer name, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200/60 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all font-medium"
              />
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 border text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer select-none outline-none ${
                showFilters 
                ? 'bg-slate-200/60 border-slate-350 text-slate-800 shadow-inner' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            <button 
              onClick={handleExportUsersToCSV}
              disabled={filteredUsers.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none outline-none"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Expandable filters box */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm"
            >
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Group clearance role</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'ALL', label: 'All Roles' },
                    { id: 'SUPER_ADMIN', label: 'Super Admin' },
                    { id: 'ADMIN_GRANT', label: 'Admin Grant' },
                    { id: 'ADMIN', label: 'Admin' },
                    { id: 'ADD_RECORDS', label: 'Add Records' },
                    { id: 'VIEW_ONLY', label: 'View Only' },
                    { id: 'AIRPORT_STAFF', label: 'Airport Hub' }
                  ].map(role => (
                    <button
                      key={role.id}
                      onClick={() => setRoleFilter(role.id)}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all border outline-none cursor-pointer ${
                        roleFilter === role.id
                          ? `${theme.primary} border-transparent` 
                          : 'bg-slate-50 border-slate-150 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Administrative state</label>
                <div className="flex flex-wrap gap-1">
                  {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all border outline-none cursor-pointer ${
                        statusFilter === st 
                          ? `${theme.primary} border-transparent` 
                          : 'bg-slate-50 border-slate-150 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Directory table grid canvas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 bg-white border border-slate-150 rounded-xl shadow-sm">
            <Loader2 className={`w-8 h-8 ${theme.primaryText} animate-spin opacity-70 mb-2.5`} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] animate-pulse">Synchronizing Authorized Security Registry...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-8 text-center space-y-3 shadow-sm">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider">Gateway Communication Interrupted</h3>
            <p className="text-xs text-rose-600/80 max-w-sm mx-auto">{error}</p>
            <button 
              onClick={fetchUsers} 
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-none"
            >
              Refresh Endpoint
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                    <th className="p-3 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={paginatedUsers.length > 0 && selectedUserIds.size === paginatedUsers.length}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 accent-[#2b825a] hover:accent-[#1f6041] bg-slate-100 text-[#2b825a] border-slate-300 focus:ring-0 rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Security Clearance User</th>
                    <th className="p-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Hierarchy Level</th>
                    <th className="p-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 w-44">Change Role</th>
                    <th className="p-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Account status</th>
                    <th className="p-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Latest Session pulse</th>
                    <th className="p-3 text-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400 w-36">Command Keys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {paginatedUsers.map((user) => {
                      const isSelected = selectedUser?.id === user.id;
                      const hasSession = user.last_sign_in_at !== null;
                      
                      return (
                        <motion.tr 
                          key={user.id}
                          layout="position"
                          onClick={() => setSelectedUser(user)}
                          className={`hover:bg-slate-50/65 text-xs font-semibold select-none cursor-pointer transition-colors duration-100 ${
                            isSelected ? 'bg-slate-100/60 font-bold border-l-2' : ''
                          }`}
                          style={{ borderLeftColor: isSelected ? theme.accentHex : undefined }}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedUserIds.has(user.id)}
                              onChange={(e) => toggleSelectUser(user.id, e as any)}
                              className="w-3.5 h-3.5 accent-[#2b825a] hover:accent-[#1f6041] rounded bg-slate-100 border-slate-300 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getGradientAvatar(user.email)} flex items-center justify-center text-[10px] font-bold shadow-sm`}>
                                {getInitials(user.full_name, user.email)}
                              </div>
                              <div>
                                <p className="text-slate-900 font-bold leading-none">{user.full_name || 'System Administrator'}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded text-slate-650">
                              {user.role === 'admin' || user.role === 'super_admin' ? 'Super Admin' : 
                               user.role === 'admin_grant' ? 'Admin Grant' :
                               user.role === 'staff' ? 'Admin' : 
                               user.role === 'add_records' ? 'Add Records' : 
                               user.role === 'view_only' || user.role === 'viewer' || user.role === 'airport_viewer' ? 'View Only' :
                               user.role === 'airport_staff' ? 'Airport Hub' : 'Member Officer'}
                            </span>
                          </td>
                          <td className="p-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block w-full max-w-[155px]">
                              <select
                                value={user.role || ''}
                                disabled={inlineLoadingUserId === user.id}
                                onChange={(e) => handleInlineUpdateRole(user, e.target.value as UserRole)}
                                className="w-full text-[10px] font-bold py-1 pl-2 pr-6 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md text-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 hover:bg-slate-100/60 transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed font-sans uppercase tracking-wider outline-none appearance-none"
                              >
                                <option value="super_admin">Super Admin</option>
                                <option value="admin">Admin</option>
                                <option value="admin_grant">Admin Grant</option>
                                <option value="add_records">Add Records</option>
                                <option value="view_only">View Only</option>
                                <option value="airport_staff">Airport Hub</option>
                                <option value="airport_viewer">Airport Viewer</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
                                {inlineLoadingUserId === user.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 rotate-90" />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {hasSession ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-150 text-[#1b8b58] rounded-full text-[9px] font-bold tracking-wide uppercase">
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.activeIndicator} animate-pulse`} />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 border border-slate-150 text-slate-500 rounded-full text-[9px] font-medium tracking-wide uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Dormant
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] font-medium">
                            {getRelativeActiveTime(user.last_sign_in_at)}
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit permissions / modules keys button */}
                              <button 
                                onClick={() => { setModifyingModulesUser(user); setSelectedModules(user.modules || []); setStatus(null); }}
                                title="Edit Division Clearance Scopes"
                                className={`p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-all border-none outline-none cursor-pointer hover:scale-105`}
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Override key / passcode action */}
                              <button 
                                onClick={() => { setResettingUser(user); setStatus(null); }}
                                title="Reset User Password"
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-md transition-all border border-amber-200/40 outline-none cursor-pointer hover:scale-105"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Permanent Terminate user profile */}
                              <button 
                                onClick={() => { setDeletingUser(user); setStatus(null); }}
                                title="Decommission Account From Security Directory"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/40 text-rose-500 rounded-md transition-all outline-none cursor-pointer hover:scale-105"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Search className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No matching system registries verified</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination widgets */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Index {filteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} records verified
              </p>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 flex items-center gap-1 select-none text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed outline-none cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Prev
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all outline-none border-none cursor-pointer ${
                        currentPage === i + 1 
                          ? `${theme.primary} shadow-sm` 
                          : 'text-slate-500 hover:bg-slate-100 bg-transparent'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 flex items-center gap-1 select-none text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed outline-none cursor-pointer transition-colors"
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Clearance Levels Authorization Matrix
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Establish and configure authorized roles across dynamic system modules. Updates govern read/write operations.
                </p>
              </div>
              <button
                onClick={handleSaveMatrixRules}
                disabled={savingRules}
                type="button"
                className={`px-4 py-2 ${theme.primary} text-[11px] font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all outline-none border-none cursor-pointer disabled:opacity-55`}
              >
                {savingRules ? (
                  <>
                    <Loader2 className="w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    Save Matrix Keys
                  </>
                )}
              </button>
            </div>

            {matrixStatus && (
              <div className={`p-3 text-[11px] font-bold rounded-lg flex items-center gap-2 border transition-all ${
                matrixStatus.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                  : 'bg-rose-50 border-rose-150 text-rose-800'
              }`}>
                {matrixStatus.type === 'success' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                {matrixStatus.message}
              </div>
            )}

            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
                    <th className="p-3 w-40">System Module</th>
                    <th className="p-3">View Clearance (GET)</th>
                    <th className="p-3">Create Clearance (POST)</th>
                    <th className="p-3">Update/Delete Clearance (PATCH/DELETE)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissionRules.map((rule, idx) => {
                    const roles = [
                      { id: 'super_admin', label: 'Super Admin', defaultAlways: true },
                      { id: 'admin', label: 'Admin' },
                      { id: 'add_records', label: 'Add Records' },
                      { id: 'view_only', label: 'View Only' },
                      { id: 'airport_staff', label: 'Airport Hub' }
                    ];

                    const toggleRole = (type: 'view' | 'create' | 'update', roleId: string) => {
                      const updatedRules = permissionRules.map((r, rIdx) => {
                        if (rIdx === idx) {
                          const fields = {
                            view: 'view_roles',
                            create: 'create_roles',
                            update: 'update_roles'
                          } as const;
                          const field = fields[type];
                          const alreadyHas = r[field].includes(roleId);
                          return {
                            ...r,
                            [field]: alreadyHas 
                              ? r[field].filter(val => val !== roleId)
                              : [...r[field], roleId]
                          };
                        }
                        return r;
                      });
                      setPermissionRules(updatedRules);
                    };

                    return (
                      <tr key={rule.module} className="hover:bg-slate-50/20 transition-colors text-xs font-semibold">
                        <td className="p-3 align-top">
                          <span className="font-bold text-slate-950 border-l-2 border-emerald-500 pl-2">
                            {rule.module}
                          </span>
                          <div className="text-[9px] text-slate-400 mt-0.5 font-medium font-mono">Bole general clearance</div>
                        </td>

                        {/* VIEW CELL */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {roles.map(r => {
                              const isChecked = r.defaultAlways || rule.view_roles.includes(r.id);
                              return (
                                <label key={r.id} className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 hover:text-slate-950">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={r.defaultAlways}
                                    onChange={() => toggleRole('view', r.id)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3 h-3 cursor-pointer"
                                  />
                                  <span className={r.defaultAlways ? "text-slate-450 text-[10px] font-bold" : "text-[10px]"}>
                                    {r.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </td>

                        {/* CREATE CELL */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {roles.map(r => {
                              const isChecked = r.defaultAlways || rule.create_roles.includes(r.id);
                              return (
                                <label key={r.id} className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 hover:text-slate-950">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={r.defaultAlways}
                                    onChange={() => toggleRole('create', r.id)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3 h-3 cursor-pointer"
                                  />
                                  <span className={r.defaultAlways ? "text-slate-450 text-[10px] font-bold" : "text-[10px]"}>
                                    {r.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </td>

                        {/* UPDATE CELL */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1 font-mono">
                            {roles.map(r => {
                              const isChecked = r.defaultAlways || rule.update_roles.includes(r.id);
                              return (
                                <label key={r.id} className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 hover:text-slate-950 font-sans">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={r.defaultAlways}
                                    onChange={() => toggleRole('update', r.id)}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3 h-3 cursor-pointer"
                                  />
                                  <span className={r.defaultAlways ? "text-slate-450 text-[10px] font-bold animate-pulse" : "text-[10px]"}>
                                    {r.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT AREA: MINI USER PROFILE COMPACT DETAILS PANE */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="sticky top-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Officer Profile Inspector</h2>
          </div>

          {selectedUser ? (
            <div className="space-y-5 text-center lg:text-left">
              <div className="relative flex flex-col items-center py-2 border-b border-slate-100/70 pb-4">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-tr ${getGradientAvatar(selectedUser.email)} flex items-center justify-center text-xl font-bold shadow-md border-2 border-white`}>
                    {getInitials(selectedUser.full_name, selectedUser.email)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-5 h-5 ${theme.activeIndicator} rounded-full border-2 border-white flex items-center justify-center`}>
                    <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 tracking-tight mt-3 text-center leading-normal mb-0.5">{selectedUser.full_name || 'Immigration Agent'}</h3>
                <p className="text-[11px] font-semibold text-slate-400 text-center select-all">{selectedUser.email}</p>
              </div>

              {/* Attributes metrics */}
              <div className="space-y-4 text-left">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Clearance Tier Level</span>
                    <button 
                      onClick={() => { setModifyingRoleUser(selectedUser); setSelectedRole(selectedUser.role); }}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-bold rounded cursor-pointer transition-colors"
                    >
                      override
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1 uppercase tracking-wide">
                    {selectedUser.role === 'admin' || selectedUser.role === 'super_admin' ? 'Super Admin' : 
                     selectedUser.role === 'admin_grant' ? 'Admin Grant' :
                     selectedUser.role === 'staff' ? 'Admin' : 
                     selectedUser.role === 'add_records' ? 'Add Records' : 
                     selectedUser.role === 'view_only' || selectedUser.role === 'viewer' || selectedUser.role === 'airport_viewer' ? 'View Only' :
                     selectedUser.role === 'airport_staff' ? 'Airport Hub Staff' : 'Member Officer'}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Clearance status</span>
                  <p className="text-[11px] font-bold text-[#1b8b58] mt-1 uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${theme.activeIndicator} animate-pulse`} />
                    Verified Clearance
                  </p>
                </div>

                {/* Division Scopes Checklist visualization */}
                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Accessible Division Portals</span>
                  
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {[
                      { id: 'OVERVIEW', label: 'Command Deck' },
                      { id: 'USERS', label: 'Credential Registry' },
                      { id: 'REPORTS', label: 'Intel Analytics' },
                      { id: 'VISA', label: 'VISA Division' },
                      { id: 'EOID', label: 'EOID Division' },
                      { id: 'Residence ID', label: 'Residence Bureau' },
                      { id: 'ETD', label: 'Emergency Travels' },
                      { id: 'CABINETS', label: 'Physical Cabinets' },
                      { id: 'AIRPORT', label: 'Airport Gateway' },
                      { id: 'Yellow Card', label: 'Yellow Card division' },
                      { id: 'AUDIT', label: 'Immutable Logs' }
                    ].map((m) => {
                      const isCleared = selectedUser.role === 'admin' || selectedUser.role === 'super_admin' || selectedUser.role === 'admin_grant' || (selectedUser.modules || []).includes(m.id);
                      return (
                        <div key={m.id} className="flex items-center justify-between text-[11px] font-bold py-0.5 border-b border-slate-50">
                          <span className={isCleared ? 'text-slate-700' : 'text-slate-350'}>{m.label}</span>
                          <span className={isCleared ? theme.primaryText : 'text-slate-300'}>
                            {isCleared ? '✓ Cleared' : '✗ Blocked'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => { setModifyingModulesUser(selectedUser); setSelectedModules(selectedUser.modules || []); }}
                  className={`w-full mt-2 py-2 border text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-250 text-xs font-bold uppercase tracking-wider rounded-lg transition-all outline-none cursor-pointer text-center select-none`}
                >
                  Edit Division Access
                </button>
              </div>
            </div>
          ) : (
            <div className="py-14 text-center space-y-2.5">
              <User className="w-10 h-10 text-slate-300 mx-auto animate-pulse" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Highlight an officer profile file to verify
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: SYSTEM MODULE ACCESS MODIFIER POPUP */}
      <AnimatePresence>
        {modifyingModulesUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 p-6 max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl rounded-2xl text-slate-800"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 bg-slate-100 text-slate-700 rounded-lg`}>
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Custom Division Access Matrix</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure precise portal reach profiles</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModifyingModulesUser(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent outline-none cursor-pointer"
                >
                  <X className="w-4.5 h-4.5 text-slate-400" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold mb-4 text-slate-650 flex items-center justify-between">
                <span>Subject Account: <strong className="font-mono text-slate-850">{modifyingModulesUser.email}</strong></span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Security Override</span>
              </div>

              <div className="overflow-y-auto pr-1 space-y-3.5 flex-1 scrollbar-thin">
                <div className="space-y-3">
                  {[
                    { id: 'OVERVIEW', label: 'Command Deck', desc: 'Active system visualizers, reports, & dashboards', icon: LayoutDashboard },
                    { id: 'USERS', label: 'Credential matrix', desc: 'Secure database profiles and security keys control', icon: Users },
                    { id: 'REPORTS', label: 'Intelligence Reports', desc: 'Custom statistical graphing and document reporting', icon: FileText },
                    { id: 'VISA', label: 'VISA Division Desk', desc: 'Official permanent / temporary visa document registries', icon: Globe },
                    { id: 'EOID', label: 'EOID Portals Desk', desc: 'Special security clearance borders controls', icon: Fingerprint },
                    { id: 'Residence ID', label: 'Residence verification', desc: 'National ID, status, and residence registries', icon: Shield },
                    { id: 'ETD', label: 'Emergency travels', desc: 'Local Emergency Document check system', icon: AlertTriangle },
                    { id: 'CABINETS', label: 'Physical Cabinets', desc: 'Geographical physical paper filing system metadata', icon: Archive },
                    { id: 'AIRPORT', label: 'Bole Airport controls', desc: 'Check gate operations, arrivals and flight records', icon: Plane },
                    { id: 'Yellow Card', label: 'Yellow Card division', desc: 'Yellow Fever immunization registry profiles', icon: Activity },
                    { id: 'AUDIT', label: 'Immutable security log', desc: 'Black-box tracking audit log monitor', icon: History }
                  ].map((module) => {
                    const isSelected = selectedModules.includes(module.id);
                    const perms = localSubPerms[module.id] || { list: false, show: false, edit: false };

                    return (
                      <div 
                        key={module.id} 
                        className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all gap-4 ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-50/20 shadow-xs' 
                            : 'border-slate-150 bg-slate-50/30 hover:bg-slate-50'
                        }`}
                      >
                        {/* Left Column: Toggle + Icon + Labels */}
                        <div className="flex items-center gap-3 shrink-0 min-w-[240px]">
                          {/* IOS Styled Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextState = !perms.list;
                              const updated = {
                                ...localSubPerms,
                                [module.id]: {
                                  list: nextState,
                                  show: nextState,
                                  edit: nextState && modifyingModulesUser?.role !== 'view_only' && modifyingModulesUser?.role !== 'viewer'
                                }
                              };
                              setLocalSubPerms(updated);
                              const active = Object.keys(updated).filter(key => updated[key].list);
                              setSelectedModules(active);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isSelected ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isSelected ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* Icon Accent and Text Details */}
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-100 text-emerald-850' : 'bg-slate-100 text-slate-400'}`}>
                              <module.icon className="w-4 h-4 shrink-0" />
                            </div>
                            <div className="text-left leading-none">
                              <span className={`block text-xs font-extrabold uppercase tracking-tight ${isSelected ? 'text-emerald-950' : 'text-slate-650'}`}>
                                {module.label}
                              </span>
                              <span className="text-[10px] text-slate-450 mt-1.5 block leading-tight">{module.desc}</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle Column: List, Show, Edit Permissions Checklist */}
                        <div className="flex items-center gap-5 sm:gap-6 md:justify-center flex-1">
                          {/* List clearance checkbox */}
                          <label className={`flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold ${isSelected ? 'text-slate-700' : 'text-slate-450 opacity-60'}`}>
                            <input
                              type="checkbox"
                              checked={perms.list}
                              disabled={!isSelected}
                              onChange={() => {
                                const updated = {
                                  ...localSubPerms,
                                  [module.id]: {
                                    ...perms,
                                    list: !perms.list,
                                    show: !perms.list ? perms.show : false,
                                    edit: !perms.list ? perms.edit : false
                                  }
                                };
                                setLocalSubPerms(updated);
                                const active = Object.keys(updated).filter(key => updated[key].list);
                                setSelectedModules(active);
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3.5 h-3.5 cursor-pointer accent-emerald-650"
                            />
                            <span className="flex items-center gap-1 font-sans">
                              <CheckCircle className={`w-3.5 h-3.5 ${perms.list ? 'text-emerald-600' : 'text-slate-400'}`} />
                              List
                            </span>
                          </label>

                          {/* Show clearance checkbox */}
                          <label className={`flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold ${isSelected ? 'text-slate-700' : 'text-slate-450 opacity-60'}`}>
                            <input
                              type="checkbox"
                              checked={perms.show}
                              disabled={!isSelected}
                              onChange={() => {
                                const updated = {
                                  ...localSubPerms,
                                  [module.id]: {
                                    ...perms,
                                    show: !perms.show,
                                    list: true
                                  }
                                };
                                setLocalSubPerms(updated);
                                const active = Object.keys(updated).filter(key => updated[key].list);
                                setSelectedModules(active);
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3.5 h-3.5 cursor-pointer accent-emerald-650"
                            />
                            <span className="flex items-center gap-1 font-sans">
                              <CheckCircle className={`w-3.5 h-3.5 ${perms.show ? 'text-emerald-600' : 'text-slate-400'}`} />
                              Show
                            </span>
                          </label>

                          {/* Edit clearance checkbox */}
                          <label className={`flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold ${isSelected ? 'text-slate-700' : 'text-slate-450 opacity-60'}`}>
                            <input
                              type="checkbox"
                              checked={perms.edit}
                              disabled={!isSelected}
                              onChange={() => {
                                const updated = {
                                  ...localSubPerms,
                                  [module.id]: {
                                    ...perms,
                                    edit: !perms.edit,
                                    list: true
                                  }
                                };
                                setLocalSubPerms(updated);
                                const active = Object.keys(updated).filter(key => updated[key].list);
                                setSelectedModules(active);
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3.5 h-3.5 cursor-pointer accent-emerald-650"
                            />
                            <span className="flex items-center gap-1 font-sans">
                              <CheckCircle className={`w-3.5 h-3.5 ${perms.edit ? 'text-emerald-600' : 'text-slate-400'}`} />
                              Edit
                            </span>
                          </label>
                        </div>

                        {/* Right Column: Custom orange Edit & green Create buttons */}
                        <div className="flex items-center gap-2 justify-end shrink-0">
                          {/* Orange Edit Button */}
                          <button
                            type="button"
                            title="Toggle custom Edit capability"
                            onClick={() => {
                              const updated = {
                                ...localSubPerms,
                                [module.id]: {
                                  ...perms,
                                  list: true,
                                  edit: !perms.edit
                                }
                              };
                              setLocalSubPerms(updated);
                              const active = Object.keys(updated).filter(key => updated[key].list);
                              setSelectedModules(active);
                            }}
                            className="px-3 py-1.5 bg-[#f57c00] hover:bg-[#e65100] text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md shadow-xs active:scale-95 transition-all outline-none border-none cursor-pointer flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3 stroke-[2.5]" />
                            Edit
                          </button>

                          {/* Green Create Button */}
                          <button
                            type="button"
                            title="Enable full active clearance permissions"
                            onClick={() => {
                              const updated = {
                                ...localSubPerms,
                                [module.id]: {
                                  list: true,
                                  show: true,
                                  edit: true
                                }
                              };
                              setLocalSubPerms(updated);
                              const active = Object.keys(updated).filter(key => updated[key].list);
                              setSelectedModules(active);
                            }}
                            className="px-3 py-1.5 bg-[#2e7d32] hover:bg-[#1b5e20] text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md shadow-xs active:scale-95 transition-all outline-none border-none cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Create
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold border ${
                        status.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      <p className="uppercase tracking-wider">{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button 
                  onClick={() => setModifyingModulesUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer outline-none"
                >
                  Discard
                </button>
                <button 
                  onClick={handleUpdateModules}
                  disabled={actionLoading}
                  className={`flex-[2] py-2 ${theme.primary} font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow-sm outline-none border-none flex items-center justify-center gap-1.5`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <>
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Commit Clearance
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: SYSTEM USER PROVISION FORM POPUP */}
      <AnimatePresence>
        {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 p-6 max-w-xl w-full flex flex-col max-h-[90vh] shadow-2xl rounded-2xl text-slate-800"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Provision Entry Profile</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Initialize designated security keys</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddingUser(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent outline-none cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wildest block">Secure Email ID</label>
                    <input 
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="agent@immigration.gov"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-450 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wildest block">Officer Full Name</label>
                    <input 
                      type="text"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="e.g. Almaz Bekele"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-450 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wildest block">Root Clearance Entry Key</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Alphanumeric, minimum 6 parameters"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-450 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wildest block">Clearance Designation level</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'super_admin', label: 'Super Admin', desc: 'Sovereign administrative directory bypass access' },
                      { id: 'admin', label: 'Administrative Admin', desc: 'High-level secure management and configuration tools' },
                      { id: 'admin_grant', label: 'Admin Grant', desc: 'Authorized to assign user roles and manage general accounts' },
                      { id: 'add_records', label: 'Add Records Specialist', desc: 'Register new items, insert records, and attach files' },
                      { id: 'view_only', label: 'View Only Auditor', desc: 'Lookup-only view permission, passive directory observations' },
                      { id: 'airport_staff', label: 'Airport Gateway Officer', desc: 'Airport checkpoint hub processing level' },
                      { id: 'airport_viewer', label: 'Airport Gateway Viewer', desc: 'Gateway document observation (read-only)' },
                    ].map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-0.5 cursor-pointer outline-none ${
                          selectedRole === role.id 
                            ? 'border-emerald-500 bg-emerald-50/45' 
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`font-bold text-xs uppercase ${selectedRole === role.id ? 'text-emerald-850' : 'text-slate-700'}`}>
                            {role.label}
                          </span>
                          {selectedRole === role.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <p className="text-[9px] text-slate-450 leading-normal font-medium">{role.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold border ${
                        status.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-850 border-emerald-200' 
                          : 'bg-rose-50 text-rose-850 border-rose-200'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      <p className="uppercase tracking-wider">{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button 
                  onClick={() => setIsAddingUser(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer outline-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateUser}
                  disabled={actionLoading || !newUserEmail || !newPassword}
                  className={`flex-[2] py-2 ${theme.primary} disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow-sm outline-none border-none flex items-center justify-center gap-1.5`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-white" />
                      Provision Account
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DESIGNATED ACCESS ROLE ELEVATOR POPUP */}
      <AnimatePresence>
        {modifyingRoleUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 p-6 max-w-xl w-full flex flex-col max-h-[90vh] shadow-2xl rounded-2xl text-slate-800"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Clearance Tier Designation</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure officer authorization profile</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModifyingRoleUser(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent outline-none cursor-pointer"
                >
                  <X className="w-4.5 h-4.5 text-slate-400" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold mb-4 text-slate-650">
                Updating role level for: <strong className="font-mono text-slate-850">{modifyingRoleUser.email}</strong>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'super_admin', label: 'Super Admin', desc: 'Complete access to records, security matrix, & audit trails' },
                    { id: 'admin', label: 'Admin', desc: 'Secure manager controls and matrix editing permissions' },
                    { id: 'admin_grant', label: 'Admin Grant', desc: 'Authorized to manage users, assign server-authoritative roles, & configure directories' },
                    { id: 'add_records', label: 'Add Records', desc: 'Register entries, database insertions, and document uploads' },
                    { id: 'view_only', label: 'View Only', desc: 'Restricted lookup-only file viewing authorization' },
                    { id: 'airport_staff', label: 'Airport Hub Staff', desc: 'Bole international gateway checkpoints access' },
                    { id: 'airport_viewer', label: 'Airport Hub Viewer', desc: 'Bole international checkpoints view-only reading credentials' }
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-0.5 cursor-pointer outline-none ${
                        selectedRole === role.id 
                          ? 'border-emerald-500 bg-emerald-50/45' 
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-bold text-xs uppercase ${selectedRole === role.id ? 'text-emerald-850' : 'text-slate-700'}`}>
                          {role.label}
                        </span>
                        {selectedRole === role.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <p className="text-[10px] text-slate-450 leading-normal font-medium">{role.desc}</p>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold border ${
                        status.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-850 border-emerald-200' 
                          : 'bg-rose-50 text-rose-850 border-rose-200'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      <p className="uppercase tracking-wider">{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-4">
                <button 
                  onClick={() => setModifyingRoleUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer outline-none"
                >
                  Discard
                </button>
                <button 
                  onClick={handleUpdateRole}
                  disabled={actionLoading}
                  className={`flex-[2] py-2 ${theme.primary} font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow-sm outline-none border-none flex items-center justify-center gap-1.5`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      Commit Clearance Level
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: SUBJECT PASSWORD OVERWRITE ACTION POPUP */}
      <AnimatePresence>
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 p-6 max-w-md w-full flex flex-col shadow-2xl rounded-2xl space-y-5 text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Credential Key Overwrite</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Override designated authorization password</p>
                  </div>
                </div>
                <button 
                  onClick={() => setResettingUser(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent outline-none cursor-pointer"
                >
                  <X className="w-4.5 h-4.5 text-slate-400" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-xs font-semibold text-amber-800">
                Rewriting encryption key coordinates for: <strong className="font-mono text-amber-950">{resettingUser.email}</strong>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wildest block">New Security Key Parameter</label>
                  <input 
                    type="password"
                    autoFocus
                    placeholder="Min 6 alphanumeric parameters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500/30 transition-all focus:border-amber-500 text-center tracking-widest font-mono"
                  />
                </div>

                <AnimatePresence>
                  {status && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold border ${
                        status.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-850 border-emerald-200' 
                          : 'bg-rose-50 text-rose-850 border-rose-200'
                      }`}
                    >
                      {status.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      <p className="uppercase tracking-wider">{status.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  onClick={() => setResettingUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer outline-none"
                >
                  Abort
                </button>
                <button 
                  onClick={handleResetPassword}
                  disabled={actionLoading || !newPassword}
                  className="flex-[2] py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow-md outline-none border-none flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5 text-white" />
                      Commit Credentials
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: REAL ADMINISTRATIVE PERMANENT USER DELETE POPUP */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white border border-slate-200 p-6 max-w-md w-full flex flex-col shadow-2xl rounded-2xl space-y-5 text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <AlertTriangle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-800">Decommission Auth Identity</h3>
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Irreversible security clearance revoke</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDeletingUser(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent outline-none cursor-pointer"
                >
                  <X className="w-4.5 h-4.5 text-slate-400" />
                </button>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs space-y-2">
                <p className="text-rose-800 font-bold leading-relaxed">
                  CRITICAL PROTOCOL WARNING:
                </p>
                <p className="text-rose-700 leading-relaxed font-semibold">
                  You are about to permanently decommission and delete the security credentials for user: <strong className="font-mono text-slate-900 select-all underline">{deletingUser.email}</strong>.
                </p>
                <p className="text-rose-600/95 leading-normal text-[11px] font-medium">
                  This action is fully irreversible and will instantly purge their profile records from Supabase authentication servers and terminate active web tokens.
                </p>
              </div>

              <AnimatePresence>
                {status && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold border ${
                      status.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-850 border-emerald-200' 
                        : 'bg-rose-50 text-rose-850 border-rose-200'
                    }`}
                  >
                    {status.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    <p className="uppercase tracking-wider">{status.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2.5 pt-2">
                <button 
                  onClick={() => setDeletingUser(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer outline-none"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  className="flex-[2] py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer shadow-md outline-none border-none flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                      Terminate Gateway Access
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
