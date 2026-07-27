import { Circuit } from '../types';

// Random string generator for IDs
const makeId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const HEADER_MAP: Record<string, string> = {
  'circuit id': 'circuitId',
  'id': 'circuitId',
  'room': 'room',
  'room l (m)': 'roomL',
  'room l': 'roomL',
  'room w (m)': 'roomW',
  'room w': 'roomW',
  'height (m)': 'ceilingH',
  'ceiling height': 'ceilingH',
  'ceiling h': 'ceilingH',
  'load type': 'loadType',
  'type': '_typeCol',
  'type detail': '_typeCol',
  'orientationn': '_typeCol', // Support the minor typo in exported sheets
  'fixture style': '_fixtureStyleCol',
  'mount': '_mountCol',
  'control': '_ctrlCol',
  'watts/unit': 'watts',
  'w/unit': 'watts',
  'watts': 'watts',
  'w per unit': 'watts',
  'qty': 'qty',
  'qty of bulbs': 'qty',
  'quantity': 'qty',
  'phase': 'phase',
  'cb rating (a)': 'cb',
  'cb (a)': 'cb',
  'cb': 'cb',
  'wire size (mm²)': 'wire',
  'wire size (mm2)': 'wire',
  'wire mm²': 'wire',
  'wire mm2': 'wire',
  'wire': 'wire',
  'cable length (m)': 'cableLength',
  'cable m': 'cableLength',
  'cable length': 'cableLength',
  'cable (m)': 'cableLength',
  'cable cores': 'cableCores',
  'cores': 'cableCores',
  'switch type': 'switchType',
  'sw qty': 'switchQty',
  'switch qty': 'switchQty',
  'notes': 'notes',
};

function parseCoresString(cores: any): string {
  const cStr = String(cores ?? '').trim().toLowerCase();
  if (!cStr) return '2 Cores';
  if (cStr === '1' || cStr.includes('1 core')) return '1 Core';
  if (sMatch(cpt => ['2','2 core','2 cores'], cStr)) return '2 Cores';
  if (sMatch(cpt => ['3','3 core','3 cores'], cStr)) return '3 Cores';
  if (sMatch(cpt => ['4','4 core','4 cores'], cStr)) return '4 Cores';
  if (sMatch(cpt => ['5','5 core','5 cores'], cStr)) return '5 Cores';
  return '2 Cores';
}

function sMatch(fn: (c: string) => string[], input: string): boolean {
  return fn(input).includes(input);
}

export function cD(text: string): any[][] {
  const rows = text.split(/\r?\n/).filter(r => r.length > 0);
  if (rows.length === 0) return [];
  
  // Count commas and tabs in the first 10 rows to detect the delimiter
  let commaCount = 0;
  let tabCount = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    commaCount += (rows[i].match(/,/g) || []).length;
    tabCount += (rows[i].match(/\t/g) || []).length;
  }
  const delim = tabCount > commaCount ? '\t' : ',';
  
  return rows.map(row => {
    const parts: string[] = [];
    let insideQuotes = false;
    let currentPart = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delim && !insideQuotes) {
        parts.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart.trim());
    return parts;
  });
}

