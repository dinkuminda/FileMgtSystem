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
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
            <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">BOX #</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Full Name</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Citizenship</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Passport / Req #</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Service</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600 opacity-20" />
                Loading records...
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                <FileQuestion className="w-12 h-12 mx-auto mb-2 opacity-10" />
                No records found for this category
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{record.box_number}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{record.full_name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">{record.sex}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{record.citizenship}</span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span>{record.passport_number}</span>
                      {record.id && (
                        <AttachmentIndicator recordId={record.id} type={activeTab} />
                      )}
                    </div>
                    <span className="text-blue-500 dark:text-blue-400">{record.request_number}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                    {record.service_provided}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(record.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {canEdit && (
                      <>
                        <button 
                          onClick={() => onEdit(record)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                          title="Edit Record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(record.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
