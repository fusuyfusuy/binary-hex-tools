// BitCraft — Binary & Hex Operations Workbench
(function () {
  'use strict';

  // --- Utility functions ---
  function padLeft(str, len, char) {
    char = char || '0';
    while (str.length < len) str = char + str;
    return str;
  }

  function formatBinary(binStr, groupSize) {
    groupSize = groupSize || 4;
    const clean = binStr.replace(/\s+/g, '');
    const remainder = clean.length % groupSize;
    let padded = clean;
    if (remainder > 0) {
      padded = '0'.repeat(groupSize - remainder) + clean;
    }
    const chunks = [];
    for (let i = 0; i < padded.length; i += groupSize) {
      chunks.push(padded.slice(i, i + groupSize));
    }
    return chunks.join(' ');
  }

  function formatHex(hexStr, groupSize) {
    groupSize = groupSize || 2;
    const clean = hexStr.toUpperCase().replace(/\s+/g, '');
    const remainder = clean.length % groupSize;
    let padded = clean;
    if (remainder > 0) {
      padded = '0' + clean;
    }
    const chunks = [];
    for (let i = 0; i < padded.length; i += groupSize) {
      chunks.push(padded.slice(i, i + groupSize));
    }
    return chunks.join(' ');
  }

  // --- 1. Live Radix Converter ---
  const elDec = document.getElementById('input-dec');
  const elHex = document.getElementById('input-hex');
  const elBin = document.getElementById('input-bin');
  const elOct = document.getElementById('input-oct');
  const elAscii = document.getElementById('input-ascii');

  let activeSource = null;

  function updateRadixFromBigInt(val) {
    if (val < 0n) val = BigInt.asUintN(64, val);

    if (activeSource !== 'dec') elDec.value = val.toString(10);
    if (activeSource !== 'hex') elHex.value = val.toString(16).toUpperCase();
    if (activeSource !== 'bin') elBin.value = formatBinary(val.toString(2), 4);
    if (activeSource !== 'oct') elOct.value = val.toString(8);

    if (activeSource !== 'ascii') {
      try {
        let hex = val.toString(16);
        if (hex.length % 2 !== 0) hex = '0' + hex;
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          const code = parseInt(hex.substr(i, 2), 16);
          if (code >= 32 && code <= 126) {
            str += String.fromCharCode(code);
          } else {
            str += '·';
          }
        }
        elAscii.value = str;
      } catch (e) {
        elAscii.value = '';
      }
    }
  }

  function handleDecInput() {
    activeSource = 'dec';
    const raw = elDec.value.trim().replace(/,/g, '');
    if (!raw) return clearRadixFields('dec');
    try {
      const val = BigInt(raw);
      updateRadixFromBigInt(val);
      syncBitboardFromBigInt(val);
    } catch (e) {}
  }

  function handleHexInput() {
    activeSource = 'hex';
    const raw = elHex.value.trim().replace(/^0x/i, '').replace(/\s+/g, '');
    if (!raw) return clearRadixFields('hex');
    try {
      const val = BigInt('0x' + raw);
      updateRadixFromBigInt(val);
      syncBitboardFromBigInt(val);
    } catch (e) {}
  }

  function handleBinInput() {
    activeSource = 'bin';
    const raw = elBin.value.trim().replace(/^0b/i, '').replace(/\s+/g, '');
    if (!raw) return clearRadixFields('bin');
    try {
      const val = BigInt('0b' + raw);
      updateRadixFromBigInt(val);
      syncBitboardFromBigInt(val);
    } catch (e) {}
  }

  function handleOctInput() {
    activeSource = 'oct';
    const raw = elOct.value.trim().replace(/^0o/i, '').replace(/\s+/g, '');
    if (!raw) return clearRadixFields('oct');
    try {
      const val = BigInt('0o' + raw);
      updateRadixFromBigInt(val);
      syncBitboardFromBigInt(val);
    } catch (e) {}
  }

  function handleAsciiInput() {
    activeSource = 'ascii';
    const raw = elAscii.value;
    if (!raw) return clearRadixFields('ascii');
    let hex = '';
    for (let i = 0; i < raw.length; i++) {
      const byteHex = raw.charCodeAt(i).toString(16).padStart(2, '0');
      hex += byteHex;
    }
    try {
      const val = BigInt('0x' + (hex || '0'));
      updateRadixFromBigInt(val);
      syncBitboardFromBigInt(val);
    } catch (e) {}
  }

  function clearRadixFields(except) {
    if (except !== 'dec') elDec.value = '';
    if (except !== 'hex') elHex.value = '';
    if (except !== 'bin') elBin.value = '';
    if (except !== 'oct') elOct.value = '';
    if (except !== 'ascii') elAscii.value = '';
  }

  elDec.addEventListener('input', handleDecInput);
  elHex.addEventListener('input', handleHexInput);
  elBin.addEventListener('input', handleBinInput);
  elOct.addEventListener('input', handleOctInput);
  elAscii.addEventListener('input', handleAsciiInput);

  // --- Copy Buttons ---
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input || !input.value) return;
      navigator.clipboard.writeText(input.value).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = orig; }, 1200);
      });
    });
  });

  // --- 2. Interactive 32-Bit Bitboard ---
  let bitboardState = 0x00000000 >>> 0; // Unsigned 32-bit int
  const bitGrid = document.getElementById('bit-grid');
  const telHex = document.getElementById('tel-hex');
  const telU32 = document.getElementById('tel-u32');
  const telI32 = document.getElementById('tel-i32');
  const telPop = document.getElementById('tel-pop');

  function renderBitboard() {
    bitGrid.innerHTML = '';
    // Bits 31 down to 0
    for (let bit = 31; bit >= 0; bit--) {
      const cell = document.createElement('div');
      const isSet = (bitboardState & (1 << bit)) !== 0;
      cell.className = 'bit-cell' + (isSet ? ' active' : '');
      cell.setAttribute('data-bit', bit);

      const valSpan = document.createElement('span');
      valSpan.textContent = isSet ? '1' : '0';

      const idxSpan = document.createElement('span');
      idxSpan.className = 'bit-idx';
      idxSpan.textContent = bit;

      cell.appendChild(valSpan);
      cell.appendChild(idxSpan);

      cell.addEventListener('click', () => {
        bitboardState ^= (1 << bit);
        bitboardState = bitboardState >>> 0;
        updateBitboardUI();
        syncRadixFromBitboard();
      });

      bitGrid.appendChild(cell);
    }
  }

  function updateBitboardUI() {
    // Update active classes on cells
    const cells = bitGrid.querySelectorAll('.bit-cell');
    cells.forEach(cell => {
      const bit = parseInt(cell.getAttribute('data-bit'), 10);
      const isSet = (bitboardState & (1 << bit)) !== 0;
      if (isSet) {
        cell.classList.add('active');
        cell.children[0].textContent = '1';
      } else {
        cell.classList.remove('active');
        cell.children[0].textContent = '0';
      }
    });

    // Update telemetry
    const hexStr = '0x' + padLeft(bitboardState.toString(16).toUpperCase(), 8, '0');
    telHex.textContent = hexStr;
    telU32.textContent = bitboardState.toString(10);
    telI32.textContent = (bitboardState | 0).toString(10);

    // Popcount
    let count = 0;
    let n = bitboardState;
    while (n > 0) {
      count += (n & 1);
      n = n >>> 1;
    }
    telPop.textContent = count;
  }

  function syncBitboardFromBigInt(val) {
    bitboardState = Number(BigInt.asUintN(32, val)) >>> 0;
    updateBitboardUI();
  }

  function syncRadixFromBitboard() {
    activeSource = 'bitboard';
    updateRadixFromBigInt(BigInt(bitboardState));
  }

  document.getElementById('btn-all-ones').addEventListener('click', () => {
    bitboardState = 0xFFFFFFFF >>> 0;
    updateBitboardUI();
    syncRadixFromBitboard();
  });

  document.getElementById('btn-all-zeros').addEventListener('click', () => {
    bitboardState = 0x00000000 >>> 0;
    updateBitboardUI();
    syncRadixFromBitboard();
  });

  document.getElementById('btn-invert-bits').addEventListener('click', () => {
    bitboardState = (~bitboardState) >>> 0;
    updateBitboardUI();
    syncRadixFromBitboard();
  });

  document.getElementById('btn-shl').addEventListener('click', () => {
    bitboardState = (bitboardState << 1) >>> 0;
    updateBitboardUI();
    syncRadixFromBitboard();
  });

  document.getElementById('btn-shr').addEventListener('click', () => {
    bitboardState = (bitboardState >>> 1) >>> 0;
    updateBitboardUI();
    syncRadixFromBitboard();
  });

  // --- 3. Bitwise Operator Workbench ---
  const elOpA = document.getElementById('op-a');
  const elOpB = document.getElementById('op-b');
  const selRadixA = document.getElementById('radix-a');
  const selRadixB = document.getElementById('radix-b');
  const resultsTbody = document.getElementById('bitwise-results');

  function parseOperand(valStr, radix) {
    valStr = valStr.trim();
    if (!valStr) return 0;
    try {
      if (radix === 16) return parseInt(valStr.replace(/^0x/i, ''), 16) || 0;
      if (radix === 2) return parseInt(valStr.replace(/^0b/i, ''), 2) || 0;
      return parseInt(valStr, 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function format32Bin(num) {
    const u32 = num >>> 0;
    const raw = padLeft(u32.toString(2), 32, '0');
    return formatBinary(raw, 4);
  }

  function format32Hex(num) {
    const u32 = num >>> 0;
    return '0x' + padLeft(u32.toString(16).toUpperCase(), 8, '0');
  }

  function computeBitwise() {
    const radixA = parseInt(selRadixA.value, 10);
    const radixB = parseInt(selRadixB.value, 10);

    const a = parseOperand(elOpA.value, radixA);
    const b = parseOperand(elOpB.value, radixB);

    const ops = [
      { name: 'AND', expr: 'A & B', res: (a & b) },
      { name: 'OR', expr: 'A | B', res: (a | b) },
      { name: 'XOR', expr: 'A ^ B', res: (a ^ b) },
      { name: 'NOT A', expr: '~A', res: (~a) },
      { name: 'NOT B', expr: '~B', res: (~b) },
      { name: 'NAND', expr: '~(A & B)', res: (~(a & b)) },
      { name: 'NOR', expr: '~(A | B)', res: (~(a | b)) },
      { name: 'SHL (A << B)', expr: `A << ${b % 32}`, res: (a << (b % 32)) },
      { name: 'SHR (A >> B)', expr: `A >> ${b % 32}`, res: (a >> (b % 32)) },
      { name: 'USHR (A >>> B)', expr: `A >>> ${b % 32}`, res: (a >>> (b % 32)) }
    ];

    resultsTbody.innerHTML = '';
    ops.forEach(op => {
      const tr = document.createElement('tr');
      const u32 = op.res >>> 0;
      const s32 = op.res | 0;

      tr.innerHTML = `
        <td class="op-name">${op.name}</td>
        <td><code>${op.expr}</code></td>
        <td>${s32} <span style="opacity:0.6;font-size:0.75rem;">(u: ${u32})</span></td>
        <td><code>${format32Hex(op.res)}</code></td>
        <td class="op-bin"><code>${format32Bin(op.res)}</code></td>
      `;
      resultsTbody.appendChild(tr);
    });
  }

  elOpA.addEventListener('input', computeBitwise);
  elOpB.addEventListener('input', computeBitwise);
  selRadixA.addEventListener('change', computeBitwise);
  selRadixB.addEventListener('change', computeBitwise);

  // --- 4. Hex Dump & Byte Inspector ---
  const elDumpInput = document.getElementById('hexdump-input');
  const elDumpOutput = document.getElementById('hexdump-output');

  function renderHexDump() {
    const text = elDumpInput.value;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);

    if (bytes.length === 0) {
      elDumpOutput.textContent = '(no data)';
      return;
    }

    const lines = [];
    for (let offset = 0; offset < bytes.length; offset += 16) {
      const slice = bytes.subarray(offset, Math.min(offset + 16, bytes.length));
      const offsetHex = padLeft(offset.toString(16), 8, '0');

      let hexPart = '';
      let asciiPart = '';

      for (let i = 0; i < 16; i++) {
        if (i === 8) hexPart += ' ';
        if (i < slice.length) {
          const b = slice[i];
          hexPart += padLeft(b.toString(16).toUpperCase(), 2, '0') + ' ';
          asciiPart += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        } else {
          hexPart += '   ';
        }
      }

      lines.push(`${offsetHex}  ${hexPart} |${asciiPart}|`);
    }

    elDumpOutput.textContent = lines.join('\n');
  }

  elDumpInput.addEventListener('input', renderHexDump);

  // Initialize
  renderBitboard();
  updateBitboardUI();
  elDec.value = '42';
  handleDecInput();
  computeBitwise();
  renderHexDump();
})();
