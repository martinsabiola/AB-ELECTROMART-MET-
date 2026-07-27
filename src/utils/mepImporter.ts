import * as XLSX from 'xlsx';
import {
  Board,
  Circuit,
  HvacUnit,
  PlumbingFixture,
  FireZone,
  SolarLoad,
  SolarConfig,
  GenLoad,
  SmartDevice,
  CctvCamera,
  ProjectSettings
} from '../types';
import { cD, dD } from './csvParser';

const makeId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export interface MepImportResult {
  settings?: Partial<ProjectSettings>;
  boards?: Board[];
  hvacUnits?: HvacUnit[];
  plumbingFixtures?: PlumbingFixture[];
  fireZones?: FireZone[];
  solarLoads?: SolarLoad[];
  solarCfg?: Partial<SolarConfig>;
  genLoads?: GenLoad[];
  genFuel?: string;
  genPF?: number;
  smartDevices?: SmartDevice[];
  cameras?: CctvCamera[];
  summaryMessage: string;
  counts: {
    electrical: number;
    hvac: number;
    plumbing: number;
    fire: number;
    solar: number;
    generator: number;
    smarthome: number;
    cctv: number;
    settings: number;
  };
}

// Utility to extract column value by candidate header names
function getColVal(row: Record<string, any>, candidates: string[]): any {
  for (const c of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
    if (key !== undefined && row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  return undefined;
}

// Convert Array-of-Arrays (AOA) to array of row objects using detected header
function aoaToObjects(aoa: any[][]): { headers: string[]; rows: Record<string, any>[] } {
  if (!aoa || aoa.length === 0) return { headers: [], rows: [] };

  // Find likely header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, aoa.length); i++) {
    const r = aoa[i];
    if (Array.isArray(r) && r.some(cell => typeof cell === 'string' && cell.trim().length > 0)) {
      headerIdx = i;
      break;
    }
  }

  const rawHeaders = aoa[headerIdx] || [];
  const headers = rawHeaders.map(h => String(h ?? '').trim());
  const rows: Record<string, any>[] = [];

  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const r = aoa[i];
    if (!r || r.every(cell => String(cell ?? '').trim() === '')) continue;
    const obj: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      if (h) {
        obj[h] = r[colIdx];
      }
    });
    rows.push(obj);
  }

  return { headers, rows };
}

