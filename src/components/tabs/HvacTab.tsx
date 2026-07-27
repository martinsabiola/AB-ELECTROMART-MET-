import React, { useEffect, useState, useMemo, useRef } from 'react';
import { HvacUnit, Board, Circuit, ProjectSettings, ROOM_LUX_DATABASE } from '../../types';
import { parseMEPFile } from '../../utils/mepImporter';
import { Settings, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw, FileSpreadsheet, Wind, Zap, Cable, Thermometer, Check, Layers, Copy, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  getCategoriesForTab,
  getCustomColumnsForTab,
  getMepDropdownMetadata,
  saveMepDropdownMetadata,
  RenderCustomHeaders,
  RenderCustomCells,
  DropdownCategoryConfigPanel,
  MEP_TABS,
  MEP_ROLES,
  RoomSelector
} from '../../utils/dropdownMetadata';

// Hardcoded fallbacks
export const DEFAULT_HVAC_SYSTEMS = ['Split AC', 'Cassette AC', 'Ducted', 'VRF/VRV', 'Chilled Water FCU'];
export const DEFAULT_HVAC_REFRIGERANTS = ['R-410A', 'R-32', 'R-22', 'R-134a'];
export const DEFAULT_SWITCH_TYPES = [
  'None',
  '1 Gang',
  '1 Gang Smart',
  '2 Gang',
  '2 Gang Smart',
  '3 Gang',
  '3 Gang Smart',
  '4 Gang',
  '4 Gang Smart',
  '10 Grid',
  '13A 1G AC Switch',
  '20A 2G AC Grid',
  '32A 3G AC Grid',
  '45A 4G AC Grid',
  'Motion Switch',
  '32-100A Isolator',
  '16A-32A Switch',
  '3 Phase Isolator'
];
export const DEFAULT_CB_SIZES = ['6', '10', '16', '20', '25', '32', '40', '50', '63', '80', '100', '125', '160', '200', '250', '400', '630'];
export const DEFAULT_WIRE_SIZES = ['1', '1.5', '2.5', '4', '6', '10', '16', '25', '35', '50'];
export const DEFAULT_CABLE_CORES = ['1 Core', '2 Cores', '3 Cores', '4 Cores', '5 Cores'];
export const DEFAULT_CABLE_COLORS = [
  'Standard 3-Core (Red/Black/Green)',
  'Standard 2-Core (Red/Black)',
  'Standard 4-Core (Red/Yellow/Blue/Black)',
  'Standard 5-Core (R/Y/B/Black/Green)'
];

interface HvacTabProps {
  units: HvacUnit[];
  setUnits: React.Dispatch<React.SetStateAction<HvacUnit[]>>;
  boards?: Board[];
  setBoards?: React.Dispatch<React.SetStateAction<Board[]>>;
  settings?: ProjectSettings;
  setSettings?: React.Dispatch<React.SetStateAction<ProjectSettings>>;
}

export function calculateUnitBtu(area: number, height: number, factors?: string[]): number {
  const vol = area * height;
  const baseBtu = (area * 350) + (vol * 100);
  if (!factors || factors.length === 0) return baseBtu;
  
  let factorSum = 0;
  if (factors.includes('Sun rays')) factorSum += 0.20;
  if (factors.includes('People')) factorSum += 0.15;
  if (factors.includes('Lighting')) factorSum += 0.10;
  if (factors.includes('Cooking')) factorSum += 0.30;
  if (factors.includes('Electrical equipment')) factorSum += 0.15;
  if (factors.includes('Outside air')) factorSum += 0.10;
  
  return baseBtu * (1.0 + factorSum);
}

export function calculateAcHp(area: number, height: number, factors?: string[]): number {
  const estimatedBtu = calculateUnitBtu(area, height, factors);
  if (estimatedBtu <= 0) return 0;
  if (estimatedBtu <= 10000) return 1.0;
  if (estimatedBtu <= 14000) return 1.5;
  if (estimatedBtu <= 20000) return 2.0;
  if (estimatedBtu <= 26000) return 2.5;
  if (estimatedBtu <= 32000) return 3.0;
  if (estimatedBtu <= 42000) return 4.0;
  return Math.round((estimatedBtu / 9000) * 10) / 10;
}

export const BTU_FACTORS_LIST = [
  { label: 'Sun rays', short: '☀️ Sun rays', pct: '+20%' },
  { label: 'People', short: '👥 People', pct: '+15%' },
  { label: 'Lighting', short: '💡 Lighting', pct: '+10%' },
  { label: 'Cooking', short: '🍳 Cooking', pct: '+30%' },
  { label: 'Electrical equipment', short: '🔌 Elec Eqp', pct: '+15%' },
  { label: 'Outside air', short: '🍃 Outside air', pct: '+10%' },
];

