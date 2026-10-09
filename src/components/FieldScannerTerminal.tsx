import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Lightbulb, 
  CheckCircle2, 
  RotateCw, 
  History, 
  Barcode, 
  Check,
  Camera,
  CameraOff,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { Asset, AssetCondition, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';

interface FieldScannerTerminalProps {
  assets: Asset[];
  currentScanningBay: string;
  onSetScanningBay: (bay: string) => void;
  onReconcileAsset: (assetId: string, foundBay: string, condition?: AssetCondition) => void;
  onOpenDiscoveryModalWithCode?: (code: string) => void;
  lang: Language;
}

export const FieldScannerTerminal: React.FC<FieldScannerTerminalProps> = ({
  assets,
  currentScanningBay,
  onSetScanningBay,
  onReconcileAsset,
  onOpenDiscoveryModalWithCode,
  lang
}) => {
  const t = translations[lang];

  const [activeAsset, setActiveAsset] = useState<Asset | null>(assets[0] || null);
  const [torchActive, setTorchActive] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [recentScans, setRecentScans] = useState<Asset[]>(assets.slice(0, 3));
  const [autoSweepRunning, setAutoSweepRunning] = useState(false);
  const [scanLaserColor, setScanLaserColor] = useState<'red' | 'green'>('red');
  
  // Real Camera Feed Support
  const [useRealCamera, setUseRealCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState('');

  // Unknown barcode detection popup
  const [unknownCodePrompt, setUnknownCodePrompt] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (useRealCamera) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              videoRef.current.play();
            }
          })
          .catch((err) => {
            setCameraError(
              lang === 'fr' 
                ? "Caméra non accessible ou permissions requises. Utilisation du mode optique simulé." 
                : "تعذر الوصول إلى الكاميرا. تم تفعيل المحاكي البصري الميداني."
            );
            setUseRealCamera(false);
          });
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useRealCamera, lang]);

  // Trigger barcode scan for a target asset
  const triggerScanOnAsset = (target: Asset) => {
    sound.playScanSuccess();
    setScanLaserColor('green');
    setTimeout(() => setScanLaserColor('red'), 600);

    setActiveAsset(target);
    onReconcileAsset(target.id, currentScanningBay);

    setRecentScans(prev => {
      const filtered = prev.filter(a => a.id !== target.id);
      return [target, ...filtered].slice(0, 5);
    });
  };

  // Run auto-sweep simulation
  const handleAutoSweep = () => {
    if (autoSweepRunning) return;
    setAutoSweepRunning(true);
    let index = 0;
    const sweepCandidates = assets.filter(a => a.inventoryStatus !== 'CONFORME');
    const itemsToSweep = sweepCandidates.length > 0 ? sweepCandidates : assets;

    const interval = setInterval(() => {
      if (index >= Math.min(itemsToSweep.length, 5)) {
        clearInterval(interval);
        setAutoSweepRunning(false);
        return;
      }
      triggerScanOnAsset(itemsToSweep[index]);
      index++;
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const query = manualCode.trim().toLowerCase();
    const match = assets.find(
      a => a.barcode.toLowerCase() === query || 
           a.serialNumber.toLowerCase() === query || 
           a.id.toLowerCase() === query
    );

    if (match) {
      triggerScanOnAsset(match);
      setManualCode('');
      setUnknownCodePrompt(null);
    } else {
      sound.playAlert();
      // Trigger user requirement 3: Unknown asset -> Non Enregistré discovery prompt!
      setUnknownCodePrompt(manualCode.trim());
    }
  };

  const getDisplayName = (item: Asset) => {
    if (lang === 'fr') return item.nameFr || item.name;
    if (lang === 'ar') return item.nameAr;
    return item.name;
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#0B132B] text-slate-100 overflow-y-auto">
      {/* Handheld Viewfinder Viewport (Left/Top) */}
      <div className="flex-1 p-4 lg:p-6 flex flex-col justify-between max-w-3xl mx-auto w-full">
        {/* Terminal Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="font-bold text-sm text-sky-400 font-mono-numbers uppercase tracking-wider">
                {t.scannerTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{t.scannerSubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Real Camera (Webcam) Toggle */}
            <button
              onClick={() => setUseRealCamera(!useRealCamera)}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                useRealCamera 
                  ? 'bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-500/20' 
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {useRealCamera ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5 text-sky-400" />}
              <span>{useRealCamera ? "Désactiver Caméra" : t.useWebcamToggle}</span>
            </button>

            {/* Torch toggle */}
            <button
              onClick={() => setTorchActive(!torchActive)}
              className={`p-2 rounded border transition-colors ${
                torchActive 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' 
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={t.flashTorch}
            >
              <Lightbulb className="w-4 h-4" />
            </button>

            {/* Current Auditing Location Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs font-mono-numbers">
              <span className="text-slate-400">BAIE TERRAIN:</span>
              <select
                value={currentScanningBay}
                onChange={(e) => onSetScanningBay(e.target.value)}
                className="bg-slate-800 text-sky-300 font-bold border-none outline-none rounded px-1"
              >
                <option value="BAY-01">BAY-01</option>
                <option value="BAY-02">BAY-02</option>
                <option value="BAY-03">BAY-03</option>
                <option value="BAY-04">BAY-04</option>
              </select>
            </div>
          </div>
        </div>

        {cameraError && (
          <div className="my-2 p-2 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded">
            {cameraError}
          </div>
        )}

        {/* Optical Scanning Reticle & Camera Emulation / Live Stream */}
        <div className="relative my-4 aspect-video sm:aspect-[16/10] bg-slate-950 rounded-lg border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center group">
          {useRealCamera ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            torchActive && (
              <div className="absolute inset-0 bg-radial from-amber-100/10 via-transparent to-transparent pointer-events-none" />
            )
          )}

          {/* Background Optical Grid */}
          {!useRealCamera && (
            <div 
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: 'radial-gradient(circle, #0284c7 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
          )}

          {/* Live Laser Sweep Line */}
          {isScanning && (
            <div 
              className={`absolute left-0 right-0 h-[2px] shadow-lg pointer-events-none animate-laser z-20 ${
                scanLaserColor === 'green'
                  ? 'bg-emerald-400 shadow-emerald-400/80'
                  : 'bg-rose-500 shadow-rose-500/80'
              }`}
            />
          )}

          {/* Industrial Viewfinder Crosshairs & Reticle */}
          <div className="absolute inset-10 sm:inset-16 border border-sky-500/40 rounded flex flex-col justify-between p-3 pointer-events-none z-10">
            <div className="flex justify-between">
              <span className="w-4 h-4 border-t-2 border-s-2 border-sky-400" />
              <span className="w-4 h-4 border-t-2 border-e-2 border-sky-400" />
            </div>
            
            <div className="self-center flex flex-col items-center gap-2">
              <div className="w-48 sm:w-64 h-24 border border-dashed border-sky-400/60 rounded flex items-center justify-center bg-sky-950/20 backdrop-blur-[1px]">
                <div className="text-center">
                  <Barcode className="w-8 h-8 text-sky-400/80 mx-auto animate-pulse" />
                  <span className="text-[10px] font-mono-numbers text-sky-300 uppercase tracking-widest block mt-1">
                    {useRealCamera ? t.webcamActive : t.laserBeamActive}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 bg-black/60 px-2.5 py-0.5 rounded font-mono-numbers">
                {lang === 'fr' ? 'ALIGNER LE CODE DANS LE VISEUR' : lang === 'ar' ? 'قم بمحاذاة الرمز داخل المؤشر' : 'ALIGN TARGET INSIDE RETICLE'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="w-4 h-4 border-b-2 border-s-2 border-sky-400" />
              <span className="w-4 h-4 border-b-2 border-e-2 border-sky-400" />
            </div>
          </div>

          {/* Quick Trigger Button overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20">
            <div className="bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-mono-numbers text-emerald-400 border border-emerald-900/60">
              {useRealCamera ? "LIVE WEBCAM SENSOR ACTIVE" : "OPTICAL SIMULATOR: 60 FPS"}
            </div>

            <button
              onClick={() => {
                const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                triggerScanOnAsset(randomAsset);
              }}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white px-4 py-2 rounded font-bold text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition-all border border-sky-400/40"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{lang === 'fr' ? "Déclencher Scan In Situ" : "مسح الأصل الحالي"}</span>
            </button>
          </div>
        </div>

        {/* Unknown Code Banner Alert (Scenario 3 from user prompt!) */}
        {unknownCodePrompt && (
          <div className="my-2 p-3 bg-amber-950/90 border-2 border-amber-500 rounded-lg flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <strong>Code Inconnu dans le Répertoire ERP ({unknownCodePrompt}) :</strong>
                <p className="text-[11px] text-amber-300">
                  Cet équipement a été trouvé physiquement mais n'existe pas dans le système. Enregistrez-le dans la liste des <strong>Actifs Non Enregistrés</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onOpenDiscoveryModalWithCode) {
                  onOpenDiscoveryModalWithCode(unknownCodePrompt);
                }
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-bold text-xs flex items-center gap-1 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer Fiche Découverte</span>
            </button>
          </div>
        )}

        {/* Field Controls Bar: Rapid sweep + Manual Barcode entry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Rapid Auto-Sweep simulator */}
          <div className="bg-[#131E3D] p-3 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">{t.rapidSweep}</div>
              <div className="text-[11px] text-slate-400">
                {lang === 'fr' 
                  ? "Tournée séquentielle haute cadence (5 actifs consécutifs)" 
                  : "مسح متسلسل عالي السرعة (5 أصول متتالية)"}
              </div>
            </div>
            <button
              onClick={handleAutoSweep}
              disabled={autoSweepRunning}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                autoSweepRunning 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoSweepRunning ? 'animate-spin' : ''}`} />
              <span>{autoSweepRunning ? "Numérisation..." : "Lancer Tournée"}</span>
            </button>
          </div>

          {/* Manual Numeric Barcode Key-in */}
          <form onSubmit={handleManualSubmit} className="bg-[#131E3D] p-3 rounded border border-slate-800 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Code-barres ou N° série (ex: 894102938104)..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono-numbers focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-1 rounded text-xs font-bold border border-slate-700"
            >
              Tester
            </button>
          </form>
        </div>

        {/* Recent Scan History Buffer Roll */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-mono-numbers">
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.recentScans} ({recentScans.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {recentScans.map(item => {
              const isLocationDiff = item.inventoryStatus === 'ECART_LOCALISATION';

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveAsset(item)}
                  className={`p-2 rounded text-start border transition-all text-xs ${
                    activeAsset?.id === item.id
                      ? 'bg-sky-950/70 border-sky-500 text-white'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex justify-between items-center font-mono-numbers text-[10px]">
                    <span className="text-sky-300 font-bold">{item.id}</span>
                    <span className={isLocationDiff ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                      {isLocationDiff ? "ÉCART LIEU" : "CONFORME"}
                    </span>
                  </div>
                  <div className="font-semibold truncate text-[11px] mt-0.5">
                    {getDisplayName(item)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                    {item.expectedBayLocation}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scanned Asset Live Evaluation & Action Panel (Right Side) */}
      <div className="w-full lg:w-[420px] bg-[#101A38] border-t lg:border-t-0 lg:border-s border-slate-800 p-4 lg:p-6 flex flex-col justify-between overflow-y-auto">
        {activeAsset ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono-numbers flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t.scannedItemCard}</span>
              </span>
              <span className="font-mono-numbers font-bold text-xs bg-slate-900 text-sky-300 px-2 py-0.5 rounded border border-slate-700">
                {activeAsset.id}
              </span>
            </div>

            {/* Asset Photo + Key Info */}
            <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
              <div className="h-40 w-full relative">
                <img
                  src={activeAsset.imageUrl}
                  alt={getDisplayName(activeAsset)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end text-xs">
                  <span className="bg-black/80 px-2 py-0.5 rounded font-mono-numbers text-sky-300 border border-slate-700">
                    PRÉVU: {activeAsset.expectedBayLocation}
                  </span>
                  
                  {activeAsset.inventoryStatus === 'ECART_LOCALISATION' ? (
                    <span className="bg-amber-900/90 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-600">
                      ÉCART LIEU ({activeAsset.scannedBayLocation})
                    </span>
                  ) : (
                    <span className="bg-emerald-900/90 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-600">
                      CONFORME IN SITU
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-white leading-tight">
                  {getDisplayName(activeAsset)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeAsset.category} &bull; {activeAsset.officialCode}
                </p>
              </div>
            </div>

            {/* Telemetry Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono-numbers">
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-sans">Code-Barres:</span>
                <span className="font-bold text-sky-300">{activeAsset.barcode}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-sans">N° de Série:</span>
                <span className="font-bold text-slate-200">{activeAsset.serialNumber}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-sans">Identifiant RFID:</span>
                <span className="font-bold text-indigo-300">{activeAsset.rfidTag}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] block font-sans">Masse:</span>
                <span className="font-bold text-amber-300">{activeAsset.weightKg} KG</span>
              </div>
            </div>

            {/* Location Check Alert if Mismatched */}
            {activeAsset.expectedBayLocation && !activeAsset.expectedBayLocation.startsWith(currentScanningBay) && (
              <div className="p-2.5 bg-amber-950/70 border border-amber-600 rounded text-xs text-amber-200">
                <strong className="block mb-0.5">Alerte Écart d'Emplacement :</strong>
                L'actif est attendu en <strong>{activeAsset.expectedBayLocation}</strong> mais est scanné dans la zone courante <strong>{currentScanningBay}</strong>. Il sera classé <em>ÉCART D'EMPLACEMENT</em> pour vérification.
              </div>
            )}

            {/* One-Thumb Big Confirm Button (44px target) */}
            <div className="pt-2">
              <button
                onClick={() => {
                  sound.playScanSuccess();
                  onReconcileAsset(activeAsset.id, currentScanningBay);
                }}
                className="w-full h-12 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all border border-sky-400"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>{t.commitScan} &bull; {activeAsset.id}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Scannez un code-barres pour démarrer l'inspection
          </div>
        )}
      </div>
    </div>
  );
};
