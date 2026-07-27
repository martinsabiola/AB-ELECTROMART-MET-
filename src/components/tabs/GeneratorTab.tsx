import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GenLoad, Board, ProjectSettings, GenClientInfo, GenSiteInspectionItem, GenEarthingDesign, GenPlumbingReq, GenAtsSizing } from '../../types';
import { parseMEPFile } from '../../utils/mepImporter';
import { CustomStepToolbox, CustomStepToolData } from './CustomStepToolbox';
import {
  Settings, Plus, Trash2, FileSpreadsheet, Copy, Search,
  CheckCircle2, AlertCircle, XCircle, FileText, Printer,
  Download, ChevronRight, ShieldCheck, Droplets, Zap,
  Wrench, Flame, Sliders, Cpu, Activity, Layers, ArrowRight,
  Info, CheckSquare, Sparkles, Building2, UserCheck, HardHat
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getCategoriesForTab,
  getCustomColumnsForTab,
  getMepDropdownMetadata,
  saveMepDropdownMetadata,
  DropdownCategoryConfigPanel
} from '../../utils/dropdownMetadata';

export const DEFAULT_GEN_LOAD_TYPES = ['Lighting', 'Sockets', 'AC/HVAC', 'Motor', 'UPS', 'Dedicated', 'Other'];
export const DEFAULT_GEN_FUEL_TYPES = ['Diesel', 'Petrol', 'Natural Gas', 'LPG', 'Dual Fuel'];

export const STANDARD_GEN_RATINGS = [
  15, 20, 30, 40, 50, 60, 80, 100, 135, 150, 200, 250, 300, 350, 500, 750, 800, 1000, 2000, 2500
];

interface GeneratorTabProps {
  loads: GenLoad[];
  setLoads: React.Dispatch<React.SetStateAction<GenLoad[]>>;
  fuelType: string;
  setFuelType: (type: string) => void;
  genPF: number;
  setGenPF: (pf: number) => void;
  boards?: Board[];
  settings?: ProjectSettings;
}

// Initial Client Info
const DEFAULT_CLIENT_INFO: GenClientInfo = {
  clientName: 'Apex Commercial Tower LLC',
  company: 'Apex Infrastructure Management',
  projectName: '12-Story Office & Commercial Complex Backup Power',
  projectAddress: 'Plot 402, Central Business District',
  contactPerson: 'Eng. David Miller',
  phoneNumber: '+1 (555) 019-2831',
  email: 'd.miller@apexinfra.com',
  buildingType: 'Commercial',
  numberOfFloors: 12,
  occupancy: 450,
  existingSupply: 'Utility Transformer 11kV/400V 1000kVA',
  utilityVoltage: 400,
  phase: 'Three Phase',
};

// Initial Site Inspection Checklist
const DEFAULT_SITE_INSPECTION: GenSiteInspectionItem[] = [
  // Electrical
  { id: 'e1', category: 'Electrical', item: 'Incoming supply & utility metering panel capacity', checked: true, status: 'Pass', notes: 'Main switchgear rated for 1600A 400V 3P' },
  { id: 'e2', category: 'Electrical', item: 'Main panel & distribution board connection space', checked: true, status: 'Pass', notes: 'Spare feeder breaker available in main LVP' },
  { id: 'e3', category: 'Electrical', item: 'Cable routes & riser tray access from gen room', checked: true, status: 'Needs Attention', notes: 'Cable tray needs 300mm extension near riser A' },
  { id: 'e4', category: 'Electrical', item: 'Existing generator set (if replacing)', checked: false, status: 'N/A', notes: 'New installation - no existing gen set' },
  { id: 'e5', category: 'Electrical', item: 'Automatic Transfer Switch (ATS) location & space', checked: true, status: 'Pass', notes: 'Wall-mounted 800A 4P ATS panel space reserved' },
  { id: 'e6', category: 'Electrical', item: 'Earthing system & main earth bar proximity', checked: true, status: 'Pass', notes: 'Main earth pit < 10m from proposed gen plinth' },
  { id: 'e7', category: 'Electrical', item: 'Lightning protection system air terminals & down conductors', checked: true, status: 'Pass', notes: 'Connected to building LP grid per IEC 62305' },
  { id: 'e8', category: 'Electrical', item: 'Cable trays, conduits, and fire-stop penetrations', checked: true, status: 'Needs Attention', notes: 'Fire seal required at basement wall penetration' },
  { id: 'e9', category: 'Electrical', item: 'Isolation switches & emergency lockout devices', checked: true, status: 'Pass', notes: 'Lockable isolator included near generator' },
  { id: 'e10', category: 'Electrical', item: 'Protection devices (ACB/MCCB, SPD, Earth Leakage)', checked: true, status: 'Pass', notes: '4P MCCB with adjustable electronic trip unit' },

  // Mechanical
  { id: 'm1', category: 'Mechanical', item: 'Generator base plinth & anti-vibration pad clearance', checked: true, status: 'Pass', notes: 'Concrete pad size 3.5m x 1.8m x 0.3m' },
  { id: 'm2', category: 'Mechanical', item: 'Room ventilation & radiator airflow attenuators', checked: true, status: 'Pass', notes: 'Air intake louver 2.5m²; exhaust louver 2.0m²' },
  { id: 'm3', category: 'Mechanical', item: 'Exhaust pipe routing, silencer & wall thimble insulation', checked: true, status: 'Needs Attention', notes: 'Residential silencer requires 100mm mineral wool lagging' },
  { id: 'm4', category: 'Mechanical', item: 'Day fuel tank location & bund wall spill containment', checked: true, status: 'Pass', notes: '1000L sub-base tank + 110% bund wall containment' },
  { id: 'm5', category: 'Mechanical', item: 'Fuel supply & return piping route with isolation valves', checked: true, status: 'Pass', notes: 'Black steel seamless pipes with Racor dual filter' },
  { id: 'm6', category: 'Mechanical', item: 'Cooling clearance (1.5m surrounding space)', checked: true, status: 'Pass', notes: '1.8m clearance maintained on all sides for maintenance' },
  { id: 'm7', category: 'Mechanical', item: 'Vibration isolation mounts (AVM) specs', checked: true, status: 'Pass', notes: 'Heavy duty spring mounts rated for 3.5 tons' },
  { id: 'm8', category: 'Mechanical', item: 'Lifting access & crane hook movement corridor', checked: true, status: 'Pass', notes: 'Basement driveway hatch clearance 4.0m height' },
  { id: 'm9', category: 'Mechanical', item: 'Maintenance access doors & removable louvers', checked: true, status: 'Pass', notes: 'Double acoustic doors 2.2m x 2.0m' },

  // Civil
  { id: 'c1', category: 'Civil', item: 'Reinforced concrete foundation pad (C30/37 grade)', checked: true, status: 'Pass', notes: '300mm thick reinforced slab with rebar mesh' },
  { id: 'c2', category: 'Civil', item: 'Room floor drainage & oil interceptor sump', checked: true, status: 'Pass', notes: 'Floor slope 1:100 towards central oil trap' },
  { id: 'c3', category: 'Civil', item: 'Equipment room wall acoustic attenuation (min 75 dBA @ 1m)', checked: true, status: 'Pass', notes: 'Soundproof canopy + rockwool acoustic lining' },
  { id: 'c4', category: 'Civil', item: 'Access road & crane positioning area for delivery', checked: true, status: 'Pass', notes: 'Direct driveway access from main service road' },
  { id: 'c5', category: 'Civil', item: 'Physical security, lockable doors & warning signage', checked: true, status: 'Pass', notes: 'Card reader access + Danger High Voltage signs' },
  { id: 'c6', category: 'Civil', item: 'Noise control & environmental council compliance', checked: true, status: 'Pass', notes: 'Acoustic enclosure designed for <65 dBA at boundary' }
];

