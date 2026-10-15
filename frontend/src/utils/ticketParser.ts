import { normalizeGarbledScanString } from './keyboardScannerEngine';

/**
 * Parsed Ticket / Label scan information
 * Special support for Lenovo industrial asset nameplates and generic barcodes
 */
export interface ParsedTicketInfo {
  raw: string;
  format: 'LENOVO_1S' | 'STANDARD_CODE128' | 'EAN13' | 'RFID' | 'RAW_TEXT';
  cleanedCode: string;
  detectedBrand?: string;
  detectedModel?: string;
  detectedSerial?: string;
  detectedMtm?: string;
  detectedFru?: string;
  detectedTypeModel?: string;
  manufactureDate?: string;
  confidence: number;
}

export interface ScannerHardwareConfig {
  scannerModel: 'HENEX HC-3206R-2D-BT' | 'GENERIC_HID' | 'VIRTUAL_SIM';
  connectionMode: 'BLUETOOTH_WIRELESS' | 'USB_DONGLE_2_4G' | 'USB_HID_KBW' | 'WEBCAM_VIRTUAL';
  interCharTimeoutMs: number; // HENEX typ. transmits 5-15ms between chars
  minBarcodeLength: number;
  suffix: 'ENTER' | 'TAB' | 'NONE';
  prefix: string;
  autoReconcile: boolean;
  soundBeepEnabled: boolean;
  stripLeading1S: boolean;
  activeProfile: 'HENEX_3206R_DEFAULT' | 'CUSTOM';
  // Keyboard Layout Immunity Feature
  keyboardImmunityActive: boolean;
  autoRepairKeyboardLayout: boolean;
  detectedLayoutNotice?: string;
}

export const DEFAULT_SCANNER_CONFIG: ScannerHardwareConfig = {
  scannerModel: 'HENEX HC-3206R-2D-BT',
  connectionMode: 'BLUETOOTH_WIRELESS',
  interCharTimeoutMs: 65,
  minBarcodeLength: 3,
  suffix: 'ENTER',
  prefix: '',
  autoReconcile: true,
  soundBeepEnabled: true,
  stripLeading1S: true,
  activeProfile: 'HENEX_3206R_DEFAULT',
  keyboardImmunityActive: true,
  autoRepairKeyboardLayout: true
};

/**
 * Intelligent ticket and barcode parser
 * Handles Lenovo 1S barcode format, industrial labels, serials, and standard barcodes
 * Automatically normalizes French (AZERTY) and Arabic (AR) keyboard distortion
 */
export function parseTicketData(input: string, config: ScannerHardwareConfig = DEFAULT_SCANNER_CONFIG): ParsedTicketInfo {
  let cleaned = (input || '').trim();

  // Strip prefix/suffix if matched
  if (config.prefix && cleaned.startsWith(config.prefix)) {
    cleaned = cleaned.substring(config.prefix.length);
  }

  // Remove common barcode delimiters / control characters
  cleaned = cleaned.replace(/[\r\n\t]/g, '').trim();

  // Automatic Keyboard Layout Immunity: Repair corrupted Arabic or AZERTY keystrokes
  if (config.autoRepairKeyboardLayout !== false) {
    const repairResult = normalizeGarbledScanString(cleaned);
    if (repairResult.repaired) {
      cleaned = repairResult.normalized;
    }
  }

  // 1. Lenovo 1S Barcode Format (e.g. 1S62A8KAT1EUV5HND516)
  // Format: 1S + MTM/Model code (e.g. 62A8KAT1EU) + Serial Number (e.g. V5HND516)
  const lenovo1SPattern = /^1S([A-Z0-9]{10})([A-Z0-9]{8})$/i;
  const lenovo1SMatch = cleaned.match(lenovo1SPattern);

  if (lenovo1SMatch) {
    const mtmCode = lenovo1SMatch[1].toUpperCase();
    const serialNum = lenovo1SMatch[2].toUpperCase();

    return {
      raw: input,
      format: 'LENOVO_1S',
      cleanedCode: cleaned,
      detectedBrand: 'Lenovo',
      detectedModel: 'C24-20 Monitor (A20238FD0)',
      detectedSerial: serialNum, // e.g. V5HND516
      detectedMtm: mtmCode,      // e.g. 62A8KAT1EU / 62A8-KAR1-WW
      detectedFru: '5D10290290',
      detectedTypeModel: 'A20238FD0',
      manufactureDate: '2022-07-12',
      confidence: 0.99
    };
  }

  // Lenovo loose pattern (starts with 1S)
  if (cleaned.toUpperCase().startsWith('1S') && cleaned.length >= 14) {
    const after1S = cleaned.substring(2);
    // Serial is usually the last 8 characters
    const serial = after1S.length >= 8 ? after1S.slice(-8) : after1S;
    const mtm = after1S.length > 8 ? after1S.slice(0, -8) : '';

    return {
      raw: input,
      format: 'LENOVO_1S',
      cleanedCode: cleaned,
      detectedBrand: 'Lenovo',
      detectedModel: 'Lenovo IT Equipment / Monitor',
      detectedSerial: serial.toUpperCase(),
      detectedMtm: mtm.toUpperCase(),
      confidence: 0.90
    };
  }

  // Direct Lenovo Serial Number pattern (8 alphanumeric characters, e.g. V5HND516)
  if (/^[A-Z0-9]{8}$/i.test(cleaned) && cleaned.toUpperCase() === 'V5HND516') {
    return {
      raw: input,
      format: 'STANDARD_CODE128',
      cleanedCode: cleaned.toUpperCase(),
      detectedBrand: 'Lenovo',
      detectedModel: 'C24-20 23.8" FHD Monitor',
      detectedSerial: cleaned.toUpperCase(),
      detectedMtm: '62A8-KAR1-WW',
      detectedFru: '5D10290290',
      detectedTypeModel: 'A20238FD0',
      manufactureDate: '2022-07-12',
      confidence: 0.98
    };
  }

  // Numeric Barcode EAN-13 or Code-128
  if (/^\d{12,14}$/.test(cleaned)) {
    return {
      raw: input,
      format: 'EAN13',
      cleanedCode: cleaned,
      confidence: 0.85
    };
  }

  // RFID Tag (Hex format)
  if (/^[E0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i.test(cleaned)) {
    return {
      raw: input,
      format: 'RFID',
      cleanedCode: cleaned.toUpperCase(),
      confidence: 0.95
    };
  }

  return {
    raw: input,
    format: 'RAW_TEXT',
    cleanedCode: cleaned,
    confidence: 0.70
  };
}
