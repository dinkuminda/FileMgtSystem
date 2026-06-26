import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Loader2, 
  Search, 
  AlertCircle, 
  Plus, 
  X, 
  Users, 
  Pencil, 
  Trash2, 
  ShieldCheck,
  Check,
  Save,
  RefreshCw,
  Eye,
  Settings,
  Lock,
  EyeOff,
  UserCheck,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, type UserProfile, mapDbRoleToFrontend, mapFrontendRoleToDb } from '../lib/supabase';
import { 
  getPermissionRules, 
  savePermissionRules, 
  type ModulePermissionRule 
} from '../lib/permissions';
import AuditLogView from './AuditLogView';

// ==========================================
// TYPES & INTERFACES
// ==========================================
// Defensive helper to parse response body as JSON without crashing if it returns HTML or text
const safeParseJson = async (response: Response): Promise<any> => {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    const text = await response.text();
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const snippet = cleanText.length > 120 ? cleanText.slice(0, 120) + '...' : cleanText;
    return { error: snippet || `HTTP Error ${response.status}: ${response.statusText || 'Unreadable response'}` };
  } catch (err) {
    return { error: `Network issue: failed to decode response (Status ${response.status})` };
  }
};

interface AdminUser {
  id: string;
  email: string;
  last_sign_in_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  full_name: string | null;
  role: string;
  modules: string[];
  is_locked?: boolean;
  failed_attempts?: number;
}

const ALL_MODULES = [
  { id: 'OVERVIEW', name: 'Overview' },
  { id: 'USERS', name: 'User Management' },
  { id: 'REPORTS', name: 'Global Reporting' },
  { id: 'AUDIT', name: 'System Logs Vault' },
  { id: 'VISA', name: 'Visa Records' },
  { id: 'EOID', name: 'EOID Registries' },
  { id: 'EOID Under_Age', name: 'EOID Minor Registries' },
  { id: 'Residence ID', name: 'Residence ID Cards' },
  { id: 'ETD', name: 'Emergency Travels' },
   { id: 'Yellow Card', name: 'Yellow Cards' },
  { id: 'Alien Passport', name: 'Alien Passport' },
  { id: 'Eritrean ID', name: 'Eritrean IDs' }
];

// ==========================================
// SUB-COMPONENT: TEAM DIRECTORY
// ==========================================
interface TeamDirectoryProps {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onUnlock: (user: AdminUser) => void;
  currentUserProfile: UserProfile | null;
}

