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
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ==========================================
// TYPES & INTERFACES
// ==========================================
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

interface ModulePermissionRule {
  id: string;
  role: string;
  module: string;
  actions: string[];
}

// ==========================================
// SUB-COMPONENT: TEAM DIRECTORY
// ==========================================
interface TeamDirectoryProps {
  users: AdminUser[];
}

function TeamDirectory({ users }: TeamDirectoryProps) {
  // Exact color scheme mapping from the user mgt final.png reference
  const getRoleStyle = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'bg-[#FDF2F2] text-[#EF4444] border border-[#FEE2E2]'; // Light Red
      case 'SUPERVISOR':
        return 'bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]'; // Light Gold/Orange
      case 'OFFICER':
        return 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'; // Light Blue
      case 'VIEWER':
      default:
        return 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'; // Light Gray
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
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
            <th className="py-4 px-6 font-semibold">Password (Encrypted)</th>
            <th className="py-4 px-6 font-semibold">Created Date</th>
            <th className="py-4 px-6 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-sm">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
              {/* Full Name */}
              <td className="py-4 px-6 font-bold text-[#1E293B] capitalize">
                {user.full_name}
                {user.role.toUpperCase() === 'ADMIN' && (
                  <span className="text-[#00966D] font-normal text-xs normal-case ml-1"> (You)</span>
                )}
              </td>
              
              {/* Email */}
              <td className="py-4 px-6 text-[#334155] font-normal">{user.email}</td>
              
              {/* System Role Badge */}
              <td className="py-4 px-6">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide border rounded-[4px] uppercase ${getRoleStyle(user.role)}`}>
                  {user.role.toUpperCase() === 'SUPERVISOR' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mr-1.5 inline-block" />
                  )}
                  {user.role}
                </span>
              </td>
              
              {/* Encrypted Password Placeholder */}
              <td className="py-4 px-6 text-slate-400 font-mono text-xs tracking-widest">
                <div className="flex items-center gap-1.5 text-[#94A3B8]">
                  <Key className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>••••••••••••</span>
                </div>
              </td>
              
              {/* Created Date */}
              <td className="py-4 px-6 text-[#64748B] font-normal">
                {formatDate(user.created_at)}
              </td>
              
              {/* Action Buttons */}
              <td className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button className="p-2 text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-colors">
                    <Pencil className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button className="p-2 text-[#EF4444] bg-[#FDF2F2] hover:bg-[#FEE2E2] rounded-md transition-colors">
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
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
  onSave: (rules: ModulePermissionRule[]) => void;
}

function PermissionsMatrix({ rules, onSave }: PermissionsMatrixProps) {
  return (
    <div className="p-12 text-center flex flex-col items-center justify-center">
      <Shield className="w-12 h-12 text-[#1E3A8A] mb-3 opacity-20" />
      <h3 className="text-base font-semibold text-slate-700">Role Permissions Config</h3>
      <p className="text-sm text-slate-400 max-w-sm mt-1">
        Access control matrices are currently synchronized with system directory configurations.
      </p>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================
export default function AdminAccessControl() {
  const [activeTab, setActiveTab] = useState<'directory' | 'permissions'>('directory');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissionRules, setPermissionRules] = useState<ModulePermissionRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Load exact mock records mimicking the original UI image frame state
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        const mockUsers: AdminUser[] = [
          {
            id: '1',
            full_name: 'mindaye hailu',
            email: 'mindaye@123',
            role: 'SUPERVISOR',
            created_at: '2026-06-03',
            last_sign_in_at: null,
            confirmed_at: null,
            modules: []
          },
          {
            id: '2',
            full_name: 'sami burayu',
            email: 'sami@gmail.com',
            role: 'OFFICER',
            created_at: '2026-06-03',
            last_sign_in_at: null,
            confirmed_at: null,
            modules: []
          },
          {
            id: '3',
            full_name: 'ahmed Kasim',
            email: 'ahmed@gmail.com',
            role: 'VIEWER',
            created_at: '2026-06-03',
            last_sign_in_at: null,
            confirmed_at: null,
            modules: []
          },
          {
            id: '4',
            full_name: 'System Administrator',
            email: 'admin',
            role: 'ADMIN',
            created_at: '2026-05-25',
            last_sign_in_at: null,
            confirmed_at: null,
            modules: []
          }
        ];

        setUsers(mockUsers);
        setPermissionRules([]);
      } catch (err: any) {
        setError('Failed to populate interface schemas.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-12 font-sans antialiased text-[#1E293B]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Block matching the design layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-[28px] font-medium tracking-tight text-[#1E293B]">
              User Directory & Access Control
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Manage staff credentials and role-based clearance
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
                    : 'text-slate-500 hover:text-slate-900'
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
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Permissions Matrix
              </button>
            </div>

            {/* Create Account Action Button */}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#00966D] hover:bg-[#00825E] text-white font-medium text-sm px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create Account
            </button>
          </div>
        </div>

        {/* Status Alerts Block */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Dynamic Inner Layout Switcher View */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xs p-32 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#00966D] animate-spin mb-3" />
              <p className="text-gray-400 text-xs font-medium">Loading asset layouts...</p>
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
                  <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search directory..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Canvas Table Frame Block wrapper mimicking the container rounded corners */}
                  <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-md p-4 overflow-hidden">
                    <TeamDirectory users={filteredUsers} />
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-md p-4 overflow-hidden">
                  <PermissionsMatrix 
                    rules={permissionRules} 
                    onSave={(updated) => setPermissionRules(updated)} 
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Creation Modal Frame */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Provision System Account</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-6">Initialize clean user roles, default logins, and access control clearances.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-[#00966D] text-white rounded-xl text-sm font-medium hover:bg-[#00825E]">Create User</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}