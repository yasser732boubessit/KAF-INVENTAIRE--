import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Link2, 
  XCircle, 
  AlertCircle, 
  Camera, 
  Tag, 
  User, 
  Calendar, 
  MapPin, 
  HelpCircle,
  Check,
  X
} from 'lucide-react';
import { DiscoveredAsset, Asset, UserRole, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface UnregisteredDiscoveriesViewProps {
  discoveries: DiscoveredAsset[];
  missingAssets: Asset[];
  userRole: UserRole;
  onAddDiscovery: (discovery: DiscoveredAsset) => void;
  onMatchWithMissing: (discoveryId: string, missingAssetId: string) => void;
  onIntegrateOfficial: (discoveryId: string, officialCode: string) => void;
  onRejectDiscovery: (discoveryId: string, reason: string) => void;
  lang: Language;
}

export const UnregisteredDiscoveriesView: React.FC<UnregisteredDiscoveriesViewProps> = ({
  discoveries,
  missingAssets,
  userRole,
  onAddDiscovery,
  onMatchWithMissing,
  onIntegrateOfficial,
  onRejectDiscovery,
  lang
}) => {
  const t = translations[lang];

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedForMatch, setSelectedForMatch] = useState<DiscoveredAsset | null>(null);
  const [selectedMissingId, setSelectedMissingId] = useState('');
  
  const [selectedForReject, setSelectedForReject] = useState<DiscoveredAsset | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // New discovery form state
  const [tempDesc, setTempDesc] = useState('');
  const [tempSerial, setTempSerial] = useState('');
  const [tempBarcode, setTempBarcode] = useState('');
  const [tempLocation, setTempLocation] = useState('BAY-03-RACK-04-L1');

  const handleCreateDiscovery = (e: React.FormEvent) => {
    e.preventDefault();
    const newDec: DiscoveredAsset = {
      id: `DEC-${Math.floor(100 + Math.random() * 899)}`,
      temporaryTag: `DISCOV-2026-${Math.floor(100 + Math.random() * 899)}`,
      description: tempDesc.trim() || 'Équipement non catalogué trouvé in situ',
      serialNumber: tempSerial.trim() || `SN-UNKNOWN-${Math.floor(1000 + Math.random() * 8999)}`,
      barcode: tempBarcode.trim() || `${Math.floor(990000000000 + Math.random() * 999999999)}`,
      foundLocation: tempLocation,
      foundBy: 'TECH-941',
      foundAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      status: 'EN_ATTENTE_REVUE'
    };

    sound.playScanSuccess();
    onAddDiscovery(newDec);
    setIsNewModalOpen(false);
    setTempDesc('');
    setTempSerial('');
    setTempBarcode('');
  };

  const handleConfirmMatch = () => {
    if (!selectedForMatch || !selectedMissingId) return;
    sound.playScanSuccess();
    onMatchWithMissing(selectedForMatch.id, selectedMissingId);
    setSelectedForMatch(null);
    setSelectedMissingId('');
  };

  const handleConfirmReject = () => {
    if (!selectedForReject || !rejectReason.trim()) return;
    sound.playAlert();
    onRejectDiscovery(selectedForReject.id, rejectReason.trim());
    setSelectedForReject(null);
    setRejectReason('');
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 lg:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#CBD5E1] rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-numbers font-bold text-xs bg-amber-900 text-amber-200 px-2.5 py-0.5 rounded border border-amber-700">
                NON ENREGISTRÉ (DÉCOUVERTES)
              </span>
              <h1 className="font-bold text-lg text-slate-900">
                {t.discoveriesTitle}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              {t.discoveriesSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="bg-[#0F172A] hover:bg-slate-800 text-white px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              <span>{t.addNewAsset}</span>
            </button>
          </div>
        </div>

        {/* Informative Guidance Box */}
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Règle de gestion KAF-INVENTAIRE :</strong> Tout matériel trouvé physiquement sans fiche ERP ne doit pas être directement validé conforme. Il est consigné ici comme <em>Découverte</em> pour décision par le superviseur : soit <strong>rapproché</strong> avec un actif manquant d'une autre référence, soit <strong>intégré officiellement</strong> avec nouveau code, soit <strong>rejeté</strong> (ex: matériel de sous-traitant temporaire).
          </div>
        </div>
      </div>

      {/* Discoveries Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {discoveries.map((item) => {
          const isPending = item.status === 'EN_ATTENTE_REVUE';
          const isMatched = item.status === 'RAPPROCHE';
          const isIntegrated = item.status === 'INTEGRE';
          const isRejected = item.status === 'REJETE';

          return (
            <div
              key={item.id}
              className={`bg-white border-2 rounded-lg p-4 shadow-sm flex flex-col justify-between transition-all ${
                isPending ? 'border-amber-300' : isMatched ? 'border-sky-300' : isIntegrated ? 'border-emerald-300' : 'border-slate-300 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono-numbers font-bold text-xs bg-slate-900 text-sky-300 px-2 py-0.5 rounded">
                    {item.temporaryTag}
                  </span>
                  
                  {isPending && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      EN ATTENTE D'ARBITRAGE
                    </span>
                  )}
                  {isMatched && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                      RAPPROCHÉ ({item.matchedAssetId})
                    </span>
                  )}
                  {isIntegrated && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      INTÉGRÉ AU PATRIMOINE
                    </span>
                  )}
                  {isRejected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      REJETÉ / NON IMMOBILISABLE
                    </span>
                  )}
                </div>

                {/* Photo & Description */}
                <div className="h-32 rounded overflow-hidden bg-slate-950 mb-3 relative">
                  <img
                    src={item.imageUrl}
                    alt={item.description}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono-numbers text-sky-300">
                    BARCODE: {item.barcode}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug mb-2">
                  {item.description}
                </h3>

                <div className="space-y-1 text-xs text-slate-600 font-mono-numbers mb-3 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">N° de Série:</span>
                    <span className="font-bold text-slate-800">{item.serialNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Lieu de découverte:</span>
                    <span className="font-bold text-sky-700">{item.foundLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Découvert par:</span>
                    <span className="text-slate-700">{item.foundBy} ({item.foundAt.substring(11, 16)})</span>
                  </div>
                </div>

                {item.rejectionReason && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 mb-3">
                    <strong>Motif du rejet:</strong> {item.rejectionReason}
                  </div>
                )}
              </div>

              {/* Action Buttons (Restricted by Role) */}
              {isPending && (
                <div className="pt-3 border-t border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Décisions du Superviseur ({userRole})
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* 1. Rapprocher avec un actif manquant */}
                    <button
                      onClick={() => setSelectedForMatch(item)}
                      className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Associer cet équipement à un actif existant disparu"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Rapprocher</span>
                    </button>

                    {/* 2. Intégrer au patrimoine */}
                    <button
                      onClick={() => onIntegrateOfficial(item.id, `IMMO-2026-${Math.floor(1000 + Math.random() * 8999)}`)}
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Créer une immobilisation officielle"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Intégrer</span>
                    </button>
                  </div>

                  {/* 3. Rejeter */}
                  <button
                    onClick={() => setSelectedForReject(item)}
                    className="w-full py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rejeter la découverte</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Rapprocher avec un actif manquant */}
      {selectedForMatch && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 border border-slate-300 text-slate-800">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-600" />
                <span>Rapprochement d'une Découverte</span>
              </h3>
              <button onClick={() => setSelectedForMatch(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Associez la découverte <strong>{selectedForMatch.temporaryTag}</strong> ({selectedForMatch.description}) à un actif du registre actuellement déclaré manquant :
            </p>

            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sélectionnez l'actif manquant à réconcilier :
            </label>
            <select
              value={selectedMissingId}
              onChange={(e) => setSelectedMissingId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-xs bg-white mb-4 focus:ring-2 focus:ring-sky-500 font-mono-numbers"
            >
              <option value="">-- Choisir un actif manquant --</option>
              {missingAssets.map(a => (
                <option key={a.id} value={a.id}>
                  {a.id} - {a.nameFr} (Théorique: {a.expectedBayLocation})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setSelectedForMatch(null)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmMatch}
                disabled={!selectedMissingId}
                className="px-4 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded text-xs font-bold disabled:opacity-50"
              >
                Confirmer le Rapprochement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejeter la découverte */}
      {selectedForReject && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 border border-slate-300 text-slate-800">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h3 className="font-bold text-sm text-rose-800 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Rejet de Découverte (Justification obligatoire)</span>
              </h3>
              <button onClick={() => setSelectedForReject(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Indiquez pourquoi <strong>{selectedForReject.temporaryTag}</strong> ne doit pas être immobilisé au bilan :
            </p>

            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="ex: Matériel en prêt par le fournisseur Siemens / Équipement mis au rebut en attente d'enlèvement"
              className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-rose-500 mb-4"
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setSelectedForReject(null)}
                className="px-3 py-1.5 border rounded text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold disabled:opacity-50"
              >
                Rejeter Officiellement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Créer une Découverte in situ */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-4 border border-slate-300 text-slate-800">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-600" />
                <span>Signaler un Matériel Non Enregistré in situ</span>
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDiscovery} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Désignation constatée du bien</label>
                <input
                  type="text"
                  required
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  placeholder="ex: Générateur de secours portable 5kW"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">N° de Série lu sur la plaque</label>
                  <input
                    type="text"
                    value={tempSerial}
                    onChange={(e) => setTempSerial(e.target.value)}
                    placeholder="SN-XXX-1234"
                    className="w-full p-2 border rounded font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Code-barres trouvé (si étiqueté)</label>
                  <input
                    type="text"
                    value={tempBarcode}
                    onChange={(e) => setTempBarcode(e.target.value)}
                    placeholder="990184..."
                    className="w-full p-2 border rounded font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Emplacement de la découverte</label>
                <input
                  type="text"
                  value={tempLocation}
                  onChange={(e) => setTempLocation(e.target.value)}
                  placeholder="BAY-03-RACK-04-L1"
                  className="w-full p-2 border rounded font-mono-numbers"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 border rounded text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold"
                >
                  Enregistrer la Découverte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
