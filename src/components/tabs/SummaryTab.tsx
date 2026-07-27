import React from 'react';
import { Board, HvacUnit, PlumbingFixture, FireZone, ProjectSettings, ROOM_LUX_DATABASE, SolarLoad, SolarConfig, GenLoad, SmartDevice, CctvCamera } from '../../types';
import { exportToExcel, exportActiveBoardToCSV, exportActiveBoardToXLSX, exportActiveBoardToTXT } from '../../utils/exportUtils';
import { Plus, Trash2, Edit, RotateCcw, RotateCw, Check, X, FileSpreadsheet, Copy, Settings, FileText, Printer, ShieldAlert } from 'lucide-react';

interface SummaryTabProps {
  boards: Board[];
  hvacUnits: HvacUnit[];
  plumbingFixtures: PlumbingFixture[];
  fireZones: FireZone[];
  solarLoads?: SolarLoad[];
  solarCfg?: SolarConfig;
  genLoads?: GenLoad[];
  smartDevices?: SmartDevice[];
  cameras?: CctvCamera[];
  settings: ProjectSettings;
  mainsOverrides?: Record<string, number>;
}

export default function SummaryTab({
  boards,
  hvacUnits,
  plumbingFixtures,
  fireZones,
  solarLoads = [],
  solarCfg,
  genLoads = [],
  smartDevices = [],
  cameras = [],
  settings,
  mainsOverrides
}: SummaryTabProps) {
  // Aggregate Calculations
  const totalElectricalLoadW = boards.reduce(
    (acc, b) => acc + b.circuits.reduce((sum, c) => sum + (c.watts || 0) * (c.qty || 1), 0),
    0
  );

  const totalCoolingLoadKW = hvacUnits.reduce((acc, h) => acc + (h.coolingLoad || 0), 0);
  const totalCoolingLoadTR = totalCoolingLoadKW / 3.517;

  const totalPlumbingFU = plumbingFixtures.reduce((acc, p) => acc + (p.qty || 1) * (p.fixtureUnits || 0), 0);
  const totalSprinklerHeads = fireZones.reduce((acc, f) => acc + Math.ceil((f.area || 0) / (f.spacing || 12)), 0);

  return (
    <div>
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 mb-4">
        <div className="text-xs font-bold text-[#718096] mb-3 uppercase tracking-wider">
          📋 General Project Sizing Specifications
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            ['Project Name', settings.projectName],
            ['Project No.', settings.projectNo],
            ['Engineer Name', settings.engineer || '—'],
            ['Client Name', settings.client || '—'],
            ['Grid Voltage', `${settings.voltage} V`],
            ['Grid Frequency', `${settings.frequency} Hz`],
            ['Aggregate cos φ (PF)', settings.powerFactor],
            ['Peak Design Temp', `${settings.tempDesign} °C`],
          ].map(([label, val]) => (
            <div key={label} className="bg-[#0f1117] p-3 rounded-lg border border-[#2d3748]">
              <div className="text-[#718096] text-[10px] mb-1 font-semibold uppercase tracking-wider">{label}</div>
              <div className="text-[#cbd5e0] font-bold text-sm truncate">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Electrical Panels Summary */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
          <div className="font-bold text-yellow-400 mb-3 text-sm flex items-center gap-2">
            <span>⚡</span> Electrical Panels Load Schedule
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {boards.map(b => {
              const panelW = b.circuits.reduce((sum, c) => sum + (c.watts || 0) * (c.qty || 1), 0);
              return (
                <div key={b.id} className="flex justify-between items-center bg-[#0f1117] p-2.5 rounded-lg border border-[#2d3748] text-xs">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{b.name}</span>
                    <span className="text-[10px] text-[#718096]">
                      {b.phase} &bull; {b.location || 'No Location'}
                    </span>
                  </div>
                  <span className="font-bold text-green-400 text-sm">{panelW.toLocaleString()} W</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#2d3748] text-sm font-bold">
            <span className="text-[#cbd5e0]">Grand Installed Power Load</span>
            <span className="text-green-400 text-base">{totalElectricalLoadW.toLocaleString()} W</span>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs font-bold">
            <span className="text-gray-400">Suggested Project Generator Size</span>
            <span className="text-yellow-400 font-mono">
              {totalElectricalLoadW > 0 ? (((totalElectricalLoadW / 1000) / 0.8) * 1.2).toFixed(1) : '0.0'} kVA
            </span>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs font-bold">
            <span className="text-gray-400">Calculated Ideal CB (Generator * 1.44)</span>
            <span className="text-yellow-400 font-mono">
              {totalElectricalLoadW > 0 ? ((((totalElectricalLoadW / 1000) / 0.8) * 1.2) * 1.44).toFixed(1) : '0.0'} A
            </span>
          </div>
        </div>

        {/* HVAC Sizing Summary */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
          <div className="font-bold text-[#63b3ed] mb-3 text-sm flex items-center gap-2">
            <span>❄️</span> HVAC Zone Sizing Schedule
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {hvacUnits.map(h => (
              <div key={h.id} className="flex justify-between items-center bg-[#0f1117] p-2.5 rounded-lg border border-[#2d3748] text-xs">
                <div className="flex flex-col">
                  <span className="font-semibold text-white">{h.zone}</span>
                  <span className="text-[10px] text-[#718096]">
                    {h.system} &bull; Area {h.area} m²
                  </span>
                </div>
                <span className="font-bold text-[#63b3ed] text-sm">{h.coolingLoad} kW</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#2d3748] text-sm font-bold">
            <span className="text-[#cbd5e0]">Total Sizing Capacity</span>
            <span className="text-[#63b3ed] text-base">
              {totalCoolingLoadKW.toFixed(1)} kW / {totalCoolingLoadTR.toFixed(2)} TR
            </span>
          </div>
        </div>

        {/* Plumbing Fixtures Summary */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
          <div className="font-bold text-sky-400 mb-3 text-sm flex items-center gap-2">
            <span>💧</span> Plumbing Fixtures Summary
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {plumbingFixtures.map(p => {
              const totalFU = (p.qty || 1) * (p.fixtureUnits || 0);
              return (
                <div key={p.id} className="flex justify-between items-center bg-[#0f1117] p-2.5 rounded-lg border border-[#2d3748] text-xs">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{p.zone}</span>
                    <span className="text-[10px] text-[#718096]">
                      {p.fixture} &bull; Qty {p.qty}
                    </span>
                  </div>
                  <span className="font-bold text-sky-400 text-sm">{totalFU} FU</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#2d3748] text-sm font-bold">
            <span className="text-[#cbd5e0]">Total System Fixture Units</span>
            <span className="text-sky-400 text-base">{totalPlumbingFU} FU</span>
          </div>
        </div>

        {/* Fire Suppression Summary */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
          <div className="font-bold text-red-400 mb-3 text-sm flex items-center gap-2">
            <span>🔥</span> Fire Suppression Summary (Heads)
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {fireZones.map(f => {
              const heads = Math.ceil((f.area || 0) / (f.spacing || 12));
              return (
                <div key={f.id} className="flex justify-between items-center bg-[#0f1117] p-2.5 rounded-lg border border-[#2d3748] text-xs">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{f.zone}</span>
                    <span className="text-[10px] text-[#718096]">
                      {f.hazard} &bull; {f.sprinklerType}
                    </span>
                  </div>
                  <span className="font-bold text-red-400 text-sm">{heads} Heads</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#2d3748] text-sm font-bold">
            <span className="text-[#cbd5e0]">Total Sprinkler Heads Needed</span>
            <span className="text-red-400 text-base">{totalSprinklerHeads} Heads</span>
          </div>
        </div>
      </div>

      {/* Interactive Bill of Engineering Measurement & Evaluation (BEME) */}
      <BemeInteractiveTable 
        boards={boards}
        hvacUnits={hvacUnits}
        plumbingFixtures={plumbingFixtures}
        totalSprinklerHeads={totalSprinklerHeads}
        solarLoads={solarLoads}
        solarCfg={solarCfg}
        genLoads={genLoads}
        smartDevices={smartDevices}
        cameras={cameras}
        settings={settings}
        mainsOverrides={mainsOverrides}
      />

      {/* Export Row */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6 text-center shadow-lg">
        <div className="font-bold text-base text-[#cbd5e0] mb-2 flex justify-center items-center gap-2">
          <span>📊</span> Export Complete MEP Engineering Report
        </div>
        <div className="text-xs text-[#718096] max-w-xl mx-auto mb-5 leading-relaxed">
          Generate a detailed multi-sheet Excel spreadsheet with calculated values, wire size distributions, color cores, schedules, and calculations compiled across all active panels, HVAC zones, plumbing fixtures, and fire suppression systems.
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-2xl mx-auto">
          {/* Complete MEP Book */}
          <button
            onClick={() => exportToExcel(boards, hvacUnits, plumbingFixtures, fireZones, settings)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white font-bold text-sm px-6 py-3 rounded-lg cursor-pointer transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            📊 Export Complete MEP Book (.xlsx)
          </button>

          {/* Active Panel Multi-Format Exporter */}
          {boards && boards.length > 0 && (
            <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-start bg-[#13192a] border border-[#2d3748] rounded-lg p-2.5 relative">
              <span className="text-[10px] text-[#718096] uppercase font-bold tracking-wider px-1 mb-1.5 text-left">
                Export Active Panel ({boards[0].name})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => exportActiveBoardToXLSX(boards[0], settings, false)}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-xs text-blue-400 font-bold transition-all cursor-pointer"
                  title="Excel Workbook"
                >
                  .xlsx
                </button>
                <button
                  onClick={() => exportActiveBoardToXLSX(boards[0], settings, true)}
                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded text-xs text-cyan-400 font-bold transition-all cursor-pointer"
                  title="Excel 97-2004 Workbook"
                >
                  .xls
                </button>
                <button
                  onClick={() => exportActiveBoardToTXT(boards[0], settings)}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-xs text-purple-400 font-bold transition-all cursor-pointer"
                  title="Tab-Delimited Plain Text"
                >
                  .txt
                </button>
                <button
                  onClick={() => exportActiveBoardToCSV(boards[0], settings)}
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 rounded text-xs text-amber-400 font-bold transition-all cursor-pointer"
                  title="Comma Separated Values"
                >
                  .csv
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BemeInteractiveTableProps {
  boards: Board[];
  hvacUnits: HvacUnit[];
  plumbingFixtures: PlumbingFixture[];
  totalSprinklerHeads: number;
  solarLoads: SolarLoad[];
  solarCfg?: SolarConfig;
  genLoads: GenLoad[];
  smartDevices: SmartDevice[];
  cameras: CctvCamera[];
  settings: ProjectSettings;
  mainsOverrides?: Record<string, number>;
}

interface BemeItem {
  id: string;
  category: string;
  desc: string;
  unit: string;
  qty: number;
  defaultRate: number;
  productDefaultRate: number;
  serviceDefaultRate: number;
}

function BemeInteractiveTable({
  boards,
  hvacUnits,
  plumbingFixtures,
  totalSprinklerHeads,
  solarLoads = [],
  solarCfg,
  genLoads = [],
  smartDevices = [],
  cameras = [],
  settings,
  mainsOverrides
}: BemeInteractiveTableProps) {
  // Scrollbar synchronisation
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const dummyScrollRef = React.useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = React.useState(2100);
  const isSyncingScroll = React.useRef(false);

  const syncScrolls = (source: HTMLDivElement | null, targets: (HTMLDivElement | null)[]) => {
    if (!source || isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const scrollLeft = source.scrollLeft;
    targets.forEach(target => {
      if (target) {
        target.scrollLeft = scrollLeft;
      }
    });
    isSyncingScroll.current = false;
  };

  const handleTableScroll = () => {
    syncScrolls(tableContainerRef.current, [topScrollRef.current, dummyScrollRef.current]);
  };

  const handleTopScroll = () => {
    syncScrolls(topScrollRef.current, [tableContainerRef.current, dummyScrollRef.current]);
  };

  const handleDummyScroll = () => {
    syncScrolls(dummyScrollRef.current, [tableContainerRef.current, topScrollRef.current]);
  };

  const scrollTableBy = (delta: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    const tableContainer = tableContainerRef.current;
    if (!tableContainer) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setTableScrollWidth(entry.target.scrollWidth);
      }
    });

    observer.observe(tableContainer);
    return () => observer.disconnect();
  });

  const currencyCode = settings?.currencyCode || 'USD';
  const currencySymbol = settings?.currencySymbol || '$';
  const currencyRate = settings?.currencyRate || 1.0;

  // --- Dynamic Aggregation ---
  const bemeItems: BemeItem[] = [];

  // --- A. Cables ---
  const cableAggs: Record<string, { desc: string; qty: number; unit: string; rate: number; cores: string }> = {};
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
            desc: `LV Copper Cable, XLPE/PVC, ${c.wire}mm² ${c.cableCores}`,
            qty: 0,
            unit: 'm',
            rate: defaultRate,
            cores: c.cableCores,
          };
        }
        cableAggs[key].qty += Math.ceil(len);
      }
    });
  });

  // Sort Cable Types smallest to largest size
  const sortedCableKeys = Object.keys(cableAggs).sort((a, b) => {
    const aSize = parseFloat(a) || 0;
    const bSize = parseFloat(b) || 0;
    return aSize - bSize;
  });

  sortedCableKeys.forEach(k => {
    const item = cableAggs[k];
    bemeItems.push({
      id: `CABLE_${k}`,
      category: 'Electrical Works',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.70, // 70% Product
      serviceDefaultRate: item.rate * 0.30, // 30% Service
    });
  });

  // --- B. Circuit Breakers ---
  const mcbAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  boards.forEach(b => {
    const seenCids = new Set<string>();
    b.circuits.forEach(c => {
      if (seenCids.has(c.circuitId)) return;
      seenCids.add(c.circuitId);

      const rating = c.cb || 0;
      if (rating > 0) {
        const key = `MCB ${rating}A`;
        if (!mcbAggs[key]) {
          let defaultRate = 12.0;
          if (rating > 32) defaultRate = 25.0;
          if (rating > 63) defaultRate = 45.0;

          mcbAggs[key] = {
            desc: `MCB 1-Phase, ${rating}A 10kA`,
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
    bemeItems.push({
      id: `MCB_${k}`,
      category: 'Electrical Works',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.85, // 85% Product
      serviceDefaultRate: item.rate * 0.15, // 15% Service
    });
  });

  // --- C. Switches ---
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
          if (type.includes('Isolator')) defaultRate = 45.0;

          switchAggs[key] = {
            desc: `Wall Switch, ${type}`,
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
    bemeItems.push({
      id: `SWITCH_${k}`,
      category: 'Electrical Works',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.80, // 80% Product
      serviceDefaultRate: item.rate * 0.20, // 20% Service
    });
  });

  // --- C1-A. Sockets & Outlets ---
  const socketAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  boards.forEach(b => {
    b.circuits.forEach(c => {
      if (c.loadType === 'Sockets') {
        const area = (c.roomL || 0) * (c.roomW || 0);
        const factor = (settings.customRoomSockets && settings.customRoomSockets[c.room || '']) || settings.socketAreaFactor || 4;
        const calculatedSocketQty = area > 0 ? Math.max(1, Math.ceil(area / factor)) : 1;
        const qty = c.qty || calculatedSocketQty;
        const variance = c.socketVariance || '13A Socket';
        const key = variance;
        if (!socketAggs[key]) {
          socketAggs[key] = {
            desc: `Socket Outlet, ${variance}`,
            qty: 0,
            unit: 'Pcs',
            rate: 8.50
          };
        }
        socketAggs[key].qty += qty;
      }
    });
  });
  Object.keys(socketAggs).forEach(k => {
    const item = socketAggs[k];
    bemeItems.push({
      id: `SOCKET_FIXTURE_${k}`,
      category: 'Electrical Works',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.80, // 80% Product
      serviceDefaultRate: item.rate * 0.20, // 20% Service
    });
  });

  // --- C1-B. Lighting Fixtures ---
  const lightingAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  boards.forEach(b => {
    b.circuits.forEach(c => {
      if (c.loadType === 'Lighting') {
        const area = (c.roomL || 0) * (c.roomW || 0);
        const targetLux = (c.room && settings.customRoomLux && settings.customRoomLux[c.room]) || (c.room && ROOM_LUX_DATABASE[c.room]) || settings.targetLux || 300;
        const maintenanceFactor = settings.lightMF || 0.8;
        const lpw = settings.defaultLPW || 200;
        const lampWatts = c.watts || 12;
        const rawBulbQty = (lampWatts > 0 && area > 0) ? (targetLux * area) / (lampWatts * lpw * maintenanceFactor) : 1;
        
        let calculatedBulbQty = 1;
        if (settings.lightingRoundingMode === 'ceil') {
          calculatedBulbQty = Math.max(1, Math.ceil(rawBulbQty));
        } else if (settings.lightingRoundingMode === 'floor') {
          calculatedBulbQty = Math.max(1, Math.floor(rawBulbQty));
        } else if (settings.lightingRoundingMode === 'round') {
          calculatedBulbQty = Math.max(1, Math.round(rawBulbQty));
        } else {
          calculatedBulbQty = Math.max(1, Math.ceil(rawBulbQty));
        }
        
        const variance = c.fixtureVariance || 'Standard Fixture';
        const style = c.fixtureStyle || 'Spot';
        const key = `${style} - ${variance}`;
        if (!lightingAggs[key]) {
          lightingAggs[key] = {
            desc: `LED Light Fixture, Style ${style} (${variance})`,
            qty: 0,
            unit: 'Pcs',
            rate: 15.00
          };
        }
        lightingAggs[key].qty += calculatedBulbQty;
      }
    });
  });
  Object.keys(lightingAggs).forEach(k => {
    const item = lightingAggs[k];
    bemeItems.push({
      id: `LIGHT_FIXTURE_${k}`,
      category: 'Electrical Works',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.85, // 85% Product
      serviceDefaultRate: item.rate * 0.15, // 15% Service
    });
  });

  // --- C1-C. Main Incomer Amp Isolator & SPD Protection Surge (New Requirements) ---
  boards.forEach(b => {
    // Calculate recommended CB rating
    const totalAmps = b.circuits.reduce((sum, c) => {
      const watts = c.watts || 0;
      const qty = c.qty || 1;
      const phase = c.phase || 'Single Phase';
      const voltage = phase === 'Three Phase' ? 400 : 230;
      const pf = settings.powerFactor || 0.85;
      const amps = phase === 'Three Phase' 
        ? (watts * qty) / (Math.sqrt(3) * voltage * pf)
        : (watts * qty) / (voltage * pf);
      return sum + (isNaN(amps) ? 0 : amps);
    }, 0);
    const demandAmps = totalAmps * (settings.demandFactor || 0.8);
    const CB_SIZES = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 400];
    const recommendedCB = CB_SIZES.find(f => f >= demandAmps * 1.25) || 100;
    const incomerRating = mainsOverrides?.[b.id] ?? recommendedCB;

    // 1. Main Incomer Amp Isolator
    bemeItems.push({
      id: `MAIN_INCOMER_${b.id}`,
      category: 'Electrical Works',
      desc: `Main Incomer Isolator, ${incomerRating}A`,
      unit: 'Pcs',
      qty: 1,
      defaultRate: incomerRating <= 32 ? 38.0 : incomerRating <= 63 ? 58.0 : incomerRating <= 100 ? 95.0 : 180.0,
      productDefaultRate: (incomerRating <= 32 ? 38.0 : incomerRating <= 63 ? 58.0 : incomerRating <= 100 ? 95.0 : 180.0) * 0.85,
      serviceDefaultRate: (incomerRating <= 32 ? 38.0 : incomerRating <= 63 ? 58.0 : incomerRating <= 100 ? 95.0 : 180.0) * 0.15,
    });

    // 2. SPD Protection Surge
    bemeItems.push({
      id: `SPD_SURGE_${b.id}`,
      category: 'Electrical Works',
      desc: `SPD Surge Protector, Class II 40kA`,
      unit: 'Pcs',
      qty: 1,
      defaultRate: 75.0,
      productDefaultRate: 75.0 * 0.85,
      serviceDefaultRate: 75.0 * 0.15,
    });
  });

  // --- C1-D. Electrical Panel Enclosures & Fittings ---
  boards.forEach(b => {
    const dbSlots: Array<{ cb: number; isThreePhase: boolean }> = [];
    let totalCableLength = 0;

    const uniqueCircuitsMap = new Map<string, { cb: number; isThreePhase: boolean }>();

    b.circuits.forEach(c => {
      const rating = c.cb || 0;
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

      // DB Enclosure Box
      const cabinetPrice = 45 + recommendedWays * 6.5;
      bemeItems.push({
        id: `PANEL_ENCLOSURE_${b.id}`,
        category: 'Electrical Works',
        desc: `DB Enclosure for ${b.name}, ${recommendedWays}-Way Metal Box`,
        unit: 'Set',
        qty: 1,
        defaultRate: cabinetPrice,
        productDefaultRate: cabinetPrice * 0.90,
        serviceDefaultRate: cabinetPrice * 0.10,
      });

      // Cable Glands & Shrouds
      const glandQty = activeCBCount * 2;
      bemeItems.push({
        id: `PANEL_GLANDS_${b.id}`,
        category: 'Electrical Works',
        desc: `Brass Cable Glands Kit (M20/M25)`,
        unit: 'Pcs',
        qty: glandQty,
        defaultRate: 2.80,
        productDefaultRate: 2.10,
        serviceDefaultRate: 0.70,
      });

      // PVC Conduits & Accessories
      const conduitQty = Math.max(5, Math.ceil(totalCableLength / 3));
      bemeItems.push({
        id: `PANEL_CONDUITS_${b.id}`,
        category: 'Electrical Works',
        desc: `Heavy Duty PVC Conduit & Accessories (20/25mm)`,
        unit: 'Length',
        qty: conduitQty,
        defaultRate: 4.20,
        productDefaultRate: 2.90,
        serviceDefaultRate: 1.30,
      });

      // Earthing & Grounding Rod Set
      bemeItems.push({
        id: `PANEL_EARTHING_${b.id}`,
        category: 'Electrical Works',
        desc: `Grounding Rod Set for ${b.name}, Copper Rod & 16mm² Conductor`,
        unit: 'Lot',
        qty: 1,
        defaultRate: 115.00,
        productDefaultRate: 85.00,
        serviceDefaultRate: 30.00,
      });
    }
  });

  // --- C2. Standby Generator ---
  const STANDARD_GEN_RATINGS = [
    15, 20, 30, 40, 50, 60, 80, 100, 135, 150, 200, 250, 300, 350, 500, 750, 800, 1000, 2000, 2500
  ];

  const totalElectricalLoadW = boards.reduce(
    (acc, b) => acc + b.circuits.reduce((sum, c) => sum + (c.watts || 0) * (c.qty || 1), 0),
    0
  );

  let finalGenKVA = 0;
  let genFuelType = 'Diesel';
  let isFromLoadsTab = false;

  if (genLoads.length > 0) {
    isFromLoadsTab = true;
    const demandKW = genLoads.reduce((sum, item) => sum + (item.kw || 0) * (item.qty || 1) * (item.demandFactor || 1), 0);
    const demandKVA = demandKW / 0.8; // pf fallback
    const startingKVA = genLoads.reduce(
      (sum, item) => sum + ((item.kw || 0) * (item.qty || 1) * (item.startingFactor || 1)) / (item.pf || 0.8),
      0
    );
    const targetTransientKVA = startingKVA > 0 ? startingKVA * 1.10 : demandKVA * 1.10;
    const nearestRating = STANDARD_GEN_RATINGS.reduce((prev, curr) => {
      return Math.abs(curr - targetTransientKVA) < Math.abs(prev - targetTransientKVA) ? curr : prev;
    }, STANDARD_GEN_RATINGS[0]);
    const minForDemand = STANDARD_GEN_RATINGS.find(r => r >= demandKVA) || 15;
    finalGenKVA = Math.max(nearestRating, minForDemand);
  } else {
    const suggestedProjectGenKVA = totalElectricalLoadW > 0 ? (((totalElectricalLoadW / 1000) / 0.8) * 1.2) : 0;
    if (suggestedProjectGenKVA > 0) {
      finalGenKVA = STANDARD_GEN_RATINGS.find(rating => rating >= suggestedProjectGenKVA) || 500;
    }
  }

  if (finalGenKVA > 0) {
    const idealCB = finalGenKVA * 1.44;
    const genRate = Math.round(4000 + finalGenKVA * 180);
    bemeItems.push({
      id: 'STANDBY_GENERATOR',
      category: 'Standby Power Generation',
      desc: `Standby ${genFuelType} GenSet ${finalGenKVA.toFixed(1)}kVA (with ATS & Soundproof Canopy)`,
      unit: 'Set',
      qty: 1,
      defaultRate: genRate,
      productDefaultRate: genRate * 0.90, // 90% Product (Gen equipment)
      serviceDefaultRate: genRate * 0.10, // 10% Service (ATS/Cabling installation)
    });
  }

  // --- D. HVAC AC Sizing ---
  const hvacAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  hvacUnits.forEach(h => {
    const key = `${h.system} (${h.coolingLoad} kW)`;
    if (!hvacAggs[key]) {
      let defaultRate = 650.0;
      if (h.system.includes('Cassette')) defaultRate = 1200.0;
      if (h.system.includes('Central') || h.system.includes('Ducted')) defaultRate = 3500.0;

      hvacAggs[key] = {
        desc: `A/C Unit ${h.system}, Cooling Load: ${h.coolingLoad}kW`,
        qty: 0,
        unit: 'Set',
        rate: defaultRate,
      };
    }
    hvacAggs[key].qty += (h.quantity || 1);
  });
  Object.keys(hvacAggs).forEach(k => {
    const item = hvacAggs[k];
    bemeItems.push({
      id: `HVAC_${k}`,
      category: 'HVAC Services',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.85, // 85% Product
      serviceDefaultRate: item.rate * 0.15, // 15% Service
    });
  });

  // --- E. Plumbing Fixtures ---
  const plumbingAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  plumbingFixtures.forEach(p => {
    const key = p.fixture;
    if (!plumbingAggs[key]) {
      let defaultRate = 180.0;
      if (key === 'WC') defaultRate = 220.0;
      if (key === 'Shower') defaultRate = 150.0;
      if (key === 'Bath' || key === 'Bathtub') defaultRate = 350.0;

      plumbingAggs[key] = {
        desc: `Sanitary Fixture: ${key} (with connectors & valves)`,
        qty: 0,
        unit: 'No.',
        rate: defaultRate,
      };
    }
    plumbingAggs[key].qty += (p.qty || 1);
  });
  Object.keys(plumbingAggs).forEach(k => {
    const item = plumbingAggs[k];
    bemeItems.push({
      id: `PLUMBING_${k}`,
      category: 'Plumbing Works',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.75, // 75% Product
      serviceDefaultRate: item.rate * 0.25, // 25% Service
    });
  });

  // --- F. Fire Suppression ---
  if (totalSprinklerHeads > 0) {
    bemeItems.push({
      id: 'FIRE_SPRINKLER',
      category: 'Fire Protection',
      desc: 'Fire Sprinkler Head (Pendant/Upright)',
      unit: 'No.',
      qty: totalSprinklerHeads,
      defaultRate: 35.00,
      productDefaultRate: 24.50, // 70% Product
      serviceDefaultRate: 10.50, // 30% Service
    });
  }

  // --- G. CCTV Sizing / Cameras ---
  const cctvAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  cameras.forEach(cam => {
    const key = `${cam.type} (${cam.resolution})`;
    if (!cctvAggs[key]) {
      let defaultRate = 120.0;
      if (cam.resolution.includes('4K') || cam.resolution.includes('8MP')) defaultRate = 220.0;
      else if (cam.resolution.includes('4MP')) defaultRate = 160.0;

      cctvAggs[key] = {
        desc: `IP Camera, ${cam.type} (${cam.resolution}, ${cam.indoor ? 'Indoor' : 'IP67 Weatherproof'})`,
        qty: 0,
        unit: 'Pcs',
        rate: defaultRate,
      };
    }
    cctvAggs[key].qty += (cam.qty || 1);
  });
  Object.keys(cctvAggs).forEach(k => {
    const item = cctvAggs[k];
    bemeItems.push({
      id: `CCTV_${k}`,
      category: 'CCTV & Security Systems',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.80, // 80% Product
      serviceDefaultRate: item.rate * 0.20, // 20% Service
    });
  });

  // CCTV NVR & Storage
  if (cameras.length > 0) {
    const totalCams = cameras.reduce((sum, c) => sum + (c.qty || 1), 0);
    const retentionVal = settings?.cctvDefaultRetention || 30;
    const storageTB = Math.ceil((totalCams * retentionVal * 0.05)); // rough estimate: 50GB per camera day
    const nvrRate = 350 + (totalCams > 8 ? 450 : 150);
    bemeItems.push({
      id: 'CCTV_NVR_SYSTEM',
      category: 'CCTV & Security Systems',
      desc: `NVR Video Recorder, ${totalCams > 8 ? '16' : '8'}-Channel with ${Math.max(2, storageTB)}TB Storage`,
      unit: 'Set',
      qty: 1,
      defaultRate: nvrRate,
      productDefaultRate: nvrRate * 0.90,
      serviceDefaultRate: nvrRate * 0.10,
    });
  }

  // --- H. Solar & Inverter ---
  if (solarLoads.length > 0 && solarCfg) {
    // Solar PV Modules
    const totalDailyWh = solarLoads.reduce((sum, l) => sum + (l.watts * l.qty * l.hoursPerDay), 0);
    const requiredSolarW = (totalDailyWh * (solarCfg.safetyFactor || 1.25)) / (solarCfg.peakSunHours || 5.0);
    const panelsNeeded = Math.ceil(requiredSolarW / (solarCfg.panelWattage || 400));

    if (panelsNeeded > 0) {
      const panelRate = 180;
      bemeItems.push({
        id: 'SOLAR_PANELS',
        category: 'Renewable Solar Energy',
        desc: `Solar PV Module (${solarCfg.panelWattage}W Monocrystalline)`,
        unit: 'Pcs',
        qty: panelsNeeded,
        defaultRate: panelRate,
        productDefaultRate: panelRate * 0.85,
        serviceDefaultRate: panelRate * 0.15,
      });
    }

    // Solar Batteries
    const requiredBatteryWh = (totalDailyWh * (solarCfg.daysAutonomy || 1)) / ((solarCfg.dod || 0.8) * (solarCfg.batteryEff || 0.85));
    const singleBatteryWh = (solarCfg.batteryAh || 200) * (solarCfg.batteryVoltage || 12);
    const batteriesNeeded = Math.ceil(requiredBatteryWh / (singleBatteryWh || 2400));

    if (batteriesNeeded > 0) {
      const batteryRate = solarCfg.batteryType?.includes('Lithium') ? 650 : 250;
      bemeItems.push({
        id: 'SOLAR_BATTERIES',
        category: 'Renewable Solar Energy',
        desc: `Deep Cycle Solar Battery, ${solarCfg.batteryType} ${solarCfg.batteryAh}Ah ${solarCfg.batteryVoltage}V`,
        unit: 'Pcs',
        qty: batteriesNeeded,
        defaultRate: batteryRate,
        productDefaultRate: batteryRate * 0.90,
        serviceDefaultRate: batteryRate * 0.10,
      });
    }

    // Inverter Controller Unit
    const peakLoadW = solarLoads.reduce((sum, l) => sum + (l.watts * l.qty), 0);
    const inverterSizingW = Math.ceil(peakLoadW * 1.25); // 25% safety margin
    if (inverterSizingW > 0) {
      const inverterRate = Math.round(300 + inverterSizingW * 0.15);
      bemeItems.push({
        id: 'SOLAR_INVERTER',
        category: 'Renewable Solar Energy',
        desc: `Hybrid Solar Inverter (${solarCfg.inverterType}), ${inverterSizingW}W ${solarCfg.systemVoltage}V`,
        unit: 'Set',
        qty: 1,
        defaultRate: inverterRate,
        productDefaultRate: inverterRate * 0.88,
        serviceDefaultRate: inverterRate * 0.12,
      });
    }
  }

  // --- I. Smart Home & IoT Automation ---
  const smartAggs: Record<string, { desc: string; qty: number; unit: string; rate: number }> = {};
  smartDevices.forEach(dev => {
    const key = `${dev.device} (${dev.brand})`;
    if (!smartAggs[key]) {
      let defaultRate = 25.0;
      if (dev.device.includes('Thermostat') || dev.device.includes('Lock')) defaultRate = 180.0;
      else if (dev.device.includes('Camera') || dev.device.includes('Hub')) defaultRate = 65.0;

      smartAggs[key] = {
        desc: `Smart Device: ${dev.device} (${dev.brand}, ${dev.protocol})`,
        qty: 0,
        unit: 'Pcs',
        rate: defaultRate,
      };
    }
    smartAggs[key].qty += (dev.qty || 1);
  });
  Object.keys(smartAggs).forEach(k => {
    const item = smartAggs[k];
    bemeItems.push({
      id: `SMART_${k}`,
      category: 'Smart Home Automation',
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      defaultRate: item.rate,
      productDefaultRate: item.rate * 0.85,
      serviceDefaultRate: item.rate * 0.15,
    });
  });

  // --- User Customization States & Persistence ---
  const [customBemeItems, setCustomBemeItems] = React.useState<BemeItem[]>(() => {
    try {
      const saved = localStorage.getItem('mep_custom_beme_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deletedBemeIds, setDeletedBemeIds] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mep_deleted_beme_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [editedBemeItems, setEditedBemeItems] = React.useState<Record<string, Partial<BemeItem>>>(() => {
    try {
      const saved = localStorage.getItem('mep_edited_beme_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save changes to localStorage whenever states change
  React.useEffect(() => {
    localStorage.setItem('mep_custom_beme_items', JSON.stringify(customBemeItems));
  }, [customBemeItems]);

  React.useEffect(() => {
    localStorage.setItem('mep_deleted_beme_ids', JSON.stringify(deletedBemeIds));
  }, [deletedBemeIds]);

  React.useEffect(() => {
    localStorage.setItem('mep_edited_beme_items', JSON.stringify(editedBemeItems));
  }, [editedBemeItems]);

  // --- Detailed BEME Quotation Customization States ---
  const [bemeProductMarkup, setBemeProductMarkup] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_prod_markup');
      return saved ? parseFloat(saved) : 0;
    } catch { return 0; }
  });
  const [bemeServiceMarkup, setBemeServiceMarkup] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_serv_markup');
      return saved ? parseFloat(saved) : 0;
    } catch { return 0; }
  });
  const [bemeContingency, setBemeContingency] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_contingency');
      return saved ? parseFloat(saved) : 0;
    } catch { return 0; }
  });
  const [bemeTaxRate, setBemeTaxRate] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_tax_rate');
      return saved ? parseFloat(saved) : 0;
    } catch { return 0; }
  });
  const [bemeTaxMode, setBemeTaxMode] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_tax_mode');
      return saved || 'none';
    } catch { return 'none'; }
  });
  const [bemeDiscountType, setBemeDiscountType] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_disc_type');
      return saved || 'none';
    } catch { return 'none'; }
  });
  const [bemeDiscountValue, setBemeDiscountValue] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_disc_val');
      return saved ? parseFloat(saved) : 0;
    } catch { return 0; }
  });
  const [bemeCompanyName, setBemeCompanyName] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_company');
      return saved || 'AB-ELECTROMART';
    } catch { return 'AB-ELECTROMART'; }
  });
  const [bemeQuotationValidity, setBemeQuotationValidity] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_validity');
      return saved || '30 Days';
    } catch { return '30 Days'; }
  });
  const [bemePaymentTerms, setBemePaymentTerms] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_payment');
      return saved || '50% Advance, 40% on Delivery, 10% on Commissioning';
    } catch { return '50% Advance, 40% on Delivery, 10% on Commissioning'; }
  });
  const [bemeExclusions, setBemeExclusions] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_exclusions');
      return saved || 'Excludes civil excavation works, structural hacking, and main grid power connection fees unless specified.';
    } catch { return 'Excludes civil excavation works, structural hacking, and main grid power connection fees unless specified.'; }
  });
  const [bemeCombineRates, setBemeCombineRates] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_combine_rates');
      return saved === 'true';
    } catch { return false; }
  });
  const [bemeCompactMode, setBemeCompactMode] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_compact_mode');
      return saved === 'true';
    } catch { return false; }
  });
  const [bemeEnabledCategories, setBemeEnabledCategories] = React.useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_enabled_cats');
      return saved ? JSON.parse(saved) : {
        'Electrical Works': true,
        'Standby Power Generation': true,
        'HVAC Services': true,
        'Plumbing Works': true,
        'Fire Protection': true,
        'Renewable Solar Energy': true,
        'CCTV & Security Systems': true,
        'Smart Home Automation': true
      };
    } catch {
      return {
        'Electrical Works': true,
        'Standby Power Generation': true,
        'HVAC Services': true,
        'Plumbing Works': true,
        'Fire Protection': true,
        'Renewable Solar Energy': true,
        'CCTV & Security Systems': true,
        'Smart Home Automation': true
      };
    }
  });

  const [customizePanelTab, setCustomizePanelTab] = React.useState<'markups' | 'taxes' | 'document' | 'visibility'>('markups');
  const [isCustomizePanelOpen, setIsCustomizePanelOpen] = React.useState<boolean>(true);
  const [isQuotationPreviewOpen, setIsQuotationPreviewOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    localStorage.setItem('mep_beme_prod_markup', bemeProductMarkup.toString());
    localStorage.setItem('mep_beme_serv_markup', bemeServiceMarkup.toString());
    localStorage.setItem('mep_beme_contingency', bemeContingency.toString());
    localStorage.setItem('mep_beme_tax_rate', bemeTaxRate.toString());
    localStorage.setItem('mep_beme_tax_mode', bemeTaxMode);
    localStorage.setItem('mep_beme_disc_type', bemeDiscountType);
    localStorage.setItem('mep_beme_disc_val', bemeDiscountValue.toString());
    localStorage.setItem('mep_beme_company', bemeCompanyName);
    localStorage.setItem('mep_beme_validity', bemeQuotationValidity);
    localStorage.setItem('mep_beme_payment', bemePaymentTerms);
    localStorage.setItem('mep_beme_exclusions', bemeExclusions);
    localStorage.setItem('mep_beme_combine_rates', bemeCombineRates.toString());
    localStorage.setItem('mep_beme_compact_mode', bemeCompactMode.toString());
    localStorage.setItem('mep_beme_enabled_cats', JSON.stringify(bemeEnabledCategories));
  }, [
    bemeProductMarkup, bemeServiceMarkup, bemeContingency, bemeTaxRate, bemeTaxMode,
    bemeDiscountType, bemeDiscountValue, bemeCompanyName, bemeQuotationValidity,
    bemePaymentTerms, bemeExclusions, bemeCombineRates, bemeCompactMode, bemeEnabledCategories
  ]);

  // Dual rates for user inline numeric edits
  const [customProductRates, setCustomProductRates] = React.useState<Record<string, number>>({});
  const [customServiceRates, setCustomServiceRates] = React.useState<Record<string, number>>({});

  const handleProductRateChange = (id: string, val: number) => {
    setCustomProductRates(prev => ({ ...prev, [id]: Math.max(0, val) }));
    // Save to edited state too so it persists
    setEditedBemeItems(prev => ({
      ...prev,
      [id]: { ...prev[id], productDefaultRate: Math.max(0, val) / currencyRate }
    }));
  };

  const handleServiceRateChange = (id: string, val: number) => {
    setCustomServiceRates(prev => ({ ...prev, [id]: Math.max(0, val) }));
    // Save to edited state too so it persists
    setEditedBemeItems(prev => ({
      ...prev,
      [id]: { ...prev[id], serviceDefaultRate: Math.max(0, val) / currencyRate }
    }));
  };

  const getProductRate = (item: BemeItem) => {
    // Check local inline rate edits first
    if (customProductRates[item.id] !== undefined) {
      return customProductRates[item.id];
    }
    // Check persisted edited items
    if (editedBemeItems[item.id]?.productDefaultRate !== undefined) {
      return (editedBemeItems[item.id]!.productDefaultRate! * currencyRate);
    }
    return (item.productDefaultRate * currencyRate);
  };

  const getServiceRate = (item: BemeItem) => {
    // Check local inline rate edits first
    if (customServiceRates[item.id] !== undefined) {
      return customServiceRates[item.id];
    }
    // Check persisted edited items
    if (editedBemeItems[item.id]?.serviceDefaultRate !== undefined) {
      return (editedBemeItems[item.id]!.serviceDefaultRate! * currencyRate);
    }
    return (item.serviceDefaultRate * currencyRate);
  };

  // --- BEME Table Rows & Columns Customization states ---
  const [bemeCustomColumns, setBemeCustomColumns] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_custom_cols');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bemeRowCustomValues, setBemeRowCustomValues] = React.useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem('mep_beme_row_custom_vals');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    localStorage.setItem('mep_beme_custom_cols', JSON.stringify(bemeCustomColumns));
  }, [bemeCustomColumns]);

  React.useEffect(() => {
    localStorage.setItem('mep_beme_row_custom_vals', JSON.stringify(bemeRowCustomValues));
  }, [bemeRowCustomValues]);

  // --- Local BEME Customization Undo/Redo Engine ---
  const [bemeUndoStack, setBemeUndoStack] = React.useState<any[]>([]);
  const [bemeRedoStack, setBemeRedoStack] = React.useState<any[]>([]);
  const isBemeUndoRedoActionRef = React.useRef(false);
  const lastBemeStateRef = React.useRef<any>(null);

  React.useEffect(() => {
    const currentState = {
      customBemeItems,
      deletedBemeIds,
      editedBemeItems,
      customProductRates,
      customServiceRates,
      bemeProductMarkup,
      bemeServiceMarkup,
      bemeContingency,
      bemeTaxRate,
      bemeTaxMode,
      bemeDiscountType,
      bemeDiscountValue,
      bemeCompanyName,
      bemeQuotationValidity,
      bemePaymentTerms,
      bemeExclusions,
      bemeCombineRates,
      bemeCompactMode,
      bemeEnabledCategories,
      bemeCustomColumns,
      bemeRowCustomValues
    };

    if (isBemeUndoRedoActionRef.current) {
      isBemeUndoRedoActionRef.current = false;
      lastBemeStateRef.current = currentState;
      return;
    }

    if (lastBemeStateRef.current === null) {
      lastBemeStateRef.current = currentState;
      return;
    }

    if (JSON.stringify(lastBemeStateRef.current) === JSON.stringify(currentState)) {
      return;
    }

    setBemeUndoStack(prev => [...prev.slice(-30), lastBemeStateRef.current]);
    setBemeRedoStack([]);
    lastBemeStateRef.current = currentState;
  }, [
    customBemeItems,
    deletedBemeIds,
    editedBemeItems,
    customProductRates,
    customServiceRates,
    bemeProductMarkup,
    bemeServiceMarkup,
    bemeContingency,
    bemeTaxRate,
    bemeTaxMode,
    bemeDiscountType,
    bemeDiscountValue,
    bemeCompanyName,
    bemeQuotationValidity,
    bemePaymentTerms,
    bemeExclusions,
    bemeCombineRates,
    bemeCompactMode,
    bemeEnabledCategories,
    bemeCustomColumns,
    bemeRowCustomValues
  ]);

  const handleBemeUndo = () => {
    if (bemeUndoStack.length === 0) return;
    const currentState = {
      customBemeItems,
      deletedBemeIds,
      editedBemeItems,
      customProductRates,
      customServiceRates,
      bemeProductMarkup,
      bemeServiceMarkup,
      bemeContingency,
      bemeTaxRate,
      bemeTaxMode,
      bemeDiscountType,
      bemeDiscountValue,
      bemeCompanyName,
      bemeQuotationValidity,
      bemePaymentTerms,
      bemeExclusions,
      bemeCombineRates,
      bemeCompactMode,
      bemeEnabledCategories,
      bemeCustomColumns,
      bemeRowCustomValues
    };

    const previousState = bemeUndoStack[bemeUndoStack.length - 1];
    isBemeUndoRedoActionRef.current = true;

    if (previousState.customBemeItems) setCustomBemeItems(previousState.customBemeItems);
    if (previousState.deletedBemeIds) setDeletedBemeIds(previousState.deletedBemeIds);
    if (previousState.editedBemeItems) setEditedBemeItems(previousState.editedBemeItems);
    if (previousState.customProductRates) setCustomProductRates(previousState.customProductRates);
    if (previousState.customServiceRates) setCustomServiceRates(previousState.customServiceRates);
    if (typeof previousState.bemeProductMarkup === 'number') setBemeProductMarkup(previousState.bemeProductMarkup);
    if (typeof previousState.bemeServiceMarkup === 'number') setBemeServiceMarkup(previousState.bemeServiceMarkup);
    if (typeof previousState.bemeContingency === 'number') setBemeContingency(previousState.bemeContingency);
    if (typeof previousState.bemeTaxRate === 'number') setBemeTaxRate(previousState.bemeTaxRate);
    if (previousState.bemeTaxMode) setBemeTaxMode(previousState.bemeTaxMode);
    if (previousState.bemeDiscountType) setBemeDiscountType(previousState.bemeDiscountType);
    if (typeof previousState.bemeDiscountValue === 'number') setBemeDiscountValue(previousState.bemeDiscountValue);
    if (previousState.bemeCompanyName) setBemeCompanyName(previousState.bemeCompanyName);
    if (previousState.bemeQuotationValidity) setBemeQuotationValidity(previousState.bemeQuotationValidity);
    if (previousState.bemePaymentTerms) setBemePaymentTerms(previousState.bemePaymentTerms);
    if (previousState.bemeExclusions) setBemeExclusions(previousState.bemeExclusions);
    if (typeof previousState.bemeCombineRates === 'boolean') setBemeCombineRates(previousState.bemeCombineRates);
    if (typeof previousState.bemeCompactMode === 'boolean') setBemeCompactMode(previousState.bemeCompactMode);
    if (previousState.bemeEnabledCategories) setBemeEnabledCategories(previousState.bemeEnabledCategories);
    if (previousState.bemeCustomColumns) setBemeCustomColumns(previousState.bemeCustomColumns);
    if (previousState.bemeRowCustomValues) setBemeRowCustomValues(previousState.bemeRowCustomValues);

    setBemeRedoStack(prev => [...prev, currentState]);
    setBemeUndoStack(prev => prev.slice(0, -1));
  };

  const handleBemeRedo = () => {
    if (bemeRedoStack.length === 0) return;
    const currentState = {
      customBemeItems,
      deletedBemeIds,
      editedBemeItems,
      customProductRates,
      customServiceRates,
      bemeProductMarkup,
      bemeServiceMarkup,
      bemeContingency,
      bemeTaxRate,
      bemeTaxMode,
      bemeDiscountType,
      bemeDiscountValue,
      bemeCompanyName,
      bemeQuotationValidity,
      bemePaymentTerms,
      bemeExclusions,
      bemeCombineRates,
      bemeCompactMode,
      bemeEnabledCategories,
      bemeCustomColumns,
      bemeRowCustomValues
    };

    const nextState = bemeRedoStack[bemeRedoStack.length - 1];
    isBemeUndoRedoActionRef.current = true;

    if (nextState.customBemeItems) setCustomBemeItems(nextState.customBemeItems);
    if (nextState.deletedBemeIds) setDeletedBemeIds(nextState.deletedBemeIds);
    if (nextState.editedBemeItems) setEditedBemeItems(nextState.editedBemeItems);
    if (nextState.customProductRates) setCustomProductRates(nextState.customProductRates);
    if (nextState.customServiceRates) setCustomServiceRates(nextState.customServiceRates);
    if (typeof nextState.bemeProductMarkup === 'number') setBemeProductMarkup(nextState.bemeProductMarkup);
    if (typeof nextState.bemeServiceMarkup === 'number') setBemeServiceMarkup(nextState.bemeServiceMarkup);
    if (typeof nextState.bemeContingency === 'number') setBemeContingency(nextState.bemeContingency);
    if (typeof nextState.bemeTaxRate === 'number') setBemeTaxRate(nextState.bemeTaxRate);
    if (nextState.bemeTaxMode) setBemeTaxMode(nextState.bemeTaxMode);
    if (nextState.bemeDiscountType) setBemeDiscountType(nextState.bemeDiscountType);
    if (typeof nextState.bemeDiscountValue === 'number') setBemeDiscountValue(nextState.bemeDiscountValue);
    if (nextState.bemeCompanyName) setBemeCompanyName(nextState.bemeCompanyName);
    if (nextState.bemeQuotationValidity) setBemeQuotationValidity(nextState.bemeQuotationValidity);
    if (nextState.bemePaymentTerms) setBemePaymentTerms(nextState.bemePaymentTerms);
    if (nextState.bemeExclusions) setBemeExclusions(nextState.bemeExclusions);
    if (typeof nextState.bemeCombineRates === 'boolean') setBemeCombineRates(nextState.bemeCombineRates);
    if (typeof nextState.bemeCompactMode === 'boolean') setBemeCompactMode(nextState.bemeCompactMode);
    if (nextState.bemeEnabledCategories) setBemeEnabledCategories(nextState.bemeEnabledCategories);
    if (nextState.bemeCustomColumns) setBemeCustomColumns(nextState.bemeCustomColumns);
    if (nextState.bemeRowCustomValues) setBemeRowCustomValues(nextState.bemeRowCustomValues);

    setBemeUndoStack(prev => [...prev, currentState]);
    setBemeRedoStack(prev => prev.slice(0, -1));
  };

  const handleAddBlankRow = (category: string) => {
    const newCustomItem: BemeItem = {
      id: `CUSTOM_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      category: category || 'Electrical Works',
      desc: 'New Custom Row Item',
      unit: 'Pcs',
      qty: 1,
      defaultRate: 0,
      productDefaultRate: 0,
      serviceDefaultRate: 0
    };
    setCustomBemeItems(prev => [...prev, newCustomItem]);
  };

  // --- Modal Forms State ---
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [itemToEdit, setItemToEdit] = React.useState<BemeItem | null>(null);

  const [addForm, setAddForm] = React.useState({
    category: 'Electrical Works',
    desc: '',
    unit: 'Pcs',
    qty: 1,
    productRate: 0,
    serviceRate: 0
  });

  const [editForm, setEditForm] = React.useState({
    id: '',
    category: '',
    desc: '',
    unit: '',
    qty: 1,
    productRate: 0,
    serviceRate: 0
  });

  // --- Form Handlers ---
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.desc.trim()) return;

    const newCustomItem: BemeItem = {
      id: `CUSTOM_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      category: addForm.category,
      desc: addForm.desc,
      unit: addForm.unit,
      qty: addForm.qty,
      defaultRate: addForm.productRate + addForm.serviceRate,
      productDefaultRate: addForm.productRate / currencyRate,
      serviceDefaultRate: addForm.serviceRate / currencyRate
    };

    setCustomBemeItems(prev => [...prev, newCustomItem]);
    setIsAddModalOpen(false);
    setAddForm({
      category: 'Electrical Works',
      desc: '',
      unit: 'Pcs',
      qty: 1,
      productRate: 0,
      serviceRate: 0
    });
  };

  const handleEditClick = (item: BemeItem) => {
    setItemToEdit(item);
    setEditForm({
      id: item.id,
      category: item.category,
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      productRate: getProductRate(item),
      serviceRate: getServiceRate(item)
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    const updatedFields: Partial<BemeItem> = {
      category: editForm.category,
      desc: editForm.desc,
      unit: editForm.unit,
      qty: editForm.qty,
      productDefaultRate: editForm.productRate / currencyRate,
      serviceDefaultRate: editForm.serviceRate / currencyRate,
      defaultRate: (editForm.productRate + editForm.serviceRate) / currencyRate
    };

    if (itemToEdit.id.startsWith('CUSTOM_')) {
      // Modify directly inside custom items
      setCustomBemeItems(prev => prev.map(item => item.id === itemToEdit.id ? { ...item, ...updatedFields } as BemeItem : item));
    } else {
      // Log as edited override
      setEditedBemeItems(prev => ({
        ...prev,
        [itemToEdit.id]: {
          ...prev[itemToEdit.id],
          ...updatedFields
        }
      }));
    }

    setIsEditModalOpen(false);
    setItemToEdit(null);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to remove this item from the BEME schedule?')) {
      if (id.startsWith('CUSTOM_')) {
        setCustomBemeItems(prev => prev.filter(item => item.id !== id));
      } else {
        setDeletedBemeIds(prev => [...prev, id]);
      }
    }
  };

  const handleResetBeme = () => {
    if (confirm('Reset BEME back to default auto-generated design values? All manual edits, custom items, and deletions will be cleared.')) {
      setCustomBemeItems([]);
      setDeletedBemeIds([]);
      setEditedBemeItems({});
      setCustomProductRates({});
      setCustomServiceRates({});
      setBemeProductMarkup(0);
      setBemeServiceMarkup(0);
      setBemeContingency(0);
      setBemeTaxRate(0);
      setBemeTaxMode('none');
      setBemeDiscountType('none');
      setBemeDiscountValue(0);
      setBemeCompanyName('AB-ELECTROMART');
      setBemeQuotationValidity('30 Days');
      setBemePaymentTerms('50% Advance, 40% on Delivery, 10% on Commissioning');
      setBemeExclusions('Excludes civil excavation works, structural hacking, and main grid power connection fees unless specified.');
      setBemeCombineRates(false);
      setBemeCompactMode(false);
      setBemeEnabledCategories({
        'Electrical Works': true,
        'Standby Power Generation': true,
        'HVAC Services': true,
        'Plumbing Works': true,
        'Fire Protection': true,
        'Renewable Solar Energy': true,
        'CCTV & Security Systems': true,
        'Smart Home Automation': true
      });
      localStorage.removeItem('mep_custom_beme_items');
      localStorage.removeItem('mep_deleted_beme_ids');
      localStorage.removeItem('mep_edited_beme_items');
      localStorage.removeItem('mep_beme_prod_markup');
      localStorage.removeItem('mep_beme_serv_markup');
      localStorage.removeItem('mep_beme_contingency');
      localStorage.removeItem('mep_beme_tax_rate');
      localStorage.removeItem('mep_beme_tax_mode');
      localStorage.removeItem('mep_beme_disc_type');
      localStorage.removeItem('mep_beme_disc_val');
      localStorage.removeItem('mep_beme_company');
      localStorage.removeItem('mep_beme_validity');
      localStorage.removeItem('mep_beme_payment');
      localStorage.removeItem('mep_beme_exclusions');
      localStorage.removeItem('mep_beme_combine_rates');
      localStorage.removeItem('mep_beme_compact_mode');
      localStorage.removeItem('mep_beme_enabled_cats');
    }
  };

  const handleCombinedRateChange = (id: string, newTotal: number, item: BemeItem) => {
    const existingP = getProductRate(item);
    const existingS = getServiceRate(item);
    const existingT = existingP + existingS;
    const ratio = existingT > 0 ? (existingP / existingT) : 0.80;

    const newP = newTotal * ratio;
    const newS = newTotal * (1 - ratio);

    setCustomProductRates(prev => ({ ...prev, [id]: newP }));
    setCustomServiceRates(prev => ({ ...prev, [id]: newS }));
    setEditedBemeItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        productDefaultRate: newP / currencyRate,
        serviceDefaultRate: newS / currencyRate,
        defaultRate: newTotal / currencyRate
      }
    }));
  };

  // --- Compile Active BEME Items ---
  let activeBemeItems = [...bemeItems];

  // Apply edits to generated items
  activeBemeItems = activeBemeItems.map(item => {
    const edit = editedBemeItems[item.id];
    if (edit) {
      return { ...item, ...edit } as BemeItem;
    }
    return item;
  });

  // Filter out deleted generated items
  activeBemeItems = activeBemeItems.filter(item => !deletedBemeIds.includes(item.id));

  // Append custom items
  activeBemeItems = [...activeBemeItems, ...customBemeItems];

  // Filter based on enabled categories from our customizer settings
  activeBemeItems = activeBemeItems.filter(item => bemeEnabledCategories[item.category] !== false);

  // Group active BEME items by Category
  const categories = Array.from(new Set(activeBemeItems.map(item => item.category)));
  const PREFERRED_ORDER = [
    'Electrical Works',
    'Standby Power Generation',
    'HVAC Services',
    'Plumbing Works',
    'Fire Protection',
    'Renewable Solar Energy',
    'CCTV & Security Systems',
    'Smart Home Automation'
  ];
  const sortedCategories = [...categories].sort((a, b) => {
    const idxA = PREFERRED_ORDER.indexOf(a);
    const idxB = PREFERRED_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Calculate totals per category
  const categoryTotals = sortedCategories.reduce((acc, cat) => {
    const items = activeBemeItems.filter(item => item.category === cat);
    const pTotal = items.reduce((sum, item) => sum + item.qty * getProductRate(item), 0);
    const sTotal = items.reduce((sum, item) => sum + item.qty * getServiceRate(item), 0);
    acc[cat] = { pTotal, sTotal, total: pTotal + sTotal };
    return acc;
  }, {} as Record<string, { pTotal: number; sTotal: number; total: number }>);

  // --- Financial Calculations with Custom Setup Parameters ---
  // Base cost sums of enabled categories
  const baseProductCost = activeBemeItems.reduce((sum, item) => sum + item.qty * getProductRate(item), 0);
  const baseServiceCost = activeBemeItems.reduce((sum, item) => sum + item.qty * getServiceRate(item), 0);
  const baseTotalCost = baseProductCost + baseServiceCost;

  // Marked-up costs
  const markedUpProductSum = baseProductCost * (1 + bemeProductMarkup / 100);
  const markedUpServiceSum = baseServiceCost * (1 + bemeServiceMarkup / 100);
  const subtotalWithMarkups = markedUpProductSum + markedUpServiceSum;

  // Contingency
  const contingencyAmount = subtotalWithMarkups * (bemeContingency / 100);
  const totalBeforeDiscountAndTax = subtotalWithMarkups + contingencyAmount;

  // Discount
  let discountAmount = 0;
  if (bemeDiscountType === 'percent') {
    discountAmount = totalBeforeDiscountAndTax * (bemeDiscountValue / 100);
  } else if (bemeDiscountType === 'fixed') {
    discountAmount = bemeDiscountValue * currencyRate;
  }
  const totalAfterDiscount = Math.max(0, totalBeforeDiscountAndTax - discountAmount);

  // Tax/VAT
  let taxableBase = 0;
  if (bemeTaxMode === 'total') {
    taxableBase = totalAfterDiscount;
  } else if (bemeTaxMode === 'materials') {
    taxableBase = markedUpProductSum;
  } else if (bemeTaxMode === 'services') {
    taxableBase = markedUpServiceSum;
  }
  const taxAmount = taxableBase * (bemeTaxRate / 100);

  // Combined Grand Total Quoted Cost
  const grandTotalCost = totalAfterDiscount + taxAmount;

  // Custom formatted CSV exporter including category headers, custom rates and detailed financial breakdown
  const handleExportCSV = () => {
    let csv = `BILL OF ENGINEERING MEASUREMENT & EVALUATION (BEME) QUOTATION REPORT\n`;
    csv += `Company Name: ${bemeCompanyName}\n`;
    csv += `Project Name: ${settings.projectName || '—'}\n`;
    csv += `Project No: ${settings.projectNo || '—'}\n`;
    csv += `Engineer: ${settings.engineer || '—'}\n`;
    csv += `Client Name: ${settings.client || '—'}\n`;
    csv += `Quotation Validity: ${bemeQuotationValidity}\n`;
    csv += `Payment Terms: ${bemePaymentTerms}\n`;
    csv += `Currency: ${currencyCode} (${currencySymbol})\n\n`;

    if (bemeCombineRates) {
      csv += `S/N,Description of Materials / Equipment,Unit,Quantity,Combined Unit Rate (${currencyCode}),Row Combined Total (${currencyCode})\n`;
    } else {
      csv += `S/N,Description of Materials / Equipment,Unit,Quantity,Product Unit Rate (${currencyCode}),Service Unit Rate (${currencyCode}),Product Total (${currencyCode}),Service Total (${currencyCode}),Row Combined Total (${currencyCode})\n`;
    }

    let snCounter = 1;
    sortedCategories.forEach((cat, catIdx) => {
      if (bemeCombineRates) {
        csv += `\nSection ${catIdx + 1}.0: ${cat.toUpperCase()},,,,,\n`;
      } else {
        csv += `\nSection ${catIdx + 1}.0: ${cat.toUpperCase()},,,,,,,,,\n`;
      }

      const catItems = activeBemeItems.filter(item => item.category === cat);
      catItems.forEach(item => {
        const pRate = getProductRate(item);
        const sRate = getServiceRate(item);
        const pTotal = item.qty * pRate;
        const sTotal = item.qty * sRate;
        const rTotal = pTotal + sTotal;

        if (bemeCombineRates) {
          csv += `"${snCounter++}","${item.desc.replace(/"/g, '""')}","${item.unit}",${item.qty},${(pRate + sRate).toFixed(2)},${rTotal.toFixed(2)}\n`;
        } else {
          csv += `"${snCounter++}","${item.desc.replace(/"/g, '""')}","${item.unit}",${item.qty},${pRate.toFixed(2)},${sRate.toFixed(2)},${pTotal.toFixed(2)},${sTotal.toFixed(2)},${rTotal.toFixed(2)}\n`;
        }
      });

      const totals = categoryTotals[cat];
      if (bemeCombineRates) {
        csv += `,"Subtotal Section ${catIdx + 1}.0 (${cat})",,,,${totals.total.toFixed(2)}\n`;
      } else {
        csv += `,"Subtotal Section ${catIdx + 1}.0 (${cat})",,,,${totals.pTotal.toFixed(2)},${totals.sTotal.toFixed(2)},${totals.total.toFixed(2)}\n`;
      }
    });

    csv += `\n\n--- FINANCIAL ESTIMATION BREAKDOWN ---\n`;
    csv += `Base Product Cost,${baseProductCost.toFixed(2)}\n`;
    csv += `Base Service/Labor Cost,${baseServiceCost.toFixed(2)}\n`;
    csv += `Product Markup (${bemeProductMarkup}%),${(baseProductCost * bemeProductMarkup / 100).toFixed(2)}\n`;
    csv += `Service Markup (${bemeServiceMarkup}%),${(baseServiceCost * bemeServiceMarkup / 100).toFixed(2)}\n`;
    csv += `Subtotal after Markups,${subtotalWithMarkups.toFixed(2)}\n`;
    csv += `Contingency (${bemeContingency}%),${contingencyAmount.toFixed(2)}\n`;
    csv += `Discount (${bemeDiscountType === 'none' ? 'None' : bemeDiscountType === 'percent' ? bemeDiscountValue + '%' : currencySymbol + bemeDiscountValue}),-${discountAmount.toFixed(2)}\n`;
    csv += `Tax/VAT (${bemeTaxMode === 'none' ? 'None' : bemeTaxMode === 'materials' ? 'Materials only (' + bemeTaxRate + '%)' : bemeTaxMode === 'services' ? 'Services only (' + bemeTaxRate + '%)' : 'Grand total (' + bemeTaxRate + '%)'}),${taxAmount.toFixed(2)}\n`;
    csv += `GRAND TOTAL ESTIMATED QUOTE,${grandTotalCost.toFixed(2)}\n\n`;

    csv += `--- SPECIAL NOTES / EXCLUSIONS ---\n`;
    csv += `"${bemeExclusions.replace(/"/g, '""')}"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEP_BEME_Quotation_${settings.projectName || 'Project'}_${currencyCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (activeBemeItems.length === 0) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-6 mb-4 text-center">
        <div className="text-yellow-500 text-sm font-bold mb-1">📋 Bill of Engineering Measurement & Evaluation (BEME)</div>
        <div className="text-xs text-[#718096] mb-3">No materials configured in active design panels yet. Add electrical circuits, HVAC sizing, or plumbing fixtures to generate live BEME.</div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
        >
          + Add Custom BEME Item
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 mb-4 shadow-xl pb-16">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2 pb-4 border-b border-[#2d3748]/50">
        <div className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-blue-400">📊</span> Bill of Engineering Measurement & Evaluation (BEME)
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCustomizePanelOpen(!isCustomizePanelOpen)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isCustomizePanelOpen 
                ? 'bg-[#2b6cb0] text-white border border-[#4299e1]' 
                : 'bg-[#2d3748] text-gray-300 hover:bg-[#3d4a61] border border-transparent'
            }`}
          >
            <Settings size={12} /> {isCustomizePanelOpen ? 'Hide Tender Setup' : 'Configure Tender'}
          </button>
          <button
            onClick={() => setIsQuotationPreviewOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 border border-indigo-400/30 rounded text-xs text-white font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-lg"
          >
            <FileText size={12} /> Print / Formal Quote
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-400/50 rounded text-xs text-white font-bold cursor-pointer transition-colors flex items-center gap-1"
          >
            <Plus size={12} /> Add Custom Item
          </button>
          <button
            onClick={() => handleAddBlankRow('Electrical Works')}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 border border-blue-500/50 rounded text-xs text-white font-bold cursor-pointer transition-colors flex items-center gap-1"
            title="Instantly add a blank customizable row in BEME"
          >
            <Plus size={12} /> Add Blank Row
          </button>
          {/* Simple BEME Undo / Redo group */}
          <div className="flex items-center bg-[#182030] border border-[#2d3748] rounded p-0.5">
            <button
              onClick={handleBemeUndo}
              disabled={bemeUndoStack.length === 0}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer ${
                bemeUndoStack.length === 0 ? 'text-gray-600 opacity-40 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-[#2d3748]'
              }`}
              title="Undo BEME change (Ctrl+Z)"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
            <div className="w-[1px] h-3.5 bg-[#2d3748]" />
            <button
              onClick={handleBemeRedo}
              disabled={bemeRedoStack.length === 0}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer ${
                bemeRedoStack.length === 0 ? 'text-gray-600 opacity-40 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-[#2d3748]'
              }`}
              title="Redo BEME change (Ctrl+Y)"
            >
              <RotateCw size={12} />
              <span>Redo</span>
            </button>
          </div>
          <button
            onClick={handleResetBeme}
            className="px-3 py-1.5 bg-[#2d3748]/60 hover:bg-[#3d4a61]/70 text-xs text-gray-300 rounded font-bold cursor-pointer transition-colors flex items-center gap-1 border border-gray-700/40"
            title="Reset BEME schedule back to default auto-generated values"
          >
            <RotateCcw size={12} /> Reset
          </button>

        </div>
      </div>

      {/* DETAILED TENDER SETTINGS PANEL */}
      {isCustomizePanelOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 rounded-xl border border-blue-500/20 bg-[#121622] mb-5 shadow-inner">
          {/* Settings Tab Controls */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2d3748] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#90cdf4] flex items-center gap-1.5">
                ⚙️ BEME Tender Customizer
              </span>
              <span className="text-[9px] text-gray-500">Changes reflect instantly below and in PDF preview</span>
            </div>

            {/* Sub-tabs header */}
            <div className="flex gap-1 border-b border-[#2d3748] pb-px">
              <button
                type="button"
                onClick={() => setCustomizePanelTab('markups')}
                className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                  customizePanelTab === 'markups'
                    ? 'bg-[#2d3748] text-white border-t border-x border-[#2d3748]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 Markups & Contingency
              </button>
              <button
                type="button"
                onClick={() => setCustomizePanelTab('taxes')}
                className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                  customizePanelTab === 'taxes'
                    ? 'bg-[#2d3748] text-white border-t border-x border-[#2d3748]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                💰 Taxes & Discounts
              </button>
              <button
                type="button"
                onClick={() => setCustomizePanelTab('document')}
                className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                  customizePanelTab === 'document'
                    ? 'bg-[#2d3748] text-white border-t border-x border-[#2d3748]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📄 Quote Branding
              </button>
              <button
                type="button"
                onClick={() => setCustomizePanelTab('visibility')}
                className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                  customizePanelTab === 'visibility'
                    ? 'bg-[#2d3748] text-white border-t border-x border-[#2d3748]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👁️ Display Controls
              </button>
              <button
                type="button"
                onClick={() => setCustomizePanelTab('columns')}
                className={`px-3 py-1 text-[11px] font-bold rounded-t-lg transition-all ${
                  customizePanelTab === 'columns'
                    ? 'bg-[#2d3748] text-white border-t border-x border-[#2d3748]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                ➕ Custom Columns
              </button>
            </div>

            {/* Tab content wrapper */}
            <div className="pt-2">
              {customizePanelTab === 'markups' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-[#cbd5e0] font-bold uppercase">Product (Material) Markup</label>
                        <span className="text-xs text-sky-400 font-mono font-bold">{bemeProductMarkup}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={bemeProductMarkup}
                        onChange={e => setBemeProductMarkup(parseInt(e.target.value) || 0)}
                        className="w-full accent-blue-500 h-1 bg-[#10141f] rounded"
                      />
                      <p className="text-[9px] text-gray-500 mt-1">Applies profit and shipping markup directly onto material rates.</p>
                    </div>

                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-[#cbd5e0] font-bold uppercase">Labor / Installation Markup</label>
                        <span className="text-xs text-teal-400 font-mono font-bold">{bemeServiceMarkup}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={bemeServiceMarkup}
                        onChange={e => setBemeServiceMarkup(parseInt(e.target.value) || 0)}
                        className="w-full accent-teal-500 h-1 bg-[#10141f] rounded"
                      />
                      <p className="text-[9px] text-gray-500 mt-1">Applies profit and contingency markup to service installation rates.</p>
                    </div>
                  </div>

                  <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-[#cbd5e0] font-bold uppercase">Unforeseen Contingency Allocation</label>
                      <span className="text-xs text-yellow-500 font-mono font-bold">{bemeContingency}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={bemeContingency}
                      onChange={e => setBemeContingency(parseInt(e.target.value) || 0)}
                      className="w-full accent-yellow-500 h-1 bg-[#10141f] rounded"
                    />
                    <p className="text-[9px] text-gray-500 mt-1">Contingency budget added to subtotal for site environment variables.</p>
                  </div>
                </div>
              )}

              {customizePanelTab === 'taxes' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                      <label className="block text-[10px] text-[#cbd5e0] mb-1.5 uppercase font-bold">Tax/VAT Assessment Mode</label>
                      <select
                        value={bemeTaxMode}
                        onChange={e => setBemeTaxMode(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                      >
                        <option value="none">No Tax Applied</option>
                        <option value="materials">Tax Materials / Equipment Only</option>
                        <option value="services">Tax Services / Labor Only</option>
                        <option value="total">Tax Combined Grand Total</option>
                      </select>
                    </div>

                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] text-[#cbd5e0] font-bold uppercase">Tax / VAT Rate</label>
                        <span className="text-xs text-cyan-400 font-mono font-bold">{bemeTaxRate}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        step="0.5"
                        value={bemeTaxRate}
                        onChange={e => setBemeTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full accent-cyan-500 h-1 bg-[#10141f] rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                      <label className="block text-[10px] text-[#cbd5e0] mb-1.5 uppercase font-bold">Quotation Discount Type</label>
                      <select
                        value={bemeDiscountType}
                        onChange={e => {
                          setBemeDiscountType(e.target.value);
                          setBemeDiscountValue(0);
                        }}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                      >
                        <option value="none">No Discount</option>
                        <option value="percent">Percentage Discount (%)</option>
                        <option value="fixed">Fixed Lump Sum Discount ({currencyCode})</option>
                      </select>
                    </div>

                    {bemeDiscountType !== 'none' && (
                      <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                        <label className="block text-[10px] text-[#cbd5e0] mb-1 uppercase font-bold">
                          Discount Value {bemeDiscountType === 'percent' ? '(%)' : `(${currencySymbol})`}
                        </label>
                        <input
                          type="number"
                          step={bemeDiscountType === 'percent' ? '1' : '10'}
                          value={bemeDiscountValue}
                          onChange={e => setBemeDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1 text-xs text-white focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {customizePanelTab === 'document' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[9px] text-[#718096] uppercase tracking-wider font-semibold">Tenderer / Company Name</label>
                      <input
                        type="text"
                        value={bemeCompanyName}
                        onChange={e => setBemeCompanyName(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#718096] uppercase tracking-wider font-semibold">Quotation Validity</label>
                      <input
                        type="text"
                        value={bemeQuotationValidity}
                        onChange={e => setBemeQuotationValidity(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#718096] uppercase tracking-wider font-semibold">Payment Milestones</label>
                      <input
                        type="text"
                        value={bemePaymentTerms}
                        onChange={e => setBemePaymentTerms(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-[#718096] uppercase tracking-wider font-semibold mb-1">Standard Exclusions / Conditions</label>
                    <textarea
                      value={bemeExclusions}
                      rows={5}
                      onChange={e => setBemeExclusions(e.target.value)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-medium leading-relaxed custom-scrollbar resize-none"
                    />
                  </div>
                </div>
              )}

              {customizePanelTab === 'visibility' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-white font-bold uppercase">Combine Unit Rates</div>
                        <div className="text-[9px] text-gray-500">Combines materials and labor into a single rate column.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={bemeCombineRates}
                        onChange={e => setBemeCombineRates(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-black border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                    </div>

                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-white font-bold uppercase">Compact Table Rows</div>
                        <div className="text-[9px] text-gray-500">Minimizes table padding for high-density document viewing.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={bemeCompactMode}
                        onChange={e => setBemeCompactMode(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-black border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-[9px] text-[#718096] uppercase tracking-wider font-semibold mb-2">Scope Segment Filters</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.keys(bemeEnabledCategories).map((cat) => (
                        <label key={cat} className="flex items-center gap-1.5 bg-[#171c26] p-2 rounded border border-[#2d3748]/30 cursor-pointer hover:bg-[#1f2735] transition-colors">
                          <input
                            type="checkbox"
                            checked={bemeEnabledCategories[cat]}
                            onChange={() => setBemeEnabledCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                            className="w-3.5 h-3.5 text-blue-500 rounded bg-black border-gray-600"
                          />
                          <span className="text-[10px] text-gray-300 truncate">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {customizePanelTab === 'columns' && (
                <div className="space-y-4">
                  <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                    <h4 className="text-[10px] text-white font-bold uppercase mb-1">Create Custom Columns</h4>
                    <p className="text-[9px] text-gray-500 mb-3">Add supplementary custom tracking columns to the BEME schedule (e.g., Code, Manufacturer, Notes).</p>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="new-column-input"
                        placeholder="Column Name (e.g., Code)"
                        className="flex-1 bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1 text-xs text-white focus:border-blue-500 outline-none font-medium"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const name = e.currentTarget.value.trim();
                            if (name && !bemeCustomColumns.includes(name)) {
                              setBemeCustomColumns(prev => [...prev, name]);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-column-input') as HTMLInputElement;
                          const name = input?.value.trim();
                          if (name && !bemeCustomColumns.includes(name)) {
                            setBemeCustomColumns(prev => [...prev, name]);
                            if (input) input.value = '';
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-bold cursor-pointer"
                      >
                        Add Column
                      </button>
                    </div>
                  </div>

                  {bemeCustomColumns.length > 0 && (
                    <div className="bg-[#1b2130] p-3 rounded-lg border border-[#2d3748]/50">
                      <h4 className="text-[10px] text-white font-bold uppercase mb-2">Active Custom Columns</h4>
                      <div className="space-y-1.5">
                        {bemeCustomColumns.map(col => (
                          <div key={col} className="flex justify-between items-center bg-[#10141f] p-2 rounded border border-[#2d3748]/40">
                            <span className="text-xs text-white font-medium">{col}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setBemeCustomColumns(prev => prev.filter(c => c !== col));
                                setBemeRowCustomValues(prev => {
                                  const copy = { ...prev };
                                  Object.keys(copy).forEach(itemId => {
                                    if (copy[itemId]) {
                                      const rowVals = { ...copy[itemId] };
                                      delete rowVals[col];
                                      copy[itemId] = rowVals;
                                    }
                                  });
                                  return copy;
                                });
                              }}
                              className="text-red-400 hover:text-red-300 font-bold text-[10px] cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - LIVE RECONCILIATION ESTIMATOR BILL */}
          <div className="lg:col-span-4 bg-[#0f1117] rounded-lg p-3.5 border border-blue-500/20 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-[9px] font-bold text-[#718096] uppercase tracking-wider border-b border-[#2d3748] pb-1.5 flex items-center justify-between">
                <span>📊 Quotation Summary</span>
                <span className="text-blue-400 font-mono text-[8px] uppercase">Live Calculation</span>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Base Materials:</span>
                  <span>{currencySymbol}{baseProductCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Base Services:</span>
                  <span>{currencySymbol}{baseServiceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {(bemeProductMarkup > 0 || bemeServiceMarkup > 0) && (
                  <div className="text-[10px] bg-sky-950/20 p-1.5 rounded border border-sky-900/30 space-y-1 mt-1">
                    {bemeProductMarkup > 0 && (
                      <div className="flex justify-between text-sky-300">
                        <span>Materials Markup ({bemeProductMarkup}%):</span>
                        <span>+{currencySymbol}{(baseProductCost * bemeProductMarkup / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {bemeServiceMarkup > 0 && (
                      <div className="flex justify-between text-teal-300">
                        <span>Labor Markup ({bemeServiceMarkup}%):</span>
                        <span>+{currencySymbol}{(baseServiceCost * bemeServiceMarkup / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                )}

                {bemeContingency > 0 && (
                  <div className="flex justify-between text-yellow-500/90">
                    <span>Contingency ({bemeContingency}%):</span>
                    <span>+{currencySymbol}{contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {bemeDiscountType !== 'none' && bemeDiscountValue > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount ({bemeDiscountType === 'percent' ? `${bemeDiscountValue}%` : 'Lump Sum'}):</span>
                    <span>-{currencySymbol}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {bemeTaxMode !== 'none' && bemeTaxRate > 0 && (
                  <div className="flex justify-between text-cyan-400">
                    <span>Tax / VAT ({bemeTaxRate}%):</span>
                    <span>+{currencySymbol}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2d3748]">
              <div className="text-[9px] text-[#718096] uppercase tracking-wider font-semibold">Tender Grand Total Quote:</div>
              <div className="text-cyan-300 text-xl font-black font-mono tracking-tight mt-0.5">
                {currencySymbol}{grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[8px] text-[#718096] mt-1 italic">
                Branded validity: {bemeQuotationValidity}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Split KPI Metrics Card (Always Visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#0f1117] p-2.5 rounded-lg border border-[#2d3748]">
          <div className="text-[#718096] text-[9px] mb-0.5 font-bold uppercase tracking-wider">📦 Material Subtotal</div>
          <div className="text-[#90cdf4] font-bold text-sm font-mono">
            {currencySymbol}{baseProductCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[8px] text-gray-500 mt-0.5">
            With Markup: {currencySymbol}{markedUpProductSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-[#0f1117] p-2.5 rounded-lg border border-[#2d3748]">
          <div className="text-[#718096] text-[9px] mb-0.5 font-bold uppercase tracking-wider">🛠️ Labor / Service Subtotal</div>
          <div className="text-[#2dd4bf] font-bold text-sm font-mono">
            {currencySymbol}{baseServiceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[8px] text-gray-500 mt-0.5">
            With Markup: {currencySymbol}{markedUpServiceSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-[#0f1117] p-2.5 rounded-lg border border-[#2d3748]">
          <div className="text-[#718096] text-[9px] mb-0.5 font-bold uppercase tracking-wider">⚙️ Allocations & Additions</div>
          <div className="text-yellow-500 font-bold text-sm font-mono">
            +{currencySymbol}{(contingencyAmount + taxAmount - discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[8px] text-gray-500 mt-0.5">
            Contingency, Taxes minus Discounts
          </div>
        </div>
        <div className="bg-[#0f1117] p-2.5 rounded-lg border border-[#06b6d4]/40 bg-gradient-to-br from-[#06b6d4]/5 to-transparent">
          <div className="text-cyan-400 text-[9px] mb-0.5 font-bold uppercase tracking-wider">💰 Tender Grand Total</div>
          <div className="text-cyan-300 font-black text-base font-mono">
            {currencySymbol}{grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[8px] text-cyan-500 mt-0.5">
            Exchange: 1 USD = {currencyRate} {currencyCode}
          </div>
        </div>
      </div>

      {/* Top Scrollbar */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="sticky top-0 z-30 overflow-x-auto w-full bg-[#151a26]/95 border-b border-[#2d3748]/60 custom-scrollbar shadow-md rounded-t-lg mb-1"
        style={{ height: '14px' }}
      >
        <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
      </div>

      {/* THE BEME DATA TABLE CONTAINER */}
      <div
        ref={tableContainerRef}
        onScroll={handleTableScroll}
        className="overflow-x-auto overflow-y-auto max-h-[75vh] border border-[#2d3748]/50 rounded-lg bg-[#0f1117] relative custom-scrollbar shadow-inner"
      >
        <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 bg-[#151a26] z-30 shadow">
            <tr className="bg-[#151a26] text-[#718096] uppercase text-[10px] tracking-wider border-b border-[#2d3748]">
              <th className={`w-12 text-center sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>S/N</th>
              <th className={`sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Description of Materials / Equipment</th>
              <th className={`w-16 text-center sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Unit</th>
              <th className={`w-16 text-center sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Qty</th>
              {bemeCustomColumns.map(col => (
                <th key={col} className={`w-28 text-center sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>{col}</th>
              ))}
              {bemeCombineRates ? (
                <th className={`w-36 text-center sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Combined Unit Rate ({currencySymbol})</th>
              ) : (
                <>
                  <th className={`w-28 text-center sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Product Rate ({currencySymbol})</th>
                  <th className={`w-28 text-center sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Service Rate ({currencySymbol})</th>
                  <th className={`w-24 text-right sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Product Total</th>
                  <th className={`w-24 text-right sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Service Total</th>
                </>
              )}
              <th className={`w-28 text-right sticky top-0 z-30 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Row Total</th>
              <th className={`w-16 text-center sticky top-0 right-0 z-40 bg-[#151a26] ${bemeCompactMode ? 'p-1.5' : 'p-3'}`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d3748]/30">
            {(() => {
              let overallSn = 1;
              return sortedCategories.map((category) => {
                const categoryItems = activeBemeItems.filter(item => item.category === category);
                const totals = categoryTotals[category];

                if (categoryItems.length === 0) return null;

                const catSn = overallSn++;

                return (
                  <React.Fragment key={category}>
                    {/* Category Header Row */}
                    <tr className="bg-[#121622] border-y border-[#2d3748]/40">
                      <td colSpan={(bemeCombineRates ? 7 : 10) + bemeCustomColumns.length} className={`font-extrabold text-[#90cdf4] text-[11px] uppercase tracking-wider bg-gradient-to-r from-[#171d2c] to-transparent ${bemeCompactMode ? 'p-2' : 'p-3 px-4'}`}>
                        📁 Section {catSn}.0 : {category}
                      </td>
                    </tr>

                    {/* Category Items */}
                    {categoryItems.map((item, itemIdx) => {
                      const pRate = getProductRate(item);
                      const sRate = getServiceRate(item);
                      const pTotal = item.qty * pRate;
                      const sTotal = item.qty * sRate;
                      const rTotal = pTotal + sTotal;

                      const padClass = bemeCompactMode ? 'py-1.5 px-2.5' : 'py-3 px-4';

                      return (
                        <tr key={item.id} className="hover:bg-[#1a202c]/50 transition-colors group">
                          <td className={`${padClass} text-center text-[#718096] font-mono`}>{itemIdx + 1}</td>
                          <td className={`${padClass}`}>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white font-medium">{item.desc}</span>
                              {item.id.startsWith('CUSTOM_') && (
                                <span className="text-[8px] bg-blue-900/40 text-blue-300 px-1.5 py-0.2 rounded w-max font-bold">Custom Item</span>
                              )}
                            </div>
                          </td>
                          <td className={`${padClass} text-center text-gray-400 font-medium`}>{item.unit}</td>
                          <td className={`${padClass} text-center font-bold text-gray-300 font-mono`}>{item.qty}</td>
                          
                          {/* Custom Columns Inputs */}
                          {bemeCustomColumns.map(col => {
                            const cellValue = bemeRowCustomValues[item.id]?.[col] || '';
                            return (
                              <td key={col} className={`${padClass} text-center`}>
                                <input
                                  type="text"
                                  placeholder="—"
                                  value={cellValue}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setBemeRowCustomValues(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...(prev[item.id] || {}),
                                        [col]: val
                                      }
                                    }));
                                  }}
                                  className="bg-[#1a2035]/30 hover:bg-[#1a2035]/80 focus:bg-[#1a2035] border border-transparent focus:border-blue-500 rounded text-center w-24 px-1.5 py-0.5 text-xs text-white outline-none transition-all"
                                />
                              </td>
                            );
                          })}
                          
                          {bemeCombineRates ? (
                            /* Combined Rate Input Column */
                            <td className={`${padClass} text-center`}>
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-[#718096] font-mono">{currencySymbol}</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={parseFloat((pRate + sRate).toFixed(2))}
                                  onChange={e => handleCombinedRateChange(item.id, parseFloat(e.target.value) || 0, item)}
                                  className="bg-transparent border-b border-transparent hover:border-[#2d3748] focus:border-blue-500 rounded-none text-center w-24 px-1 py-0.5 text-xs text-white font-mono outline-none transition-colors"
                                />
                              </div>
                            </td>
                          ) : (
                            <>
                              {/* Product Rate Input */}
                              <td className={`${padClass} text-center`}>
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#718096] font-mono">{currencySymbol}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={pRate}
                                    onChange={e => handleProductRateChange(item.id, parseFloat(e.target.value) || 0)}
                                    className="bg-transparent border-b border-transparent hover:border-[#2d3748] focus:border-blue-500 rounded-none text-center w-20 px-1 py-0.5 text-xs text-white font-mono outline-none transition-colors"
                                  />
                                </div>
                              </td>
                              {/* Service Rate Input */}
                              <td className={`${padClass} text-center`}>
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[#718096] font-mono">{currencySymbol}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={sRate}
                                    onChange={e => handleServiceRateChange(item.id, parseFloat(e.target.value) || 0)}
                                    className="bg-transparent border-b border-transparent hover:border-[#2d3748] focus:border-blue-500 rounded-none text-center w-20 px-1 py-0.5 text-xs text-white font-mono outline-none transition-colors"
                                  />
                                </div>
                              </td>
                              <td className={`${padClass} text-right text-sky-400 font-mono font-medium`}>
                                {currencySymbol}{pTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`${padClass} text-right text-teal-400 font-mono font-medium`}>
                                {currencySymbol}{sTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </>
                          )}

                          <td className={`${padClass} text-right font-bold text-cyan-400 font-mono bg-cyan-950/5`}>
                            {currencySymbol}{rTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {/* Actions Column */}
                          <td className={`${padClass} text-center`}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditClick(item)}
                                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit full item specification"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                title="Delete item from schedule"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Category Subtotal Row */}
                    <tr className="bg-[#10141f] border-t border-[#2d3748]/20 font-bold text-xs text-[#cbd5e0]">
                      <td colSpan={4 + bemeCustomColumns.length} className={`text-right uppercase tracking-wider text-[#a0aec0] ${bemeCompactMode ? 'p-2' : 'p-3 px-4'}`}>
                        Section {catSn}.0 Subtotal ({category}):
                      </td>
                      {bemeCombineRates ? (
                        <>
                          <td className={`text-right text-cyan-300 font-mono bg-[#141a29] ${bemeCompactMode ? 'p-2' : 'p-3'}`} colSpan={3}>
                            {currencySymbol}{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`text-center font-mono text-gray-500 text-[10px] ${bemeCompactMode ? 'p-2' : 'p-3'}`} colSpan={2}>— Combined unit subtotals —</td>
                          <td className={`text-right text-sky-400 font-mono ${bemeCompactMode ? 'p-2' : 'p-3'}`}>
                            {currencySymbol}{totals.pTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`text-right text-teal-400 font-mono ${bemeCompactMode ? 'p-2' : 'p-3'}`}>
                            {currencySymbol}{totals.sTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`text-right text-cyan-300 font-mono bg-[#141a29] ${bemeCompactMode ? 'p-2' : 'p-3'}`} colSpan={2}>
                            {currencySymbol}{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </>
                      )}
                    </tr>
                  </React.Fragment>
                );
              });
            })()}
          </tbody>
          <tfoot>
            <tr className="bg-[#13192a] border-t-2 border-[#2d3748] font-black text-xs text-[#cbd5e0] tracking-wider uppercase">
              <td colSpan={4 + bemeCustomColumns.length} className="p-4 text-right text-base text-white">
                MEP Design Total Cost:
              </td>
              {bemeCombineRates ? (
                <td className="p-4 text-right text-cyan-300 font-mono text-lg bg-[#182136]" colSpan={3}>
                  {currencySymbol}{baseTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              ) : (
                <>
                  <td colSpan={2} className="p-4 text-center font-mono text-[10px] text-gray-500 normal-case">— Overall Base totals —</td>
                  <td className="p-4 text-right text-sky-400 font-mono text-sm">
                    {currencySymbol}{baseProductCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-teal-400 font-mono text-sm">
                    {currencySymbol}{baseServiceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-cyan-300 font-mono text-base bg-[#182136]" colSpan={2}>
                    {currencySymbol}{baseTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Sticky Bottom Scroller for Easy Navigation */}
      <div className="sticky bottom-0 z-20 -mx-6 w-[calc(100%+3rem)] bg-[#0a0e17]/95 backdrop-blur-md border-t border-b border-[#2d3748]/60 px-4 py-2 flex items-center gap-3 shadow-2xl">
        <div className="flex items-center gap-1.5 shrink-0 text-gray-400 font-mono text-[11px] font-bold">
          <span className="text-sky-400">↔</span> Nav Scroller:
        </div>
        <button
          type="button"
          onClick={() => scrollTableBy(-400)}
          className="px-2.5 py-1 text-xs font-bold bg-[#1a2234] hover:bg-[#283652] text-sky-400 rounded border border-[#2d3748] transition-colors shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
          title="Scroll Left"
        >
          ◀ Left
        </button>
        
        <div
          ref={dummyScrollRef}
          onScroll={handleDummyScroll}
          className="overflow-x-auto w-full custom-scrollbar bg-[#111726] border border-[#2d3748]/80 rounded py-1 px-1 flex items-center"
          style={{ height: '22px' }}
        >
          <div style={{ width: `${tableScrollWidth}px`, height: '4px' }} className="bg-sky-500/30 rounded-full" />
        </div>

        <button
          type="button"
          onClick={() => scrollTableBy(400)}
          className="px-2.5 py-1 text-xs font-bold bg-[#1a2234] hover:bg-[#283652] text-sky-400 rounded border border-[#2d3748] transition-colors shrink-0 cursor-pointer flex items-center gap-1 shadow-sm"
          title="Scroll Right"
        >
          Right ▶
        </button>
      </div>

      {/* DETAILED RECONCILIATION SUMMARY BOTTOM BLOCK */}
      <div className="mt-5 p-4 rounded-xl border border-gray-700/50 bg-[#0f1117] space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[#90cdf4] flex items-center gap-1.5 pb-2 border-b border-[#2d3748]/60">
          <span>🧾</span> Commercial Tender Reconciliation Statement
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#cbd5e0] leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-bold text-gray-400 uppercase text-[10px] tracking-wide">Quotation Specifications</h4>
            <div className="grid grid-cols-3 gap-y-1.5 text-gray-400">
              <span className="font-medium col-span-1">Quoted By:</span>
              <span className="col-span-2 text-white font-semibold">{bemeCompanyName}</span>
              
              <span className="font-medium col-span-1">Tender Validity:</span>
              <span className="col-span-2 text-white font-semibold">{bemeQuotationValidity}</span>

              <span className="font-medium col-span-1">Milestones:</span>
              <span className="col-span-2 text-white text-[11px] leading-snug">{bemePaymentTerms}</span>
            </div>
            
            <div className="pt-2">
              <h5 className="font-bold text-gray-400 uppercase text-[9px] tracking-wide mb-1">Standard Exclusions</h5>
              <p className="text-[10px] text-gray-500 leading-normal italic">{bemeExclusions}</p>
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] bg-[#121622] p-3 rounded-lg border border-gray-800">
            <h4 className="font-bold text-gray-300 uppercase text-[10px] font-sans tracking-wide mb-2">Final Financial Math Breakdown</h4>
            <div className="flex justify-between text-gray-400">
              <span>Base Materials Cost:</span>
              <span>{currencySymbol}{baseProductCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Base Services Cost:</span>
              <span>{currencySymbol}{baseServiceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {bemeProductMarkup > 0 && (
              <div className="flex justify-between text-sky-400">
                <span>Material Markups (+{bemeProductMarkup}%):</span>
                <span>+{currencySymbol}{(baseProductCost * bemeProductMarkup / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            
            {bemeServiceMarkup > 0 && (
              <div className="flex justify-between text-teal-400">
                <span>Labor Markups (+{bemeServiceMarkup}%):</span>
                <span>+{currencySymbol}{(baseServiceCost * bemeServiceMarkup / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {bemeContingency > 0 && (
              <div className="flex justify-between text-yellow-500">
                <span>Contingency Allocation (+{bemeContingency}%):</span>
                <span>+{currencySymbol}{contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {bemeDiscountType !== 'none' && bemeDiscountValue > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Discount Deduction (-):</span>
                <span>-{currencySymbol}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {bemeTaxMode !== 'none' && bemeTaxRate > 0 && (
              <div className="flex justify-between text-cyan-400">
                <span>Taxes & VAT (+{bemeTaxRate}%):</span>
                <span>+{currencySymbol}{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between text-white font-black border-t border-gray-700 pt-2 text-sm">
              <span>Quoted Contract Total:</span>
              <span className="text-cyan-300 font-bold">{currencySymbol}{grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC FORMAL PRINTABLE TENDER MODAL PREVIEW (IFRAME SAFE) */}
      {isQuotationPreviewOpen && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl shadow-black/80 relative overflow-hidden flex flex-col">
            
            {/* Header / Controls */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <FileText size={16} className="text-cyan-400" />
                <span>MEP Engineering Quotation Tender Sheet — Corporate Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printable = document.getElementById('tender-printable-area');
                    if (printable) {
                      const printWindow = window.open('', '', 'height=600,width=800');
                      if (printWindow) {
                        printWindow.document.write('<html><head><title>BEME Commercial Quotation</title>');
                        printWindow.document.write('<style>');
                        printWindow.document.write('body { font-family: sans-serif; color: #1a202c; padding: 30px; line-height: 1.5; }');
                        printWindow.document.write('h2 { color: #2b6cb0; margin-bottom: 5px; }');
                        printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-size: 11px; }');
                        printWindow.document.write('th, td { border: 1px solid #cbd5e0; padding: 6px 8px; text-align: left; }');
                        printWindow.document.write('th { background-color: #f7fafc; font-weight: bold; }');
                        printWindow.document.write('.text-right { text-align: right; }');
                        printWindow.document.write('.font-bold { font-weight: bold; }');
                        printWindow.document.write('.bg-gray { background-color: #edf2f7; font-weight: bold; }');
                        printWindow.document.write('.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 12px; }');
                        printWindow.document.write('.exclusions { font-style: italic; color: #718096; font-size: 10px; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 10px; }');
                        printWindow.document.write('</style></head><body>');
                        printWindow.document.write(printable.innerHTML);
                        printWindow.document.write('</body></html>');
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                      } else {
                        // Fallback if popup blocker
                        alert('Please enable popups or use on-screen copy.');
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs text-white font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Printer size={12} /> Print Tender Sheet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `BILL OF ENGINEERING MEASUREMENT & EVALUATION (BEME) QUOTATION
Quoted By: ${bemeCompanyName}
Project Name: ${settings.projectName || '—'}
Project No: ${settings.projectNo || '—'}
Engineer: ${settings.engineer || '—'}
Client: ${settings.client || '—'}
Validity: ${bemeQuotationValidity}
Payment Milestones: ${bemePaymentTerms}

FINANCIAL RECONCILIATION SUMMARY:
- Materials Cost (Base): ${currencySymbol}${baseProductCost.toFixed(2)}
- Installation Labor Cost (Base): ${currencySymbol}${baseServiceCost.toFixed(2)}
- Material Markups (${bemeProductMarkup}%): ${currencySymbol}${(baseProductCost * bemeProductMarkup / 100).toFixed(2)}
- Service Markups (${bemeServiceMarkup}%): ${currencySymbol}${(baseServiceCost * bemeServiceMarkup / 100).toFixed(2)}
- Contingency Allocation (${bemeContingency}%): ${currencySymbol}${contingencyAmount.toFixed(2)}
- Discount Applied: -${currencySymbol}${discountAmount.toFixed(2)}
- Taxes & VAT Assessment (${bemeTaxMode}): ${currencySymbol}${taxAmount.toFixed(2)}
------------------------------------------------------------
GRAND TOTAL CONTRACT QUOTE: ${currencySymbol}${grandTotalCost.toFixed(2)}`;
                    navigator.clipboard.writeText(text);
                    alert('Commercial Tender breakdown copied to clipboard!');
                  }}
                  className="px-3 py-1.5 bg-[#2d3748] hover:bg-[#3d4a61] rounded text-xs text-gray-300 font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <Copy size={12} /> Copy Statement Text
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuotationPreviewOpen(false)}
                  className="text-gray-400 hover:text-white text-xs cursor-pointer px-2.5 py-1.5 rounded bg-[#1a2035] hover:bg-[#252d4a]"
                >
                  ✕ Close Preview
                </button>
              </div>
            </div>

            {/* Scrollable Preview Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-white text-gray-900 custom-scrollbar">
              
              {/* PRINT CONTENT CONTAINER */}
              <div id="tender-printable-area" className="max-w-4xl mx-auto space-y-6">
                
                {/* Letterhead */}
                <div className="border-b-4 border-blue-600 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-blue-800 uppercase tracking-wide">{bemeCompanyName}</h2>
                    <p className="text-xs text-gray-500 font-semibold tracking-wider">OFFICIAL MEP SERVICES CONTRACT TENDER</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 font-mono">
                    <p>Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p>Doc ID: MEP-QT-{Math.floor(Math.random() * 90000 + 10000)}</p>
                    <p className="text-blue-600 font-bold">Currency: {currencyCode} ({currencySymbol})</p>
                  </div>
                </div>

                {/* Project Meta Details */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
                  <div className="space-y-1">
                    <p><strong className="text-gray-500 uppercase tracking-wider text-[10px]">Client / Project Owner:</strong></p>
                    <p className="text-sm font-bold text-gray-800">{settings.client || '—'}</p>
                    <p className="text-gray-600">Location: {(settings as any).siteAddress || '—'}</p>
                  </div>
                  <div className="space-y-1 border-l border-gray-200 pl-4">
                    <p><strong className="text-gray-500 uppercase tracking-wider text-[10px]">Project Specification:</strong></p>
                    <p className="text-sm font-bold text-gray-800">{settings.projectName || '—'} (No: {settings.projectNo || '—'})</p>
                    <p className="text-gray-600">MEP Lead Engineer: {settings.engineer || '—'}</p>
                  </div>
                </div>

                {/* Scope statement */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2">1.0 Scope of Works & Tender Inventory</h3>
                  <table className="w-full text-left border border-gray-200 text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-gray-200">
                        <th className="p-2 border border-gray-200 w-12 text-center">S/N</th>
                        <th className="p-2 border border-gray-200">Item Description & Specification</th>
                        <th className="p-2 border border-gray-200 w-16 text-center">Unit</th>
                        <th className="p-2 border border-gray-200 w-16 text-center">Qty</th>
                        {bemeCustomColumns.map(col => (
                          <th key={col} className="p-2 border border-gray-200 w-24 text-center">{col}</th>
                        ))}
                        {bemeCombineRates ? (
                          <th className="p-2 border border-gray-200 w-28 text-right">Rate ({currencySymbol})</th>
                        ) : (
                          <>
                            <th className="p-2 border border-gray-200 w-24 text-right">Materials Rate</th>
                            <th className="p-2 border border-gray-200 w-24 text-right">Labor Rate</th>
                          </>
                        )}
                        <th className="p-2 border border-gray-200 w-28 text-right">Total ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let printSn = 1;
                        return sortedCategories.map((cat, catIdx) => {
                          const catItems = activeBemeItems.filter(item => item.category === cat);
                          const totals = categoryTotals[cat];
                          if (catItems.length === 0) return null;

                          return (
                            <React.Fragment key={cat}>
                              <tr className="bg-gray-50 font-bold border-y border-gray-200 text-blue-900">
                                <td colSpan={(bemeCombineRates ? 5 : 6) + bemeCustomColumns.length} className="p-2">Section {catIdx + 1}.0 : {cat}</td>
                              </tr>
                              {catItems.map((item) => {
                                const pRate = getProductRate(item);
                                const sRate = getServiceRate(item);
                                const total = item.qty * (pRate + sRate);
                                return (
                                  <tr key={item.id} className="border-b border-gray-100">
                                    <td className="p-2 text-center text-gray-500">{printSn++}</td>
                                    <td className="p-2 font-medium text-gray-800">{item.desc}</td>
                                    <td className="p-2 text-center text-gray-500">{item.unit}</td>
                                    <td className="p-2 text-center font-bold text-gray-800">{item.qty}</td>
                                    {bemeCustomColumns.map(col => (
                                      <td key={col} className="p-2 text-center text-gray-700 border border-gray-100">{bemeRowCustomValues[item.id]?.[col] || '—'}</td>
                                    ))}
                                    {bemeCombineRates ? (
                                      <td className="p-2 text-right font-mono">{(pRate + sRate).toFixed(2)}</td>
                                    ) : (
                                      <>
                                        <td className="p-2 text-right font-mono">{pRate.toFixed(2)}</td>
                                        <td className="p-2 text-right font-mono">{sRate.toFixed(2)}</td>
                                      </>
                                    )}
                                    <td className="p-2 text-right font-bold font-mono">{total.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-gray-50 font-bold border-t border-gray-200 text-[10px]">
                                <td colSpan={4 + bemeCustomColumns.length} className="p-2 text-right text-gray-600">Subtotal Section {catIdx + 1}.0:</td>
                                {bemeCombineRates ? (
                                  <td className="p-2 text-right font-mono font-black" colSpan={2}>{totals.total.toFixed(2)}</td>
                                ) : (
                                  <>
                                    <td className="p-2 text-right font-mono">{totals.pTotal.toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono">{totals.sTotal.toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono font-black">{totals.total.toFixed(2)}</td>
                                  </>
                                )}
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Commercial Math */}
                <div className="page-break-avoid">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2">2.0 Tender Valuation Summary</h3>
                  <div className="grid grid-cols-2 gap-6 text-xs text-gray-700">
                    <div className="space-y-2 leading-relaxed">
                      <p><strong>Quotation Terms & Rules:</strong></p>
                      <ul className="list-disc pl-4 space-y-1 text-gray-500 text-[10px]">
                        <li>Validity Period: This contract rate is strictly guaranteed for <strong>{bemeQuotationValidity}</strong> from issue date.</li>
                        <li>Payment milestones: <strong>{bemePaymentTerms}</strong>.</li>
                        <li className="italic">Exclusions & Conditions: {bemeExclusions}</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between text-gray-600">
                        <span>Materials Cumulative (Base):</span>
                        <span>{currencySymbol}{baseProductCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Services & Labor (Base):</span>
                        <span>{currencySymbol}{baseServiceCost.toFixed(2)}</span>
                      </div>
                      
                      {bemeProductMarkup > 0 && (
                        <div className="flex justify-between text-blue-700 font-medium">
                          <span>Material Markups (+{bemeProductMarkup}%):</span>
                          <span>+{currencySymbol}{(baseProductCost * bemeProductMarkup / 100).toFixed(2)}</span>
                        </div>
                      )}

                      {bemeServiceMarkup > 0 && (
                        <div className="flex justify-between text-teal-700 font-medium">
                          <span>Service Markups (+{bemeServiceMarkup}%):</span>
                          <span>+{currencySymbol}{(baseServiceCost * bemeServiceMarkup / 100).toFixed(2)}</span>
                        </div>
                      )}

                      {bemeContingency > 0 && (
                        <div className="flex justify-between text-yellow-600 font-medium">
                          <span>Contingency Allocation (+{bemeContingency}%):</span>
                          <span>+{currencySymbol}{contingencyAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {bemeDiscountType !== 'none' && bemeDiscountValue > 0 && (
                        <div className="flex justify-between text-red-600 font-medium">
                          <span>Discount Applied (-):</span>
                          <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {bemeTaxMode !== 'none' && bemeTaxRate > 0 && (
                        <div className="flex justify-between text-purple-700 font-medium">
                          <span>Tax / VAT Assessment (+{bemeTaxRate}%):</span>
                          <span>+{currencySymbol}{taxAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-blue-900 font-black border-t border-gray-300 pt-2 text-xs">
                        <span>Grand Tender Contract Sum:</span>
                        <span>{currencySymbol}{grandTotalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sign-off */}
                <div className="pt-8 flex justify-between text-xs border-t border-gray-100">
                  <div className="w-48 text-center border-t border-gray-300 pt-1 text-gray-400 font-semibold tracking-wider uppercase text-[8px]">
                    Lead Engineer Approval
                  </div>
                  <div className="w-48 text-center border-t border-gray-300 pt-1 text-gray-400 font-semibold tracking-wider uppercase text-[8px]">
                    Client Confirmation & Seal
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal - Add Custom Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl max-w-lg w-full shadow-2xl shadow-black/80 relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Plus size={16} className="text-cyan-400" /> Add Custom BEME Item Row
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Category Segment</label>
                <select
                  value={addForm.category}
                  onChange={e => setAddForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="Electrical Works">Electrical Works</option>
                  <option value="HVAC Services">HVAC Services</option>
                  <option value="Plumbing Works">Plumbing Works</option>
                  <option value="Fire Protection">Fire Protection</option>
                  <option value="General Mechanical Services">General Mechanical Services</option>
                  <option value="Civil and Builders Works">Civil and Builders Works</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Description of Materials / Equipment</label>
                <textarea
                  required
                  rows={3}
                  value={addForm.desc}
                  onChange={e => setAddForm(prev => ({ ...prev, desc: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                  placeholder="e.g. PVC insulated multi-core wiring cable..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Measurement Unit</label>
                  <input
                    type="text"
                    required
                    value={addForm.unit}
                    onChange={e => setAddForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                    placeholder="e.g. m, No., Pcs, Set, Lot"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addForm.qty}
                    onChange={e => setAddForm(prev => ({ ...prev, qty: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Product Unit Rate ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addForm.productRate || ''}
                    onChange={e => setAddForm(prev => ({ ...prev, productRate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Service Unit Rate ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addForm.serviceRate || ''}
                    onChange={e => setAddForm(prev => ({ ...prev, serviceRate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2d3748]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#2d3748] hover:bg-[#3d4a61] rounded text-xs text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-bold cursor-pointer"
                >
                  Confirm & Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Edit Item */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl max-w-lg w-full shadow-2xl shadow-black/80 relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Edit size={16} className="text-amber-400" /> Edit BEME Item Details
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Category Segment</label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                  placeholder="e.g. Electrical Works"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Description of Materials / Equipment</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.desc}
                  onChange={e => setEditForm(prev => ({ ...prev, desc: e.target.value }))}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Measurement Unit</label>
                  <input
                    type="text"
                    required
                    value={editForm.unit}
                    onChange={e => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editForm.qty}
                    onChange={e => setEditForm(prev => ({ ...prev, qty: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Product Unit Rate ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.productRate || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, productRate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Service Unit Rate ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.serviceRate || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, serviceRate: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2d3748]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-[#2d3748] hover:bg-[#3d4a61] rounded text-xs text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-xs text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
