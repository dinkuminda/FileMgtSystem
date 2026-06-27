import React, { useState, useEffect } from 'react';
import { supabase, type AuditLog } from '../lib/supabase';
import { Loader2, Activity, User, Calendar, ShieldCheck } from 'lucide-react';

export default function AuditLogView({ filter }: { filter?: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    let loadedFromDb = false;
    try {
      let query = supabase
        .from('audit_logs')
        .select('*');
      
      if (filter) {
        query = query.eq('entity_type', filter);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        setLogs(data as AuditLog[]);
        loadedFromDb = true;
      }
    } catch (err) {
      console.warn("Supabase audit log fetch error, reading local storage:", err);
    }

    if (!loadedFromDb) {
      // Load from localStorage fallback
      try {
        const localLogsStr = localStorage.getItem('local_audit_logs') || '[]';
        let localLogs = JSON.parse(localLogsStr) as AuditLog[];
        if (filter) {
          localLogs = localLogs.filter(log => log.entity_type === filter);
        }
        setLogs(localLogs.slice(0, 100));
      } catch (e) {
        console.error("Failed to parse local audit logs fallback:", e);
      }
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'UPDATE': return 'text-blue-700 bg-blue-50 border border-blue-100';
      case 'DELETE': return 'text-rose-750 bg-rose-50 border border-rose-100';
      case 'LOGIN': return 'text-violet-750 bg-violet-50 border border-violet-100';
      default: return 'text-slate-600 bg-slate-50 border border-slate-150';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-600 opacity-60" />
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Streaming Audit Trail...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Security Audit Logs</h3>
            <p className="text-xs font-medium text-slate-500">System-wide event tracking</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
        >
          Refresh Feed
        </button>
      </div>

      <div className="space-y-3.5">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white rounded-xl border border-slate-200/80 hover:border-slate-350 transition-all shadow-xs group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3.5 rounded-xl ${getActionColor(log.action)} shadow-xs transition-transform group-hover:scale-105`}>
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {log.entity_type} Management
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{log.details}</p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                    <User className="w-3.5 h-3.5 text-slate-350" />
                    <span>{log.user_email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-slate-350" />
                    <span>{new Date(log.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
              </div>
            </div>
            {log.entity_id && (
              <div className="flex flex-col items-start sm:items-end gap-0.5 self-start sm:self-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Trace ID</span>
                <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {log.entity_id.slice(0, 12)}
                </span>
              </div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-20 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
            <Activity className="w-12 h-12 mx-auto text-slate-300 opacity-60 mb-3 animate-pulse" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Security Events Recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
