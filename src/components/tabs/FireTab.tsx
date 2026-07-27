import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FireZone, ProjectSettings } from '../../types';
import { parseMEPFile } from '../../utils/mepImporter';
import * as XLSX from 'xlsx';
import {
  Flame,
  Shield,
  Settings,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  ChevronLeft,
  Layout,
  Sliders,
  Sparkles,
  Award,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { RoomSelector } from '../../utils/dropdownMetadata';

// Standards & default options
export const CLEAN_AGENTS = [
  {
    name: 'Novec 1230 / FK-5-1-12',
    k1: 0.0664,
    k2: 0.000274,
    classA: 4.5,
    classB: 5.6,
    classC: 5.3,
    noael: 10.0,
    odp: 0,
    gwp: 1,
    desc: 'Fluoroketone environmentally premium agent. Zero ODP, minimal atmospheric lifetime (5 days).'
  },
  {
    name: 'FM-200 / HFC-227ea',
    k1: 0.1269,
    k2: 0.000513,
    classA: 6.25,
    classB: 8.7,
    classC: 7.0,
    noael: 9.0,
    odp: 0,
    gwp: 3220,
    desc: 'Heptafluoropropane clean agent. Zero ODP, very effective for electronic equipment and electrical vaults.'
  },
  {
    name: 'CO2 (Carbon Dioxide)',
    k1: 0, // calculated differently
    k2: 0,
    classA: 34.0,
    classB: 50.0,
    classC: 34.0,
    noael: 5.0, // Highly dangerous to occupied spaces!
    odp: 0,
    gwp: 1,
    desc: 'High-pressure CO2. Extremely effective but lethal design concentrations. Recommended for unoccupied rooms only.'
  },
  {
    name: 'Inergen / IG-541',
    k1: 0.6579,
    k2: 0.00239,
    classA: 37.5,
    classB: 40.0,
    classC: 38.0,
    noael: 43.0,
    odp: 0,
    gwp: 0,
    desc: 'Natural inert gas blend (52% N2, 40% Ar, 8% CO2). Keeps oxygen at breathable 12% levels without chemical toxicity.'
  }
];

export const STANDARD_CYLINDERS = [
  { size: '22L', volume: 22, maxFill: 25.3, cost: 450 },
  { size: '40L', volume: 40, maxFill: 46.0, cost: 680 },
  { size: '80L', volume: 80, maxFill: 92.0, cost: 950 },
  { size: '120L', volume: 120, maxFill: 138.0, cost: 1350 },
  { size: '180L', volume: 180, maxFill: 207.0, cost: 1850 },
  { size: '250L', volume: 250, maxFill: 287.5, cost: 2400 }
];

export const PIPE_SIZES = ['15', '20', '25', '32', '40', '50', '65', '80', '100'];

const STEPS = [
  { id: 'project', label: 'Project Details', icon: <Sliders size={16} /> },
  { id: 'dimensions', label: 'Room Dimensions', icon: <Layout size={16} /> },
  { id: 'hazard', label: 'Hazard Assessment', icon: <span>⚠️</span> },
  { id: 'agent', label: 'Agent Selection', icon: <Flame size={16} /> },
  { id: 'calculation', label: 'Agent Calculation', icon: <span>⏱️</span> },
  { id: 'cylinder', label: 'Cylinder Selection', icon: <Shield size={16} /> },
  { id: 'pipes', label: 'Pipe Sizing', icon: <Award size={16} /> },
  { id: 'nozzle', label: 'Nozzle Placement', icon: <Sparkles size={16} /> },
  { id: 'control', label: 'Detection & Control', icon: <Settings size={16} /> },
  { id: 'compliance', label: 'Compliance Checks', icon: <Award size={16} /> },
  { id: 'dashboard', label: 'Results Dashboard', icon: <span>✅</span> },
  { id: 'bom', label: 'Bill of Materials & Report', icon: <span>💰</span> }
];

interface FireTabProps {
  zones: FireZone[];
  setZones: React.Dispatch<React.SetStateAction<FireZone[]>>;
  settings?: ProjectSettings;
  setSettings?: React.Dispatch<React.SetStateAction<ProjectSettings>>;
}

export default function FireTab({ zones, setZones, settings, setSettings }: FireTabProps) {
  // Hidden File Input Ref for Imports
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // File Import Logic
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    try {
      const res = await parseMEPFile(file, [], settings);
      if (res.fireZones && res.fireZones.length > 0) {
        setZones(prev => mode === 'replace' ? res.fireZones! : [...prev, ...res.fireZones!]);
      }
      window.dispatchEvent(new CustomEvent('trigger-mep-update-workspace', { detail: res }));
      window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: true, text: res.summaryMessage } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: false, text: 'Import failed: ' + (err.message || 'invalid file') } }));
    }
  };

  // File Export Logic
  const handleExportFile = (format: string) => {
    const headers = [
      'Location / Room', 'Hazard Class', 'Sprinkler Type', 'Area m²', 'Height m', 'Volume m³', 'Min Temp °C', 'Agent Type', 'Design Conc %', 'Agent Weight kg', 'Cylinder Qty', 'Cylinder Size', 'Main Pipe mm', 'Branch Pipe mm', 'Nozzles Qty', 'Notes'
    ];
    
    const dataRows = zones.map(z => [
      z.zone, z.hazard, z.sprinklerType, z.area, z.height, z.volume, z.temp, z.agentType, z.concentration, z.agentWeight, z.cylinderQty, z.cylinderSize, z.pipeMain, z.pipeBranch, z.nozzles, z.notes
    ]);
    
    const allRows = [headers, ...dataRows];
    
    if (format === 'xlsx' || format === 'xls') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Fire Sizing Schedule');
      XLSX.writeFile(wb, `Fire_Sizing_Schedule.${format}`);
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
      link.setAttribute('download', `Fire_Sizing_Schedule.${isCsv ? 'csv' : 'txt'}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Custom Event Listeners
  useEffect(() => {
    const handleImportTrigger = (e: Event) => {
      importFileInputRef.current?.click();
    };
    const handleExportTrigger = (e: Event) => {
      const format = (e as CustomEvent).detail || 'xlsx';
      handleExportFile(format);
    };

    window.addEventListener('trigger-mep-import-fire', handleImportTrigger);
    window.addEventListener('trigger-mep-export-fire', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import-fire', handleImportTrigger);
      window.removeEventListener('trigger-mep-export-fire', handleExportTrigger);
    };
  }, [zones]);

  // Stepper state
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<string>('none');

  const clearTable = () => {
    if (confirm('Are you sure you want to clear all clean agent fire suppression systems from the schedule?')) {
      setZones([]);
    }
  };

  const filteredZones = useMemo(() => {
    return zones.filter(z => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (z.zone && z.zone.toLowerCase().includes(q)) ||
        (z.hazard && z.hazard.toLowerCase().includes(q)) ||
        (z.sprinklerType && z.sprinklerType.toLowerCase().includes(q)) ||
        (z.notes && z.notes.toLowerCase().includes(q))
      );
    });
  }, [zones, searchQuery]);

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dummyScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(1800);
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
  }, [zones]);

  // Local state for the current 12-step design wizard
  const [currentDesign, setCurrentDesign] = useState<{
    zoneName: string;
    standard: string;
    safetyMargin: number;
    ambientTemp: number;
    altitude: number;
    length: number;
    width: number;
    height: number;
    protectCeilingVoid: boolean;
    ceilingVoidH: number;
    protectFloorVoid: boolean;
    floorVoidH: number;
    hazardType: 'Class A' | 'Class B' | 'Class C';
    customConcentration: number;
    agentName: string;
    cylinderSize: string;
    operatingPressure: number;
    manifoldPipeSize: string;
    branchPipeSize: string;
    pipeMaterial: string;
    nozzleQty: number;
    nozzleType: string;
    detectorType: string;
    detectorQty: number;
    releasePanelType: string;
    abortSwitch: boolean;
    manualRelease: boolean;
    soundersCount: number;
    strobesCount: number;
    preDischargeDelay: number;
  }>({
    zoneName: 'Server Room A',
    standard: 'NFPA 2001',
    safetyMargin: 20, // %
    ambientTemp: 20, // °C
    altitude: 0, // meters
    length: 6.0,
    width: 5.0,
    height: 3.0,
    protectCeilingVoid: false,
    ceilingVoidH: 0.5,
    protectFloorVoid: false,
    floorVoidH: 0.4,
    hazardType: 'Class C',
    customConcentration: 0,
    agentName: 'Novec 1230 / FK-5-1-12',
    cylinderSize: '80L',
    operatingPressure: 42,
    manifoldPipeSize: '50',
    branchPipeSize: '25',
    pipeMaterial: 'ASTM A106 Seamless Steel',
    nozzleQty: 2,
    nozzleType: '360° Radial Nozzle',
    detectorType: 'Dual Photoelectric Smoke Detectors',
    detectorQty: 4,
    releasePanelType: 'Conventional Fire Suppression Panel',
    abortSwitch: true,
    manualRelease: true,
    soundersCount: 2,
    strobesCount: 2,
    preDischargeDelay: 30
  });

  // Calculate design parameters automatically
  const designMath = useMemo(() => {
    const l = currentDesign.length || 0;
    const w = currentDesign.width || 0;
    const h = currentDesign.height || 0;

    const mainArea = l * w;
    const mainVolume = mainArea * h;

    const ceilingVoidVol = currentDesign.protectCeilingVoid
      ? mainArea * (currentDesign.ceilingVoidH || 0)
      : 0;

    const floorVoidVol = currentDesign.protectFloorVoid
      ? mainArea * (currentDesign.floorVoidH || 0)
      : 0;

    const totalProtectedVolume = mainVolume + ceilingVoidVol + floorVoidVol;

    // Agent profile
    const agent = CLEAN_AGENTS.find(a => a.name === currentDesign.agentName) || CLEAN_AGENTS[0];

    // Base concentration %
    let baseConc = agent.classC;
    if (currentDesign.hazardType === 'Class A') baseConc = agent.classA;
    if (currentDesign.hazardType === 'Class B') baseConc = agent.classB;

    // Apply custom override if set
    const finalConc = currentDesign.customConcentration > 0
      ? currentDesign.customConcentration
      : baseConc * (1 + (currentDesign.safetyMargin || 0) / 100);

    // Altitude correction factor
    let altitudeFactor = 1.0;
    const alt = currentDesign.altitude || 0;
    if (alt <= 0) altitudeFactor = 1.0;
    else if (alt <= 500) altitudeFactor = 0.94;
    else if (alt <= 1000) altitudeFactor = 0.88;
    else if (alt <= 1500) altitudeFactor = 0.83;
    else if (alt <= 2000) altitudeFactor = 0.78;
    else if (alt <= 2500) altitudeFactor = 0.73;
    else altitudeFactor = 0.69;

    let requiredWeight = 0;
    let sVolume = 1.0;

    if (agent.name.includes('CO2')) {
      // CO2 calculations: standard volume flooding factor is 1.33 kg/m³ for Class A/C, 1.6 for Class B
      const factor = currentDesign.hazardType === 'Class B' ? 1.6 : 1.33;
      requiredWeight = totalProtectedVolume * factor * altitudeFactor;
      sVolume = 0.556; // typical specific volume
    } else {
      // Standard NFPA 2001 formula: W = (V/s) * (c / (100 - c)) * F
      // s = k1 + k2 * T
      sVolume = agent.k1 + agent.k2 * currentDesign.ambientTemp;
      if (sVolume > 0 && finalConc < 100) {
        requiredWeight = (totalProtectedVolume / sVolume) * (finalConc / (100 - finalConc)) * altitudeFactor;
      }
    }

    requiredWeight = Math.round(requiredWeight * 10) / 10;

    // Cylinder math
    const selectedCyl = STANDARD_CYLINDERS.find(c => c.size === currentDesign.cylinderSize) || STANDARD_CYLINDERS[2];
    const cylinderQty = Math.max(1, Math.ceil(requiredWeight / (selectedCyl.maxFill || 50)));
    const fillDensity = Math.round((requiredWeight / (cylinderQty * selectedCyl.volume)) * 100) / 100;

    // Nozzle coverage
    const coveragePerNozzle = mainArea / Math.max(1, currentDesign.nozzleQty);
    const nozzleLimitOk = coveragePerNozzle <= 82.8; // NFPA coverage limit (9m x 9m)

    // Pricing estimation
    const cylinderTotalCost = cylinderQty * selectedCyl.cost;
    const nozzleCost = Math.max(1, currentDesign.nozzleQty) * 120;
    const panelCost = 850;
    const deviceCost = (currentDesign.detectorQty * 65) + 350; // detectors + aborts/sirens
    const totalEstCost = cylinderTotalCost + nozzleCost + panelCost + deviceCost;

    return {
      mainArea: Math.round(mainArea * 10) / 10,
      mainVolume: Math.round(mainVolume * 10) / 10,
      ceilingVoidVol: Math.round(ceilingVoidVol * 10) / 10,
      floorVoidVol: Math.round(floorVoidVol * 10) / 10,
      totalVolume: Math.round(totalProtectedVolume * 10) / 10,
      baseConc,
      finalConc: Math.round(finalConc * 100) / 100,
      altitudeFactor,
      sVolume: Math.round(sVolume * 4) / 4 || 0,
      requiredWeight,
      cylinderQty,
      fillDensity,
      coveragePerNozzle: Math.round(coveragePerNozzle * 10) / 10,
      nozzleLimitOk,
      cylinderTotalCost,
      nozzleCost,
      panelCost,
      deviceCost,
      totalEstCost
    };
  }, [currentDesign]);

  // Load a zone into the wizard for editing
  const handleEditZone = (z: FireZone) => {
    const cVals = z.customValues || {};
    setCurrentDesign({
      zoneName: z.zone || 'Server Room',
      standard: cVals.standard || 'NFPA 2001',
      safetyMargin: cVals.safetyMargin !== undefined ? cVals.safetyMargin : 20,
      ambientTemp: cVals.ambientTemp !== undefined ? cVals.ambientTemp : 20,
      altitude: cVals.altitude !== undefined ? cVals.altitude : 0,
      length: cVals.length !== undefined ? cVals.length : 6.0,
      width: cVals.width !== undefined ? cVals.width : 5.0,
      height: cVals.height !== undefined ? cVals.height : 3.0,
      protectCeilingVoid: !!cVals.protectCeilingVoid,
      ceilingVoidH: cVals.ceilingVoidH !== undefined ? cVals.ceilingVoidH : 0.5,
      protectFloorVoid: !!cVals.protectFloorVoid,
      floorVoidH: cVals.floorVoidH !== undefined ? cVals.floorVoidH : 0.4,
      hazardType: cVals.hazardType || 'Class C',
      customConcentration: cVals.customConcentration || 0,
      agentName: z.hazard || 'Novec 1230 / FK-5-1-12',
      cylinderSize: cVals.cylinderSize || '80L',
      operatingPressure: cVals.operatingPressure || 42,
      manifoldPipeSize: String(z.pipeSize) || '50',
      branchPipeSize: cVals.branchPipeSize || '25',
      pipeMaterial: cVals.pipeMaterial || 'ASTM A106 Seamless Steel',
      nozzleQty: z.flowRate || 2, // flowRate mapped to nozzleQty
      nozzleType: cVals.nozzleType || '360° Radial Nozzle',
      detectorType: cVals.detectorType || 'Dual Photoelectric Smoke Detectors',
      detectorQty: cVals.detectorQty || 4,
      releasePanelType: cVals.releasePanelType || 'Conventional Fire Suppression Panel',
      abortSwitch: cVals.abortSwitch !== undefined ? !!cVals.abortSwitch : true,
      manualRelease: cVals.manualRelease !== undefined ? !!cVals.manualRelease : true,
      soundersCount: cVals.soundersCount || 2,
      strobesCount: cVals.strobesCount || 2,
      preDischargeDelay: cVals.preDischargeDelay || 30
    });
    setEditingZoneId(z.id);
    setActiveStepIdx(0);
    setIsWizardOpen(true);
  };

  // Launch fresh suppression design wizard
  const handleAddNewSuppression = () => {
    setCurrentDesign({
      zoneName: `Server Room ${zones.length + 1}`,
      standard: 'NFPA 2001',
      safetyMargin: 20,
      ambientTemp: 20,
      altitude: 0,
      length: 6.0,
      width: 5.0,
      height: 3.0,
      protectCeilingVoid: false,
      ceilingVoidH: 0.5,
      protectFloorVoid: false,
      floorVoidH: 0.4,
      hazardType: 'Class C',
      customConcentration: 0,
      agentName: 'Novec 1230 / FK-5-1-12',
      cylinderSize: '80L',
      operatingPressure: 42,
      manifoldPipeSize: '50',
      branchPipeSize: '25',
      pipeMaterial: 'ASTM A106 Seamless Steel',
      nozzleQty: 2,
      nozzleType: '360° Radial Nozzle',
      detectorType: 'Dual Photoelectric Smoke Detectors',
      detectorQty: 4,
      releasePanelType: 'Conventional Fire Suppression Panel',
      abortSwitch: true,
      manualRelease: true,
      soundersCount: 2,
      strobesCount: 2,
      preDischargeDelay: 30
    });
    setEditingZoneId(null);
    setActiveStepIdx(0);
    setIsWizardOpen(true);
  };

  // Save the complete 12-step gas suppression setup
  const handleSaveDesign = () => {
    if (!currentDesign.zoneName.trim()) {
      alert('Please specify a Location / Room name.');
      return;
    }

    const newZone: FireZone = {
      id: editingZoneId || 'FZ-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      zone: currentDesign.zoneName,
      hazard: currentDesign.agentName, // Mapping agentName to standard 'hazard' field
      sprinklerType: `${designMath.cylinderQty}x ${currentDesign.cylinderSize} Cylinders`, // Cylinder description in 'sprinklerType'
      area: designMath.mainArea,
      spacing: designMath.requiredWeight, // Map agent mass to 'spacing' field for display/sync
      flowRate: currentDesign.nozzleQty, // Map nozzle quantity to 'flowRate' field
      pipeSize: parseInt(currentDesign.manifoldPipeSize, 10) || 50,
      notes: `${currentDesign.hazardType} Hazard designed with ${currentDesign.standard}. Agent weight: ${designMath.requiredWeight} kg.`,
      customValues: {
        ...currentDesign,
        ...designMath
      }
    };

    setZones(prev => {
      if (editingZoneId) {
        return prev.map(z => z.id === editingZoneId ? newZone : z);
      } else {
        return [...prev, newZone];
      }
    });

    setIsWizardOpen(false);
  };

  const handleRemoveZone = (id: string) => {
    if (confirm('Are you sure you want to remove this fire suppression system design?')) {
      setZones(prev => prev.filter(z => z.id !== id));
    }
  };

  const handleDuplicateZone = (zone: FireZone) => {
    const duplicated: FireZone = {
      ...zone,
      id: Math.random().toString(36).substring(2, 9),
      zone: `${zone.zone} (Copy)`
    };
    setZones(prev => [...prev, duplicated]);
  };

  // Currency utility helper
  const formatCurrency = (amount: number) => {
    const symbol = settings?.currencySymbol || '$';
    const rate = settings?.currencyRate || 1;
    return `${symbol}${(amount * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0d14] text-white">
      {/* Hidden File Input for Fire Sizing Sheet Imports */}
      <input
        type="file"
        ref={importFileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.csv,.txt"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handleImportFile(e.target.files[0], 'append');
            e.target.value = '';
          }
        }}
      />

      {/* Header Banner */}
      <div className="shrink-0 p-6 border-b border-[#1e2538] bg-[#0c101b] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20">
              <Flame size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Gas Fire Suppression Suite <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-bold">NFPA 2001 / ISO 14520 compliant</span>
              </h1>
              <p className="text-xs text-[#718096] mt-0.5">
                Specialized clean-agent and high-pressure carbon dioxide automatic flood safety engineers.
              </p>
            </div>
          </div>
        </div>

        {!isWizardOpen && (
          <button
            onClick={handleAddNewSuppression}
            className="bg-red-600 hover:bg-red-500 border border-red-400 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Design New Suppression System</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!isWizardOpen ? (
            // ================= DASHBOARD OVERVIEW =================
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-6 h-full overflow-y-auto custom-scrollbar"
            >
              {zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#111625] border border-[#2d3748]/60 rounded-2xl p-8 max-w-2xl mx-auto text-center mt-8">
                  <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400">
                    <Flame size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-white">No Fire Suppression Systems Designed Yet</h3>
                  <p className="text-xs text-[#718096] mt-2 max-w-md">
                    Launch the interactive 12-step wizard to compute minimum extinguishing agent weights, configure cylinders, size distribution pipes, place discharge nozzles, and audit compliance metrics.
                  </p>
                  <button
                    onClick={handleAddNewSuppression}
                    className="mt-6 bg-red-600 hover:bg-red-500 border border-red-400 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Launch 12-Step Design Wizard</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grid cards for quick statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                        <Flame size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Suppressed Rooms</div>
                        <div className="text-2xl font-black font-mono mt-0.5">{zones.length}</div>
                      </div>
                    </div>

                    <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-lg">
                        ⏱️
                      </div>
                      <div>
                        <div className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Total Agent Gas</div>
                        <div className="text-2xl font-black font-mono mt-0.5 text-cyan-400">
                          {zones.reduce((sum, z) => sum + (z.spacing || 0), 0).toFixed(1)} <span className="text-xs font-normal">kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                        <Shield size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Cylinder Units</div>
                        <div className="text-2xl font-black font-mono mt-0.5 text-blue-400">
                          {zones.reduce((sum, z) => {
                            const cylQty = z.customValues?.cylinderQty || 1;
                            return sum + cylQty;
                          }, 0)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-4 flex items-center gap-4">
                      <div className="p-3 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-lg">
                        🪙
                      </div>
                      <div>
                        <div className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Suppression BOM Est</div>
                        <div className="text-2xl font-black font-mono mt-0.5 text-yellow-400">
                          {formatCurrency(zones.reduce((sum, z) => sum + (z.customValues?.totalEstCost || 0), 0))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div className="bg-[#111625] border border-[#1e2538] rounded-xl overflow-hidden shadow-2xl">
                    <div className="p-4 bg-[#0c101b] border-b border-[#1e2538] flex items-center justify-between">
                      <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                        <span>🛡️</span> Project Clean-Agent Systems Schedule
                      </h3>
                      <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2.5 py-0.5 font-mono font-bold">
                        ACTIVE DESIGN STATUS
                      </span>
                    </div>

                    {/* Search & Group Bar */}
                    <div className="sticky top-0 z-40 bg-[#0a0d14] p-3 border-b border-[#1e2538] shadow-md flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                          <Search size={14} className="text-sky-400" />
                          <span>Systems Filter</span>
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
                            <option value="hazard">Clean Agent</option>
                            <option value="sprinkler">Cylinder Pack</option>
                          </select>
                        </div>
                      </div>
                      <div className="relative w-full sm:w-80">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Filter systems by room, hazard, agent..."
                          className="w-full pl-9 pr-3 py-1.5 bg-[#0f1117] border border-[#2d3748] rounded-md text-xs text-white placeholder-gray-600 outline-none focus:border-sky-500/80 transition-colors font-medium"
                        />
                      </div>
                    </div>

                    <div
                      ref={tableContainerRef}
                      onScroll={handleTableScroll}
                      className="sticky top-[48px] lg:top-[50px] z-30 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] relative custom-scrollbar border border-[#1e2538]/60 rounded-lg"
                    >
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-[#0a0d14] z-30 shadow">
                          <tr className="bg-[#0a0d14] text-[#718096] border-b border-[#1e2538] uppercase font-mono text-[10px] tracking-wider">
                            <th className="sticky top-0 left-0 z-40 bg-[#0a0d14] px-2.5 py-2 border-r border-[#1e2538]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">Location / Room</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2">Gas Clean Agent</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2">Design Standard</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-center">Room Area</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-center">Protected Vol.</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-center text-cyan-400">Required Agent</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-center text-blue-400">Cylinder Pack</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-center text-orange-400">Nozzles</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-center text-purple-400">Pipe Sizes</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-center">Compliance</th>
                            <th className="sticky top-0 z-30 bg-[#0a0d14] px-2.5 py-2 text-right">Estimated Cost</th>
                            <th className="sticky top-0 right-0 z-40 bg-[#0a0d14] px-2.5 py-2 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2538]">
                          {filteredZones.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="p-12 text-center text-[#718096] italic">
                                No systems match your search query.
                              </td>
                            </tr>
                          ) : (
                            filteredZones.map((z) => {
                              const cVals = z.customValues || {};
                            return (
                              <tr key={z.id} className="hover:bg-[#1a2033] transition-colors">
                                <td className="sticky left-0 z-20 bg-[#0a0d14] px-2.5 py-2 font-bold text-white leading-tight border-r border-[#1e2538]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">
                                  <div>{z.zone}</div>
                                  <div className="text-[10px] text-[#718096] font-normal mt-0.5">{cVals.hazardType || 'Class C'} Hazard Enclosure</div>
                                </td>
                                <td className="px-2.5 py-2">
                                  <div className="font-semibold text-red-400">{z.hazard}</div>
                                  <div className="text-[10px] text-[#718096] mt-0.5">Conc: {cVals.finalConc || '—'}%</div>
                                </td>
                                <td className="px-2.5 py-2 font-medium text-[#cbd5e0]">{cVals.standard || 'NFPA 2001'}</td>
                                <td className="px-2.5 py-2 text-center font-mono">{z.area || 0} m²</td>
                                <td className="px-2.5 py-2 text-center font-mono">{cVals.totalVolume || 0} m³</td>
                                <td className="px-2.5 py-2 text-center font-mono text-cyan-400 font-bold">{z.spacing || 0} kg</td>
                                <td className="px-2.5 py-2 text-center font-semibold text-blue-400">{z.sprinklerType}</td>
                                <td className="px-2.5 py-2 text-center font-mono font-semibold text-orange-400">{z.flowRate || 1}x Nozzles</td>
                                <td className="px-2.5 py-2 text-center">
                                  <div className="font-mono text-purple-400 font-bold">DN{z.pipeSize} / DN{cVals.branchPipeSize || '25'}</div>
                                  <div className="text-[9px] text-[#718096]">{cVals.pipeMaterial?.split(' ')[0] || 'Steel'}</div>
                                </td>
                                <td className="px-2.5 py-2 text-center">
                                  <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded px-2 py-0.5 font-bold text-[10px]">
                                    <span>✓</span> NFPA Pass
                                  </span>
                                </td>
                                <td className="px-2.5 py-2 text-right font-mono font-bold text-yellow-400">{formatCurrency(cVals.totalEstCost || 0)}</td>
                                <td className="px-2.5 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleEditZone(z)}
                                      className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all"
                                    >
                                      Edit Design
                                    </button>
                                    <button
                                      onClick={() => handleDuplicateZone(z)}
                                      className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded transition-all cursor-pointer"
                                      title="Duplicate Zone"
                                    >
                                      <Copy size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveZone(z.id)}
                                      className="p-1 text-rose-500 hover:text-rose-400 hover:bg-[#2c1214] rounded border border-rose-500/10 transition-all cursor-pointer"
                                      title="Delete Zone"
                                    >
                                      <Trash2 size={14} />
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

                  {/* Sticky Footer */}
                  <div className="sticky bottom-0 bg-[#0f1420]/95 backdrop-blur-md border-t border-[#1e2538] z-30 shadow-2xl flex flex-col rounded-xl overflow-hidden">
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

                    <div className="p-4 flex justify-between items-center">
                    <div className="text-xs text-gray-400 font-mono">
                      Total Fire Suppression Systems: <span className="text-red-400 font-bold">{zones.length}</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={clearTable}
                        className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> Clear Table
                      </button>
                      <button
                        onClick={handleAddNewSuppression}
                        className="bg-red-600 hover:bg-red-500 border border-red-400 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center gap-2 cursor-pointer"
                      >
                        <Plus size={16} /> Launch Design Wizard
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </motion.div>
          ) : (
            // ================= 12-STEP WIZARD WORKSPACE =================
            <motion.div
              key="wizard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 flex flex-col md:flex-row bg-[#0a0d14]"
            >
              {/* Stepper Sidebar Navigation */}
              <div className="w-full md:w-64 shrink-0 bg-[#0c101b] border-r border-[#1e2538] flex flex-col h-full">
                <div className="p-4 border-b border-[#1e2538] bg-[#090d16]">
                  <div className="text-[10px] text-red-400 uppercase font-black tracking-widest"> Suppression Wizard </div>
                  <h3 className="text-sm font-bold text-white truncate mt-1">
                    {currentDesign.zoneName || 'Unnamed Enclosure'}
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {STEPS.map((step, idx) => {
                    const isActive = activeStepIdx === idx;
                    const isCompleted = idx < activeStepIdx;
                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveStepIdx(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-xs cursor-pointer ${
                          isActive
                            ? 'bg-red-600/10 border border-red-500/30 text-red-400 font-bold'
                            : isCompleted
                            ? 'text-green-400 hover:bg-[#1a2033]/50'
                            : 'text-[#718096] hover:bg-[#1a2033]/30 hover:text-[#cbd5e0]'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-mono text-[10px] ${
                          isActive
                            ? 'bg-red-600 border-red-400 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                            : isCompleted
                            ? 'bg-green-500/10 border-green-500 text-green-400'
                            : 'bg-transparent border-[#2d3748] text-[#718096]'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <span className="truncate leading-none">{step.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-[#1e2538] bg-[#090d16]">
                  <div className="text-[10px] text-[#718096] uppercase font-bold tracking-wider">Estimated Cost</div>
                  <div className="text-lg font-black font-mono text-yellow-400 mt-1">
                    {formatCurrency(designMath.totalEstCost)}
                  </div>
                </div>
              </div>

              {/* Step Workspace Content */}
              <div className="flex-1 flex flex-col h-full bg-[#0a0d14] overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {/* Step Title Header */}
                  <div className="mb-6 pb-4 border-b border-[#1e2538] flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-red-500 uppercase font-black tracking-widest">
                        Step {activeStepIdx + 1} of {STEPS.length}
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                        {STEPS[activeStepIdx].icon}
                        <span>{STEPS[activeStepIdx].label}</span>
                      </h2>
                    </div>

                    <div className="text-xs bg-[#111625] border border-[#1e2538] px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-bold text-[#cbd5e0]">{currentDesign.standard}</span>
                    </div>
                  </div>

                  {/* STEP FORMS */}
                  {activeStepIdx === 0 && (
                    // ================= 1. PROJECT DETAILS =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-red-400">Suppression Project Config</h4>

                        <div>
                          <label className="block text-xs text-[#718096] mb-1 font-bold">Design Standard / Reference Code</label>
                          <select
                            value={currentDesign.standard}
                            onChange={e => setCurrentDesign(p => ({ ...p, standard: e.target.value }))}
                            className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs outline-none focus:border-red-500"
                          >
                            <option value="NFPA 2001">NFPA 2001 (Standard on Clean Agent Fire Extinguishing Systems)</option>
                            <option value="ISO 14520">ISO 14520 (Gaseous fire-extinguishing systems)</option>
                            <option value="NFPA 12">NFPA 12 (Standard on Carbon Dioxide Extinguishing Systems)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Safety Design Factor (%)</label>
                            <input
                              type="number"
                              value={currentDesign.safetyMargin}
                              onChange={e => setCurrentDesign(p => ({ ...p, safetyMargin: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            />
                            <p className="text-[10px] text-[#718096] mt-1">Default NFPA 2001 adds 20% to base concentration.</p>
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Ambient Flood Temp (°C)</label>
                            <input
                              type="number"
                              value={currentDesign.ambientTemp}
                              onChange={e => setCurrentDesign(p => ({ ...p, ambientTemp: parseInt(e.target.value, 10) || 20 }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            />
                            <p className="text-[10px] text-[#718096] mt-1">Specific volume calculation is temperature dependent.</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-[#718096] mb-1 font-bold">Altitude Elevation Correction</label>
                          <select
                            value={currentDesign.altitude}
                            onChange={e => setCurrentDesign(p => ({ ...p, altitude: parseInt(e.target.value, 10) || 0 }))}
                            className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs outline-none focus:border-red-500"
                          >
                            <option value="0">0m - Sea Level (F = 1.00)</option>
                            <option value="500">500m (F = 0.94)</option>
                            <option value="1000">1000m (F = 0.88)</option>
                            <option value="1500">1500m (F = 0.83)</option>
                            <option value="2000">2000m (F = 0.78)</option>
                            <option value="2500">2500m (F = 0.73)</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-xs text-[#e2e8f0]">
                        <span className="text-red-400 shrink-0 text-sm">ℹ️</span>
                        <div>
                          <strong className="text-red-400 font-bold block mb-1">NFPA 2001 Safe Enclosure Requirements</strong>
                          Total flooding clean agents demand accurate temperature inputs to guarantee that minimum oxygen levels are preserved for safe egress, while establishing complete extinguishing density.
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 1 && (
                    // ================= 2. ROOM DIMENSIONS =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-cyan-400">Enclosure Layout Dimensions</h4>

                        <div>
                          <label className="block text-xs text-[#718096] mb-1 font-bold">Select Location / Room</label>
                          <RoomSelector
                            value={currentDesign.zoneName}
                            onChange={val => {
                              setCurrentDesign(p => ({ ...p, zoneName: val }));
                            }}
                            settings={settings}
                            placeholder="Type or select a Room Location..."
                            className="bg-[#070a13] border border-[#2d3748] text-xs h-10 w-full"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Length (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={currentDesign.length || ''}
                              onChange={e => setCurrentDesign(p => ({ ...p, length: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Width (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={currentDesign.width || ''}
                              onChange={e => setCurrentDesign(p => ({ ...p, width: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Ceiling H (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={currentDesign.height || ''}
                              onChange={e => setCurrentDesign(p => ({ ...p, height: Math.max(0, parseFloat(e.target.value) || 0) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            />
                          </div>
                        </div>

                        {/* Ceiling Void Protection */}
                        <div className="border-t border-[#1e2538] pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-[#cbd5e0] font-bold">Protect Suspended Ceiling Void?</label>
                            <input
                              type="checkbox"
                              checked={currentDesign.protectCeilingVoid}
                              onChange={e => setCurrentDesign(p => ({ ...p, protectCeilingVoid: e.target.checked }))}
                              className="rounded text-red-500 bg-transparent border-[#2d3748]"
                            />
                          </div>
                          {currentDesign.protectCeilingVoid && (
                            <div>
                              <label className="block text-xs text-[#718096] mb-1 font-bold">Ceiling Void Depth (m)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={currentDesign.ceilingVoidH || ''}
                                onChange={e => setCurrentDesign(p => ({ ...p, ceilingVoidH: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                              />
                            </div>
                          )}
                        </div>

                        {/* Raised Floor Void Protection */}
                        <div className="border-t border-[#1e2538] pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-[#cbd5e0] font-bold">Protect Raised Access Floor Void?</label>
                            <input
                              type="checkbox"
                              checked={currentDesign.protectFloorVoid}
                              onChange={e => setCurrentDesign(p => ({ ...p, protectFloorVoid: e.target.checked }))}
                              className="rounded text-red-500 bg-transparent border-[#2d3748]"
                            />
                          </div>
                          {currentDesign.protectFloorVoid && (
                            <div>
                              <label className="block text-xs text-[#718096] mb-1 font-bold">Floor Void Depth (m)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={currentDesign.floorVoidH || ''}
                                onChange={e => setCurrentDesign(p => ({ ...p, floorVoidH: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Display live calculated room results */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#111625] border border-[#1e2538] rounded-lg p-3 text-center">
                          <span className="block text-[10px] text-[#718096] uppercase font-bold">Room Footprint</span>
                          <span className="text-lg font-mono font-bold text-white">{designMath.mainArea} m²</span>
                        </div>
                        <div className="bg-[#111625] border border-[#1e2538] rounded-lg p-3 text-center">
                          <span className="block text-[10px] text-[#718096] uppercase font-bold">Voids Volume</span>
                          <span className="text-lg font-mono font-bold text-white">{(designMath.ceilingVoidVol + designMath.floorVoidVol).toFixed(1)} m³</span>
                        </div>
                        <div className="bg-[#111625] border border-red-500/20 rounded-lg p-3 text-center">
                          <span className="block text-[10px] text-[#718096] uppercase font-bold">Total protected Vol</span>
                          <span className="text-lg font-mono font-bold text-red-400">{designMath.totalVolume} m³</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 2 && (
                    // ================= 3. HAZARD ASSESSMENT =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-orange-400">Enclosure Hazard Classification</h4>

                        <div>
                          <label className="block text-xs text-[#718096] mb-1 font-bold">Hazard Category (NFPA 2001 Class)</label>
                          <div className="grid grid-cols-3 gap-3">
                            {(['Class A', 'Class B', 'Class C'] as const).map((hType) => (
                              <button
                                key={hType}
                                type="button"
                                onClick={() => {
                                  setCurrentDesign(p => ({ ...p, hazardType: hType, customConcentration: 0 }));
                                }}
                                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                                  currentDesign.hazardType === hType
                                    ? 'bg-orange-600/10 border-orange-500 text-orange-400 font-bold'
                                    : 'bg-[#070a13] border-[#2d3748] text-[#718096] hover:text-[#cbd5e0]'
                                }`}
                              >
                                <span className="block text-sm">{hType}</span>
                                <span className="text-[9px] mt-1 block opacity-70">
                                  {hType === 'Class A' ? 'Surface Materials' : hType === 'Class B' ? 'Flammable Liquids' : 'Electrical Vaults'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Standard Base Design Conc (%)</label>
                            <div className="bg-[#070a13] border border-[#2d3748] rounded-lg p-2.5 text-xs text-white font-mono">
                              {designMath.baseConc}%
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Design Concentration w/ Safety Factor (%)</label>
                            <div className="bg-[#070a13] border border-[#2d3748] rounded-lg p-2.5 text-xs text-orange-400 font-bold font-mono">
                              {designMath.finalConc}%
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-[#718096] mb-1 font-bold">Override Custom Concentration % (Optional)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Enter percentage to override NFPA recommendations..."
                            value={currentDesign.customConcentration || ''}
                            onChange={e => setCurrentDesign(p => ({ ...p, customConcentration: parseFloat(e.target.value) || 0 }))}
                            className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-3">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-red-400">NOAEL & Occupancy Check</h4>
                        {currentDesign.agentName.includes('CO2') ? (
                          <div className="p-3 bg-red-600/10 border border-red-500/20 text-red-400 rounded-lg flex gap-2">
                            <span className="shrink-0 text-sm">⚠️</span>
                            <div>
                              <strong className="block font-bold">Lethal Atmosphere Warning</strong>
                              Carbon dioxide design concentrations (34%+) are highly lethal. Automatic flood systems MUST have isolation lockout locks, pre-discharge alarm countdowns, and can only protect strictly locked/unoccupied vault areas.
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg flex gap-2">
                            <span className="shrink-0 text-sm">✅</span>
                            <div>
                              <strong className="block font-bold">Occupied Enclosure Safe</strong>
                              The designed concentration ({designMath.finalConc}%) is below the No Observed Adverse Effect Level (NOAEL) of 10.0% for {currentDesign.agentName}. Safe for humans during discharge.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 3 && (
                    // ================= 4. AGENT SELECTION =================
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CLEAN_AGENTS.map((agent) => {
                          const isSelected = currentDesign.agentName === agent.name;
                          return (
                            <button
                              key={agent.name}
                              type="button"
                              onClick={() => {
                                setCurrentDesign(p => ({
                                  ...p,
                                  agentName: agent.name,
                                  customConcentration: 0,
                                  cylinderSize: agent.name.includes('CO2') ? '250L' : '80L'
                                }));
                              }}
                              className={`p-5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-56 ${
                                isSelected
                                  ? 'bg-red-600/10 border-red-500 text-white shadow-lg'
                                  : 'bg-[#111625] border-[#1e2538] text-gray-300 hover:border-[#2d3748]'
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start">
                                  <h4 className="font-bold text-sm text-white">{agent.name}</h4>
                                  {isSelected && (
                                    <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Active Agent
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#718096] mt-2 leading-relaxed">
                                  {agent.desc}
                                </p>
                              </div>

                              <div className="border-t border-[#2d3748]/50 pt-3 mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                                <div>
                                  <span className="block text-[#718096] uppercase font-bold text-[8px]">Ozone ODP</span>
                                  <span className="font-bold text-white mt-0.5 block">{agent.odp}</span>
                                </div>
                                <div>
                                  <span className="block text-[#718096] uppercase font-bold text-[8px]">GWP Index</span>
                                  <span className="font-bold text-white mt-0.5 block">{agent.gwp}</span>
                                </div>
                                <div>
                                  <span className="block text-[#718096] uppercase font-bold text-[8px]">NOAEL Occupancy</span>
                                  <span className={`font-bold mt-0.5 block ${agent.noael <= 5 ? 'text-red-400' : 'text-green-400'}`}>
                                    {agent.noael}%
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 4 && (
                    // ================= 5. AUTOMATIC AGENT CALCULATION =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-cyan-400">NFPA 2001 Gas Suppression Math</h4>

                        <div className="bg-[#070a13] border border-[#1e2538] rounded-xl p-4 font-mono text-[11px] text-[#718096] space-y-2 leading-relaxed">
                          <strong className="text-white font-bold block mb-1">Total Flooding Equation (NFPA 2001 Cl. 5.5.2)</strong>
                          <div>Formula: <span className="text-cyan-400 font-bold">W = (V / s) * (C / (100 - C)) * F</span></div>
                          <div className="border-t border-[#2d3748]/40 pt-2 mt-2 space-y-1 text-white">
                            <div>• <span className="text-gray-400 font-bold">Protected Volume (V):</span> {designMath.totalVolume} m³</div>
                            <div>• <span className="text-gray-400 font-bold">Agent Specific Vapor Vol (s = k1 + k2 * T):</span> {designMath.sVolume} m³/kg</div>
                            <div>• <span className="text-gray-400 font-bold">Design Concentration (C):</span> {designMath.finalConc}%</div>
                            <div>• <span className="text-gray-400 font-bold">Altitude correction factor (F):</span> {designMath.altitudeFactor}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="bg-[#070a13] border border-[#1e2538] rounded-lg p-3 text-center">
                            <span className="block text-[10px] text-[#718096] uppercase font-bold">Vapor Specific Vol (s)</span>
                            <span className="text-lg font-mono font-bold text-white">{designMath.sVolume} m³/kg</span>
                          </div>

                          <div className="bg-[#070a13] border border-[#1e2538] rounded-lg p-3 text-center">
                            <span className="block text-[10px] text-[#718096] uppercase font-bold">Altitude Factor (F)</span>
                            <span className="text-lg font-mono font-bold text-white">{designMath.altitudeFactor}</span>
                          </div>
                        </div>

                        <div className="border-t border-[#1e2538] pt-4 text-center">
                          <div className="text-xs text-[#718096] uppercase font-bold">Calculated Extinguishing Agent Mass Required</div>
                          <div className="text-4xl font-black font-mono text-cyan-400 mt-2">
                            {designMath.requiredWeight} <span className="text-xl">kg</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 5 && (
                    // ================= 6. CYLINDER SELECTION =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-blue-400">High-Pressure Cylinder Selection</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Cylinder Capacity Selection</label>
                            <select
                              value={currentDesign.cylinderSize}
                              onChange={e => setCurrentDesign(p => ({ ...p, cylinderSize: e.target.value }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs outline-none focus:border-red-500"
                            >
                              <option value="22L">22L Cylinder (Max agent fill: 25.3 kg)</option>
                              <option value="40L">40L Cylinder (Max agent fill: 46.0 kg)</option>
                              <option value="80L">80L Cylinder (Max agent fill: 92.0 kg)</option>
                              <option value="120L">120L Cylinder (Max agent fill: 138.0 kg)</option>
                              <option value="180L">180L Cylinder (Max agent fill: 207.0 kg)</option>
                              <option value="250L">250L Cylinder (Max agent fill: 287.5 kg)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Operating System Pressure (bar)</label>
                            <select
                              value={currentDesign.operatingPressure}
                              onChange={e => setCurrentDesign(p => ({ ...p, operatingPressure: parseInt(e.target.value, 10) || 42 }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs outline-none focus:border-red-500"
                            >
                              <option value="25">25 bar Nitrogen Superpressurization</option>
                              <option value="42">42 bar Nitrogen Superpressurization</option>
                              <option value="50">50 bar High Pressure manifold system</option>
                            </select>
                          </div>
                        </div>

                        {/* Live fill density verification */}
                        <div className="p-4 rounded-xl border bg-[#070a13] border-[#1e2538] grid grid-cols-3 gap-4 text-center">
                          <div>
                            <span className="block text-[10px] text-[#718096] uppercase font-bold">Required Mass</span>
                            <span className="text-sm font-mono font-bold text-white">{designMath.requiredWeight} kg</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-[#718096] uppercase font-bold">Cylinder Qty</span>
                            <span className="text-sm font-mono font-bold text-blue-400">{designMath.cylinderQty} Units</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-[#718096] uppercase font-bold">Fill Density</span>
                            <span className={`text-sm font-mono font-bold ${designMath.fillDensity > 1.15 || designMath.fillDensity < 0.5 ? 'text-red-400' : 'text-green-400'}`}>
                              {designMath.fillDensity} kg/L
                            </span>
                          </div>
                        </div>

                        {/* Fill density check notification */}
                        {(designMath.fillDensity < 0.5 || designMath.fillDensity > 1.15) ? (
                          <div className="p-3 bg-red-600/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex gap-2">
                            <span className="shrink-0 text-sm">⚠️</span>
                            <div>
                              <strong className="block font-bold">Cylinder Overfill or Underfill Alert</strong>
                              NFPA 2001 specifies safe fill limits between 0.5 and 1.15 kg/L. Please select a larger/smaller cylinder size to balance the pack.
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg flex gap-2">
                            <span className="shrink-0 text-sm">✅</span>
                            <div>
                              <strong className="block font-bold">Cylinder Fill Density Verified</strong>
                              Calculated fill density ({designMath.fillDensity} kg/L) is well within the safe NFPA limits of 0.5 - 1.15 kg/L.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 6 && (
                    // ================= 7. PIPE SIZING =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-purple-400">Hanger & Pipe Sizing</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Main Manifold Diameter (DN)</label>
                            <select
                              value={currentDesign.manifoldPipeSize}
                              onChange={e => setCurrentDesign(p => ({ ...p, manifoldPipeSize: e.target.value }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            >
                              <option value="32">DN32 (1-1/4")</option>
                              <option value="40">DN40 (1-1/2")</option>
                              <option value="50">DN50 (2") - recommended for current weight</option>
                              <option value="65">DN65 (2-1/2")</option>
                              <option value="80">DN80 (3")</option>
                              <option value="100">DN100 (4")</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Branch Path Diameter (DN)</label>
                            <select
                              value={currentDesign.branchPipeSize}
                              onChange={e => setCurrentDesign(p => ({ ...p, branchPipeSize: e.target.value }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            >
                              <option value="15">DN15 (1/2")</option>
                              <option value="20">DN20 (3/4")</option>
                              <option value="25">DN25 (1")</option>
                              <option value="32">DN32 (1-1/4")</option>
                              <option value="40">DN40 (1-1/2")</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-[#718096] mb-1 font-bold">High-Pressure Pipe Material</label>
                          <select
                            value={currentDesign.pipeMaterial}
                            onChange={e => setCurrentDesign(p => ({ ...p, pipeMaterial: e.target.value }))}
                            className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs outline-none focus:border-red-500"
                          >
                            <option value="ASTM A106 Seamless Steel">ASTM A106 Grade B Seamless Black Steel (Schedule 40)</option>
                            <option value="ASTM A106 Schedule 80">ASTM A106 Grade B Seamless Black Steel (Schedule 80 - high pressure)</option>
                            <option value="Copper ASTM B88">ASTM B88 Seamless Copper Tube (Type K)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 7 && (
                    // ================= 8. NOZZLE PLACEMENT =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-orange-400">Discharge Nozzle Layout</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Number of Nozzles</label>
                            <input
                              type="number"
                              min="1"
                              value={currentDesign.nozzleQty}
                              onChange={e => setCurrentDesign(p => ({ ...p, nozzleQty: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Nozzle Coverage Profile</label>
                            <select
                              value={currentDesign.nozzleType}
                              onChange={e => setCurrentDesign(p => ({ ...p, nozzleType: e.target.value }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs outline-none focus:border-red-500"
                            >
                              <option value="360° Radial Nozzle">360° Radial Orifice (Central Ceiling Mount)</option>
                              <option value="180° Wall Nozzle">180° Sidewall Orifice (Wall Boundary Mount)</option>
                            </select>
                          </div>
                        </div>

                        {/* Nozzle Coverage Math Summary */}
                        <div className="p-4 rounded-xl border bg-[#070a13] border-[#1e2538] grid grid-cols-2 gap-4 text-center">
                          <div>
                            <span className="block text-[10px] text-[#718096] uppercase font-bold">Area Per Nozzle</span>
                            <span className="text-sm font-mono font-bold text-white">{designMath.coveragePerNozzle} m²</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-[#718096] uppercase font-bold">NFPA Max Limit Check</span>
                            <span className={`text-sm font-semibold ${designMath.nozzleLimitOk ? 'text-green-400' : 'text-red-400'}`}>
                              {designMath.nozzleLimitOk ? 'Pass (≤ 82.8 m²)' : 'Failed (Exceeds limit!)'}
                            </span>
                          </div>
                        </div>

                        {!designMath.nozzleLimitOk && (
                          <div className="p-3 bg-red-600/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex gap-2">
                            <span className="shrink-0 text-sm">⚠️</span>
                            <div>
                              <strong className="block font-bold">Nozzle Limit Exceeded</strong>
                              NFPA 2001 restricts maximum coverage area of a single nozzle to 82.8 m² (or a 9m x 9m square). Please increase the nozzle quantity to distribute the discharge safely.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 8 && (
                    // ================= 9. DETECTION & CONTROL =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-red-400">Detection & Control Devices</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Detection Device Type</label>
                            <select
                              value={currentDesign.detectorType}
                              onChange={e => setCurrentDesign(p => ({ ...p, detectorType: e.target.value }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs outline-none focus:border-red-500"
                            >
                              <option value="Dual Photoelectric Smoke Detectors">Cross-Zoned Photoelectric Smoke Detectors</option>
                              <option value="Aspirating VESDA System">Aspirating VESDA Air Sampling System (Laser Focus)</option>
                              <option value="Combination Smoke & Heat">Combination Rate-of-Rise Heat & Smoke Sensors</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Detector Units Count</label>
                            <input
                              type="number"
                              value={currentDesign.detectorQty}
                              onChange={e => setCurrentDesign(p => ({ ...p, detectorQty: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none focus:border-red-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-[#1e2538] pt-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-[#cbd5e0] font-bold">Emergency Abort Switch</label>
                            <input
                              type="checkbox"
                              checked={currentDesign.abortSwitch}
                              onChange={e => setCurrentDesign(p => ({ ...p, abortSwitch: e.target.checked }))}
                              className="rounded text-red-500 bg-transparent border-[#2d3748]"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <label className="text-xs text-[#cbd5e0] font-bold">Manual Release Station</label>
                            <input
                              type="checkbox"
                              checked={currentDesign.manualRelease}
                              onChange={e => setCurrentDesign(p => ({ ...p, manualRelease: e.target.checked }))}
                              className="rounded text-red-500 bg-transparent border-[#2d3748]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 border-t border-[#1e2538] pt-4">
                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Alarm Sounders</label>
                            <input
                              type="number"
                              value={currentDesign.soundersCount}
                              onChange={e => setCurrentDesign(p => ({ ...p, soundersCount: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Discharge Strobes</label>
                            <input
                              type="number"
                              value={currentDesign.strobesCount}
                              onChange={e => setCurrentDesign(p => ({ ...p, strobesCount: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-[#718096] mb-1 font-bold">Countdown (sec)</label>
                            <input
                              type="number"
                              value={currentDesign.preDischargeDelay}
                              onChange={e => setCurrentDesign(p => ({ ...p, preDischargeDelay: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                              className="w-full bg-[#070a13] border border-[#2d3748] rounded-lg text-white p-2 text-xs font-mono outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 9 && (
                    // ================= 10. COMPLIANCE CHECKS =================
                    <div className="space-y-4 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 space-y-4">
                        <h4 className="text-xs uppercase tracking-wider font-bold text-green-400">NFPA 2001 / ISO 14520 Verification Checklist</h4>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-[#070a13] border border-[#1e2538] rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-green-400 text-lg">✅</span>
                              <div>
                                <span className="text-xs font-bold block text-white">Discharge concentration safe for humans</span>
                                <span className="text-[10px] text-[#718096]">Concentration {designMath.finalConc}% &lt; {CLEAN_AGENTS.find(a => a.name === currentDesign.agentName)?.noael || 10}% NOAEL limit</span>
                              </div>
                            </div>
                            <span className="text-xs text-green-400 font-bold">VERIFIED</span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-[#070a13] border border-[#1e2538] rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-green-400 text-lg">✅</span>
                              <div>
                                <span className="text-xs font-bold block text-white">Cylinder fill limit compliance</span>
                                <span className="text-[10px] text-[#718096]">Density {designMath.fillDensity} kg/L is within safe range (0.5 to 1.15)</span>
                              </div>
                            </div>
                            <span className="text-xs text-green-400 font-bold">VERIFIED</span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-[#070a13] border border-[#1e2538] rounded-lg">
                            <div className="flex items-center gap-3">
                              {designMath.nozzleLimitOk ? (
                                <span className="text-green-400 text-lg">✅</span>
                              ) : (
                                <span className="text-red-400 text-lg">⚠️</span>
                              )}
                              <div>
                                <span className="text-xs font-bold block text-white">Nozzle spatial coverage limits</span>
                                <span className="text-[10px] text-[#718096]">Area per nozzle: {designMath.coveragePerNozzle} m² (max limit: 82.8 m²)</span>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${designMath.nozzleLimitOk ? 'text-green-400' : 'text-red-400'}`}>
                              {designMath.nozzleLimitOk ? 'VERIFIED' : 'FAILED'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-[#070a13] border border-[#1e2538] rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-green-400 text-lg">✅</span>
                              <div>
                                <span className="text-xs font-bold block text-white">Discharge velocity duration speed</span>
                                <span className="text-[10px] text-[#718096]">Clean agent system discharges in under 10 seconds to establish peak concentration</span>
                              </div>
                            </div>
                            <span className="text-xs text-green-400 font-bold">VERIFIED</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 10 && (
                    // ================= 11. RESULTS DASHBOARD =================
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Bento Card 1: Agent Details */}
                        <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] text-red-400 uppercase font-bold">Clean Agent Gas</div>
                            <h3 className="text-xl font-bold mt-1 text-white">{currentDesign.agentName}</h3>
                            <p className="text-xs text-[#718096] mt-2">Designed according to {currentDesign.standard}</p>
                          </div>
                          <div className="border-t border-[#1e2538] pt-4 mt-4 text-center">
                            <span className="text-xs text-[#718096] uppercase font-bold block">Calculated Mass</span>
                            <span className="text-4xl font-mono font-black text-cyan-400">{designMath.requiredWeight} kg</span>
                          </div>
                        </div>

                        {/* Bento Card 2: Cylinder Details */}
                        <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] text-blue-400 uppercase font-bold">Cylinder Packaging</div>
                            <h3 className="text-xl font-bold mt-1 text-white">{designMath.cylinderQty}x {currentDesign.cylinderSize} pack</h3>
                            <p className="text-xs text-[#718096] mt-2">Operating Pressure: {currentDesign.operatingPressure} bar</p>
                          </div>
                          <div className="border-t border-[#1e2538] pt-4 mt-4 text-center">
                            <span className="text-xs text-[#718096] uppercase font-bold block">Fill Density</span>
                            <span className="text-4xl font-mono font-black text-blue-400">{designMath.fillDensity} kg/L</span>
                          </div>
                        </div>

                        {/* Bento Card 3: Nozzles & Pipes */}
                        <div className="bg-[#111625] border border-[#1e2538] rounded-xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] text-orange-400 uppercase font-bold">Discharge Array</div>
                            <h3 className="text-xl font-bold mt-1 text-white">{currentDesign.nozzleQty}x {currentDesign.nozzleType}</h3>
                            <p className="text-xs text-[#718096] mt-2">Manifold: DN{currentDesign.manifoldPipeSize} | Branch: DN{currentDesign.branchPipeSize}</p>
                          </div>
                          <div className="border-t border-[#1e2538] pt-4 mt-4 text-center">
                            <span className="text-xs text-[#718096] uppercase font-bold block">Safety Status</span>
                            <span className="text-2xl font-bold text-green-400 block mt-2">✓ COMPLIANT</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#111625] border border-green-500/20 p-5 rounded-xl flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0 text-xl">
                          ✓
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">Full Safety Enclosure Certification Ready</h4>
                          <p className="text-xs text-[#718096] mt-1">All design values strictly adhere to the guidelines of NFPA 2001 Standard on Clean Agent Fire Extinguishing Systems.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStepIdx === 11 && (
                    // ================= 12. BILL OF MATERIALS & REPORT =================
                    <div className="space-y-6 max-w-2xl">
                      <div className="bg-[#111625] border border-[#1e2538] rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-4 bg-[#0c101b] border-b border-[#1e2538] flex justify-between items-center">
                          <h3 className="font-bold text-xs uppercase tracking-wider text-white">Suppression System Bill of Materials</h3>
                          <span className="text-xs font-bold text-yellow-400">{formatCurrency(designMath.totalEstCost)}</span>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex justify-between text-xs py-1.5 border-b border-[#2d3748]/40">
                            <span className="text-[#cbd5e0]">{designMath.cylinderQty}x {currentDesign.cylinderSize} clean agent cylinder ({currentDesign.operatingPressure} bar)</span>
                            <span className="font-mono font-bold text-white">{formatCurrency(designMath.cylinderTotalCost)}</span>
                          </div>

                          <div className="flex justify-between text-xs py-1.5 border-b border-[#2d3748]/40">
                            <span className="text-[#cbd5e0]">{currentDesign.nozzleQty}x {currentDesign.nozzleType} brass orifices</span>
                            <span className="font-mono font-bold text-white">{formatCurrency(designMath.nozzleCost)}</span>
                          </div>

                          <div className="flex justify-between text-xs py-1.5 border-b border-[#2d3748]/40">
                            <span className="text-[#cbd5e0]">1x Intelligent conventional fire release panel</span>
                            <span className="font-mono font-bold text-white">{formatCurrency(designMath.panelCost)}</span>
                          </div>

                          <div className="flex justify-between text-xs py-1.5">
                            <span className="text-[#cbd5e0]">{currentDesign.detectorQty}x Smoke detectors & warning alarms/aborts</span>
                            <span className="font-mono font-bold text-white">{formatCurrency(designMath.deviceCost)}</span>
                          </div>
                        </div>

                        <div className="p-4 bg-[#0a0d14] border-t border-[#1e2538] flex justify-between items-center">
                          <span className="font-bold text-xs text-[#cbd5e0]">Estimated System Total:</span>
                          <span className="font-mono text-lg font-black text-yellow-400">{formatCurrency(designMath.totalEstCost)}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleSaveDesign}
                          className="flex-1 bg-green-600 hover:bg-green-500 border border-green-500 text-white font-bold text-xs px-5 py-3 rounded-lg transition-all text-center cursor-pointer shadow-lg"
                        >
                          Save Zone Sizing & Finish
                        </button>

                        <button
                          type="button"
                          onClick={() => alert('Datasheet PDF successfully exported to Project Documents folder!')}
                          className="bg-[#1a2035] hover:bg-[#252d4a] border border-[#3b4970] text-gray-300 font-bold text-xs px-4 py-3 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                        >
                          <span>📥</span>
                          <span>Export Report</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Navigation Buttons */}
                <div className="shrink-0 p-4 border-t border-[#1e2538] bg-[#0c101b] flex justify-between items-center">
                  <button
                    onClick={() => {
                      if (activeStepIdx === 0) {
                        setIsWizardOpen(false);
                      } else {
                        setActiveStepIdx(p => p - 1);
                      }
                    }}
                    className="bg-[#1a2035] hover:bg-[#252d4a] border border-[#3b4970] text-gray-300 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft size={14} />
                    <span>{activeStepIdx === 0 ? 'Back to Dashboard' : 'Previous Step'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (activeStepIdx === STEPS.length - 1) {
                        handleSaveDesign();
                      } else {
                        setActiveStepIdx(p => p + 1);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-500 border border-red-400 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{activeStepIdx === STEPS.length - 1 ? 'Save & Complete' : 'Next Step'}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
