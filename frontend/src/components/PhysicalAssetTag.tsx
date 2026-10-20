import React from 'react';
import { KafLogo } from './KafLogo';
import { PureCode128Svg } from '../utils/pureBarcode';

export interface TicketData {
  tagNumber: string;
  barcode: string;
  serialNumber?: string;
  description: string;
  location: string;
  date: string;
  operator?: string;
  statusText?: string;
  category?: string;
}

interface PhysicalAssetTagProps {
  data: TicketData;
  format?: 'thermal_70x40' | 'thermal_50x30' | 'thermal_43x20' | 'standard_badge';
  showBarcode?: boolean;
  showLogo?: boolean;
}

export const PhysicalAssetTag: React.FC<PhysicalAssetTagProps> = ({
  data,
  format = 'thermal_70x40',
  showBarcode = true,
  showLogo = true
}) => {
  // ✅ مقاس 43mm × 20mm (مخصص للمساحات الضيقة جداً)
  if (format === 'thermal_43x20') {
    return (
      <div 
        className="kaf-print-ticket bg-white text-black font-sans select-none flex flex-col justify-between"
        style={{ 
          width: '43mm', 
          height: '20mm', 
          padding: '0.5mm', 
          boxSizing: 'border-box', 
          overflow: 'hidden',
          margin: '0'
        }}
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-black pb-[0.2mm] mb-[0.2mm] gap-1">
          <div className="flex items-center gap-1 overflow-hidden">
            {showLogo && <KafLogo variant="badge" size="xs" />}
            <div className="truncate">
              <div className="text-[6px] font-black tracking-wider uppercase truncate leading-none">KAF-INVENTAIRE</div>
            </div>
          </div>
          <span className="font-mono text-[6px] font-black border border-black px-[1px] rounded bg-black text-white shrink-0 truncate max-w-[15mm] leading-none">
            {data.tagNumber}
          </span>
        </div>

        {/* Description & Serial (1 line only) */}
        <div className="text-[7px] font-bold leading-tight truncate w-full mb-[0.2mm]">
          {data.description}
        </div>
        
        <div className="flex justify-between text-[6px] font-mono border-t border-neutral-300 pt-[0.2mm] mb-[0.2mm] gap-1 leading-none">
          <span className="truncate w-1/2">SN: <strong className="text-black font-black">{data.serialNumber || 'N/A'}</strong></span>
          <span className="truncate w-1/2 text-right">LOC: <strong className="text-black font-black">{data.location}</strong></span>
        </div>

        {/* Barcode Only (Very compact height) */}
        {showBarcode && (
          <div className="w-full flex justify-center items-center mt-auto overflow-hidden leading-none">
            <PureCode128Svg 
              value={data.barcode} 
              width={1.2} 
              height={14} // ✅ تصغير ارتفاع الباركود ليناسب 20mm
              showText={false} // إخفاء النص تحت الباركود لتوفير المساحة (يمكنك جعله true إذا أردت)
            />
          </div>
        )}
      </div>
    );
  }

  if (format === 'thermal_50x30') {
    return (
      <div 
        className="kaf-print-ticket bg-white text-black font-sans select-none flex flex-col justify-between"
        style={{ width: '50mm', height: '29mm', padding: '0.8mm', boxSizing: 'border-box', overflow: 'hidden', margin: '0' }}
      >
        <div className="flex items-center justify-between border-b border-black pb-0.5 mb-1 gap-1">
          <div className="flex items-center gap-1 overflow-hidden">
            {showLogo && <KafLogo variant="badge" size="xs" />}
            <div className="truncate">
              <div className="text-[8px] font-black tracking-wider uppercase truncate">KAF-INVENTAIRE</div>
              <div className="text-[6px] text-neutral-600 font-bold uppercase leading-none truncate">BALISAGE IN-SITU</div>
            </div>
          </div>
          <span className="font-mono text-[8px] font-black border border-black px-1 rounded bg-black text-white shrink-0 truncate max-w-[18mm]">
            {data.tagNumber}
          </span>
        </div>
        <div className="text-[9px] font-bold leading-tight mb-0.5 truncate w-full">{data.description}</div>
        <div className="flex justify-between text-[7px] font-mono border-t border-b border-neutral-300 py-0.5 mb-1 gap-1">
          <span className="truncate w-1/2">SN: <strong className="text-black font-black">{data.serialNumber || 'N/A'}</strong></span>
          <span className="truncate w-1/2 text-right">LOC: <strong className="text-black font-black">{data.location}</strong></span>
        </div>
        {showBarcode && (
          <div className="w-full flex justify-center items-center mt-auto overflow-hidden">
            <PureCode128Svg value={data.barcode} width={1.4} height={26} showText={true} />
          </div>
        )}
      </div>
    );
  }

  // Standard 70mm x 40mm
  return (
    <div 
      className="kaf-print-ticket bg-white text-black font-sans select-none flex flex-col justify-between"
      style={{ width: '70mm', height: '40mm', padding: '1.5mm', boxSizing: 'border-box', overflow: 'hidden', margin: '0' }}
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-1.5 gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {showLogo && <KafLogo variant="badge" size="xs" />}
          <div className="truncate">
            <div className="text-[10px] font-black tracking-wider text-black truncate">KOTAMA AGRI-FOOD | INVENTAIRE</div>
            <div className="text-[7px] font-extrabold text-neutral-700 tracking-wide uppercase truncate">{data.statusText || 'ÉTIQUETTE D\'IDENTIFICATION'}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[9px] font-black bg-black text-white px-1.5 py-0.5 rounded truncate max-w-[25mm]">{data.tagNumber}</div>
          <div className="text-[6px] text-neutral-600 font-mono mt-0.5">{data.date.substring(0, 10)}</div>
        </div>
      </div>
      <div className="mb-1 flex-1 overflow-hidden">
        <div className="text-[10px] font-extrabold leading-tight text-neutral-900 truncate w-full mb-1">{data.description}</div>
        <div className="grid grid-cols-2 gap-1 text-[7px] font-mono bg-neutral-100 p-1 rounded border border-neutral-300">
          <div className="truncate"><span className="text-neutral-500">SN:</span>{' '}<strong className="text-black font-black">{data.serialNumber || 'N/A'}</strong></div>
          <div className="truncate text-right"><span className="text-neutral-500">LOC:</span>{' '}<strong className="text-black font-black">{data.location}</strong></div>
          <div className="truncate"><span className="text-neutral-500">OP:</span>{' '}<strong className="text-black">{data.operator || 'TECH-941'}</strong></div>
          <div className="truncate text-right"><span className="text-neutral-500">STATUT:</span>{' '}<strong className="text-neutral-800">ATTENTE</strong></div>
        </div>
      </div>
      {showBarcode && (
        <div className="w-full flex justify-center items-center pt-1 border-t-2 border-black mt-auto overflow-hidden">
          <PureCode128Svg value={data.barcode} width={1.7} height={34} showText={true} />
        </div>
      )}
      <div className="mt-1 pt-0.5 border-t border-neutral-300 flex justify-between items-center text-[6px] text-neutral-500 font-mono">
        <span>PROPRIÉTÉ EXCLUSIVE KAF SPA - NE PAS DÉCOLLER</span>
        <span>CODE: {data.barcode}</span>
      </div>
    </div>
  );
};