export async function parseMEPFile(
  file: File,
  currentBoards: Board[] = [],
  currentSettings: Partial<ProjectSettings> = {}
): Promise<MepImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. If JSON File (Backup or Exported State)
  if (ext === 'json') {
    const text = await file.text();
    const p = JSON.parse(text);

    const counts = {
      electrical: Array.isArray(p.boards) ? p.boards.reduce((acc: number, b: any) => acc + (b.circuits?.length || 0), 0) : 0,
      hvac: Array.isArray(p.hvacUnits) ? p.hvacUnits.length : 0,
      plumbing: Array.isArray(p.plumbingFixtures) ? p.plumbingFixtures.length : 0,
      fire: Array.isArray(p.fireZones) ? p.fireZones.length : 0,
      solar: Array.isArray(p.solarLoads) ? p.solarLoads.length : 0,
      generator: Array.isArray(p.genLoads) ? p.genLoads.length : 0,
      smarthome: Array.isArray(p.smartDevices) ? p.smartDevices.length : 0,
      cctv: Array.isArray(p.cameras) ? p.cameras.length : 0,
      settings: p.settings ? 1 : 0
    };

    const parts: string[] = [];
    if (counts.electrical) parts.push(`${counts.electrical} circuits`);
    if (counts.hvac) parts.push(`${counts.hvac} HVAC units`);
    if (counts.plumbing) parts.push(`${counts.plumbing} plumbing fixtures`);
    if (counts.fire) parts.push(`${counts.fire} fire zones`);
    if (counts.solar) parts.push(`${counts.solar} solar loads`);
    if (counts.generator) parts.push(`${counts.generator} generator loads`);
    if (counts.smarthome) parts.push(`${counts.smarthome} smart devices`);
    if (counts.cctv) parts.push(`${counts.cctv} CCTV cameras`);

    return {
      settings: p.settings,
      boards: Array.isArray(p.boards) ? p.boards : undefined,
      hvacUnits: Array.isArray(p.hvacUnits) ? p.hvacUnits : undefined,
      plumbingFixtures: Array.isArray(p.plumbingFixtures) ? p.plumbingFixtures : undefined,
      fireZones: Array.isArray(p.fireZones) ? p.fireZones : undefined,
      solarLoads: Array.isArray(p.solarLoads) ? p.solarLoads : undefined,
      solarCfg: p.solarCfg,
      genLoads: Array.isArray(p.genLoads) ? p.genLoads : undefined,
      genFuel: p.genFuel,
      genPF: p.genPF,
      smartDevices: Array.isArray(p.smartDevices) ? p.smartDevices : undefined,
      cameras: Array.isArray(p.cameras) ? p.cameras : undefined,
      summaryMessage: parts.length > 0 ? `Restored ${parts.join(', ')}` : 'Restored JSON MEP data',
      counts
    };
  }

  // 2. Excel (.xlsx / .xls) or Text (.csv / .txt)
  const sheetsData: Record<string, any[][]> = {};

  if (ext === 'xlsx' || ext === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      sheetsData[sheetName] = aoa;
    });
  } else {
    // CSV or TXT text
    const text = await file.text();
    const aoa = cD(text);
    sheetsData['Sheet1'] = aoa;
  }

  // Target collections
  let importedSettings: Partial<ProjectSettings> = {};
  const newBoardsMap: Record<string, Board> = {};
  const newHvacUnits: HvacUnit[] = [];
  const newPlumbingFixtures: PlumbingFixture[] = [];
  const newFireZones: FireZone[] = [];
  const newSolarLoads: SolarLoad[] = [];
  const newGenLoads: GenLoad[] = [];
  const newSmartDevices: SmartDevice[] = [];
  const newCameras: CctvCamera[] = [];

  const counts = {
    electrical: 0,
    hvac: 0,
    plumbing: 0,
    fire: 0,
    solar: 0,
    generator: 0,
    smarthome: 0,
    cctv: 0,
    settings: 0
  };

  // Helper to get or create a Board for electrical circuits
  const getOrCreateBoard = (boardName: string): Board => {
    const cleanName = boardName.trim() || 'Imported Panel';
    if (!newBoardsMap[cleanName]) {
      newBoardsMap[cleanName] = {
        id: makeId(),
        name: cleanName,
        phase: '3-Phase',
        boardType: 'Distribution Board',
        location: 'Main Electrical Room',
        voltage: currentSettings.voltage || 400,
        circuits: []
      };
    }
    return newBoardsMap[cleanName];
  };

  // Process each sheet
  for (const [sheetName, aoa] of Object.entries(sheetsData)) {
    if (!aoa || aoa.length === 0) continue;

    const lowerSheet = sheetName.toLowerCase().trim();

    // Skip helper color sheets if generated by export
    if (lowerSheet.includes('colors')) continue;

    const { headers, rows } = aoaToObjects(aoa);
    const headerStr = headers.map(h => h.toLowerCase()).join(' ');

    // --- Classification Logic ---

    // A. Settings / Summary Sheet
    if (lowerSheet.includes('summary') || lowerSheet.includes('setting') || headerStr.includes('project name') || headerStr.includes('mep calculator')) {
      for (const row of rows) {
        const key = String(row[headers[0]] || '').trim().toLowerCase();
        const val = row[headers[1]];
        if (!key || val === undefined) continue;

        if (key.includes('project name')) importedSettings.projectName = String(val).trim();
        if (key.includes('project no')) importedSettings.projectNo = String(val).trim();
        if (key.includes('engineer')) importedSettings.engineer = String(val).trim();
        if (key.includes('client')) importedSettings.client = String(val).trim();
        if (key.includes('voltage')) importedSettings.voltage = parseFloat(val) || currentSettings.voltage;
        if (key.includes('frequency')) importedSettings.frequency = parseFloat(val) || currentSettings.frequency;
        if (key.includes('power factor')) importedSettings.powerFactor = parseFloat(val) || currentSettings.powerFactor;
        if (key.includes('demand factor')) importedSettings.demandFactor = parseFloat(val) || currentSettings.demandFactor;
        if (key.includes('diversity factor')) importedSettings.diversityFactor = parseFloat(val) || currentSettings.diversityFactor;
        if (key.includes('design temp')) importedSettings.tempDesign = parseFloat(val) || currentSettings.tempDesign;
      }
      counts.settings = 1;
      continue;
    }

    // B. HVAC Sheet
    if (
      lowerSheet.includes('hvac') || lowerSheet.includes('ac') || lowerSheet.includes('cooling') || lowerSheet.includes('air conditioning') ||
      headerStr.includes('cooling') || headerStr.includes('refrigerant') || headerStr.includes('cfm') || headerStr.includes('btu')
    ) {
      for (const row of rows) {
        const zone = String(getColVal(row, ['zone', 'room', 'location', 'zone / room']) || '').trim();
        if (!zone || zone.toLowerCase().includes('total') || zone.toLowerCase().includes('project')) continue;

        const system = String(getColVal(row, ['system type', 'system', 'type']) || 'Split AC').trim();
        const area = parseFloat(getColVal(row, ['area (m²)', 'area (m2)', 'area', 'sqm']) || 20) || 20;
        const height = parseFloat(getColVal(row, ['height (m)', 'height', 'ceiling height']) || 3.0) || 3.0;
        let coolingKw = parseFloat(getColVal(row, ['cooling (kw)', 'cooling kw', 'cooling load', 'cooling']) || 0);
        const btuVal = parseFloat(getColVal(row, ['btu/hr', 'btu', 'btu/h']) || 0);
        if (!coolingKw && btuVal) coolingKw = btuVal / 3412;
        if (!coolingKw) coolingKw = (area * height * 100) / 3412; // estimated fallback

        const refrigerant = String(getColVal(row, ['refrigerant', 'gas']) || 'R410A').trim();
        const cfm = parseFloat(getColVal(row, ['supply cfm', 'cfm', 'airflow']) || Math.round(coolingKw * 100)) || Math.round(coolingKw * 100);
        const watts = parseInt(getColVal(row, ['watts', 'watt', 'w']) || Math.round(coolingKw * 250), 10) || Math.round(coolingKw * 250);
        const quantity = parseInt(getColVal(row, ['quantity', 'qty']) || 1, 10) || 1;
        const phase = String(getColVal(row, ['phase']) || 'Single Phase').trim();
        const cbSizing = parseInt(getColVal(row, ['cb sizing', 'cb', 'cb (a)']) || 20, 10) || 20;
        const wire = String(getColVal(row, ['wire size (mm²)', 'wire', 'wire size']) || '4').trim();
        const cableLength = parseFloat(getColVal(row, ['cable length (m)', 'cable length', 'cable']) || 15) || 15;
        const cores = String(getColVal(row, ['cores', 'cable cores']) || '3 Cores').trim();
        const notes = String(getColVal(row, ['notes', 'remarks']) || '').trim();

        newHvacUnits.push({
          id: makeId(),
          zone,
          system,
          area,
          height,
          coolingLoad: Math.round(coolingKw * 100) / 100,
          refrigerant,
          cfm,
          watts,
          totalWatts: watts * quantity,
          quantity,
          phase,
          cbSizing,
          wire,
          cableLength,
          cores,
          notes
        });
        counts.hvac++;
      }
      continue;
    }

    // C. Plumbing Sheet
    if (
      lowerSheet.includes('plumb') || lowerSheet.includes('fixture') || lowerSheet.includes('sanitary') || lowerSheet.includes('water') ||
      headerStr.includes('fixture units') || headerStr.includes('cold flow') || headerStr.includes('hot flow') || headerStr.includes('pipe size')
    ) {
      for (const row of rows) {
        const fixture = String(getColVal(row, ['fixture type', 'fixture', 'description', 'name']) || '').trim();
        const zone = String(getColVal(row, ['zone', 'room', 'location']) || 'Bath / Toilet').trim();
        if (!fixture || fixture.toLowerCase().includes('total') || fixture.toLowerCase().includes('project')) continue;

        const qty = parseInt(getColVal(row, ['qty', 'quantity']) || 1, 10) || 1;
        const fixtureUnits = parseFloat(getColVal(row, ['fixture units', 'fu', 'units']) || 1.5) || 1.5;
        const pipeSize = parseFloat(getColVal(row, ['pipe size (mm)', 'pipe size', 'pipe mm', 'size']) || 20) || 20;
        const material = String(getColVal(row, ['material', 'pipe material']) || 'PPR').trim();
        const coldFlow = parseFloat(getColVal(row, ['cold flow (l/s)', 'cold flow']) || 0.15) || 0.15;
        const hotFlow = parseFloat(getColVal(row, ['hot flow (l/s)', 'hot flow']) || 0.0) || 0;
        const notes = String(getColVal(row, ['notes', 'remarks']) || '').trim();

        newPlumbingFixtures.push({
          id: makeId(),
          zone,
          fixture,
          qty,
          fixtureUnits,
          pipeSize,
          material,
          coldFlow,
          hotFlow,
          notes
        });
        counts.plumbing++;
      }
      continue;
    }

    // D. Fire Protection Sheet
    if (
      lowerSheet.includes('fire') || lowerSheet.includes('sprinkler') || lowerSheet.includes('suppression') ||
      headerStr.includes('hazard') || headerStr.includes('sprinkler') || headerStr.includes('head count')
    ) {
      for (const row of rows) {
        const zone = String(getColVal(row, ['zone', 'room', 'area name', 'location']) || '').trim();
        if (!zone || zone.toLowerCase().includes('total') || zone.toLowerCase().includes('project')) continue;

        const hazard = String(getColVal(row, ['hazard level', 'hazard class', 'hazard']) || 'Ordinary Hazard (Group 1)').trim();
        const sprinklerType = String(getColVal(row, ['sprinkler type', 'type']) || 'Pendent Quick Response').trim();
        const area = parseFloat(getColVal(row, ['area (m²)', 'area', 'coverage area']) || 100) || 100;
        const spacing = parseFloat(getColVal(row, ['spacing (m)', 'spacing']) || 12) || 12;
        const flowRate = parseFloat(getColVal(row, ['flow rate (l/min)', 'flow rate']) || 150) || 150;
        const pipeSize = parseFloat(getColVal(row, ['pipe size (mm)', 'pipe size']) || 50) || 50;
        const notes = String(getColVal(row, ['notes', 'remarks']) || '').trim();

        newFireZones.push({
          id: makeId(),
          zone,
          hazard,
          sprinklerType,
          area,
          spacing,
          flowRate,
          pipeSize,
          notes
        });
        counts.fire++;
      }
      continue;
    }

    // E. Solar Sheet
    if (
      lowerSheet.includes('solar') || lowerSheet.includes('pv') || lowerSheet.includes('photovoltaic') ||
      headerStr.includes('hours per day') || headerStr.includes('peak surge') || headerStr.includes('panel wattage')
    ) {
      for (const row of rows) {
        const description = String(getColVal(row, ['description', 'load description', 'appliance', 'item']) || '').trim();
        if (!description || description.toLowerCase().includes('total') || description.toLowerCase().includes('project')) continue;

        const watts = parseFloat(getColVal(row, ['watts', 'power (w)', 'w']) || 100) || 100;
        const qty = parseInt(getColVal(row, ['qty', 'quantity']) || 1, 10) || 1;
        const hoursPerDay = parseFloat(getColVal(row, ['hours per day', 'hours/day', 'hours', 'h/day']) || 4) || 4;
        const category = String(getColVal(row, ['category', 'type']) || 'General Load').trim();
        const notes = String(getColVal(row, ['notes', 'remarks']) || '').trim();

        newSolarLoads.push({
          id: makeId(),
          description,
          watts,
          qty,
          hoursPerDay,
          category,
          notes
        });
        counts.solar++;
      }
      continue;
    }

    // F. Generator Sheet
    if (
      lowerSheet.includes('gen') || lowerSheet.includes('generator') || lowerSheet.includes('genset') ||
      headerStr.includes('starting kw') || headerStr.includes('running kw') || headerStr.includes('genset')
    ) {
      for (const row of rows) {
        const description = String(getColVal(row, ['description', 'load description', 'appliance', 'equipment']) || '').trim();
        if (!description || description.toLowerCase().includes('total') || description.toLowerCase().includes('project')) continue;

        const loadType = String(getColVal(row, ['load type', 'type']) || 'Motor / Inductive').trim();
        const kw = parseFloat(getColVal(row, ['kw', 'running kw', 'power (kw)']) || 5) || 5;
        const pf = parseFloat(getColVal(row, ['pf', 'power factor']) || 0.8) || 0.8;
        const qty = parseInt(getColVal(row, ['qty', 'quantity']) || 1, 10) || 1;
        const demandFactor = parseFloat(getColVal(row, ['demand factor', 'demand']) || 1.0) || 1.0;
        const startingFactor = parseFloat(getColVal(row, ['starting factor', 'start factor']) || 1.5) || 1.5;
        const notes = String(getColVal(row, ['notes', 'remarks']) || '').trim();

        newGenLoads.push({
          id: makeId(),
          description,
          loadType,
          kw,
          pf,
          qty,
          demandFactor,
          startingFactor,
          notes
        });
        counts.generator++;
      }
      continue;
    }

    // G. Smart Home Sheet
    if (
      lowerSheet.includes('smart') || lowerSheet.includes('automation') || lowerSheet.includes('iot') ||
      headerStr.includes('protocol') || headerStr.includes('hub location') || headerStr.includes('device name')
    ) {
      for (const row of rows) {
        const device = String(getColVal(row, ['device name', 'device', 'appliance', 'name']) || '').trim();
        const room = String(getColVal(row, ['room', 'location', 'zone']) || 'Living Room').trim();
        if (!device || device.toLowerCase().includes('total') || device.toLowerCase().includes('project')) continue;

        const brand = String(getColVal(row, ['brand', 'make']) || 'Generic').trim();
        const protocol = String(getColVal(row, ['protocol', 'connectivity']) || 'Zigbee 3.0').trim();
        const qty = parseInt(getColVal(row, ['qty', 'quantity']) || 1, 10) || 1;
        const watts = parseFloat(getColVal(row, ['power (w)', 'watts', 'w']) || 5) || 5;
        const platform = String(getColVal(row, ['platform', 'ecosystem']) || 'Home Assistant').trim();
        const notes = String(getColVal(row, ['notes', 'remarks']) || '').trim();

        newSmartDevices.push({
          id: makeId(),
          room,
          device,
          brand,
          protocol,
          qty,
          watts,
          platform,
          notes
        });
        counts.smarthome++;
      }
      continue;
    }

    // H. CCTV Sheet
    if (
      lowerSheet.includes('cctv') || lowerSheet.includes('camera') || lowerSheet.includes('security') || lowerSheet.includes('surveillance') ||
      headerStr.includes('resolution') || headerStr.includes('fps') || headerStr.includes('retention') || headerStr.includes('poe class')
    ) {
      for (const row of rows) {
        const location = String(getColVal(row, ['camera location', 'location', 'zone', 'area']) || '').trim();
        if (!location || location.toLowerCase().includes('total') || location.toLowerCase().includes('project')) continue;

        const type = String(getColVal(row, ['camera type', 'type']) || 'Outdoor IP Bullet').trim();
        const resolution = String(getColVal(row, ['resolution', 'res']) || '4K (8MP)').trim();
        const fps = parseInt(getColVal(row, ['fps', 'frame rate']) || 25, 10) || 25;
        const compression = String(getColVal(row, ['compression', 'codec']) || 'H.265+').trim();
        const lens = String(getColVal(row, ['lens', 'focal length']) || '2.8mm Fixed').trim();
        const poeClass = String(getColVal(row, ['poe class', 'poe']) || 'PoE (Class 2)').trim();
        const qty = parseInt(getColVal(row, ['qty', 'quantity']) || 1, 10) || 1;
        const notes = String(getColVal(row, ['notes', 'remarks']) || '').trim();

        newCameras.push({
          id: makeId(),
          location,
          type,
          resolution,
          fps,
          compression,
          lens,
          poeClass,
          qty,
          indoor: false,
          ir: true,
          notes
        });
        counts.cctv++;
      }
      continue;
    }

    // I. Electrical Circuits / Panel Sheet (Default / Fallback for circuits)
    if (
      lowerSheet.includes('electrical') || lowerSheet.includes('panel') || lowerSheet.includes('db') || lowerSheet.includes('board') || lowerSheet.includes('circuit') ||
      headerStr.includes('circuit id') || headerStr.includes('load type') || headerStr.includes('cb rating') || headerStr.includes('cb (a)') || headerStr.includes('wire size') || headerStr.includes('room')
    ) {
      const boardName = sheetName.replace(/circuit|schedule|sheet/gi, '').trim() || 'Imported Panel';
      const board = getOrCreateBoard(boardName);

      const parsed = dD(aoa, board.phase);
      if (parsed.circuits && parsed.circuits.length > 0) {
        board.circuits.push(...parsed.circuits);
        counts.electrical += parsed.circuits.length;
      }
    }
  }

  // Combine newly parsed boards with current boards
  const finalBoards: Board[] = Object.values(newBoardsMap);

  const parts: string[] = [];
  if (counts.electrical) parts.push(`${counts.electrical} Electrical circuits (${finalBoards.length} boards)`);
  if (counts.hvac) parts.push(`${counts.hvac} HVAC units`);
  if (counts.plumbing) parts.push(`${counts.plumbing} Plumbing fixtures`);
  if (counts.fire) parts.push(`${counts.fire} Fire zones`);
  if (counts.solar) parts.push(`${counts.solar} Solar loads`);
  if (counts.generator) parts.push(`${counts.generator} Generator loads`);
  if (counts.smarthome) parts.push(`${counts.smarthome} Smart devices`);
  if (counts.cctv) parts.push(`${counts.cctv} CCTV cameras`);
  if (counts.settings) parts.push(`Project parameters`);

  const summaryMessage = parts.length > 0
    ? `Successfully imported ${parts.join(', ')}!`
    : 'Import complete (no matching MEP records found in file).';

  return {
    settings: counts.settings ? importedSettings : undefined,
    boards: finalBoards.length > 0 ? finalBoards : undefined,
    hvacUnits: newHvacUnits.length > 0 ? newHvacUnits : undefined,
    plumbingFixtures: newPlumbingFixtures.length > 0 ? newPlumbingFixtures : undefined,
    fireZones: newFireZones.length > 0 ? newFireZones : undefined,
    solarLoads: newSolarLoads.length > 0 ? newSolarLoads : undefined,
    genLoads: newGenLoads.length > 0 ? newGenLoads : undefined,
    smartDevices: newSmartDevices.length > 0 ? newSmartDevices : undefined,
    cameras: newCameras.length > 0 ? newCameras : undefined,
    summaryMessage,
    counts
  };
}
