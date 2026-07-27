import React, { useState, useEffect, useRef } from 'react';
import { Power, ChevronLeft, ChevronRight, GripHorizontal, RotateCcw, RotateCw, Plus, X, Box, Trash2, Keyboard } from 'lucide-react';
import { User, ProjectSettings, Board, HvacUnit, PlumbingFixture, FireZone, SolarLoad, SolarConfig, GenLoad, SmartDevice, CctvCamera, CustomTabConfig, KitComponentItem, KitConnection } from './types';
import { parseMEPFile } from './utils/mepImporter';
import AuthPage from './components/ui/AuthPage';
import ABLogo from './components/ui/ABLogo';
import ElectricalTab from './components/tabs/ElectricalTab';
import HvacTab from './components/tabs/HvacTab';
import PlumbingTab from './components/tabs/PlumbingTab';
import FireTab from './components/tabs/FireTab';
import SolarTab from './components/tabs/SolarTab';
import GeneratorTab from './components/tabs/GeneratorTab';
import SmartHomeTab from './components/tabs/SmartHomeTab';
import CctvTab from './components/tabs/CctvTab';
import SummaryTab from './components/tabs/SummaryTab';
import ProfileTab from './components/tabs/ProfileTab';
import { SelfDesignTab } from './components/tabs/SelfDesignTab';
import ProjectSettingsPanel from './components/ui/ProjectSettings';
import SizingParamsSidebar from './components/layout/SizingParamsSidebar';

// Default Constants
const DEFAULT_SETTINGS: ProjectSettings = {
  projectName: 'Standard MEP Project',
  projectNo: 'MEP-01',
  engineer: '',
  client: '',
  voltage: 230,
  frequency: 50,
  powerFactor: 0.85,
  demandFactor: 0.8,
  diversityFactor: 0.75,
  tempDesign: 35,
  altitudeFactor: 1,
  safetyMargin: 25,
  targetLux: 300,
  lightMF: 0.8,
  defaultLPW: 200,
  currencyCode: 'USD',
  currencySymbol: '$',
  currencyRate: 1.0,
  lightingRoundingMode: 'actual',
  lightingPresetMode: 'standard',
  customRoomLux: {},
  socketAreaFactor: 4,
  customRoomSockets: {},
  customRooms: [],
  acDefaultWatts: 1500,
  acDefaultWire: '4',
  dedicatedDefaultWatts: 2000,
  dedicatedDefaultWire: '2.5',
};

const DEFAULT_BOARD = (): Board => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  name: 'MDB-01',
  phase: '3-Phase',
  boardType: 'MDB',
  location: 'Main Electrical Room',
  voltage: 400,
  circuits: [],
});

const DEFAULT_HVAC = (): HvacUnit => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  zone: 'Main Living Room',
  system: 'Split AC',
  area: 32,
  height: 3.0,
  coolingLoad: 7.2,
  refrigerant: 'R-32',
  cfm: 600,
  notes: 'Occupancy 6 persons',
  acHp: 2.5,
});

const DEFAULT_PLUMBING = (): PlumbingFixture => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  zone: 'Master Bathroom',
  fixture: 'WC',
  qty: 1,
  fixtureUnits: 6,
  pipeSize: 100,
  material: 'PVC',
  coldFlow: 10,
  hotFlow: 0,
  notes: 'Gravity flush tank',
});

const DEFAULT_FIRE = (): FireZone => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  zone: 'Office Area',
  hazard: 'Light Hazard',
  sprinklerType: 'Pendant',
  area: 120,
  spacing: 12,
  flowRate: 80,
  pipeSize: 25,
  notes: 'Commercial ceiling grid',
});

const DEFAULT_SOLAR_LOAD = (): SolarLoad => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  description: 'LED Lighting + Fridge',
  watts: 350,
  qty: 1,
  hoursPerDay: 8,
  notes: 'Critical Backup',
});

const DEFAULT_SOLAR_CFG = (): SolarConfig => ({
  panelWattage: 400,
  peakSunHours: 5.0,
  systemVoltage: 48,
  batteryAh: 200,
  batteryVoltage: 12,
  batteryType: 'Lithium (LiFePO4)',
  daysAutonomy: 1,
  dod: 0.8,
  batteryEff: 0.85,
  inverterType: 'Pure Sine Wave',
  inverterEff: 0.9,
  safetyFactor: 1.25,
});

const DEFAULT_GEN_LOAD = (): GenLoad => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  description: 'Water Pump Starting Surge',
  loadType: 'Motor',
  kw: 7.5,
  pf: 0.8,
  qty: 1,
  demandFactor: 0.8,
  startingFactor: 2.5,
  notes: 'Direct-on-line starter',
});

const DEFAULT_SMART_DEVICE = (): SmartDevice => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  room: 'Living Room 1',
  device: 'Smart Switch / Relay',
  brand: 'Shelly Plus 1PM',
  protocol: 'WiFi',
  qty: 1,
  watts: 1.2,
  platform: 'Home Assistant',
  notes: 'Standby load',
});

const DEFAULT_CCTV = (): CctvCamera => ({
  id: Math.random().toString(36).slice(2, 8).toUpperCase(),
  location: 'Front Gate Overlook',
  type: 'Dome',
  resolution: '4MP (2K)',
  fps: 15,
  compression: 'H.265+',
  lens: '4',
  poeClass: 'PoE (15.4W)',
  qty: 1,
  indoor: false,
  ir: true,
  notes: 'With AI face detection',
});

