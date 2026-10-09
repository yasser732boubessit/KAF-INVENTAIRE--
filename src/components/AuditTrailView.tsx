import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  User, 
  ArrowRight, 
  FileText,
  Lock
} from 'lucide-react';
import { AuditLogEntry, UserRole, Language } from '../types';
import { translations } from '../translations';

interface AuditTrailViewProps {
  logs: AuditLogEntry[];
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  lang: Language;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  logs,
  currentRole,
  onRoleChange,
  lang
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const filteredLogs = logs.filter(log => {
    if (roleFilter !== 'ALL' && log.userRole !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        log.entityId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.userId.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 lg:p-6 space-y-6">
      {/* Header with Role Switcher */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers font-bold text-xs bg-slate-900 text-sky-400 px-2.5 py-0.5 rounded">
                SECURITY & AUDIT TRAIL
              </span>
              <h1 className="font-bold text-lg text-slate-900">
                {t.auditLogTitle}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              {t.auditLogSubtitle}
            </p>
          </div>

          {/* Interactive Role Switcher to test RBAC */}
          <div className="bg-slate-100 p-2 rounded border border-slate-300 flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 font-sans">{t.currentRole}:</span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-sky-900 focus:ring-2 focus:ring-sky-500 font-mono-numbers"
            >
              <option value="AGENT_INVENTAIRE">{t.roleAgent}</option>
              <option value="CONTROLEUR_ZONE">{t.roleControleur}</option>
              <option value="RESPONSABLE_PATRIMOINE">{t.roleResponsable}</option>
            </select>
          </div>
        </div>

        {/* Search & Filter Strip */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par identifiant d'actif, action ou utilisateur..."
              className="w-full ps-9 pe-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {(['ALL', 'AGENT_INVENTAIRE', 'CONTROLEUR_ZONE', 'RESPONSABLE_PATRIMOINE'] as const).map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1.5 rounded font-mono-numbers whitespace-nowrap text-[11px] font-semibold transition-all ${
                  roleFilter === role 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start border-collapse font-mono-numbers">
            <thead>
              <tr className="bg-[#F1F5F9] text-slate-700 font-bold border-b border-[#CBD5E1] text-[11px]">
                <th className="p-3 text-start border-e border-slate-200">{t.colTimestamp}</th>
                <th className="p-3 text-start border-e border-slate-200">{t.colUser}</th>
                <th className="p-3 text-start border-e border-slate-200">{t.colAction}</th>
                <th className="p-3 text-start border-e border-slate-200">{t.colEntity}</th>
                <th className="p-3 text-start border-e border-slate-200">{t.colDiff}</th>
                <th className="p-3 text-start">{t.colReason}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                    Aucun événement d'audit ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-600 border-e border-slate-100 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="p-3 border-e border-slate-100 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{log.userId}</span>
                      <span className="block text-[10px] text-slate-500 font-sans">{log.userRole}</span>
                    </td>
                    <td className="p-3 border-e border-slate-100 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-sky-100 text-sky-800 border border-sky-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800 border-e border-slate-100 whitespace-nowrap">
                      {log.entityId}
                    </td>
                    <td className="p-3 border-e border-slate-100 min-w-[200px]">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                          {log.oldValue}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                          {log.newValue}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-sans text-slate-600">
                      {log.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
