import * as XLSX from 'xlsx';
import { Board, HvacUnit, PlumbingFixture, FireZone, ProjectSettings, ROOM_LUX_DATABASE, getTargetLuxForRoom, getRoundingValue } from '../types';

// Helper for color map
const CABLE_COLORS: Record<string, string[]> = {
  '1 Core': ['Red'],
  '2 Cores': ['Red', 'Black'],
  '3 Cores': ['Green', 'Red', 'Black'],
  '4 Cores': ['Red', 'Yellow', 'Blue', 'Green'],
  '5 Cores': ['Red', 'Yellow', 'Blue', 'Black', 'Green'],
};

export function getCableColors(cores: string): string[] {
  return CABLE_COLORS[cores] || CABLE_COLORS['1 Core'];
}

// CB list
const CB_SIZES = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

// Calculation of CB
export function getLightingGangCount(switchType?: string): number {
  if (!switchType || switchType === 'None') return 1;
  const knownGangMultipliers: Record<string, number> = {
    '1 Gang': 1, '1 Gang Smart': 1, '13A 1G AC Switch': 1, 'Motion Switch': 1,
    '2 Gang': 2, '2 Gang Smart': 2, '20A 2G AC Grid': 2,
    '3 Gang': 3, '3 Gang Smart': 3, '32A 3G AC Grid': 3,
    '4 Gang': 4, '4 Gang Smart': 4, '45A 4G AC Grid': 4,
    '10 Grid': 10
  };
  if (knownGangMultipliers[switchType] !== undefined) {
    return knownGangMultipliers[switchType];
  }
  const match = switchType.match(/(\d+)\s*(?:Gang|G|Grid|Way)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 1;
}

export interface LightingSubCircuitInfo {
  labels: string[];
  summary: string;
  gangCount: number;
}

export function getLightingSubCircuitMap(circuits: { id: string; loadType?: string; switchType?: string; switchQty?: number }[]): Record<string, LightingSubCircuitInfo> {
  const result: Record<string, LightingSubCircuitInfo> = {};
  let lightingCircuitIndex = 1;

  for (const c of circuits) {
    const isLightning = (c.loadType || '').toLowerCase().includes('lightning');
    if (c.loadType === 'Lighting' && !isLightning) {
      const swType = c.switchType || '1 Gang';
      const switchQty = Math.max(1, c.switchQty || 1);
      const baseGangs = getLightingGangCount(swType);
      const totalGangs = Math.max(1, baseGangs * switchQty);

      const labels: string[] = [];
      for (let g = 1; g <= totalGangs; g++) {
        labels.push(`L${lightingCircuitIndex},${g}`);
      }

      result[c.id] = {
        labels,
        summary: labels.join(', '),
        gangCount: totalGangs,
      };

      lightingCircuitIndex++;
    }
  }

  return result;
}

export function calculateCB(watts: number, qty: number, voltage: number, pf: number, isThreePhase: boolean, loadType: string): number {
  const totalW = (watts || 0) * (qty || 1);
  if (loadType === 'Sockets') {
    if (!totalW) return 6;
    const current = totalW / 230;
    return CB_SIZES.find(f => f >= current) || 100;
  }

  if (loadType === 'Air Conditioner' || loadType === 'AC') {
    const effectiveWatts = totalW || 1500;
    const current = isThreePhase
      ? effectiveWatts / (Math.sqrt(3) * (voltage || 400) * (pf || 0.9))
      : effectiveWatts / ((voltage || 230) * (pf || 0.9));
    const cb = CB_SIZES.find(f => f >= current * 1.75) || 100;
    return Math.max(16, cb);
  }

  if (!totalW) return 6;

  let multiplier = 1.25;
  if (loadType === 'Motor') multiplier = 1.75;      // High inrush current for motors
  if (loadType === 'Welding') multiplier = 2.0;      // Highly inductive transient arc welder load
  if (loadType === 'Compressor') multiplier = 1.75;   // Heavy starter compressor
  if (loadType === 'Pump') multiplier = 1.4;         // Submersible or high-head hydraulic pump
  if (loadType === 'Industrial Socket') {
    const current = isThreePhase ? totalW / (Math.sqrt(3) * voltage * pf) : totalW / (voltage * pf);
    // Industrial sockets standard ratings: 16A, 32A, 63A, 125A
    const stdIndSockSizes = [16, 32, 63, 125];
    return stdIndSockSizes.find(f => f >= current) || 125;
  }

  const current = isThreePhase
    ? totalW / (Math.sqrt(3) * voltage * pf)
    : totalW / (voltage * pf);
  return CB_SIZES.find(f => f >= current * multiplier) || 100;
}

export function getCircuitCBRating(c: any, settings?: any, isThreePhaseBoard?: boolean): number {
  if (c.cb && c.cb > 0) return c.cb;
  const isLighting = c.loadType === 'Lighting';
  const is3Ph = isThreePhaseBoard || c.phase === '3-Phase' || (c.loadType === 'Dedicated' && (c.dedicatedType === 'Three Phase' || (c.fixtureVariance && c.fixtureVariance.includes('3ph'))));
  const voltage = is3Ph ? ((settings && settings.phaseVoltage3P) || 400) : ((settings && settings.voltage) || 230);
  const pf = (settings && settings.powerFactor) || 0.9;
  const activeQty = isLighting ? 1 : (c.qty || 1);
  const acWatts = (c.watts && c.watts > 0) ? c.watts : (c.acHp ? Math.round(c.acHp * 1500) : 3000);
  const watts = isLighting ? (c.watts || 100) : (c.loadType === 'Air Conditioner' ? acWatts : (c.watts || (c.loadType === 'Sockets' ? 200 : 100)));
  const rating = calculateCB(watts, activeQty, voltage, pf, is3Ph, c.loadType || 'Dedicated');
  return rating > 0 ? rating : 10;
}

export function getCUFromRoomIndex(ri: number): number {
  const cuTable = [
    [0.75, 0.41],
    [1.0, 0.48],
    [1.25, 0.54],
    [1.5, 0.58],
    [2.0, 0.64],
    [2.5, 0.68],
    [3.0, 0.71],
    [4.0, 0.75],
    [5.0, 0.78],
  ];

  if (ri <= cuTable[0][0]) return cuTable[0][1];
  if (ri >= cuTable[cuTable.length - 1][0]) return cuTable[cuTable.length - 1][1];

  for (let i = 0; i < cuTable.length - 1; i++) {
    const [ri1, cu1] = cuTable[i];
    const [ri2, cu2] = cuTable[i + 1];
    if (ri >= ri1 && ri <= ri2) {
      return cu1 + ((cu2 - cu1) * (ri - ri1)) / (ri2 - ri1);
    }
  }
  return 0.65;
}

export function calculateAutoLightingQtyForExport(
  length: number,
  width: number,
  watts: number,
  targetLux: number,
  ceilingH: number,
  mf: number,
  totalRoomW?: number,
  lpw: number = 200,
  roundingMode: 'floor' | 'round' | 'ceil' | 'actual' = 'floor'
): number {
  const l = length || 0;
  const w = width || 0;
  if (!l || !w || !watts) return 1;

  const hWorking = Math.max((ceilingH || 2.7) - 0.85, 0.5);
  const area = l * w;
  const roomIndex = area / (hWorking * (l + w));
  const cu = getCUFromRoomIndex(roomIndex);

  const totalLumens = (targetLux * area) / (cu * mf);
  const scaling = (totalRoomW && totalRoomW > 0) ? (watts / totalRoomW) : 1;
  const targetScaledLumens = totalLumens * scaling;

  // Total Watt = Total lm / 180 (lpw is passed as 180)
  const totalWattVal = targetScaledLumens / lpw;

  // Bulbs = Total Watt / Watts per unit
  const bulbs = totalWattVal / watts;

  if (roundingMode === 'actual') {
    return Math.max(0.01, Math.round(bulbs * 100) / 100);
  } else if (roundingMode === 'ceil') {
    return Math.max(1, Math.ceil(bulbs));
  } else if (roundingMode === 'round') {
    return Math.max(1, Math.round(bulbs));
  } else {
    return Math.max(1, Math.floor(bulbs));
  }
}

export function getCircuitWattsForExport(c: any, board: Board, settings: ProjectSettings): number {
  const isLighting = c.loadType === 'Lighting';
  if (!isLighting) {
    if (c.loadType === 'Sockets') {
      const area = (c.roomL || 0) * (c.roomW || 0);
      const factor = (settings.customRoomSockets && settings.customRoomSockets[c.room || '']) || settings.socketAreaFactor || 4;
      const calculatedSocketQty = area > 0 ? Math.max(1, Math.ceil(area / factor)) : 1;
      const qty = c.qty === 0 ? 0 : (c.qty || calculatedSocketQty);
      return (c.watts || 0) * qty;
    }
    return (c.watts || 0) * (c.qty || 1);
  }
  if (isLighting && c.qty && c.qty > 0) return (c.watts || 0) * c.qty;

  // Compute room props and total room watts for the whole board
  const roomProps = board.circuits.reduce((acc, curr) => {
    if (curr.loadType === 'Lighting' && curr.room) {
      if (!acc[curr.room] || (curr.roomL && curr.roomW)) {
        acc[curr.room] = {
          l: curr.roomL || 0,
          w: curr.roomW || 0,
          h: curr.ceilingH || 2.7,
        };
      }
    }
    return acc;
  }, {} as Record<string, { l: number; w: number; h: number }>);

  const roomTotalWatts = board.circuits.reduce((acc, curr) => {
    if (curr.loadType === 'Lighting' && curr.room) {
      acc[curr.room] = (acc[curr.room] || 0) + (curr.watts || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const rProps = (c.room && roomProps[c.room]) ? roomProps[c.room] : {
    l: c.roomL || 0,
    w: c.roomW || 0,
    h: c.ceilingH || 2.7
  };
  const area = rProps.l * rProps.w;
  if (area <= 0 || (rProps.l + rProps.w) <= 0) return (c.watts || 0);

  const targetLux = getTargetLuxForRoom(c.room || '', settings);
  const totalRoomW = roomTotalWatts[c.room || ''] || c.watts || 0;

  const defaultLpw = settings.defaultLPW || 200;
  const currentLumenVal = c.lumensPerUnit || ((c.watts || 0) * defaultLpw);
  const currentLpwVal = (c.watts || 0) > 0 ? currentLumenVal / c.watts : defaultLpw;

  const qty = calculateAutoLightingQtyForExport(
    rProps.l,
    rProps.w,
    c.watts,
    targetLux,
    rProps.h,
    settings.lightMF,
    totalRoomW,
    180,
    settings.lightingRoundingMode || 'actual'
  );

  return (c.watts || 0) * qty;
}

export const HEADERS_1P = [
  'Circuit ID',
  'Room',
  'Room L (m)',
  'Room W (m)',
  'Height (m)',
  'Area (m²)',
  'Target Lux',
  'Fixture Lumens',
  'Lumen/Watt',
  'Load Type',
  'Type',
  'Fixture Style',
  'Mount',
  'Watts/Unit',
  'Qty of Bulbs',
  'CB Rating (A)',
  'Wire Size (mm²)',
  'Cable Length (m)',
  'Cable Cores',
  'Cable Colors',
  'Switch Type',
  'Switch Qty',
  'Total Gangs',
  'Notes',
];

export const HEADERS_3P = [
  'Circuit ID',
  'Room',
  'Room L (m)',
  'Room W (m)',
  'Height (m)',
  'Area (m²)',
  'Target Lux',
  'Fixture Lumens',
  'Lumen/Watt',
  'Load Type',
  'Type',
  'Fixture Style',
  'Mount',
  'Watts/Unit',
  'Qty of Bulbs',
  'Phase',
  'CB Rating (A)',
  'Wire Size (mm²)',
  'Cable Length (m)',
  'Cable Cores',
  'Cable Colors',
  'Switch Type',
  'Switch Qty',
  'Total Gangs',
  'Notes',
];

export function getCircuitDetailedExportRow(c: any, isThreePhase: boolean, systemVoltage: number, settings: ProjectSettings, calculatedTotalWatts?: number) {
  const totalCircuitWatts = typeof calculatedTotalWatts === 'number' ? calculatedTotalWatts : (c.watts || 0) * (c.qty || 1);
  const isLighting = c.loadType === 'Lighting';
  let qtyVal = c.qty || 1;
  if (isLighting) {
    if (c.qty && c.qty > 0) {
      qtyVal = c.qty;
    } else if (c.watts > 0 && typeof calculatedTotalWatts === 'number') {
      qtyVal = Math.round((calculatedTotalWatts / c.watts) * 100) / 100;
    } else {
      qtyVal = 1;
    }
  }

  const typeDetail =
    c.loadType === 'Lighting'
      ? c.lightingType || ''
      : c.loadType === 'Sockets'
      ? c.socketType || ''
      : c.loadType === 'Air Conditioner'
      ? c.acType || ''
      : c.dedicatedType || '';

  let fixtureStyle =
    c.loadType === 'Lighting'
      ? c.fixtureStyle || ''
      : c.loadType === 'Sockets'
      ? c.socketVariance || c.socketFixtureStyle || '13A Socket'
      : c.loadType === 'Air Conditioner'
      ? c.acFixtureStyle || ''
      : c.dedicatedFixtureStyle || '';

  if (c.loadType === 'Lighting' && c.fixtureVariance && c.fixtureVariance !== 'None') {
    fixtureStyle = `${fixtureStyle} (${c.fixtureVariance})`;
  }

  const mount =
    c.loadType === 'Lighting'
      ? c.mountType || ''
      : c.loadType === 'Sockets'
      ? c.socketMountType || ''
      : c.loadType === 'Air Conditioner'
      ? c.acMountType || ''
      : '';

  const calculatedCB = calculateCB(
    c.watts,
    qtyVal,
    isThreePhase ? systemVoltage : settings.voltage,
    settings.powerFactor,
    isThreePhase,
    c.loadType
  );

  const colors = c.cableLength ? getCableColors(c.cableCores).join('/') : '—';
  const isSocketsOrDedicated = c.loadType === 'Sockets' || c.loadType === 'Dedicated';
  const switchType = isSocketsOrDedicated ? '' : c.switchType || '';
  const switchQty = isSocketsOrDedicated ? 0 : c.switchQty || 0;
  
  const getGangsMultiplier = (type: string): number => {
    if (type.includes('4 Gang')) return 4;
    if (type.includes('3 Gang')) return 3;
    if (type.includes('2 Gang')) return 2;
    if (type.includes('1 Gang')) return 1;
    if (type.includes('10 Grid')) return 10;
    if (type.includes('1G')) return 1;
    if (type.includes('2G')) return 2;
    if (type.includes('3G')) return 3;
    if (type.includes('4G')) return 4;
    return 0;
  };

  const gangs =
    !isSocketsOrDedicated && (c.switchQty || 0) > 0
      ? (c.switchQty || 0) * getGangsMultiplier(switchType)
      : '';

  const area = c.loadType === 'Lighting' && c.roomL && c.roomW ? Math.round(c.roomL * c.roomW * 10) / 10 : '';
  const targetLux = c.loadType === 'Lighting' ? getTargetLuxForRoom(c.room || '', settings) : '';
  const defaultLpw = settings.defaultLPW || 200;
  const lumensFixture = c.loadType === 'Lighting' ? (c.lumensPerUnit || (c.watts * defaultLpw)) : '';
  const lpw = c.loadType === 'Lighting' ? ((c.lumensPerUnit || (c.watts * defaultLpw)) / (c.watts || 1)).toFixed(1) : '';

  const coreRow = [
    c.circuitId,
    c.room || '',
    c.roomL || '',
    c.roomW || '',
    c.ceilingH || '',
    area,
    targetLux,
    lumensFixture,
    lpw,
    c.loadType,
    typeDetail,
    fixtureStyle,
    mount,
    c.watts || 0,
    qtyVal,
  ];

  if (isThreePhase) {
    return [
      ...coreRow,
      c.phase || '',
      calculatedCB,
      c.wire || '',
      c.cableLength || 0,
      c.cableCores || '',
      colors,
      switchType,
      switchQty,
      gangs,
      c.notes || '',
    ];
  } else {
    return [
      ...coreRow,
      calculatedCB,
      c.wire || '',
      c.cableLength || 0,
      c.cableCores || '',
      colors,
      switchType,
      switchQty,
      gangs,
      c.notes || '',
    ];
  }
}

// Export to Multi-Sheet Excel
export function exportToExcel(
  boards: Board[],
  hvacUnits: HvacUnit[],
  plumbingFixtures: PlumbingFixture[],
  fireZones: FireZone[],
  settings: ProjectSettings
) {
  const wb = XLSX.utils.book_new();
  const timestamp = new Date().toLocaleString();

  const appendSheet = (sheetName: string, data: any[][], colWidths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  // 1. Summary Sheet
  const totalElectricalLoad = boards.reduce(
    (acc, b) => acc + b.circuits.reduce((sum, c) => sum + getCircuitWattsForExport(c, b, settings), 0),
    0
  );
  const totalCoolingLoad = hvacUnits.reduce((acc, h) => acc + (h.coolingLoad || 0), 0);
  const totalFixtureUnits = plumbingFixtures.reduce(
    (acc, p) => acc + (p.qty || 1) * (p.fixtureUnits || 0),
    0
  );
  const totalSprinklers = fireZones.reduce(
    (acc, f) => acc + Math.ceil((f.area || 0) / (f.spacing || 12)),
    0
  );

  const summaryData = [
    ['MEP CALCULATOR TOOLKIT - PROJECT SUMMARY'],
    [],
    ['Project Name', settings.projectName],
    ['Project No.', settings.projectNo],
    ['Engineer', settings.engineer || '—'],
    ['Client', settings.client || '—'],
    ['Date', timestamp],
    [],
    ['── Design Parameters ──'],
    ['Supply Voltage', settings.voltage + ' V'],
    ['Frequency', settings.frequency + ' Hz'],
    ['Power Factor', settings.powerFactor],
    ['Demand Factor', settings.demandFactor],
    ['Diversity Factor', settings.diversityFactor],
    ['Design Temp', settings.tempDesign + ' °C'],
    ['Safety Margin', settings.safetyMargin + ' %'],
    [],
    ['── Totals Summary ──'],
    ['Discipline', 'Value'],
    ['Total Electrical Load', totalElectricalLoad.toLocaleString() + ' W'],
    ['Total Cooling Load', totalCoolingLoad.toFixed(1) + ' kW  /  ' + (totalCoolingLoad / 3.517).toFixed(2) + ' TR'],
    ['Total Fixture Units', totalFixtureUnits],
    ['Total Sprinkler Heads', totalSprinklers],
  ];

  appendSheet('Summary', summaryData, [25, 32]);

  // 2. Electrical Panels & Cable Colors Sheets
  boards.forEach(board => {
    const isThreePhase = board.phase === '3-Phase';
    const headers = isThreePhase ? HEADERS_3P : HEADERS_1P;

    const panelData: any[][] = [
      [`PANEL: ${board.name}  |  ${board.phase}  |  ${board.location}`],
      [`Project: ${settings.projectName}  |  ${timestamp}`],
      [],
      headers,
    ];

    let totalWatts = 0;
    const systemVoltage = settings.voltage <= 230 ? 400 : settings.voltage;

    board.circuits.forEach(c => {
      const computedWatts = getCircuitWattsForExport(c, board, settings);
      totalWatts += computedWatts;
      const row = getCircuitDetailedExportRow(c, isThreePhase, systemVoltage, settings, computedWatts);
      panelData.push(row);
    });

    panelData.push([]);
    panelData.push(['', '', '', '', '', '', '', 'TOTAL W', '', totalWatts]);

    const calculatedCurrentVal = isThreePhase
      ? (totalWatts / (Math.sqrt(3) * systemVoltage * settings.powerFactor)).toFixed(2)
      : (totalWatts / (settings.voltage * settings.powerFactor)).toFixed(2);

    panelData.push(['', '', '', '', '', '', '', 'Total Current (A)', '', parseFloat(calculatedCurrentVal)]);
    panelData.push(['', '', '', '', '', '', '', 'Demand Load (kW)', '', parseFloat((totalWatts * settings.demandFactor / 1000).toFixed(2))]);

    const widths = isThreePhase
      ? [10, 18, 12, 12, 14, 12, 12, 8, 6, 10, 8, 8, 10, 12, 10, 20, 12, 8, 8, 15]
      : [10, 18, 12, 12, 14, 12, 12, 8, 6, 10, 8, 10, 12, 10, 20, 12, 8, 8, 15];

    const cleanSheetName = board.name.replace(/[\\/*?[\]:]/g, '').slice(0, 31) || 'Panel';
    appendSheet(cleanSheetName, panelData, widths);

    // Cable Color Sheet for this board
    const colorLengths: Record<string, Record<string, { len: number; count: number }>> = {};
    board.circuits.forEach(c => {
      const length = c.cableLength || 0;
      if (!length || !c.wire) return;
      const colors = getCableColors(c.cableCores);
      colors.forEach(col => {
        colorLengths[col] = colorLengths[col] || {};
        colorLengths[col][c.wire] = colorLengths[col][c.wire] || { len: 0, count: 0 };
        colorLengths[col][c.wire].len += length;
        colorLengths[col][c.wire].count += 1;
      });
    });

    const activeColors = ['Red', 'Yellow', 'Blue', 'Black', 'Green'].filter(col => colorLengths[col]);
    if (activeColors.length > 0) {
      const allWires = Array.from(new Set(board.circuits.map(c => c.wire).filter(Boolean))).sort(
        (a, b) => parseFloat(a) - parseFloat(b)
      );

      const colorData: any[][] = [
        [`CABLE COLOR DISTRIBUTION - ${board.name}`],
        [`Project: ${settings.projectName}  |  ${timestamp}`],
        [],
        ['Color', ...allWires.map(w => `${w} mm²`), 'Total Conductor Length (m)'],
      ];

      activeColors.forEach(col => {
        const row: any[] = [col];
        let totalColorLength = 0;
        allWires.forEach(w => {
          const entry = colorLengths[col][w];
          if (entry) {
            row.push(`${Math.ceil(entry.len)} m (${entry.count} circuits)`);
            totalColorLength += entry.len;
          } else {
            row.push('—');
          }
        });
        row.push(Math.ceil(totalColorLength));
        colorData.push(row);
      });

      // All colors sum row
      const sumRow: any[] = ['All colors'];
      let grandTotalConductorLength = 0;
      allWires.forEach(w => {
        let wireSum = 0;
        activeColors.forEach(col => {
          if (colorLengths[col][w]) wireSum += colorLengths[col][w].len;
        });
        sumRow.push(`${Math.ceil(wireSum)} m`);
        grandTotalConductorLength += wireSum;
      });
      sumRow.push(Math.ceil(grandTotalConductorLength));
      colorData.push(sumRow);

      colorData.push([]);
      colorData.push([
        'Note: figures represent real conductor length for ordering, taking into account multicore cable lengths.',
      ]);

      appendSheet(
        (cleanSheetName + ' Colors').slice(0, 31),
        colorData,
        [15, ...allWires.map(() => 18), 18]
      );
    }
  });

  // 3. HVAC Sheet
  const hvacData: any[][] = [
    [`HVAC SCHEDULE  |  Project: ${settings.projectName}  |  ${timestamp}`],
    [],
    ['Zone', 'System Type', 'Area (m²)', 'Height (m)', 'Volume (m³)', 'Cooling (kW)', 'BTU/hr', 'Tons (TR)', 'Refrigerant', 'Supply CFM', 'Notes'],
  ];

  hvacUnits.forEach(h => {
    const volume = +(h.area * h.height).toFixed(1);
    const btu = +((h.coolingLoad || 0) * 3412).toFixed(0);
    const tr = +((h.coolingLoad || 0) / 3.517).toFixed(2);
    hvacData.push([
      h.zone,
      h.system,
      h.area,
      h.height,
      volume,
      h.coolingLoad || 0,
      btu,
      tr,
      h.refrigerant,
      h.cfm || '',
      h.notes || '',
    ]);
  });

  hvacData.push([]);
  hvacData.push(['', '', '', '', '', 'TOTAL kW', '', 'TOTAL TR']);
  hvacData.push(['', '', '', '', '', totalCoolingLoad.toFixed(1), '', (totalCoolingLoad / 3.517).toFixed(2)]);

  appendSheet('HVAC', hvacData, [18, 16, 12, 12, 12, 12, 12, 10, 12, 12, 20]);

  // 4. Plumbing Sheet
  const plumbingData: any[][] = [
    [`PLUMBING SCHEDULE  |  Project: ${settings.projectName}  |  ${timestamp}`],
    [],
    ['Zone/Area', 'Fixture', 'Qty', 'Fixture Units (FU)', 'Total FU', 'Pipe Size (mm)', 'Material', 'Cold Flow (L/min)', 'Hot Flow (L/min)', 'Notes'],
  ];

  plumbingFixtures.forEach(p => {
    const totalFU = (p.qty || 1) * (p.fixtureUnits || 0);
    plumbingData.push([
      p.zone,
      p.fixture,
      p.qty || 1,
      p.fixtureUnits || 0,
      totalFU,
      p.pipeSize,
      p.material,
      p.coldFlow || 0,
      p.hotFlow || 0,
      p.notes || '',
    ]);
  });

  plumbingData.push([]);
  plumbingData.push(['', '', '', 'TOTAL FU', totalFixtureUnits]);

  appendSheet('Plumbing', plumbingData, [16, 14, 8, 14, 10, 12, 14, 12, 12, 20]);

  // 5. Fire Suppression Sheet
  const fireData: any[][] = [
    [`FIRE SUPPRESSION SCHEDULE  |  Project: ${settings.projectName}  |  ${timestamp}`],
    ['Standard: NFPA 13'],
    [],
    ['Zone/Area', 'Hazard Classification', 'Sprinkler Type', 'Area (m²)', 'Spacing (m²/head)', 'Calculated Heads', 'Flow (L/min/head)', 'Total Flow (L/min)', 'Pipe Size (mm)', 'Notes'],
  ];

  fireZones.forEach(f => {
    const heads = Math.ceil((f.area || 0) / (f.spacing || 12));
    const totalFlow = heads * (f.flowRate || 80);
    fireData.push([
      f.zone,
      f.hazard,
      f.sprinklerType,
      f.area || 0,
      f.spacing || 12,
      heads,
      f.flowRate || 80,
      totalFlow,
      f.pipeSize || '',
      f.notes || '',
    ]);
  });

  fireData.push([]);
  fireData.push(['', '', '', '', 'TOTAL HEADS', totalSprinklers]);

  appendSheet('Fire Suppression', fireData, [16, 24, 14, 12, 16, 12, 16, 16, 12, 20]);

  // 6. BEME (Bill of Engineering Measurement and Evaluation) Sheet
  const bemeData: any[][] = [
    [`BILL OF ENGINEERING MEASUREMENT & EVALUATION (BEME)`],
    [`Project: ${settings.projectName}  |  Project No: ${settings.projectNo}`],
    [`Date: ${timestamp}`],
    [],
    ['S/N', 'Description of Materials / Equipment', 'Unit', 'Qty', 'Unit Rate ($)', 'Total Cost ($)'],
  ];

  let bemeSn = 1;
  let bemeGrandTotal = 0;

  const addBemeRow = (desc: string, unit: string, qty: number, rate: number) => {
    if (qty <= 0) return;
    const total = qty * rate;
    bemeData.push([bemeSn++, desc, unit, qty, rate, parseFloat(total.toFixed(2))]);
    bemeGrandTotal += total;
  };

  bemeData.push(['A', 'ELECTRICAL WORK SERVICES', '', '', '', '']);
  
  // Cables
  const cableAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  boards.forEach(b => {
    b.circuits.forEach(c => {
      const len = c.cableLength || 0;
      if (len > 0 && c.wire) {
        const key = `${c.wire} mm² (${c.cableCores})`;
        if (!cableAggs[key]) {
          let defaultRate = 1.8;
          const wireSizeNum = parseFloat(c.wire);
          if (wireSizeNum <= 1.5) defaultRate = 1.2;
          else if (wireSizeNum <= 2.5) defaultRate = 1.8;
          else if (wireSizeNum <= 4.0) defaultRate = 2.5;
          else if (wireSizeNum <= 6.0) defaultRate = 3.8;
          else defaultRate = 6.5;

          cableAggs[key] = {
            desc: `Low Voltage Copper Cable, XLPE/PVC, size ${c.wire}mm², ${c.cableCores}`,
            qty: 0,
            unit: 'm',
            rate: defaultRate,
          };
        }
        cableAggs[key].qty += Math.ceil(len);
      }
    });
  });
  Object.keys(cableAggs).forEach(k => {
    const item = cableAggs[k];
    addBemeRow(item.desc, item.unit, item.qty, item.rate);
  });

  // Miniature Circuit Breakers (excluding indented duplicates if needed, but for materials list physical is okay)
  const mcbAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  boards.forEach(b => {
    // Collect unique non-indented circuit breakers for BEME
    const seenCids = new Set<string>();
    b.circuits.forEach(c => {
      if (seenCids.has(c.circuitId)) return;
      seenCids.add(c.circuitId);
      
      const rating = getCircuitCBRating(c);
      if (rating > 0) {
        const key = `MCB ${rating}A`;
        if (!mcbAggs[key]) {
          let defaultRate = 12.0;
          if (rating > 32) defaultRate = 25.0;
          if (rating > 63) defaultRate = 45.0;

          mcbAggs[key] = {
            desc: `Miniature Circuit Breaker (MCB), Single Phase, ${rating}A, 10kA breaking capacity`,
            qty: 0,
            unit: 'Pcs',
            rate: defaultRate,
          };
        }
        mcbAggs[key].qty += 1;
      }
    });
  });
  Object.keys(mcbAggs).forEach(k => {
    const item = mcbAggs[k];
    addBemeRow(item.desc, item.unit, item.qty, item.rate);
  });

  // Switches
  const switchAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  boards.forEach(b => {
    b.circuits.forEach(c => {
      const qty = c.switchQty || 0;
      const type = c.switchType;
      if (qty > 0 && type) {
        const key = `Switch ${type}`;
        if (!switchAggs[key]) {
          let defaultRate = 4.5;
          if (type.includes('2')) defaultRate = 6.0;
          if (type.includes('3')) defaultRate = 7.5;
          if (type.includes('4')) defaultRate = 9.0;
          if (type.includes('10')) defaultRate = 24.0;

          switchAggs[key] = {
            desc: `Wall Mounted Lighting Control Switch, ${type}, White Decorative series`,
            qty: 0,
            unit: 'Pcs',
            rate: defaultRate,
          };
        }
        switchAggs[key].qty += qty;
      }
    });
  });
  Object.keys(switchAggs).forEach(k => {
    const item = switchAggs[k];
    addBemeRow(item.desc, item.unit, item.qty, item.rate);
  });

  // Sockets
  const socketMaterialAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  boards.forEach(b => {
    b.circuits.forEach(c => {
      if (c.loadType === 'Sockets') {
        const variance = c.socketVariance || '13A Socket';
        const area = (c.roomL || 0) * (c.roomW || 0);
        const factor = (settings.customRoomSockets && settings.customRoomSockets[c.room || '']) || settings.socketAreaFactor || 4;
        const calculatedSocketQty = area > 0 ? Math.max(1, Math.ceil(area / factor)) : 1;
        const qty = c.qty || calculatedSocketQty;

        if (qty > 0) {
          const key = `Socket ${variance}`;
          if (!socketMaterialAggs[key]) {
            socketMaterialAggs[key] = {
              desc: `Power Outlet Socket, ${variance}, Flush Mounted Decorative series`,
              qty: 0,
              unit: 'Pcs',
              rate: 8.50,
            };
          }
          socketMaterialAggs[key].qty += qty;
        }
      }
    });
  });
  Object.keys(socketMaterialAggs).forEach(k => {
    const item = socketMaterialAggs[k];
    addBemeRow(item.desc, item.unit, item.qty, item.rate);
  });

  // Panel Enclosures & Fittings
  boards.forEach(b => {
    const dbSlots: Array<{ cb: number; isThreePhase: boolean }> = [];
    let totalCableLength = 0;

    const uniqueCircuitsMap = new Map<string, { cb: number; isThreePhase: boolean }>();

    b.circuits.forEach(c => {
      const rating = getCircuitCBRating(c);
      totalCableLength += (c.cableLength || 0);
      if (rating <= 0) return;

      const cid = (c.circuitId || '').trim();
      if (!cid) return;

      const isDedicated3Ph = c.dedicatedType === 'Three Phase' || (c.fixtureVariance && c.fixtureVariance.includes('3ph'));

      if (!uniqueCircuitsMap.has(cid)) {
        uniqueCircuitsMap.set(cid, {
          cb: rating,
          isThreePhase: isDedicated3Ph,
        });
      } else {
        const existing = uniqueCircuitsMap.get(cid)!;
        if (rating > existing.cb) {
          existing.cb = rating;
        }
        if (isDedicated3Ph) {
          existing.isThreePhase = true;
        }
      }
    });

    uniqueCircuitsMap.forEach(item => {
      if (item.isThreePhase) {
        dbSlots.push({ cb: item.cb, isThreePhase: true });
        dbSlots.push({ cb: item.cb, isThreePhase: true });
        dbSlots.push({ cb: item.cb, isThreePhase: true });
      } else {
        dbSlots.push({ cb: item.cb, isThreePhase: false });
      }
    });

    const activeCBCount = uniqueCircuitsMap.size;
    const totalUsedPoles = dbSlots.length;
    if (totalUsedPoles > 0) {
      const standardWays = [4, 6, 8, 12, 18, 24, 36, 48, 72];
      const recommendedWays = standardWays.find(w => w >= totalUsedPoles) || 72;

      // 1. DB Enclosure Box
      const cabinetPrice = 45 + recommendedWays * 6.5;
      addBemeRow(
        `Distribution Board Cabinet Enclosure Case for panel ${b.name}, ${recommendedWays}-Way metal clad wall-box, complete with isolated neutral bar, earth bar, DIN rails, protective cover, door lock and busbar comb`,
        'Set',
        1,
        cabinetPrice
      );

      // 2. Cable Glands & Shrouds
      const glandQty = activeCBCount * 2;
      addBemeRow(
        `High Quality Brass Cable Entry Glands & Shrouds kit (M20/M25 compression type) to secure incoming/outgoing lines at DB panel and load junction boxes`,
        'Pcs',
        glandQty,
        2.80
      );

      // 3. PVC Conduits & Accessories
      const conduitQty = Math.max(5, Math.ceil(totalCableLength / 3)); // 3 meters per conduit
      addBemeRow(
        `Heavy duty high impact PVC electrical conduits (diameter 20mm/25mm), including spacer saddle clips, structural wall anchors, couplings, jointing adhesive, and layout accessories`,
        'Length',
        conduitQty,
        4.20
      );

      // 4. Earthing & Grounding Rod Set
      addBemeRow(
        `Earthing and lightning protection assembly for panel ${b.name} complete with 1.2m copper-bonded steel earth rod, heavy duty brass clamps, 16mm² green/yellow copper conductor, and composite inspection chamber`,
        'Lot',
        1,
        115.00
      );
    }
  });

  // Standby Generator
  const totalElectricalLoadW = boards.reduce(
    (acc, b) => acc + b.circuits.reduce((sum, c) => sum + getCircuitWattsForExport(c, b, settings), 0),
    0
  );
  const suggestedProjectGenKVA = totalElectricalLoadW > 0 ? (((totalElectricalLoadW / 1000) / 0.8) * 1.2) : 0;
  if (suggestedProjectGenKVA > 0) {
    const idealCB = suggestedProjectGenKVA * 1.44;
    addBemeRow(
      `Standby Diesel Generator Set (${suggestedProjectGenKVA.toFixed(1)} kVA) with calculated ideal CB of ${idealCB.toFixed(1)}A, complete with ATS, concrete plinth, cables & control wiring installation and commissioning`,
      'Set',
      1,
      Math.round(4000 + suggestedProjectGenKVA * 180)
    );
  }

  bemeData.push(['B', 'HVAC WORK SERVICES', '', '', '', '']);
  const hvacAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  hvacUnits.forEach(h => {
    const key = `${h.system} (${h.coolingLoad} kW)`;
    if (!hvacAggs[key]) {
      let defaultRate = 650.0;
      if (h.system.includes('Cassette')) defaultRate = 1200.0;
      if (h.system.includes('Central') || h.system.includes('Ducted')) defaultRate = 3500.0;

      hvacAggs[key] = {
        desc: `Air Conditioning System, ${h.system}, cooling capacity ${h.coolingLoad} kW, including outdoor unit and copper piping`,
        qty: 0,
        unit: 'Set',
        rate: defaultRate,
      };
    }
    hvacAggs[key].qty += 1;
  });
  Object.keys(hvacAggs).forEach(k => {
    const item = hvacAggs[k];
    addBemeRow(item.desc, item.unit, item.qty, item.rate);
  });

  bemeData.push(['C', 'PLUMBING WORK SERVICES', '', '', '', '']);
  const plumbingAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  plumbingFixtures.forEach(p => {
    const key = p.fixture;
    if (!plumbingAggs[key]) {
      let defaultRate = 180.0;
      if (key === 'WC') defaultRate = 220.0;
      if (key === 'Shower') defaultRate = 150.0;
      if (key === 'Bath') defaultRate = 350.0;

      plumbingAggs[key] = {
        desc: `Plumbing Fixture: High Quality ${key} including standard traps, chrome mixers, and connecting valves`,
        qty: 0,
        unit: 'No.',
        rate: defaultRate,
      };
    }
    plumbingAggs[key].qty += (p.qty || 1);
  });
  Object.keys(plumbingAggs).forEach(k => {
    const item = plumbingAggs[k];
    addBemeRow(item.desc, item.unit, item.qty, item.rate);
  });

  bemeData.push(['D', 'FIRE PROTECTION SERVICES', '', '', '', '']);
  addBemeRow('Fire Sprinkler Head (Pendant/Upright), brass finish, standard response, with piping connection', 'No.', totalSprinklers, 35.00);

  bemeData.push([]);
  bemeData.push(['', '', '', 'GRAND TOTAL PROJECT ESTIMATE', '', parseFloat(bemeGrandTotal.toFixed(2))]);

  appendSheet('BEME', bemeData, [6, 45, 10, 10, 14, 16]);

  // Write and Save
  const fileName = `MEP_${settings.projectName.replace(/\s+/g, '_')}_${settings.projectNo}.xlsx`;
  const rawData = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([rawData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export active board to CSV
export function exportActiveBoardToCSV(board: Board, settings: ProjectSettings) {
  const isThreePhase = board.phase === '3-Phase';
  const timestamp = new Date().toLocaleString();

  const escapeCSV = (val: any) => {
    const str = String(val ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const writeRow = (...args: any[]) => {
    return args.map(escapeCSV).join(',') + '\n';
  };

  let csvContent = '';
  csvContent += writeRow('MEP CALCULATOR TOOLKIT - CIRCUIT EXPORT');
  csvContent += writeRow('Project:', settings.projectName, 'Project No:', settings.projectNo);
  csvContent += writeRow('Active Panel:', board.name, 'Location:', board.location, 'Phase:', board.phase);
  csvContent += writeRow('Date/Time:', timestamp);
  csvContent += writeRow('');

  const headers = isThreePhase ? HEADERS_3P : HEADERS_1P;

  csvContent += writeRow(...headers);

  let totalW = 0;
  const systemVoltage = settings.voltage <= 230 ? 400 : settings.voltage;

  board.circuits.forEach(c => {
    const computedWatts = getCircuitWattsForExport(c, board, settings);
    totalW += computedWatts;
    const row = getCircuitDetailedExportRow(c, isThreePhase, systemVoltage, settings, computedWatts);
    csvContent += writeRow(...row);
  });

  csvContent += writeRow('');
  csvContent += writeRow('', '', '', '', '', '', '', 'TOTAL W', '', totalW);

  const calculatedCurrentVal = isThreePhase
    ? (totalW / (Math.sqrt(3) * systemVoltage * settings.powerFactor)).toFixed(2)
    : (totalW / (settings.voltage * settings.powerFactor)).toFixed(2);

  csvContent += writeRow('', '', '', '', '', '', '', 'Total Current (A)', '', calculatedCurrentVal);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MEP_${board.name.replace(/\s+/g, '_')}_${settings.projectNo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export active board to Excel (.xlsx or .xls)
export function exportActiveBoardToXLSX(board: Board, settings: ProjectSettings, isXls: boolean = false) {
  const isThreePhase = board.phase === '3-Phase';
  const timestamp = new Date().toLocaleString();
  const systemVoltage = settings.voltage <= 230 ? 400 : settings.voltage;

  const aoa: any[][] = [
    ['MEP CALCULATOR TOOLKIT - CIRCUIT EXPORT'],
    ['Project:', settings.projectName, 'Project No:', settings.projectNo],
    ['Active Panel:', board.name, 'Location:', board.location, 'Phase:', board.phase],
    ['Date/Time:', timestamp],
    []
  ];

  const headers = isThreePhase ? HEADERS_3P : HEADERS_1P;

  aoa.push(headers);

  let totalW = 0;

  board.circuits.forEach(c => {
    const computedWatts = getCircuitWattsForExport(c, board, settings);
    totalW += computedWatts;
    const row = getCircuitDetailedExportRow(c, isThreePhase, systemVoltage, settings, computedWatts);
    aoa.push(row);
  });

  aoa.push([]);
  
  const calculatedCurrentVal = isThreePhase
    ? (totalW / (Math.sqrt(3) * systemVoltage * settings.powerFactor)).toFixed(2)
    : (totalW / (settings.voltage * settings.powerFactor)).toFixed(2);

  // Pad summary values to match table layout
  const spacer = Array(6).fill('');
  aoa.push([...spacer, '', 'TOTAL W', '', totalW]);
  aoa.push([...spacer, '', 'Total Current (A)', '', Number(calculatedCurrentVal)]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, board.name.slice(0, 30));

  const ext = isXls ? 'xls' : 'xlsx';
  const mime = isXls ? 'application/vnd.ms-excel' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const bookType = isXls ? 'biff8' : 'xlsx';

  const rawData = XLSX.write(wb, { bookType, type: 'array' });
  const blob = new Blob([rawData], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MEP_${board.name.replace(/\s+/g, '_')}_${settings.projectNo}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export active board to Tab-Delimited text (.txt)
export function exportActiveBoardToTXT(board: Board, settings: ProjectSettings) {
  const isThreePhase = board.phase === '3-Phase';
  const timestamp = new Date().toLocaleString();
  const systemVoltage = settings.voltage <= 230 ? 400 : settings.voltage;

  const escapeTXT = (val: any) => {
    const str = String(val ?? '').replace(/\t/g, ' '); // remove inner tabs
    return str;
  };

  const writeRow = (...args: any[]) => {
    return args.map(escapeTXT).join('\t') + '\n';
  };

  let txtContent = '';
  txtContent += writeRow('MEP CALCULATOR TOOLKIT - CIRCUIT EXPORT');
  txtContent += writeRow('Project:', settings.projectName, 'Project No:', settings.projectNo);
  txtContent += writeRow('Active Panel:', board.name, 'Location:', board.location, 'Phase:', board.phase);
  txtContent += writeRow('Date/Time:', timestamp);
  txtContent += writeRow('');

  const headers = isThreePhase ? HEADERS_3P : HEADERS_1P;

  txtContent += writeRow(...headers);

  let totalW = 0;

  board.circuits.forEach(c => {
    const computedWatts = getCircuitWattsForExport(c, board, settings);
    totalW += computedWatts;
    const row = getCircuitDetailedExportRow(c, isThreePhase, systemVoltage, settings, computedWatts);
    txtContent += writeRow(...row);
  });

  txtContent += writeRow('');
  txtContent += writeRow('', '', '', '', '', '', '', 'TOTAL W', '', totalW);

  const calculatedCurrentVal = isThreePhase
    ? (totalW / (Math.sqrt(3) * systemVoltage * settings.powerFactor)).toFixed(2)
    : (totalW / (settings.voltage * settings.powerFactor)).toFixed(2);

  txtContent += writeRow('', '', '', '', '', '', '', 'Total Current (A)', '', calculatedCurrentVal);

  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MEP_${board.name.replace(/\s+/g, '_')}_${settings.projectNo}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
