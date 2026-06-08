import React from 'react';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  modules?: string[];
  last_sign_in_at?: string | null;
}

interface TeamDirectoryProps {
  filteredUsers: UserProfile[];
  users: UserProfile[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  pageSize: number;
  selectedUser: UserProfile | null;
  setSelectedUser: (user: UserProfile) => void;
  setManagedUser: (user: UserProfile) => void;
  setIsAddingUser: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  getPrimaryRoleLabel: (role: string, emailStr: string) => string;
  getGradientAvatar: (email: string) => string;
  getInitials: (name: string | null, email: string) => string;
  theme: any;
  setStatus: (status: any) => void;
}

export const TeamDirectory: React.FC<TeamDirectoryProps> = ({
  filteredUsers,
  users,
  currentPage,
  totalPages,
  setCurrentPage,
  pageSize,
  selectedUser,
  setSelectedUser,
  setManagedUser,
  setIsAddingUser,
  searchQuery,
  setSearchQuery,
  getPrimaryRoleLabel,
  getGradientAvatar,
  getInitials,
  theme,
  setStatus,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      
      {/* Top Command Bar conforming directly to requested ASCII art layout */}
      <div className="p-4 bg-slate-50/75 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium font-sans"
          />
        </div>

        <button
          type="button"
          onClick={() => { setIsAddingUser(true); setStatus(null); }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all outline-none border-none cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          [ + Invite Terminal User ]
        </button>
      </div>

      {/* List Table container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
              <th className="p-4">Name & Email</th>
              <th className="p-4">Primary Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Active Module Assignment</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const userFriendlyRole = getPrimaryRoleLabel(user.role, user.email);
                const isOnline = user.last_sign_in_at !== null;
                
                // Filter clean names
                const filteredAssignedModules = (user.modules || [])
                  .filter(m => !m.includes(':')) // exclude granular suffixes
                  .map(m => {
                    if (m === 'OVERVIEW') return 'Dashboard';
                    if (m === 'Yellow Card') return 'Yellow Card Div.';
                    if (m === 'CABINETS') return 'File Cabinets';
                    if (m === 'AUDIT') return 'System Audit';
                    return m;
                  });

                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Name & Email */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getGradientAvatar(user.email)} flex items-center justify-center text-[11px] font-bold border border-white shrink-0 shadow-xs`}>
                          {getInitials(user.full_name, user.email)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs block leading-tight">
                            {user.full_name || 'Anonymous Officer'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5 select-all">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Primary Role */}
                    <td className="p-4 font-semibold text-slate-700 text-xs">
                      {userFriendlyRole}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#1b8b58] font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1b8b58] animate-pulse" />
                          ● Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          ○ Invited
                        </span>
                      )}
                    </td>

                    {/* Active Module Assignment */}
                    <td className="p-4 max-w-sm">
                      {user.role === 'admin' || user.role === 'super_admin' ? (
                        <span className="text-emerald-700 font-extrabold text-[11px] px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100 font-sans">
                          All Modules (Full Bypass)
                        </span>
                      ) : filteredAssignedModules.length > 0 ? (
                        <span className="text-slate-700 font-semibold text-[11px] tracking-wide bg-slate-50 border border-slate-100 px-2 py-0.5 rounded leading-relaxed font-sans">
                          {filteredAssignedModules.slice(0, 3).join(', ')}
                          {filteredAssignedModules.length > 3 ? `, +${filteredAssignedModules.length - 3} more` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px] font-mono">
                          No Active Workspace Clearance
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setManagedUser(user);
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-905 border border-slate-200 hover:border-slate-300 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer outline-none"
                      >
                        [ Manage ]
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Search className="w-8 h-8 text-slate-350 mx-auto" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      No matching system registries verified
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls for directory */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Index {filteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} records verified
        </p>
        
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(1, typeof prev === 'function' ? (prev as any)(currentPage) : prev - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 flex items-center gap-1 select-none text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed outline-none cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i + 1}
                type="button"
                onClick={() => setCurrentPage(i + 1)}
                className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all outline-none border-none cursor-pointer ${
                  currentPage === i + 1 
                    ? `${theme.primary} text-white shadow-sm` 
                    : 'text-slate-500 hover:bg-slate-100 bg-transparent'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, typeof prev === 'function' ? (prev as any)(currentPage) : prev + 1))}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 flex items-center gap-1 select-none text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed outline-none cursor-pointer transition-colors"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
