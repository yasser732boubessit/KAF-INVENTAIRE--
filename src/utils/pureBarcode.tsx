import React from 'react';

// ==========================================
// 1. PURE CODE-128 BARCODE GENERATOR (SVG)
// ISO/IEC 15417 Compliant - Zero Dependencies
// ==========================================

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 105=Start C, 106=Stop)
];

export interface PureCode128SvgProps {
  value: string;
  width?: number; // module width in px
  height?: number; // bar height in px
  showText?: boolean;
  className?: string;
}

export const PureCode128Svg: React.FC<PureCode128SvgProps> = ({
  value,
  width = 1.6,
  height = 42,
  showText = true,
  className = ''
}) => {
  if (!value) return null;

  // Code 128-B encoding
  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  // Build binary modules
  const modules: number[] = [];
  // Quiet zone at start
  for (let q = 0; q < 10; q++) modules.push(0);

  for (const c of codes) {
    const pattern = CODE128_PATTERNS[c];
    if (!pattern) continue;
    for (let p = 0; p < pattern.length; p++) {
      const barWidth = parseInt(pattern[p], 10);
      const isBar = p % 2 === 0;
      for (let w = 0; w < barWidth; w++) {
        modules.push(isBar ? 1 : 0);
      }
    }
  }

  // Quiet zone at end
  for (let q = 0; q < 10; q++) modules.push(0);

  const totalWidth = modules.length * width;
  const totalHeight = height + (showText ? 16 : 0);

  // Group continuous black bars into single rects for cleaner SVG
  const rects: { x: number; w: number }[] = [];
  let currentStart = -1;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      if (currentStart === -1) currentStart = i;
    } else {
      if (currentStart !== -1) {
        rects.push({ x: currentStart * width, w: (i - currentStart) * width });
        currentStart = -1;
      }
    }
  }
  if (currentStart !== -1) {
    rects.push({ x: currentStart * width, w: (modules.length - currentStart) * width });
  }

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={totalWidth}
      height={totalHeight}
      className={`select-none ${className}`}
      style={{ shapeRendering: 'crispEdges' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={totalWidth} height={totalHeight} fill="#FFFFFF" />
      {rects.map((r, idx) => (
        <rect
          key={idx}
          x={r.x}
          y={0}
          width={r.w}
          height={height}
          fill="#000000"
        />
      ))}
      {showText && (
        <text
          x={totalWidth / 2}
          y={height + 12}
          textAnchor="middle"
          fill="#000000"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {value}
        </text>
      )}
    </svg>
  );
};


// ==========================================
// 2. PURE QR CODE GENERATOR (SVG)
// Compact Self-Contained Reed-Solomon QR
// Zero Dependencies
// ==========================================

// GF(256) Tables
const GF_EXP = new Uint8Array(256);
const GF_LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  GF_EXP[i] = x;
  GF_LOG[x] = i;
  x = (x << 1) ^ (x & 128 ? 0x11d : 0);
}

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

function rsCompute(data: number[], ecCount: number): number[] {
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gfMul(gen[j], GF_EXP[i]);
      next[j + 1] ^= gen[j];
    }
    gen = next;
  }
  const res = new Array(ecCount).fill(0);
  for (const b of data) {
    const factor = b ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < ecCount; i++) {
      res[i] ^= gfMul(gen[i], factor);
    }
  }
  return res;
}

// Version table for ECC Level M: [totalCodewords, ecCodewords]
const QR_VERSIONS: Record<number, { size: number; totalCodewords: number; ecCodewords: number; alignments: number[] }> = {
  1: { size: 21, totalCodewords: 26, ecCodewords: 10, alignments: [] },
  2: { size: 25, totalCodewords: 44, ecCodewords: 16, alignments: [6, 18] },
  3: { size: 29, totalCodewords: 70, ecCodewords: 26, alignments: [6, 22] },
  4: { size: 33, totalCodewords: 100, ecCodewords: 36, alignments: [6, 26] },
  5: { size: 37, totalCodewords: 134, ecCodewords: 48, alignments: [6, 30] }
};

function encodeStringToQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = Array.from(encoder.encode(text));

  // Choose smallest version that fits
  let version = 1;
  while (version <= 5) {
    const vInfo = QR_VERSIONS[version];
    const maxDataBytes = vInfo.totalCodewords - vInfo.ecCodewords;
    // Overhead: 4 bits mode + 8 bits length = 1.5 bytes -> need dataBytes + 2 <= maxDataBytes
    if (rawBytes.length + 2 <= maxDataBytes) break;
    version++;
  }
  if (version > 5) version = 5;

  const vInfo = QR_VERSIONS[version];
  const dataCodewordsCount = vInfo.totalCodewords - vInfo.ecCodewords;

  // Build bitstream: 0100 (Byte mode) + length (8 bits) + bytes
  let bitBuffer: number[] = [0, 1, 0, 0];
  const charCount = Math.min(rawBytes.length, 255);
  for (let b = 7; b >= 0; b--) {
    bitBuffer.push((charCount >> b) & 1);
  }
  for (const byte of rawBytes.slice(0, dataCodewordsCount - 2)) {
    for (let b = 7; b >= 0; b--) {
      bitBuffer.push((byte >> b) & 1);
    }
  }

  // Terminator (up to 4 zeroes)
  const maxBits = dataCodewordsCount * 8;
  const termLen = Math.min(4, maxBits - bitBuffer.length);
  for (let t = 0; t < termLen; t++) bitBuffer.push(0);

  // Align to byte
  while (bitBuffer.length % 8 !== 0) bitBuffer.push(0);

  // Pack into bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuffer[i + b];
    }
    dataBytes.push(byteVal);
  }

  // Pad with 0xEC, 0x11
  let padToggle = false;
  while (dataBytes.length < dataCodewordsCount) {
    dataBytes.push(padToggle ? 0x11 : 0xec);
    padToggle = !padToggle;
  }

  // Error Correction
  const ecBytes = rsCompute(dataBytes, vInfo.ecCodewords);
  const allCodewords = [...dataBytes, ...ecBytes];

  // Convert to full bitstream
  const allBits: number[] = [];
  for (const byte of allCodewords) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((byte >> b) & 1);
    }
  }

  // Initialize Matrix
  const size = vInfo.size;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Helper: Place Finder Pattern
  const placeFinder = (startRow: number, startCol: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startRow + r;
        const col = startCol + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            matrix[row][col] = isBorder || isCenter;
          } else {
            matrix[row][col] = false; // Separator
          }
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Alignment patterns
  if (vInfo.alignments.length === 2) {
    const coords = vInfo.alignments;
    for (const r of coords) {
      for (const c of coords) {
        if (matrix[r][c] !== null) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            matrix[r + dr][c + dc] = isEdge || isCenter;
          }
        }
      }
    }
  }

  // Dark module
  matrix[size - 8][8] = true;

  // Format info area reservation (ECC M, Mask 0)
  // Format string for M, pattern 0: 101010000010010
  const formatStr = "101010000010010";
  for (let i = 0; i <= 5; i++) matrix[8][i] = formatStr[i] === '1';
  matrix[8][7] = formatStr[6] === '1';
  matrix[8][8] = formatStr[7] === '1';
  matrix[7][8] = formatStr[8] === '1';
  for (let i = 9; i <= 14; i++) matrix[14 - i][8] = formatStr[i] === '1';

  // Format info mirror
  for (let i = 0; i <= 6; i++) matrix[size - 1 - i][8] = formatStr[i] === '1';
  matrix[8][size - 8] = formatStr[7] === '1';
  for (let i = 8; i <= 14; i++) matrix[8][size - 15 + i] = formatStr[i] === '1';

  // Place data bits with Mask 0 ((row + col) % 2 === 0)
  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (matrix[row][c] === null) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx] : 0;
          bitIdx++;
          const mask = (row + c) % 2 === 0;
          matrix[row][c] = (bit === 1) !== mask;
        }
      }
    }
    upward = !upward;
  }

  return matrix.map(row => row.map(cell => cell === true));
}

export interface PureQrSvgProps {
  value: string;
  size?: number; // size in px
  className?: string;
}

export const PureQrSvg: React.FC<PureQrSvgProps> = ({
  value,
  size = 90,
  className = ''
}) => {
  if (!value) return null;

  try {
    const matrix = encodeStringToQrMatrix(value);
    const matrixSize = matrix.length;
    const quietZone = 2;
    const totalDim = matrixSize + quietZone * 2;

    const rects: { x: number; y: number }[] = [];
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (matrix[r][c]) {
          rects.push({ x: c + quietZone, y: r + quietZone });
        }
      }
    }

    return (
      <svg
        viewBox={`0 0 ${totalDim} ${totalDim}`}
        width={size}
        height={size}
        className={`select-none ${className}`}
        style={{ shapeRendering: 'crispEdges' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={totalDim} height={totalDim} fill="#FFFFFF" />
        {rects.map((rc, idx) => (
          <rect
            key={idx}
            x={rc.x}
            y={rc.y}
            width={1.02} // slight overlap to prevent subpixel hairline gaps
            height={1.02}
            fill="#000000"
          />
        ))}
      </svg>
    );
  } catch (err) {
    console.error('Error rendering pure QR:', err);
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-slate-100 flex items-center justify-center text-[9px] font-mono border border-slate-300 text-center p-1"
      >
        QR
      </div>
    );
  }
};