export function BtuFactorsDropdownChecklist({
  selectedFactors = [],
  onChange,
  className = ''
}: {
  selectedFactors: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedCount = selectedFactors.length;

  const getSummaryText = () => {
    if (selectedCount === 0) return 'Select Factors (0)';
    const selectedObj = BTU_FACTORS_LIST.filter(f => selectedFactors.includes(f.label));
    if (selectedObj.length === 1) {
      return selectedObj[0].short;
    }
    if (selectedObj.length === 2) {
      return `${selectedObj[0].short}, ${selectedObj[1].short}`;
    }
    return `${selectedObj[0].short}, ${selectedObj[1].short} (+${selectedObj.length - 2})`;
  };

  const totalPct = selectedFactors.reduce((sum, f) => {
    const found = BTU_FACTORS_LIST.find(item => item.label === f);
    return sum + (found ? parseInt(found.pct) : 0);
  }, 0);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-sm ${
          selectedCount > 0
            ? 'bg-teal-950/70 border-teal-500/50 text-teal-300 hover:bg-teal-900/80 hover:border-teal-400'
            : 'bg-[#0f1117] border-[#2d3748] text-gray-400 hover:border-gray-500 hover:text-gray-200'
        }`}
        title="Click to select BTU heat load factors"
      >
        <span className="truncate text-xs font-medium">{getSummaryText()}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedCount > 0 && (
            <span className="bg-teal-500/25 text-teal-300 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-teal-500/30">
              +{totalPct}%
            </span>
          )}
          <span className="text-[9px] text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-64 bg-[#111622] border border-[#2d3748] rounded-xl shadow-2xl p-2.5 z-50 space-y-2 text-left backdrop-blur-md">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#2d3748]">
            <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1">
              <span>🌱</span> BTU Factors Checklist
            </span>
            <div className="flex gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => onChange(BTU_FACTORS_LIST.map(f => f.label))}
                className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer font-bold"
              >
                All
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-bold"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
            {BTU_FACTORS_LIST.map(item => {
              const isChecked = selectedFactors.includes(item.label);
              return (
                <label
                  key={item.label}
                  className={`flex items-center justify-between p-1.5 rounded-md border cursor-pointer select-none transition-all text-xs ${
                    isChecked
                      ? 'bg-teal-500/20 border-teal-500/40 text-teal-200 font-semibold'
                      : 'bg-[#0a0d14] border-transparent text-gray-400 hover:bg-[#161d2e] hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? selectedFactors.filter(f => f !== item.label)
                          : [...selectedFactors, item.label];
                        onChange(next);
                      }}
                      className="accent-teal-500 h-3.5 w-3.5 rounded cursor-pointer"
                    />
                    <span className="truncate">{item.short}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#05070a] text-amber-300 font-bold border border-amber-500/20">
                    {item.pct}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-[#2d3748] flex items-center justify-between text-[10px] text-gray-400">
            <span>Total Load Added:</span>
            <span className="font-mono font-extrabold text-teal-300">+{totalPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function adjustHvacUnit(
  unit: HvacUnit,
  key: keyof HvacUnit | 'btu' | 'tonnage',
  value: any,
  settings?: ProjectSettings
): HvacUnit {
  const updated = { ...unit, [key as any]: value };
  const cfmPerKw = settings?.hvacCfmPerKw || 80;

  if (key === 'length' || key === 'width') {
    const l = updated.length || 0;
    const w = updated.width || 0;
    updated.area = Math.round(l * w * 100) / 100;
    const h = updated.height || 3.0;
    const vol = Math.round(updated.area * h * 10) / 10;
    const btu = calculateUnitBtu(updated.area, h, updated.factors);
    updated.acHp = calculateAcHp(updated.area, h, updated.factors);
    updated.coolingLoad = Math.round((btu / 3412) * 100) / 100;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'height') {
    const h = Number(value) || 3.0;
    const area = updated.area || 0;
    const vol = Math.round(area * h * 10) / 10;
    const btu = calculateUnitBtu(area, h, updated.factors);
    updated.acHp = calculateAcHp(area, h, updated.factors);
    updated.coolingLoad = Math.round((btu / 3412) * 100) / 100;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'area') {
    const area = Number(value) || 0;
    const h = updated.height || 3.0;
    const vol = Math.round(area * h * 10) / 10;
    const btu = calculateUnitBtu(area, h, updated.factors);
    updated.acHp = calculateAcHp(area, h, updated.factors);
    updated.coolingLoad = Math.round((btu / 3412) * 100) / 100;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'factors') {
    const area = updated.area || 0;
    const h = updated.height || 3.0;
    const btu = calculateUnitBtu(area, h, updated.factors);
    updated.acHp = calculateAcHp(area, h, updated.factors);
    updated.coolingLoad = Math.round((btu / 3412) * 100) / 100;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'acHp') {
    const hp = Number(value) || 0;
    const btu = hp * 9000;
    updated.coolingLoad = Math.round((btu / 3412) * 100) / 100;
    updated.watts = Math.round(hp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'coolingLoad') {
    const kw = Number(value) || 0;
    const btu = kw * 3412;
    updated.acHp = Math.round((btu / 9000) * 10) / 10;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(kw * cfmPerKw);
  } else if ((key as string) === 'btu' || (key as string) === 'customBtu') {
    const btuVal = Number(value) || 0;
    updated.coolingLoad = Math.round((btuVal / 3412) * 100) / 100;
    updated.acHp = Math.round((btuVal / 9000) * 10) / 10;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if ((key as string) === 'tonnage') {
    const trVal = Number(value) || 0;
    updated.coolingLoad = Math.round((trVal * 3.517) * 100) / 100;
    const btuVal = updated.coolingLoad * 3412;
    updated.acHp = Math.round((btuVal / 9000) * 10) / 10;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'watts') {
    const w = Number(value) || 0;
    updated.acHp = Math.round((w / 750) * 10) / 10;
    const btu = updated.acHp * 9000;
    updated.coolingLoad = Math.round((btu / 3412) * 100) / 100;
    updated.totalWatts = w * (updated.quantity || 1);
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'totalWatts') {
    const tw = Number(value) || 0;
    const q = updated.quantity || 1;
    updated.watts = Math.round(tw / q);
    updated.acHp = Math.round((updated.watts / 750) * 10) / 10;
    const btu = updated.acHp * 9000;
    updated.coolingLoad = Math.round((btu / 3412) * 100) / 100;
    updated.cfm = Math.round(updated.coolingLoad * cfmPerKw);
  } else if (key === 'cfm') {
    const cfmVal = Number(value) || 0;
    updated.coolingLoad = Math.round((cfmVal / cfmPerKw) * 100) / 100;
    const btu = updated.coolingLoad * 3412;
    updated.acHp = Math.round((btu / 9000) * 10) / 10;
    updated.watts = Math.round(updated.acHp * 750);
    updated.totalWatts = updated.watts * (updated.quantity || 1);
  } else if (key === 'quantity') {
    const q = Math.max(1, parseInt(value) || 1);
    updated.totalWatts = (updated.watts || 0) * q;
    updated.totalCable = (updated.cableLength || 0) * q;
  } else if (key === 'cableLength') {
    const l = Number(value) || 0;
    updated.totalCable = l * (updated.quantity || 1);
  }

  return updated;
}

export function balanceHvacCoolingLoads(
  unitsList: HvacUnit[],
  targetZoneName: string,
  activeUnitId?: string,
  isCoolingLoadChange?: boolean,
  settings?: ProjectSettings
): HvacUnit[] {
  const zoneNameLower = targetZoneName.trim().toLowerCase();
  if (!zoneNameLower) return unitsList;

  // Find all units belonging to this zone
  const sameZoneUnits = unitsList.filter(u => u.zone && u.zone.trim().toLowerCase() === zoneNameLower);
  if (sameZoneUnits.length <= 1) {
    // If only 1 unit is in this room, ensure its calculations use its factors!
    return unitsList.map(u => {
      if (u.zone && u.zone.trim().toLowerCase() === zoneNameLower) {
        const hp = u.acHp !== undefined && u.acHp > 0 ? u.acHp : calculateAcHp(u.area || 0, u.height || 3.0, u.factors);
        const btu = calculateUnitBtu(u.area || 0, u.height || 3.0, u.factors);
        const coolingLoad = Math.round((btu / 3412) * 100) / 100;
        const watts = Math.round(hp * 750);
        const totalWatts = watts * (u.quantity || 1);
        return {
          ...u,
          acHp: hp,
          coolingLoad,
          watts,
          totalWatts
        };
      }
      return u;
    });
  }

  // Determine reference unit for physical room dimensions (Length, Width, Area, Height)
  const refUnit = sameZoneUnits.find(u => u.id === activeUnitId) || sameZoneUnits[0];
  const refLength = refUnit.length;
  const refWidth = refUnit.width;
  const refArea = refUnit.area !== undefined && refUnit.area > 0 ? refUnit.area : 20;
  const refHeight = refUnit.height !== undefined && refUnit.height > 0 ? refUnit.height : 3.0;

  // Union of heat load factors for this room
  const mergedFactors = Array.from(new Set(sameZoneUnits.flatMap(u => u.factors || [])));

  // Total room required BTU/hr based on room area, height, and heat factors
  const roomTotalBtu = calculateUnitBtu(refArea, refHeight, mergedFactors);

  // Calculate total AC Hp for this room
  const totalAcHp = sameZoneUnits.reduce((sum, u) => {
    const hpVal = u.acHp !== undefined && u.acHp > 0 ? u.acHp : calculateAcHp(refArea, refHeight, u.factors);
    return sum + hpVal * (u.quantity || 1);
  }, 0);

  const cfmPerKw = settings?.hvacCfmPerKw || 80;

  return unitsList.map(u => {
    if (u.zone && u.zone.trim().toLowerCase() === zoneNameLower) {
      const uHp = u.acHp !== undefined && u.acHp > 0 ? u.acHp : calculateAcHp(refArea, refHeight, u.factors);
      const totalUnitsCount = sameZoneUnits.reduce((s, item) => s + (item.quantity || 1), 0);
      const shareFraction = totalAcHp > 0 ? (uHp * (u.quantity || 1)) / totalAcHp : (u.quantity || 1) / totalUnitsCount;
      const uBtu = Math.round(roomTotalBtu * shareFraction);
      const newCooling = uBtu / 3412; // convert BTU/hr back to kW cooling load
      const watts = Math.round(uHp * 750);
      const totalWatts = watts * (u.quantity || 1);
      const cfm = Math.round(newCooling * cfmPerKw);
      
      return {
        ...u,
        length: refLength,
        width: refWidth,
        area: refArea,
        height: refHeight,
        factors: mergedFactors,
        acHp: uHp,
        coolingLoad: Math.round(newCooling * 100) / 100,
        watts,
        totalWatts,
        cfm
      };
    }
    return u;
  });
}

export const ALL_COLUMNS = [
  { id: 'system', label: 'System Type' },
  { id: 'length', label: 'Length (L)' },
  { id: 'width', label: 'Width (W)' },
  { id: 'area', label: 'Area' },
  { id: 'height', label: 'Height (H)' },
  { id: 'volume', label: 'Volume' },
  { id: 'factors', label: 'Heat Load Factors' },
  { id: 'acHp', label: 'AC hp' },
  { id: 'cooling', label: 'Cooling (kW)' },
  { id: 'tonnage', label: 'Tonnage (TR)' },
  { id: 'btu', label: 'BTU/hr' },
  { id: 'cfm', label: 'CFM' },
  { id: 'ach', label: 'ACH' },
  { id: 'refrigerant', label: 'Refrigerant' },
  { id: 'switchType', label: 'Switch Type' },
  { id: 'switchQty', label: 'Switch Qty' },
  { id: 'watts', label: 'Watts/Unit' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'totalWatts', label: 'Total Watts' },
  { id: 'phase', label: 'Phase' },
  { id: 'cbSizing', label: 'CB Sizing' },
  { id: 'wire', label: 'Wire mm²' },
  { id: 'linkedCircuit', label: 'DB & Circuit ID' },
  { id: 'cableLength', label: 'Cable Length' },
  { id: 'cores', label: 'Cores' },
  { id: 'totalCable', label: 'Total Cable' },
  { id: 'palette', label: 'Core Palette' },
  { id: 'notes', label: 'Notes' }
];

export default function HvacTab({ units, setUnits, boards, setBoards, settings, setSettings }: HvacTabProps) {
  const registeredRoomSizes = useMemo(() => {
    const map: Record<string, { l: number; w: number; h?: number }> = {};
    if (boards) {
      boards.forEach(b => {
        b.circuits.forEach(c => {
          if (c.room && (c.roomL || 0) > 0 && (c.roomW || 0) > 0) {
            map[c.room.trim().toLowerCase()] = {
              l: c.roomL || 0,
              w: c.roomW || 0,
              h: c.ceilingH,
            };
          }
        });
      });
    }
    return map;
  }, [boards]);

  // --- Collapsible Dropdowns State ---
  const [showSettings, setShowSettings] = useState(false);
  const customCols = getCustomColumnsForTab('hvac');

  // --- Column Visibility State ---
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mep_hvac_hidden_cols_v2');
      return saved ? JSON.parse(saved) : ['length', 'width', 'volume', 'btu', 'cfm', 'ach', 'switchType', 'switchQty', 'cores', 'palette'];
    } catch {
      return ['length', 'width', 'volume', 'btu', 'cfm', 'ach', 'switchType', 'switchQty', 'cores', 'palette'];
    }
  });
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [metricsViewMode, setMetricsViewMode] = useState<'cards' | 'table'>('table');

  const saveHiddenCols = (cols: string[]) => {
    setHiddenColumns(cols);
    try {
      localStorage.setItem('mep_hvac_hidden_cols_v2', JSON.stringify(cols));
    } catch (e) {
      console.error(e);
    }
  };

  const isColVisible = (colId: string) => !hiddenColumns.includes(colId);

  const toggleCol = (colId: string) => {
    if (hiddenColumns.includes(colId)) {
      saveHiddenCols(hiddenColumns.filter(c => c !== colId));
    } else {
      saveHiddenCols([...hiddenColumns, colId]);
    }
  };

  const showAllCols = () => saveHiddenCols([]);
  const hideUnnecessaryCols = () => saveHiddenCols(['length', 'width', 'volume', 'btu', 'cfm', 'ach', 'switchType', 'switchQty', 'cores', 'palette']);

  const getTableMinWidth = () => {
    let width = 56 + 192 + 80; // Drag + Location/Room + Actions
    const colWidths: Record<string, number> = {
      system: 176,
      length: 96,
      width: 96,
      area: 96,
      height: 96,
      volume: 96,
      acHp: 96,
      cooling: 112,
      tonnage: 112,
      btu: 128,
      cfm: 112,
      ach: 112,
      refrigerant: 144,
      switchType: 192,
      switchQty: 96,
      watts: 112,
      quantity: 96,
      totalWatts: 128,
      phase: 144,
      cbSizing: 112,
      wire: 112,
      linkedCircuit: 144,
      cableLength: 112,
      cores: 112,
      totalCable: 128,
      palette: 240,
      notes: 180
    };
    ALL_COLUMNS.forEach(col => {
      if (isColVisible(col.id)) {
        width += colWidths[col.id] || 112;
      }
    });
    width += customCols.length * 120;
    return `${width}px`;
  };

  // --- Add Zone Overlay Modal State ---
  const [addZoneModalOpen, setAddZoneModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // DB & Circuit Allocation States
  const [modalBoardId, setModalBoardId] = useState<string>('');
  const [modalCircuitSelection, setModalCircuitSelection] = useState<string>('NEW_AUTO');
  const [activeCircuitPopoverUnitId, setActiveCircuitPopoverUnitId] = useState<string | null>(null);

  useEffect(() => {
    if (boards && boards.length > 0 && !modalBoardId) {
      setModalBoardId(boards[0].id);
    }
  }, [boards]);

  const filteredUnits = units.filter(unit => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (unit.zone && unit.zone.toLowerCase().includes(q)) ||
      (unit.system && unit.system.toLowerCase().includes(q)) ||
      (unit.refrigerant && unit.refrigerant.toLowerCase().includes(q)) ||
      (unit.notes && unit.notes.toLowerCase().includes(q)) ||
      (unit.switchType && unit.switchType.toLowerCase().includes(q))
    );
  });
  const [modalTab, setModalTab] = useState<'physical' | 'sizing' | 'power'>('physical');
  const [newZoneForm, setNewZoneForm] = useState<Partial<HvacUnit>>({});
  const [roomSelectValue, setRoomSelectValue] = useState('');
  const [customRoomName, setCustomRoomName] = useState('');

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dummyScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(2200);
  const isSyncingScroll = useRef(false);

  const syncScrolls = (source: HTMLDivElement | null, targets: (HTMLDivElement | null)[]) => {
    if (!source || isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const scrollLeft = source.scrollLeft;
    targets.forEach(target => {
      if (target) target.scrollLeft = scrollLeft;
    });
    isSyncingScroll.current = false;
  };

  const handleTableScroll = () => {
    syncScrolls(tableContainerRef.current, [dummyScrollRef.current]);
  };

  const handleDummyScroll = () => {
    syncScrolls(dummyScrollRef.current, [tableContainerRef.current]);
  };

  const scrollTableBy = (delta: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    if (!tableContainer) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setTableScrollWidth(entry.target.scrollWidth);
      }
    });

    observer.observe(tableContainer);
    return () => observer.disconnect();
  }, [units]);

  // Active board and circuits for modal assignment
  const activeModalBoard = useMemo(() => {
    if (!boards || boards.length === 0) return null;
    return boards.find(b => b.id === modalBoardId) || boards[0];
  }, [boards, modalBoardId]);

  const activeModalBoardCircuits = useMemo(() => {
    if (!activeModalBoard) return [];
    return activeModalBoard.circuits || [];
  }, [activeModalBoard]);

  const nextModalCircuitId = useMemo(() => {
    if (!activeModalBoardCircuits || activeModalBoardCircuits.length === 0) return 'C01';
    const lastCircuit = activeModalBoardCircuits[activeModalBoardCircuits.length - 1];
    const lastCid = lastCircuit?.circuitId || '';
    const match = lastCid.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const num = parseInt(numStr, 10);
      return prefix + String(num + 1).padStart(numStr.length, '0');
    }
    return 'C' + String(activeModalBoardCircuits.length + 1).padStart(2, '0');
  }, [activeModalBoardCircuits]);

  // Combined rooms list for autocomplete in creation
  const dynamicRoomList = useMemo(() => {
    return Array.from(new Set([
      ...Object.keys(ROOM_LUX_DATABASE),
      ...(settings?.customRooms || [])
    ])).sort();
  }, [settings?.customRooms]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('electrical_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          'HVAC System Types': DEFAULT_HVAC_SYSTEMS,
          'HVAC Refrigerants': DEFAULT_HVAC_REFRIGERANTS,
          'Switch Types': DEFAULT_SWITCH_TYPES,
          'CB Sizes (A)': DEFAULT_CB_SIZES,
          'Wire Sizes (mm²)': DEFAULT_WIRE_SIZES,
          'Cable Cores': DEFAULT_CABLE_CORES,
          'Cable Core Palette': DEFAULT_CABLE_COLORS,
          ...parsed
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      'HVAC System Types': DEFAULT_HVAC_SYSTEMS,
      'HVAC Refrigerants': DEFAULT_HVAC_REFRIGERANTS,
      'Switch Types': DEFAULT_SWITCH_TYPES,
      'CB Sizes (A)': DEFAULT_CB_SIZES,
      'Wire Sizes (mm²)': DEFAULT_WIRE_SIZES,
      'Cable Cores': DEFAULT_CABLE_CORES,
      'Cable Core Palette': DEFAULT_CABLE_COLORS
    };
  });

  useEffect(() => {
    localStorage.setItem('electrical_dropdowns', JSON.stringify(dropdowns));
  }, [dropdowns]);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('electrical_dropdowns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDropdowns(parsed);
        } catch (e) {
          // ignore
        }
      }
    };
    const handleToggleDropdowns = () => {
      setShowSettings(prev => !prev);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('trigger-mep-manage-dropdowns', handleToggleDropdowns);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('trigger-mep-manage-dropdowns', handleToggleDropdowns);
    };
  }, []);

  // Auto-fill area, height, and AC hp from electrical board rooms
  useEffect(() => {
    if (!boards || !units || units.length === 0) return;

    let changed = false;
    const updatedUnits = units.map(unit => {
      const zoneName = unit.zone?.trim().toLowerCase();
      if (!zoneName) return unit;

      let matchedCircuit: any = null;
      for (const board of boards) {
        const found = board.circuits.find(c => c.room && c.room.trim().toLowerCase() === zoneName && c.roomL && c.roomW && c.loadType !== 'Air Conditioner');
        if (found) {
          matchedCircuit = found;
          break;
        }
      }

      if (matchedCircuit) {
        const elecArea = +(matchedCircuit.roomL * matchedCircuit.roomW).toFixed(1);
        const elecHeight = +(matchedCircuit.ceilingH || 3.0).toFixed(1);
        const calculatedHp = calculateAcHp(elecArea, elecHeight);

        // Only overwrite if area/height changed physically
        if (unit.area !== elecArea || unit.height !== elecHeight) {
          changed = true;
          return {
            ...unit,
            area: elecArea,
            height: elecHeight,
            acHp: calculatedHp
          };
        }
      } else {
        if (unit.acHp === undefined) {
          const calculatedHp = calculateAcHp(unit.area || 0, unit.height || 0);
          changed = true;
          return {
            ...unit,
            acHp: calculatedHp
          };
        }
      }
      return unit;
    });

    if (changed) {
      let finalUnits = updatedUnits;
      const uniqueZones = Array.from(new Set(finalUnits.map(u => u.zone?.trim()).filter(Boolean)));
      uniqueZones.forEach(zoneName => {
        finalUnits = balanceHvacCoolingLoads(finalUnits, zoneName!, undefined, false, settings);
      });
      setTimeout(() => {
        setUnits(prev => {
          if (JSON.stringify(prev) === JSON.stringify(finalUnits)) return prev;
          return finalUnits;
        });
      }, 0);
    }
  }, [boards]);

  // AC Equipment Summary Memoized counts and types
  const acSummary = useMemo(() => {
    const summary: Record<string, { type: string; hp: number; count: number; totalWatts: number }> = {};
    units.forEach(u => {
      const hpVal = u.acHp !== undefined && u.acHp > 0 ? u.acHp : calculateAcHp(u.area || 0, u.height || 3.0);
      const systemType = u.system || 'Unknown';
      const key = `${systemType}_${hpVal.toFixed(1)}`;
      const qty = u.quantity || 1;
      const watts = u.totalWatts || ((u.watts || 1500) * qty);

      if (summary[key]) {
        summary[key].count += qty;
        summary[key].totalWatts += watts;
      } else {
        summary[key] = {
          type: systemType,
          hp: hpVal,
          count: qty,
          totalWatts: watts
        };
      }
    });
    return Object.values(summary).sort((a, b) => b.count - a.count || b.hp - a.hp);
  }, [units]);

  // Hidden File Input Ref for Imports
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // File Import Logic
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: true }));
      await new Promise(r => setTimeout(r, 100));
      const res = await parseMEPFile(file, boards, settings);
      if (res.hvacUnits && res.hvacUnits.length > 0) {
        setUnits(prev => {
          let nextUnits = mode === 'replace' ? res.hvacUnits! : [...prev, ...res.hvacUnits!];
          const uniqueZones = Array.from(new Set(nextUnits.map(u => u.zone.trim()).filter(Boolean)));
          uniqueZones.forEach(z => {
            nextUnits = balanceHvacCoolingLoads(nextUnits, z, undefined, false, settings);
          });
          return nextUnits;
        });
      }
      window.dispatchEvent(new CustomEvent('trigger-mep-update-workspace', { detail: res }));
      window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: true, text: `📥 ${res.summaryMessage}` } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: false, text: 'Import failed: ' + (err.message || 'invalid file') } }));
    } finally {
      window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: false }));
    }
  };

  // File Export Logic
  const handleExportFile = (format: string) => {
    const headers = [
      'Location / Room', 'System Type', 'Length', 'Width', 'Area', 'Height', 'Volume', 
      'AC hp', 'Cooling (kW)', 'Tonnage (TR)', 'BTU/hr', 'CFM', 'ACH', 'Refrigerant', 
      'Switch Type', 'Switch Qty', 'Watts/Unit', 'Quantity', 'Total Watts', 'Phase', 
      'CB Sizing', 'Wire mm²', 'Cable Length', 'Cores', 'Total Cable', 'Cable Colors', 'Notes'
    ];
    
    const dataRows = units.map(u => {
      const vol = +(u.area * u.height).toFixed(1);
      const btu = +((u.coolingLoad || 0) * 3412).toFixed(0);
      const tr = +((u.coolingLoad || 0) / 3.517).toFixed(2);
      const ach = u.cfm ? ((u.cfm * 60) / (vol * 35.3147)).toFixed(1) : '—';
      const totWatts = (u.watts || 1500) * (u.quantity || 1);
      const totCable = (u.cableLength || 15) * (u.quantity || 1);
      
      return [
        u.zone, u.system, u.length || '', u.width || '', u.area, u.height, vol, 
        u.acHp || '', u.coolingLoad, tr, btu, u.cfm, ach, u.refrigerant, 
        u.switchType || '', u.switchQty || 1, u.watts || 1500, u.quantity || 1, totWatts, u.phase || 'Single Phase', 
        u.cbSizing || 20, u.wire || '4', u.cableLength || 15, u.cores || '3 Cores', totCable, u.cableColors || '', u.notes
      ];
    });
    
    const allRows = [headers, ...dataRows];
    
    if (format === 'xlsx' || format === 'xls') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'HVAC Sizing Schedule');
      XLSX.writeFile(wb, `HVAC_Sizing_Schedule.${format}`);
    } else {
      const isCsv = format === 'csv';
      const delimiter = isCsv ? ',' : '\t';
      const fileText = allRows.map(row => row.map(cell => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        return val.includes(delimiter) || val.includes('\n') || val.includes('"') 
          ? `"${val.replace(/"/g, '""')}"` 
          : val;
      }).join(delimiter)).join('\n');
      
      const blob = new Blob([fileText], { type: isCsv ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `HVAC_Sizing_Schedule.${isCsv ? 'csv' : 'txt'}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Custom Event Listeners for Global Header Integration
  useEffect(() => {
    const handleImportTrigger = (e: Event) => {
      importFileInputRef.current?.click();
    };
    const handleExportTrigger = (e: Event) => {
      const format = (e as CustomEvent).detail || 'xlsx';
      handleExportFile(format);
    };

    window.addEventListener('trigger-mep-import-hvac', handleImportTrigger);
    window.addEventListener('trigger-mep-export-hvac', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import-hvac', handleImportTrigger);
      window.removeEventListener('trigger-mep-export-hvac', handleExportTrigger);
    };
  }, [units]);

  // Dropdown Manager Controls
  const [selectedKey, setSelectedKey] = useState('HVAC System Types');
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newCustomListTab, setNewCustomListTab] = useState('hvac');
  const [newCustomListRole, setNewCustomListRole] = useState('column_dropdown');

  // Group By State
  const [groupBy, setGroupBy] = useState<string>('none');

  const clearTable = () => {
    if (confirm('Are you sure you want to clear all HVAC zones from the schedule?')) {
      setUnits([]);
    }
  };

  // Sourced dropdown vectors
  const systemsList = dropdowns['HVAC System Types'] || DEFAULT_HVAC_SYSTEMS;
  const refrigerantsList = dropdowns['HVAC Refrigerants'] || DEFAULT_HVAC_REFRIGERANTS;
  const switchTypesList = dropdowns['Switch Types'] || DEFAULT_SWITCH_TYPES;
  const cbSizesList = dropdowns['CB Sizes (A)'] || DEFAULT_CB_SIZES;
  const wireSizesList = dropdowns['Wire Sizes (mm²)'] || DEFAULT_WIRE_SIZES;
  const coresList = dropdowns['Cable Cores'] || DEFAULT_CABLE_CORES;
  const palettesList = dropdowns['Cable Core Palette'] || DEFAULT_CABLE_COLORS;

  // --- Synchronization to Electrical Load Panel ---
  const syncHvacToElectrical = (
    updatedUnits: HvacUnit[],
    currentBoards: Board[],
    updateBoardsAction: React.Dispatch<React.SetStateAction<Board[]>>
  ) => {
    let boardsChanged = false;
    let unitsChanged = false;

    const systemMapping: Record<string, string> = {
      'Split AC': 'Split',
      'Cassette AC': 'Cassette',
      'Ducted': 'Ducted',
      'VRF/VRV': 'VRF',
      'Chilled Water FCU': 'FCU'
    };

    const validHvacLinkedIds = new Set(updatedUnits.map(u => u.linkedCircuitId).filter(Boolean));
    const newUnitsCopy = updatedUnits.map(u => ({ ...u }));

    const newBoards = currentBoards.map((board) => {
      // Clean up AC circuits whose linked HVAC unit was deleted
      const filteredCircuits = board.circuits.filter(c => {
        if (c.loadType === 'Air Conditioner' && c.id.startsWith('LNK-')) {
          return validHvacLinkedIds.has(c.id);
        }
        return true;
      });

      if (filteredCircuits.length !== board.circuits.length) {
        boardsChanged = true;
      }

      const updatedCircuits = filteredCircuits.map(c => {
        const matchingUnit = newUnitsCopy.find(u =>
          u.linkedCircuitId === c.id ||
          (u.zone && c.room && u.zone.trim().toLowerCase() === c.room.trim().toLowerCase() && c.loadType === 'Air Conditioner' && !u.linkedCircuitId)
        );

        if (matchingUnit) {
          if (!matchingUnit.linkedCircuitId) {
            matchingUnit.linkedCircuitId = c.id;
            unitsChanged = true;
          }

          const calculatedL = matchingUnit.length !== undefined && matchingUnit.length > 0 ? matchingUnit.length : (matchingUnit.area ? Math.round(Math.sqrt(matchingUnit.area) * 10) / 10 : 0);
          const calculatedW = matchingUnit.width !== undefined && matchingUnit.width > 0 ? matchingUnit.width : (matchingUnit.area ? Math.round((matchingUnit.area / calculatedL) * 10) / 10 : 0);
          const mappedAcType = systemMapping[matchingUnit.system || ''] || 'Split';

          const updatedC = {
            ...c,
            room: matchingUnit.zone,
            roomL: calculatedL,
            roomW: calculatedW,
            ceilingH: matchingUnit.height !== undefined ? matchingUnit.height : 3.0,
            watts: matchingUnit.watts !== undefined ? matchingUnit.watts : 1500,
            qty: matchingUnit.quantity !== undefined ? matchingUnit.quantity : 1,
            phase: matchingUnit.phase || 'Single Phase',
            cb: matchingUnit.cbSizing !== undefined ? matchingUnit.cbSizing : 20,
            wire: matchingUnit.wire || '4',
            cableLength: matchingUnit.cableLength !== undefined ? matchingUnit.cableLength : 15,
            cableCores: matchingUnit.cores || '3 Cores',
            switchType: matchingUnit.switchType || '32-100A Isolator',
            switchQty: matchingUnit.switchQty !== undefined ? matchingUnit.switchQty : 1,
            notes: matchingUnit.notes || '',
            acType: mappedAcType,
            acHp: matchingUnit.acHp,
          };

          if (JSON.stringify(c) !== JSON.stringify(updatedC)) {
            boardsChanged = true;
            return updatedC;
          }
        }
        return c;
      });

      if (JSON.stringify(board.circuits) !== JSON.stringify(updatedCircuits)) {
        boardsChanged = true;
        return { ...board, circuits: updatedCircuits };
      }
      return board;
    });

    const firstBoard = newBoards[0];
    if (firstBoard) {
      let firstBoardCircuits = [...firstBoard.circuits];
      let firstBoardChanged = false;

      newUnitsCopy.forEach(unit => {
        const isAlreadySynced = newBoards.some(b => b.circuits.some(c => c.id === unit.linkedCircuitId));
        if (!isAlreadySynced) {
          const newId = 'LNK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
          unit.linkedCircuitId = newId;
          unitsChanged = true;

          let nextId = 'C01';
          if (firstBoardCircuits.length > 0) {
            const lastCircuitId = firstBoardCircuits[firstBoardCircuits.length - 1].circuitId;
            const match = lastCircuitId.match(/^(.*?)(\d+)$/);
            if (match) {
              const prefix = match[1];
              const numStr = match[2];
              const num = parseInt(numStr, 10);
              const nextNumStr = String(num + 1).padStart(numStr.length, '0');
              nextId = prefix + nextNumStr;
            } else {
              nextId = 'C' + String(firstBoardCircuits.length + 1).padStart(2, '0');
            }
          }

          const calculatedL = unit.length !== undefined && unit.length > 0 ? unit.length : (unit.area ? Math.round(Math.sqrt(unit.area) * 10) / 10 : 0);
          const calculatedW = unit.width !== undefined && unit.width > 0 ? unit.width : (unit.area ? Math.round((unit.area / calculatedL) * 10) / 10 : 0);
          const mappedAcType = systemMapping[unit.system || ''] || 'Split';

          const newCircuit: Circuit = {
            id: newId,
            circuitId: nextId,
            room: unit.zone,
            loadType: 'Air Conditioner',
            roomL: calculatedL,
            roomW: calculatedW,
            ceilingH: unit.height !== undefined ? unit.height : 3.0,
            watts: unit.watts !== undefined ? unit.watts : 1500,
            qty: unit.quantity !== undefined ? unit.quantity : 1,
            phase: unit.phase || 'Single Phase',
            cb: unit.cbSizing !== undefined ? unit.cbSizing : 20,
            wire: unit.wire || '4',
            cableLength: unit.cableLength !== undefined ? unit.cableLength : 15,
            cableCores: unit.cores || '3 Cores',
            switchType: unit.switchType || '32-100A Isolator',
            switchQty: unit.switchQty !== undefined ? unit.switchQty : 1,
            notes: unit.notes || '',
            acType: mappedAcType,
            acFixtureStyle: 'Inverter',
            acMountType: 'Ceiling',
            acControl: 'Non Smart',
            acHp: unit.acHp,
          };

          firstBoardCircuits.push(newCircuit);
          firstBoardChanged = true;
          boardsChanged = true;
        }
      });

      if (firstBoardChanged) {
        newBoards[0] = { ...firstBoard, circuits: firstBoardCircuits };
      }
    }

    if (boardsChanged) {
      setTimeout(() => {
        updateBoardsAction(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newBoards)) return prev;
          return newBoards;
        });
      }, 0);
    }

    if (unitsChanged && setUnits) {
      setTimeout(() => {
        setUnits(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newUnitsCopy)) return prev;
          return newUnitsCopy;
        });
      }, 0);
    }
  };

  useEffect(() => {
    if (boards && setBoards && units.length > 0) {
      syncHvacToElectrical(units, boards, setBoards);
    }
  }, [units]);

  // Save custom zone from the overlay modal
  const handleSaveNewZone = (e: React.FormEvent) => {
    e.preventDefault();
    const finalZoneName = roomSelectValue === 'custom' ? customRoomName.trim() : roomSelectValue;
    const zoneName = finalZoneName || newZoneForm.zone || `Zone ${units.length + 1}`;

    const existingRoomUnit = units.find(
      u => u.zone && u.zone.trim().toLowerCase() === zoneName.trim().toLowerCase()
    );

    let area = Number(newZoneForm.area) || 20;
    let height = Number(newZoneForm.height) || 3.0;
    let length = newZoneForm.length !== undefined ? Number(newZoneForm.length) : undefined;
    let width = newZoneForm.width !== undefined ? Number(newZoneForm.width) : undefined;
    let factors = newZoneForm.factors || [];

    if (existingRoomUnit) {
      area = existingRoomUnit.area || area;
      height = existingRoomUnit.height || height;
      length = existingRoomUnit.length ?? length;
      width = existingRoomUnit.width ?? width;
      factors = existingRoomUnit.factors ? [...existingRoomUnit.factors] : factors;
    }

    const hpValue = Number(newZoneForm.acHp) || calculateAcHp(area, height, factors);

    const newUnit: HvacUnit = {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      zone: zoneName,
      system: newZoneForm.system || 'Split AC',
      length,
      width,
      area,
      height,
      coolingLoad: Number(newZoneForm.coolingLoad) || Math.round((calculateUnitBtu(area, height, factors) / 3412) * 100) / 100,
      refrigerant: newZoneForm.refrigerant || 'R-410A',
      cfm: Number(newZoneForm.cfm) || 400,
      notes: newZoneForm.notes || '',
      switchType: newZoneForm.switchType || '32-100A Isolator',
      switchQty: Number(newZoneForm.switchQty) || 1,
      watts: Number(newZoneForm.watts) || Math.round(hpValue * 750),
      totalWatts: (Number(newZoneForm.watts) || Math.round(hpValue * 750)) * (Number(newZoneForm.quantity) || 1),
      quantity: Number(newZoneForm.quantity) || 1,
      phase: newZoneForm.phase || 'Single Phase',
      cbSizing: Number(newZoneForm.cbSizing) || 20,
      wire: newZoneForm.wire || '4',
      cableLength: Number(newZoneForm.cableLength) || 15,
      cores: newZoneForm.cores || '3 Cores',
      totalCable: (Number(newZoneForm.cableLength) || 15) * (Number(newZoneForm.quantity) || 1),
      cableColors: newZoneForm.cableColors || 'Standard 3-Core (Red/Black/Green)',
      factors,
      acHp: hpValue,
      linkedCircuitId: modalCircuitSelection !== 'NEW_AUTO' ? modalCircuitSelection : undefined,
    };

    setUnits(prev => {
      let updated = [...prev, newUnit];
      if (zoneName) {
        updated = balanceHvacCoolingLoads(updated, zoneName, newUnit.id, false, settings);
      }
      if (boards && setBoards) {
        setTimeout(() => syncHvacToElectrical(updated, boards, setBoards), 50);
      }
      return updated;
    });

    setAddZoneModalOpen(false);
  };

  // Inline column updater
  const updateField = (id: string, key: keyof HvacUnit | 'btu' | 'tonnage', value: any) => {
    setUnits(prev => {
      const oldUnit = prev.find(u => u.id === id);
      const oldZoneName = oldUnit?.zone || '';

      let updated = prev.map(unit => {
        if (unit.id === id) {
          let updatedUnit = { ...unit, [key as any]: value };

          // Handle special auto-fill if zone room name matches an existing room or registered room size
          if (key === 'zone' && value) {
            const existingRoomUnit = prev.find(
              u => u.id !== id && u.zone && u.zone.trim().toLowerCase() === String(value).trim().toLowerCase()
            );
            if (existingRoomUnit) {
              updatedUnit.length = existingRoomUnit.length;
              updatedUnit.width = existingRoomUnit.width;
              updatedUnit.area = existingRoomUnit.area;
              updatedUnit.height = existingRoomUnit.height;
              updatedUnit.factors = existingRoomUnit.factors ? [...existingRoomUnit.factors] : [];
            } else {
              const registered = registeredRoomSizes[String(value).trim().toLowerCase()];
              if (registered) {
                updatedUnit.length = registered.l;
                updatedUnit.width = registered.w;
                updatedUnit.area = Math.round(registered.l * registered.w * 100) / 100;
                if (registered.h) updatedUnit.height = registered.h;
              }
            }
          }

          // Use adjustHvacUnit for all mathematical propagation
          updatedUnit = adjustHvacUnit(updatedUnit, key, value, settings);
          return updatedUnit;
        }
        return unit;
      });

      // Apply proportional balancing
      const updatedUnit = updated.find(u => u.id === id);
      const targetZone = updatedUnit?.zone || value || '';

      if (
        key === 'area' || key === 'height' || key === 'length' || key === 'width' || 
        key === 'acHp' || key === 'quantity' || key === 'coolingLoad' || (key as string) === 'btu' || (key as string) === 'tonnage' || key === 'watts' || key === 'totalWatts'
      ) {
        if (targetZone) {
          updated = balanceHvacCoolingLoads(updated, targetZone, id, key === 'coolingLoad', settings);
        }
      } else if (key === 'zone') {
        if (oldZoneName) {
          updated = balanceHvacCoolingLoads(updated, oldZoneName, undefined, false, settings);
        }
        if (targetZone) {
          updated = balanceHvacCoolingLoads(updated, targetZone, undefined, false, settings);
        }
      }

      if (boards && setBoards) {
        setTimeout(() => syncHvacToElectrical(updated, boards, setBoards), 50);
      }
      return updated;
    });
  };

  const removeUnit = (id: string) => {
    if (confirm('Are you sure you want to remove this zone schedule?')) {
      const unitToRemove = units.find(u => u.id === id);
      const zoneToBalance = unitToRemove?.zone || '';

      setUnits(prev => {
        let updated = prev.filter(unit => unit.id !== id);
        if (zoneToBalance) {
          updated = balanceHvacCoolingLoads(updated, zoneToBalance);
        }
        if (unitToRemove && unitToRemove.linkedCircuitId && boards && setBoards) {
          const newBoards = boards.map(b => ({
            ...b,
            circuits: b.circuits.filter(c => c.id !== unitToRemove.linkedCircuitId)
          }));
          setBoards(newBoards);
        }
        return updated;
      });
    }
  };

  const duplicateUnit = (id: string) => {
    const targetIdx = units.findIndex(u => u.id === id);
    if (targetIdx === -1) return;
    const target = units[targetIdx];
    const copy: HvacUnit = {
      ...target,
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      linkedCircuitId: undefined,
    };
    setUnits(prev => {
      let updated = [...prev];
      updated.splice(targetIdx + 1, 0, copy);
      if (target.zone) {
        updated = balanceHvacCoolingLoads(updated, target.zone, copy.id, false, settings);
      }
      if (boards && setBoards) {
        setTimeout(() => syncHvacToElectrical(updated, boards, setBoards), 50);
      }
      return updated;
    });
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === units.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...units];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setUnits(updated);
    if (boards && setBoards) {
      setTimeout(() => syncHvacToElectrical(updated, boards, setBoards), 50);
    }
  };

  // --- Dropdown Management Functions ---
  const handleAddOption = () => {
    const option = newOption.trim();
    if (!option) return;
    setDropdowns(prev => {
      const list = prev[selectedKey] || [];
      if (list.includes(option)) {
        alert('Option already exists!');
        return prev;
      }
      return {
        ...prev,
        [selectedKey]: [...list, option]
      };
    });
    setNewOption('');
  };

  const handleSaveOptionEdit = (idx: number) => {
    const val = editingValue.trim();
    if (!val) return;
    setDropdowns(prev => {
      const list = [...(prev[selectedKey] || [])];
      list[idx] = val;
      return {
        ...prev,
        [selectedKey]: list
      };
    });
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleDeleteOption = (idx: number) => {
    setDropdowns(prev => {
      const list = prev[selectedKey] || [];
      return {
        ...prev,
        [selectedKey]: list.filter((_, i) => i !== idx)
      };
    });
  };

  const handleCreateCustomCategory = () => {
    const name = newListName.trim();
    if (!name) return;
    if (dropdowns[name]) {
      alert('This list name already exists.');
      return;
    }
    setDropdowns(prev => ({
      ...prev,
      [name]: []
    }));
    // Save metadata defaults
    const meta = getMepDropdownMetadata();
    meta[name] = { tabId: newCustomListTab, role: newCustomListRole as any };
    saveMepDropdownMetadata(meta);
    window.dispatchEvent(new Event('storage'));

    setSelectedKey(name);
    setNewListName('');
    
    const targetTabName = MEP_TABS.find(t => t.id === newCustomListTab)?.name || newCustomListTab;
    const targetRoleName = MEP_ROLES.find(r => r.id === newCustomListRole)?.name || newCustomListRole;
    alert(`Created custom list "${name}". It has been set to display as a "${targetRoleName}" on the "${targetTabName}" tab!`);
  };

  const handleHarvestFromTable = (field: 'zone' | 'notes') => {
    const harvested = new Set<string>();
    units.forEach(u => {
      const v = (u[field] || '').toString().trim();
      if (v && v !== '—') {
        harvested.add(v);
      }
    });

    if (harvested.size === 0) {
      alert('No unique string values found in that column to harvest.');
      return;
    }

    const collected = Array.from(harvested);
    setDropdowns(prev => {
      const list = prev[selectedKey] || [];
      const filtered = collected.filter(item => !list.includes(item));
      if (filtered.length === 0) {
        alert('All found unique values are already present in this dropdown.');
        return prev;
      }
      alert(`Harvested and added ${filtered.length} unique values: ${filtered.join(', ')}`);
      return {
        ...prev,
        [selectedKey]: [...list, ...filtered]
      };
    });
  };

  // --- KPIs and Derived Values ---
  const totalCoolingLoad = units.reduce((sum, h) => sum + (h.coolingLoad || 0), 0);
  const totalCfm = units.reduce((sum, h) => sum + (h.cfm || 0), 0);
  const totalHVACWatts = units.reduce((sum, h) => sum + ((h.watts || 1500) * (h.quantity || 1)), 0);
  const totalHVACCable = units.reduce((sum, h) => sum + ((h.cableLength || 15) * (h.quantity || 1)), 0);

  const handleExportCSV = () => {
    let csv = `HVAC SIZING & ELECTRICAL SCHEDULE REPORT\n\n`;
    csv += `Zone/Area,System Type,Area (m²),Height (m),Volume (m³),AC hp,Cooling (kW),Tonnage (TR),BTU Rate,CFM,ACH,Refrigerant,Switch Type,Switch Qty,Watts/Unit,Qty,Total Watts,Phase,CB Sizing,Wire (mm²),Cable L (m),Cores,Total Cable (m),Core Palette,Notes\n`;

    units.forEach(u => {
      const vol = +(u.area * u.height).toFixed(1);
      const btu = +((u.coolingLoad || 0) * 3412).toFixed(0);
      const tr = +((u.coolingLoad || 0) / 3.517).toFixed(2);
      const ach = u.cfm ? ((u.cfm * 60) / (vol * 35.3147)).toFixed(1) : '—';
      const totWatts = (u.watts || 1500) * (u.quantity || 1);
      const totCable = (u.cableLength || 15) * (u.quantity || 1);
      const hpVal = u.acHp !== undefined ? u.acHp : calculateAcHp(u.area || 0, u.height || 0);

      csv += `"${u.zone}","${u.system}",${u.area},${u.height},${vol},${hpVal},${u.coolingLoad},${tr},${btu},${u.cfm},${ach},"${u.refrigerant}","${u.switchType || 'None'}",${u.switchQty || 1},${u.watts || 1500},${u.quantity || 1},${totWatts},"${u.phase || 'Single Phase'}",${u.cbSizing || 20},"${u.wire || '4'}",${u.cableLength || 15},"${u.cores || '3 Cores'}",${totCable},"${u.cableColors || 'Standard'}","${(u.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEP_HVAC_Schedule.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Title block */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-base font-bold text-[#90cdf4] flex items-center gap-2">
            <span>❄️</span> HVAC System Design & Sizing
          </div>
          <div className="text-xs text-[#718096]">Cooling load estimations, electrical integration, and refrigeration layout</div>
        </div>

      </div>

      {/* Dropdown settings drawer */}
      {showSettings && (
        <div className="bg-[#111522] border border-[#2b6cb0]/40 rounded-xl p-4 shadow-2xl space-y-4">
          <div className="text-xs font-bold text-[#90cdf4] flex items-center gap-2 uppercase tracking-wider">
            <span>⚙️</span> Dropdown Lists Configuration Manager
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Customize options for any HVAC-specific or shared MEP dropdown parameter. Create brand-new lists or harvest values from active cells in the table below to populate options.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left selector */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Select Dropdown Category (Edit Existing Lists)</label>
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded p-2 text-xs text-white focus:border-blue-500 outline-none"
                >
                  {getCategoriesForTab('hvac', dropdowns).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Sizing Router configuration */}
              <DropdownCategoryConfigPanel selectedKey={selectedKey} dropdowns={dropdowns} />

              <div className="bg-[#161a2b] p-3 rounded border border-[#2d3748]/50 space-y-2">
                <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider">Harvest From Table Columns</span>
                <span className="block text-[9px] text-gray-500">Extract unique, non-empty text strings from the current HVAC table.</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleHarvestFromTable('zone')}
                    className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer transition-colors"
                  >
                    Zones/Rooms
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHarvestFromTable('notes')}
                    className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer transition-colors"
                  >
                    Notes Column
                  </button>
                </div>
              </div>

              <div className="bg-[#161a2b] p-3 rounded border border-[#2d3748]/50 space-y-2">
                <span className="block text-[10px] text-teal-400 font-bold uppercase tracking-wider">Create New List Category</span>
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="e.g. Inverter Models"
                    className="bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none w-full"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] text-gray-400 mb-0.5 uppercase font-semibold">Target Tab Location</label>
                      <select
                        value={newCustomListTab}
                        onChange={e => setNewCustomListTab(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1 text-[10px] text-sky-400 font-bold outline-none cursor-pointer"
                      >
                        {MEP_TABS.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] text-gray-400 mb-0.5 uppercase font-semibold">Function & Display Role</label>
                      <select
                        value={newCustomListRole}
                        onChange={e => setNewCustomListRole(e.target.value)}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1 text-[10px] text-teal-400 font-bold outline-none cursor-pointer"
                      >
                        {MEP_ROLES.map(r => (
                          <option key={r.id} value={r.id} title={r.description}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateCustomCategory}
                    className="bg-teal-950/40 hover:bg-teal-900/50 border border-teal-700/50 text-teal-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer transition-colors"
                  >
                    + Create Category
                  </button>
                </div>
              </div>
            </div>

            {/* Right option management */}
            <div className="md:col-span-2 flex flex-col space-y-2">
              <div className="flex justify-between items-center border-b border-[#2d3748] pb-1.5">
                <span className="text-[10px] text-[#cbd5e0] font-bold uppercase tracking-wider">
                  List Contents: {selectedKey}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the whole category "${selectedKey}"?`)) {
                      setDropdowns(prev => {
                        const copy = { ...prev };
                        delete copy[selectedKey];
                        const remaining = Object.keys(copy);
                        setSelectedKey(remaining[0] || 'HVAC System Types');
                        return copy;
                      });
                    }
                  }}
                  className="text-red-400 hover:text-red-300 text-[9px] font-bold hover:underline"
                >
                  🗑️ Delete Category
                </button>
              </div>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  placeholder="Add new option value..."
                  className="flex-1 bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1 text-xs text-white outline-none focus:border-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer"
                >
                  Add Option
                </button>
              </div>

              <div className="bg-[#0c0f1a] border border-[#2d3748] rounded-md p-2 divide-y divide-[#2d3748]/30 max-h-[180px] overflow-y-auto flex-1 custom-scrollbar text-xs">
                {(dropdowns[selectedKey] || []).length === 0 ? (
                  <div className="text-center text-gray-500 py-6 italic font-medium">
                    No options in this list. Add options or harvest them above.
                  </div>
                ) : (
                  (dropdowns[selectedKey] || []).map((opt, idx) => (
                    <div key={idx} className="py-1.5 px-2 flex items-center justify-between gap-3 group hover:bg-[#1a2035]/30 rounded">
                      {editingIndex === idx ? (
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            className="bg-[#0f1117] border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveOptionEdit(idx)}
                            className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="bg-gray-600 text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-white font-medium font-mono">{opt}</span>
                          <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-all">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(idx);
                                setEditingValue(opt);
                              }}
                              className="text-gray-400 hover:text-white text-[10px] hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(idx)}
                              className="text-red-400 hover:text-red-300 text-[10px] hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row Section Header with View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
          <span>📊</span> Summary & Load Metrics
        </h3>
        <div className="flex self-start sm:self-auto bg-[#111625] p-0.5 rounded-lg border border-[#2d3748] text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setMetricsViewMode('cards')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              metricsViewMode === 'cards'
                ? 'bg-sky-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Grid Cards
          </button>
          <button
            type="button"
            onClick={() => setMetricsViewMode('table')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              metricsViewMode === 'table'
                ? 'bg-sky-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tabulated Summary
          </button>
        </div>
      </div>

      {metricsViewMode === 'table' ? (
        <div className="rounded-xl border border-[#2d3748] bg-[#1a1f2e] overflow-hidden shadow-xl mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[600px]">
              <thead>
                <tr className="bg-[#111625] border-b border-[#2d3748] text-[#718096] uppercase text-[10px] tracking-wider font-bold">
                  <th className="p-3.5 pl-4">Metric Parameter</th>
                  <th className="p-3.5 text-right sm:text-left">Current Calculated Value</th>
                  <th className="p-3.5 pl-6 hidden sm:table-cell">Standard Reference Unit</th>
                  <th className="p-3.5 hidden md:table-cell">Engineering Description / Calculation Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3748]/60 font-medium">
                <tr className="hover:bg-[#1f2638] transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-gray-200 flex items-center gap-2">
                    <span className="text-blue-400">🌡️</span> Total Cooling Load
                  </td>
                  <td className="p-3.5 font-mono font-black text-blue-300 text-sm text-right sm:text-left">
                    {totalCoolingLoad.toFixed(1)} kW
                  </td>
                  <td className="p-3.5 pl-6 text-gray-400 font-mono hidden sm:table-cell">kW (Kilowatts)</td>
                  <td className="p-3.5 text-gray-400 text-[11px] hidden md:table-cell">
                    Sum of individual zone thermal cooling requirements computed from dimensions.
                  </td>
                </tr>
                <tr className="hover:bg-[#1f2638] transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-gray-200 flex items-center gap-2">
                    <span className="text-[#63b3ed]">▤</span> Total Sizing (TR)
                  </td>
                  <td className="p-3.5 font-mono font-black text-[#63b3ed] text-sm text-right sm:text-left">
                    {(totalCoolingLoad / 3.517).toFixed(2)} TR
                  </td>
                  <td className="p-3.5 pl-6 text-gray-400 font-mono hidden sm:table-cell">TR (Tons of Refrigeration)</td>
                  <td className="p-3.5 text-gray-400 text-[11px] hidden md:table-cell">
                    Cooling capacity expressed in standard trade unit (1 TR ≈ 3.517 kW of thermal cooling).
                  </td>
                </tr>
                <tr className="hover:bg-[#1f2638] transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-gray-200 flex items-center gap-2">
                    <span className="text-blue-400">💨</span> Total Cooling (BTU/hr)
                  </td>
                  <td className="p-3.5 font-mono font-black text-blue-400 text-sm text-right sm:text-left">
                    {Math.round(totalCoolingLoad * 3412).toLocaleString()} BTU/hr
                  </td>
                  <td className="p-3.5 pl-6 text-gray-400 font-mono hidden sm:table-cell">BTU/hr (British Thermal Units)</td>
                  <td className="p-3.5 text-gray-400 text-[11px] hidden md:table-cell">
                    Thermal energy rating per hour (1 kW ≈ 3,412 BTU/hr).
                  </td>
                </tr>
                <tr className="hover:bg-[#1f2638] transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-gray-200 flex items-center gap-2">
                    <span className="text-cyan-300">💨</span> Air Flow Rate
                  </td>
                  <td className="p-3.5 font-mono font-black text-cyan-300 text-sm text-right sm:text-left">
                    {totalCfm.toLocaleString()} CFM
                  </td>
                  <td className="p-3.5 pl-6 text-gray-400 font-mono hidden sm:table-cell">CFM (Cubic Feet per Minute)</td>
                  <td className="p-3.5 text-gray-400 text-[11px] hidden md:table-cell">
                    Combined volumetric flow rate computed from HVAC horsepower rating.
                  </td>
                </tr>
                <tr className="hover:bg-[#1f2638] transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-gray-200 flex items-center gap-2">
                    <span className="text-yellow-400">⚡</span> Total Connected Load
                  </td>
                  <td className="p-3.5 font-mono font-black text-[#9ca2ff] text-sm text-right sm:text-left">
                    {(totalHVACWatts / 1000).toFixed(2)} kW
                  </td>
                  <td className="p-3.5 pl-6 text-gray-400 font-mono hidden sm:table-cell">kW (Electrical Kilowatts)</td>
                  <td className="p-3.5 text-gray-400 text-[11px] hidden md:table-cell">
                    Sum of active electrical power drawn by all installed units (based on 750W/hp).
                  </td>
                </tr>
                <tr className="hover:bg-[#1f2638] transition-colors">
                  <td className="p-3.5 pl-4 font-bold text-gray-200 flex items-center gap-2">
                    <span className="text-green-300">🔌</span> Total Synced Cable
                  </td>
                  <td className="p-3.5 font-mono font-black text-green-300 text-sm text-right sm:text-left">
                    {totalHVACCable.toLocaleString()} m
                  </td>
                  <td className="p-3.5 pl-6 text-gray-400 font-mono hidden sm:table-cell">m (Meters)</td>
                  <td className="p-3.5 text-gray-400 text-[11px] hidden md:table-cell">
                    Aggregated length of power cabling required to connect all AC units.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Total Cooling Load', val: `${totalCoolingLoad.toFixed(1)} kW`, col: 'text-blue-300', icon: <Thermometer size={14} className="text-blue-400" /> },
            { label: 'Total Sizing (TR)', val: `${(totalCoolingLoad / 3.517).toFixed(2)} TR`, col: 'text-[#63b3ed]', icon: <Layers size={14} className="text-[#63b3ed]" /> },
            { label: 'Total Cooling (BTU/hr)', val: `${Math.round(totalCoolingLoad * 3412).toLocaleString()} BTU/hr`, col: 'text-blue-400', icon: <Wind size={14} className="text-blue-400" /> },
            { label: 'Air Flow Rate', val: `${totalCfm.toLocaleString()} CFM`, col: 'text-cyan-300', icon: <Wind size={14} className="text-cyan-300" /> },
            { label: 'Total Connected Load', val: `${(totalHVACWatts / 1000).toFixed(2)} kW`, col: 'text-[#9ca2ff]', icon: <Zap size={14} className="text-yellow-400" /> },
            { label: 'Total Synced Cable', val: `${totalHVACCable.toLocaleString()} m`, col: 'text-green-300', icon: <Cable size={14} className="text-green-300" /> },
          ].map(card => (
            <div
              key={card.label}
              className="rounded-lg p-3 border bg-[#1a1f2e] border-[#2d3748] flex flex-col justify-between hover:border-[#4a5568] transition-all relative group shadow-lg"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="text-[9px] text-[#718096] font-bold uppercase tracking-wider">
                  {card.label}
                </div>
                <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                  {card.icon}
                </div>
              </div>
              <div className={`text-sm font-black font-mono ${card.col}`}>{card.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* AC Equipment Sizing and Quantity Summary panel */}
      <div className="bg-[#111625]/80 border border-[#2d3748]/60 rounded-xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💨</span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">AC Equipment Summary</h3>
              <p className="text-[10px] text-gray-400">Aggregated breakdown of all systems counted by horsepower and system type.</p>
            </div>
          </div>
          <div className="text-[10px] bg-sky-950/40 border border-sky-800/40 text-sky-300 font-mono font-bold px-2.5 py-1 rounded">
            Total AC Count: {units.reduce((sum, u) => sum + (u.quantity || 1), 0)} Units
          </div>
        </div>

        {acSummary.length === 0 ? (
          <div className="text-center text-[#718096] italic text-xs py-2">
            No AC equipment registered in schedule yet. Add a zone below.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {acSummary.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-[#181d2c] border border-[#2d3748]/40 hover:border-sky-500/40 transition-colors p-2.5 rounded-lg flex flex-col justify-between"
              >
                <div>
                  <div className="text-[10px] text-gray-400 font-bold truncate" title={item.type}>
                    {item.type}
                  </div>
                  <div className="text-xs font-black text-white font-mono mt-0.5">
                    {item.hp.toFixed(1)} HP
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#2d3748]/20">
                  <span className="text-[9px] font-bold text-sky-300 uppercase font-mono">Qty: {item.count}</span>
                  <span className="text-[9px] font-bold text-yellow-300 font-mono">{(item.totalWatts / 1000).toFixed(2)} kW</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden Import File Input */}
      <input
        type="file"
        ref={importFileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.csv,.txt,.json"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handleImportFile(e.target.files[0], 'append');
            e.target.value = ''; // Reset
          }
        }}
      />

      {/* Responsive schedule table */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden shadow-xl">
        {/* Dynamic Column Customization Bar */}
        <div className="bg-[#13192a] border-b border-[#2d3748] px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-sky-400 font-bold">📋 Column View:</span>
            <span className="text-gray-300">
              {hiddenColumns.length === 0 
                ? 'Showing all columns.' 
                : `${ALL_COLUMNS.length - hiddenColumns.length} of ${ALL_COLUMNS.length} columns active (${hiddenColumns.length} hidden).`}
            </span>
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="text-sky-300 hover:text-sky-200 hover:underline font-bold transition-all ml-1 cursor-pointer bg-transparent border-none outline-none"
            >
              {showColumnManager ? 'Hide Column Options ▴' : 'Customize Columns ▾'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={hiddenColumns.length === 0 ? hideUnnecessaryCols : showAllCols}
              className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                hiddenColumns.length === 0
                  ? 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border-blue-800/60'
                  : 'bg-[#1e2538] hover:bg-[#2d3748] text-gray-300 border-transparent'
              }`}
            >
              {hiddenColumns.length === 0 ? '👁 Hide Non-Essential' : '👁 Show All Columns'}
            </button>
          </div>
        </div>

        {showColumnManager && (
          <div className="bg-[#0f1322] border-b border-[#2d3748] p-4 space-y-3">
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
              Toggle column visibility to suit your design workspace:
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map(col => {
                const visible = isColVisible(col.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => toggleCol(col.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                      visible
                        ? 'bg-[#1b2540] border-[#3182ce]/50 text-sky-300 hover:bg-[#233154]'
                        : 'bg-[#131722]/50 border-[#2d3748] text-gray-500 hover:bg-[#1a1f2e] hover:text-gray-400 line-through decoration-red-500/40'
                    }`}
                  >
                    <span className={visible ? 'text-green-400' : 'text-red-400 font-bold'}>
                      {visible ? '✓' : '✗'}
                    </span>
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Group Bar */}
        <div className="sticky top-0 z-40 bg-[#13192a] p-3 border-b border-[#2d3748]/70 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-sky-400" />
              <span>HVAC Sizing Zone Filter</span>
            </span>
            <div className="flex items-center gap-1.5 bg-[#0f1117] border border-[#2d3748] px-2.5 py-1 rounded text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Group By:</span>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="bg-transparent text-sky-400 font-bold outline-none cursor-pointer"
              >
                <option value="none">None</option>
                <option value="room">Location / Room</option>
                <option value="system">System Type</option>
                <option value="refrigerant">Refrigerant</option>
              </select>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter zones by name, type, refrigerant..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0f1117] border border-[#2d3748] rounded-md text-xs text-white placeholder-gray-600 outline-none focus:border-sky-500/80 transition-colors font-medium"
            />
          </div>
        </div>

        <div
          ref={tableContainerRef}
          onScroll={handleTableScroll}
          className="sticky top-[48px] lg:top-[50px] z-30 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] relative custom-scrollbar border border-[#2d3748]/60 rounded-lg"
        >
          <table className="w-full border-collapse text-xs text-left" style={{ minWidth: getTableMinWidth() }}>
            <thead className="sticky top-0 bg-[#13192a] z-30 shadow">
              <tr className="bg-[#13192a] text-[#718096] uppercase text-[10px] tracking-wider border-b border-[#2d3748] font-bold">
                <th className="sticky top-0 left-0 z-40 bg-[#13192a] p-3 w-14 border-r border-[#2d3748]/60 text-center text-[#718096]">Drag</th>
                <th className="sticky top-0 left-14 z-40 bg-[#13192a] p-3 w-48 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">Location / Room</th>
                {isColVisible('system') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-44">System Type</th>}
                {isColVisible('length') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center text-gray-400">Length (m)</th>}
                {isColVisible('width') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center text-gray-400">Width (m)</th>}
                {isColVisible('area') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Area (m²)</th>}
                {isColVisible('height') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Height (m)</th>}
                {isColVisible('volume') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center text-gray-500">Volume (m³)</th>}
                {isColVisible('factors') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-56 text-center text-teal-400">BTU Factors Checklist</th>}
                {isColVisible('acHp') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center text-orange-400 font-bold">AC hp</th>}
                {isColVisible('cooling') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Cooling (kW)</th>}
                {isColVisible('tonnage') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center text-[#63b3ed]">Tonnage (TR)</th>}
                {isColVisible('btu') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32 text-center text-orange-400">BTU/hr</th>}
                {isColVisible('cfm') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">CFM</th>}
                {isColVisible('ach') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center text-green-400">ACH</th>}
                {isColVisible('refrigerant') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-36">Refrigerant</th>}
                {isColVisible('switchType') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-48 text-purple-300">Switch Type</th>}
                {isColVisible('switchQty') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Switch Qty</th>}
                {isColVisible('watts') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Watts/Unit</th>}
                {isColVisible('quantity') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Quantity</th>}
                {isColVisible('totalWatts') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32 text-center text-yellow-300 font-bold">Total Watts</th>}
                {isColVisible('phase') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-36">Phase</th>}
                {isColVisible('cbSizing') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28">CB Sizing</th>}
                {isColVisible('wire') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28">Wire mm²</th>}
                {isColVisible('linkedCircuit') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-40 text-cyan-400 font-bold">DB & Circuit ID</th>}
                {isColVisible('cableLength') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center font-bold">Cable L (m)</th>}
                {isColVisible('cores') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28">Cores</th>}
                {isColVisible('totalCable') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32 text-center text-blue-300 font-bold">Total Cable</th>}
                {isColVisible('palette') && <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-60">Core Palette</th>}
                <RenderCustomHeaders tabId="hvac" />
                {isColVisible('notes') && <th className="sticky top-0 z-30 bg-[#13192a] p-3">Notes</th>}
                <th className="sticky top-0 right-0 z-40 bg-[#13192a] p-3 w-20 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748]/40">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={3 + ALL_COLUMNS.filter(c => isColVisible(c.id)).length + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No HVAC zones configured yet. Click "+ Add Zone" above to size and provision air conditioning.
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={3 + ALL_COLUMNS.filter(c => isColVisible(c.id)).length + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No HVAC zones match your search query.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const originalIdx = units.findIndex(u => u.id === unit.id);
                  const vol = +(unit.area * unit.height).toFixed(1);
                  const btu = +((unit.coolingLoad || 0) * 3412).toFixed(0);
                  const tr = +((unit.coolingLoad || 0) / 3.517).toFixed(2);
                  const ach = unit.cfm ? ((unit.cfm * 60) / (vol * 35.3147)).toFixed(1) : '—';
                  const totalWatts = (unit.watts || 1500) * (unit.quantity || 1);
                  const totalCable = (unit.cableLength || 15) * (unit.quantity || 1);

                  const isBeingDragged = draggedIndex === originalIdx;

                  return (
                    <tr
                      key={unit.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedIndex(originalIdx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== originalIdx) {
                          const updated = [...units];
                          const [moved] = updated.splice(draggedIndex, 1);
                          updated.splice(originalIdx, 0, moved);
                          setUnits(updated);
                          if (boards && setBoards) {
                            setTimeout(() => syncHvacToElectrical(updated, boards, setBoards), 50);
                          }
                        }
                        setDraggedIndex(null);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                      className={`hover:bg-[#1e2538]/50 transition-colors ${
                        isBeingDragged ? 'bg-sky-950 border-y-2 border-sky-500' : 'bg-[#161a26]'
                      }`}
                    >
                      {/* Sticky Drag Handle */}
                      <td className="sticky left-0 z-30 bg-[#151a26] p-2 w-14 min-w-[56px] max-w-[56px] text-center border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)] cursor-grab active:cursor-grabbing text-gray-500 hover:text-sky-400 select-none">
                        <span className="text-base font-bold">☰</span>
                      </td>

                      {/* Sticky Zone Name */}
                      <td className="sticky left-14 z-30 bg-[#151a26] p-2 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">
                        <div className="space-y-1">
                          <RoomSelector
                            value={unit.zone}
                            onChange={val => updateField(unit.id, 'zone', val)}
                            settings={settings}
                            placeholder="Zone/Room..."
                          />
                          {(() => {
                            const sameZoneUnits = units.filter(
                              u => u.zone && unit.zone && u.zone.trim().toLowerCase() === unit.zone.trim().toLowerCase()
                            );
                            if (sameZoneUnits.length > 1) {
                              const unitIdx = sameZoneUnits.findIndex(u => u.id === unit.id) + 1;
                              return (
                                <div className="flex items-center gap-1 text-[9px] text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-1.5 py-0.5 rounded font-mono">
                                  <span>AC {unitIdx} of {sameZoneUnits.length} in Room</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* System Type Select */}
                      {isColVisible('system') && (
                        <td className="p-2">
                          <select
                            value={unit.system}
                            onChange={e => updateField(unit.id, 'system', e.target.value)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                          >
                            {systemsList.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Length */}
                      {isColVisible('length') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={unit.length !== undefined ? unit.length : ''}
                            onChange={e => updateField(unit.id, 'length', parseFloat(e.target.value) || 0)}
                            placeholder="L"
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-gray-400 font-semibold w-18 outline-none font-mono"
                          />
                        </td>
                      )}

                      {/* Width */}
                      {isColVisible('width') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={unit.width !== undefined ? unit.width : ''}
                            onChange={e => updateField(unit.id, 'width', parseFloat(e.target.value) || 0)}
                            placeholder="W"
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-gray-400 font-semibold w-18 outline-none font-mono"
                          />
                        </td>
                      )}

                      {/* Area */}
                      {isColVisible('area') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={unit.area || ''}
                            onChange={e => updateField(unit.id, 'area', parseFloat(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-20 outline-none font-mono"
                          />
                        </td>
                      )}

                      {/* Height */}
                      {isColVisible('height') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={unit.height || ''}
                            onChange={e => updateField(unit.id, 'height', parseFloat(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-18 outline-none font-mono"
                          />
                        </td>
                      )}

                      {/* Volume (derived) */}
                      {isColVisible('volume') && (
                        <td className="p-2 text-center text-gray-500 font-mono">
                          {vol} m³
                        </td>
                      )}

                      {/* Load Factors Checklist */}
                      {isColVisible('factors') && (
                        <td className="p-2 text-center">
                          <BtuFactorsDropdownChecklist
                            selectedFactors={unit.factors || []}
                            onChange={nextFactors => updateField(unit.id, 'factors', nextFactors)}
                            className="w-full max-w-[210px] mx-auto"
                          />
                        </td>
                      )}

                      {/* AC hp */}
                      {isColVisible('acHp') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={unit.acHp !== undefined ? unit.acHp : ''}
                            onChange={e => updateField(unit.id, 'acHp', parseFloat(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-orange-400 font-bold font-mono w-20 outline-none"
                          />
                        </td>
                      )}

                      {/* Cooling Load */}
                      {isColVisible('cooling') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={unit.coolingLoad || ''}
                            onChange={e => updateField(unit.id, 'coolingLoad', parseFloat(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-20 outline-none font-bold font-mono text-cyan-400"
                          />
                          {units.filter(u => u.zone && unit.zone && u.zone.trim().toLowerCase() === unit.zone.trim().toLowerCase()).length > 1 && (
                            <div className="text-[9px] text-cyan-400/80 mt-0.5" title="Shared proportionally based on AC Hp">
                              Share: {(() => {
                                const same = units.filter(u => u.zone && unit.zone && u.zone.trim().toLowerCase() === unit.zone.trim().toLowerCase());
                                const totHp = same.reduce((sum, u) => {
                                  const hpVal = u.acHp !== undefined && u.acHp > 0 ? u.acHp : calculateAcHp(u.area || 0, u.height || 3.0);
                                  return sum + hpVal;
                                }, 0);
                                const uHp = unit.acHp !== undefined && unit.acHp > 0 ? unit.acHp : calculateAcHp(unit.area || 0, unit.height || 3.0);
                                return totHp > 0 ? Math.round((uHp / totHp) * 100) : Math.round(100 / same.length);
                              })()}%
                            </div>
                          )}
                        </td>
                      )}

                      {/* Tonnage */}
                      {isColVisible('tonnage') && (
                        <td className="p-2 text-center text-[#63b3ed]">
                          <input
                            type="number"
                            step="0.01"
                            value={tr || ''}
                            onChange={e => updateField(unit.id, 'tonnage', parseFloat(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-[#63b3ed] font-bold font-mono w-20 outline-none"
                          />
                        </td>
                      )}

                      {/* BTU Rate */}
                      {isColVisible('btu') && (
                        <td className="p-2 text-center text-orange-400">
                          <input
                            type="number"
                            step="100"
                            value={btu || ''}
                            onChange={e => updateField(unit.id, 'btu', parseFloat(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-orange-400 font-bold font-mono w-24 outline-none"
                          />
                          {units.filter(u => u.zone && unit.zone && u.zone.trim().toLowerCase() === unit.zone.trim().toLowerCase()).length > 1 && (
                            <div className="text-[9px] text-orange-400/80 mt-0.5 font-normal" title="Shared proportionally based on AC Hp">
                              Proportion
                            </div>
                          )}
                        </td>
                      )}

                      {/* CFM */}
                      {isColVisible('cfm') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={unit.cfm || ''}
                            onChange={e => updateField(unit.id, 'cfm', parseInt(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-20 outline-none font-mono"
                          />
                        </td>
                      )}

                      {/* ACH (derived) */}
                      {isColVisible('ach') && (
                        <td className="p-2 text-center text-green-400 font-mono font-semibold">
                          {ach}
                        </td>
                      )}

                      {/* Refrigerant */}
                      {isColVisible('refrigerant') && (
                        <td className="p-2">
                          <select
                            value={unit.refrigerant}
                            onChange={e => updateField(unit.id, 'refrigerant', e.target.value)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                          >
                            {refrigerantsList.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Switch Type */}
                      {isColVisible('switchType') && (
                        <td className="p-2">
                          <select
                            value={unit.switchType || '32-100A Isolator'}
                            onChange={e => updateField(unit.id, 'switchType', e.target.value)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-purple-300 w-full outline-none font-semibold"
                          >
                            {switchTypesList.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Switch Qty */}
                      {isColVisible('switchQty') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={unit.switchQty !== undefined ? unit.switchQty : 1}
                            onChange={e => updateField(unit.id, 'switchQty', Math.max(0, parseInt(e.target.value) || 0))}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-16 outline-none font-mono"
                          />
                        </td>
                      )}

                      {/* Watts per Unit */}
                      {isColVisible('watts') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={unit.watts !== undefined ? unit.watts : 1500}
                            onChange={e => updateField(unit.id, 'watts', Math.max(0, parseInt(e.target.value) || 0))}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-24 outline-none font-mono font-semibold"
                          />
                        </td>
                      )}

                      {/* Quantity */}
                      {isColVisible('quantity') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={unit.quantity !== undefined ? unit.quantity : 1}
                            onChange={e => updateField(unit.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-16 outline-none font-mono font-bold text-gray-300"
                          />
                        </td>
                      )}

                      {/* Total Watts */}
                      {isColVisible('totalWatts') && (
                        <td className="p-2 text-center bg-[#141a29]/40">
                          <input
                            type="number"
                            step="50"
                            value={unit.totalWatts !== undefined ? unit.totalWatts : totalWatts}
                            onChange={e => updateField(unit.id, 'totalWatts', parseFloat(e.target.value) || 0)}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-yellow-300 font-bold font-mono w-24 outline-none"
                          />
                        </td>
                      )}

                      {/* Phase */}
                      {isColVisible('phase') && (
                        <td className="p-2">
                          <select
                            value={unit.phase || 'Single Phase'}
                            onChange={e => updateField(unit.id, 'phase', e.target.value)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none font-semibold"
                          >
                            <option value="Single Phase">Single Phase</option>
                            <option value="Three Phase">Three Phase</option>
                          </select>
                        </td>
                      )}

                      {/* CB Sizing */}
                      {isColVisible('cbSizing') && (
                        <td className="p-2">
                          <select
                            value={unit.cbSizing || 20}
                            onChange={e => updateField(unit.id, 'cbSizing', parseInt(e.target.value) || 20)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-cyan-300 font-bold w-full outline-none"
                          >
                            {cbSizesList.map(sz => (
                              <option key={sz} value={sz}>{sz}A</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Wire size */}
                      {isColVisible('wire') && (
                        <td className="p-2">
                          <select
                            value={unit.wire || '4'}
                            onChange={e => updateField(unit.id, 'wire', e.target.value)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-emerald-300 font-semibold w-full outline-none"
                          >
                            {wireSizesList.map(sz => (
                              <option key={sz} value={sz}>{sz} mm²</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* DB & Circuit ID */}
                      {isColVisible('linkedCircuit') && (() => {
                        let matchedCircuit: any = null;
                        let matchedBoard: any = null;

                        if (boards) {
                          for (const b of boards) {
                            const c = b.circuits.find(circ => circ.id === unit.linkedCircuitId || (circ.room && unit.zone && circ.room.trim().toLowerCase() === unit.zone.trim().toLowerCase() && circ.loadType === 'Air Conditioner'));
                            if (c) {
                              matchedCircuit = c;
                              matchedBoard = b;
                              break;
                            }
                          }
                        }

                        const isPopoverOpen = activeCircuitPopoverUnitId === unit.id;

                        return (
                          <td className="p-2 relative">
                            <button
                              type="button"
                              onClick={() => setActiveCircuitPopoverUnitId(isPopoverOpen ? null : unit.id)}
                              className={`w-full text-left px-2 py-1 rounded text-xs font-mono font-bold flex items-center justify-between border cursor-pointer transition-all ${
                                matchedCircuit
                                  ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 hover:border-cyan-400'
                                  : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-500'
                              }`}
                              title="Click to view used circuit IDs and re-assign circuit"
                            >
                              <span className="truncate">
                                {matchedCircuit
                                  ? `${matchedBoard ? matchedBoard.name.split(' ')[0] : 'DB'}:${matchedCircuit.circuitId}`
                                  : '➕ Assign Circuit'}
                              </span>
                              <Zap size={11} className={matchedCircuit ? 'text-yellow-400' : 'text-gray-500'} />
                            </button>

                            {/* Interactive Circuit Assignment Popover */}
                            {isPopoverOpen && (
                              <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-[#0d121f] border border-cyan-500/40 rounded-xl p-3 shadow-2xl space-y-2.5">
                                <div className="flex items-center justify-between border-b border-[#2d3748] pb-1.5">
                                  <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                                    <Zap size={12} className="text-yellow-400" />
                                    <span>Assign Circuit ID</span>
                                  </span>
                                  <button
                                    onClick={() => setActiveCircuitPopoverUnitId(null)}
                                    className="text-gray-400 hover:text-white text-xs font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                                  {(boards || []).map(board => (
                                    <div key={board.id} className="bg-[#131929] border border-[#232d42] rounded-lg p-2 space-y-1.5">
                                      <div className="text-[10px] font-bold text-gray-300 flex items-center justify-between">
                                        <span>{board.name}</span>
                                        <span className="text-gray-500 font-mono">{board.circuits.length} Circuits</span>
                                      </div>

                                      <div className="flex flex-wrap gap-1">
                                        {board.circuits.map(c => {
                                          const isCurrent = unit.linkedCircuitId === c.id || (matchedCircuit && matchedCircuit.id === c.id);
                                          return (
                                            <button
                                              key={c.id}
                                              type="button"
                                              onClick={() => {
                                                setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, linkedCircuitId: c.id } : u));
                                                setActiveCircuitPopoverUnitId(null);
                                              }}
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 transition-all cursor-pointer ${
                                                isCurrent
                                                  ? 'bg-cyan-600 text-white font-bold border-cyan-300'
                                                  : 'bg-[#1a2235] text-gray-300 border-[#2d3a54] hover:border-cyan-500/60'
                                              }`}
                                              title={`${c.circuitId}: ${c.loadType} (${c.room || 'General'})`}
                                            >
                                              <span>{c.circuitId}</span>
                                              {isCurrent && <span className="text-[8px]">✓</span>}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, linkedCircuitId: undefined } : u));
                                    setActiveCircuitPopoverUnitId(null);
                                  }}
                                  className="w-full text-center py-1 text-[10px] font-bold text-sky-400 bg-sky-950/40 border border-sky-800/40 rounded hover:bg-sky-900/60 transition-colors"
                                >
                                  ✨ Auto-create New Dedicated Circuit ID
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })()}

                      {/* Cable Length */}
                      {isColVisible('cableLength') && (
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={unit.cableLength !== undefined ? unit.cableLength : 15}
                            onChange={e => updateField(unit.id, 'cableLength', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 text-center text-white w-20 outline-none font-mono"
                          />
                        </td>
                      )}

                      {/* Cores */}
                      {isColVisible('cores') && (
                        <td className="p-2">
                          <select
                            value={unit.cores || '3 Cores'}
                            onChange={e => updateField(unit.id, 'cores', e.target.value)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                          >
                            {coresList.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Total Cable */}
                      {isColVisible('totalCable') && (
                        <td className="p-2 text-center text-blue-300 font-mono font-bold bg-[#141a29]/40">
                          {totalCable.toLocaleString()} m
                        </td>
                      )}

                      {/* Core palette selection */}
                      {isColVisible('palette') && (
                        <td className="p-2">
                          <select
                            value={unit.cableColors || 'Standard 3-Core (Red/Black/Green)'}
                            onChange={e => updateField(unit.id, 'cableColors', e.target.value)}
                            className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                          >
                            {palettesList.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      <RenderCustomCells
                        tabId="hvac"
                        row={unit}
                        dropdowns={dropdowns}
                        onChange={(val) => updateField(unit.id, 'customValues' as any, val)}
                      />

                      {/* Notes input */}
                      {isColVisible('notes') && (
                        <td className="p-2">
                          <input
                            value={unit.notes || ''}
                            onChange={e => updateField(unit.id, 'notes', e.target.value)}
                            placeholder="Zone notes..."
                            className="bg-transparent text-gray-300 px-1 py-0.5 outline-none focus:border-b focus:border-blue-500 w-full"
                          />
                        </td>
                      )}

                      {/* Sticky Actions */}
                      <td className="sticky right-0 z-20 bg-[#151a26] p-2 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setNewZoneForm({ ...unit });
                              setRoomSelectValue(unit.zone || '');
                              setAddZoneModalOpen(true);
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 rounded transition-all cursor-pointer"
                            title="Edit Zone Parameters"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => duplicateUnit(unit.id)}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded transition-all cursor-pointer"
                            title="Duplicate Zone"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => removeUnit(unit.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-[#2c1a1e] rounded transition-all cursor-pointer"
                            title="Delete Zone"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Footer & Scrollbar Container */}
      <div className="sticky bottom-0 bg-[#0f1420]/95 backdrop-blur-md border-t border-[#2d3748] z-30 -mx-6 mb-0 mt-6 w-[calc(100%+3rem)] rounded-b-xl shadow-2xl flex flex-col">
        {/* Sticky Horizontal Scroller Bar for Easy Navigation */}
        <div className="bg-[#0a0e17] border-b border-[#2d3748]/60 px-4 py-2 flex items-center gap-3">
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

        {/* Sticky Action footer content */}
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400 font-mono">
              Total HVAC Zones: <span className="text-sky-400 font-bold">{units.length}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearTable}
              className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Clear Table
            </button>
            <button
              onClick={() => {
                setNewZoneForm({
                  zone: `Zone ${units.length + 1}`,
                  system: systemsList[0] || 'Split AC',
                  area: 20,
                  height: 3.0,
                  coolingLoad: 5.0,
                  refrigerant: refrigerantsList[0] || 'R-410A',
                  cfm: 400,
                  notes: '',
                  switchType: switchTypesList.includes('32-100A Isolator') ? '32-100A Isolator' : (switchTypesList[0] || 'None'),
                  switchQty: 1,
                  watts: 1500,
                  quantity: 1,
                  phase: 'Single Phase',
                  cbSizing: cbSizesList.includes('20') ? 20 : (parseInt(cbSizesList[0]) || 20),
                  wire: wireSizesList.includes('4') ? '4' : (wireSizesList[0] || '4'),
                  cableLength: 15,
                  cores: coresList.includes('3 Cores') ? '3 Cores' : (coresList[0] || '3 Cores'),
                  cableColors: palettesList[0] || 'Standard 3-Core (Red/Black/Green)',
                  factors: [],
                  acHp: calculateAcHp(20, 3.0, []),
                });
                setRoomSelectValue('');
                setCustomRoomName('');
                setModalTab('physical');
                setAddZoneModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Zone
            </button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#718096] italic leading-normal">
        * Air Conditioner loads dynamically link to Corresponding Air Conditioner circuits inside Panel board circuits. Total load metrics automatically synchronize with BEME summaries and combined main demand evaluations in real-time.
      </p>

      <AnimatePresence>
        {addZoneModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm overflow-y-auto font-sans"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setAddZoneModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/80 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white my-8"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-[#12192b]/95 shrink-0">
                <div>
                  <h3 className="font-sans font-bold text-base text-cyan-400 flex items-center gap-2">
                    <span>❄️</span> Add HVAC Sizing & Suppression Zone
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure physical dimensions, cooling loads, and electrical components.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddZoneModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b border-[#2d3748] bg-[#0c101b] p-1 gap-1">
                {(['physical', 'sizing', 'power'] as const).map((t) => {
                  const labels = {
                    physical: { title: '1. Dimensions', desc: 'Area & Height' },
                    sizing: { title: '2. Sizing Load', desc: 'Cooling & CFM' },
                    power: { title: '3. Power & Wire', desc: 'Watts, CB & Cable' }
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTab(t)}
                      className={`flex-1 py-2 px-3 rounded-md transition-all text-left cursor-pointer ${
                        modalTab === t
                          ? 'bg-[#1e3a5f] text-blue-300 border border-blue-500/40 shadow'
                          : 'hover:bg-[#1a2035]/50 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="text-xs font-bold leading-none">{labels[t].title}</div>
                      <div className="text-[9px] mt-0.5 opacity-85">{labels[t].desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveNewZone} className="p-5 overflow-y-auto space-y-4 flex-1 text-left select-none max-h-[60vh]">
                {modalTab === 'physical' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Room / Zone selection */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Zone / Room Name <span className="text-red-400">*</span>
                        </label>
                        <RoomSelector
                          value={newZoneForm.zone || ''}
                          onChange={(val) => {
                            const registered = registeredRoomSizes[val.trim().toLowerCase()];
                            setNewZoneForm(prev => {
                              const updated = { ...prev, zone: val };
                              if (registered) {
                                updated.length = registered.l;
                                updated.width = registered.w;
                                updated.area = Math.round(registered.l * registered.w * 100) / 100;
                                if (registered.h) updated.height = registered.h;
                                updated.acHp = calculateAcHp(updated.area, updated.height || 3.0);
                              }
                              return updated;
                            });
                          }}
                          settings={settings}
                          placeholder="Select or search room name..."
                        />
                      </div>

                      {/* System Type */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          System Type
                        </label>
                        <select
                          value={newZoneForm.system || 'Split AC'}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, system: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                        >
                          {systemsList.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dimensions & Sizing Live Calculations */}
                    <div className="bg-[#0c101b] border border-[#2d3748]/50 p-4 rounded-lg space-y-4">
                      <div className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                        <span>📏</span> Room Dimensions & Sizing Estimates
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Length (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newZoneForm.length || ''}
                            onChange={(e) => {
                              const l = parseFloat(e.target.value) || 0;
                              setNewZoneForm(prev => {
                                const w = prev.width || 0;
                                const areaVal = Math.round(l * w * 100) / 100;
                                return {
                                  ...prev,
                                  length: l,
                                  area: areaVal || prev.area || 0,
                                  acHp: calculateAcHp(areaVal || prev.area || 0, prev.height || 3.0)
                                };
                              });
                            }}
                            placeholder="L"
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Width (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={newZoneForm.width || ''}
                            onChange={(e) => {
                              const w = parseFloat(e.target.value) || 0;
                              setNewZoneForm(prev => {
                                const l = prev.length || 0;
                                const areaVal = Math.round(l * w * 100) / 100;
                                return {
                                  ...prev,
                                  width: w,
                                  area: areaVal || prev.area || 0,
                                  acHp: calculateAcHp(areaVal || prev.area || 0, prev.height || 3.0)
                                };
                              });
                            }}
                            placeholder="W"
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Area (m²)</label>
                          <input
                            type="number"
                            min="1"
                            value={newZoneForm.area || ''}
                            onChange={(e) => {
                              const a = parseFloat(e.target.value) || 0;
                              setNewZoneForm(prev => ({
                                ...prev,
                                area: a,
                                acHp: calculateAcHp(a, prev.height || 3.0)
                              }));
                            }}
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Ceiling Height (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            value={newZoneForm.height || ''}
                            onChange={(e) => {
                              const h = parseFloat(e.target.value) || 0;
                              setNewZoneForm(prev => ({
                                ...prev,
                                height: h,
                                acHp: calculateAcHp(prev.area || 20, h)
                              }));
                            }}
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2 text-center border-t border-[#2d3748]/30">
                        <div>
                          <span className="text-[9px] text-[#718096] uppercase block">Volume</span>
                          <span className="text-xs font-mono font-bold text-gray-300">
                            {+((newZoneForm.area || 0) * (newZoneForm.height || 0)).toFixed(1)} m³
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-orange-400 uppercase block">Estimated HP</span>
                          <span className="text-xs font-mono font-bold text-orange-400">
                            {newZoneForm.acHp || 0} HP
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-cyan-400 uppercase block">Area Ratio</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {newZoneForm.area ? `${newZoneForm.area} m²` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'sizing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cooling load */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Cooling Load (kW)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={newZoneForm.coolingLoad || ''}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, coolingLoad: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-mono font-bold text-cyan-400"
                        />
                      </div>

                      {/* CFM */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Air Flow Rate (CFM)
                        </label>
                        <input
                          type="number"
                          value={newZoneForm.cfm || ''}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, cfm: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Cooling Equivalents */}
                    <div className="bg-[#0c101b] border border-[#2d3748]/50 p-4 rounded-lg space-y-3">
                      <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                        <span>❄️</span> Sizing Conversion & Environment
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Refrigerant selection */}
                        <div>
                          <label className="block text-[9px] text-gray-400 mb-1 uppercase font-semibold">Refrigerant Gas</label>
                          <select
                            value={newZoneForm.refrigerant || 'R-410A'}
                            onChange={(e) => setNewZoneForm(prev => ({ ...prev, refrigerant: e.target.value }))}
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                          >
                            {refrigerantsList.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        {/* Calculations */}
                        <div className="grid grid-cols-2 gap-2 text-center bg-[#141a29] p-2.5 rounded border border-[#2d3748]/40">
                          <div>
                            <span className="text-[8px] text-[#718096] uppercase block">Tonnage</span>
                            <span className="text-xs font-black font-mono text-[#63b3ed]">
                              {((newZoneForm.coolingLoad || 0) / 3.517).toFixed(2)} TR
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-orange-400 uppercase block">BTU/hr Rate</span>
                            <span className="text-xs font-black font-mono text-orange-400">
                              {Math.round((newZoneForm.coolingLoad || 0) * 3412).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Heat Load Factors Checklist in Modal */}
                      <div className="border-t border-[#2d3748]/40 pt-3">
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">
                          🌱 Factors Affecting Heat Sizing (BTU/hr)
                        </label>
                        <BtuFactorsDropdownChecklist
                          selectedFactors={newZoneForm.factors || []}
                          onChange={next => {
                            const updatedBtu = calculateUnitBtu(newZoneForm.area || 20, newZoneForm.height || 3.0, next);
                            const nextHp = calculateAcHp(newZoneForm.area || 20, newZoneForm.height || 3.0, next);
                            setNewZoneForm(prev => ({
                              ...prev,
                              factors: next,
                              acHp: nextHp,
                              coolingLoad: Math.round((updatedBtu / 3412) * 100) / 100
                            }));
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'power' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Watts per unit */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Watts per Unit (W)
                        </label>
                        <input
                          type="number"
                          value={newZoneForm.watts || ''}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, watts: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Unit Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newZoneForm.quantity || ''}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Phase */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Phase Type
                        </label>
                        <select
                          value={newZoneForm.phase || 'Single Phase'}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, phase: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer font-sans"
                        >
                          <option value="Single Phase">Single Phase</option>
                          <option value="Three Phase">Three Phase</option>
                        </select>
                      </div>

                      {/* CB Sizing */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Breaker (CB) Sizing
                        </label>
                        <select
                          value={newZoneForm.cbSizing || 20}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, cbSizing: parseInt(e.target.value) || 20 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                        >
                          {cbSizesList.map((sz) => (
                            <option key={sz} value={sz}>{sz}A</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Wire Size */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Wire Size (mm²)
                        </label>
                        <select
                          value={newZoneForm.wire || '4'}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, wire: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer font-mono"
                        >
                          {wireSizesList.map((sz) => (
                            <option key={sz} value={sz}>{sz} mm²</option>
                          ))}
                        </select>
                      </div>

                      {/* Cable Length */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Cable Length (m)
                        </label>
                        <input
                          type="number"
                          value={newZoneForm.cableLength || ''}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, cableLength: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cores */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Cores Type
                        </label>
                        <select
                          value={newZoneForm.cores || '3 Cores'}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, cores: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                        >
                          {coresList.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Core Palette */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Cable Colors
                        </label>
                        <select
                          value={newZoneForm.cableColors || 'Standard 3-Core (Red/Black/Green)'}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, cableColors: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                        >
                          {palettesList.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Switch Type */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Switch Type
                        </label>
                        <select
                          value={newZoneForm.switchType || '32-100A Isolator'}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, switchType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer font-sans"
                        >
                          {switchTypesList.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Switch Qty */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Switch Qty
                        </label>
                        <input
                          type="number"
                          value={newZoneForm.switchQty !== undefined ? newZoneForm.switchQty : 1}
                          onChange={(e) => setNewZoneForm(prev => ({ ...prev, switchQty: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Notes / Specifications
                      </label>
                      <input
                        type="text"
                        value={newZoneForm.notes || ''}
                        onChange={(e) => setNewZoneForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="e.g. Inverter Type, dedicated isolator..."
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    {/* Distribution Board (DB) & Circuit ID Allocation */}
                    <div className="bg-[#0c101b] border border-cyan-500/30 p-3.5 rounded-xl space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <Zap size={14} className="text-yellow-400" />
                          <span>Distribution Board (DB) & Circuit ID Assignment</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          Auto-syncs with Electrical Schedule
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Target DB Board */}
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">
                            Target Distribution Board (DB)
                          </label>
                          <select
                            value={modalBoardId}
                            onChange={e => {
                              setModalBoardId(e.target.value);
                              setModalCircuitSelection('NEW_AUTO');
                            }}
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-cyan-500 font-semibold cursor-pointer"
                          >
                            {(boards || []).map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name || 'Main Distribution Board'} ({b.circuits.length} Circuits)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Circuit Assignment Option */}
                        <div>
                          <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">
                            Circuit Slot Assignment
                          </label>
                          <select
                            value={modalCircuitSelection}
                            onChange={e => setModalCircuitSelection(e.target.value)}
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-cyan-300 p-2 text-xs outline-none focus:border-cyan-500 font-bold font-mono cursor-pointer"
                          >
                            <option value="NEW_AUTO">✨ Auto-create New Circuit ({nextModalCircuitId})</option>
                            {activeModalBoardCircuits.map(c => (
                              <option key={c.id} value={c.id}>
                                🔗 Circuit {c.circuitId} - {c.loadType} ({c.room || 'General'}) [{c.cb}A]
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Visual Occupied Circuit IDs Badges */}
                      <div className="pt-2 border-t border-[#2d3748]/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Occupied Circuit IDs on {activeModalBoard?.name || 'DB Board'}:
                          </span>
                          <span className="text-[10px] text-green-400 font-mono font-bold">
                            Next Free: {nextModalCircuitId}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-[#080b12] rounded-lg border border-[#1e2638]">
                          {activeModalBoardCircuits.length === 0 ? (
                            <span className="text-[10px] text-gray-500 italic">No circuits assigned yet on this board.</span>
                          ) : (
                            activeModalBoardCircuits.map(c => {
                              const isSelected = modalCircuitSelection === c.id;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => setModalCircuitSelection(c.id)}
                                  className={`px-2 py-1 rounded text-[10px] font-mono border cursor-pointer transition-all flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-cyan-900/80 border-cyan-400 text-white font-bold ring-1 ring-cyan-400'
                                      : 'bg-[#121826] border-[#2b354e] text-gray-300 hover:border-gray-400'
                                  }`}
                                  title={`Circuit ${c.circuitId}: ${c.loadType} in ${c.room || 'General'} (${c.cb}A)`}
                                >
                                  <span className="font-bold text-cyan-300">{c.circuitId}</span>
                                  <span className="text-gray-400 text-[9px] truncate max-w-[80px]">{c.room || c.loadType}</span>
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-red-950 text-red-300 border border-red-800/50">USED</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>

              {/* Footer Actions */}
              <div className="p-5 border-t border-[#2d3748] flex justify-between items-center bg-[#0c101b]/60">
                <button
                  type="button"
                  onClick={() => setAddZoneModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-[#2d3748] hover:bg-[#1a2035] transition-all cursor-pointer text-gray-300"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  {modalTab !== 'physical' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'sizing') setModalTab('physical');
                        if (modalTab === 'power') setModalTab('sizing');
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2d3748] hover:bg-[#3d4a61] transition-all cursor-pointer text-white"
                    >
                      Back
                    </button>
                  )}

                  {modalTab !== 'power' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'physical') setModalTab('sizing');
                        else if (modalTab === 'sizing') setModalTab('power');
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer text-white border border-blue-400"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveNewZone}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-green-600 hover:bg-green-500 transition-all cursor-pointer text-white border border-green-400"
                    >
                      Create Zone ✓
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
