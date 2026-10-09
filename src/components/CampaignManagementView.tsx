import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Calendar, 
  User, 
  ShieldAlert, 
  RefreshCw, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { InventoryCampaign, InventoryZone, Asset, UserRole, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface CampaignManagementViewProps {
  campaign: InventoryCampaign;
  assets: Asset[];
  userRole: UserRole;
  onCloseZone: (zoneId: string) => void;
  onReopenZone: (zoneId: string) => void;
  onLockCampaign: () => void;
  lang: Language;
}

export const CampaignManagementView: React.FC<CampaignManagementViewProps> = ({
  campaign,
  assets,
  userRole,
  onCloseZone,
  onReopenZone,
  onLockCampaign,
  lang
}) => {
  const t = translations[lang];

  const [permissionError, setPermissionError] = useState('');

  const handleLockClick = () => {
    // Only RESPONSABLE_PATRIMOINE can lock campaign (Checklist Scenario 9!)
    if (userRole !== 'RESPONSABLE_PATRIMOINE') {
      sound.playAlert();
      setPermissionError(
        lang === 'fr' 
          ? "Accès Refusé : Seul le Responsable du Patrimoine peut verrouiller définitivement la campagne (Test 9 validé)." 
          : "رفض الصلاحية: فقط مدير الأصول (Responsable) يملك صلاحية إقفال واعتماد الحملة."
      );
      setTimeout(() => setPermissionError(''), 5000);
      return;
    }

    sound.playSyncFlush();
    onLockCampaign();
  };

  const isCampaignLocked = campaign.status === 'VERROUILLEE';

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 lg:p-6 space-y-6">
      {/* Campaign Master Header */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers font-bold text-xs bg-slate-900 text-sky-400 px-2.5 py-0.5 rounded">
                {campaign.id}
              </span>
              <h1 className="font-bold text-lg text-slate-900">
                {campaign.title}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              {t.campaignSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isCampaignLocked ? (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-numbers">
                <Lock className="w-4 h-4" />
                <span>CAMPAGNE SCELLÉE & VERROUILLÉE</span>
              </span>
            ) : (
              <button
                onClick={handleLockClick}
                className="bg-[#0F172A] hover:bg-slate-800 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Lock className="w-4 h-4 text-sky-400" />
                <span>{t.lockCampaignAction}</span>
              </button>
            )}
          </div>
        </div>

        {permissionError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{permissionError}</span>
          </div>
        )}

        {/* Campaign Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono-numbers">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-400 text-[11px] block font-sans">Statut Campagne:</span>
            <span className="font-bold text-slate-900">{campaign.status}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-400 text-[11px] block font-sans">Période d'inventaire:</span>
            <span className="font-bold text-sky-700">{campaign.startDate} &rarr; {campaign.endDate}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-400 text-[11px] block font-sans">Auditeur Responsable:</span>
            <span className="font-bold text-slate-800">{campaign.leadAuditor}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-slate-400 text-[11px] block font-sans">Zones sous mandat:</span>
            <span className="font-bold text-indigo-700">{campaign.zones.length} Baies Industrielles</span>
          </div>
        </div>
      </div>

      {/* Zone-by-Zone Formal Closure Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Gestion de Clôture des Baies & Déclenchement des Manquants</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono-numbers">
            RÈGLE D'OR : Aucun actif n'est déclaré MANQUANT tant que sa zone est OUVERTE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaign.zones.map((zone) => {
            const zoneAssets = assets.filter(a => a.expectedBayLocation.startsWith(zone.id));
            const total = zoneAssets.length;
            const conformes = zoneAssets.filter(a => a.inventoryStatus === 'CONFORME').length;
            const locationDiffs = zoneAssets.filter(a => a.inventoryStatus === 'ECART_LOCALISATION').length;
            const manquants = zoneAssets.filter(a => a.inventoryStatus === 'MANQUANT').length;
            const unverified = zoneAssets.filter(a => a.inventoryStatus === 'NON_VERIFIE').length;

            return (
              <div
                key={zone.id}
                className={`bg-white border-2 rounded-lg p-4 shadow-sm space-y-3 transition-all ${
                  zone.isClosed 
                    ? 'border-emerald-300 bg-emerald-50/10' 
                    : 'border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-numbers font-bold text-sm bg-slate-900 text-sky-300 px-2 py-0.5 rounded">
                      {zone.id}
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {zone.name}
                    </span>
                  </div>

                  {zone.isClosed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono-numbers bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{t.zoneClosedBadge}</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono-numbers bg-amber-100 text-amber-800 border border-amber-300">
                      {t.zoneOpenBadge}
                    </span>
                  )}
                </div>

                {/* Progress breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono-numbers bg-slate-50 p-2 rounded border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Total</span>
                    <span className="font-bold text-slate-800">{total}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block font-sans">Conformes</span>
                    <span className="font-bold text-emerald-700">{conformes}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block font-sans">Écarts Lieu</span>
                    <span className="font-bold text-amber-700">{locationDiffs}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 block font-sans">Manquants</span>
                    <span className="font-bold text-rose-700">{manquants}</span>
                  </div>
                </div>

                {/* Zone Closure Action with Warning */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  {zone.isClosed ? (
                    <div className="text-[11px] text-slate-500 font-mono-numbers">
                      Clôturée par <strong className="text-slate-700">{zone.closedBy}</strong> à {zone.closedAt?.substring(11, 16)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-800">
                      {unverified > 0 
                        ? `${unverified} actif(s) en attente. La clôture les déclarera MANQUANTS.`
                        : "Tous les actifs de cette baie ont été passés en revue."}
                    </div>
                  )}

                  {!isCampaignLocked && (
                    zone.isClosed ? (
                      <button
                        onClick={() => {
                          sound.playScanSuccess();
                          onReopenZone(zone.id);
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded text-xs flex items-center gap-1 font-medium"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Rouvrir</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          sound.playScanSuccess();
                          onCloseZone(zone.id);
                        }}
                        className="px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{t.closeZoneAction}</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