export function dD(aoa: any[][], phaseMode: string): { circuits: Circuit[]; skipped: number } {
  if (!aoa || aoa.length === 0) return { circuits: [], skipped: 0 };
  
  // Find header row
  let headerIndex = aoa.findIndex(row => 
    row.some(cell => {
      const clean = String(cell ?? '').trim().toLowerCase();
      return HEADER_MAP[clean] === 'circuitId' || clean === 'room';
    })
  );
  if (headerIndex === -1) {
    headerIndex = 0;
  }
  
  const headers = aoa[headerIndex].map(cell => {
    const clean = String(cell ?? '').trim().toLowerCase();
    return HEADER_MAP[clean] || null;
  });
  
  const dataRows = aoa.slice(headerIndex + 1);
  const parsedCircuits: Circuit[] = [];
  let skipped = 0;
  
  dataRows.forEach(row => {
    if (!row || row.every(cell => String(cell ?? '').trim() === '')) return;
    
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (h) {
        rowObj[h] = row[idx];
      }
    });
    
    // Explicitly check for and skip summary/total rows or headers
    const cId = String(rowObj.circuitId ?? '').trim().toLowerCase();
    const rName = String(rowObj.room ?? '').trim().toLowerCase();
    const lType = String(rowObj.loadType ?? '').trim().toLowerCase();
    
    if (
      cId.includes('total') || rName.includes('total') || lType.includes('total') ||
      cId.includes('current') || rName.includes('current') ||
      cId.includes('calculator') || cId.includes('project') || cId.includes('active panel')
    ) {
      skipped++;
      return;
    }
    
    if (!rowObj.room && !rowObj.circuitId && !rowObj.watts) {
      skipped++;
      return;
    }
    
    // Create base default circuit
    const circuit: Circuit = {
      id: makeId(),
      circuitId: rowObj.circuitId ? String(rowObj.circuitId).trim() : 'C' + makeId().slice(0, 3),
      room: rowObj.room ? String(rowObj.room).trim() : 'Lobby',
      loadType: 'Lighting',
      watts: 100,
      qty: 1,
      cableLength: 0,
      cableCores: '2 Cores',
      phase: phaseMode === '3-Phase' ? 'R' : 'L',
      cb: 10,
      wire: '2.5',
      notes: '',
      switchType: '1 Gang',
      switchQty: 0,
    };
    
    // Map load type
    const rawLoadType = String(rowObj.loadType ?? '').trim().toLowerCase();
    if (rawLoadType.includes('light')) {
      circuit.loadType = 'Lighting';
    } else if (rawLoadType.includes('sock') || rawLoadType.includes('plug')) {
      circuit.loadType = 'Sockets';
    } else if (rawLoadType.includes('ac') || rawLoadType.includes('air')) {
      circuit.loadType = 'Air Conditioner';
    } else if (rawLoadType.includes('ded') || rawLoadType.includes('mach') || rawLoadType.includes('cook')) {
      circuit.loadType = 'Dedicated';
    }
    
    // Specific fields mapping
    if (rowObj.roomL != null && rowObj.roomL !== '') {
      const val = parseFloat(rowObj.roomL);
      if (!isNaN(val)) circuit.roomL = val;
    }
    if (rowObj.roomW != null && rowObj.roomW !== '') {
      const val = parseFloat(rowObj.roomW);
      if (!isNaN(val)) circuit.roomW = val;
    }
    if (rowObj.ceilingH != null && rowObj.ceilingH !== '') {
      const val = parseFloat(rowObj.ceilingH);
      if (!isNaN(val)) circuit.ceilingH = val;
    }
    if (rowObj.watts != null && rowObj.watts !== '') {
      const val = parseFloat(rowObj.watts);
      if (!isNaN(val)) circuit.watts = val;
    }
    if (rowObj.qty != null && rowObj.qty !== '') {
      const val = parseInt(rowObj.qty, 10);
      if (!isNaN(val)) circuit.qty = Math.max(1, val);
    }
    if (rowObj.phase && phaseMode === '3-Phase') {
      const pStr = String(rowObj.phase).trim().toUpperCase();
      if (['R', 'Y', 'B'].includes(pStr)) circuit.phase = pStr;
    }
    if (rowObj.cb != null && rowObj.cb !== '') {
      const val = parseFloat(rowObj.cb);
      if (!isNaN(val)) circuit.cb = val;
    }
    if (rowObj.wire) {
      circuit.wire = String(rowObj.wire).replace(/mm[²2]?$/i, '').trim();
    }
    if (rowObj.cableLength != null && rowObj.cableLength !== '') {
      const val = parseFloat(rowObj.cableLength);
      if (!isNaN(val)) circuit.cableLength = val;
    }
    
    circuit.cableCores = parseCoresString(rowObj.cableCores);
    
    // Load-specific type sub-columns
    if (rowObj._typeCol) {
      const typeStr = String(rowObj._typeCol).trim();
      if (circuit.loadType === 'Lighting') circuit.lightingType = typeStr;
      else if (circuit.loadType === 'Sockets') circuit.socketType = typeStr;
      else if (circuit.loadType === 'Air Conditioner') circuit.acType = typeStr;
      else if (circuit.loadType === 'Dedicated') circuit.dedicatedType = typeStr;
    }
    
    if (rowObj._fixtureStyleCol) {
      const styleStr = String(rowObj._fixtureStyleCol).trim();
      if (circuit.loadType === 'Lighting') {
        const match = styleStr.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          circuit.fixtureStyle = match[1].trim();
          circuit.fixtureVariance = match[2].trim();
        } else {
          circuit.fixtureStyle = styleStr;
          circuit.fixtureVariance = 'None';
        }
      } else if (circuit.loadType === 'Sockets') {
        circuit.socketVariance = styleStr;
        circuit.socketFixtureStyle = styleStr;
      } else if (circuit.loadType === 'Air Conditioner') {
        circuit.acFixtureStyle = styleStr;
      } else if (circuit.loadType === 'Dedicated') {
        circuit.dedicatedFixtureStyle = styleStr;
      }
    }
    
    if (rowObj._mountCol) {
      const mountStr = String(rowObj._mountCol).trim();
      if (circuit.loadType === 'Lighting') circuit.mountType = mountStr;
      else if (circuit.loadType === 'Sockets') circuit.socketMountType = mountStr;
      else if (circuit.loadType === 'Air Conditioner') circuit.acMountType = mountStr;
    }
    
    if (rowObj._ctrlCol) {
      const ctrlStr = String(rowObj._ctrlCol).trim();
      if (circuit.loadType === 'Lighting') circuit.controlType = ctrlStr;
      else if (circuit.loadType === 'Sockets') circuit.socketControl = ctrlStr;
      else if (circuit.loadType === 'Air Conditioner') circuit.acControl = ctrlStr;
    }
    
    const isSocketsOrDedicated = circuit.loadType === 'Sockets' || circuit.loadType === 'Dedicated';
    if (!isSocketsOrDedicated) {
      if (rowObj.switchType) circuit.switchType = String(rowObj.switchType).trim();
      if (rowObj.switchQty != null && rowObj.switchQty !== '') {
        const val = parseInt(rowObj.switchQty, 10);
        if (!isNaN(val)) circuit.switchQty = Math.max(0, val);
      }
    } else {
      circuit.switchType = '';
      circuit.switchQty = 0;
    }
    
    if (rowObj.notes) {
      circuit.notes = String(rowObj.notes).trim();
    }
    
    parsedCircuits.push(circuit);
  });
  
  return { circuits: parsedCircuits, skipped };
}
