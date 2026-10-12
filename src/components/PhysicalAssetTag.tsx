import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { KafLogo } from './KafLogo';

export interface TicketData {
  tagNumber: string;        // e.g. DISCOV-2026-402 or IMMO-2026-00502
  barcode: string;          // Barcode string
  serialNumber?: string;    // Serial Number
  description: string;      // Asset name / description
  location: string;         // Bay / Rack / Zone
  date: string;             // Date found or recorded
  operator?: string;        // Operator ID
  statusText?: string;      // e.g. "DÉCOUVERTE IN-SITU" or "ACTIF NON CATALOGUÉ"
  category?: string;        // Category
}

interface PhysicalAssetTagProps {
  data: TicketData;
  format?: 'thermal_70x40' | 'thermal_50x30' | 'standard_badge';
  showQr?: boolean;
  showBarcode?: boolean;
  showLogo?: boolean;
}

export const PhysicalAssetTag: React.FC<PhysicalAssetTagProps> = ({
  data,
  format = 'thermal_70x40',
  showQr = true,
  showBarcode = true,
  showLogo = true
}) => {
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate standard Code-128 barcode
  useEffect(() => {
    if (barcodeSvgRef.current && showBarcode && data.barcode) {
      try {
        JsBarcode(barcodeSvgRef.current, data.barcode, {
          format: 'CODE128',
          width: format === 'thermal_50x30' ? 1.4 : 1.7,
          height: format === 'thermal_50x30' ? 32 : 42,
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          textMargin: 2,
          margin: 0,
          lineColor: '#000000',
          background: '#ffffff'
        });
      } catch (err) {
        console.error('Failed to generate Code128 barcode:', err);
      }
    }
  }, [data.barcode, format, showBarcode]);

  // Generate 2D QR Code
  useEffect(() => {
    if (showQr) {
      const qrPayload = JSON.stringify({
        tag: data.tagNumber,
        bar: data.barcode,
        sn: data.serialNumber || 'N/A',
        loc: data.location,
        desc: data.description,
        org: 'KAF-DZ'
      });

      QRCode.toDataURL(qrPayload, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code:', err));
    }
  }, [data, showQr]);

  if (format === 'thermal_50x30') {
    // Compact 50mm x 30mm thermal label
    return (
      <div className="kaf-print-ticket w-[280px] bg-white text-black p-2 rounded border-2 border-black font-sans select-none shadow-sm flex flex-col justify-between">
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-black pb-1 mb-1">
          <div className="flex items-center gap-1.5">
            {showLogo && <KafLogo variant="badge" size="xs" />}
            <div>
              <div className="text-[9px] font-black tracking-wider uppercase">KAF-INVENTAIRE</div>
              <div className="text-[7px] text-neutral-600 font-bold uppercase leading-none">BALISAGE IN-SITU</div>
            </div>
          </div>
          <span className="font-mono text-[10px] font-black border border-black px-1 rounded bg-black text-white">
            {data.tagNumber}
          </span>
        </div>

        {/* Description & Serial */}
        <div className="text-[10px] font-bold line-clamp-1 leading-tight mb-1">
          {data.description}
        </div>
        <div className="flex justify-between text-[8px] font-mono border-t border-b border-neutral-300 py-0.5 mb-1">
          <span>SN: <strong className="text-black font-black">{data.serialNumber || 'NON DÉFINI'}</strong></span>
          <span>LOC: <strong className="text-black font-black">{data.location}</strong></span>
        </div>

        {/* Barcode & QR Code */}
        <div className="flex items-center justify-between gap-1">
          {showBarcode && (
            <div className="flex-1 flex justify-center overflow-hidden">
              <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
            </div>
          )}
          {showQr && qrDataUrl && (
            <div className="w-10 h-10 shrink-0 border border-black p-0.5 bg-white">
              <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard 70mm x 40mm or Badge Format
  return (
    <div className="kaf-print-ticket w-[360px] bg-white text-black p-3 rounded-md border-2 border-black font-sans select-none shadow-md flex flex-col justify-between">
      {/* Header Band */}
      <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2">
        <div className="flex items-center gap-2">
          {showLogo && <KafLogo variant="badge" size="xs" />}
          <div>
            <div className="text-[11px] font-black tracking-wider text-black">
              KOTAMA AGRI-FOOD | INVENTAIRE
            </div>
            <div className="text-[8px] font-extrabold text-neutral-700 tracking-wide uppercase">
              {data.statusText || 'ÉTIQUETTE D\'IDENTIFICATION D\'ACTIF PHYSIQUE'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs font-black bg-black text-white px-2 py-0.5 rounded">
            {data.tagNumber}
          </div>
          <div className="text-[7px] text-neutral-600 font-mono mt-0.5">
            {data.date.substring(0, 10)}
          </div>
        </div>
      </div>

      {/* Designation / Equipment details */}
      <div className="mb-2">
        <div className="text-[11px] font-extrabold leading-snug text-neutral-900 line-clamp-2">
          {data.description}
        </div>
        <div className="grid grid-cols-2 gap-1 text-[9px] font-mono mt-1.5 bg-neutral-100 p-1.5 rounded border border-neutral-300">
          <div>
            <span className="text-neutral-500">N° SÉRIE :</span>{' '}
            <strong className="text-black font-black">{data.serialNumber || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-neutral-500">EMPLACEMENT :</span>{' '}
            <strong className="text-black font-black">{data.location}</strong>
          </div>
          <div>
            <span className="text-neutral-500">INVENTORIEUR :</span>{' '}
            <strong className="text-black">{data.operator || 'TECH-941'}</strong>
          </div>
          <div>
            <span className="text-neutral-500">STATUT :</span>{' '}
            <strong className="text-neutral-800">EN ATTENTE ARBITRAGE</strong>
          </div>
        </div>
      </div>

      {/* Codes Area: Code-128 Barcode + 2D QR Code */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t-2 border-black">
        {showBarcode && (
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
            <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
          </div>
        )}

        {showQr && qrDataUrl && (
          <div className="flex flex-col items-center shrink-0">
            <div className="w-14 h-14 border border-black p-0.5 bg-white rounded">
              <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
            <span className="text-[7px] font-mono font-bold mt-0.5 text-neutral-600 uppercase">
              SCAN 2D
            </span>
          </div>
        )}
      </div>

      {/* Micro-footer security strip */}
      <div className="mt-2 pt-1 border-t border-neutral-300 flex justify-between items-center text-[7px] text-neutral-500 font-mono">
        <span>PROPRIÉTÉ EXCLUSIVE KAF SPA - NE PAS DÉCOLLER</span>
        <span>CODE: {data.barcode}</span>
      </div>
    </div>
  );
};