function TeamDirectory({ users, onEdit, onDelete, onUnlock, currentUserProfile }: TeamDirectoryProps) {
  const getRoleLabel = (role: string) => {
    const frontendRole = mapDbRoleToFrontend(role);
    switch (frontendRole) {
      case 'Super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'Supervisor':
        return 'Supervisor';
      case 'Editor':
        return 'Editor';
      case 'Viewer':
        return 'Viewer';
      default:
        return frontendRole;
    }
  };

  const getRoleStyle = (role: string) => {
    const frontendRole = mapDbRoleToFrontend(role);
    switch (frontendRole) {
      case 'Super_admin':
        return 'bg-[#FDF2F2] text-[#EF4444] border border-[#FEE2E2]'; // Light Red
      case 'admin':
        return 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'; // Amber
      case 'Supervisor':
        return 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'; // Light Blue
      case 'Editor':
        return 'bg-[#ECFDF5] text-[#059669] border border-[#D1FAE5]'; // Emerald
      case 'Viewer':
      default:
        return 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'; // Light Gray
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[11px] font-bold tracking-wider text-[#94A3B8] uppercase border-b border-gray-100">
            <th className="py-4 px-6 font-semibold">Full Name</th>
            <th className="py-4 px-6 font-semibold">Email</th>
            <th className="py-4 px-6 font-semibold">System Role</th>
            <th className="py-4 px-6 font-semibold">Credentials Status</th>
            <th className="py-4 px-6 font-semibold">Created Date</th>
            <th className="py-4 px-6 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-sm">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
              {/* Full Name */}
              <td className="py-4 px-6 font-bold text-[#1E293B] capitalize">
                <div className="flex flex-col">
                  <span>{user.full_name || 'Anonymous User'}</span>
                  {currentUserProfile?.id === user.id && (
                    <span className="text-[#00966D] font-normal text-xs normal-case"> (You)</span>
                  )}
                </div>
              </td>
              
              {/* Email */}
              <td className="py-4 px-6 text-[#334155] font-normal">{user.email}</td>
              
              {/* System Role Badge */}
              <td className="py-4 px-6">
                <div className="flex flex-col gap-1 items-start">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide border rounded-[4px] uppercase ${getRoleStyle(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                  {user.is_locked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 rounded uppercase tracking-wider">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </div>
              </td>
              
              {/* Encrypted Password Placeholder */}
              <td className="py-4 px-6 text-slate-400 font-mono text-xs tracking-widest">
                {user.is_locked ? (
                  <div className="flex items-center gap-1.5 text-rose-500 font-sans text-xs font-bold uppercase tracking-normal">
                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Locked ({user.failed_attempts || 3} Failures)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[#94A3B8]">
                    <Key className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>••••••••••••</span>
                    {user.failed_attempts !== undefined && user.failed_attempts > 0 ? (
                      <span className="text-[10px] text-amber-500 font-sans tracking-normal font-semibold normal-case">({user.failed_attempts}/3 fails)</span>
                    ) : null}
                  </div>
                )}
              </td>
              
              {/* Created Date */}
              <td className="py-4 px-6 text-[#64748B] font-normal">
                {formatDate(user.created_at)}
              </td>
              
              {/* Action Buttons */}
              <td className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-2">
                  {user.is_locked && (
                    <button 
                      onClick={() => onUnlock(user)}
                      className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-all border border-emerald-100 shadow-2xs"
                      title="Unlock staff credentials"
                    >
                      <UserCheck className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                  <button 
                    onClick={() => onEdit(user)}
                    className="p-2 text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-all border border-[#DBEAFE] shadow-2xs"
                    title="Edit roles and clearance modules"
                  >
                    <Pencil className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button 
                    onClick={() => onDelete(user)}
                    disabled={currentUserProfile?.id === user.id}
                    className={`p-2 rounded-md border transition-all shadow-2xs ${
                      currentUserProfile?.id === user.id 
                        ? 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed' 
                        : 'text-[#EF4444] bg-[#FDF2F2] hover:bg-[#FEE2E2] border-[#FEE2E2]'
                    }`}
                    title={currentUserProfile?.id === user.id ? "Cannot delete own active profile" : "Purge staff account"}
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                No active staff matching query specifications located.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: PERMISSIONS MATRIX
// ==========================================
interface PermissionsMatrixProps {
  rules: ModulePermissionRule[];
  onSave: (rules: ModulePermissionRule[]) => Promise<void>;
  loading: boolean;
}

function PermissionsMatrix({ rules, onSave, loading }: PermissionsMatrixProps) {
  const [localRules, setLocalRules] = useState<ModulePermissionRule[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalRules(rules);
    setDirty(false);
  }, [rules]);

  const ROLES = [
  { id: 'admin', label: 'Super Admin' },
  { id: 'staff', label: 'Supervisor' },
  { id: 'editor', label: 'Editor' },
  { id: 'viewer', label: 'Viewer' }
];

  const toggleVal = (moduleKey: string, roleId: string, type: 'view' | 'create' | 'update') => {
    const next = localRules.map(r => {
      if (r.module === moduleKey) {
        const arrName = type === 'view' ? 'view_roles' : type === 'create' ? 'create_roles' : 'update_roles';
        const currentArr = r[arrName] || [];
        const updatedArr = currentArr.includes(roleId)
          ? currentArr.filter(x => x !== roleId)
          : [...currentArr, roleId];
        return {
          ...r,
          [arrName]: updatedArr
        };
      }
      return r;
    });
    setLocalRules(next);
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(localRules);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00966D] animate-spin mb-3" />
        <p className="text-gray-400 text-xs">Synchronizing clearance rules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200/60 p-4 rounded-2xl gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#00966D] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Global Role Permissions Matrix</h4>
            <p className="text-xs text-slate-500 mt-0.5">Configure which system roles have clearance to View, Create, or Edit each document module.</p>
          </div>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#00966D] hover:bg-[#00825E] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition-all self-end sm:self-auto disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Apply Matrix Layout
          </button>
        )}
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <th className="py-4 px-6 min-w-[200px]">Document Module</th>
              {ROLES.map(({ id, label }) => (
                <th key={id} className="py-4 px-6 text-center">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {localRules.map((rule) => (
              <tr key={rule.module} className="hover:bg-slate-50/30 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">{rule.module}</td>
                {ROLES.map((role) => {
                  const hasView = (rule.view_roles || []).includes(role.id);
                  const hasCreate = (rule.create_roles || []).includes(role.id);
                  const hasUpdate = (rule.update_roles || []).includes(role.id);
                  const isRoleAdmin = role.id === 'admin';

                  return (
                    <td key={role.id} className="py-4 px-6">
                      <div className="flex flex-col items-center justify-center gap-2 min-w-[120px]">
                        {/* View Checkbox */}
                        <label className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
                          hasView || isRoleAdmin ? 'bg-emerald-50/50 border border-emerald-100/50' : 'hover:bg-slate-100/40 border border-transparent'
                        }`}>
                          <input
                            type="checkbox"
                            checked={hasView || isRoleAdmin}
                            disabled={isRoleAdmin}
                            onChange={() => toggleVal(rule.module, role.id, 'view')}
                            className="rounded text-[#00966D] focus:ring-[#00966D]/25 w-3 h-3 cursor-pointer"
                          />
                          <span className={`text-[10px] font-semibold ${hasView || isRoleAdmin ? 'text-[#00966D]' : 'text-slate-400'}`}>View</span>
                        </label>
                        {/* Create Checkbox */}
                        <label className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
                          hasCreate || isRoleAdmin ? 'bg-[#EFF6FF] border border-[#DBEAFE]' : 'hover:bg-slate-100/40 border border-transparent'
                        }`}>
                          <input
                            type="checkbox"
                            checked={hasCreate || isRoleAdmin}
                            disabled={isRoleAdmin}
                            onChange={() => toggleVal(rule.module, role.id, 'create')}
                            className="rounded text-[#2563EB] focus:ring-[#2563EB]/25 w-3 h-3 cursor-pointer"
                          />
                          <span className={`text-[10px] font-semibold ${hasCreate || isRoleAdmin ? 'text-[#2563EB]' : 'text-slate-400'}`}>Add</span>
                        </label>
                        {/* Update Checkbox */}
                        <label className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
                          hasUpdate || isRoleAdmin ? 'bg-amber-50 border border-amber-100' : 'hover:bg-slate-100/40 border border-transparent'
                        }`}>
                          <input
                            type="checkbox"
                            checked={hasUpdate || isRoleAdmin}
                            disabled={isRoleAdmin}
                            onChange={() => toggleVal(rule.module, role.id, 'update')}
                            className="rounded text-amber-600 focus:ring-amber-500/25 w-3 h-3 cursor-pointer"
                          />
                          <span className={`text-[10px] font-semibold ${hasUpdate || isRoleAdmin ? 'text-amber-600' : 'text-slate-400'}`}>Edit</span>
                        </label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: EDIT CLEARANCE MODAL
// ==========================================
interface EditUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onSave: () => void;
}

function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const getInitialRole = (roleVal: string) => {
    return mapDbRoleToFrontend(roleVal);
  };

  const [role, setRole] = useState(getInitialRole(user.role));
  const [modules, setModules] = useState<string[]>(user.modules || []);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModuleToggle = (modId: string) => {
    if (modules.includes(modId)) {
      setModules(modules.filter(m => m !== modId));
    } else {
      setModules([...modules, modId]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication failure. Re-login required.");
      const token = session.access_token;
      
      // 1. Update role if modified
      if (role !== user.role) {
        const res = await fetch('/api/admin/update-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id, newRole: role })
        });
        if (!res.ok) {
          const d = await safeParseJson(res);
          throw new Error(d.error || "Failed to update role descriptor.");
        }
      }
      
      // 2. Update clear modules
      const resMod = await fetch('/api/admin/update-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id, modules })
      });
      if (!resMod.ok) {
        const d = await safeParseJson(resMod);
        throw new Error(d.error || "Failed to update custom module list.");
      }
      
      // 3. Update password if provided
      if (password.trim()) {
        if (password.length < 6) {
          throw new Error("Credentials override must contain at least 6 characters.");
        }
        const resPass = await fetch('/api/admin/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId: user.id, newPassword: password })
        });
        if (!resPass.ok) {
          const d = await safeParseJson(resPass);
          throw new Error(d.error || "Failed to update password credentials.");
        }
      }
      
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[1.5rem] max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#2b825a]" />
            <h3 className="text-lg font-bold text-slate-900 font-sans tracking-tight">Security Clearance Control</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 py-1 space-y-5 flex-1 text-sm text-slate-600">
          {/* User Meta Info header */}
          <div className="bg-slate-50 p-4 border border-slate-200/50 rounded-xl space-y-1">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Configuring Access For:</div>
            <div className="font-bold text-slate-800 text-sm capitalize">{user.full_name || 'Anonymous User'}</div>
            <div className="text-xs text-slate-500 font-medium font-mono">{user.email}</div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role selector dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              System Clearance Role
            </label>
    <select
  value={role}
  onChange={(e) => setRole(e.target.value)}
  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#00966D]/15 focus:border-[#00966D] transition-all font-medium text-slate-800"
>
  <option value="Super_admin">Super Admin (System Configuration)</option>
  <option value="Supervisor">Supervisor (Approval & Team Management)</option>
  <option value="Editor">Editor (Read + Write/Upload/Edit)</option>
  <option value="Viewer">Viewer (Can ONLY Read/View files)</option>
</select>
          </div>

          {/* Module Clearances checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-750 uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Active System Module Clearance
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setModules(['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'AUDIT', 'Alien Passport', 'Eritrean ID'])}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[6px] text-[9px] font-bold uppercase transition cursor-pointer"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pool = ['USERS', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'AUDIT', 'Alien Passport', 'Eritrean ID'];
                    const randomCount = Math.floor(Math.random() * pool.length) + 1;
                    const shuffled = [...pool].sort(() => 0.5 - Math.random());
                    setModules(['OVERVIEW', ...shuffled.slice(0, randomCount)]);
                  }}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-[6px] text-[9px] font-bold uppercase transition cursor-pointer"
                >
                  Random
                </button>
                <button
                  type="button"
                  onClick={() => setModules([])}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-[6px] text-[9px] font-bold uppercase transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50/40">
              {ALL_MODULES.map((mod) => {
                const checked = modules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => handleModuleToggle(mod.id)}
                    className={`flex items-center text-left px-3 py-2 border rounded-xl transition-all gap-2 ${
                      checked 
                        ? 'bg-white border-[#00966D]/30 shadow-xs text-slate-800' 
                        : 'bg-transparent border-slate-200/50 hover:bg-white text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      checked 
                        ? 'bg-[#00966D] border-[#00966D] text-white' 
                        : 'border-slate-300'
                    }`}>
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold">{mod.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset password panel */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-755 uppercase tracking-wide flex items-center gap-1.5 text-slate-700">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Override Password Credentials
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new 6+ characters pass to override, otherwise leave empty..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#00966D]/15 focus:border-[#00966D] transition-all placeholder:text-slate-400 font-medium font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-slate-100 shrink-0">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-5 py-2 bg-[#00966D] hover:bg-[#00825E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Applying Changes...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Update Credentials</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================
export default function AdminAccessControl({ currentUserProfile, onProfileUpdate }: { currentUserProfile: UserProfile | null, onProfileUpdate?: () => void }) {
  const [activeTab, setActiveTab] = useState<'directory' | 'permissions' | 'audit'>('directory');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissionRules, setPermissionRules] = useState<ModulePermissionRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [rulesLoading, setRulesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create User States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createRole, setCreateRole] = useState('Supervisor');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Edit User States
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Delete Confirm States
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load exact records and permission keys dynamically
  const loadUsersAndRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication session timed out or invalid. Re-login is requested.');
        setLoading(false);
        return;
      }

      // Fetch users from our custom admin server endpoint with self-healing retries during boots/restarts
      let res: Response | null = null;
      let lastError: Error | null = null;
      const maxRetries = 3;
      const retryDelayMs = 1000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          res = await fetch('/api/admin/users', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          const contentType = res?.headers.get('content-type');
          // If 404, or not JSON, might be server booting/proxying. Retry if we have attempts remaining.
          if (!res || res.status === 404 || !contentType || !contentType.includes('application/json')) {
            if (attempt < maxRetries) {
              console.warn(`[API SYNC] Connection attempt ${attempt}/${maxRetries} busy/offline. Retrying in ${retryDelayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelayMs));
              continue;
            }
          }
          break; // Succeeded or exhausted retries
        } catch (fetchErr: any) {
          lastError = fetchErr;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            continue;
          }
        }
      }

      let fetchedUsers: any[] = [];
      let success = false;

      // 1. Attempt to parse Express API response if it responded with JSON
      try {
        if (res) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (res.ok && data.users) {
              fetchedUsers = data.users.map((u: any) => ({
                ...u,
                role: mapDbRoleToFrontend(u.role)
              }));
              success = true;
            } else if (data.error) {
              lastError = new Error(data.error);
            }
          }
        }
      } catch (backendErr: any) {
        console.warn("[API FALLBACK] Backend parse error, trying direct profiles DB query:", backendErr.message);
        lastError = backendErr;
      }

      // 2. Clear-cut Fallback: If backend was offline, returned 404, or threw, query 'profiles' table directly.
      if (!success) {
        console.warn("[API FALLBACK] Backend API unavailable or unauthorized. Reverting to secure direct profiles query fallback...");
        const { data: profiles, error: dbError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, modules, updated_at');

        if (dbError) {
          console.error("[API FALLBACK] Direct profiles database query also failed:", dbError.message);
          throw new Error(
            lastError?.message || 
            `Credential directory sync offline. Backend returned (${res?.status || 'Offline'}) and Supabase query failed: ${dbError.message}.`
          );
        }

        if (profiles) {
          fetchedUsers = profiles.map(p => ({
            id: p.id,
            email: p.email,
            last_sign_in_at: new Date().toISOString(),
            created_at: p.updated_at || new Date().toISOString(),
            confirmed_at: p.updated_at || new Date().toISOString(),
            full_name: p.full_name || p.email.split('@')[0],
            role: mapDbRoleToFrontend(p.role || 'staff'),
            modules: p.modules || []
          }));
          success = true;
        }
      }

      setUsers(fetchedUsers);

      // Load permissions rules
      const rules = await getPermissionRules();
      setPermissionRules(rules);

      // Trigger profile updates so the global context stays synchronized
      onProfileUpdate?.();

    } catch (err: any) {
      console.error("User management loading exception:", err);
      setError(err.message || 'Failed to populate directory matrices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndRules();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);

      if (!createEmail || !createPassword || !createRole) {
        throw new Error("All clearance definitions must be fully satisfied.");
      }

      if (createPassword.length < 6) {
        throw new Error("Initial passkey must contain at least 6 characters.");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active credentials.");

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          fullName: createFullName,
          role: createRole
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Server could not allocate new profile record.");
      }

      // Reset Create States
      setCreateEmail('');
      setCreatePassword('');
      setCreateFullName('');
      setCreateRole('staff');
      setShowCreatePassword(false);
      setIsCreateModalOpen(false);

      // Re-load Users Directory
      loadUsersAndRules();

    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setDeleteLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Credentials session expired.");

      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: deletingUser.id })
      });

      const d = await safeParseJson(res);
      if (!res.ok) {
        throw new Error(d.error || "Failed to finalize account termination.");
      }

      setDeletingUser(null);
      loadUsersAndRules();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUnlockUser = async (user: AdminUser) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Credentials session expired.");

      const res = await fetch('/api/admin/unlock-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: user.id })
      });

      const d = await safeParseJson(res);
      if (!res.ok) {
        throw new Error(d.error || "Failed to unlock user account.");
      }

      loadUsersAndRules();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMatrix = async (updatedRules: ModulePermissionRule[]) => {
    try {
      setRulesLoading(true);
      setError(null);
      const success = await savePermissionRules(updatedRules);
      if (success) {
        setPermissionRules(updatedRules);
      } else {
        throw new Error("Failed to write revised permission matrix rules.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRulesLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-12 font-sans antialiased text-[#1E293B]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[28px] font-medium tracking-tight text-[#1E293B]">
              User Directory & Access Control
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Manage staff credentials, passwords, and role-based clearance rules
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Nav Switch Toggles */}
            <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center border border-slate-200/60 shadow-inner">
              <button
                onClick={() => setActiveTab('directory')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'directory' 
                    ? 'bg-white text-[#1E3A8A] shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                User Directory
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'permissions' 
                    ? 'bg-white text-[#1E3A8A] shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Permissions Matrix
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'audit' 
                    ? 'bg-white text-[#1E3A8A] shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                User Audits
              </button>
            </div>

            {/* Create Account Action Button */}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#00966D] hover:bg-[#00825E] text-white font-medium text-sm px-4 py-2 rounded-xl transition-all shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create Account
            </button>
          </div>
        </div>

        {/* Status Alerts Block */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
            <button 
              onClick={loadUsersAndRules} 
              className="p-1 px-2 text-xs bg-red-100 hover:bg-red-200/80 rounded-lg text-red-800 font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Sync
            </button>
          </div>
        )}

        {/* Dynamic Inner Layout Switcher View */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-32 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#00966D] animate-spin mb-3" />
              <p className="text-gray-400 text-xs font-semibold">Synchronizing secure credentials directories...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {activeTab === 'directory' ? (
                <>
                  {/* Search Filtering Utility Row */}
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search security directory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#475569] transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <button 
                      onClick={loadUsersAndRules}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 font-semibold"
                      title="Sync table with Supabase profiles"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync Directory Tree
                    </button>
                  </div>

                  {/* Canvas Table Frame Block wrapper */}
                  <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-md p-4 overflow-hidden">
                    <TeamDirectory 
                      users={filteredUsers} 
                      onEdit={(user) => setEditingUser(user)}
                      onDelete={(user) => setDeletingUser(user)}
                      onUnlock={handleUnlockUser}
                      currentUserProfile={currentUserProfile}
                    />
                  </div>
                </>
              ) : activeTab === 'permissions' ? (
                <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-md p-4 overflow-hidden">
                  <PermissionsMatrix 
                    rules={permissionRules} 
                    onSave={handleSaveMatrix} 
                    loading={rulesLoading} 
                  />
                </div>
              ) : (
                <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-md p-4 overflow-hidden text-left">
                  <AuditLogView />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Creation Modal Frame */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-[1.5rem] max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-emerald-50 rounded-lg text-[#00966D] shrink-0 border border-emerald-100">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Provision System Account</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-5">Initialize safe user roles, baseline login emails, and access control clearances inside the main credential index database.</p>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Staff Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00966D]/10 focus:border-[#00966D] transition-all font-semibold text-slate-800"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Account Login Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. employee@ministry.gov"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00966D]/10 focus:border-[#00966D] transition-all font-semibold text-slate-805"
                  />
                </div>

                {/* Initial Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Account Initial Passkey</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters requested"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00966D]/10 focus:border-[#00966D] transition-all font-mono font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Assigned Clearance Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 hover:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00966D]/10 focus:border-[#00966D] transition-all font-semibold text-slate-800"
                  >
                    <option value="Super_admin">Super Admin (System Configuration)</option>
                    <option value="Supervisor">Supervisor (Approval & Team Management)</option>
                    <option value="Editor">Editor (Read + Write/Upload/Edit)</option>
                    <option value="Viewer">Viewer (Can ONLY Read/View files)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-100 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)} 
                    disabled={createLoading}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={createLoading}
                    className="px-5 py-2 bg-[#00966D] hover:bg-[#00825E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating User...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Allocate User</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Clearance Modal Wrapper */}
        {editingUser && (
          <EditUserModal 
            user={editingUser} 
            onClose={() => setEditingUser(null)} 
            onSave={loadUsersAndRules} 
          />
        )}

        {/* Delete Confirmation Modal */}
        {deletingUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-50">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <AlertCircle className="w-6 h-6 stroke-[2.5]" />
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Purge Account Credentials?</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Are you completely sure you want to terminate the security access control profile for <strong className="text-slate-800 capitalize font-bold">{deletingUser.full_name || deletingUser.email}</strong>? This will permanently delete their profile and void their system access credentials.
              </p>
              
              <div className="flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setDeletingUser(null)} 
                  disabled={deleteLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser} 
                  disabled={deleteLoading}
                  className="px-5 py-2 bg-[#EF4444] text-white rounded-xl text-xs font-bold hover:bg-[#DC2626] transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Terminate Account
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
