import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Lightbulb, 
  CheckCircle2, 
  RotateCw, 
  History, 
  Barcode, 
  Camera, 
  CameraOff, 
  AlertTriangle, 
  Plus,
  Sliders,
  Cpu,
  Bluetooth,
  Radio,
  Usb,
  Sparkles,
  Info,
  Check,
  Search,
  Monitor,
  Printer,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { translateHardwareEventToChar, normalizeGarbledScanString } from '../utils/keyboardScannerEngine';
import { Asset, AssetCondition, Language } from '../types';
import { translations } from '../translations';
import { sound } from '../utils/audio';
import { 
  ScannerHardwareConfig, 
  DEFAULT_SCANNER_CONFIG, 
  ParsedTicketInfo, 
  parseTicketData 
} from '../utils/ticketParser';
import { HenexConfigModal } from './HenexConfigModal';
import { TicketPrintModal } from './TicketPrintModal';
import { TicketData } from './PhysicalAssetTag';

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
  const isAr = lang === 'ar';

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

  // HENEX HC-3206R Hardware Scanner State & Configuration
  const [scannerConfig, setScannerConfig] = useState<ScannerHardwareConfig>(() => {
    try {
      const saved = localStorage.getItem('kaf_henex_scanner_cfg');
      return saved ? JSON.parse(saved) : DEFAULT_SCANNER_CONFIG;
    } catch {
      return DEFAULT_SCANNER_CONFIG;
    }
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [scannerHardwareStatus, setScannerHardwareStatus] = useState<'READY' | 'SCANNING' | 'MATCHED' | 'UNKNOWN'>('READY');
  const [lastParsedTicket, setLastParsedTicket] = useState<ParsedTicketInfo | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [scannerPrintTickets, setScannerPrintTickets] = useState<TicketData[] | null>(null);

  // Persist scanner config
  const handleSaveScannerConfig = (newCfg: ScannerHardwareConfig) => {
    setScannerConfig(newCfg);
    try {
      localStorage.setItem('kaf_henex_scanner_cfg', JSON.stringify(newCfg));
    } catch {}
    showToast(isAr ? 'تم حفظ إعدادات قارئ HENEX بنجاح' : 'Configuration HENEX mise à jour');
  };

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3500);
  };

  // WebCam setup
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
          .catch((_err) => {
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

  // Core reconciliation logic when asset is matched
  const triggerScanOnAsset = useCallback((target: Asset, ticketInfo?: ParsedTicketInfo) => {
    if (scannerConfig.soundBeepEnabled) {
      sound.playScanSuccess();
    }
    setScanLaserColor('green');
    setTimeout(() => setScanLaserColor('red'), 600);

    setActiveAsset(target);
    onReconcileAsset(target.id, currentScanningBay);
    setScannerHardwareStatus('MATCHED');

    setRecentScans(prev => {
      const filtered = prev.filter(a => a.id !== target.id);
      return [target, ...filtered].slice(0, 5);
    });

    if (ticketInfo) {
      setLastParsedTicket(ticketInfo);
    }
    setUnknownCodePrompt(null);
  }, [currentScanningBay, onReconcileAsset, scannerConfig.soundBeepEnabled]);

  /**
   * Process raw scan payload from HENEX HC-3206R or Camera or Manual entry
   */
  const processRawScan = useCallback((rawInput: string) => {
    if (!rawInput || !rawInput.trim()) return;

    setScannerHardwareStatus('SCANNING');
    const parsed = parseTicketData(rawInput, scannerConfig);
    setLastParsedTicket(parsed);

    const query = parsed.cleanedCode.toLowerCase();
    const querySerial = (parsed.detectedSerial || '').toLowerCase();
    const queryBarcode = (parsed.cleanedCode || '').toLowerCase();

    // Matching order:
    // 1. Exact match on barcode (e.g. 1S62A8KAT1EUV5HND516 or 894102938102)
    // 2. Exact match on serialNumber (e.g. V5HND516)
    // 3. Exact match on asset id (e.g. AST-10502)
    // 4. Substring search if Lenovo 1S format
    let matchedAsset = assets.find(a => 
      a.barcode.toLowerCase() === query ||
      a.serialNumber.toLowerCase() === query ||
      a.id.toLowerCase() === query
    );

    if (!matchedAsset && querySerial) {
      matchedAsset = assets.find(a => a.serialNumber.toLowerCase() === querySerial);
    }

    if (!matchedAsset && parsed.format === 'LENOVO_1S') {
      matchedAsset = assets.find(a => 
        a.barcode.toLowerCase().includes(query) ||
        (querySerial && a.serialNumber.toLowerCase() === querySerial) ||
        a.name.toLowerCase().includes('lenovo') ||
        a.notes.toLowerCase().includes('lenovo')
      );
    }

    if (matchedAsset) {
      triggerScanOnAsset(matchedAsset, parsed);
      setUnknownCodePrompt(null);
      showToast(
        isAr 
          ? `تم رصد التيكاث ومطابقة الأصل: ${matchedAsset.officialCode} (${matchedAsset.nameAr || matchedAsset.name})`
          : `Ticket reconnu : ${matchedAsset.officialCode} - ${matchedAsset.name}`
      );
    } else {
      // Unknown asset discovered! (Scenario 3)
      if (scannerConfig.soundBeepEnabled) {
        sound.playAlert();
      }
      setScannerHardwareStatus('UNKNOWN');
      setUnknownCodePrompt(parsed.cleanedCode);
    }
  }, [assets, isAr, scannerConfig, triggerScanOnAsset]);

  /**
   * Global Hardware Scanner Keypress Capture Listener (HID Keyboard Emulation)
   * HENEX HC-3206R sends keystrokes with 5-25ms intervals ending in Enter
   */
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a modal or non-scanner input
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      
      // If user is focused on the manual input, let standard form submit handle it
      if (isInput && target?.id === 'manual-scanner-input') {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Enter key indicates end of barcode transmission from HENEX scanner
      if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') {
        if (buffer.length >= scannerConfig.minBarcodeLength) {
          e.preventDefault();
          const scannedText = buffer;
          buffer = '';
          processRawScan(scannedText);
        } else {
          buffer = '';
        }
        return;
      }

      // If characters come rapidly (< timeout), it's the physical scanner
      if (diff > scannerConfig.interCharTimeoutMs && buffer.length > 0) {
        buffer = ''; // timeout reached, reset buffer
      }

      // Hardware Keyboard Immunity: decode physical HID scan code (e.code) directly to standard ASCII
      if (scannerConfig.keyboardImmunityActive !== false) {
        const hardwareChar = translateHardwareEventToChar(e);
        if (hardwareChar && hardwareChar !== '\n' && hardwareChar !== '\t') {
          buffer += hardwareChar;
          return;
        }
      }

      // Fallback: If not matched by scan code, normalize any localized/garbled character
      if (e.key && e.key.length === 1) {
        const repaired = normalizeGarbledScanString(e.key);
        buffer += repaired.normalized;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processRawScan, scannerConfig.interCharTimeoutMs, scannerConfig.keyboardImmunityActive, scannerConfig.minBarcodeLength]);

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
    const repaired = normalizeGarbledScanString(manualCode.trim()).normalized;
    processRawScan(repaired);
    setManualCode('');
  };

  const manualRepairPreview = React.useMemo(() => {
    if (!manualCode.trim()) return null;
    const res = normalizeGarbledScanString(manualCode.trim());
    return res.repaired ? res : null;
  }, [manualCode]);

  // Quick 1-click test with the user's uploaded Lenovo C24-20 ticket from Image 2
  const handleSimulateLenovoTicketScan = () => {
    processRawScan('1S62A8KAT1EUV5HND516');
  };

  const getDisplayName = (item: Asset) => {
    if (lang === 'fr') return item.nameFr || item.name;
    if (lang === 'ar') return item.nameAr;
    return item.name;
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#0B132B] text-slate-100 overflow-y-auto">
      {/* Handheld Viewfinder Viewport (Left/Top) */}
      <div className="flex-1 p-4 lg:p-6 flex flex-col justify-between max-w-4xl mx-auto w-full">
        {/* Terminal Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                scannerHardwareStatus === 'MATCHED' ? 'bg-emerald-400' :
                scannerHardwareStatus === 'UNKNOWN' ? 'bg-amber-400' :
                scannerHardwareStatus === 'SCANNING' ? 'bg-sky-400 animate-ping' :
                'bg-emerald-400 animate-pulse'
              }`} />
              <h2 className="font-bold text-sm text-sky-400 font-mono-numbers uppercase tracking-wider flex items-center gap-2">
                <span>{t.scannerTitle}</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{t.scannerSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* HENEX HC-3206R Hardware Config Button */}
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 shadow-sm transition-all"
              title={t.scannerHardwareConfigBtn}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">HENEX HC-3206R</span>
              <Sliders className="w-3 h-3 text-emerald-400" />
            </button>

            {/* Real Camera (Webcam) Toggle */}
            <button
              onClick={() => setUseRealCamera(!useRealCamera)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
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
              className={`p-1.5 rounded border transition-colors ${
                torchActive 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' 
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={t.flashTorch}
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </button>

            {/* Current Auditing Location Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs font-mono-numbers">
              <span className="text-slate-400">{isAr ? 'الرف الميداني:' : 'BAIE:'}</span>
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

        {/* HENEX Scanner Hardware Status Banner */}
        <div className="my-2 p-2.5 bg-[#101F3B] border border-slate-700 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              {scannerConfig.connectionMode === 'BLUETOOTH_WIRELESS' ? (
                <Bluetooth className="w-4 h-4 text-sky-400" />
              ) : scannerConfig.connectionMode === 'USB_DONGLE_2_4G' ? (
                <Radio className="w-4 h-4 text-emerald-400" />
              ) : (
                <Usb className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-mono">HENEX HC-3206R (S/FIL)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800">
                  {scannerConfig.connectionMode === 'BLUETOOTH_WIRELESS' ? 'BT SANS FIL' : 
                   scannerConfig.connectionMode === 'USB_DONGLE_2_4G' ? '2.4G DONGLE' : 'USB FILAIRE'}
                </span>
                <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.2 rounded border border-sky-800 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{isAr ? 'مناعة كاملة للغة الكيبورد (AZERTY / AR / EN)' : 'Clavier Immunisé (AZERTY / AR / EN)'}</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isAr 
                  ? 'القارئ متصل ومبرمج لفك رموز التيكاث بأمان بغض النظر عن لغة الكيبورد النشطة في ويندوز' 
                  : 'Scanner sans fil prêt. Décodage matériel direct insensible à la disposition active Windows.'}
              </span>
            </div>
          </div>

          {/* Quick Ticket Test Trigger Button */}
          <button
            onClick={handleSimulateLenovoTicketScan}
            className="px-2.5 py-1.5 bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-600 rounded text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title={t.testLenovoScanBtn}
          >
            <Monitor className="w-3.5 h-3.5 text-sky-400" />
            <span>{isAr ? 'مسح تيكاث Lenovo C24-20 (تجربة)' : 'Tester Étiquette Lenovo (Image 2)'}</span>
          </button>
        </div>

        {cameraError && (
          <div className="my-2 p-2 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded">
            {cameraError}
          </div>
        )}

        {toastNotification && (
          <div className="my-2 p-2.5 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs rounded flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastNotification}</span>
          </div>
        )}

        {/* Optical Scanning Reticle & Camera Emulation / Live Stream */}
        <div className="relative my-2 aspect-video sm:aspect-[16/9] bg-slate-950 rounded-lg border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center group">
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
          <div className="absolute inset-10 sm:inset-14 border border-sky-500/40 rounded flex flex-col justify-between p-3 pointer-events-none z-10">
            <div className="flex justify-between">
              <span className="w-4 h-4 border-t-2 border-s-2 border-sky-400" />
              <span className="w-4 h-4 border-t-2 border-e-2 border-sky-400" />
            </div>
            
            <div className="self-center flex flex-col items-center gap-2">
              <div className="w-48 sm:w-64 h-24 border border-dashed border-sky-400/60 rounded flex items-center justify-center bg-sky-950/20 backdrop-blur-[1px]">
                <div className="text-center">
                  <Barcode className="w-8 h-8 text-sky-400/80 mx-auto animate-pulse" />
                  <span className="text-[10px] font-mono-numbers text-sky-300 uppercase tracking-widest block mt-1">
                    {useRealCamera ? t.webcamActive : "HENEX 2D LASER SENSOR ACTIVE"}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-300 bg-black/70 px-2.5 py-0.5 rounded font-mono-numbers border border-slate-700">
                {isAr ? 'وجه شعاع القارئ HENEX نحو باركود التيكاث' : 'VISEZ L\'ÉTIQUETTE AVEC LE SCANNER HENEX'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="w-4 h-4 border-b-2 border-s-2 border-sky-400" />
              <span className="w-4 h-4 border-b-2 border-e-2 border-sky-400" />
            </div>
          </div>

          {/* Quick Trigger Button overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20">
            <div className="bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] font-mono-numbers text-emerald-400 border border-emerald-900/60">
              {useRealCamera ? "WEBCAM SENSOR ACTIVE" : "HENEX HC-3206R (HID KEYBOARD LISTEN)"}
            </div>

            <button
              onClick={() => {
                const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                triggerScanOnAsset(randomAsset);
              }}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 rounded font-bold text-xs shadow-lg flex items-center gap-1.5 active:scale-95 transition-all border border-sky-400/40"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isAr ? "مسح الأصل الحالي" : "Déclencher Scan In Situ"}</span>
            </button>
          </div>
        </div>

        {/* Detailed Parsed Ticket Inspection Card (If Ticket scanned) */}
        {lastParsedTicket && (
          <div className="my-2 p-3 bg-slate-900 border border-sky-600/70 rounded-lg text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-white">
                  {lastParsedTicket.format === 'LENOVO_1S' 
                    ? t.ticketLenovoDetected 
                    : isAr ? 'معلومات التيكاث المقروءة' : 'Données Décodées de l\'Étiquette'}
                </span>
                <span className="text-[10px] bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-800">
                  {lastParsedTicket.format}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                Confiance: {Math.round(lastParsedTicket.confidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t.detectedSerialLabel}:</span>
                <span className="font-bold text-emerald-300">{lastParsedTicket.detectedSerial || 'N/A'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t.detectedMtmLabel}:</span>
                <span className="font-bold text-sky-300">{lastParsedTicket.detectedMtm || 'N/A'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t.detectedFruLabel}:</span>
                <span className="font-bold text-amber-300">{lastParsedTicket.detectedFru || 'N/A'}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t.detectedModelLabel}:</span>
                <span className="font-bold text-white truncate block">{lastParsedTicket.detectedModel || 'Standard'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Unknown Code Banner Alert (Scenario 3 from user prompt!) */}
        {unknownCodePrompt && (
          <div className="my-2 p-3 bg-amber-950/90 border-2 border-amber-500 rounded-lg flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <strong>{isAr ? 'كود غير مسجل في منظومة الأصول' : 'Code Inconnu dans le Répertoire ERP'} ({unknownCodePrompt}) :</strong>
                <p className="text-[11px] text-amber-300">
                  {isAr 
                    ? 'تم مسح هذه التيكاث فعلياً بواسطة قارئ HENEX لكنها غير مدرجة في السجلات الدفترية. أضفها في قائمة الأصول غير المسجلة.'
                    : "Cet équipement a été scanné avec succès mais n'existe pas dans le système. Enregistrez-le dans la liste des Actifs Non Enregistrés."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  sound.playTap();
                  setScannerPrintTickets([{
                    tagNumber: `DISCOV-2026-${Math.floor(100 + Math.random() * 899)}`,
                    barcode: unknownCodePrompt,
                    serialNumber: lastParsedTicket?.detectedSerial || 'SN-UNKNOWN',
                    description: lastParsedTicket?.detectedModel ? `Équipement ${lastParsedTicket.detectedModel}` : 'Matériel inconnu constaté in-situ',
                    location: currentScanningBay,
                    date: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    operator: 'TECH-941',
                    statusText: 'ACTIF NON ENREGISTRÉ (BALISAGE IN-SITU)',
                    category: 'ÉQUIPEMENT INDUSTRIEL'
                  }]);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
                title={isAr ? 'طباعة تيكات فورية لهذا الأصل غير المسجل' : 'Imprimer une étiquette de balisage immédiate'}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة التيكات فورا' : 'Imprimer Étiquette'}</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenDiscoveryModalWithCode) {
                    onOpenDiscoveryModalWithCode(unknownCodePrompt);
                  }
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إنشاء بطاقة اكتشاف' : 'Créer Fiche Découverte'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Field Controls Bar: Rapid sweep + Manual Barcode entry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Rapid Auto-Sweep simulator */}
          <div className="bg-[#131E3D] p-3 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">{t.rapidSweep}</div>
              <div className="text-[11px] text-slate-400">
                {isAr 
                  ? "جولة مسح متسلسلة عالية السرعة (5 أصول متتالية)" 
                  : "Tournée séquentielle haute cadence (5 actifs consécutifs)"}
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
          <div className="bg-[#131E3D] p-3 rounded border border-slate-800 space-y-2">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                id="manual-scanner-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={isAr ? "كود التيكاث أو الرقم التسلسلي (مثال: 1S62A8KAT1EUV5HND516)..." : "Code-barres ou N° série (ex: 1S62A8KAT1EUV5HND516)..."}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-1 rounded text-xs font-bold border border-slate-700 transition-colors"
              >
                {isAr ? 'بحث / مطابقة' : 'Rechercher'}
              </button>
            </form>

            {manualRepairPreview && (
              <div className="bg-emerald-950/80 border border-emerald-600/70 p-2 rounded text-[11px] flex items-center justify-between text-emerald-200 animate-fadeIn">
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {isAr
                      ? `تم كشف تشويش لوحة المفاتيح (${manualRepairPreview.detectedLayout === 'ARABIC_AR' ? 'عربي' : 'فرنسي AZERTY'}) -> النتيجة المصححة: ${manualRepairPreview.normalized}`
                      : `Disposition ${manualRepairPreview.detectedLayout === 'ARABIC_AR' ? 'Arabe' : 'AZERTY'} corrigée automatiquement : ${manualRepairPreview.normalized}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setManualCode(manualRepairPreview.normalized)}
                  className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold shrink-0 ml-2"
                >
                  {isAr ? 'تطبيق التصحيح' : 'Appliquer'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Scan History Buffer Roll */}
        <div className="mt-3 pt-3 border-t border-slate-800">
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
                <span className="font-bold text-sky-300 truncate block">{activeAsset.barcode}</span>
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

            {/* Action Buttons: Confirm scan & Re-print ticket */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  sound.playScanSuccess();
                  onReconcileAsset(activeAsset.id, currentScanningBay);
                  showToast(isAr ? 'تم تأكيد واعتماد مسح الأصل بنجاح' : 'Scan confirmé et enregistré');
                }}
                className="w-full h-12 bg-[#0284C7] hover:bg-[#0369a1] text-white rounded font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all border border-sky-400"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>{t.commitScan} &bull; {activeAsset.id}</span>
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  setScannerPrintTickets([{
                    tagNumber: activeAsset.officialCode || activeAsset.id,
                    barcode: activeAsset.barcode,
                    serialNumber: activeAsset.serialNumber,
                    description: isAr ? (activeAsset.nameAr || activeAsset.name) : activeAsset.name,
                    location: activeAsset.expectedBayLocation || currentScanningBay,
                    date: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    operator: 'TECH-941',
                    statusText: 'ÉTIQUETTE OFFICIELLE D\'IMMOBILISATION',
                    category: activeAsset.category
                  }]);
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                title={isAr ? 'طباعة ملصق تيكات لهذا الأصل (لتعويض الملصقات التالفة)' : 'Réimprimer l\'étiquette physique pour cet actif'}
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'طباعة / تعويض تيكات الأصل' : 'Imprimer / Remplacer l\'Étiquette'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center p-6">
            <div>
              <Barcode className="w-12 h-12 text-slate-600 mx-auto mb-2 animate-pulse" />
              <span>{isAr ? "قم بتوجيه قارئ HENEX نحو تيكاث الأصل لبدء الفحص" : "Scannez une étiquette avec le lecteur HENEX pour démarrer"}</span>
            </div>
          </div>
        )}
      </div>

      {/* HENEX Hardware Configuration Modal */}
      <HenexConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={scannerConfig}
        onSaveConfig={handleSaveScannerConfig}
        lang={lang}
      />

      {/* 🖨️ Physical Ticket Print Studio Modal */}
      {scannerPrintTickets && (
        <TicketPrintModal
          isOpen={true}
          onClose={() => setScannerPrintTickets(null)}
          tickets={scannerPrintTickets}
          lang={lang}
        />
      )}
    </div>
  );
};
