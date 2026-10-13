/**
 * KAF-INVENTAIRE - Hardware Scanner Layout Immunity Engine
 * 
 * Solves the critical problem where physical barcode readers (USB/Bluetooth HID emulation)
 * send keystrokes that get distorted when the operating system (Windows) keyboard layout 
 * is set to French (AZERTY), Arabic (العربية), German (QWERTZ), etc.
 * 
 * Works by:
 * 1. Directly intercepting physical USB HID `event.code` scan codes (hardware level, layout-independent)
 * 2. Real-time ASCII translation matrix
 * 3. Heuristic post-processing & garbled string repair for pasted or input-captured text
 */

// Physical code translation to Standard ASCII (US QWERTY / Standard Barcode charset)
const CODE_TO_UNSHIFTED_CHAR: Record<string, string> = {
  // Letters
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E',
  KeyF: 'F', KeyG: 'G', KeyH: 'H', KeyI: 'I', KeyJ: 'J',
  KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N', KeyO: 'O',
  KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T',
  KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y',
  KeyZ: 'Z',

  // Digits (Top Row)
  Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',

  // Numpad
  Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4', Numpad5: '5',
  Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9', Numpad0: '0',
  NumpadAdd: '+', NumpadSubtract: '-', NumpadMultiply: '*', NumpadDivide: '/',
  NumpadDecimal: '.',

  // Punctuation & Symbols
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Space: ' '
};

// Shifted variants on standard barcode scanners
const CODE_TO_SHIFTED_CHAR: Record<string, string> = {
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E',
  KeyF: 'F', KeyG: 'G', KeyH: 'H', KeyI: 'I', KeyJ: 'J',
  KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N', KeyO: 'O',
  KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T',
  KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y',
  KeyZ: 'Z',

  Digit1: '!', Digit2: '@', Digit3: '#', Digit4: '$', Digit5: '%',
  Digit6: '^', Digit7: '&', Digit8: '*', Digit9: '(', Digit0: ')',

  Minus: '_',
  Equal: '+',
  BracketLeft: '{',
  BracketRight: '}',
  Backslash: '|',
  Semicolon: ':',
  Quote: '"',
  Backquote: '~',
  Comma: '<',
  Period: '>',
  Slash: '?',
  Space: ' '
};

/**
 * Translates a KeyboardEvent's physical `code` to the intended ASCII barcode character,
 * completely bypassing whatever language or keyboard layout Windows is currently set to.
 */
export function translateHardwareEventToChar(
  e: { code: string; key?: string; shiftKey?: boolean }
): string | null {
  const code = e.code;
  if (!code) return null;

  // Suffix/terminators
  if (code === 'Enter' || code === 'NumpadEnter') {
    return '\n';
  }
  if (code === 'Tab') {
    return '\t';
  }

  if (e.shiftKey) {
    if (CODE_TO_SHIFTED_CHAR[code]) {
      return CODE_TO_SHIFTED_CHAR[code];
    }
  } else {
    if (CODE_TO_UNSHIFTED_CHAR[code]) {
      return CODE_TO_UNSHIFTED_CHAR[code];
    }
  }

  // Fallback for special keys
  return null;
}

/**
 * Mapping table from Arabic layout characters back to English QWERTY
 */
const ARABIC_TO_QWERTY_MAP: Record<string, string> = {
  // Letters
  'ض': 'Q', 'ص': 'W', 'ث': 'E', 'ق': 'R', 'ف': 'T',
  'غ': 'Y', 'ع': 'U', 'ه': 'I', 'خ': 'O', 'ح': 'P',
  'ج': '[', 'د': ']',
  'ش': 'A', 'س': 'S', 'ي': 'D', 'ب': 'F', 'ل': 'G',
  'ا': 'H', 'ت': 'J', 'ن': 'K', 'م': 'L', 'ك': ';', 'ط': "'",
  'ئ': 'Z', 'ء': 'X', 'ؤ': 'C', 'ر': 'V', 'لا': 'B', 'لآ': 'B', 'لأ': 'B',
  'ى': 'N', 'ة': 'M', 'و': ',', 'ز': '.', 'ظ': '/',

  // Shifted Arabic keys
  'َ': 'Q', 'ً': 'W', 'ُ': 'E', 'ٌ': 'R', 'لإ': 'T', 'إ': 'Y', '‘': 'U', '÷': 'I', '×': 'O', '؛': 'P',
  'ِ': 'A', 'ٍ': 'S', ']' : 'D', '[': 'F', 'أ': 'H', 'ـ': 'J', '،': 'K', '/': 'L', ':': ';', '"': "'",
  '~': 'Z', 'ْ': 'X', '}': 'C', '{': 'V', 'آ': 'B', '’': 'N', ',': 'M'
};

// Eastern Arabic digits (Arabic-Indic)
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

/**
 * French AZERTY unshifted top-row characters that turn digits into symbols:
 * & -> 1, é -> 2, " -> 3, ' -> 4, ( -> 5, - -> 6, è -> 7, _ -> 8, ç -> 9, à -> 0
 */
const AZERTY_GIBBERISH_NUMBERS: Record<string, string> = {
  '&': '1',
  'é': '2',
  'É': '2',
  '"': '3',
  "'": '4',
  '(': '5',
  '§': '6',
  'è': '7',
  'È': '7',
  '_': '8',
  'ç': '9',
  'Ç': '9',
  'à': '0',
  'À': '0'
};

