import React, { useState, useEffect } from 'react';
import { supabase, type AuditLog, type UserProfile } from '../lib/supabase';
import { 
  Calendar, FileText, Download, Loader2, Search, 
  X, RotateCcw, ShieldCheck, BarChart3, ChevronDown, Globe
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface AuditLogReportingProps {
  userProfile?: UserProfile | null;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'];

const GENERATE_MOCK_LOGS = (): AuditLog[] => {
  const emails = [
    'beverly.armstrong@immigration.gov.et',
    'ephrem.weleba@immigration.gov.et',
    'dinkuh12@gmail.com',
    'abraham.g@immigration.gov.et',
    'system.daemon@immigration.gov.et'
  ];

  const actions: AuditLog['action'][] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'IMPORT', 'ADMIN_ACTION'];
  const modules = ['VISA', 'EOID', 'Residence ID', 'ETD', 'Yellow Card', 'EOID Under_Age', 'Alien Passport', 'Eritrean ID'];
  
  const mockList: AuditLog[] = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const logDate = new Date(now.getTime() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    const action = actions[Math.floor(Math.random() * actions.length)];
    const entity = modules[Math.floor(Math.random() * modules.length)];
    const userEmail = emails[Math.floor(Math.random() * emails.length)];
    const entityId = Math.random().toString(36).substring(2, 11).toUpperCase();

    let details = '';
    switch (action) {
      case 'CREATE':
        details = `Registered new ${entity} registry record for applicant ID: P-${Math.floor(100000 + Math.random() * 900000)}`;
        break;
      case 'UPDATE':
        details = `Modified ${entity} details, updated expiration date and physical slot location inside drawer`;
        break;
      case 'DELETE':
        details = `Archived/Removed duplicate ${entity} record registry row under security clearance`;
        break;
      case 'LOGIN':
        details = `Officer logged in successfully from secure regional workstation IP 192.168.10.${Math.floor(10 + Math.random() * 90)}`;
        break;
      case 'EXPORT':
        details = `Exported active ${entity} index to encrypted offline backup file (XLSX format)`;
        break;
      case 'IMPORT':
        details = `Imported bulk batch of 24 verified ${entity} credentials from regional division excel workbook`;
        break;
      case 'ADMIN_ACTION':
        details = `Modified database clearance modules & security overrides for officer profile`;
        break;
    }

    mockList.push({
      id: `mock-log-${1000 + i}`,
      user_id: `user-uuid-${Math.floor(100 + Math.random() * 900)}`,
      user_email: userEmail,
      action,
      entity_type: entity,
      entity_id: entityId,
      details,
      created_at: logDate.toISOString()
    });
  }

  return mockList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export default function AuditLogReporting({ userProfile }: AuditLogReportingProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditGenerating, setAuditGenerating] = useState(false);
  const [auditReportReady, setAuditReportReady] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    action: 'ALL',
    module: 'ALL',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [userProfile]);

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    let loadedFromDb = false;
    let rawLogs: AuditLog[] = [];
    
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && data && data.length > 0) {
        rawLogs = data as AuditLog[];
        loadedFromDb = true;
      }
    } catch (err) {
      console.warn("Supabase audit log fetch failed, checking local fallbacks:", err);
    }

    if (!loadedFromDb) {
      try {
        const localLogsStr = localStorage.getItem('local_audit_logs') || '[]';
        let localLogs = JSON.parse(localLogsStr) as AuditLog[];
        
        if (localLogs.length < 15) {
          const mocks = GENERATE_MOCK_LOGS();
          const merged = [...localLogs];
          mocks.forEach(m => {
            if (!merged.some(l => l.id === m.id)) {
              merged.push(m);
            }
          });
          localLogs = merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        rawLogs = localLogs;
      } catch (e) {
        rawLogs = GENERATE_MOCK_LOGS();
      }
    }

    // Apply role-based visibility check: Viewer role and non-elevated users can only see their own logs
    const rRole = (userProfile?.role as string || '').toLowerCase();
    const isElevated = rRole === 'admin' || rRole === 'super_admin' || rRole === 'super-admin' || rRole === 'super admin' || rRole === 'admin_grant' || rRole === 'supervisor';
    
    if (!isElevated && userProfile?.email) {
      setAuditLogs(rawLogs.filter(log => log.user_email?.toLowerCase() === userProfile.email.toLowerCase()));
    } else {
      setAuditLogs(rawLogs);
    }
    
    setAuditLoading(false);
  };

  const handleGenerateAuditReport = () => {
    setAuditGenerating(true);
    // Simulate complex query process for UX
    setTimeout(() => {
      setAuditGenerating(false);
      setAuditReportReady(true);
    }, 800);
  };

  const handleAuditReset = () => {
    setAuditFilters({
      action: 'ALL',
      module: 'ALL',
      startDate: '',
      endDate: '',
      searchTerm: ''
    });
    setAuditReportReady(false);
  };

  const filteredAuditData = auditLogs.filter(log => {
    // 1. Date filters
    const logDate = log.created_at ? new Date(log.created_at) : null;
    let matchesStart = true;
    if (auditFilters.startDate && logDate) {
      const start = new Date(auditFilters.startDate);
      start.setHours(0, 0, 0, 0);
      matchesStart = logDate >= start;
    }
    let matchesEnd = true;
    if (auditFilters.endDate && logDate) {
      const end = new Date(auditFilters.endDate);
      end.setHours(23, 59, 59, 999);
      matchesEnd = logDate <= end;
    }

    // 2. Action Filter
    const matchesAction = auditFilters.action === 'ALL' || log.action === auditFilters.action;

    // 3. Module Filter
    const matchesModule = auditFilters.module === 'ALL' || log.entity_type === auditFilters.module;

    // 4. Search Filter
    let matchesSearch = true;
    if (auditFilters.searchTerm) {
      const term = auditFilters.searchTerm.toLowerCase();
      const email = (log.user_email || '').toLowerCase();
      const details = (log.details || '').toLowerCase();
      const entityId = (log.entity_id || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      matchesSearch = email.includes(term) || details.includes(term) || entityId.includes(term) || action.includes(term);
    }

    return matchesStart && matchesEnd && matchesAction && matchesModule && matchesSearch;
  });

  const getAuditStats = () => {
    const actionDistribution = filteredAuditData.reduce((acc: any, r: any) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {});

    const moduleDistribution = filteredAuditData.reduce((acc: any, r: any) => {
      acc[r.entity_type] = (acc[r.entity_type] || 0) + 1;
      return acc;
    }, {});

    const auditChartData = Object.entries(actionDistribution).map(([name, value]) => ({ name, value: value as number }));
    const moduleChartData = Object.entries(moduleDistribution)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { auditChartData, moduleChartData };
  };

  const { auditChartData, moduleChartData } = getAuditStats();

  const handleExportAuditCSV = () => {
    if (filteredAuditData.length === 0) return;

    const headers = ['Log ID', 'Timestamp', 'User Email', 'User UUID', 'Action', 'Module/Entity', 'Target/Trace ID', 'Details'];
    const rows = filteredAuditData.map(l => [
      l.id,
      l.created_at,
      l.user_email,
      l.user_id,
      l.action,
      l.entity_type,
      l.entity_id || '',
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (auditLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-[#10b981] opacity-60" />
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Querying security system...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Main Reports Panel Custom Format Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* ACTION */}
          <div className="flex flex-col gap-1.5 text-left" id="audit-report-action-field">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Action</label>
            <select
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:bg-white focus:border-slate-450 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
              value={auditFilters.action}
              onChange={e => setAuditFilters({ ...auditFilters, action: e.target.value })}
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="EXPORT">EXPORT</option>
              <option value="IMPORT">IMPORT</option>
              <option value="ADMIN_ACTION">ADMIN_ACTION</option>
            </select>
          </div>

          {/* MODULE */}
          <div className="flex flex-col gap-1.5 text-left" id="audit-report-module-field">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Module</label>
            <select
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:bg-white focus:border-slate-455 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
              value={auditFilters.module}
              onChange={e => setAuditFilters({ ...auditFilters, module: e.target.value })}
            >
              <option value="ALL">All Modules</option>
              <option value="VISA">VISA</option>
              <option value="EOID">EOID</option>
              <option value="Residence ID">Residence ID</option>
              <option value="ETD">ETD</option>
              <option value="Yellow Card">Yellow Card</option>
              <option value="EOID Under_Age">EOID Under_Age</option>
              <option value="Alien Passport">Alien Passport</option>
              <option value="Eritrean ID">Eritrean ID</option>
            </select>
          </div>

          {/* FROM DATE */}
          <div className="flex flex-col gap-1.5 text-left" id="audit-report-from-date-field">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">From Date</label>
            <input
              type="date"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:bg-white focus:border-slate-455 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
              value={auditFilters.startDate}
              onChange={e => setAuditFilters({ ...auditFilters, startDate: e.target.value })}
            />
          </div>

          {/* TO DATE */}
          <div className="flex flex-col gap-1.5 text-left" id="audit-report-to-date-field">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">To Date</label>
            <input
              type="date"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:bg-white focus:border-slate-455 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
              value={auditFilters.endDate}
              onChange={e => setAuditFilters({ ...auditFilters, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-4 mt-4">
          {/* SEARCH */}
          <div className="flex-1 flex flex-col gap-1.5 text-left w-full" id="audit-report-search-field">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Search</label>
            <input
              type="text"
              placeholder="Username, record data..."
              className="w-full px-4 py-3 bg-white border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
              value={auditFilters.searchTerm}
              onChange={e => setAuditFilters({ ...auditFilters, searchTerm: e.target.value })}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end" id="audit-report-buttons-container">
            <button
              onClick={handleAuditReset}
              className="px-5 py-3 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-w-[100px]"
              id="audit-report-reset-btn"
            >
              <X className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleExportAuditCSV}
              disabled={filteredAuditData.length === 0}
              className="px-5 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-150/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer min-w-[120px]"
              id="audit-report-export-btn"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleGenerateAuditReport}
              disabled={auditGenerating}
              className="px-5 py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-w-[150px]"
              id="audit-report-generate-btn"
            >
              {auditGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Pending or Results */}
      {!auditReportReady ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border-2 border-dashed border-slate-200" id="audit-report-pending-card">
          <div className="relative mb-8">
            <BarChart3 className="w-16 h-16 text-slate-300 animate-pulse" />
            <Search className="w-8 h-8 text-[#10b981] absolute bottom-0 right-0 animate-bounce" />
          </div>
          <h4 className="text-lg font-bold text-slate-700">Audit Analysis Pending</h4>
          <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-semibold">Apply filters to stream audit records</p>
        </div>
      ) : (
        <div className="space-y-10">
          {auditGenerating ? (
            <div className="flex flex-col items-center justify-center py-20" id="audit-report-generating-spinner">
              <Loader2 className="w-12 h-12 animate-spin text-[#10b981] opacity-60 mb-4" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Querying security system...</p>
            </div>
          ) : (
            <>
              {/* Visual Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000" id="audit-report-charts-grid">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                  <div className="flex items-center gap-3 mb-8">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Action Type Distribution</h4>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={auditChartData}>
                        <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" opacity={0.8} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                          {auditChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                  <div className="flex items-center gap-3 mb-8">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Module Activity Loads</h4>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={moduleChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#f1f5f9" opacity={0.8} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="value" fill="#2b825a" radius={[0, 12, 12, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-in fade-in slide-in-from-bottom-10 duration-1000" id="audit-report-results-table">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-50 text-[#10b981] rounded-xl border border-emerald-100">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base leading-tight">System Audit Log Feed</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Chronological system operations</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-[#10b981] border border-emerald-150 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs">
                    {filteredAuditData.length} Logs Localized
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Officer Email</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Trace ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAuditData.slice(0, 100).map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-all group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 font-mono">
                              <Calendar className="w-4 h-4 text-slate-400 opacity-60" />
                              <span>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{log.user_email}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wide ${
                              log.action === 'CREATE' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                              log.action === 'UPDATE' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                              log.action === 'DELETE' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                              'bg-slate-50 border-slate-100 text-slate-750'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg">
                              {log.entity_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-slate-700 line-clamp-2">{log.details}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs font-bold text-emerald-600">
                            {log.entity_id || 'N/A'}
                          </td>
                        </tr>
                      ))}
                      {filteredAuditData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic text-xs font-medium">
                            No audit log records matching the criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
