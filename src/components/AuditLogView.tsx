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
    let query = supabase
      .from('audit_logs')
      .select('*');
    
    if (filter) {
      query = query.eq('entity_type', filter);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) setLogs(data as AuditLog[]);
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-[var(--m3-primary)] bg-[var(--m3-primary-container)]';
      case 'UPDATE': return 'text-[var(--m3-secondary)] bg-[var(--m3-secondary-container)]';
      case 'DELETE': return 'text-[var(--m3-error)] bg-[var(--m3-error-container)]';
      case 'LOGIN': return 'text-[var(--m3-tertiary)] bg-[var(--m3-tertiary-container)]';
      default: return 'text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container-high)]';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-12 h-12 animate-spin mb-6 text-[var(--m3-primary)] opacity-40" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--m3-on-surface-variant)]">Streaming Audit Trail...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--m3-surface-container-high)] rounded-2xl text-[var(--m3-primary)]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[var(--m3-on-surface)] tracking-tight">Security Audit Logs</h3>
            <p className="text-xs font-black uppercase tracking-widest text-[var(--m3-on-surface-variant)] opacity-50">System-wide event tracking</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          className="m3-button-filled !bg-[var(--m3-surface-container-highest)] !text-[var(--m3-on-surface)] !shadow-none hover:bg-[var(--m3-primary-container)] hover:text-[var(--m3-on-primary-container)] px-6 py-2.5 text-[10px]"
        >
          Refresh Feed
        </button>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="flex items-start justify-between p-6 bg-[var(--m3-surface-container)] rounded-[2rem] border border-[var(--m3-outline)]/5 transition-all hover:bg-[var(--m3-surface-container-high)] group"
          >
            <div className="flex items-start gap-5">
              <div className={`p-4 rounded-2xl ${getActionColor(log.action)} shadow-sm transition-transform group-hover:scale-110`}>
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-sm font-bold text-[var(--m3-on-surface)]">
                    {log.entity_type} Management
                  </span>
                </div>
                <p className="text-sm text-[var(--m3-on-surface-variant)] mt-2 font-medium leading-relaxed">{log.details}</p>
                <div className="flex flex-wrap items-center gap-5 mt-4">
                  <div className="flex items-center gap-2 text-[10px] text-[var(--m3-on-surface-variant)] font-black uppercase tracking-widest">
                    <User className="w-4 h-4 text-[var(--m3-primary)]" />
                    <span>{log.user_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--m3-on-surface-variant)] font-black uppercase tracking-widest">
                    <Calendar className="w-4 h-4 text-[var(--m3-primary)]" />
                    <span>{new Date(log.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
              </div>
            </div>
            {log.entity_id && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-black text-[var(--m3-on-surface-variant)] opacity-30 uppercase tracking-[0.2em]">Trace ID</span>
                <span className="text-[10px] font-mono text-[var(--m3-on-surface-variant)] opacity-40 font-bold">
                  {log.entity_id.slice(0, 12)}
                </span>
              </div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-24 rounded-[3rem] border-2 border-dashed border-[var(--m3-outline)]/10 bg-[var(--m3-surface-container)]/30">
            <Activity className="w-16 h-16 mx-auto text-[var(--m3-outline)] opacity-10 mb-4" />
            <p className="text-sm font-bold text-[var(--m3-on-surface-variant)] uppercase tracking-widest">No Security Events Recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