/**
 * Heuristic detector & garbled text cleaner.
 * If barcode scanner output was captured into an input or clipboard while Windows was in
 * French AZERTY or Arabic mode, this automatically repairs and recovers the original asset tag.
 * 
 * Examples:
 * - "AST-&à'çé" -> "AST-10492" (AZERTY numbers)
 * - "شسف-10492" -> "AST-10492" (Arabic keyboard active)
 * - "1س62ء8كءت1ع" -> "1S62A8KAT1E..." (Lenovo 1S under Arabic layout)
 * - "١٠٤٩٢" -> "10492" (Arabic-Indic numbers)
 */
export function normalizeGarbledScanString(raw: string): {
  normalized: string;
  repaired: boolean;
  detectedLayout?: 'AZERTY_FR' | 'ARABIC_AR' | 'CLEAN_ASCII';
} {
  if (!raw || typeof raw !== 'string') {
    return { normalized: '', repaired: false, detectedLayout: 'CLEAN_ASCII' };
  }

  let text = raw.trim();
  let repaired = false;
  let detectedLayout: 'AZERTY_FR' | 'ARABIC_AR' | 'CLEAN_ASCII' = 'CLEAN_ASCII';

  // 1. Check for Arabic characters
  const hasArabicChars = /[\u0600-\u06FF]/.test(text);
  if (hasArabicChars) {
    detectedLayout = 'ARABIC_AR';
    repaired = true;

    // First replace Arabic-Indic digits
    text = text.replace(/[٠-٩]/g, (ch) => ARABIC_INDIC_DIGITS[ch] || ch);

    // Replace combined ligature 'لا'
    text = text.replace(/لا/g, 'B');
    text = text.replace(/لآ/g, 'B');
    text = text.replace(/لأ/g, 'B');

    // Replace each Arabic character by its QWERTY counterpart
    let converted = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ARABIC_TO_QWERTY_MAP[ch]) {
        converted += ARABIC_TO_QWERTY_MAP[ch];
      } else {
        converted += ch;
      }
    }
    text = converted;
  }

  // 2. Check for AZERTY digit artifacts (e.g. &é"'(-è_çà inside codes like AST-&à'çé or IMMO-éàé'...)
  // Typical asset code patterns contain uppercase letters, hyphen, followed by AZERTY characters
  const containsAzertySymbols = /[&éÉ"'\(èÈ_çÇàÀ]/.test(text);
  if (containsAzertySymbols) {
    // If text looks like an asset tag or serial (e.g. AST-, IMMO-, SKU-, SN-, etc.)
    // or has a concentration of AZERTY shifted symbols:
    const azertyMatches = text.match(/[&éÉ"'\(èÈ_çÇàÀ]/g)?.length || 0;
    if (azertyMatches >= 2 || /^[A-Z0-9]{2,6}[-_]/i.test(text)) {
      detectedLayout = 'AZERTY_FR';
      repaired = true;
      let converted = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (AZERTY_GIBBERISH_NUMBERS[ch]) {
          converted += AZERTY_GIBBERISH_NUMBERS[ch];
        } else {
          converted += ch;
        }
      }
      text = converted;
    }
  }

  // 3. Normalize common barcode formatting: uppercase standard
  text = text.toUpperCase();

  return {
    normalized: text,
    repaired,
    detectedLayout
  };
}

/**
 * Universal Scanner Stream Buffer Manager
 * Collects keydown events and builds clean ASCII string regardless of OS language
 */
export class UniversalScannerBuffer {
  private buffer: string = '';
  private lastTimestamp: number = 0;
  private readonly interCharTimeoutMs: number;
  private readonly minBarcodeLength: number;

  constructor(interCharTimeoutMs = 65, minBarcodeLength = 3) {
    this.interCharTimeoutMs = interCharTimeoutMs;
    this.minBarcodeLength = minBarcodeLength;
  }

  /**
   * Pushes a raw KeyboardEvent. Returns the completed barcode string if Enter was pressed,
   * or null if still accumulating.
   */
  public handleKeyEvent(e: KeyboardEvent): string | null {
    const now = Date.now();
    const elapsed = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // Reset buffer if delay exceeds inter-char timeout
    if (elapsed > this.interCharTimeoutMs && this.buffer.length > 0) {
      this.buffer = '';
    }

    // Enter signals end of barcode transmission from scanner
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      if (this.buffer.length >= this.minBarcodeLength) {
        const result = this.buffer;
        this.buffer = '';
        return result;
      }
      this.buffer = '';
      return null;
    }

    // Translate physical hardware code directly
    const char = translateHardwareEventToChar(e);
    if (char && char !== '\n' && char !== '\t') {
      this.buffer += char;
      return null;
    }

    // Fallback: If code wasn't in matrix but key is printable, normalize it
    if (e.key && e.key.length === 1) {
      const repaired = normalizeGarbledScanString(e.key);
      this.buffer += repaired.normalized;
    }

    return null;
  }

  public reset(): void {
    this.buffer = '';
    this.lastTimestamp = 0;
  }

  public getCurrentBuffer(): string {
    return this.buffer;
  }
}
