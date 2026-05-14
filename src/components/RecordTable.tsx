import React from 'react';
import { Loader2, FileQuestion, Edit2, Trash2 } from 'lucide-react';
import { type ImmigrationRecord, type RecordType } from '../lib/supabase';
import AttachmentIndicator from './AttachmentIndicator';

interface RecordTableProps {
  loading: boolean;
  records: ImmigrationRecord[];
  activeTab: RecordType;
  canEdit: boolean;
  onEdit: (record: ImmigrationRecord) => void;
  onDelete: (id: string) => void;
}

export default function RecordTable({ 
  loading, 
  records, 
  activeTab, 
  canEdit, 
  onEdit, 
  onDelete 
}: RecordTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">BOX #</th>
              <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Identity / Bio</th>
              <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Origin</th>
              <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Travel Auth</th>
              <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Service Unit</th>
              <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Registry Date</th>
              <th className="px-6 py-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.25em] text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-[var(--m3-primary)] opacity-20" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Synchronizing Registry...</p>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <EmptyState />
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-6">
                    <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-100/50 px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                      {record.box_number}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-sm font-bold text-slate-800 group-hover:text-[var(--m3-primary)] transition-colors">{record.full_name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{record.sex}</div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      {record.citizenship}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-700 leading-none">{record.passport_number}</span>
                        {record.id && (
                          <AttachmentIndicator recordId={record.id} type={activeTab} />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-[var(--m3-primary)] uppercase tracking-widest">REQ: {record.request_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="inline-flex px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] border border-[var(--m3-outline-variant)]/30">
                      {record.service_provided}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-[11px] font-bold text-slate-500 font-mono">
                    {new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-6 text-right">
                    <TableActions record={record} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-[var(--m3-primary)] opacity-20" />
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Fetching data...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-12"><EmptyState /></div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white border border-[var(--m3-outline-variant)] rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--m3-primary-container)] flex items-center justify-center text-[var(--m3-on-primary-container)] font-bold">
                    {record.full_name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{record.full_name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{record.citizenship} • {record.sex}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                  BOX {record.box_number}
                </span>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Passport</p>
                  <p className="text-xs font-bold font-mono text-slate-700">{record.passport_number}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Request</p>
                  <p className="text-xs font-black text-[var(--m3-primary)] tracking-tight">{record.request_number}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Service</p>
                  <span className="text-[9px] font-black uppercase text-[var(--m3-on-primary-container)] bg-[var(--m3-primary-container)] px-2 py-0.5 rounded-full">
                    {record.service_provided}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {new Date(record.date).toLocaleDateString()}
                </span>
                <TableActions record={record} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 md:py-24">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileQuestion className="w-8 h-8 md:w-10 md:h-10 text-slate-200" />
      </div>
      <h4 className="text-lg font-bold text-slate-800">No Records Found</h4>
      <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest px-8">The system repository is empty for this category</p>
    </div>
  );
}

function TableActions({ record, onEdit, onDelete, canEdit }: { record: ImmigrationRecord, onEdit: (r: ImmigrationRecord) => void, onDelete: (id: string) => void, canEdit: boolean }) {
  if (!canEdit) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <button 
        onClick={() => onEdit(record)}
        className="p-2.5 text-slate-300 hover:text-[var(--m3-primary)] hover:bg-[var(--m3-primary-container)]/30 rounded-xl transition-all"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button 
        onClick={() => onDelete(record.id)}
        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