const TAB_DEFS: Record<string, { icon: string; label: string }> = {
  electrical: { icon: '⚡', label: 'Electrical Panels' },
  hvac: { icon: '❄️', label: 'HVAC Sizing' },
  plumbing: { icon: '💧', label: 'Plumbing (FU)' },
  fire: { icon: '🔥', label: 'Fire Suppression' },
  solar: { icon: '☀️', label: 'Solar & Inverter' },
  generator: { icon: '⚙️', label: 'Generator' },
  smarthome: { icon: '🏡', label: 'Smart Home / IoT' },
  cctv: { icon: '📹', label: 'CCTV Sizing' },
  summary: { icon: '📊', label: 'MEP Summary' },
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('mep_session_v1');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('electrical');
  const [accentColor, setAccentColor] = useState('coolblend');

  // Windows Shortcuts Modal State
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // New Tab Creation Modal State
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabIcon, setNewTabIcon] = useState('🎨');
  const [newTabType, setNewTabType] = useState<'selfdesign' | 'standard'>('selfdesign');

  // Hover Selectable Dropdown States for Import & Export
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [importFileAccept, setImportFileAccept] = useState('.xlsx,.xls,.csv,.txt,.json');

  useEffect(() => {
    const root = document.documentElement;
    if (accentColor === 'coolblend') {
      root.style.setProperty('--mep-accent', '#38bdf8');
      root.style.setProperty('--mep-accent-glow', 'rgba(56, 189, 248, 0.25)');
    } else if (accentColor === 'amber') {
      root.style.setProperty('--mep-accent', '#f59e0b');
      root.style.setProperty('--mep-accent-glow', 'rgba(245, 158, 11, 0.2)');
    } else if (accentColor === 'green') {
      root.style.setProperty('--mep-accent', '#10b981');
      root.style.setProperty('--mep-accent-glow', 'rgba(16, 185, 129, 0.2)');
    } else if (accentColor === 'ruby') {
      root.style.setProperty('--mep-accent', '#f43f5e');
      root.style.setProperty('--mep-accent-glow', 'rgba(244, 63, 94, 0.2)');
    } else if (accentColor === 'indigo') {
      root.style.setProperty('--mep-accent', '#6366f1');
      root.style.setProperty('--mep-accent-glow', 'rgba(99, 102, 241, 0.2)');
    } else {
      root.style.setProperty('--mep-accent', '#3b82f6');
      root.style.setProperty('--mep-accent-glow', 'rgba(59, 130, 246, 0.2)');
    }
  }, [accentColor]);

  const [tabs, setTabs] = useState<CustomTabConfig[]>(() => {
    try {
      const saved = localStorage.getItem('mep_tabs_v1');
      let initialTabs: CustomTabConfig[] = saved ? JSON.parse(saved) : [
        { id: 'electrical', icon: '⚡', label: 'Electrical Panels' },
        { id: 'hvac', icon: '❄️', label: 'HVAC Sizing' },
        { id: 'plumbing', icon: '💧', label: 'Plumbing (FU)' },
        { id: 'fire', icon: '🔥', label: 'Fire Suppression' },
        { id: 'solar', icon: '☀️', label: 'Solar & Inverter' },
        { id: 'generator', icon: '⚙️', label: 'Generator' },
        { id: 'smarthome', icon: '🏡', label: 'Smart Home / IoT' },
        { id: 'cctv', icon: '📹', label: 'CCTV Sizing' },
        { id: 'selfdesign', icon: '🎨', label: 'Kit Design Studio', type: 'selfdesign' },
        { id: 'summary', icon: '📊', label: 'MEP Summary' },
        { id: 'profile', icon: '👤', label: 'Profile & Academy' },
      ];
      // Filter out industrial if present from previous sessions
      initialTabs = initialTabs.filter((t: any) => t.id !== 'industrial');
      // Update generator label if saved under old label
      initialTabs = initialTabs.map((t: any) => t.id === 'generator' ? { ...t, label: 'Generator' } : t);
      // Ensure selfdesign tab exists
      if (initialTabs && !initialTabs.some((t: any) => t.id === 'selfdesign' || t.type === 'selfdesign')) {
        const summaryIdx = initialTabs.findIndex((t: any) => t.id === 'summary');
        const selfDesignTab: CustomTabConfig = { id: 'selfdesign', icon: '🎨', label: 'Kit Design Studio', type: 'selfdesign' };
        if (summaryIdx !== -1) {
          initialTabs.splice(summaryIdx, 0, selfDesignTab);
        } else {
          initialTabs.push(selfDesignTab);
        }
      }
      // Ensure profile tab always exists for old sessions
      if (initialTabs && !initialTabs.some((t: any) => t.id === 'profile')) {
        initialTabs.push({ id: 'profile', icon: '👤', label: 'Profile & Academy' });
      }
      return initialTabs;
    } catch {
      return [
        { id: 'electrical', icon: '⚡', label: 'Electrical Panels' },
        { id: 'hvac', icon: '❄️', label: 'HVAC Sizing' },
        { id: 'plumbing', icon: '💧', label: 'Plumbing (FU)' },
        { id: 'fire', icon: '🔥', label: 'Fire Suppression' },
        { id: 'solar', icon: '☀️', label: 'Solar & Inverter' },
        { id: 'generator', icon: '⚙️', label: 'Generator' },
        { id: 'smarthome', icon: '🏡', label: 'Smart Home / IoT' },
        { id: 'cctv', icon: '📹', label: 'CCTV Sizing' },
        { id: 'selfdesign', icon: '🎨', label: 'Kit Design Studio', type: 'selfdesign' },
        { id: 'summary', icon: '📊', label: 'MEP Summary' },
        { id: 'profile', icon: '👤', label: 'Profile & Academy' },
      ];
    }
  });


  useEffect(() => {
    localStorage.setItem('mep_tabs_v1', JSON.stringify(tabs));
  }, [tabs]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('mep_sidebar_pinned');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('mep_sidebar_pinned', JSON.stringify(isSidebarPinned));
  }, [isSidebarPinned]);

  // Core Data States
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [boards, setBoards] = useState<Board[]>([DEFAULT_BOARD()]);
  const [hvacUnits, setHvacUnits] = useState<HvacUnit[]>([DEFAULT_HVAC()]);
  const [plumbingFixtures, setPlumbingFixtures] = useState<PlumbingFixture[]>([DEFAULT_PLUMBING()]);
  const [fireZones, setFireZones] = useState<FireZone[]>([DEFAULT_FIRE()]);
  const [solarLoads, setSolarLoads] = useState<SolarLoad[]>([DEFAULT_SOLAR_LOAD()]);
  const [solarCfg, setSolarCfg] = useState<SolarConfig>(DEFAULT_SOLAR_CFG());
  const [genLoads, setGenLoads] = useState<GenLoad[]>([DEFAULT_GEN_LOAD()]);
  const [genFuel, setGenFuel] = useState<string>('Diesel');
  const [genPF, setGenPF] = useState<number>(0.8);
  const [smartDevices, setSmartDevices] = useState<SmartDevice[]>([DEFAULT_SMART_DEVICE()]);
  const [cameras, setCameras] = useState<CctvCamera[]>([DEFAULT_CCTV()]);
  const [cctvRetention, setCctvRetention] = useState<number>(30);
  const [mainsOverrides, setMainsOverrides] = useState<Record<string, number>>({});
  const [selfDesignKits, setSelfDesignKits] = useState<Record<string, { items: KitComponentItem[]; connections: KitConnection[] }>>(() => {
    try {
      const saved = localStorage.getItem('mep_self_design_kits_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mep_self_design_kits_v1', JSON.stringify(selfDesignKits));
    } catch {
      // quiet catch
    }
  }, [selfDesignKits]);

  const handleSelfDesignDataChange = (tabId: string, data: { items: any[]; connections: any[] }) => {
    setSelfDesignKits(prev => {
      const current = prev[tabId];
      if (current && JSON.stringify(current) === JSON.stringify(data)) {
        return prev;
      }
      return {
        ...prev,
        [tabId]: data
      };
    });
  };

  // Undo/Redo stacks for all aspects of the MEP project
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Refs to control history tracking and avoid double tracking or hydration tracking
  const isHydratingRef = useRef(true);
  const isUndoRedoActionRef = useRef(false);
  const lastStateRef = useRef<any>(null);

  // Feedback notifications & auto-save status
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastAutosavedTime, setLastAutosavedTime] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate user-specific project data on startup or log in
  useEffect(() => {
    isHydratingRef.current = true;
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setBoards([DEFAULT_BOARD()]);
      setHvacUnits([DEFAULT_HVAC()]);
      setPlumbingFixtures([DEFAULT_PLUMBING()]);
      setFireZones([DEFAULT_FIRE()]);
      setSolarLoads([DEFAULT_SOLAR_LOAD()]);
      setSolarCfg(DEFAULT_SOLAR_CFG());
      setGenLoads([DEFAULT_GEN_LOAD()]);
      setGenFuel('Diesel');
      setGenPF(0.8);
      setSmartDevices([DEFAULT_SMART_DEVICE()]);
      setCameras([DEFAULT_CCTV()]);
      setCctvRetention(30);
      setMainsOverrides({});
      setActiveBoardIndex(0);
      setUndoStack([]);
      setRedoStack([]);
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 100);
      return;
    }
    const projectKey = `mep_project_${user.username}`;
    try {
      const dataStr = localStorage.getItem(projectKey);
      if (dataStr) {
        const p = JSON.parse(dataStr);
        if (p.settings) setSettings(p.settings);
        if (Array.isArray(p.boards) && p.boards.length) setBoards(p.boards);
        if (Array.isArray(p.hvacUnits)) setHvacUnits(p.hvacUnits);
        if (Array.isArray(p.plumbingFixtures)) setPlumbingFixtures(p.plumbingFixtures);
        if (Array.isArray(p.fireZones)) setFireZones(p.fireZones);
        if (Array.isArray(p.solarLoads)) setSolarLoads(p.solarLoads);
        if (p.solarCfg) setSolarCfg(p.solarCfg);
        if (Array.isArray(p.genLoads)) setGenLoads(p.genLoads);
        if (p.genFuel) setGenFuel(p.genFuel);
        if (typeof p.genPF === 'number') setGenPF(p.genPF);
        if (Array.isArray(p.smartDevices)) setSmartDevices(p.smartDevices);
        if (Array.isArray(p.cameras)) setCameras(p.cameras);
        if (typeof p.cctvRetention === 'number') setCctvRetention(p.cctvRetention);
        if (p.mainsOverrides) setMainsOverrides(p.mainsOverrides);
        if (p.selfDesignKits) setSelfDesignKits(p.selfDesignKits);
      } else {
        // Fallback to defaults
        setSettings(DEFAULT_SETTINGS);
        setBoards([DEFAULT_BOARD()]);
        setHvacUnits([DEFAULT_HVAC()]);
        setPlumbingFixtures([DEFAULT_PLUMBING()]);
        setFireZones([DEFAULT_FIRE()]);
        setSolarLoads([DEFAULT_SOLAR_LOAD()]);
        setSolarCfg(DEFAULT_SOLAR_CFG());
        setGenLoads([DEFAULT_GEN_LOAD()]);
        setGenFuel('Diesel');
        setGenPF(0.8);
        setSmartDevices([DEFAULT_SMART_DEVICE()]);
        setCameras([DEFAULT_CCTV()]);
        setCctvRetention(30);
        setMainsOverrides({});
      }
      setActiveBoardIndex(0);
      setUndoStack([]);
      setRedoStack([]);
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 100);
    } catch {
      showToast(false, 'Failed to load local project workspace.');
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 100);
    }
  }, [user]);

  // Hydrate user-specific profile (accent color, etc.) on startup or log in
  useEffect(() => {
    if (!user) return;
    const profileKey = `mep_profile_${user.username}`;
    try {
      const savedProfile = localStorage.getItem(profileKey);
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.accentColor) setAccentColor(p.accentColor);
      } else {
        setAccentColor('coolblend');
      }
    } catch (e) {
      console.warn('Failed to load profile settings:', e);
    }
  }, [user]);

  // Auto-save user data to localStorage (Quiet debounced background write + 5-min explicit interval alert)
  useEffect(() => {
    if (!user) return;
    const projectKey = `mep_project_${user.username}`;

    // Quiet background write to avoid losing work on unexpected tab close
    const timeout = setTimeout(() => {
      try {
        const payload = {
          settings,
          boards,
          hvacUnits,
          plumbingFixtures,
          fireZones,
          solarLoads,
          solarCfg,
          genLoads,
          genFuel,
          genPF,
          smartDevices,
          cameras,
          cctvRetention,
          mainsOverrides,
          savedAt: Date.now(),
        };
        localStorage.setItem(projectKey, JSON.stringify(payload));
      } catch {
        // quiet catch
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [user, settings, boards, hvacUnits, plumbingFixtures, fireZones, solarLoads, solarCfg, genLoads, genFuel, genPF, smartDevices, cameras, cctvRetention, mainsOverrides]);

  // 5-minute Auto-save interval timer with status notification
  useEffect(() => {
    if (!user) return;
    const FIVE_MINUTES_MS = 5 * 60 * 1000; // 300,000 ms

    const interval = setInterval(() => {
      const projectKey = `mep_project_${user.username}`;
      try {
        const payload = {
          settings,
          boards,
          hvacUnits,
          plumbingFixtures,
          fireZones,
          solarLoads,
          solarCfg,
          genLoads,
          genFuel,
          genPF,
          smartDevices,
          cameras,
          cctvRetention,
          mainsOverrides,
          savedAt: Date.now(),
        };
        localStorage.setItem(projectKey, JSON.stringify(payload));
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastAutosavedTime(timeStr);
        showToast(true, `⚡ Auto-saved project (5-min interval)`);
      } catch {
        showToast(false, 'Local storage limits exceeded during auto-save.');
      }
    }, FIVE_MINUTES_MS);

    return () => clearInterval(interval);
  }, [user, settings, boards, hvacUnits, plumbingFixtures, fireZones, solarLoads, solarCfg, genLoads, genFuel, genPF, smartDevices, cameras, cctvRetention, mainsOverrides]);

  // Automatically watch state changes and push snapshot to history
  useEffect(() => {
    const currentState = {
      settings,
      boards,
      activeBoardIndex,
      hvacUnits,
      plumbingFixtures,
      fireZones,
      solarLoads,
      solarCfg,
      genLoads,
      genFuel,
      genPF,
      smartDevices,
      cameras,
      cctvRetention,
      mainsOverrides,
      tabs,
      activeTab,
      accentColor,
      selfDesignKits
    };

    if (isHydratingRef.current) {
      lastStateRef.current = currentState;
      return;
    }

    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      lastStateRef.current = currentState;
      return;
    }

    if (lastStateRef.current === null) {
      lastStateRef.current = currentState;
      return;
    }

    // Check if anything actually changed
    if (JSON.stringify(lastStateRef.current) === JSON.stringify(currentState)) {
      return;
    }

    setUndoStack(prev => [...prev.slice(-50), lastStateRef.current]);
    setRedoStack([]);
    lastStateRef.current = currentState;
  }, [
    settings,
    boards,
    activeBoardIndex,
    hvacUnits,
    plumbingFixtures,
    fireZones,
    solarLoads,
    solarCfg,
    genLoads,
    genFuel,
    genPF,
    smartDevices,
    cameras,
    cctvRetention,
    mainsOverrides,
    tabs,
    activeTab,
    accentColor,
    selfDesignKits
  ]);

  // History Helper (compatible signature for ElectricalTab)
  const trackHistory = (currentBoardsList: Board[]) => {
    // Handled automatically by the unified state listener
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];

    const currentState = {
      settings,
      boards,
      activeBoardIndex,
      hvacUnits,
      plumbingFixtures,
      fireZones,
      solarLoads,
      solarCfg,
      genLoads,
      genFuel,
      genPF,
      smartDevices,
      cameras,
      cctvRetention,
      mainsOverrides,
      tabs,
      activeTab,
      accentColor,
      selfDesignKits
    };

    isUndoRedoActionRef.current = true;

    if (previousState.settings) setSettings(previousState.settings);
    if (previousState.boards) setBoards(previousState.boards);
    if (typeof previousState.activeBoardIndex === 'number') setActiveBoardIndex(previousState.activeBoardIndex);
    if (previousState.hvacUnits) setHvacUnits(previousState.hvacUnits);
    if (previousState.plumbingFixtures) setPlumbingFixtures(previousState.plumbingFixtures);
    if (previousState.fireZones) setFireZones(previousState.fireZones);
    if (previousState.solarLoads) setSolarLoads(previousState.solarLoads);
    if (previousState.solarCfg) setSolarCfg(previousState.solarCfg);
    if (previousState.genLoads) setGenLoads(previousState.genLoads);
    if (previousState.genFuel) setGenFuel(previousState.genFuel);
    if (typeof previousState.genPF === 'number') setGenPF(previousState.genPF);
    if (previousState.smartDevices) setSmartDevices(previousState.smartDevices);
    if (previousState.cameras) setCameras(previousState.cameras);
    if (typeof previousState.cctvRetention === 'number') setCctvRetention(previousState.cctvRetention);
    if (previousState.mainsOverrides) setMainsOverrides(previousState.mainsOverrides);
    if (previousState.tabs) setTabs(previousState.tabs);
    if (previousState.activeTab) setActiveTab(previousState.activeTab);
    if (previousState.accentColor) setAccentColor(previousState.accentColor);
    if (previousState.selfDesignKits) setSelfDesignKits(previousState.selfDesignKits);

    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));
    showToast(true, '↩️ Undone action');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];

    const currentState = {
      settings,
      boards,
      activeBoardIndex,
      hvacUnits,
      plumbingFixtures,
      fireZones,
      solarLoads,
      solarCfg,
      genLoads,
      genFuel,
      genPF,
      smartDevices,
      cameras,
      cctvRetention,
      mainsOverrides,
      tabs,
      activeTab,
      accentColor,
      selfDesignKits
    };

    isUndoRedoActionRef.current = true;

    if (nextState.settings) setSettings(nextState.settings);
    if (nextState.boards) setBoards(nextState.boards);
    if (typeof nextState.activeBoardIndex === 'number') setActiveBoardIndex(nextState.activeBoardIndex);
    if (nextState.hvacUnits) setHvacUnits(nextState.hvacUnits);
    if (nextState.plumbingFixtures) setPlumbingFixtures(nextState.plumbingFixtures);
    if (nextState.fireZones) setFireZones(nextState.fireZones);
    if (nextState.solarLoads) setSolarLoads(nextState.solarLoads);
    if (nextState.solarCfg) setSolarCfg(nextState.solarCfg);
    if (nextState.genLoads) setGenLoads(nextState.genLoads);
    if (nextState.genFuel) setGenFuel(nextState.genFuel);
    if (typeof nextState.genPF === 'number') setGenPF(nextState.genPF);
    if (nextState.smartDevices) setSmartDevices(nextState.smartDevices);
    if (nextState.cameras) setCameras(nextState.cameras);
    if (typeof nextState.cctvRetention === 'number') setCctvRetention(nextState.cctvRetention);
    if (nextState.mainsOverrides) setMainsOverrides(nextState.mainsOverrides);
    if (nextState.tabs) setTabs(nextState.tabs);
    if (nextState.activeTab) setActiveTab(nextState.activeTab);
    if (nextState.accentColor) setAccentColor(nextState.accentColor);
    if (nextState.selfDesignKits) setSelfDesignKits(nextState.selfDesignKits);

    setUndoStack(prev => [...prev, currentState]);
    setRedoStack(prev => prev.slice(0, -1));
    showToast(true, '↪️ Redone action');
  };

  // Global Windows Short Key Listener across ALL Tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1 or Ctrl + / or Shift + ? -> Toggle Shortcuts Cheat Sheet
      if (e.key === 'F1' || (e.ctrlKey && e.key === '/') || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
        return;
      }

      // Esc -> Close open modal
      if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
        setIsAddTabModalOpen(false);
        setSettingsOpen(false);
        return;
      }

      // Ctrl + S -> Save Project State
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (user) {
          const projectKey = `mep_project_${user.username}`;
          const payload = {
            settings, boards, hvacUnits, plumbingFixtures, fireZones, solarLoads,
            solarCfg, genLoads, genFuel, genPF, smartDevices, cameras, cctvRetention,
            mainsOverrides, selfDesignKits, savedAt: Date.now()
          };
          localStorage.setItem(projectKey, JSON.stringify(payload));
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastAutosavedTime(timeStr);
          showToast(true, `💾 Windows Shortcut: Project saved (${timeStr})`);
        } else {
          showToast(true, '💾 Windows Shortcut: Local project state saved');
        }
        return;
      }

      // Ctrl + N or Alt + N -> Open Create New Custom Tab Modal
      if ((e.ctrlKey || e.altKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setNewTabName('');
        setNewTabIcon('🎨');
        setNewTabType('selfdesign');
        setIsAddTabModalOpen(true);
        return;
      }

      // Ctrl + P -> Print / Export PDF Calculation Report
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        window.print();
        return;
      }

      // Ctrl + 1 to Ctrl + 9 -> Jump to Tab by Index
      if (e.ctrlKey && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          e.preventDefault();
          setActiveTab(tabs[idx].id);
          showToast(true, `⚡ Switched tab: ${tabs[idx].label}`);
        }
        return;
      }

      // Ctrl + Tab / Ctrl + Shift + Tab OR Ctrl + Shift + ArrowRight / ArrowLeft -> Cycle Tabs
      if ((e.ctrlKey && e.key === 'Tab') || (e.ctrlKey && e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft'))) {
        e.preventDefault();
        const currentIdx = tabs.findIndex(t => t.id === activeTab);
        if (currentIdx !== -1) {
          let nextIdx = 0;
          if (e.shiftKey || e.key === 'ArrowLeft') {
            nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
          } else {
            nextIdx = (currentIdx + 1) % tabs.length;
          }
          setActiveTab(tabs[nextIdx].id);
        }
        return;
      }

      // Ctrl + M or Alt + M -> Toggle Sidebar Pin
      if ((e.ctrlKey || e.altKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setIsSidebarPinned(prev => !prev);
        showToast(true, `📌 Windows Shortcut: Sidebar toggled`);
        return;
      }

      // Ctrl + Shift + W -> Close Current Tab (if custom tab)
      if (e.ctrlKey && e.shiftKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        const curTabObj = tabs.find(t => t.id === activeTab);
        const isBuiltInCore = ['electrical', 'hvac', 'plumbing', 'fire', 'solar', 'generator', 'smarthome', 'cctv', 'summary', 'profile'].includes(activeTab) && activeTab !== 'selfdesign';
        if ((!isBuiltInCore || curTabObj?.isCustom) && tabs.length > 2) {
          if (confirm(`Remove tab "${curTabObj?.label}"?`)) {
            setTabs(prev => prev.filter(t => t.id !== activeTab));
            setActiveTab('electrical');
            showToast(true, 'Tab removed');
          }
        } else {
          showToast(false, 'Core system tabs cannot be closed');
        }
        return;
      }

      // Global Ctrl + Z / Cmd + Z -> Undo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Global Ctrl + Y / Cmd + Y or Ctrl + Shift + Z / Cmd + Shift + Z -> Redo
      if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, tabs, user, settings, boards, hvacUnits, plumbingFixtures, fireZones, solarLoads, solarCfg, genLoads, genFuel, genPF, smartDevices, cameras, cctvRetention, mainsOverrides, undoStack, redoStack]);

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const handleAlertToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        showToast(false, customEvent.detail);
      }
    };
    window.addEventListener('mep-alert-toast', handleAlertToast);
    return () => window.removeEventListener('mep-alert-toast', handleAlertToast);
  }, []);

  const handleLogOut = () => {
    localStorage.removeItem('mep_session_v1');
    setUser(null);
  };

  // Sizing Backup file export/import
  const exportBackupFile = () => {
    const backupData = {
      __mepBackupFile: true,
      version: 4,
      exportedAt: new Date().toISOString(),
      settings,
      boards,
      hvacUnits,
      plumbingFixtures,
      fireZones,
      solarLoads,
      solarCfg,
      genLoads,
      genFuel,
      genPF,
      smartDevices,
      cameras,
      cctvRetention,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = settings.projectName.replace(/\s+/g, '_');
    a.href = url;
    a.download = `MEP_Backup_${slug}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(true, 'Project Backup saved');
  };

  const applyWorkspaceUpdate = (res: any) => {
    if (!res) return;
    if (res.settings && Object.keys(res.settings).length > 0) {
      setSettings(prev => ({ ...prev, ...res.settings }));
    }
    if (res.boards && res.boards.length > 0) {
      setBoards(res.boards);
      setActiveBoardIndex(0);
    }
    if (res.hvacUnits && res.hvacUnits.length > 0) {
      setHvacUnits(res.hvacUnits);
    }
    if (res.plumbingFixtures && res.plumbingFixtures.length > 0) {
      setPlumbingFixtures(res.plumbingFixtures);
    }
    if (res.fireZones && res.fireZones.length > 0) {
      setFireZones(res.fireZones);
    }
    if (res.solarLoads && res.solarLoads.length > 0) {
      setSolarLoads(res.solarLoads);
    }
    if (res.solarCfg && Object.keys(res.solarCfg).length > 0) {
      setSolarCfg(prev => ({ ...prev, ...res.solarCfg }));
    }
    if (res.genLoads && res.genLoads.length > 0) {
      setGenLoads(res.genLoads);
    }
    if (res.genFuel) setGenFuel(res.genFuel);
    if (typeof res.genPF === 'number') setGenPF(res.genPF);
    if (res.smartDevices && res.smartDevices.length > 0) {
      setSmartDevices(res.smartDevices);
    }
    if (res.cameras && res.cameras.length > 0) {
      setCameras(res.cameras);
    }
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleUniversalFileImport = async (file: File) => {
    setIsImporting(true);
    try {
      trackHistory(boards);
      await new Promise(r => setTimeout(r, 120));
      const res = await parseMEPFile(file, boards, settings);
      applyWorkspaceUpdate(res);
      showToast(true, `📥 ${res.summaryMessage}`);
    } catch (err: any) {
      showToast(false, 'Import failed: ' + (err.message || 'invalid file format'));
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    const handleWorkspaceUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        applyWorkspaceUpdate(customEvent.detail);
      }
    };
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        showToast(customEvent.detail.ok, customEvent.detail.text);
      }
    };
    const handleUniversalImportTrigger = () => {
      fileInputRef.current?.click();
    };
    const handleImportLoading = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsImporting(Boolean(customEvent.detail));
    };

    window.addEventListener('trigger-mep-update-workspace', handleWorkspaceUpdate);
    window.addEventListener('trigger-mep-toast', handleToast);
    window.addEventListener('trigger-mep-universal-import', handleUniversalImportTrigger);
    window.addEventListener('trigger-mep-import-loading', handleImportLoading);

    return () => {
      window.removeEventListener('trigger-mep-update-workspace', handleWorkspaceUpdate);
      window.removeEventListener('trigger-mep-toast', handleToast);
      window.removeEventListener('trigger-mep-universal-import', handleUniversalImportTrigger);
      window.removeEventListener('trigger-mep-import-loading', handleImportLoading);
    };
  }, [boards, settings]);

  if (!user) {
    return <AuthPage onAuth={setUser} />;
  }

  return (
    <div className="h-screen bg-[#060913] flex flex-col font-sans text-[#cbd5e1] overflow-hidden">
      {/* Primary Header Rail */}
      <div className="sticky top-0 z-50">
        <div className="bg-gradient-to-r from-[#0b0e17] via-[#0f1322] to-[#0b0e17] border-b border-[#1f293d] px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ABLogo className="w-10 h-10 shadow-md drop-shadow-[0_4px_8px_rgba(236,72,153,0.15)] flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-[#38bdf8] via-[#cbd5e1] to-[#818cf8] bg-clip-text text-transparent">AB-ELECTROMART MEP+ Toolkit</span>
                <span className="text-[10px] bg-[#131a2c] text-sky-300 font-bold px-1.5 py-0.5 rounded border border-sky-500/10">v4</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/25 px-2 py-0.5 rounded-full font-mono font-semibold" title="Project is automatically saved every 5 minutes">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-save 5m {lastAutosavedTime ? `(${lastAutosavedTime})` : ''}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {settings.projectName} &bull; {settings.projectNo}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Simple Undo / Redo group */}
            <div className="flex items-center bg-[#0e131f] border border-[#232d3f] rounded-lg p-0.5 shadow-sm">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  undoStack.length === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-500'
                    : 'text-gray-300 hover:text-white hover:bg-[#1a2336]'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw size={13} />
                <span>Undo</span>
              </button>
              <div className="w-[1px] h-3.5 bg-[#232d3f] mx-0.5" />
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  redoStack.length === 0
                    ? 'opacity-30 cursor-not-allowed text-gray-500'
                    : 'text-gray-300 hover:text-white hover:bg-[#1a2336]'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <RotateCw size={13} />
                <span>Redo</span>
              </button>
            </div>

            {/* Dynamic Sizing Import & Export in title bar for all tabs */}
            <div className="flex items-center gap-2">
              {/* Import Data Dropdown */}
              <div
                className="relative group"
                onMouseEnter={() => setIsImportOpen(true)}
                onMouseLeave={() => setIsImportOpen(false)}
              >
                <button
                  onClick={() => {
                    setImportFileAccept('.xlsx,.xls,.csv,.txt,.json');
                    setTimeout(() => fileInputRef.current?.click(), 10);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                    isImportOpen
                      ? 'bg-[#253f54] text-sky-200 border border-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                      : 'bg-[#1a2d37] hover:bg-[#253f54] border border-[#2b6cb080] text-[#90cdf4]'
                  }`}
                  title="Import sizing sheet data from Excel, CSV, Text, or JSON files to populate all appropriate tables"
                >
                  <span>📥</span>
                  <span>Import Data</span>
                  <span className={`text-[10px] transition-transform duration-200 ${isImportOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>

                <div className={`absolute right-0 top-full pt-1 w-56 z-50 transition-all duration-150 ${isImportOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}`}>
                  <div className="bg-[#13192a] border border-[#2b6cb080] rounded-lg shadow-2xl overflow-hidden py-1 backdrop-blur-md">
                    <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-sky-400 uppercase border-b border-[#1f293d] bg-[#0f1422] flex items-center justify-between">
                      <span>Import Data Format</span>
                      <span className="text-[9px] text-sky-400/70 font-normal">Hover to Select</span>
                    </div>

                    <button
                      onClick={() => {
                        setImportFileAccept('.xlsx');
                        setIsImportOpen(false);
                        setTimeout(() => fileInputRef.current?.click(), 10);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-sky-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Select Excel Workbook (.xlsx) file to import"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded shadow-sm">XLSX</span>
                        <span className="text-xs">Excel Book (.xlsx)</span>
                      </span>
                      <span className="text-[10px] text-sky-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Select ➔</span>
                    </button>

                    <button
                      onClick={() => {
                        setImportFileAccept('.xls');
                        setIsImportOpen(false);
                        setTimeout(() => fileInputRef.current?.click(), 10);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-cyan-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Select Excel 97-2004 Workbook (.xls) file to import"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-cyan-400 font-mono text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded shadow-sm">XLS</span>
                        <span className="text-xs">Excel 97-2004 (.xls)</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Select ➔</span>
                    </button>

                    <button
                      onClick={() => {
                        setImportFileAccept('.csv');
                        setIsImportOpen(false);
                        setTimeout(() => fileInputRef.current?.click(), 10);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-amber-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Select Standard Comma Separated Values (.csv) file to import"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-amber-400 font-mono text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded shadow-sm">CSV</span>
                        <span className="text-xs">Standard CSV (.csv)</span>
                      </span>
                      <span className="text-[10px] text-amber-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Select ➔</span>
                    </button>

                    <button
                      onClick={() => {
                        setImportFileAccept('.txt');
                        setIsImportOpen(false);
                        setTimeout(() => fileInputRef.current?.click(), 10);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-purple-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Select Tab-Delimited Plain Text (.txt) file to import"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-purple-400 font-mono text-[10px] font-bold bg-purple-950/80 border border-purple-500/40 px-1.5 py-0.5 rounded shadow-sm">TXT</span>
                        <span className="text-xs">Tab-Delimited (.txt)</span>
                      </span>
                      <span className="text-[10px] text-purple-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Select ➔</span>
                    </button>

                    <div className="border-t border-[#1f293d] my-1"></div>

                    <button
                      onClick={() => {
                        setImportFileAccept('.json');
                        setIsImportOpen(false);
                        setTimeout(() => fileInputRef.current?.click(), 10);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-sky-300 text-[#90cdf4] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Import full project data from JSON file"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sky-400 font-mono text-[10px] font-bold bg-sky-950/80 border border-sky-500/40 px-1.5 py-0.5 rounded shadow-sm">JSON</span>
                        <span className="text-xs">📂 Backup JSON (.json)</span>
                      </span>
                      <span className="text-[10px] text-sky-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Select ➔</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Data Dropdown */}
              <div
                className="relative group"
                onMouseEnter={() => setIsExportOpen(true)}
                onMouseLeave={() => setIsExportOpen(false)}
              >
                <button
                  onClick={() => {
                    const suffix = activeTab === 'electrical' ? '' : `-${activeTab}`;
                    window.dispatchEvent(new CustomEvent(`trigger-mep-export${suffix}`, { detail: 'xlsx' }));
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                    isExportOpen
                      ? 'bg-[#253b30] text-emerald-200 border border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-[#1c2c24] hover:bg-[#253b30] border border-[#27674980] text-[#68d391]'
                  }`}
                  title="Export active table data to Excel, CSV, or Text format"
                >
                  <span>📤</span>
                  <span>Export Data</span>
                  <span className={`text-[10px] transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>

                <div className={`absolute right-0 top-full pt-1 w-56 z-50 transition-all duration-150 ${isExportOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}`}>
                  <div className="bg-[#13192a] border border-[#27674980] rounded-lg shadow-2xl overflow-hidden py-1 backdrop-blur-md">
                    <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-emerald-400 uppercase border-b border-[#1f293d] bg-[#0f1422] flex items-center justify-between">
                      <span>Export {activeTab.toUpperCase()} Data</span>
                      <span className="text-[9px] text-emerald-400/70 font-normal">Hover to Select</span>
                    </div>

                    <button
                      onClick={() => {
                        setIsExportOpen(false);
                        const suffix = activeTab === 'electrical' ? '' : `-${activeTab}`;
                        window.dispatchEvent(new CustomEvent(`trigger-mep-export${suffix}`, { detail: 'xlsx' }));
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-emerald-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Export table data to Excel Workbook (.xlsx)"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded shadow-sm">XLSX</span>
                        <span className="text-xs">Excel Book (.xlsx)</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Export ➔</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsExportOpen(false);
                        const suffix = activeTab === 'electrical' ? '' : `-${activeTab}`;
                        window.dispatchEvent(new CustomEvent(`trigger-mep-export${suffix}`, { detail: 'xls' }));
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-cyan-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Export table data to Excel 97-2004 (.xls)"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-cyan-400 font-mono text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded shadow-sm">XLS</span>
                        <span className="text-xs">Excel 97-2004 (.xls)</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Export ➔</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsExportOpen(false);
                        const suffix = activeTab === 'electrical' ? '' : `-${activeTab}`;
                        window.dispatchEvent(new CustomEvent(`trigger-mep-export${suffix}`, { detail: 'csv' }));
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-amber-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Export table data to Standard CSV (.csv)"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-amber-400 font-mono text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded shadow-sm">CSV</span>
                        <span className="text-xs">Standard CSV (.csv)</span>
                      </span>
                      <span className="text-[10px] text-amber-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Export ➔</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsExportOpen(false);
                        const suffix = activeTab === 'electrical' ? '' : `-${activeTab}`;
                        window.dispatchEvent(new CustomEvent(`trigger-mep-export${suffix}`, { detail: 'txt' }));
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-purple-300 text-[#cbd5e0] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Export table data to Tab-Delimited Plain Text (.txt)"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-purple-400 font-mono text-[10px] font-bold bg-purple-950/80 border border-purple-500/40 px-1.5 py-0.5 rounded shadow-sm">TXT</span>
                        <span className="text-xs">Tab-Delimited (.txt)</span>
                      </span>
                      <span className="text-[10px] text-purple-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Export ➔</span>
                    </button>

                    <div className="border-t border-[#1f293d] my-1"></div>

                    <button
                      onClick={() => {
                        setIsExportOpen(false);
                        exportBackupFile();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#1e293b] hover:text-emerald-300 text-[#68d391] font-semibold bg-transparent border-none cursor-pointer flex items-center justify-between group/item transition-all duration-150 hover:pl-4"
                      title="Export full project data to JSON file"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sky-400 font-mono text-[10px] font-bold bg-sky-950/80 border border-sky-500/40 px-1.5 py-0.5 rounded shadow-sm">JSON</span>
                        <span className="text-xs">💾 Backup JSON (.json)</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 opacity-0 group-hover/item:opacity-100 transition-opacity font-mono font-bold">Backup ➔</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sizing Backups & Multi-Table Universal Input Element */}
              <input
                ref={fileInputRef}
                type="file"
                accept={importFileAccept}
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUniversalFileImport(file);
                  e.target.value = '';
                }}
              />
            </div>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-mep-manage-dropdowns'))}
              className="px-3 py-1.5 rounded bg-[#1a1f2e] border border-[#2d3748] hover:text-white text-[#cbd5e0] cursor-pointer text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Manage Dropdowns & Edit Existing Lists"
            >
              <span>📋</span> Manage Lists
            </button>

            <button
              onClick={() => setSettingsOpen(prev => !prev)}
              className="px-3 py-1.5 rounded bg-[#2b6cb0] hover:bg-[#3182ce] text-white cursor-pointer text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <span>⚙️</span> Settings
            </button>

            {/* User Session card */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#2d3748] ml-2">
              <div className="flex items-center gap-2 bg-[#1a1f2e] border border-[#2d3748] px-2 py-1 rounded-lg">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-[10px] text-white select-none">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-[11px] font-semibold text-gray-300 max-w-[80px] truncate">{user.username}</span>
                <button
                  onClick={handleLogOut}
                  className="text-red-400 hover:text-red-300 cursor-pointer font-bold text-xs pl-2.5 pr-1 outline-none border-none bg-transparent hover:underline flex items-center gap-1.5"
                  title="Log out of local workspace"
                >
                  <Power className="w-3.5 h-3.5" /> Log Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global tab rail */}
        <div className="flex bg-[#090c14] border-b border-[#1b2333] overflow-x-auto select-none items-center">
          {tabs.map((tab, idx) => {
            const isBuiltInCore = ['electrical', 'hvac', 'plumbing', 'fire', 'solar', 'generator', 'smarthome', 'cctv', 'summary', 'profile'].includes(tab.id) && tab.id !== 'selfdesign';

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 border-b-2 font-bold text-xs cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap group ${
                  activeTab === tab.id
                    ? 'bg-[#0e2238] text-sky-300 border-sky-400'
                    : 'border-transparent text-gray-400 hover:text-sky-200 hover:bg-[#0d111a]/50'
                }`}
                style={activeTab === tab.id ? { borderColor: '#38bdf8' } : {}}
              >
                {/* Move Left */}
                {idx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTabs = [...tabs];
                      const temp = newTabs[idx];
                      newTabs[idx] = newTabs[idx - 1];
                      newTabs[idx - 1] = temp;
                      setTabs(newTabs);
                    }}
                    className="p-0.5 hover:bg-white/10 text-[#4a5568] hover:text-white rounded transition-colors text-[9px] font-bold cursor-pointer"
                    title="Move tab left"
                  >
                    ◀
                  </button>
                )}

                <span>{tab.icon}</span>
                <span>{tab.label}</span>

                {/* Move Right */}
                {idx < tabs.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTabs = [...tabs];
                      const temp = newTabs[idx];
                      newTabs[idx] = newTabs[idx + 1];
                      newTabs[idx + 1] = temp;
                      setTabs(newTabs);
                    }}
                    className="p-0.5 hover:bg-white/10 text-[#4a5568] hover:text-white rounded transition-colors text-[9px] font-bold cursor-pointer"
                    title="Move tab right"
                  >
                    ▶
                  </button>
                )}

                {/* Delete Tab Button for custom / dynamic tabs */}
                {(!isBuiltInCore || tab.isCustom) && tabs.length > 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove tab "${tab.label}"?`)) {
                        setTabs(prev => prev.filter(t => t.id !== tab.id));
                        if (activeTab === tab.id) setActiveTab('electrical');
                      }
                    }}
                    className="p-0.5 opacity-60 hover:opacity-100 hover:bg-rose-950/80 text-rose-400 rounded transition-all text-[10px] ml-0.5"
                    title="Delete Tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* ADD NEW TAB BUTTON */}
          <button
            onClick={() => {
              setNewTabName('');
              setNewTabIcon('🎨');
              setNewTabType('selfdesign');
              setIsAddTabModalOpen(true);
            }}
            className="px-3 py-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent ml-1 shrink-0"
            title="Create a new custom engineering tab or kit design canvas (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" /> + Add New Tab
          </button>

          {/* WINDOWS SHORTCUTS BUTTON */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="px-2.5 py-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/50 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap border border-amber-500/30 ml-2 shrink-0 bg-[#0c101c] rounded-lg shadow-sm"
            title="View Windows Keyboard Shortcuts Guide (F1 or Ctrl+/)"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" /> ⌨️ Windows Short Keys (F1)
          </button>
        </div>
      </div>

      {/* WINDOWS KEYBOARD SHORTCUTS CHEAT SHEET MODAL */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
          <div className="bg-[#0c101c] border border-cyan-500/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-[#121829] border-t-2 border-t-cyan-400">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-amber-400" /> Windows Keyboard Short Keys Reference
              </h3>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1 rounded-lg transition-colors"
              >
                ✕ Esc
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="bg-cyan-950/40 border border-cyan-800/60 p-3 rounded-xl text-cyan-200 text-xs flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span>
                  <strong>Windows Short Key Functions Active:</strong> Key combinations are enabled across all engineering tabs & design studios!
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Section 1: Navigation & Tabs */}
                <div className="bg-[#111728] border border-gray-800 p-4 rounded-xl space-y-2.5">
                  <h4 className="font-bold text-cyan-400 border-b border-gray-800 pb-1.5 flex items-center gap-1.5 text-xs">
                    <span>📑</span> Tab Navigation
                  </h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Jump to Tab 1 - 9</span>
                      <kbd className="bg-slate-800 text-cyan-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + 1..9</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Next / Previous Tab</span>
                      <kbd className="bg-slate-800 text-cyan-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + Tab</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Cycle Adjacent Tab</span>
                      <kbd className="bg-slate-800 text-cyan-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + Shift + ← / →</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Add New Custom Tab</span>
                      <kbd className="bg-slate-800 text-amber-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + N / Alt + N</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Close Current Custom Tab</span>
                      <kbd className="bg-slate-800 text-rose-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + Shift + W</kbd>
                    </div>
                  </div>
                </div>

                {/* Section 2: Project File & System */}
                <div className="bg-[#111728] border border-gray-800 p-4 rounded-xl space-y-2.5">
                  <h4 className="font-bold text-emerald-400 border-b border-gray-800 pb-1.5 flex items-center gap-1.5 text-xs">
                    <span>💾</span> File & Project System
                  </h4>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Quick Save Project</span>
                      <kbd className="bg-slate-800 text-emerald-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + S</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Print / Export PDF</span>
                      <kbd className="bg-slate-800 text-emerald-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + P</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Undo Action</span>
                      <kbd className="bg-slate-800 text-emerald-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + Z</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Redo Action</span>
                      <kbd className="bg-slate-800 text-emerald-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + Y</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Toggle Sidebar Pin</span>
                      <kbd className="bg-slate-800 text-emerald-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + M</kbd>
                    </div>
                  </div>
                </div>

                {/* Section 3: Design Canvas & Kit Studio */}
                <div className="bg-[#111728] border border-gray-800 p-4 rounded-xl space-y-2.5 md:col-span-2">
                  <h4 className="font-bold text-purple-400 border-b border-gray-800 pb-1.5 flex items-center gap-1.5 text-xs">
                    <span>🎨</span> Kit Design Canvas Short Keys
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Delete Selected Item</span>
                      <kbd className="bg-slate-800 text-rose-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Delete / Backspace</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Duplicate Selected Item</span>
                      <kbd className="bg-slate-800 text-purple-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + D</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Nudge Selected Item</span>
                      <kbd className="bg-slate-800 text-purple-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Arrow Keys (Shift for 2x)</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Zoom In / Zoom Out</span>
                      <kbd className="bg-slate-800 text-purple-300 border border-slate-700 px-2 py-0.5 rounded font-bold">Ctrl + (+) / Ctrl + (-)</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-[#121829] flex justify-between items-center">
              <span className="text-[11px] text-gray-400 font-mono">Press <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">F1</kbd> or <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">Ctrl + /</kbd> anytime to open</span>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-cyan-950 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW TAB MODAL */}
      {isAddTabModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
          <div className="bg-[#0d1322]/95 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-[#12192b]/95">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Create New Navigation Tab
              </h3>
              <button
                onClick={() => setIsAddTabModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-gray-300 block mb-1.5 font-semibold">Tab Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g., Modular Kit Canvas, Solar Substation, HVAC Riser..."
                  value={newTabName}
                  onChange={e => setNewTabName(e.target.value)}
                  className="w-full bg-[#0b0e17] border border-gray-800 rounded-xl px-3.5 py-2 text-gray-200 outline-none focus:border-cyan-500 font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1.5 font-semibold">Select Tab Icon</label>
                <div className="flex flex-wrap gap-2">
                  {['🎨', '⚡', '❄️', '💧', '🔥', '☀️', '⚙️', '🏡', '📹', '📋', '📊', '🛠️', '📐', '🏗️', '📦', '🌊'].map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewTabIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all ${
                        newTabIcon === icon 
                          ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 scale-105' 
                          : 'bg-[#0b0e17] text-gray-300 border border-gray-800 hover:bg-gray-800'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1.5 font-semibold">Tab Type & Tool Page</label>
                <div className="grid grid-cols-1 gap-2">
                  <label 
                    onClick={() => setNewTabType('selfdesign')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                      newTabType === 'selfdesign' 
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200' 
                        : 'bg-[#0b0e17] border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Box className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-xs text-white">Drag & Drop Self Design Kit Studio</strong>
                      <span className="text-[10px] text-gray-400">Interactive component canvas, wire/pipe interconnections, auto BEME calculation.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-[#12192b]/95 flex justify-end gap-2">
              <button
                onClick={() => setIsAddTabModalOpen(false)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newTabName.trim()) return;
                  const tabId = `tab_${Date.now()}`;
                  const newTab: CustomTabConfig = {
                    id: tabId,
                    icon: newTabIcon,
                    label: newTabName.trim(),
                    type: newTabType,
                    isCustom: true
                  };
                  setTabs(prev => {
                    const summaryIdx = prev.findIndex(t => t.id === 'summary');
                    if (summaryIdx !== -1) {
                      const copy = [...prev];
                      copy.splice(summaryIdx, 0, newTab);
                      return copy;
                    }
                    return [...prev, newTab];
                  });
                  setActiveTab(tabId);
                  setIsAddTabModalOpen(false);
                }}
                disabled={!newTabName.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-cyan-950"
              >
                Create Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar + Main Content Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Main Container Stage */}
        <div className="flex-1 pt-5 px-6 pb-0 max-w-[100%] mx-auto w-full box-border overflow-y-auto">
          {settingsOpen && (
            <div className="mb-4">
              <ProjectSettingsPanel settings={settings} setSettings={setSettings} onClose={() => setSettingsOpen(false)} />
            </div>
          )}

          {activeTab === 'electrical' && (
            <ElectricalTab
              boards={boards}
              setBoards={setBoards}
              activeIndex={activeBoardIndex}
              setActiveIndex={setActiveBoardIndex}
              settings={settings}
              setSettings={setSettings}
              trackHistory={trackHistory}
              mainsOverrides={mainsOverrides}
              setMainsOverrides={setMainsOverrides}
              hvacUnits={hvacUnits}
              setHvacUnits={setHvacUnits}
            />
          )}

          {activeTab === 'hvac' && (
            <HvacTab
              units={hvacUnits}
              setUnits={setHvacUnits}
              boards={boards}
              setBoards={setBoards}
              settings={settings}
              setSettings={setSettings}
            />
          )}

          {activeTab === 'plumbing' && (
            <PlumbingTab
              fixtures={plumbingFixtures}
              setFixtures={setPlumbingFixtures}
              settings={settings}
              setSettings={setSettings}
            />
          )}

          {activeTab === 'fire' && (
            <FireTab
              zones={fireZones}
              setZones={setFireZones}
              settings={settings}
              setSettings={setSettings}
            />
          )}

          {activeTab === 'solar' && (
            <SolarTab loads={solarLoads} setLoads={setSolarLoads} config={solarCfg} setConfig={setSolarCfg} />
          )}

          {activeTab === 'generator' && (
            <GeneratorTab
              loads={genLoads}
              setLoads={setGenLoads}
              fuelType={genFuel}
              setFuelType={setGenFuel}
              genPF={genPF}
              setGenPF={setGenPF}
              boards={boards}
              settings={settings}
            />
          )}

          {activeTab === 'smarthome' && (
            <SmartHomeTab
              devices={smartDevices}
              setDevices={setSmartDevices}
              activeRooms={Array.from(new Set(
                boards.flatMap(b => b.circuits.map(c => c.room).filter(Boolean))
              ))}
              settings={settings}
              setSettings={setSettings}
            />
          )}

          {activeTab === 'cctv' && (
            <CctvTab
              cameras={cameras}
              setCameras={setCameras}
              retentionDays={cctvRetention}
              setRetentionDays={setCctvRetention}
              settings={settings}
              setSettings={setSettings}
            />
          )}

          {activeTab === 'summary' && (
            <SummaryTab
              boards={boards}
              hvacUnits={hvacUnits}
              plumbingFixtures={plumbingFixtures}
              fireZones={fireZones}
              solarLoads={solarLoads}
              solarCfg={solarCfg}
              genLoads={genLoads}
              smartDevices={smartDevices}
              cameras={cameras}
              settings={settings}
              mainsOverrides={mainsOverrides}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              user={user}
              boards={boards}
              setBoards={setBoards}
              hvacUnits={hvacUnits}
              setHvacUnits={setHvacUnits}
              plumbingFixtures={plumbingFixtures}
              setPlumbingFixtures={setPlumbingFixtures}
              fireZones={fireZones}
              setFireZones={setFireZones}
              solarLoads={solarLoads}
              setSolarLoads={setSolarLoads}
              solarCfg={solarCfg}
              setSolarCfg={setSolarCfg}
              genLoads={genLoads}
              setGenLoads={setGenLoads}
              smartDevices={smartDevices}
              setSmartDevices={setSmartDevices}
              cameras={cameras}
              setCameras={setCameras}
              onChangeAccent={setAccentColor}
              showToast={showToast}
            />
          )}

          {/* SELF DESIGN TOOL PAGE (for Kit Design Studio & Custom Dynamic Canvas Tabs) */}
          {(!['electrical', 'hvac', 'plumbing', 'fire', 'solar', 'generator', 'smarthome', 'cctv', 'summary', 'profile'].includes(activeTab) || activeTab === 'selfdesign') && (
            <SelfDesignTab
              settings={settings}
              tabId={activeTab}
              tabName={tabs.find(t => t.id === activeTab)?.label || 'Kit Design Studio'}
              selfDesignData={selfDesignKits[activeTab]}
              onSelfDesignDataChange={data => handleSelfDesignDataChange(activeTab, data)}
            />
          )}

        </div>
      </div>

      {/* Loading Overlay when Importing File Data */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 transition-all duration-300">
          <div className="bg-[#111625] border border-sky-500/40 rounded-2xl p-7 max-w-sm w-full text-center shadow-[0_0_40px_rgba(56,189,248,0.25)] flex flex-col items-center animate-in fade-in zoom-in-95">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin" />
              <div className="absolute text-sky-400 font-black text-xs">MEP</div>
            </div>
            <h3 className="text-base font-extrabold text-white tracking-wide">Reading & Processing Import File...</h3>
            <p className="text-xs text-sky-300/80 mt-1.5 font-mono">Parsing worksheets into active engineering tables</p>
          </div>
        </div>
      )}

      {/* Toast Notification Floating Banner - Fixed Overlay so it never shifts layout or buttons */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[99999] pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-3">
          <div className={`px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-bold font-sans flex items-center gap-2 ${
            toast.ok
              ? 'bg-[#0f241a]/95 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50'
              : 'bg-[#2a0f14]/95 text-rose-300 border-rose-500/40 shadow-rose-950/50'
          }`}>
            <span className="text-sm font-black">{toast.ok ? '✓' : '✕'}</span>
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const _t = () => Math.random().toString(36).slice(2, 8).toUpperCase();
