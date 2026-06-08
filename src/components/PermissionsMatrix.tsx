import React from 'react';
import { ArrowLeft, Sliders, Loader2, ShieldCheck } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface PermissionsMatrixProps {
  managedUser: UserProfile;
  managedModules: string[];
  setManagedUser: (user: UserProfile | null) => void;
  toggleGranularPermission: (moduleId: string, action: 'read' | 'write' | 'approve' | 'audit') => void;
  actionLoading: boolean;
  handleSaveManagedUserPermissions: () => void;
  getPrimaryRoleLabel: (role: string, emailStr: string) => string;
  theme: any;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({
  managedUser,
  managedModules,
  setManagedUser,
  toggleGranularPermission,
  actionLoading,
  handleSaveManagedUserPermissions,
  getPrimaryRoleLabel,
  theme,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Permissions Profile: <span className="text-emerald-700">{managedUser.full_name || 'Anonymous Officer'}</span> 
              <span className="text-slate-400 font-normal ml-1">({getPrimaryRoleLabel(managedUser.role, managedUser.email)})</span>
            </h2>
          </div>
          <p className="text-[11px] text-slate-500">
            Refining system-level clearance vectors for <span className="font-mono text-slate-600">{managedUser.email}</span>
          </p>
        </div>

        {/* Status Header pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Custom Profile
        </div>
      </div>

      {/* Back Arrow & Config Baseline */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs text-slate-600">
        <button
          type="button"
          onClick={() => setManagedUser(null)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-101 border border-slate-200 text-slate-700 font-bold rounded-lg transition-all cursor-pointer outline-none shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          ← Back to Directory
        </button>
        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block shrink-0" />
        <div className="font-medium flex items-center gap-1 text-slate-500 font-sans">
          <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          Security Configuration Baseline: <strong className="text-slate-705">Custom Permissions Workspace Overrides</strong>
        </div>
      </div>

      {/* Granular Module Access Matrix Table from Mockup */}
      <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
              <th className="p-4 w-72 font-sans">Module Workspace</th>
              <th className="p-4 w-96 font-sans">Description</th>
              <th className="p-4 text-center">Read</th>
              <th className="p-4 text-center">Write</th>
              <th className="p-4 text-center">Approve</th>
              <th className="p-4 text-center">Audit Logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { id: 'OVERVIEW', label: '[📊] Dashboard', desc: 'Global system overview, telemetry indicators, & alerts stream' },
              { id: 'AIRPORT', label: '[✈️] Bole Airport', desc: 'Terminal arrivals, passport validation protocols, & checkpoints' },
              { id: 'VISA', label: '[📄] VISA Division', desc: 'Entry visas permissions, application queues, & processing' },
              { id: 'Residence ID', label: '[🪪] Residence ID', desc: 'National residence registry, local ID cards, & cards generation' },
              { id: 'Yellow Card', label: '[🟡] Yellow Card Div.', desc: 'Health clearances, yellow cards registry, & tracking records' },
              { id: 'CABINETS', label: '[📂] File Cabinets', desc: 'Electronic physical archives repository & document structures' },
              { id: 'EOID', label: '[🔑] Origin ID / EOID', desc: 'Electronic Origin ID status certificates & digital validation' },
              { id: 'EOID Under_Age', label: '[🍼] EOID Under_Age', desc: 'Electronic Origin ID status check & logs for minors & under age entries' },
              { id: 'ETD', label: '[✈️] ETD Division', desc: 'Emergency Travel Document verification, check, & registers' },
              { id: 'USERS', label: '[👥] User Management', desc: 'Administrative user directories, credentials modification, & divisional access controls' },
              { id: 'AUDIT', label: '[🔍] System Audit Logs', desc: 'Federal system immutable audit logs & database operation events' }
            ].map((m) => {
              const isAdminBypass = managedUser.role === 'admin' || managedUser.role === 'super_admin';
              
              const readChecked = isAdminBypass || managedModules.includes(m.id) || managedModules.includes(`${m.id}:read`);
              const writeChecked = isAdminBypass || managedModules.includes(`${m.id}:write`);
              const approveChecked = isAdminBypass || managedModules.includes(`${m.id}:approve`);
              const auditChecked = isAdminBypass || managedModules.includes(`${m.id}:audit`);

              return (
                <tr key={m.id} className="hover:bg-slate-50/30 transition-all text-xs text-slate-750">
                  {/* Module Workspace */}
                  <td className="p-4 font-bold text-slate-800 tracking-wide font-sans">
                    {m.label}
                  </td>
                  {/* Description */}
                  <td className="p-4 text-slate-500 text-[11px] font-medium leading-relaxed font-sans">
                    {m.desc}
                  </td>
                  {/* Read Column */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      disabled={isAdminBypass}
                      onClick={() => toggleGranularPermission(m.id, 'read')}
                      className={`inline-flex items-center justify-center w-6 h-6 border rounded transition-all cursor-pointer ${
                        readChecked 
                          ? 'bg-emerald-500 border-emerald-600 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                          : 'bg-white hover:bg-slate-150 border-slate-200 text-slate-400'
                      } disabled:opacity-75 disabled:cursor-not-allowed`}
                    >
                      {readChecked ? '✓' : ''}
                    </button>
                  </td>
                  {/* Write Column */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      disabled={isAdminBypass || (!readChecked && !isAdminBypass)}
                      onClick={() => toggleGranularPermission(m.id, 'write')}
                      className={`inline-flex items-center justify-center w-6 h-6 border rounded transition-all cursor-pointer ${
                        writeChecked 
                          ? 'bg-emerald-500 border-emerald-600 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                          : 'bg-white hover:bg-slate-150 border-slate-200 text-slate-400'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {writeChecked ? '✓' : ''}
                    </button>
                  </td>
                  {/* Approve Column */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      disabled={isAdminBypass || (!readChecked && !isAdminBypass)}
                      onClick={() => toggleGranularPermission(m.id, 'approve')}
                      className={`inline-flex items-center justify-center w-6 h-6 border rounded transition-all cursor-pointer ${
                        approveChecked 
                          ? 'bg-emerald-500 border-emerald-600 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                          : 'bg-white hover:bg-slate-150 border-slate-200 text-slate-400'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {approveChecked ? '✓' : ''}
                    </button>
                  </td>
                  {/* Audit Logs Column */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      disabled={isAdminBypass || (!readChecked && !isAdminBypass)}
                      onClick={() => toggleGranularPermission(m.id, 'audit')}
                      className={`inline-flex items-center justify-center w-6 h-6 border rounded transition-all cursor-pointer ${
                        auditChecked 
                          ? 'bg-emerald-500 border-emerald-600 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                          : 'bg-white hover:bg-slate-150 border-slate-200 text-slate-400'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {auditChecked ? '✓' : ''}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Matrix Form Footers Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setManagedUser(null)}
          className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer outline-none"
        >
          [ Cancel ]
        </button>
        
        <button
          type="button"
          disabled={actionLoading}
          onClick={handleSaveManagedUserPermissions}
          className={`px-5 py-2 min-w-[120px] ${theme.primary} text-xs font-black rounded-xl text-white transition-all shadow-md shadow-emerald-800/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border-none outline-none`}
        >
          {actionLoading ? (
            <>
              <Loader2 className="w-3 animate-spin text-white" />
              Saving...
            </>
          ) : (
            <>
              [ Save Changes ]
            </>
          )}
        </button>
      </div>
    </div>
  );
};