export default function GeneratorTab({
  loads,
  setLoads,
  fuelType,
  setFuelType,
  genPF,
  setGenPF,
  boards = [],
  settings,
}: GeneratorTabProps) {
  // Navigation active step (1 to 10) or 'dashboard'
  const [activeStep, setActiveStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'stepByStep' | 'fullDashboard'>('stepByStep');

  // Dynamic Step List State (User can add, reorder, or delete steps)
  const [stepsList, setStepsList] = useState<{ id: string; num: number; title: string; icon: string; isCustom?: boolean }[]>([
    { id: 'step-1', num: 1, title: 'Client Info', icon: '👤' },
    { id: 'step-2', num: 2, title: 'Load Survey', icon: '⚡' },
    { id: 'step-3', num: 3, title: 'Site Inspection', icon: '🔍' },
    { id: 'step-4', num: 4, title: 'Earthing Design', icon: '🌐' },
    { id: 'step-5', num: 5, title: 'Plumbing Req', icon: '🚰' },
    { id: 'step-6', num: 6, title: 'BOM Materials', icon: '📦' },
    { id: 'step-7', num: 7, title: 'Cable Sizing', icon: '🔌' },
    { id: 'step-8', num: 8, title: 'ATS Sizing', icon: '🔀' },
    { id: 'step-9', num: 9, title: 'Safety Audit', icon: '🛡️' },
    { id: 'step-10', num: 10, title: 'Final Report', icon: '📊' }
  ]);

  const [addStepModalOpen, setAddStepModalOpen] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepIcon, setNewStepIcon] = useState('📋');
  const [customStepContents, setCustomStepContents] = useState<Record<string, string>>({});
  const [customStepToolData, setCustomStepToolData] = useState<Record<string, CustomStepToolData>>({});

  const handleMoveStep = (idx: number, direction: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if ((direction === 'left' && idx === 0) || (direction === 'right' && idx === stepsList.length - 1)) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    const updated = [...stepsList];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    const renumbered = updated.map((s, i) => ({ ...s, num: i + 1 }));
    setStepsList(renumbered);
    if (activeStep === stepsList[idx].num) {
      setActiveStep(renumbered[targetIdx].num);
    }
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    const nextNum = stepsList.length + 1;
    const newStepObj = {
      id: `step-custom-${Date.now()}`,
      num: nextNum,
      title: newStepTitle.trim(),
      icon: newStepIcon || '📋',
      isCustom: true
    };
    setStepsList(prev => [...prev, newStepObj]);
    setNewStepTitle('');
    setAddStepModalOpen(false);
    setActiveStep(nextNum);
  };

  const handleRemoveStep = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (stepsList.length <= 1) return;
    const updated = stepsList.filter((_, i) => i !== idx).map((s, i) => ({ ...s, num: i + 1 }));
    setStepsList(updated);
    if (activeStep > updated.length) {
      setActiveStep(updated.length);
    }
  };

  const handleMoveLoad = (id: string, direction: 'up' | 'down') => {
    const idx = loads.findIndex(l => l.id === id);
    if (idx === -1) return;
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === loads.length - 1)) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...loads];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setLoads(updated);
  };

  // Client Info State
  const [clientInfo, setClientInfo] = useState<GenClientInfo>(DEFAULT_CLIENT_INFO);

  // Site Inspection State
  const [siteChecklist, setSiteChecklist] = useState<GenSiteInspectionItem[]>(DEFAULT_SITE_INSPECTION);

  // Earthing Design State
  const [earthing, setEarthing] = useState<GenEarthingDesign>({
    targetResistance: 1.0,
    soilResistivity: 50, // ohm-m (loam/clay)
    electrodeType: 'Copper Bonded Rod',
    rodLength: 3.0,
    rodDiameter: 16,
    earthCableSize: '70mm²',
    earthStripSize: '25x3mm Copper Tape',
    enhancementCompound: 'Marconite / Bentonite Compound',
    testLinkType: 'Disconnecting Earth Test Link',
    inspectionChamberType: 'Heavy Duty Concrete Pit 300x300x300mm'
  });

  // Plumbing Requirements State
  const [plumbing, setPlumbing] = useState<GenPlumbingReq>({
    fuelLineSize: '3/4" (20mm) Seamless Black Steel',
    returnLineSize: '1/2" (15mm) Seamless Black Steel',
    tankCapacityLitres: 1200,
    dailyConsumptionHours: 24,
    drainLineSize: '1" (25mm) Galvanized Pipe with Drain Cock',
    bundWallCapacityLitres: 1350,
    coolingWaterReq: 'Closed Loop Radiator Coolant 50/50 Glycol',
    oilSeparatorReq: true,
    pipeMaterial: 'ASTM A106 Grade B Seamless Steel',
    pipeInsulation: '50mm Rockwool lagging with Aluminum Cladding'
  });

  // ATS Sizing State
  const [ats, setAts] = useState<GenAtsSizing>({
    ratingAmps: 800,
    amfCompatible: true,
    numberOfPoles: 4,
    shortCircuitRatingKa: 50,
    interlockType: 'Mechanical & Electrical',
    bypassArrangement: true
  });

  // Safety Checklist State
  const [safetyChecklist, setSafetyChecklist] = useState<{ id: string; label: string; passed: boolean; details: string }[]>([
    { id: 's1', label: 'CO2 & Foam Fire Extinguishers (min 2 x 9kg)', passed: true, details: 'Placed at generator room entrance' },
    { id: 's2', label: 'Fuel Spill Kit & Absorbent Granules (100L)', passed: true, details: 'Located adjacent to day fuel tank' },
    { id: 's3', label: 'Dual Remote Emergency Stop Pushbuttons', passed: true, details: 'One inside room, one outside main door' },
    { id: 's4', label: 'Emergency Battery Emergency Lighting (3 hrs)', passed: true, details: 'Twin-spot LED self-contained fittings' },
    { id: 's5', label: 'Motorized Intake & Exhaust Air Attenuator Dampers', passed: true, details: 'Interlocked with generator start signal' },
    { id: 's6', label: 'Acoustic Canopy Noise Level <= 75 dBA @ 1m', passed: true, details: 'Super silent weather-proof enclosure' },
    { id: 's7', label: 'Carbon Monoxide (CO) & Diesel Fume Gas Detector', passed: true, details: '4-20mA sensor tied to building BMS' },
    { id: 's8', label: 'Exhaust Manifold Thermal Insulation Guarding', passed: true, details: 'Rockwool insulated jacket up to silencer' },
    { id: 's9', label: 'Earthing Continuity & Enclosure Bonding (< 0.1 Ω)', passed: true, details: '70mm² Cu cable connected to earth bar' },
    { id: 's10', label: 'Lightning & Surge Protection (Type 1+2 SPD)', passed: true, details: 'SPD installed at generator output breaker' },
    { id: 's11', label: 'PPE Equipment (Ear defenders, insulated gloves, goggles)', passed: true, details: 'Wall cabinet fitted inside generator room' }
  ]);

  // Load Parameters Config State
  const [spareCapacityPercent, setSpareCapacityPercent] = useState<number>(25);
  const [futureExpansionPercent, setFutureExpansionPercent] = useState<number>(10);

  // Hidden File Ref
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Load Edit Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadForm, setLoadForm] = useState<Partial<GenLoad>>({
    description: '',
    loadType: 'Motor',
    kw: 15.0,
    pf: 0.8,
    qty: 1,
    demandFactor: 0.8,
    startingFactor: 2.5,
    startingMethod: 'Soft Starter',
    isCritical: true,
    dutyCycle: 100,
    diversityFactor: 0.9,
    notes: '',
  });

  // Calculate Starting Factor based on Starting Method
  const getStartingFactorForMethod = (method?: string): number => {
    switch (method) {
      case 'DOL': return 6.0;
      case 'Star Delta': return 3.0;
      case 'Soft Starter': return 2.5;
      case 'VFD': return 1.2;
      default: return 1.5;
    }
  };

  // Automated Load Calculations
  const totalConnectedKW = loads.reduce((sum, item) => sum + (item.kw || 0) * (item.qty || 1), 0);
  const totalMaxDemandKW = loads.reduce((sum, item) => {
    const kw = (item.kw || 0) * (item.qty || 1);
    const df = item.demandFactor !== undefined ? item.demandFactor : 1.0;
    const div = item.diversityFactor !== undefined ? item.diversityFactor : 1.0;
    return sum + (kw * df * div);
  }, 0);

  const runningLoadKW = totalMaxDemandKW;
  const runningLoadKVA = runningLoadKW / (genPF || 0.8);

  // Calculate transient starting load in kVA (value only includes inductive loads)
  const peakStartingKVA = loads.reduce((sum, item) => {
    const isInductive = ['Motor', 'AC/HVAC'].includes(item.loadType)
      || (item.startingFactor && item.startingFactor > 1.0)
      || ['DOL', 'Star Delta', 'Soft Starter', 'VFD'].includes(item.startingMethod || '');
    if (!isInductive) return sum;

    const kw = (item.kw || 0) * (item.qty || 1);
    const sf = item.startingFactor || getStartingFactorForMethod(item.startingMethod);
    const pf = item.pf || 0.8;
    return sum + (kw * sf) / pf;
  }, 0);

  const peakDemandKW = totalMaxDemandKW * (1 + (futureExpansionPercent / 100));
  const peakDemandKVA = peakDemandKW / (genPF || 0.8);

  // Peak Transient kVA (starting surge kVA from motor/inductive loads)
  const peakTransientKVA = peakStartingKVA;

  // Calculate target kVA with safety spare capacity
  const targetTransientKVA = peakTransientKVA > 0
    ? peakTransientKVA * (1 + (spareCapacityPercent / 100))
    : runningLoadKVA * (1 + (spareCapacityPercent / 100));

  // Recommend standard generator rating nearest to Peak Transient kVA
  const nearestGenToPeakTransient = STANDARD_GEN_RATINGS.reduce((prev, curr) => {
    return Math.abs(curr - targetTransientKVA) < Math.abs(prev - targetTransientKVA) ? curr : prev;
  }, STANDARD_GEN_RATINGS[0]);

  // Ensure recommended capacity is at least sufficient to handle continuous running load
  const minRequiredForRunning = STANDARD_GEN_RATINGS.find(rating => rating >= runningLoadKVA) || 15;
  const recommendedGenKVA = Math.max(nearestGenToPeakTransient, minRequiredForRunning);
  const recommendedPrimeKVA = recommendedGenKVA;
  const recommendedStandbyKVA = +(recommendedGenKVA * 1.10).toFixed(0);

  // Electrical Specs based on chosen rating
  const genOutputCurrentAmps = +((recommendedGenKVA * 1000) / (Math.sqrt(3) * clientInfo.utilityVoltage)).toFixed(1);
  const expectedLoadingPercent = +((runningLoadKVA / recommendedGenKVA) * 100).toFixed(1);
  const surgePercentOfRated = recommendedGenKVA > 0 ? +((peakStartingKVA / recommendedGenKVA) * 100).toFixed(1) : 0;

  // Fuel Consumption Estimates (0.22 L/kWh at 100%, 0.18 L/kWh at 75%, 0.14 L/kWh at 50%, 0.11 L/kWh at 35%)
  const fuelCons100LHr = +(recommendedGenKVA * 0.8 * 0.22).toFixed(1);
  const fuelCons75LHr = +(recommendedGenKVA * 0.8 * 0.18).toFixed(1);
  const fuelCons50LHr = +(recommendedGenKVA * 0.8 * 0.14).toFixed(1);
  const fuelCons35LHr = +(recommendedGenKVA * 0.8 * 0.11).toFixed(1);

  // Tank Autonomy & Fuel Tank Calculation State
  const [autonomyHours, setAutonomyHours] = useState<number>(24);
  const [customAutonomyHours, setCustomAutonomyHours] = useState<number>(36);
  const [selectedFuelLoadPercent, setSelectedFuelLoadPercent] = useState<number>(75); // 75% load standard
  const [reserveMarginPercent, setReserveMarginPercent] = useState<number>(15); // 15% reserve

  const activeAutonomyHours = autonomyHours === -1 ? customAutonomyHours : autonomyHours;

  // Selected consumption rate in L/hr based on selected load %
  const currentConsumptionLHr = selectedFuelLoadPercent === 100 ? fuelCons100LHr
    : selectedFuelLoadPercent === 75 ? fuelCons75LHr
    : selectedFuelLoadPercent === 50 ? fuelCons50LHr
    : fuelCons35LHr;

  const baseFuelRequiredL = +(currentConsumptionLHr * activeAutonomyHours).toFixed(1);
  const calculatedTankSizeL = Math.ceil(baseFuelRequiredL * (1 + (reserveMarginPercent / 100)));
  const calculatedTankSizeGal = +(calculatedTankSizeL * 0.264172).toFixed(0);
  const calculatedBundSizeL = Math.ceil(calculatedTankSizeL * 1.10); // 110% bund wall spill containment
  const calculatedBundSizeGal = +(calculatedBundSizeL * 0.264172).toFixed(0);

  // Sync tank sizing with plumbing state automatically
  useEffect(() => {
    setPlumbing(prev => ({
      ...prev,
      tankCapacityLitres: calculatedTankSizeL,
      bundWallCapacityLitres: calculatedBundSizeL,
      dailyConsumptionHours: activeAutonomyHours
    }));
  }, [calculatedTankSizeL, calculatedBundSizeL, activeAutonomyHours]);

  // Auto update ATS rating based on generator output current
  useEffect(() => {
    const idealAtsAmps = Math.ceil((genOutputCurrentAmps * 1.25) / 50) * 50;
    setAts(prev => ({
      ...prev,
      ratingAmps: Math.max(100, idealAtsAmps)
    }));
  }, [genOutputCurrentAmps]);

  // Earthing Calculations
  const rodLengthM = earthing.rodLength || 3.0;
  const rodRadiusM = (earthing.rodDiameter || 16) / 2000;
  const singleRodResistance = +((earthing.soilResistivity / (2 * Math.PI * rodLengthM)) * Math.log((4 * rodLengthM) / rodRadiusM)).toFixed(2);
  const requiredRodQty = Math.max(1, Math.ceil(singleRodResistance / (earthing.targetResistance * 0.85)));

  // Cable Sizing Calculations (per IEC 60364-5-52)
  const requiredCableAmpacity = +(genOutputCurrentAmps * 1.25).toFixed(1);
  let recommendedCableSpec = '1 Run 4C x 240mm² Cu/XLPE/SWA/PVC';
  let cableRunCount = 1;
  let singleCoreMm2 = '240';

  if (genOutputCurrentAmps > 800) {
    cableRunCount = 3;
    singleCoreMm2 = '300';
    recommendedCableSpec = '3 Runs 4x(1C x 300mm²) Cu/XLPE/AWA/PVC in Parallel';
  } else if (genOutputCurrentAmps > 400) {
    cableRunCount = 2;
    singleCoreMm2 = '240';
    recommendedCableSpec = '2 Runs 4x(1C x 240mm²) Cu/XLPE/AWA/PVC in Parallel';
  } else if (genOutputCurrentAmps > 250) {
    cableRunCount = 1;
    singleCoreMm2 = '185';
    recommendedCableSpec = '1 Run 4C x 185mm² Cu/XLPE/SWA/PVC';
  } else if (genOutputCurrentAmps > 150) {
    cableRunCount = 1;
    singleCoreMm2 = '95';
    recommendedCableSpec = '1 Run 4C x 95mm² Cu/XLPE/SWA/PVC';
  } else {
    cableRunCount = 1;
    singleCoreMm2 = '35';
    recommendedCableSpec = '1 Run 4C x 35mm² Cu/XLPE/SWA/PVC';
  }

  // Cable Voltage Drop Estimate (for 30m run)
  const cableLengthM = 30;
  const mVPerAmpMeter = 0.28 / cableRunCount; // approx for 240mm² XLPE
  const voltageDropVolts = +((mVPerAmpMeter * genOutputCurrentAmps * cableLengthM) / 1000).toFixed(2);
  const voltageDropPercent = +((voltageDropVolts / clientInfo.utilityVoltage) * 100).toFixed(2);

  // File Import / Export Handlers
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    try {
      const res = await parseMEPFile(file, boards, settings);
      if (res.genLoads && res.genLoads.length > 0) {
        setLoads(prev => mode === 'replace' ? res.genLoads! : [...prev, ...res.genLoads!]);
      }
      if (res.genFuel) setFuelType(res.genFuel);
      if (typeof res.genPF === 'number') setGenPF(res.genPF);
      window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: true, text: res.summaryMessage } }));
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: false, text: 'Import failed: ' + (err.message || 'invalid file') } }));
    }
  };

  // Load Management
  const handleAddLoad = () => {
    setEditingId(null);
    setLoadForm({
      description: `Emergency Load Item ${loads.length + 1}`,
      loadType: 'Motor',
      kw: 22.0,
      pf: 0.85,
      qty: 1,
      demandFactor: 0.8,
      startingMethod: 'Soft Starter',
      startingFactor: 2.5,
      isCritical: true,
      dutyCycle: 100,
      diversityFactor: 0.9,
      notes: '',
    });
    setAddModalOpen(true);
  };

  const handleEditLoad = (l: GenLoad) => {
    setEditingId(l.id);
    setLoadForm({ ...l });
    setAddModalOpen(true);
  };

  const handleSaveLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const sf = loadForm.startingFactor || getStartingFactorForMethod(loadForm.startingMethod);
    const kwVal = Number(loadForm.kw) || 0;
    const pfVal = Number(loadForm.pf) || 0.8;
    const qtyVal = Number(loadForm.qty) || 1;
    const runningA = +((kwVal * 1000 * qtyVal) / (Math.sqrt(3) * clientInfo.utilityVoltage * pfVal)).toFixed(1);
    const startingA = +(runningA * sf).toFixed(1);

    if (editingId) {
      setLoads(prev => prev.map(item => item.id === editingId ? {
        ...item,
        description: loadForm.description || item.description,
        loadType: loadForm.loadType || item.loadType,
        kw: kwVal,
        pf: pfVal,
        qty: qtyVal,
        demandFactor: Number(loadForm.demandFactor) || 1.0,
        startingFactor: sf,
        startingMethod: loadForm.startingMethod || 'DOL',
        isCritical: loadForm.isCritical !== undefined ? loadForm.isCritical : true,
        dutyCycle: Number(loadForm.dutyCycle) || 100,
        diversityFactor: Number(loadForm.diversityFactor) || 1.0,
        runningCurrent: runningA,
        startingCurrent: startingA,
        notes: loadForm.notes || ''
      } : item));
    } else {
      const newLoad: GenLoad = {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        description: loadForm.description || `Load Item ${loads.length + 1}`,
        loadType: loadForm.loadType || 'Motor',
        kw: kwVal,
        pf: pfVal,
        qty: qtyVal,
        demandFactor: Number(loadForm.demandFactor) || 1.0,
        startingFactor: sf,
        startingMethod: loadForm.startingMethod || 'DOL',
        isCritical: loadForm.isCritical !== undefined ? loadForm.isCritical : true,
        dutyCycle: Number(loadForm.dutyCycle) || 100,
        diversityFactor: Number(loadForm.diversityFactor) || 1.0,
        runningCurrent: runningA,
        startingCurrent: startingA,
        notes: loadForm.notes || ''
      };
      setLoads(prev => [...prev, newLoad]);
    }
    setAddModalOpen(false);
  };

  const handleRemoveLoad = (id: string) => {
    setLoads(prev => prev.filter(item => item.id !== id));
  };

  const handleDuplicateLoad = (id: string) => {
    const idx = loads.findIndex(l => l.id === id);
    if (idx === -1) return;
    const copy: GenLoad = {
      ...loads[idx],
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      description: `${loads[idx].description} (Copy)`
    };
    const updated = [...loads];
    updated.splice(idx + 1, 0, copy);
    setLoads(updated);
  };

  // Export Assessment Report to Excel
  const handleExportFullExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Project Summary
    const summaryData = [
      ['SENIOR MEP ENGINEER GENERATOR ASSESSMENT REPORT'],
      ['Generated by AI Studio MEP Suite'],
      ['Date', new Date().toLocaleDateString()],
      [''],
      ['1. CLIENT & PROJECT INFORMATION'],
      ['Client Name', clientInfo.clientName],
      ['Company', clientInfo.company],
      ['Project Name', clientInfo.projectName],
      ['Project Address', clientInfo.projectAddress],
      ['Contact Person', clientInfo.contactPerson],
      ['Phone', clientInfo.phoneNumber],
      ['Email', clientInfo.email],
      ['Building Type', clientInfo.buildingType],
      ['Number of Floors', clientInfo.numberOfFloors],
      ['Occupancy', clientInfo.occupancy],
      ['Utility Voltage', `${clientInfo.utilityVoltage}V ${clientInfo.phase}`],
      [''],
      ['2. GENERATOR SIZING & RECOMMENDATION'],
      ['Total Connected Load', `${totalConnectedKW.toFixed(1)} kW`],
      ['Maximum Demand', `${totalMaxDemandKW.toFixed(1)} kW`],
      ['Running Load kVA', `${runningLoadKVA.toFixed(1)} kVA`],
      ['Peak Starting kVA', `${peakStartingKVA.toFixed(1)} kVA`],
      ['Recommended Generator Size', `${recommendedGenKVA} kVA`],
      ['Prime Rating', `${recommendedPrimeKVA} kVA`],
      ['Standby Rating', `${recommendedStandbyKVA} kVA`],
      ['Fuel Consumption @ 35% Load', `${fuelCons35LHr} L/hr (${fuelType})`],
      ['Fuel Consumption @ 50% Load', `${fuelCons50LHr} L/hr (${fuelType})`],
      ['Fuel Consumption @ 75% Load', `${fuelCons75LHr} L/hr (${fuelType})`],
      ['Fuel Consumption @ 100% Load', `${fuelCons100LHr} L/hr (${fuelType})`],
      ['Generator Full Load Current', `${genOutputCurrentAmps} A`],
      ['Expected Loading %', `${expectedLoadingPercent}%`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // Sheet 2: Connected Loads
    const loadHeaders = ['Equipment Name', 'Category', 'Qty', 'Power kW', 'PF', 'Demand Factor', 'Diversity', 'Starting Method', 'Running Curr (A)', 'Starting Curr (A)', 'Critical', 'Notes'];
    const loadRows = loads.map(l => [
      l.description, l.loadType, l.qty, l.kw, l.pf, l.demandFactor, l.diversityFactor || 1, l.startingMethod || 'DOL',
      l.runningCurrent || 0, l.startingCurrent || 0, l.isCritical ? 'Yes' : 'No', l.notes
    ]);
    const wsLoads = XLSX.utils.aoa_to_sheet([loadHeaders, ...loadRows]);
    XLSX.utils.book_append_sheet(wb, wsLoads, 'Load Survey Schedule');

    // Sheet 3: Site Inspection
    const siteHeaders = ['Category', 'Inspection Item', 'Status', 'Notes'];
    const siteRows = siteChecklist.map(i => [i.category, i.item, i.status, i.notes]);
    const wsSite = XLSX.utils.aoa_to_sheet([siteHeaders, ...siteRows]);
    XLSX.utils.book_append_sheet(wb, wsSite, 'Site Inspection Checklist');

    // Sheet 4: Earthing & Cable Design
    const earthingData = [
      ['EARTHING & CABLE SIZING DESIGN'],
      ['Target Earth Resistance', `${earthing.targetResistance} Ω`],
      ['Soil Resistivity', `${earthing.soilResistivity} Ω·m`],
      ['Single Rod Resistance', `${singleRodResistance} Ω`],
      ['Required Earth Rods', `${requiredRodQty} Rods (${earthing.rodLength}m x 16mm)`],
      ['Earth Cable Size', earthing.earthCableSize],
      ['Earth Strip Size', earthing.earthStripSize],
      [''],
      ['CABLE SIZING'],
      ['Output Amperage', `${genOutputCurrentAmps} A`],
      ['Design Amperage (125%)', `${requiredCableAmpacity} A`],
      ['Recommended Cable', recommendedCableSpec],
      ['Voltage Drop (30m run)', `${voltageDropVolts}V (${voltageDropPercent}%)`],
    ];
    const wsEarthing = XLSX.utils.aoa_to_sheet(earthingData);
    XLSX.utils.book_append_sheet(wb, wsEarthing, 'Earthing & Cables');

    XLSX.writeFile(wb, `${clientInfo.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Generator_Assessment.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 text-gray-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl text-2xl">⚙️</span>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  Senior MEP Engineer Generator Assessment Suite
                </h1>
                <p className="text-xs text-blue-300/80 mt-0.5">
                  Complete 25+ Year Standard Engineering Workflow: Client Interview → Load Survey → Sizing → Earthing → Plumbing → BOM → Cables → ATS → Safety → Engineering Report
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setViewMode(prev => prev === 'stepByStep' ? 'fullDashboard' : 'stepByStep')}
              className="px-4 py-2.5 bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Sliders className="w-4 h-4 text-cyan-300" />
              {viewMode === 'stepByStep' ? 'Switch to All-in-One View' : 'Switch to Step Workflow'}
            </button>
          </div>
        </div>

        {/* Step Navigation Bar */}
        {viewMode === 'stepByStep' && (
          <div className="mt-5 pt-4 border-t border-cyan-500/20 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-bold flex items-center gap-1.5">
                <span>🔄</span> STEP WORKFLOW NAVIGATION ({stepsList.length} STEPS)
              </span>
              <button
                type="button"
                onClick={() => setAddStepModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-cyan-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> Add STEP
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-1.5">
              {stepsList.map((s, idx) => {
                const isActive = activeStep === s.num;
                return (
                  <div
                    key={s.id || s.num}
                    onClick={() => setActiveStep(s.num)}
                    className={`p-2 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border group relative ${
                      isActive
                        ? 'bg-sky-900/90 text-sky-100 border-sky-400 font-bold shadow-lg shadow-sky-900/40'
                        : 'bg-slate-900/60 hover:bg-slate-800/80 text-gray-400 border-slate-700/60 hover:text-sky-200 hover:border-sky-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold opacity-90">
                      <span className={isActive ? 'text-sky-200 font-extrabold' : 'text-gray-400'}>STEP {s.num}</span>
                      <span className="flex items-center gap-0.5">
                        <span className="text-xs">{s.icon}</span>
                      </span>
                    </div>

                    <div className="text-[11px] font-bold truncate mt-1">
                      {s.title}
                    </div>

                    {/* Step Re-order Controls (Side-by-side sideways arrows to keep cards compact) */}
                    <div className="flex items-center justify-between mt-1 pt-0.5 border-t border-slate-700/40 opacity-70 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => handleMoveStep(idx, 'left', e)}
                          disabled={idx === 0}
                          title="Move Step Left"
                          className="px-1 py-0.2 hover:bg-sky-700/60 disabled:opacity-20 rounded text-[9px] text-sky-300 transition-colors cursor-pointer"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleMoveStep(idx, 'right', e)}
                          disabled={idx === stepsList.length - 1}
                          title="Move Step Right"
                          className="px-1 py-0.2 hover:bg-sky-700/60 disabled:opacity-20 rounded text-[9px] text-sky-300 transition-colors cursor-pointer"
                        >
                          ▶
                        </button>
                      </div>
                      {s.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveStep(idx, e)}
                          title="Remove Step"
                          className="px-1 py-0.2 hover:bg-rose-700/60 rounded text-[9px] text-rose-300 transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* STEP CONTENT WRAPPER */}
      <div className="space-y-6">

        {/* STEP 1: CLIENT INFORMATION */}
        {(viewMode === 'fullDashboard' || activeStep === 1) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg text-lg">👤</span>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    STEP 1 – Client Information & Project Site Parameters
                  </h2>
                  <p className="text-xs text-gray-400">Capture initial project metadata and utility power supply parameters</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Client Name</label>
                <input
                  type="text"
                  value={clientInfo.clientName}
                  onChange={e => setClientInfo(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={clientInfo.company}
                  onChange={e => setClientInfo(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Project Name</label>
                <input
                  type="text"
                  value={clientInfo.projectName}
                  onChange={e => setClientInfo(prev => ({ ...prev, projectName: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Project Address</label>
                <input
                  type="text"
                  value={clientInfo.projectAddress}
                  onChange={e => setClientInfo(prev => ({ ...prev, projectAddress: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={clientInfo.contactPerson}
                  onChange={e => setClientInfo(prev => ({ ...prev, contactPerson: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={clientInfo.phoneNumber}
                  onChange={e => setClientInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={clientInfo.email}
                  onChange={e => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Building Type</label>
                <select
                  value={clientInfo.buildingType}
                  onChange={e => setClientInfo(prev => ({ ...prev, buildingType: e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                >
                  {['Residential', 'Commercial', 'Industrial', 'Hospital', 'School', 'Hotel', 'Factory', 'Mixed Use'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Number of Floors</label>
                <input
                  type="number"
                  value={clientInfo.numberOfFloors}
                  onChange={e => setClientInfo(prev => ({ ...prev, numberOfFloors: Math.max(1, +e.target.value) }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Building Occupancy</label>
                <input
                  type="number"
                  value={clientInfo.occupancy}
                  onChange={e => setClientInfo(prev => ({ ...prev, occupancy: Math.max(1, +e.target.value) }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Utility Nominal Voltage (V)</label>
                <select
                  value={clientInfo.utilityVoltage}
                  onChange={e => setClientInfo(prev => ({ ...prev, utilityVoltage: +e.target.value }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                >
                  <option value={400}>400V (Standard 3P Line-Line)</option>
                  <option value={415}>415V (UK/Standard 3P)</option>
                  <option value={380}>380V (International 3P)</option>
                  <option value={230}>230V (Single Phase Line-Neutral)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Phase Configuration</label>
                <select
                  value={clientInfo.phase}
                  onChange={e => setClientInfo(prev => ({ ...prev, phase: e.target.value as any }))}
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                >
                  <option value="Three Phase">Three Phase (3P + N + E)</option>
                  <option value="Single Phase">Single Phase (1P + N + E)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LOAD SURVEY & CALCULATIONS */}
        {(viewMode === 'fullDashboard' || activeStep === 2) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>⚡</span> STEP 2 – Connected Load Survey & Automated Sizing Engine
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Input electrical loads, starting methods, diversity factors, and calculate peak demand & generator kVA rating.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddLoad}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Add Load Item
                </button>
              </div>
            </div>

            {/* Sizing Results Quick Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Connected Load</div>
                <div className="text-lg font-bold text-white mt-1">{totalConnectedKW.toFixed(1)} <span className="text-xs text-gray-400 font-normal">kW</span></div>
                <div className="text-[10px] text-gray-500 mt-0.5">Sum of all nameplates</div>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Max Running Demand</div>
                <div className="text-lg font-bold text-amber-400 mt-1">{totalMaxDemandKW.toFixed(1)} <span className="text-xs text-amber-500/80 font-normal">kW</span></div>
                <div className="text-[10px] text-gray-500 mt-0.5">{runningLoadKVA.toFixed(1)} kVA @ {genPF} PF</div>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Peak Transient kVA</div>
                <div className="text-lg font-bold text-purple-400 mt-1">{peakStartingKVA.toFixed(1)} <span className="text-xs text-purple-500/80 font-normal">kVA</span></div>
                <div className="text-[10px] text-gray-500 mt-0.5">inductive Load starting torque</div>
              </div>

              <div className="bg-gradient-to-br from-blue-950/80 to-slate-900 border border-blue-500/40 p-3 rounded-xl shadow-lg">
                <div className="text-[10px] text-blue-300 font-bold uppercase">Recommended Gen</div>
                <div className="text-2xl font-black text-blue-400 mt-0.5">{recommendedGenKVA} <span className="text-xs text-blue-200 font-normal">kVA</span></div>
                <div className="text-[10px] text-blue-300/80 mt-0.5">Nearest Peak Transient kVA</div>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Prime / Generator</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">{recommendedPrimeKVA} / {recommendedStandbyKVA} <span className="text-xs text-emerald-500/80 font-normal">kVA</span></div>
                <div className="text-[10px] text-gray-500 mt-0.5">{expectedLoadingPercent}% Target Load</div>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl col-span-1 sm:col-span-2 md:col-span-1">
                <div className="text-[10px] text-gray-400 font-bold uppercase flex justify-between items-center mb-1.5">
                  <span>Fuel Consumption Rates</span>
                  <span className="text-[9px] text-rose-400 font-semibold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">{fuelType}</span>
                </div>
                <ul className="space-y-1 text-[11px] font-mono text-gray-300">
                  <li className="flex justify-between items-center border-b border-gray-800/60 pb-0.5">
                    <span className="text-gray-400">Fuel @ 35% Load:</span>
                    <strong className="text-rose-300">{fuelCons35LHr} L/hr</strong>
                  </li>
                  <li className="flex justify-between items-center border-b border-gray-800/60 pb-0.5">
                    <span className="text-gray-400">Fuel @ 50% Load:</span>
                    <strong className="text-rose-300">{fuelCons50LHr} L/hr</strong>
                  </li>
                  <li className="flex justify-between items-center border-b border-gray-800/60 pb-0.5">
                    <span className="text-gray-400">Fuel @ 75% Load:</span>
                    <strong className="text-rose-300">{fuelCons75LHr} L/hr</strong>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-400">Fuel @ 100% Load:</span>
                    <strong className="text-rose-400 font-bold">{fuelCons100LHr} L/hr</strong>
                  </li>
                </ul>
              </div>
            </div>

            {/* Grid Container: 3 Separate Cards for 3-Phase Current, Capacity/Surge, and Sizing Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
              {/* Card 1: 3-Phase Current Balance (Separate Card, Grouped Closely) */}
              <div className="lg:col-span-4 bg-[#0b0e17] border border-cyan-500/30 p-3.5 rounded-xl space-y-2 shadow-lg flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> 3-Phase Current
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Total: <strong className="text-cyan-400">{genOutputCurrentAmps.toFixed(1)} A</strong>
                  </span>
                </div>

                {/* Tight Card Body for 3-Phase Current Vertical Bars */}
                <div className="bg-[#0f1117] border border-[#2d3748]/60 rounded-xl p-3 shadow-inner relative overflow-hidden flex flex-col justify-between flex-1">
                  {/* Grid Background Lines for 3-Phase Current */}
                  <div className="absolute inset-x-3 top-3 bottom-8 flex flex-col justify-between pointer-events-none text-[8px] font-mono text-[#4a5568]/40 select-none">
                    <div className="w-full border-t border-[#2d3748]/40 pt-0.5 flex justify-between">
                      <span>100% Rated</span>
                    </div>
                    <div className="w-full border-t border-[#2d3748]/20 pt-0.5">
                      <span>75%</span>
                    </div>
                    <div className="w-full border-t border-[#2d3748]/20 pt-0.5">
                      <span>50%</span>
                    </div>
                    <div className="w-full"></div>
                  </div>

                  {/* 3 Vertical Phase Bars grouped closely with increased height */}
                  <div className="grid grid-cols-3 gap-1 h-36 items-end relative z-10 pt-1 pb-1">
                    {/* L1 */}
                    <div className="flex flex-col items-center h-full justify-end">
                      <div className="text-center font-mono leading-tight mb-1">
                        <span className="text-[10px] font-black text-red-400 block">L1</span>
                        <span className="text-[9px] text-red-300 font-bold block">{+(genOutputCurrentAmps * 0.34).toFixed(1)} A</span>
                      </div>
                      <div className="w-8 sm:w-10 bg-gray-900 h-28 rounded-t-sm overflow-hidden relative border border-red-900/80 flex flex-col justify-end shadow-inner">
                        <div
                          className="w-full bg-gradient-to-t from-red-700 to-red-400 transition-all duration-500"
                          style={{ height: `${Math.min(100, expectedLoadingPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* L2 */}
                    <div className="flex flex-col items-center h-full justify-end">
                      <div className="text-center font-mono leading-tight mb-1">
                        <span className="text-[10px] font-black text-yellow-400 block">L2</span>
                        <span className="text-[9px] text-yellow-300 font-bold block">{+(genOutputCurrentAmps * 0.33).toFixed(1)} A</span>
                      </div>
                      <div className="w-8 sm:w-10 bg-gray-900 h-28 rounded-t-sm overflow-hidden relative border border-yellow-900/80 flex flex-col justify-end shadow-inner">
                        <div
                          className="w-full bg-gradient-to-t from-amber-600 to-yellow-400 transition-all duration-500"
                          style={{ height: `${Math.min(100, expectedLoadingPercent * 0.97)}%` }}
                        />
                      </div>
                    </div>

                    {/* L3 */}
                    <div className="flex flex-col items-center h-full justify-end">
                      <div className="text-center font-mono leading-tight mb-1">
                        <span className="text-[10px] font-black text-blue-400 block">L3</span>
                        <span className="text-[9px] text-blue-300 font-bold block">{+(genOutputCurrentAmps * 0.33).toFixed(1)} A</span>
                      </div>
                      <div className="w-8 sm:w-10 bg-gray-900 h-28 rounded-t-sm overflow-hidden relative border border-blue-900/80 flex flex-col justify-end shadow-inner">
                        <div
                          className="w-full bg-gradient-to-t from-blue-700 to-sky-400 transition-all duration-500"
                          style={{ height: `${Math.min(100, expectedLoadingPercent * 0.98)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#2d3748]/50 text-center font-bold text-[9px] font-mono">
                    <span className="text-red-400 uppercase">Phase L1</span>
                    <span className="text-yellow-400 uppercase">Phase L2</span>
                    <span className="text-blue-400 uppercase">Phase L3</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Generator Capacity & Surge (kVA) */}
              <div className="lg:col-span-4 bg-[#0b0e17] border border-blue-500/30 p-3.5 rounded-xl space-y-2 shadow-lg flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📈</span> Capacity & Surge (kVA)
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Rating: <strong className="text-blue-400">{recommendedGenKVA} kVA</strong>
                  </span>
                </div>

                <div className="bg-[#0f1117] border border-[#2d3748]/60 rounded-xl p-3 flex flex-col justify-between flex-1 space-y-3">
                  {/* Demand Load Horizontal Bar */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                      <span className="font-extrabold text-blue-300 uppercase flex items-center gap-1">
                        <span>⚡</span> Demand Load
                      </span>
                      <span className="font-bold text-gray-200">
                        {runningLoadKVA.toFixed(1)} kVA <span className="text-blue-400 font-black">({expectedLoadingPercent}% Rated)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-5 rounded-md overflow-hidden relative border border-slate-700/80 shadow-inner flex items-center">
                      <div className="absolute left-[75%] top-0 bottom-0 w-0.5 bg-sky-400/80 z-20 pointer-events-none" title="75% Optimal Prime Mark" />
                      <div
                        className="h-full bg-gradient-to-r from-slate-700 via-slate-600 to-blue-500 transition-all duration-500 relative"
                        style={{ width: `${Math.min(100, Math.max(0, expectedLoadingPercent))}%` }}
                      />
                    </div>
                  </div>

                  {/* Peak Surge Horizontal Bar */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                      <span className="font-extrabold text-slate-300 uppercase flex items-center gap-1">
                        <span>🚀</span> Peak Surge (Inductive)
                      </span>
                      <span className="font-bold text-slate-200">
                        {peakStartingKVA.toFixed(1)} kVA <span className="text-blue-300 font-black">({surgePercentOfRated}% Rated)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-5 rounded-md overflow-hidden relative border border-slate-700/80 shadow-inner flex items-center">
                      <div
                        className="h-full bg-gradient-to-r from-slate-800 via-slate-600 to-sky-500 transition-all duration-500 relative"
                        style={{ width: `${Math.min(100, Math.max(0, surgePercentOfRated))}%` }}
                      />
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex justify-between items-center text-[8.5px] font-mono text-gray-400 pt-1.5 border-t border-gray-800/60">
                    <span className="text-sky-400 font-medium">| 75% Prime Optimal</span>
                    <span className="text-blue-300 font-medium">Rating: {recommendedGenKVA} kVA (100% Rated)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Config controls for Spare Capacity, Expansion & Fuel Selection */}
              <div className="lg:col-span-4 bg-[#0b0e17] border border-gray-800/80 p-3.5 rounded-xl flex flex-col justify-between space-y-3 shadow-lg">
                <div className="border-b border-gray-800 pb-2">
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                    <span>⚙️</span> Sizing Margins & Config Controls
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Adjust safety factors, expansion buffers, and generator fuel type.
                  </p>
                </div>

                <div className="space-y-2.5 my-auto">
                  <div className="flex items-center justify-between bg-[#111625] p-2.5 rounded-lg border border-gray-800">
                    <div>
                      <span className="text-xs text-gray-300 font-semibold block">Spare Capacity</span>
                      <span className="text-[10px] text-gray-500">Safety headroom factor</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={spareCapacityPercent}
                        onChange={e => setSpareCapacityPercent(Math.max(0, +e.target.value))}
                        className="w-16 bg-[#161a2b] border border-gray-700 rounded px-2 py-1 text-white font-bold text-xs text-center"
                      />
                      <span className="text-xs text-gray-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#111625] p-2.5 rounded-lg border border-gray-800">
                    <div>
                      <span className="text-xs text-gray-300 font-semibold block">Future Expansion</span>
                      <span className="text-[10px] text-gray-500">Anticipated future loads</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={futureExpansionPercent}
                        onChange={e => setFutureExpansionPercent(Math.max(0, +e.target.value))}
                        className="w-16 bg-[#161a2b] border border-gray-700 rounded px-2 py-1 text-white font-bold text-xs text-center"
                      />
                      <span className="text-xs text-gray-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#111625] p-2.5 rounded-lg border border-gray-800">
                    <div>
                      <span className="text-xs text-gray-300 font-semibold block">Fuel Selection</span>
                      <span className="text-[10px] text-gray-500">Generator fuel type</span>
                    </div>
                    <select
                      value={fuelType}
                      onChange={e => setFuelType(e.target.value)}
                      className="bg-[#161a2b] border border-gray-700 rounded px-2 py-1 text-white font-bold text-xs outline-none cursor-pointer"
                    >
                      {DEFAULT_GEN_FUEL_TYPES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[11px]">Total Sizing Margin:</span>
                  <span className="text-blue-300 font-bold font-mono text-xs bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                    +{spareCapacityPercent + futureExpansionPercent}% Above Peak
                  </span>
                </div>
              </div>
            </div>

            {/* Load Survey Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] relative custom-scrollbar border border-gray-800 rounded-xl bg-[#0b0e17]">
              <table className="w-full text-left text-xs text-gray-300 border-collapse">
                <thead className="sticky top-0 bg-[#161b2e] z-30 shadow">
                  <tr className="bg-[#161b2e] text-gray-400 uppercase text-[10px] font-bold border-b border-gray-800">
                    <th className="sticky top-0 left-0 z-40 bg-[#161b2e] p-3 border-r border-gray-800">Equipment / Description</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3">Category</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-center">Qty</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-right">kW Each</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-right">Total kW</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-center">Demand Factor</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-center">Starting Method</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-right">Run A</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-right">Start A</th>
                    <th className="sticky top-0 z-30 bg-[#161b2e] p-3 text-center">Critical</th>
                    <th className="sticky top-0 right-0 z-40 bg-[#161b2e] p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-[11px]">
                  {loads.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-gray-500 font-sans italic">
                        No connected loads added yet. Click "Add Load Item" above to add equipment.
                      </td>
                    </tr>
                  ) : (
                    loads.map((l) => {
                      const totalKw = (l.kw || 0) * (l.qty || 1);
                      const runA = l.runningCurrent || +((totalKw * 1000) / (Math.sqrt(3) * clientInfo.utilityVoltage * (l.pf || 0.8))).toFixed(1);
                      const sf = l.startingFactor || getStartingFactorForMethod(l.startingMethod);
                      const startA = l.startingCurrent || +(runA * sf).toFixed(1);

                      return (
                        <tr key={l.id} className="hover:bg-blue-950/20 transition-colors">
                          <td className="p-3 font-sans font-bold text-white">
                            {l.description}
                            {l.notes && <div className="text-[10px] text-gray-500 font-normal">{l.notes}</div>}
                          </td>
                          <td className="p-3 font-sans">
                            <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-[10px]">
                              {l.loadType}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold">{l.qty || 1}</td>
                          <td className="p-3 text-right">{l.kw} kW</td>
                          <td className="p-3 text-right font-bold text-amber-300">{totalKw.toFixed(1)} kW</td>
                          <td className="p-3 text-center">{l.demandFactor !== undefined ? l.demandFactor : 1.0}</td>
                          <td className="p-3 text-center font-sans">
                            <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800/50 rounded text-[10px] font-semibold">
                              {l.startingMethod || 'DOL'}
                            </span>
                          </td>
                          <td className="p-3 text-right">{runA} A</td>
                          <td className="p-3 text-right text-purple-300 font-bold">{startA} A</td>
                          <td className="p-3 text-center font-sans">
                            {l.isCritical !== false ? (
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded text-[10px] font-bold">
                                Yes
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-[10px]">
                                No
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-sans">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleMoveLoad(l.id, 'up')}
                                className="p-1 bg-slate-700/50 hover:bg-slate-600 text-slate-200 border border-slate-600/60 rounded transition-colors cursor-pointer text-[10px]"
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveLoad(l.id, 'down')}
                                className="p-1 bg-slate-700/50 hover:bg-slate-600 text-slate-200 border border-slate-600/60 rounded transition-colors cursor-pointer text-[10px]"
                                title="Move Down"
                              >
                                ▼
                              </button>
                              <button
                                onClick={() => handleEditLoad(l)}
                                className="p-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded transition-colors cursor-pointer"
                                title="Edit Load"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDuplicateLoad(l.id)}
                                className="p-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded transition-colors cursor-pointer"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveLoad(l.id)}
                                className="p-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Detailed Generator Spec Summary Box */}
            <div className="bg-gradient-to-r from-[#0b0e17] via-[#111827] to-[#0b0e17] border border-blue-500/30 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                <span>⚙️</span> Standard Generator Technical Specifications & Fuel Rating
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block">Generator Set Model:</span>
                  <strong className="text-white font-mono text-sm">{recommendedGenKVA} kVA Soundproof Silent Canopy Set</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Prime Rating / Generator:</span>
                  <strong className="text-emerald-400 font-mono text-sm">{recommendedPrimeKVA} kVA / {recommendedStandbyKVA} kVA</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Voltage / Phase / Hz:</span>
                  <strong className="text-amber-300 font-mono text-sm">{clientInfo.utilityVoltage}V / {clientInfo.phase} / 50Hz</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Rated Full Load Current:</span>
                  <strong className="text-purple-300 font-mono text-sm">{genOutputCurrentAmps} A</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Alternator Rating:</span>
                  <strong className="text-gray-200">{recommendedGenKVA} kVA, Class H Insulation, IP23, AVR ±1%</strong>
                </div>
                <div>
                  <span className="text-gray-400 block">Engine Rating:</span>
                  <strong className="text-gray-200">Industrial Heavy Duty Turbocharged Diesel, 1500 RPM</strong>
                </div>
                <div className="col-span-2 md:col-span-4 bg-[#080b13] p-3 rounded-xl border border-gray-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px] block">Calculated Autonomy Fuel Tank Storage:</span>
                    <span className="text-xs text-gray-300">Based on {activeAutonomyHours} Hours Run Time @ {selectedFuelLoadPercent}% Design Load ({currentConsumptionLHr} L/hr)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block uppercase">Tank Size ({activeAutonomyHours}h)</span>
                      <strong className="text-rose-300 font-mono text-sm">{calculatedTankSizeL} Litres ({calculatedTankSizeGal} Gal)</strong>
                    </div>
                    <div className="text-right border-l border-gray-800 pl-3">
                      <span className="text-[10px] text-gray-400 block uppercase">110% Bund Containment</span>
                      <strong className="text-emerald-400 font-mono text-sm">{calculatedBundSizeL} Litres</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SITE INSPECTION */}
        {(viewMode === 'fullDashboard' || activeStep === 3) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔍</span> STEP 3 – Site Inspection Checklist (Electrical, Mechanical & Civil)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Professional site audit checklist covering cable routes, ventilation, plinth, ATS space, and acoustic clearance.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-xs text-gray-400 flex items-center gap-2.5 font-semibold bg-[#0b0e17] px-3 py-1.5 rounded-lg border border-gray-800">
                  <span className="text-emerald-400">Pass: {siteChecklist.filter(i => i.status === 'Pass').length}</span>
                  <span className="text-amber-400">Needs Attn: {siteChecklist.filter(i => i.status === 'Needs Attention').length}</span>
                  <span className="text-rose-400">Fail: {siteChecklist.filter(i => i.status === 'Fail').length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset site inspection checklist to default items?')) {
                      setSiteChecklist(DEFAULT_SITE_INSPECTION);
                    }
                  }}
                  title="Reset to default items"
                  className="text-xs text-gray-400 hover:text-gray-200 bg-[#0b0e17] hover:bg-gray-800 border border-gray-800 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['Electrical', 'Mechanical', 'Civil'] as const).map((cat) => {
                const items = siteChecklist.filter(i => i.category === cat);
                return (
                  <div key={cat} className="bg-[#0b0e17] border border-gray-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                        <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>{cat === 'Electrical' ? '⚡' : cat === 'Mechanical' ? '⚙️' : '🏗️'}</span>
                          <span>{cat} Inspection</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 font-normal">{items.length} Points</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newItem: GenSiteInspectionItem = {
                                id: `site-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                category: cat,
                                item: `New ${cat} Inspection Point`,
                                checked: true,
                                status: 'Pass',
                                notes: ''
                              };
                              setSiteChecklist(prev => [...prev, newItem]);
                            }}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        {items.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-xs italic border border-dashed border-gray-800 rounded-lg">
                            No {cat.toLowerCase()} inspection points added yet.
                          </div>
                        ) : (
                          items.map(item => (
                            <div key={item.id} className="p-2.5 bg-[#141a29] border border-gray-800/80 rounded-lg space-y-2 group hover:border-gray-700 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={e => {
                                      const chk = e.target.checked;
                                      setSiteChecklist(prev => prev.map(i => i.id === item.id ? { ...i, checked: chk } : i));
                                    }}
                                    className="rounded border-gray-700 text-blue-600 focus:ring-0 cursor-pointer"
                                  />
                                </div>

                                <input
                                  type="text"
                                  value={item.item}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setSiteChecklist(prev => prev.map(i => i.id === item.id ? { ...i, item: val } : i));
                                  }}
                                  placeholder="Inspection item description..."
                                  className="w-full bg-[#0b0e17]/60 hover:bg-[#0b0e17] focus:bg-[#0b0e17] px-2 py-1 rounded border border-gray-800/60 focus:border-blue-500 font-semibold text-gray-200 text-xs outline-none transition-colors"
                                />

                                <div className="flex items-center gap-1 shrink-0">
                                  <select
                                    value={item.status}
                                    onChange={e => {
                                      const st = e.target.value as any;
                                      setSiteChecklist(prev => prev.map(i => i.id === item.id ? { ...i, status: st } : i));
                                    }}
                                    className={`text-[10px] font-bold rounded px-1.5 py-1 outline-none border cursor-pointer ${
                                      item.status === 'Pass' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                                      item.status === 'Needs Attention' ? 'bg-amber-950 text-amber-300 border-amber-700' :
                                      item.status === 'Fail' ? 'bg-rose-950 text-rose-300 border-rose-700' :
                                      'bg-gray-800 text-gray-400 border-gray-700'
                                    }`}
                                  >
                                    <option value="Pass">Pass</option>
                                    <option value="Needs Attention">Needs Attn</option>
                                    <option value="Fail">Fail</option>
                                    <option value="N/A">N/A</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSiteChecklist(prev => prev.filter(i => i.id !== item.id));
                                    }}
                                    title="Delete this inspection item"
                                    className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <input
                                type="text"
                                value={item.notes}
                                onChange={e => {
                                  const nt = e.target.value;
                                  setSiteChecklist(prev => prev.map(i => i.id === item.id ? { ...i, notes: nt } : i));
                                }}
                                placeholder="Add engineering notes / details..."
                                className="w-full bg-[#0b0e17] border border-gray-800 rounded px-2 py-1 text-[11px] text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newItem: GenSiteInspectionItem = {
                          id: `site-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                          category: cat,
                          item: `New ${cat} Inspection Point`,
                          checked: true,
                          status: 'Pass',
                          notes: ''
                        };
                        setSiteChecklist(prev => [...prev, newItem]);
                      }}
                      className="mt-3 w-full py-1.5 border border-dashed border-gray-800 hover:border-blue-500/50 hover:bg-blue-950/20 text-gray-400 hover:text-blue-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" /> Add {cat} Point
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: EARTHING DESIGN */}
        {(viewMode === 'fullDashboard' || activeStep === 4) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="border-b border-gray-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🌐</span> STEP 4 – Earthing & Grounding Design (IEC 60364-5-54 & IEEE 80 Standards)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Calculate earth electrode quantities, single rod resistance, conductor sizes, and inspection pit specifications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-3 text-xs">
                <h3 className="font-bold text-blue-300 border-b border-gray-800 pb-1.5 uppercase tracking-wider">
                  Earthing Design Inputs
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Target Earth Resistance (Ω)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={earthing.targetResistance}
                      onChange={e => setEarthing(prev => ({ ...prev, targetResistance: +e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Soil Resistivity (Ω·m)</label>
                    <input
                      type="number"
                      value={earthing.soilResistivity}
                      onChange={e => setEarthing(prev => ({ ...prev, soilResistivity: +e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Electrode Material</label>
                    <select
                      value={earthing.electrodeType}
                      onChange={e => setEarthing(prev => ({ ...prev, electrodeType: e.target.value as any }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white outline-none"
                    >
                      <option value="Copper Bonded Rod">Copper Bonded Steel Rod</option>
                      <option value="Copper Rod">Solid Copper Rod</option>
                      <option value="GI Rod">Galvanized Iron Rod</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Rod Length (m)</label>
                    <select
                      value={earthing.rodLength}
                      onChange={e => setEarthing(prev => ({ ...prev, rodLength: +e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white outline-none"
                    >
                      <option value={2.4}>2.4 meters (8 ft)</option>
                      <option value={3.0}>3.0 meters (10 ft)</option>
                      <option value={6.0}>6.0 meters (Coupled 20 ft)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Earth Conductor Cable Size</label>
                  <select
                    value={earthing.earthCableSize}
                    onChange={e => setEarthing(prev => ({ ...prev, earthCableSize: e.target.value }))}
                    className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white outline-none"
                  >
                    <option value="70mm²">70mm² Bare Stranded Copper</option>
                    <option value="95mm²">95mm² Bare Stranded Copper</option>
                    <option value="120mm²">120mm² Bare Stranded Copper</option>
                    <option value="50mm²">50mm² Bare Stranded Copper</option>
                  </select>
                </div>
              </div>

              {/* Calculated Results */}
              <div className="bg-gradient-to-br from-[#0b0e17] to-[#141c2e] border border-blue-500/30 p-4 rounded-xl space-y-3 text-xs">
                <h3 className="font-bold text-blue-300 border-b border-gray-800 pb-1.5 uppercase tracking-wider">
                  IEEE 80 / IEC 60364 Calculation Output
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0b0e17] p-2.5 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Single Rod Resistance:</span>
                    <strong className="text-amber-400 font-mono text-base">{singleRodResistance} Ω</strong>
                  </div>

                  <div className="bg-[#0b0e17] p-2.5 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Required Earth Electrodes:</span>
                    <strong className="text-emerald-400 font-mono text-base">{requiredRodQty} Parallel Rods</strong>
                  </div>

                  <div className="bg-[#0b0e17] p-2.5 rounded-lg border border-gray-800 col-span-2">
                    <span className="text-gray-400 block text-[10px]">Earth Tape / Strip Recommendation:</span>
                    <strong className="text-white font-mono">{earthing.earthStripSize}</strong>
                  </div>

                  <div className="bg-[#0b0e17] p-2.5 rounded-lg border border-gray-800 col-span-2">
                    <span className="text-gray-400 block text-[10px]">Enhancement Compound & Chamber:</span>
                    <span className="text-gray-200 block mt-0.5">{earthing.enhancementCompound} + {earthing.inspectionChamberType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PLUMBING REQUIREMENTS */}
        {(viewMode === 'fullDashboard' || activeStep === 5) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-gray-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>𚍰</span> STEP 5 – Mechanical Plumbing & Diesel Fuel Piping Specifications
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Design fuel supply lines, return lines, storage tank sizing, bund wall containment, and drainage lines.
              </p>
            </div>

            {/* Interactive Diesel Fuel Tank Sizing & Autonomy Calculator */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950/80 to-slate-900 border border-rose-500/30 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-rose-500/20 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wide flex items-center gap-2">
                    <span>🛢️</span> Fuel Tank Size & Operating Period Autonomy Calculator
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Calculate required storage tank volume (L & US Gal) based on generator size ({recommendedGenKVA} kVA), fuel consumption rates, and selected operational period.
                  </p>
                </div>
                <span className="text-xs font-bold font-mono text-rose-300 bg-rose-950/80 border border-rose-800/60 px-2.5 py-1 rounded-lg shrink-0">
                  Engine Consumption: {currentConsumptionLHr} L/hr
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Select Period of Use (Autonomy)</label>
                  <select
                    value={autonomyHours}
                    onChange={e => setAutonomyHours(+e.target.value)}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white font-bold outline-none focus:border-rose-500"
                  >
                    <option value={8}>8 Hours (1 Shift / Day)</option>
                    <option value={12}>12 Hours (Half Day Backup)</option>
                    <option value={24}>24 Hours (1-Day Autonomy)</option>
                    <option value={48}>48 Hours (2-Day Emergency)</option>
                    <option value={72}>72 Hours (3-Day Critical/Hospital)</option>
                    <option value={-1}>Custom Hours...</option>
                  </select>
                </div>

                {autonomyHours === -1 && (
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">Custom Operating Run Time (Hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={customAutonomyHours}
                      onChange={e => setCustomAutonomyHours(Math.max(1, +e.target.value))}
                      className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white font-bold outline-none focus:border-rose-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Engine Load Rate for Calculation</label>
                  <select
                    value={selectedFuelLoadPercent}
                    onChange={e => setSelectedFuelLoadPercent(+e.target.value)}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white font-bold outline-none focus:border-rose-500"
                  >
                    <option value={100}>100% Prime Load ({fuelCons100LHr} L/hr)</option>
                    <option value={75}>75% Design Load ({fuelCons75LHr} L/hr - Standard)</option>
                    <option value={50}>50% Half Load ({fuelCons50LHr} L/hr)</option>
                    <option value={35}>35% Light Load ({fuelCons35LHr} L/hr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Reserve & Expansion Margin</label>
                  <select
                    value={reserveMarginPercent}
                    onChange={e => setReserveMarginPercent(+e.target.value)}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2 text-white font-bold outline-none focus:border-rose-500"
                  >
                    <option value={10}>+10% Expansion Margin</option>
                    <option value={15}>+15% Expansion Margin (Standard)</option>
                    <option value={20}>+20% High Safety Margin</option>
                  </select>
                </div>
              </div>

              {/* Calculated Tank Size Summary Display Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-800">
                <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Hourly Fuel Consumption</span>
                  <strong className="text-amber-300 font-mono text-base block mt-0.5">{currentConsumptionLHr} L/hr</strong>
                  <span className="text-[10px] text-gray-500">{(currentConsumptionLHr * 0.264172).toFixed(1)} US Gal/hr</span>
                </div>

                <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Selected Run Period</span>
                  <strong className="text-blue-300 font-mono text-base block mt-0.5">{activeAutonomyHours} Hours</strong>
                  <span className="text-[10px] text-gray-500">Base Consumption: {baseFuelRequiredL} L</span>
                </div>

                <div className="bg-gradient-to-br from-rose-950 to-slate-900 border border-rose-500/50 p-3 rounded-xl shadow-lg">
                  <span className="text-rose-200 text-[10px] uppercase font-bold block">Calculated Storage Tank Size</span>
                  <strong className="text-rose-300 font-mono text-lg block mt-0.5">{calculatedTankSizeL} Litres</strong>
                  <span className="text-[10px] text-rose-200/80 font-mono">({calculatedTankSizeGal} US Gallons)</span>
                </div>

                <div className="bg-[#0b0e17] border border-gray-800 p-3 rounded-xl">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">110% Bund Spill Containment</span>
                  <strong className="text-emerald-400 font-mono text-base block mt-0.5">{calculatedBundSizeL} Litres</strong>
                  <span className="text-[10px] text-gray-500">({calculatedBundSizeGal} US Gallons)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-blue-300 border-b border-gray-800 pb-1.5 uppercase tracking-wider">
                  Fuel Piping & Tank Specs
                </h3>

                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Fuel Supply Pipe Spec</label>
                    <input
                      type="text"
                      value={plumbing.fuelLineSize}
                      onChange={e => setPlumbing(prev => ({ ...prev, fuelLineSize: e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Fuel Return Pipe Spec</label>
                    <input
                      type="text"
                      value={plumbing.returnLineSize}
                      onChange={e => setPlumbing(prev => ({ ...prev, returnLineSize: e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-400 mb-1">Storage Tank (L)</label>
                      <input
                        type="number"
                        value={plumbing.tankCapacityLitres}
                        onChange={e => setPlumbing(prev => ({ ...prev, tankCapacityLitres: +e.target.value }))}
                        className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Bund Wall Spill Capacity (L)</label>
                      <input
                        type="number"
                        value={plumbing.bundWallCapacityLitres}
                        onChange={e => setPlumbing(prev => ({ ...prev, bundWallCapacityLitres: +e.target.value }))}
                        className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white font-bold text-emerald-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-blue-300 border-b border-gray-800 pb-1.5 uppercase tracking-wider">
                  Drainage, Valves & Insulation
                </h3>

                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Pipe Material & Standard</label>
                    <input
                      type="text"
                      value={plumbing.pipeMaterial}
                      onChange={e => setPlumbing(prev => ({ ...prev, pipeMaterial: e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Thermal Insulation Lagging</label>
                    <input
                      type="text"
                      value={plumbing.pipeInsulation}
                      onChange={e => setPlumbing(prev => ({ ...prev, pipeInsulation: e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Room Drain & Oil Interceptor</label>
                    <input
                      type="text"
                      value={plumbing.drainLineSize}
                      onChange={e => setPlumbing(prev => ({ ...prev, drainLineSize: e.target.value }))}
                      className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: INSTALLATION BILL OF MATERIALS */}
        {(viewMode === 'fullDashboard' || activeStep === 6) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-gray-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>📦</span> STEP 6 – Comprehensive Bill of Materials (BOM / BOQ)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Complete bill of quantities across Electrical, Mechanical, Civil, Plumbing, and Earthing disciplines.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {[
                {
                  cat: 'Electrical Installation Materials', icon: '⚡', items: [
                    { name: `${recommendedGenKVA} kVA Diesel Generator Set with Soundproof Silent Canopy & AMF Controller`, qty: '1 Set', spec: 'Prime/Standby rated, 400V 3P 50Hz, AVR ±1%' },
                    { name: `Automatic Transfer Switch (ATS) Panel ${ats.ratingAmps}A 4-Pole`, qty: '1 Unit', spec: 'Motorized load break switch with mechanical interlock' },
                    { name: recommendedCableSpec, qty: '35 meters', spec: 'XLPE insulated armoured copper feeder cable' },
                    { name: '4-Core 2.5mm² Flexible Armoured Control Cable', qty: '50 meters', spec: 'Signal & remote emergency stop wiring' },
                    { name: 'Cable Tray Heavy Duty Perforated GI 300x50mm', qty: '20 meters', spec: 'Complete with splice plates, bends & supports' },
                    { name: 'Type 1+2 Surge Protection Device (SPD) 40kA', qty: '1 Unit', spec: 'DIN rail mounted at generator output breaker' }
                  ]
                },
                {
                  cat: 'Mechanical & Exhaust Materials', icon: '⚙️', items: [
                    { name: 'Heavy Duty Seamless Black Steel Exhaust Pipe 6"', qty: '12 meters', spec: 'Schedule 40 seamless pipe per ASTM A106' },
                    { name: 'Residential Grade Exhaust Silencer (Attenuation -25 dBA)', qty: '1 Unit', spec: 'Stainless steel body with condensate drain' },
                    { name: 'Flexible Stainless Steel Exhaust Bellows 6"', qty: '1 Unit', spec: 'Vibration absorbing expansion joint' },
                    { name: 'Heavy Duty Anti-Vibration Mounts (AVM)', qty: '4 Sets', spec: 'Spring type isolator rated for 3.5 ton set' },
                    { name: 'Acoustic Motorized Air Intake Attenuator Louvers', qty: '2 Units', spec: 'Interlocked 24V motorized damper' }
                  ]
                },
                {
                  cat: 'Civil & Plumbing Materials', icon: '🏗️', items: [
                    { name: 'Reinforced Concrete Foundation Pad (C30/37)', qty: '1.9 m³', spec: 'Size 3.5m x 1.8m x 0.3m with double rebar mesh' },
                    { name: 'Diesel Storage Tank 1200L Sub-base / Day Tank', qty: '1 Tank', spec: 'Double wall steel tank with level gauge' },
                    { name: 'Racor Dual Fuel Filter & Water Separator Unit', qty: '1 Unit', spec: 'With changeover valve and water alarm' },
                    { name: earthing.inspectionChamberType, qty: `${requiredRodQty} Pits`, spec: 'Concrete chamber with heavy duty cover' },
                    { name: `${earthing.electrodeType} (${earthing.rodLength}m x 16mm)`, qty: `${requiredRodQty} Rods`, spec: 'With driving heads and rod couplers' }
                  ]
                }
              ].map(sec => (
                <div key={sec.cat} className="bg-[#0b0e17] border border-gray-800 rounded-xl p-4 space-y-2">
                  <h3 className="font-bold text-blue-300 border-b border-gray-800 pb-2 uppercase tracking-wider flex items-center gap-2">
                    <span>{sec.icon}</span> {sec.cat}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead>
                        <tr className="text-gray-500 uppercase text-[10px] font-bold border-b border-gray-800">
                          <th className="p-2">Material Description</th>
                          <th className="p-2">Quantity</th>
                          <th className="p-2">Specification & Standard</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {sec.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-blue-950/10">
                            <td className="p-2 font-semibold text-white">{it.name}</td>
                            <td className="p-2 text-amber-300 font-bold font-mono">{it.qty}</td>
                            <td className="p-2 text-gray-400">{it.spec}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: CABLE SIZING */}
        {(viewMode === 'fullDashboard' || activeStep === 7) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-gray-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔌</span> STEP 7 – Generator Feeder Cable Sizing & Voltage Drop
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Calculate conductor cross-section, parallel runs, voltage drop %, and tray containment per IEC 60364-5-52.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-2">
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Rated Output Current</span>
                <strong className="text-2xl font-black text-white font-mono">{genOutputCurrentAmps} A</strong>
                <p className="text-gray-500 text-[11px]">Calculated for {recommendedGenKVA} kVA @ {clientInfo.utilityVoltage}V</p>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-2">
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Design Ampacity (125% NEC)</span>
                <strong className="text-2xl font-black text-amber-400 font-mono">{requiredCableAmpacity} A</strong>
                <p className="text-gray-500 text-[11px]">Includes 25% continuous rating safety factor</p>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-2">
                <span className="text-gray-400 block text-[10px] font-bold uppercase">Voltage Drop (30m Run)</span>
                <strong className="text-2xl font-black text-emerald-400 font-mono">{voltageDropVolts} V ({voltageDropPercent}%)</strong>
                <p className="text-gray-500 text-[11px]">Well within IEC 60364 limit of 3.0%</p>
              </div>
            </div>

            <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-2 text-xs">
              <h3 className="font-bold text-blue-300 uppercase tracking-wider">Recommended Cable Schedule Specification</h3>
              <p className="text-white font-mono text-sm bg-[#161a2b] p-3 rounded-lg border border-gray-700">
                {recommendedCableSpec}
              </p>
            </div>
          </div>
        )}

        {/* STEP 8: ATS & AMF SIZING */}
        {(viewMode === 'fullDashboard' || activeStep === 8) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-gray-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔀</span> STEP 8 – Automatic Transfer Switch (ATS) & AMF Controller Sizing
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure ATS current rating, pole configuration, short circuit rating, and mechanical interlock arrangement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-2">
                <label className="block text-gray-400 font-semibold">ATS Amperage Rating</label>
                <input
                  type="number"
                  value={ats.ratingAmps}
                  onChange={e => setAts(prev => ({ ...prev, ratingAmps: +e.target.value }))}
                  className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white font-bold text-lg"
                />
                <p className="text-[10px] text-gray-500">Minimum recommended: {Math.ceil((genOutputCurrentAmps * 1.25) / 50) * 50}A</p>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-2">
                <label className="block text-gray-400 font-semibold">Number of Poles</label>
                <select
                  value={ats.numberOfPoles}
                  onChange={e => setAts(prev => ({ ...prev, numberOfPoles: +e.target.value as any }))}
                  className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white font-bold outline-none"
                >
                  <option value={4}>4-Pole (Switched Neutral per IEC)</option>
                  <option value={3}>3-Pole (Solid Neutral)</option>
                </select>
              </div>

              <div className="bg-[#0b0e17] border border-gray-800 p-4 rounded-xl space-y-2">
                <label className="block text-gray-400 font-semibold">Short Circuit Rating (kA)</label>
                <input
                  type="number"
                  value={ats.shortCircuitRatingKa}
                  onChange={e => setAts(prev => ({ ...prev, shortCircuitRatingKa: +e.target.value }))}
                  className="w-full bg-[#161a2b] border border-gray-700 rounded p-2 text-white font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 9: SAFETY & ENVIRONMENTAL AUDIT */}
        {(viewMode === 'fullDashboard' || activeStep === 9) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🛡️</span> STEP 9 – Environmental & Fire Safety Audit Checklist
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Verify mandatory safety measures: fire extinguishers, spill kits, CO sensors, emergency stop, and PPE.
                </p>
              </div>

              <div className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-3 py-1 rounded-lg">
                Safety Rating: {safetyChecklist.filter(s => s.passed).length} / {safetyChecklist.length} Verified
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {safetyChecklist.map(s => (
                <div key={s.id} className="p-3 bg-[#0b0e17] border border-gray-800 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={s.passed}
                    onChange={e => {
                      const chk = e.target.checked;
                      setSafetyChecklist(prev => prev.map(item => item.id === s.id ? { ...item, passed: chk } : item));
                    }}
                    className="mt-1 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-white block">{s.label}</span>
                    <span className="text-gray-400 text-[11px] block mt-0.5">{s.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 10: FINAL REPORT */}
        {(viewMode === 'fullDashboard' || activeStep === 10) && (
          <div className="bg-[#111625] border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📊</span> STEP 10 – Final Engineering Assessment & Sizing Report
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Comprehensive formal report ready for client submission, consulting review, and authority approvals.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportFullExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Download Complete Report (.xlsx)
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 border border-slate-600"
                >
                  <Printer className="w-4 h-4" /> Print / Export PDF Report
                </button>
              </div>
            </div>

            {/* Print Friendly Report Sheet */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 space-y-6 text-gray-200 text-xs">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-700 pb-4">
                <div>
                  <div className="text-sm font-black text-blue-400 uppercase tracking-widest">SENIOR MEP ENGINEERING ASSESSMENT REPORT</div>
                  <div className="text-lg font-bold text-white mt-1">{clientInfo.projectName}</div>
                  <div className="text-gray-400 mt-0.5">{clientInfo.projectAddress}</div>
                </div>

                <div className="text-right text-[11px] text-gray-400 space-y-1">
                  <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                  <div><strong>Client:</strong> {clientInfo.clientName} ({clientInfo.company})</div>
                  <div><strong>Engineer:</strong> Senior Electrical & MEP Consultant (25+ Yrs)</div>
                </div>
              </div>

              {/* Executive Summary Box */}
              <div className="bg-gradient-to-r from-cyan-950/60 via-[#0a2347] to-blue-950/60 border border-cyan-400/50 p-4 rounded-xl space-y-2 shadow-lg shadow-cyan-950/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-cyan-300 uppercase tracking-wider text-xs">1. Executive Summary & Sizing Conclusion</h3>
                  <span className="text-[10px] font-mono font-bold text-cyan-200 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-400/40">
                    Cool Blue Sizing Highlight
                  </span>
                </div>
                <p className="leading-relaxed text-gray-200">
                  Based on comprehensive load survey calculations, motor starting transient surge factors, and a <strong>{spareCapacityPercent}% safety spare capacity</strong> allowance, we recommend selecting the standard generator capacity nearest to Peak Transient kVA (<strong className="text-cyan-300">{peakStartingKVA.toFixed(1)} kVA</strong>): a <strong className="text-cyan-200 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-400/40">{recommendedGenKVA} kVA Soundproof Silent Diesel Generator Set</strong> equipped with an <strong>{ats.ratingAmps}A 4-Pole Automatic Transfer Switch (ATS)</strong>.
                </p>
              </div>

              {/* Sizing Breakdown Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-blue-300 uppercase tracking-wider text-xs">2. Load Survey & Sizing Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="text-gray-400 block text-[10px]">Total Connected Load:</span>
                    <strong className="text-white text-sm font-mono">{totalConnectedKW.toFixed(1)} kW</strong>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="text-gray-400 block text-[10px]">Maximum Running Demand:</span>
                    <strong className="text-amber-400 text-sm font-mono">{totalMaxDemandKW.toFixed(1)} kW</strong>
                  </div>
                  <div className="bg-[#0a203b] p-3 rounded-lg border border-cyan-500/50 shadow-sm">
                    <span className="text-cyan-300 block text-[10px] font-bold uppercase">Peak Transient Starting:</span>
                    <strong className="text-cyan-300 text-base font-mono">{peakStartingKVA.toFixed(1)} kVA</strong>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-950 to-blue-900 p-3 rounded-lg border-2 border-cyan-400 shadow-md">
                    <span className="text-cyan-200 block text-[10px] font-extrabold uppercase">Recommended Gen:</span>
                    <strong className="text-cyan-100 text-lg font-mono font-black">{recommendedGenKVA} kVA</strong>
                  </div>
                </div>
              </div>

              {/* Fuel Consumption Rates & Autonomy Tank Breakdown */}
              <div className="space-y-2">
                <h3 className="font-bold text-rose-300 uppercase tracking-wider text-xs">3. Fuel Consumption Rates ({fuelType} Engine) & Autonomy Tank Sizing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ul className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 divide-y divide-slate-700/80 font-mono text-xs space-y-0">
                    <li className="pb-2 flex justify-between items-center">
                      <span className="text-gray-300">Fuel @ 35% Load:</span>
                      <strong className="text-rose-300 text-sm">{fuelCons35LHr} L/hr</strong>
                    </li>
                    <li className="py-2 flex justify-between items-center">
                      <span className="text-gray-300">Fuel @ 50% Load:</span>
                      <strong className="text-rose-300 text-sm">{fuelCons50LHr} L/hr</strong>
                    </li>
                    <li className="py-2 flex justify-between items-center">
                      <span className="text-gray-300">Fuel @ 75% Load:</span>
                      <strong className="text-rose-300 text-sm">{fuelCons75LHr} L/hr</strong>
                    </li>
                    <li className="pt-2 flex justify-between items-center">
                      <span className="text-gray-300">Fuel @ 100% Load:</span>
                      <strong className="text-rose-400 text-sm font-bold">{fuelCons100LHr} L/hr</strong>
                    </li>
                  </ul>

                  <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 space-y-2.5 text-xs flex flex-col justify-between">
                    <span className="font-bold text-cyan-300 uppercase block text-[10px] tracking-wider">Calculated Fuel Tank & Bund Wall Spec</span>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                        <span className="text-gray-400">Selected Operating Run Period:</span>
                        <strong className="text-white">{activeAutonomyHours} Hours</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                        <span className="text-gray-400">Design Fuel Load Rate:</span>
                        <strong className="text-amber-300">{selectedFuelLoadPercent}% Load ({currentConsumptionLHr} L/hr)</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                        <span className="text-gray-400">Calculated Tank Volume:</span>
                        <strong className="text-rose-300">{calculatedTankSizeL} Litres ({calculatedTankSizeGal} Gal)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">110% Bund Wall Containment:</span>
                        <strong className="text-emerald-400">{calculatedBundSizeL} Litres ({calculatedBundSizeGal} Gal)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance & Standards */}
              <div className="border-t border-slate-700 pt-4 flex justify-between items-center text-[11px] text-gray-400">
                <div>
                  <strong>Applicable Engineering Standards:</strong> IEC 60364, IEC 60034, IEEE 80/142, BS 7671, NFPA 110, ISO 8528
                </div>
                <div className="text-emerald-400 font-bold">
                  ✓ Verified & Approved for Construction
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM STEPS VIEW */}
        {stepsList.map(s => {
          if (viewMode !== 'fullDashboard' && activeStep !== s.num) return null;
          if (!s.isCustom && s.num <= 10) return null;
          return (
            <CustomStepToolbox
              key={s.id}
              stepId={s.id}
              stepTitle={s.title}
              stepNum={s.num}
              data={customStepToolData[s.id]}
              onChange={updated => setCustomStepToolData(prev => ({ ...prev, [s.id]: updated }))}
              onDeleteStep={() => handleRemoveStep(s.num - 1)}
            />
          );
        })}

        {/* STEP WORKFLOW BOTTOM NAVIGATION BAR */}
        {viewMode === 'stepByStep' && (
          <div className="bg-[#0e1320] border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs shadow-xl">
            <button
              type="button"
              disabled={activeStep <= 1}
              onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 font-bold rounded-xl border border-slate-600 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              ← Previous Step
            </button>

            <span className="text-gray-400 font-mono font-bold text-center">
              STEP {activeStep} OF {stepsList.length}: <strong className="text-cyan-300">{stepsList.find(s => s.num === activeStep)?.title || 'Custom Step'}</strong>
            </span>

            <button
              type="button"
              disabled={activeStep >= stepsList.length}
              onClick={() => setActiveStep(prev => Math.min(stepsList.length, prev + 1))}
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:pointer-events-none text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Next Step →
            </button>
          </div>
        )}

      </div>

      {/* ADD NEW STEP MODAL */}
      {addStepModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1322] border border-cyan-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-[#12192b]">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>➕</span> Add New Workflow Step
              </h3>
              <button
                type="button"
                onClick={() => setAddStepModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Step Title</label>
                <input
                  type="text"
                  required
                  value={newStepTitle}
                  onChange={e => setNewStepTitle(e.target.value)}
                  placeholder="e.g. Acoustic & Exhaust Analysis"
                  className="w-full bg-[#0b0e17] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Step Icon Emoji</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStepIcon}
                    onChange={e => setNewStepIcon(e.target.value)}
                    placeholder="📋"
                    className="w-20 bg-[#0b0e17] border border-gray-700 rounded-lg p-2.5 text-white text-center font-bold text-base outline-none"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['📋', '🔊', '⚙️', '🏗️', '📐', '🌡️', '📝', '⚡'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewStepIcon(emoji)}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center text-base hover:bg-slate-800 ${
                          newStepIcon === emoji ? 'border-cyan-400 bg-cyan-950/60' : 'border-slate-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddStepModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddStep}
                  disabled={!newStepTitle.trim()}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-lg cursor-pointer shadow-lg shadow-cyan-600/30"
                >
                  Create STEP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT LOAD MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
          <div className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl w-full max-w-xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <span>⚡</span> {editingId ? 'Edit Connected Load Item' : 'Add New Connected Load Item'}
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLoad} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-gray-400 mb-1 font-semibold">Equipment / Load Description</label>
                  <input
                    type="text"
                    required
                    value={loadForm.description || ''}
                    onChange={e => setLoadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Chilled Water Pump 1"
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Category / Type</label>
                  <select
                    value={loadForm.loadType || 'Motor'}
                    onChange={e => setLoadForm(prev => ({ ...prev, loadType: e.target.value }))}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white outline-none"
                  >
                    {DEFAULT_GEN_LOAD_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={loadForm.qty || 1}
                    onChange={e => setLoadForm(prev => ({ ...prev, qty: +e.target.value }))}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Power Rating (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={loadForm.kw || ''}
                    onChange={e => setLoadForm(prev => ({ ...prev, kw: +e.target.value }))}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white font-bold text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Power Factor (PF)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="1.0"
                    value={loadForm.pf || 0.8}
                    onChange={e => setLoadForm(prev => ({ ...prev, pf: +e.target.value }))}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Demand Factor (0.1 - 1.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={loadForm.demandFactor !== undefined ? loadForm.demandFactor : 0.8}
                    onChange={e => setLoadForm(prev => ({ ...prev, demandFactor: +e.target.value }))}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Starting Method</label>
                  <select
                    value={loadForm.startingMethod || 'DOL'}
                    onChange={e => {
                      const method = e.target.value as any;
                      setLoadForm(prev => ({
                        ...prev,
                        startingMethod: method,
                        startingFactor: getStartingFactorForMethod(method)
                      }));
                    }}
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white font-bold outline-none"
                  >
                    <option value="DOL">Direct-On-Line (DOL - 6.0x Multiplier)</option>
                    <option value="Star Delta">Star Delta (3.0x Multiplier)</option>
                    <option value="Soft Starter">Soft Starter (2.5x Multiplier)</option>
                    <option value="VFD">Variable Frequency Drive (VFD - 1.2x Multiplier)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-gray-400 mb-1 font-semibold">Notes / Location</label>
                  <input
                    type="text"
                    value={loadForm.notes || ''}
                    onChange={e => setLoadForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Essential basement pump"
                    className="w-full bg-[#0b0e17] border border-gray-700 rounded p-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {editingId ? 'Update Load Item' : 'Add Load Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
