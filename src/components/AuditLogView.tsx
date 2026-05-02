import React, { useState, useEffect } from 'react';
import { supabase, type AuditLog } from '../lib/supabase';
import { Loader2, Activity, User, Calendar, ShieldCheck } from 'lucide-react';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) setLogs(data as AuditLog[]);
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'UPDATE': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'DELETE': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
        <p>Loading audit trail...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Access & Action History</h3>
        </div>
        <button 
          onClick={fetchLogs}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Refresh Logs
        </button>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-750 rounded-2xl shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-xl mt-1 ${getActionColor(log.action)}`}>
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 italic">
                    {log.entity_type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{log.details}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1 text-xs text-gray-400 font-medium">
                    <User className="w-3 h-3" />
                    <span>{log.user_email}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-400 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            {log.entity_id && (
              <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600 uppercase tracking-tighter">
                ID: {log.entity_id.slice(0, 8)}...
              </span>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
            <Activity className="w-12 h-12 mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 font-medium">No activity logs recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
