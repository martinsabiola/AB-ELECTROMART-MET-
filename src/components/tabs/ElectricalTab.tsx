import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Eye, EyeOff, Layout, ChevronDown, ChevronUp, Cpu, Layers, Copy, Trash2, Search } from 'lucide-react';
import { Board, Circuit, ProjectSettings, ROOM_LUX_DATABASE, getTargetLuxForRoom, getRoundingValue, HvacUnit } from '../../types';
import { getCableColors, calculateCB, exportActiveBoardToCSV, exportActiveBoardToXLSX, exportActiveBoardToTXT, getLightingSubCircuitMap } from '../../utils/exportUtils';
import ImportModal from '../ui/ImportModal';
import IndustrialTab from './IndustrialTab';
import { calculateAcHp } from './HvacTab';
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

// Constants for Dropdowns
export const LOAD_TYPES = ['Lighting', 'Sockets', 'Air Conditioner', 'Dedicated'] as const;

export const DEFAULT_DROPDOWNS: Record<string, string[]> = {
  'Lighting Types': ['Ambient', 'Task', 'Accent'],
  'Fixture Styles': ['Droplet', 'Spot', 'Modular', 'Strip Light', 'Wall Light', 'Star Light', 'Chandelier'],
  'Mount Types': ['Recessed', 'Surface'],
  'Lighting Controls': ['Smart', 'Non Smart'],
  'Socket Types': ['Double', 'Single', 'Grid Socket'],
  'Socket Ratings': ['13A', '15A', '20-45A'],
  'Socket Sizing / Rating': [
    'Spare',
    'Airfryer',
    'Alarm',
    'Beard Trimmer',
    'Bidet',
    'Blender',
    'Boosterpump',
    'Boreholepump',
    'Breadmaker',
    'Circularsaw',
    'Cleaner',
    'Coffeemaker',
    'Compressor',
    'Computer',
    'Console',
    'Cooktop',
    'CrossTrainer',
    'Dehumidifier',
    'Dehydrator',
    'Dishwasher',
    'Dispenser',
    'Disposal',
    'Drill',
    'Dryer',
    'Eggcooker',
    'Elliptical',
    'ExerciseBike',
    'FacialSteamer',
    'Fan',
    'Fireplace',
    'FootSpa',
    'Fountainpump',
    'Freezer',
    'Garagedoor',
    'GarmentSteamer',
    'Gardenpump',
    'Gatemotor',
    'Grinder',
    'GrinderTool',
    'Grill',
    'HairClipper',
    'HairCurler',
    'Hairdryer',
    'HairStraightener',
    'Hammer',
    'Hedgetrimmer',
    'HomeGym',
    'Hood',
    'HotAirBrush',
    'Hotplate',
    'Icemaker',
    'Induction',
    'Inflator',
    'Iron',
    'IronPress',
    'Jigsaw',
    'Juicer',
    'Kettle',
    'Laptop',
    'Lawnmower',
    'Leafblower',
    'MassageChair',
    'MassageGun',
    'Massager',
    'Microwave',
    'Mixer',
    'Monitor',
    'Mop',
    'Multicooker',
    'Oven',
    'Piano',
    'Poolpump',
    'Pressurecooker',
    'Pressurewasher',
    'Printer',
    'Processor',
    'Projector',
    'Purifier',
    'Refrigerator',
    'Ricecooker',
    'Robot',
    'RowingMachine',
    'Sandwichmaker',
    'Sealer',
    'Slowcooker',
    'SkiMachine',
    'Sockets',
    'Soundbar',
    'Speaker',
    'SpinBike',
    'StairClimber',
    'Steamer',
    'Stringtrimmer',
    'Submersiblepump',
    'Surfacepump',
    'Television',
    'Toaster',
    'TowelWarmer',
    'Treadmill',
    'UPS',
    'Vacuum',
    'VibrationPlate',
    'Wafflemaker',
    'Warmer',
    'Washer',
    'WasherDryer',
    'Welder'
  ],
  'Socket Fix Styles': ['Indoor', 'Outdoor'],
  'Socket Mounts': ['Wall', 'Floor', 'In-Object'],
  'Socket Controls': ['Smart', 'Non Smart'],
  'AC Types': ['Window', 'Split', 'Cassette', 'Ducted', 'Central'],
  'AC Fix Styles': ['Inverter', 'Non Inverter'],
  'AC Mounts': ['In-Wall', 'Standing', 'Ceiling'],
  'AC Controls': ['Smart', 'Non Smart'],
  'Dedicated Types': ['Single Phase', 'Three Phase'],
  'Dedicated Fix Styles': ['Indoor', 'Outdoor'],
  'Dedicated 3Phase Variances': [
    '13A 3ph Industrial',
    '16A 3ph Industrial',
    '32A 3ph Industrial',
    '63A 3ph Industrial'
  ],
  'Wire Sizes (mm²)': ['1', '1.5', '2.5', '4', '6', '10', '16', '25', '35', '50'],
  'Cable Cores': ['1 Core', '2 Cores', '3 Cores', '4 Cores', '5 Cores'],
  'Switch Types': [
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
  ],
  'CB Sizes (A)': ['6', '10', '16', '20', '25', '32', '40', '50', '63', '80', '100', '125', '160', '200', '250', '400', '630']
};

export const LIGHTING_TYPES = DEFAULT_DROPDOWNS['Lighting Types'];
export const FIXTURE_STYLES = DEFAULT_DROPDOWNS['Fixture Styles'];
export const MOUNT_TYPES = DEFAULT_DROPDOWNS['Mount Types'];
export const LIGHTING_CONTROLS = DEFAULT_DROPDOWNS['Lighting Controls'];
export const SOCKET_TYPES = DEFAULT_DROPDOWNS['Socket Types'];
export const SOCKET_RATINGS = DEFAULT_DROPDOWNS['Socket Ratings'];
export const SOCKET_VARIANCES = DEFAULT_DROPDOWNS['Socket Sizing / Rating'];
export const SOCKET_FIX_STYLES = DEFAULT_DROPDOWNS['Socket Fix Styles'];
export const SOCKET_MOUNTS = DEFAULT_DROPDOWNS['Socket Mounts'];
export const SOCKET_CONTROLS = DEFAULT_DROPDOWNS['Socket Controls'];
export const AC_TYPES = DEFAULT_DROPDOWNS['AC Types'];
export const AC_FIX_STYLES = DEFAULT_DROPDOWNS['AC Fix Styles'];
export const AC_MOUNTS = DEFAULT_DROPDOWNS['AC Mounts'];
export const AC_CONTROLS = DEFAULT_DROPDOWNS['AC Controls'];
export const DEDICATED_TYPES = DEFAULT_DROPDOWNS['Dedicated Types'];
export const DEDICATED_FIX_STYLES = DEFAULT_DROPDOWNS['Dedicated Fix Styles'];
export const DEDICATED_3PH_VARIANCES = DEFAULT_DROPDOWNS['Dedicated 3Phase Variances'];
export const WIRE_SIZES = DEFAULT_DROPDOWNS['Wire Sizes (mm²)'];
export const CABLE_CORES = DEFAULT_DROPDOWNS['Cable Cores'];
export const SWITCH_TYPES = DEFAULT_DROPDOWNS['Switch Types'];
export const CB_SIZES = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 400, 630];

// Socket Appliance / Variance Actual Wattage Ratings Mapping
export const SOCKET_APPLIANCE_WATTS_MAP: Record<string, number> = {
  // Specified 107 Appliances
  'Spare': 0,
  'Airfryer': 1800,
  'Alarm': 30,
  'Beard Trimmer': 50,
  'Bidet': 1200,
  'Blender': 500,
  'Boosterpump': 1000,
  'Boreholepump': 1500,
  'Breadmaker': 800,
  'Circularsaw': 1800,
  'Cleaner': 1500,
  'Coffeemaker': 1200,
  'Compressor': 2000,
  'Computer': 300,
  'Console': 180,
  'Cooktop': 2000,
  'CrossTrainer': 500,
  'Dehumidifier': 500,
  'Dehydrator': 600,
  'Dishwasher': 1800,
  'Dispenser': 120,
  'Disposal': 700,
  'Drill': 800,
  'Dryer': 3000,
  'Eggcooker': 350,
  'Elliptical': 500,
  'ExerciseBike': 300,
  'FacialSteamer': 300,
  'Fan': 75,
  'Fireplace': 1800,
  'FootSpa': 500,
  'Fountainpump': 300,
  'Freezer': 250,
  'Garagedoor': 600,
  'GarmentSteamer': 1800,
  'Gardenpump': 750,
  'Gatemotor': 750,
  'Grinder': 500,
  'GrinderTool': 1000,
  'Grill': 1800,
  'HairClipper': 100,
  'HairCurler': 60,
  'Hairdryer': 1800,
  'HairStraightener': 60,
  'Hammer': 1000,
  'Hedgetrimmer': 600,
  'HomeGym': 1000,
  'Hood': 200,
  'HotAirBrush': 1200,
  'Hotplate': 1500,
  'Icemaker': 200,
  'Induction': 2000,
  'Inflator': 150,
  'Iron': 1500,
  'IronPress': 2500,
  'Jigsaw': 700,
  'Juicer': 600,
  'Kettle': 2000,
  'Laptop': 90,
  'Lawnmower': 1500,
  'Leafblower': 1200,
  'MassageChair': 250,
  'MassageGun': 60,
  'Massager': 100,
  'Microwave': 1200,
  'Mixer': 300,
  'Monitor': 50,
  'Mop': 400,
  'Multicooker': 1200,
  'Oven': 3000,
  'Piano': 50,
  'Poolpump': 1500,
  'Pressurecooker': 1000,
  'Pressurewasher': 2000,
  'Printer': 500,
  'Processor': 800,
  'Projector': 350,
  'Purifier': 60,
  'Refrigerator': 200,
  'Ricecooker': 1000,
  'Robot': 60,
  'RowingMachine': 300,
  'Sandwichmaker': 800,
  'Sealer': 150,
  'Slowcooker': 250,
  'SkiMachine': 700,
  'Sockets': 200,
  'Soundbar': 80,
  'Speaker': 100,
  'SpinBike': 150,
  'StairClimber': 700,
  'Steamer': 1800,
  'Stringtrimmer': 700,
  'Submersiblepump': 1500,
  'Surfacepump': 750,
  'Television': 120,
  'Toaster': 1200,
  'TowelWarmer': 150,
  'Treadmill': 2500,
  'UPS': 300,
  'Vacuum': 1500,
  'VibrationPlate': 500,
  'Wafflemaker': 1200,
  'Warmer': 250,
  'Washer': 1000,
  'WasherDryer': 2500,
  'Welder': 5000,

  // Fallback Aliases & Legacy Mappings
  '13A Socket (General Purpose)': 200,
  '13A Socket': 200,
  '13A floor socket': 200,
  '13A In-Object': 200,
  '15A-20A Socket': 2000,
  '32A Socket (cooker equipment)': 3500,
  'Socket with USB-A/USB-C': 200,
  'Smart Wi-Fi Socket': 200,
  'Child-Proof Socket': 200,
  'Shaver Socket': 50,
  '16A 3ph Industrial': 3500,
  '32A 3ph Industrial': 7000,
  '63A 3ph Industrial': 15000,
  '13A': 200,
  '15A': 2000,
  '20-60A': 3000,
  'Air Fryer': 1800,
  'Coffee Maker': 1200,
  'Washing Machine': 1000,
  'Refrigerator / Fridge': 200,
};

export function getSocketApplianceWatts(varianceStr?: string): number | null {
  if (!varianceStr) return null;
  // 1. Direct exact key lookup
  if (SOCKET_APPLIANCE_WATTS_MAP[varianceStr] !== undefined) {
    return SOCKET_APPLIANCE_WATTS_MAP[varianceStr];
  }
  const lower = varianceStr.trim().toLowerCase();
  // 2. Case-insensitive exact lookup
  for (const [key, watts] of Object.entries(SOCKET_APPLIANCE_WATTS_MAP)) {
    if (key.toLowerCase() === lower) {
      return watts;
    }
  }
  // 3. Normalized alphanumeric lookup
  const normVal = lower.replace(/[^a-z0-9]/g, '');
  if (normVal) {
    for (const [key, watts] of Object.entries(SOCKET_APPLIANCE_WATTS_MAP)) {
      if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === normVal) {
        return watts;
      }
    }
  }
  // 4. Substring fallback lookup
  for (const [key, watts] of Object.entries(SOCKET_APPLIANCE_WATTS_MAP)) {
    const keyLower = key.toLowerCase();
    if (keyLower.length > 3 && (lower.includes(keyLower) || keyLower.includes(lower))) {
      return watts;
    }
  }
  return null;
}

// Switch multipliers
export const SWITCH_GANG_MULTIPLIERS: Record<string, number> = {
  'None': 0,
  '1 Gang': 1,
  '1 Gang Smart': 1,
  '2 Gang': 2,
  '2 Gang Smart': 2,
  '3 Gang': 3,
  '3 Gang Smart': 3,
  '4 Gang': 4,
  '4 Gang Smart': 4,
  '10 Grid': 10,
  '13A 1G AC Switch': 1,
  '20A 2G AC Grid': 2,
  '32A 3G AC Grid': 3,
  '45A 4G AC Grid': 4,
  'Motion Switch': 1,
};

export function getNextCircuitId(circuits: Circuit[], previousIdStr?: string): string {
  const lastId = previousIdStr || (circuits.length > 0 ? circuits[circuits.length - 1].circuitId : '') || '';
  if (!lastId) return 'C01';
  
  const match = lastId.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const num = parseInt(numStr, 10);
    const nextNumStr = String(num + 1).padStart(numStr.length, '0');
    return prefix + nextNumStr;
  }
  
  const matchAnyNum = lastId.match(/^(.*?)(\d+)(.*?)$/);
  if (matchAnyNum) {
    const prefix = matchAnyNum[1];
    const numStr = matchAnyNum[2];
    const suffix = matchAnyNum[3];
    const num = parseInt(numStr, 10);
    const nextNumStr = String(num + 1).padStart(numStr.length, '0');
    return prefix + nextNumStr + suffix;
  }
  
  return 'C' + String(circuits.length + 1).padStart(2, '0');
}

export const DROPLET_VARIANCES = [
  'None',
  'Pendant Droplet',
  'Multi-Droplet Chandeliers',
  'Crystal Droplet',
  'Outdoor Droplet',
  'Smart Droplet',
  'Bubble Droplet',
  'Waterfall (Rainfall) Droplet Lights',
  'Cluster Droplet Lights',
  'Mini Droplet Spotlights'
];

export const SPOT_VARIANCES = [
  'None',
  'Adjustable Spotlights',
  'Fixed Spotlights',
  'Track Spotlights',
  'Single Spotlights',
  'Twin Spotlights',
  'Triple Spotlights',
  'Dimmable Spotlights',
  'Smart Spotlights',
  'Outdoor Spotlights'
];

export const MODULAR_VARIANCES = [
  'None',
  'Suspended Modular',
  'Linear Modular',
  'Square Modular',
  'Rectangular Modular',
  'Circle Modular',
  'Grid Modular Lights',
  'Magnetic Modular',
  'Dimmable Modular',
  'Smart Modular Lights',
  'Office Modular Lights',
  'Architectural Modular',
  'Customizable Modular'
];

export const STRIP_VARIANCES = [
  'None',
  'Flexible LED Strip',
  'FIXED LED Strip',
  'COB LED Strip',
  'SMD LED Strip',
  'Single-Color Strip',
  'Tunable White Strip',
  'RGB Strip',
  'RGBW Strip',
  'RGB+CCT Strip',
  'Addressable (Pixel) LED Strip',
  'Waterproof LED Strip',
  'Neon Flex Strip',
  'High-Density LED Strip',
  'Low-Voltage (12V) StriP',
  'Dimmable LED Strip Lights',
  'Smart LED Strip Lights',
  'Under-Cabinet Strip Lights',
  'Outdoor LED Strip Lights'
];

export const WALL_LIGHT_VARIANCES = [
  'None',
  'Up & Down Wall Light',
  'Up Wall Light',
  'Down Wall Light',
  'LED Wall Light',
  'Wall Sconce',
  'Decorative Wall Light',
  'Bedside Wall Light',
  'Reading Wall Light',
  'Mirror Wall Light',
  'Vanity Wall Light',
  'Outdoor Wall Light',
  'Security Wall Light',
  'Bulkhead Wall Light',
  'Motion Sensor Wall Light',
  'Waterproof Wall Light',
  'Dimmable Wall Light',
  'Smart Wall Light',
  'Surface-Mounted Wall Light',
  'Adjustable Wall Light',
  'Picture Wall Light'
];

export const STAR_LIGHT_VARIANCES = [
  'None',
  'Fiber Optic Star Lights',
  'Star Ceiling Lights',
  'Twinkle Star Lights',
  'RGB Star Lights',
  'Smart Star Lights',
  'Dimmable Star Lights',
  'Mini Star Spotlights',
  'Constellation Star Lights',
  'Star Projection Lights',
  'Star Pendant Lights',
  'Star Chandelier Lights',
  'Outdoor Star Lights',
  'Waterproof Star Lights',
  'Night Sky Star Lights'
];

export const CHANDELIER_VARIANCES = [
  'None',
  'Crystal Chandelier',
  'Antique Chandelier',
  'LED Chandelier',
  'Ring Chandelier',
  'Linear Chandelier',
  'Candle Chandelier',
  'Drum Chandelier',
  'Sputnik Chandelier',
  'Lantern Chandelier',
  'Spiral Chandelier',
  'Waterfall Chandelier',
  'Raindrop Chandelier',
  'Globe Chandelier',
  'Contemporary Chandelier',
  'Dimmable Chandelier'
];

const ROOM_LIST = Object.keys(ROOM_LUX_DATABASE);

const LOCATION_SUGGESTIONS = [
  'Main Distribution Board Room',
  'Electrical Room',
  'MDB Room',
  'Basement Utility',
  'Lobby Panel Closet',
  'Server & IT Room',
  'Generator Room',
  'Main Hall Corridor',
  'Utility Closet',
  'Plant Room',
];

// Phase colors for visual balancer
const PHASE_COLORS: Record<string, string> = {
  R: '#ff0017',
  Y: '#ffc30a',
  B: '#248bff',
  L: '#a855f7',
};

// Cable Color Palette
const CABLE_PALETTE: Record<string, { hex: string; text: string }> = {
  Red: { hex: '#e53e3e', text: '#fc8181' },
  Black: { hex: '#1a202c', text: '#a0aec0' },
  Green: { hex: '#2f855a', text: '#68d391' },
  Yellow: { hex: '#d69e2e', text: '#f6e05e' },
  Blue: { hex: '#2b6cb0', text: '#63b3ed' },
};

// CU Interpolation
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

// Calculate Auto Lighting Quantity
export function calculateAutoLightingQty(
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

  const hWorking = Math.max((ceilingH || 2.7) - 0.85, 0.5); // 0.85m working plane
  const area = l * w;
  const roomIndex = area / (hWorking * (l + w));
  const cu = getCUFromRoomIndex(roomIndex);

  // Total lm = (lm/m² * Area) / (CU * MF)
  const totalLumens = (targetLux * area) / (cu * mf);

  // For same room name lighting, let the Total lm be shared in proportion to the watt value
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

const _t = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const ll_cores: Record<string, number> = {
  '1 Core': 1,
  '2 Cores': 2,
  '3 Cores': 3,
  '4 Cores': 4,
  '5 Cores': 5,
};

const z5 = ['Residential DB', 'Industrial DB', 'MDB', 'Sub-DB'];
const j5 = ['1-Phase', '3-Phase'];
const Pi = ['R', 'Y', 'B'];

interface ElectricalTabProps {
  boards: Board[];
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  settings: ProjectSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProjectSettings>>;
  trackHistory: (boardsList: Board[]) => void;
  mainsOverrides: Record<string, number>;
  setMainsOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  hvacUnits?: HvacUnit[];
  setHvacUnits?: React.Dispatch<React.SetStateAction<HvacUnit[]>>;
}

const BLACKLISTED_OTHER_TABS_KEYS = new Set([
  'Plumbing Fixtures', 'Pipe Sizes (mm)', 'Pipe Materials',
  'Fire Hazards', 'Sprinkler Types', 'Fire Pipe Sizes (mm)',
  'Inverter Types', 'Battery Types', 'Panel Wattages (W)',
  'Generator Load Types', 'Generator Fuel Types',
  'Industrial Load Types', 'Industrial Volts (V)', 'Industrial Breakers (A)',
  'IoT Device Types', 'IoT Protocols', 'IoT Platforms', 'IoT Rooms',
  'HVAC System Types', 'HVAC Refrigerants', 'Cable Core Palette',
  'Camera Types', 'Resolutions', 'Compression', 'Lenses (mm)', 'PoE Classes'
]);

export default function ElectricalTab({
  boards,
  setBoards,
  activeIndex,
  setActiveIndex,
  settings,
  setSettings,
  trackHistory,
  mainsOverrides,
  setMainsOverrides,
  hvacUnits,
  setHvacUnits,
}: ElectricalTabProps) {
  const currentBoard = boards[activeIndex] || boards[0];
  const [electricalSubTab, setElectricalSubTab] = useState<'panels' | 'industrial'>('panels');

  const customCols = getCustomColumnsForTab('electrical');
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('electrical_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasDoubleSockets = parsed['Socket Types'] && parsed['Socket Types'].includes('Double');
        const hasNewRatings = parsed['Socket Ratings'] && parsed['Socket Ratings'].includes('13A');
        const hasNewVariances = parsed['Socket Sizing / Rating'] && parsed['Socket Sizing / Rating'].includes('Airfryer');
        return {
          ...DEFAULT_DROPDOWNS,
          ...parsed,
          'Socket Types': hasDoubleSockets ? parsed['Socket Types'] : DEFAULT_DROPDOWNS['Socket Types'],
          'Socket Ratings': hasNewRatings ? parsed['Socket Ratings'] : DEFAULT_DROPDOWNS['Socket Ratings'],
          'Socket Sizing / Rating': hasNewVariances ? parsed['Socket Sizing / Rating'] : DEFAULT_DROPDOWNS['Socket Sizing / Rating'],
        };
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_DROPDOWNS;
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
      setOverrideTab('dropdowns');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('trigger-mep-manage-dropdowns', handleToggleDropdowns);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('trigger-mep-manage-dropdowns', handleToggleDropdowns);
    };
  }, []);

  const [selectedDropdownKey, setSelectedDropdownKey] = useState<string>('Switch Types');
  const [newDropdownItem, setNewDropdownItem] = useState<string>('');
  const [newCustomListName, setNewCustomListName] = useState<string>('');
  const [newCustomListTab, setNewCustomListTab] = useState<string>('electrical');
  const [newCustomListRole, setNewCustomListRole] = useState<'options' | 'column_dropdown' | 'column_text' | 'column_number' | 'variance'>('options');
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null);
  const [editItemText, setEditItemText] = useState<string>('');

  const handleAddDropdownItem = () => {
    const trimmed = newDropdownItem.trim();
    if (!trimmed) return;
    setDropdowns(prev => {
      const currentList = prev[selectedDropdownKey] || [];
      if (currentList.includes(trimmed)) {
        alert('Option already exists!');
        return prev;
      }
      return {
        ...prev,
        [selectedDropdownKey]: [...currentList, trimmed]
      };
    });
    setNewDropdownItem('');
  };

  const handleSaveEditItem = (index: number) => {
    const trimmed = editItemText.trim();
    if (!trimmed) return;
    setDropdowns(prev => {
      const currentList = [...(prev[selectedDropdownKey] || [])];
      currentList[index] = trimmed;
      return {
        ...prev,
        [selectedDropdownKey]: currentList
      };
    });
    setEditItemIndex(null);
  };

  const dynamic_LIGHTING_TYPES = dropdowns['Lighting Types'] || LIGHTING_TYPES;
  const dynamic_FIXTURE_STYLES = dropdowns['Fixture Styles'] || FIXTURE_STYLES;
  const dynamic_MOUNT_TYPES = dropdowns['Mount Types'] || MOUNT_TYPES;
  const dynamic_SOCKET_TYPES = dropdowns['Socket Types'] || SOCKET_TYPES;
  const dynamic_SOCKET_RATINGS = dropdowns['Socket Ratings'] || SOCKET_RATINGS;
  const dynamic_SOCKET_VARIANCES = dropdowns['Socket Sizing / Rating'] || SOCKET_VARIANCES;
  const dynamic_AC_TYPES = dropdowns['AC Types'] || AC_TYPES;
  const dynamic_DEDICATED_TYPES = dropdowns['Dedicated Types'] || DEDICATED_TYPES;
  const dynamic_WIRE_SIZES = dropdowns['Wire Sizes (mm²)'] || WIRE_SIZES;
  const dynamic_CABLE_CORES = dropdowns['Cable Cores'] || CABLE_CORES;
  const dynamic_SWITCH_TYPES = dropdowns['Switch Types'] || SWITCH_TYPES;
  const dynamic_CB_SIZES = (dropdowns['CB Sizes (A)'] || CB_SIZES).map(Number).sort((a, b) => a - b);

  const dynamic_AC_FIX_STYLES = dropdowns['AC Fix Styles'] || AC_FIX_STYLES;
  const dynamic_AC_MOUNTS = dropdowns['AC Mounts'] || AC_MOUNTS;
  const dynamic_AC_CONTROLS = dropdowns['AC Controls'] || AC_CONTROLS;
  const dynamic_DEDICATED_FIX_STYLES = dropdowns['Dedicated Fix Styles'] || DEDICATED_FIX_STYLES;
  const dynamic_DEDICATED_3PH_VARIANCES = dropdowns['Dedicated 3Phase Variances'] || DEDICATED_3PH_VARIANCES;
  const dynamic_SOCKET_FIX_STYLES = dropdowns['Socket Fix Styles'] || SOCKET_FIX_STYLES;
  const dynamic_SOCKET_MOUNTS = dropdowns['Socket Mounts'] || SOCKET_MOUNTS;
  const dynamic_SOCKET_CONTROLS = dropdowns['Socket Controls'] || SOCKET_CONTROLS;

  const [overrideTab, setOverrideTab] = useState<'sockets' | 'lighting' | 'dropdowns'>('sockets');

  useEffect(() => {
    const cats = getCategoriesForTab('electrical', dropdowns);
    if (cats.length > 0 && !cats.includes(selectedDropdownKey)) {
      setSelectedDropdownKey(cats[0]);
    }
  }, [dropdowns, selectedDropdownKey]);
  const [newRoomError, setNewRoomError] = useState('');
  const [groupByOption, setGroupByOption] = useState<'circuitId' | 'room' | 'loadType'>('circuitId');
  const [secGroupByOption, setSecGroupByOption] = useState<'none' | 'loadType' | 'room'>('none');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [activeRoomInputId, setActiveRoomInputId] = useState<string | null>(null);
  const [activeLocationDropdown, setActiveLocationDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPhysicalDb, setShowPhysicalDb] = useState(false);
  const [panelViewMode, setPanelViewMode] = useState<'cabinet' | 'sld' | 'split'>('cabinet');
  const [sldPhaseFilter, setSldPhaseFilter] = useState<'ALL' | 'R' | 'Y' | 'B'>('ALL');
  const [panelHighlightMode, setPanelHighlightMode] = useState<'all' | 'lighting' | 'power' | 'ac'>('all');

  const dynamicRoomList = Array.from(new Set([
    ...Object.keys(ROOM_LUX_DATABASE),
    ...(settings.customRooms || [])
  ]));

  const handleAddCustomRoom = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = dynamicRoomList.some(r => r.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewRoomError(`Room "${trimmed}" already exists!`);
      setTimeout(() => setNewRoomError(''), 3000);
      return;
    }
    setSettings(p => ({
      ...p,
      customRooms: [...(p.customRooms || []), trimmed]
    }));
    setNewRoomError('');
  };

  const handleRemoveCustomRoom = (name: string) => {
    setSettings(p => ({
      ...p,
      customRooms: (p.customRooms || []).filter(r => r !== name)
    }));
  };

  // Close room dropdown on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.room-dropdown-container')) {
        setActiveRoomInputId(null);
      }
    };
    if (activeRoomInputId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeRoomInputId]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dummyScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(2800);
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
  }, [currentBoard]);

  if (!currentBoard) return null;

  const isThreePhase = currentBoard.phase === '3-Phase';
  const systemVoltage = settings.voltage <= 230 ? 400 : settings.voltage;

  // Track room-wise dimensions to synchronize them across rows with the same room name
  const roomProps = currentBoard.circuits.reduce((acc, c) => {
    if (c.room && !acc[c.room]) {
      if ((c.roomL || 0) > 0 && (c.roomW || 0) > 0) {
        acc[c.room] = {
          l: c.roomL || 0,
          w: c.roomW || 0,
          h: c.ceilingH || 2.7,
        };
      }
    }
    return acc;
  }, {} as Record<string, { l: number; w: number; h: number }>);

  // Track room-wise total watts to balance auto lumen sizing correctly when sharing required room lumens
  const roomTotalWatts = currentBoard.circuits.reduce((acc, c) => {
    if (c.loadType === 'Lighting' && c.room) {
      acc[c.room] = (acc[c.room] || 0) + (c.watts || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  // Helper to compute circuit watts proportionally for lighting circuits
  const getCircuitWatts = (c: Circuit) => {
    const isLighting = c.loadType === 'Lighting';
    const isSockets = c.loadType === 'Sockets';
    if (isSockets) {
      const socketRProps = (c.room && roomProps[c.room]) ? roomProps[c.room] : {
        l: c.roomL || 0,
        w: c.roomW || 0,
      };
      const area = (socketRProps.l || 0) * (socketRProps.w || 0);
      const factor = (settings.customRoomSockets && settings.customRoomSockets[c.room || '']) || settings.socketAreaFactor || 4;
      const calculatedSocketQty = area > 0 ? Math.max(1, Math.ceil(area / factor)) : 1;
      const qty = c.qty || calculatedSocketQty;
      return (c.watts || 0) * qty;
    }
    if (!isLighting) return (c.watts || 0) * (c.qty || 1);

    const rProps = (c.room && roomProps[c.room]) ? roomProps[c.room] : {
      l: c.roomL || 0,
      w: c.roomW || 0,
      h: c.ceilingH || 2.7
    };
    const area = rProps.l * rProps.w;
    if (area <= 0 || (rProps.l + rProps.w) <= 0) return (c.watts || 0);

    const targetLux = getTargetLuxForRoom(c.room || '', settings);
    const hWorking = Math.max(rProps.h - 0.85, 0.5);
    const roomIndex = area / (hWorking * (rProps.l + rProps.w));
    const cu = getCUFromRoomIndex(roomIndex);

    const totalRoomW = roomTotalWatts[c.room || ''] || c.watts || 0;

    const defaultLpw = settings.defaultLPW || 200;
    const currentLumenVal = c.lumensPerUnit || ((c.watts || 0) * defaultLpw);
    const currentLpwVal = (c.watts || 0) > 0 ? currentLumenVal / c.watts : defaultLpw;

    const qty = calculateAutoLightingQty(
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
  };

  // Compute actual circuit totals
  const totalW = currentBoard.circuits.reduce((acc, c) => acc + getCircuitWatts(c), 0);

  const totalCurrent = isThreePhase
    ? (totalW / (Math.sqrt(3) * systemVoltage * settings.powerFactor)).toFixed(1)
    : (totalW / (settings.voltage * settings.powerFactor)).toFixed(1);

  const demandLoadKW = (totalW * settings.demandFactor) / 1000;
  const demandCurrent = isThreePhase
    ? (totalW * settings.demandFactor) / (Math.sqrt(3) * systemVoltage * settings.powerFactor)
    : (totalW * settings.demandFactor) / (settings.voltage * settings.powerFactor);

  const recommendedCB = CB_SIZES.find(f => f >= demandCurrent * 1.25) || CB_SIZES[CB_SIZES.length - 1];

  // Calculate phase load breakdown for 3-Phase balancing
  const phaseLoads = isThreePhase
    ? Pi.reduce((acc, p) => {
        const is3Ph = (c: any) =>
          (c.loadType === 'Dedicated' && c.dedicatedType === 'Three Phase') ||
          (c.loadType === 'Air Conditioner' && (c.phase === 'Three Phase' || c.phase === '3-Phase')) ||
          c.phase === 'Three Phase' ||
          c.phase === '3-Phase';

        // regular single phase loads on R/Y/B
        const regularSum = currentBoard.circuits
          .filter(c => {
            if (is3Ph(c)) return false;
            if (c.phase === p) return true;
            if (!Pi.includes(c.phase || '')) {
              const nonExplicitSinglePhases = currentBoard.circuits.filter(
                oc => !is3Ph(oc) && !Pi.includes(oc.phase || '')
              );
              const idx = nonExplicitSinglePhases.findIndex(oc => oc.id === c.id);
              if (idx !== -1) {
                const assignedPhase = Pi[idx % 3];
                return assignedPhase === p;
              }
            }
            return false;
          })
          .reduce((sum, c) => sum + getCircuitWatts(c), 0);

        // three phase loads distributed equally on R/Y/B
        const threePhaseSum = currentBoard.circuits
          .filter(c => is3Ph(c))
          .reduce((sum, c) => {
            const qty = c.qty || 1;
            return sum + Math.ceil(((c.watts || 0) * qty) / 3);
          }, 0);

        acc[p] = regularSum + threePhaseSum;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const phaseCurrents = isThreePhase
    ? Pi.reduce((acc, p) => {
        const pW = phaseLoads[p] || 0;
        // Current per phase is Phase Watts / (Phase Voltage * Power Factor)
        // Phase Voltage = System Voltage / sqrt(3)
        const phaseVoltage = systemVoltage / Math.sqrt(3);
        acc[p] = pW > 0 ? +(pW / (phaseVoltage * settings.powerFactor)).toFixed(1) : 0;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const wattsR = phaseLoads['R'] || 0;
  const wattsY = phaseLoads['Y'] || 0;
  const wattsB = phaseLoads['B'] || 0;
  const totalWatts = wattsR + wattsY + wattsB;
  const avgWatts = totalWatts / 3;
  const maxDev = totalWatts > 0 ? Math.max(
    Math.abs(wattsR - avgWatts),
    Math.abs(wattsY - avgWatts),
    Math.abs(wattsB - avgWatts)
  ) : 0;
  const imbalancePct = avgWatts > 0 ? (maxDev / avgWatts) * 100 : 0;

  // Actions
  const addPanel = () => {
    trackHistory(boards);
    const id = _t();
    const newBoard: Board = {
      id,
      name: `DB-${String(boards.length + 1).padStart(2, '0')}`,
      phase: '3-Phase',
      boardType: 'Residential DB',
      location: 'Main Distribution Board Room',
      voltage: 400,
      circuits: [],
    };
    setBoards(prev => [...prev, newBoard]);
    setActiveIndex(boards.length);
  };

  const updatePanelField = (key: keyof Board, value: any) => {
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx === activeIndex) {
          let updatedBoard = { ...b, [key]: value };
          if (key === 'phase' && value === '1-Phase') {
            updatedBoard.circuits = b.circuits.map(c => {
              let updatedCircuit = { ...c };
              if (c.phase !== 'L') {
                updatedCircuit.phase = 'L';
              }
              if (c.loadType === 'Dedicated' && c.dedicatedType === 'Three Phase') {
                updatedCircuit.dedicatedType = 'Single Phase';
                updatedCircuit.cableCores = '3 Cores';
              }
              return updatedCircuit;
            });
          }
          return updatedBoard;
        }
        return b;
      })
    );
  };

  const deletePanel = () => {
    if (boards.length <= 1) return;
    trackHistory(boards);
    setBoards(prev => prev.filter((_, idx) => idx !== activeIndex));
    setActiveIndex(Math.max(0, activeIndex - 1));
  };

  // --- Synchronization from Electrical Panel to HVAC Tab ---
  const syncElectricalToHvac = (
    currentBoards: Board[],
    currentHvacUnits: HvacUnit[],
    updateHvacAction: React.Dispatch<React.SetStateAction<HvacUnit[]>>
  ) => {
    let unitsChanged = false;
    let newUnits = [...currentHvacUnits];

    // Gather all Air Conditioner circuits
    const acCircuits: Circuit[] = [];
    currentBoards.forEach(b => {
      b.circuits.forEach(c => {
        if (c.loadType === 'Air Conditioner') {
          acCircuits.push(c);
        }
      });
    });

    const acCircuitIds = new Set(acCircuits.map(c => c.id));

    const systemMappingToHvac: Record<string, string> = {
      'Split': 'Split AC',
      'Cassette': 'Cassette AC',
      'Ducted': 'Ducted',
      'VRF': 'VRF/VRV',
      'FCU': 'Chilled Water FCU'
    };

    acCircuits.forEach((circuit) => {
      let matchingUnitIndex = newUnits.findIndex(
        u => u.linkedCircuitId === circuit.id ||
        (u.zone && circuit.room && u.zone.trim().toLowerCase() === circuit.room.trim().toLowerCase() && !u.linkedCircuitId)
      );

      const area = (circuit.roomL || 0) * (circuit.roomW || 0) || (matchingUnitIndex >= 0 ? (newUnits[matchingUnitIndex].area || 20) : 20);
      const height = circuit.ceilingH || (matchingUnitIndex >= 0 ? newUnits[matchingUnitIndex].height : 3.0);
      const acHp = circuit.acHp || (matchingUnitIndex >= 0 ? newUnits[matchingUnitIndex].acHp : calculateAcHp(area, height));
      const watts = circuit.watts || 1500;
      const qty = circuit.qty || 1;
      const mappedSystem = systemMappingToHvac[circuit.acType || ''] || (matchingUnitIndex >= 0 ? newUnits[matchingUnitIndex].system : 'Split AC');

      if (matchingUnitIndex >= 0) {
        const existing = newUnits[matchingUnitIndex];
        const updatedUnit: HvacUnit = {
          ...existing,
          linkedCircuitId: circuit.id,
          zone: circuit.room || existing.zone,
          system: mappedSystem,
          length: circuit.roomL ?? existing.length,
          width: circuit.roomW ?? existing.width,
          area: area > 0 ? area : existing.area,
          height,
          watts,
          quantity: qty,
          totalWatts: watts * qty,
          acHp,
          coolingLoad: +(acHp * 2.8).toFixed(1),
          switchType: circuit.switchType || existing.switchType || '32-100A Isolator',
          switchQty: circuit.switchQty !== undefined ? circuit.switchQty : (existing.switchQty ?? 1),
          cbSizing: circuit.cb || existing.cbSizing || 20,
          wire: circuit.wire || existing.wire || '4',
          cableLength: circuit.cableLength || existing.cableLength || 15,
          cores: circuit.cableCores || existing.cores || '3 Cores',
          phase: circuit.phase || existing.phase || 'Single Phase',
          notes: circuit.notes || existing.notes || ''
        };

        if (JSON.stringify(existing) !== JSON.stringify(updatedUnit)) {
          newUnits[matchingUnitIndex] = updatedUnit;
          unitsChanged = true;
        }
      } else {
        const newUnit: HvacUnit = {
          id: 'HVAC-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          zone: circuit.room || 'Air Conditioner Zone',
          system: mappedSystem,
          length: circuit.roomL,
          width: circuit.roomW,
          area,
          height,
          coolingLoad: +(acHp * 2.8).toFixed(1),
          refrigerant: 'R-410A',
          cfm: 400,
          notes: circuit.notes || '',
          switchType: circuit.switchType || '32-100A Isolator',
          switchQty: circuit.switchQty !== undefined ? circuit.switchQty : 1,
          watts,
          totalWatts: watts * qty,
          quantity: qty,
          phase: circuit.phase || 'Single Phase',
          cbSizing: circuit.cb || 20,
          wire: circuit.wire || '4',
          cableLength: circuit.cableLength || 15,
          cores: circuit.cableCores || '3 Cores',
          acHp,
          linkedCircuitId: circuit.id
        };
        newUnits.push(newUnit);
        unitsChanged = true;
      }
    });

    // Clean up HvacUnits that were generated from an AC circuit that has been deleted
    const initialCount = newUnits.length;
    newUnits = newUnits.filter(u => {
      if (!u.linkedCircuitId) return true;
      return acCircuitIds.has(u.linkedCircuitId);
    });
    if (newUnits.length !== initialCount) {
      unitsChanged = true;
    }

    if (unitsChanged) {
      setTimeout(() => {
        updateHvacAction(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newUnits)) return prev;
          return newUnits;
        });
      }, 0);
    }
  };

  useEffect(() => {
    if (boards && hvacUnits && setHvacUnits) {
      syncElectricalToHvac(boards, hvacUnits, setHvacUnits);
    }
  }, [boards]);

  const [addCircuitModalOpen, setAddCircuitModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roomSelectValue, setRoomSelectValue] = useState('');
  const [customRoomName, setCustomRoomName] = useState('');
  const [newCircuitForm, setNewCircuitForm] = useState({
    room: '',
    roomL: '',
    roomW: '',
    ceilingH: '',
    loadType: 'Lighting',
    lightingType: 'Ambient',
    fixtureStyle: 'Spot',
    fixtureVariance: 'None',
    socketType: 'Double',
    socketRating: '13A',
    socketFixtureStyle: 'Indoor',
    socketVariance: 'Sockets',
    acType: 'Split',
    acFixtureStyle: 'Inverter',
    dedicatedType: 'Single Phase',
    dedicatedFixtureStyle: 'Indoor',
    watts: '100',
    qty: '',
    cableLength: '15',
    cableCores: '2 Cores',
    wire: '1.5',
    phase: 'L',
    notes: '',
    switchType: 'None',
    switchQty: '0',
    controlledFrom: '',
    mountType: 'Recessed',
    controlType: 'Non Smart',
    socketMountType: 'Wall',
    socketControl: 'Non Smart',
    acMountType: 'Standing',
    acControl: 'Non Smart'
  });

  const handleRoomChange = (roomName: string) => {
    const existingRoomCircuit = currentBoard.circuits.find(
      c => c.room && c.room.trim().toLowerCase() === roomName.trim().toLowerCase() && (c.roomL || 0) > 0
    );
    if (existingRoomCircuit) {
      setNewCircuitForm(prev => ({
        ...prev,
        room: roomName,
        roomL: String(existingRoomCircuit.roomL || ''),
        roomW: String(existingRoomCircuit.roomW || ''),
        ceilingH: String(existingRoomCircuit.ceilingH || '')
      }));
    } else {
      setNewCircuitForm(prev => ({
        ...prev,
        room: roomName,
      }));
    }
  };

  const handleLoadTypeChange = (loadType: string) => {
    let defaultWire = '1.5';
    let defaultCores = '2 Cores';
    let defaultWatts = '100';

    if (loadType === 'Sockets') {
      defaultWire = '2.5';
      defaultCores = '3 Cores';
      const autoW = getSocketApplianceWatts(newCircuitForm.socketVariance || '13A Socket (General Purpose)');
      defaultWatts = autoW !== null ? String(autoW) : '1000';
    } else if (loadType === 'Air Conditioner') {
      defaultWire = '4';
      defaultCores = '3 Cores';
      defaultWatts = '1500';
    } else if (loadType === 'Dedicated') {
      defaultWire = '2.5';
      defaultCores = newCircuitForm.dedicatedType === 'Three Phase' ? '4 Cores' : '3 Cores';
      defaultWatts = '2000';
    } else if (loadType === 'Motor') {
      defaultWire = '4';
      defaultCores = '4 Cores';
      defaultWatts = '3000';
    } else if (loadType === 'Welding') {
      defaultWire = '6';
      defaultCores = '3 Cores';
      defaultWatts = '5000';
    } else if (loadType === 'Compressor') {
      defaultWire = '4';
      defaultCores = '4 Cores';
      defaultWatts = '4000';
    } else if (loadType === 'Pump') {
      defaultWire = '2.5';
      defaultCores = '4 Cores';
      defaultWatts = '2200';
    } else if (loadType === 'Industrial Socket') {
      defaultWire = '4';
      defaultCores = '5 Cores';
      defaultWatts = '3500';
    } else if (loadType === 'Lighting Panel') {
      defaultWire = '2.5';
      defaultCores = '3 Cores';
      defaultWatts = '2500';
    } else if (loadType === 'UPS') {
      defaultWire = '4';
      defaultCores = '3 Cores';
      defaultWatts = '3000';
    }

    setNewCircuitForm(prev => ({
      ...prev,
      loadType,
      wire: defaultWire,
      cableCores: defaultCores,
      watts: defaultWatts,
      fixtureVariance: loadType === 'Lighting' ? 'None' : (loadType === 'Dedicated' && prev.dedicatedType === 'Three Phase' ? '13A 3ph Industrial' : 'None')
    }));
  };

  const addCircuit = () => {
    setEditingId(null);
    setRoomSelectValue('');
    setCustomRoomName('');
    setNewCircuitForm({
      room: '',
      roomL: '',
      roomW: '',
      ceilingH: '',
      loadType: 'Lighting',
      lightingType: 'Ambient',
      fixtureStyle: 'Spot',
      fixtureVariance: 'None',
      socketType: 'Double',
      socketRating: '13A',
      socketFixtureStyle: 'Indoor',
      socketVariance: 'Sockets',
      acType: 'Split',
      acFixtureStyle: 'Inverter',
      dedicatedType: 'Single Phase',
      dedicatedFixtureStyle: 'Indoor',
      watts: '100',
      qty: '',
      cableLength: '15',
      cableCores: '2 Cores',
      wire: '1.5',
      phase: isThreePhase ? 'R' : 'L',
      notes: '',
      switchType: 'None',
      switchQty: '0',
      controlledFrom: '',
      mountType: 'Recessed',
      controlType: 'Non Smart',
      socketMountType: 'Wall',
      socketControl: 'Non Smart',
      acMountType: 'Standing',
      acControl: 'Non Smart'
    });
    setAddCircuitModalOpen(true);
  };

  const editCircuit = (c: Circuit) => {
    setEditingId(c.id);
    const isCustomRoom = !dynamicRoomList.includes(c.room || '');
    if (isCustomRoom) {
      setRoomSelectValue('custom');
      setCustomRoomName(c.room || '');
    } else {
      setRoomSelectValue(c.room || '');
      setCustomRoomName('');
    }
    setNewCircuitForm({
      room: c.room || '',
      roomL: c.roomL !== undefined ? String(c.roomL) : '',
      roomW: c.roomW !== undefined ? String(c.roomW) : '',
      ceilingH: c.ceilingH !== undefined ? String(c.ceilingH) : '',
      loadType: c.loadType || 'Lighting',
      lightingType: c.lightingType || 'Ambient',
      fixtureStyle: c.fixtureStyle || 'Spot',
      fixtureVariance: c.fixtureVariance || 'None',
      socketType: c.socketType || 'Double',
      socketRating: c.socketRating || '13A',
      socketFixtureStyle: c.socketFixtureStyle || 'Indoor',
      socketVariance: c.socketVariance || 'Sockets',
      acType: c.acType || 'Split',
      acFixtureStyle: c.acFixtureStyle || 'Inverter',
      dedicatedType: c.dedicatedType || 'Single Phase',
      dedicatedFixtureStyle: c.dedicatedFixtureStyle || 'Indoor',
      watts: String(c.watts ?? 100),
      qty: c.qty !== undefined ? String(c.qty) : '',
      cableLength: String(c.cableLength ?? 15),
      cableCores: c.cableCores || '2 Cores',
      wire: c.wire || '1.5',
      phase: c.phase || (isThreePhase ? 'R' : 'L'),
      notes: c.notes || '',
      switchType: c.switchType || 'None',
      switchQty: String(c.switchQty ?? 0),
      controlledFrom: c.controlledFrom || '',
      mountType: c.mountType || 'Recessed',
      controlType: c.controlType || 'Non Smart',
      socketMountType: c.socketMountType || 'Wall',
      socketControl: c.socketControl || 'Non Smart',
      acMountType: c.acMountType || 'Standing',
      acControl: c.acControl || 'Non Smart'
    });
    setAddCircuitModalOpen(true);
  };

  const handleSaveNewCircuit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalRoom = roomSelectValue === 'custom' ? customRoomName : roomSelectValue;
    if (!finalRoom.trim()) {
      alert("Please select or enter a Room Name.");
      return;
    }
    if (!newCircuitForm.loadType) {
      alert("Please select a Load Type.");
      return;
    }

    trackHistory(boards);

    const isSockets = newCircuitForm.loadType === 'Sockets';
    const isLighting = newCircuitForm.loadType === 'Lighting';
    const isAc = newCircuitForm.loadType === 'Air Conditioner';
    const isDedicated = newCircuitForm.loadType === 'Dedicated';

    const existingRoomCircuit = currentBoard.circuits.find(
      c => c.room && c.room.trim().toLowerCase() === finalRoom.trim().toLowerCase() && (c.roomL || 0) > 0 && c.id !== editingId
    );
    const isRoomDuplicate = !!existingRoomCircuit;

    const finalL = isRoomDuplicate ? existingRoomCircuit.roomL : (newCircuitForm.roomL ? Math.round(+newCircuitForm.roomL * 10) / 10 : undefined);
    const finalW = isRoomDuplicate ? existingRoomCircuit.roomW : (newCircuitForm.roomW ? Math.round(+newCircuitForm.roomW * 10) / 10 : undefined);
    const finalH = isRoomDuplicate ? existingRoomCircuit.ceilingH : (newCircuitForm.ceilingH ? Math.round(+newCircuitForm.ceilingH * 10) / 10 : undefined);

    if (editingId) {
      setBoards(prev =>
        prev.map((b, idx) => {
          if (idx !== activeIndex) return b;
          return {
            ...b,
            circuits: b.circuits.map(c => {
              if (c.id !== editingId) return c;
              return {
                ...c,
                room: finalRoom.trim(),
                roomL: finalL,
                roomW: finalW,
                ceilingH: finalH,
                loadType: newCircuitForm.loadType as any,
                watts: +newCircuitForm.watts || 0,
                qty: newCircuitForm.qty ? +newCircuitForm.qty : 0,
                cableLength: +newCircuitForm.cableLength || 0,
                cableCores: newCircuitForm.cableCores,
                wire: newCircuitForm.wire,
                phase: isThreePhase ? (newCircuitForm.phase || 'R') : 'L',
                notes: newCircuitForm.notes,
                switchType: isLighting ? (newCircuitForm.switchType || 'None') : '',
                switchQty: isLighting ? (+newCircuitForm.switchQty || 0) : 0,
                controlledFrom: isLighting ? (newCircuitForm.controlledFrom || '') : undefined,

                lightingType: isLighting ? newCircuitForm.lightingType : undefined,
                fixtureStyle: isLighting ? newCircuitForm.fixtureStyle : undefined,
                fixtureVariance: isLighting ? newCircuitForm.fixtureVariance : (isDedicated && newCircuitForm.dedicatedType === 'Three Phase' ? newCircuitForm.fixtureVariance : undefined),
                mountType: isLighting ? newCircuitForm.mountType : undefined,
                controlType: isLighting ? newCircuitForm.controlType : undefined,

                socketType: isSockets ? newCircuitForm.socketType : undefined,
                socketRating: isSockets ? (newCircuitForm.socketRating || '13A') : undefined,
                socketFixtureStyle: isSockets ? newCircuitForm.socketFixtureStyle : undefined,
                socketVariance: isSockets ? newCircuitForm.socketVariance : undefined,
                socketMountType: isSockets ? newCircuitForm.socketMountType : undefined,
                socketControl: isSockets ? newCircuitForm.socketControl : undefined,

                acType: isAc ? newCircuitForm.acType : undefined,
                acFixtureStyle: isAc ? newCircuitForm.acFixtureStyle : undefined,
                acMountType: isAc ? newCircuitForm.acMountType : undefined,
                acControl: isAc ? newCircuitForm.acControl : undefined,

                dedicatedType: isDedicated ? newCircuitForm.dedicatedType : undefined,
                dedicatedFixtureStyle: isDedicated ? newCircuitForm.dedicatedFixtureStyle : undefined,
              };
            })
          };
        })
      );
      setEditingId(null);
    } else {
      const newCircuit: Circuit = {
        id: _t(),
        circuitId: getNextCircuitId(currentBoard.circuits),
        room: finalRoom.trim(),
        roomL: finalL,
        roomW: finalW,
        ceilingH: finalH,
        loadType: newCircuitForm.loadType as any,
        watts: +newCircuitForm.watts || 0,
        qty: newCircuitForm.qty ? +newCircuitForm.qty : 0,
        cableLength: +newCircuitForm.cableLength || 0,
        cableCores: newCircuitForm.cableCores,
        wire: newCircuitForm.wire,
        phase: isThreePhase ? (newCircuitForm.phase || 'R') : 'L',
        notes: newCircuitForm.notes,
        cb: 0,
        switchType: isLighting ? (newCircuitForm.switchType || 'None') : '',
        switchQty: isLighting ? (+newCircuitForm.switchQty || 0) : 0,
        controlledFrom: isLighting ? (newCircuitForm.controlledFrom || '') : undefined,

        lightingType: isLighting ? newCircuitForm.lightingType : undefined,
        fixtureStyle: isLighting ? newCircuitForm.fixtureStyle : undefined,
        fixtureVariance: isLighting ? newCircuitForm.fixtureVariance : (isDedicated && newCircuitForm.dedicatedType === 'Three Phase' ? newCircuitForm.fixtureVariance : undefined),
        mountType: isLighting ? newCircuitForm.mountType : undefined,
        controlType: isLighting ? newCircuitForm.controlType : undefined,

        socketType: isSockets ? newCircuitForm.socketType : undefined,
        socketRating: isSockets ? (newCircuitForm.socketRating || '13A') : undefined,
        socketFixtureStyle: isSockets ? newCircuitForm.socketFixtureStyle : undefined,
        socketVariance: isSockets ? newCircuitForm.socketVariance : undefined,
        socketMountType: isSockets ? newCircuitForm.socketMountType : undefined,
        socketControl: isSockets ? newCircuitForm.socketControl : undefined,

        acType: isAc ? newCircuitForm.acType : undefined,
        acFixtureStyle: isAc ? newCircuitForm.acFixtureStyle : undefined,
        acMountType: isAc ? newCircuitForm.acMountType : undefined,
        acControl: isAc ? newCircuitForm.acControl : undefined,

        dedicatedType: isDedicated ? newCircuitForm.dedicatedType : undefined,
        dedicatedFixtureStyle: isDedicated ? newCircuitForm.dedicatedFixtureStyle : undefined,
      };

      setBoards(prev =>
        prev.map((b, idx) => (idx === activeIndex ? { ...b, circuits: [...b.circuits, newCircuit] } : b))
      );
    }

    setAddCircuitModalOpen(false);
  };

  const [selectedCircuitIds, setSelectedCircuitIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedCircuitIds([]);
  }, [activeIndex]);

  useEffect(() => {
    const handleImportTrigger = (e: Event) => {
      setImportOpen(true);
    };
    const handleExportTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      const format = customEvent.detail;
      if (format === 'xlsx') {
        exportActiveBoardToXLSX(currentBoard, settings, false);
      } else if (format === 'xls') {
        exportActiveBoardToXLSX(currentBoard, settings, true);
      } else if (format === 'txt') {
        exportActiveBoardToTXT(currentBoard, settings);
      } else if (format === 'csv') {
        exportActiveBoardToCSV(currentBoard, settings);
      }
    };

    window.addEventListener('trigger-mep-import', handleImportTrigger);
    window.addEventListener('trigger-mep-export', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import', handleImportTrigger);
      window.removeEventListener('trigger-mep-export', handleExportTrigger);
    };
  }, [currentBoard, settings]);

  const bulkDeleteCircuits = () => {
    if (selectedCircuitIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedCircuitIds.length} selected circuits?`)) return;
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        return {
          ...b,
          circuits: b.circuits.filter(c => !selectedCircuitIds.includes(c.id)),
        };
      })
    );
    setSelectedCircuitIds([]);
  };

  const bulkDuplicateCircuits = () => {
    if (selectedCircuitIds.length === 0) return;
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        const updatedCircuits = [...b.circuits];
        const selectedInOrder = b.circuits.filter(c => selectedCircuitIds.includes(c.id));
        
        selectedInOrder.forEach((target) => {
          const nextId = getNextCircuitId(updatedCircuits);
          const copy: Circuit = {
            ...target,
            id: _t(),
            circuitId: nextId,
          };
          updatedCircuits.push(copy);
        });
        return { ...b, circuits: updatedCircuits };
      })
    );
    setSelectedCircuitIds([]);
  };

  const bulkMoveCircuits = (targetBoardId: string) => {
    if (selectedCircuitIds.length === 0 || !targetBoardId) return;
    const targetBoardIndex = boards.findIndex(b => b.id === targetBoardId);
    if (targetBoardIndex === -1 || targetBoardIndex === activeIndex) return;
    
    trackHistory(boards);
    setBoards(prev => {
      const sourceBoard = prev[activeIndex];
      const targetBoard = prev[targetBoardIndex];
      
      const circuitsToMove = sourceBoard.circuits.filter(c => selectedCircuitIds.includes(c.id));
      const remainingCircuits = sourceBoard.circuits.filter(c => !selectedCircuitIds.includes(c.id));
      
      let tempTargetCircuits = [...targetBoard.circuits];
      const movedCircuits = circuitsToMove.map((c) => {
        const nextId = getNextCircuitId(tempTargetCircuits);
        const copy = {
          ...c,
          id: _t(),
          circuitId: nextId,
        };
        tempTargetCircuits.push(copy);
        return copy;
      });
      
      return prev.map((b, idx) => {
        if (idx === activeIndex) {
          return { ...b, circuits: remainingCircuits };
        }
        if (idx === targetBoardIndex) {
          return { ...b, circuits: [...b.circuits, ...movedCircuits] };
        }
        return b;
      });
    });
    
    setSelectedCircuitIds([]);
  };

  const bulkEditFields = (fields: Partial<Circuit>) => {
    if (selectedCircuitIds.length === 0) return;
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        return {
          ...b,
          circuits: b.circuits.map(c => {
            if (selectedCircuitIds.includes(c.id)) {
              let updated = { ...c, ...fields };
              if (fields.room) {
                let roomMatch: Circuit | undefined;
                for (const board of prev) {
                  const match = board.circuits.find(x => x.room === fields.room && (x.roomL || 0) > 0);
                  if (match) {
                    roomMatch = match;
                    break;
                  }
                }
                if (roomMatch) {
                  updated.roomL = roomMatch.roomL;
                  updated.roomW = roomMatch.roomW;
                  updated.ceilingH = roomMatch.ceilingH;
                }
              }
              return updated;
            }
            return c;
          }),
        };
      })
    );
  };

  const bulkCopyCircuits = (targetBoardId: string) => {
    if (selectedCircuitIds.length === 0 || !targetBoardId) return;
    const targetBoardIndex = boards.findIndex(b => b.id === targetBoardId);
    if (targetBoardIndex === -1) return;
    
    trackHistory(boards);
    setBoards(prev => {
      const sourceBoard = prev[activeIndex];
      const targetBoard = prev[targetBoardIndex];
      
      const circuitsToCopy = sourceBoard.circuits.filter(c => selectedCircuitIds.includes(c.id));
      
      const copiedCircuits = circuitsToCopy.map((c, i) => ({
        ...c,
        id: _t(),
        circuitId: 'C' + String(targetBoard.circuits.length + i + 1).padStart(2, '0'),
      }));
      
      return prev.map((b, idx) => {
        if (idx === targetBoardIndex) {
          return { ...b, circuits: [...b.circuits, ...copiedCircuits] };
        }
        return b;
      });
    });
    
    setSelectedCircuitIds([]);
  };

  const updateCircuitFields = (circuitId: string, fields: Partial<Circuit>) => {
    trackHistory(boards);
    setBoards(prev =>
      prev.map(b => {
        const updatedCircuits = b.circuits.map(c => {
          if (c.id === circuitId) {
            return { ...c, ...fields };
          }
          return c;
        });
        return { ...b, circuits: updatedCircuits };
      })
    );
  };

  const updateCircuitField = (circuitId: string, key: keyof Circuit, value: any) => {
    trackHistory(boards);
    setBoards(prev => {
      // Find the target circuit being edited anywhere in the boards
      let targetCircuit: Circuit | undefined;
      for (let i = 0; i < prev.length; i++) {
        const found = prev[i].circuits.find(c => c.id === circuitId);
        if (found) {
          targetCircuit = found;
          break;
        }
      }
      if (!targetCircuit) return prev;

      // Identify the target room name
      const targetRoom = key === 'room' ? value : targetCircuit.room;

      // Find if there's an existing circuit with the target room name to copy dimensions from
      let roomMatch: Circuit | undefined;
      if (key === 'room' && value) {
        // First try to find a circuit with valid dimensions > 0
        for (const b of prev) {
          const match = b.circuits.find(c => c.id !== circuitId && c.room === value && (c.roomL || 0) > 0);
          if (match) {
            roomMatch = match;
            break;
          }
        }
        // Fallback to any matching room
        if (!roomMatch) {
          for (const b of prev) {
            const match = b.circuits.find(c => c.id !== circuitId && c.room === value);
            if (match) {
              roomMatch = match;
              break;
            }
          }
        }
      }

      // Map and update all circuits on all boards
      return prev.map(b => {
        const updatedCircuits = b.circuits.map(c => {
          // If this is the exact circuit being edited
          if (c.id === circuitId) {
            let updated = { ...c, [key]: value };
            if (key === 'room' && roomMatch) {
              updated.roomL = roomMatch.roomL;
              updated.roomW = roomMatch.roomW;
              updated.ceilingH = roomMatch.ceilingH;
            }
            if (key === 'socketVariance') {
              const autoW = getSocketApplianceWatts(value);
              if (autoW !== null) {
                updated.watts = autoW;
              }
            }
            if (key === 'loadType' && value === 'Sockets') {
              const autoW = getSocketApplianceWatts(c.socketVariance || '13A Socket (General Purpose)') ?? 1000;
              updated.watts = autoW;
            }
            return updated;
          }

          // If this is a circuit with the same room name (regardless of board or loadType)
          if (targetRoom && c.room === targetRoom) {
            if (key === 'roomL' || key === 'roomW' || key === 'ceilingH') {
              return { ...c, [key]: value };
            }
            // Sync lumens LPW for lighting circuits in the same room when watts or lumensPerUnit changes
            if (targetCircuit!.loadType === 'Lighting' && c.loadType === 'Lighting') {
              if (key === 'lumensPerUnit' || key === 'watts') {
                const targetWatts = targetCircuit!.watts || 0;
                const defaultLpw = settings.defaultLPW || 200;
                const lumens = targetCircuit!.lumensPerUnit || (targetWatts * defaultLpw);
                const lpw = targetWatts > 0 ? lumens / targetWatts : defaultLpw;
                const cWatts = c.watts || 0;
                return { ...c, lumensPerUnit: Math.round(cWatts * lpw) };
              }
            }
          }

          return c;
        });

        return { ...b, circuits: updatedCircuits };
      });
    });
  };

  const duplicateCircuit = (circuitId: string) => {
    trackHistory(boards);
    let duplicatedAcInfo: { copyCircuitId: string; sourceCircuit: Circuit }[] = [];

    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        const targetIdx = b.circuits.findIndex(c => c.id === circuitId);
        if (targetIdx === -1) return b;
        const target = b.circuits[targetIdx];
        const copy: Circuit = {
          ...target,
          id: _t(),
          circuitId: 'C' + String(b.circuits.length + 1).padStart(2, '0'),
        };
        if (target.loadType === 'Air Conditioner') {
          duplicatedAcInfo.push({ copyCircuitId: copy.id, sourceCircuit: target });
        }
        const updated = [...b.circuits];
        updated.splice(targetIdx + 1, 0, copy);
        return { ...b, circuits: updated };
      })
    );

    if (duplicatedAcInfo.length > 0 && setHvacUnits) {
      setHvacUnits(prevUnits => {
        let newUnits = [...prevUnits];
        duplicatedAcInfo.forEach(({ copyCircuitId, sourceCircuit }) => {
          const existingUnit = prevUnits.find(u => u.linkedCircuitId === sourceCircuit.id || (u.zone && sourceCircuit.room && u.zone.trim().toLowerCase() === sourceCircuit.room.trim().toLowerCase()));

          const area = (sourceCircuit.roomL || 0) * (sourceCircuit.roomW || 0) || (existingUnit?.area ?? 20);
          const height = sourceCircuit.ceilingH || existingUnit?.height || 3.0;
          const acHp = sourceCircuit.acHp || existingUnit?.acHp || calculateAcHp(area, height);
          const watts = sourceCircuit.watts || existingUnit?.watts || 1500;
          const qty = sourceCircuit.qty || existingUnit?.quantity || 1;

          const systemMapping: Record<string, string> = {
            'Split': 'Split AC',
            'Cassette': 'Cassette AC',
            'Ducted': 'Ducted',
            'VRF': 'VRF/VRV',
            'FCU': 'Chilled Water FCU'
          };
          const mappedSystem = systemMapping[sourceCircuit.acType || ''] || existingUnit?.system || 'Split AC';

          if (existingUnit) {
            newUnits.push({
              ...existingUnit,
              id: Math.random().toString(36).slice(2, 8).toUpperCase(),
              linkedCircuitId: copyCircuitId,
              zone: sourceCircuit.room || existingUnit.zone,
              system: mappedSystem,
              watts,
              quantity: qty,
              totalWatts: watts * qty,
              acHp,
              coolingLoad: +(acHp * 2.8).toFixed(1),
              switchType: sourceCircuit.switchType || existingUnit.switchType || '32-100A Isolator',
              switchQty: sourceCircuit.switchQty || existingUnit.switchQty || 1,
              cbSizing: sourceCircuit.cb || existingUnit.cbSizing || 20,
              wire: sourceCircuit.wire || existingUnit.wire || '4',
              cableLength: sourceCircuit.cableLength || existingUnit.cableLength || 15,
              cores: sourceCircuit.cableCores || existingUnit.cores || '3 Cores',
              phase: sourceCircuit.phase || existingUnit.phase || 'Single Phase',
              notes: sourceCircuit.notes || existingUnit.notes || ''
            });
          } else {
            newUnits.push({
              id: Math.random().toString(36).slice(2, 8).toUpperCase(),
              zone: sourceCircuit.room || 'Air Conditioner Zone',
              system: mappedSystem,
              length: sourceCircuit.roomL,
              width: sourceCircuit.roomW,
              area,
              height,
              coolingLoad: +(acHp * 2.8).toFixed(1),
              refrigerant: 'R-410A',
              cfm: 400,
              notes: sourceCircuit.notes || '',
              switchType: sourceCircuit.switchType || '32-100A Isolator',
              switchQty: sourceCircuit.switchQty || 1,
              watts,
              totalWatts: watts * qty,
              quantity: qty,
              phase: sourceCircuit.phase || 'Single Phase',
              cbSizing: sourceCircuit.cb || 20,
              wire: sourceCircuit.wire || '4',
              cableLength: sourceCircuit.cableLength || 15,
              cores: sourceCircuit.cableCores || '3 Cores',
              acHp,
              linkedCircuitId: copyCircuitId
            });
          }
        });
        return newUnits;
      });
    }
  };

  const removeCircuit = (circuitId: string) => {
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        return {
          ...b,
          circuits: b.circuits.filter(c => c.id !== circuitId),
        };
      })
    );
    if (setHvacUnits) {
      setHvacUnits(prev => prev.filter(u => u.linkedCircuitId !== circuitId));
    }
  };

  const clearCircuits = () => {
    if (!window.confirm(`Are you sure you want to clear all circuits on panel ${currentBoard.name}?`)) return;
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => (idx === activeIndex ? { ...b, circuits: [] } : b))
    );
  };

  const autoGroupCircuits = () => {
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        const sorted = [...b.circuits].sort((a, bCircuit) => {
          const roomA = a.room || '';
          const roomB = bCircuit.room || '';
          if (roomA !== roomB) {
            return roomA.localeCompare(roomB);
          }
          const typeA = a.loadType || '';
          const typeB = bCircuit.loadType || '';
          return typeA.localeCompare(typeB);
        });
        return { ...b, circuits: sorted };
      })
    );
  };

  const handleCircuitDragDrop = (src: number, dest: number) => {
    if (src === dest) return;
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        const list = [...b.circuits];
        const [moved] = list.splice(src, 1);
        list.splice(dest, 0, moved);
        return { ...b, circuits: list };
      })
    );
  };

  const handleImport = (newCircuits: Circuit[], mode: 'append' | 'replace') => {
    trackHistory(boards);
    setBoards(prev =>
      prev.map((b, idx) => {
        if (idx !== activeIndex) return b;
        const circuits = mode === 'replace' ? newCircuits : [...b.circuits, ...newCircuits];
        return { ...b, circuits };
      })
    );
    setImportOpen(false);
  };

  // Aggregated Sizing metrics for cable & switches
  const totalCablesM = currentBoard.circuits.reduce((acc, c) => {
    const coresMultiplier = ll_cores[c.cableCores] || 1;
    return acc + Math.ceil((c.cableLength || 0) * coresMultiplier * 10) / 10;
  }, 0);

  const wireSizeTotals = WIRE_SIZES.reduce((acc, w) => {
    acc[w] = currentBoard.circuits
      .filter(c => c.wire === w)
      .reduce((sum, c) => {
        const cores = ll_cores[c.cableCores] || 1;
        return sum + Math.ceil((c.cableLength || 0) * cores * 10) / 10;
      }, 0);
    return acc;
  }, {} as Record<string, number>);

  const activeWires = WIRE_SIZES.filter(w => wireSizeTotals[w] > 0);

  const wireCoresMap = WIRE_SIZES.reduce((acc, w) => {
    acc[w] = Array.from(new Set(currentBoard.circuits.filter(c => c.wire === w && c.cableLength > 0).map(c => c.cableCores))).sort(
      (a, b) => (ll_cores[a] || 1) - (ll_cores[b] || 1)
    );
    return acc;
  }, {} as Record<string, string[]>);

  // Switch aggregates
  const switchTotals = currentBoard.circuits.reduce((acc, c) => {
    if ((c.switchQty || 0) > 0) {
      const type = c.switchType || '1 Gang';
      acc[type] = (acc[type] || 0) + (c.switchQty || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const activeSwitches = SWITCH_TYPES.filter(sw => switchTotals[sw] > 0);
  const grandTotalSwitches = activeSwitches.reduce((acc, sw) => acc + switchTotals[sw], 0);

  // Socket aggregates
  const socketTotals = currentBoard.circuits.reduce((acc, c) => {
    if (c.loadType === 'Sockets') {
      const area = (c.roomL || 0) * (c.roomW || 0);
      const factor = (settings.customRoomSockets && settings.customRoomSockets[c.room || '']) || settings.socketAreaFactor || 4;
      const calculatedSocketQty = area > 0 ? Math.max(1, Math.ceil(area / factor)) : 1;
      const qty = c.qty || calculatedSocketQty;
      const variance = c.socketVariance || '13A Socket';
      acc[variance] = (acc[variance] || 0) + qty;
    }
    return acc;
  }, {} as Record<string, number>);

  const activeSockets = dynamic_SOCKET_VARIANCES.filter(s => (socketTotals[s] || 0) > 0);
  const grandTotalSockets = activeSockets.reduce((acc, s) => acc + socketTotals[s], 0);

  // Color mapping aggregates
  const colorLengths: Record<string, Record<string, { len: number; count: number }>> = {};
  currentBoard.circuits.forEach(c => {
    const len = c.cableLength || 0;
    if (!len || !c.wire) return;
    const colors = getCableColors(c.cableCores);
    colors.forEach(col => {
      colorLengths[col] = colorLengths[col] || {};
      colorLengths[col][c.wire] = colorLengths[col][c.wire] || { len: 0, count: 0 };
      colorLengths[col][c.wire].len += len;
      colorLengths[col][c.wire].count += 1;
    });
  });

  const activeColors = Object.keys(CABLE_PALETTE).filter(col => colorLengths[col]);
  const activeWiresForColor = WIRE_SIZES.filter(w => activeColors.some(col => colorLengths[col][w]));
  const sumByColor = (col: string) => Object.values(colorLengths[col] || {}).reduce((sum, entry) => sum + entry.len, 0);
  const grandTotalConductorLength = activeColors.reduce((sum, col) => sum + sumByColor(col), 0);

  // Count unique non-duplicated circuit breakers
  const uniqueCircuitBreakersCount = (() => {
    const seen = new Set<string>();
    currentBoard.circuits.forEach(c => {
      seen.add(c.circuitId);
    });
    return seen.size;
  })();

  // Suggested generator size: Total Installed / 1000, result / 0.8 + 20%
  const suggestedGeneratorKVA = totalW > 0 ? ((totalW / 1000) / 0.8) * 1.2 : 0;

  // Mains CB overrides
  const selectedMainsCB = mainsOverrides[currentBoard.id] ?? recommendedCB;

  return (
    <div className="pb-16 space-y-4">
      {/* Sub-tab Navigation: Distribution Panels vs Industrial MCC */}
      <div className="flex items-center justify-between border-b border-[#2d3748] pb-3 mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setElectricalSubTab('panels')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              electricalSubTab === 'panels'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-[#1a1f2e] text-gray-400 hover:text-white border border-[#2d3748]'
            }`}
          >
            <span>⚡</span>
            <span>Distribution Panels & Circuits</span>
          </button>
          <button
            onClick={() => setElectricalSubTab('industrial')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              electricalSubTab === 'industrial'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                : 'bg-[#1a1f2e] text-gray-400 hover:text-white border border-[#2d3748]'
            }`}
          >
            <span>🏭</span>
            <span>Industrial MCC & Motors</span>
          </button>
        </div>
      </div>

      {electricalSubTab === 'industrial' ? (
        <IndustrialTab settings={settings} />
      ) : (
        <>
          {/* Panel Tab selector */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {boards.map((b, idx) => (
          <button
            key={b.id}
            onClick={() => setActiveIndex(idx)}
            className={`px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
              idx === activeIndex
                ? 'border-blue-500 bg-[#1e3a5f] text-blue-300 shadow-md'
                : 'border-[#2d3748] bg-[#1a1f2e] text-[#718096] hover:text-[#e2e8f0]'
            }`}
          >
            {b.name}
            <span
              className={`ml-2 text-[10px] px-1 rounded ${
                b.phase === '3-Phase' ? 'bg-[#1a3a5c] text-blue-300' : 'bg-[#2d1b3d] text-purple-300'
              }`}
            >
              {b.phase}
            </span>
          </button>
        ))}
        <button
          onClick={addPanel}
          className="px-3 py-1.5 rounded-md border border-dashed border-[#276749] bg-[#1a3a1a] text-green-400 hover:text-green-300 cursor-pointer text-xs font-semibold"
        >
          ⊕ Panel
        </button>
        <button
          onClick={() => {
            trackHistory(boards);
            const copy: Board = {
              ...currentBoard,
              id: _t(),
              name: currentBoard.name + '-Copy',
              circuits: currentBoard.circuits.map(c => ({ ...c, id: _t() })),
            };
            setBoards(prev => [...prev, copy]);
            setActiveIndex(boards.length);
          }}
          className="px-3 py-1.5 rounded-md border border-dashed border-[#2d4a6a] bg-[#1a2a3a] text-blue-400 hover:text-blue-300 cursor-pointer text-xs font-semibold"
          title="Duplicate active panel"
        >
          🗐 Duplicate
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="ml-auto px-3 py-1.5 rounded-md border border-blue-900 bg-[#122035] text-blue-400 hover:text-blue-300 hover:bg-[#1a304e] cursor-pointer text-xs font-semibold flex items-center gap-1.5 transition-colors"
          title="Open Electrical Discipline & Sizing Settings"
        >
          <span>⚙️</span> Sizing Parameters
        </button>
      </div>

      {/* discipline specific electrical settings overlay compact box */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSettings(false);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl max-w-4xl w-full shadow-2xl shadow-black/80 relative max-h-[90vh] flex flex-col overflow-hidden"
            >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>⚡</span> Electrical Discipline Settings & Sizing Calibration
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Supply Voltage (V)</label>
                  <input
                    type="number"
                    value={settings.voltage}
                    onChange={e => setSettings(p => ({ ...p, voltage: +e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Supply Frequency (Hz)</label>
                  <input
                    type="number"
                    value={settings.frequency}
                    onChange={e => setSettings(p => ({ ...p, frequency: +e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Base Power Factor</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.powerFactor}
                    onChange={e => setSettings(p => ({ ...p, powerFactor: +e.target.value }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Demand Factor (%)</label>
                  <input
                    type="number"
                    step="5"
                    value={Math.round(settings.demandFactor * 100)}
                    onChange={e => setSettings(p => ({ ...p, demandFactor: +e.target.value / 100 }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Diversity Factor (%)</label>
                  <input
                    type="number"
                    step="5"
                    value={Math.round(settings.diversityFactor * 100)}
                    onChange={e => setSettings(p => ({ ...p, diversityFactor: +e.target.value / 100 }))}
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                {overrideTab !== 'sockets' && (
                  <>
                    <div>
                      <label className="block text-[10px] text-blue-400 mb-1 uppercase tracking-wider font-semibold">Lighting Preset Mode</label>
                      <select
                        value={settings.lightingPresetMode || 'standard'}
                        onChange={e => setSettings(p => ({ ...p, lightingPresetMode: e.target.value as any }))}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                      >
                        <option value="standard">Standard Presets</option>
                        <option value="high">High Lux (Preset x 1.5)</option>
                        <option value="low">Low Lux (Preset x 0.8)</option>
                        <option value="custom">Custom (Target Base Lux)</option>
                        <option value="overrides">Room overrides</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Target Base Lux (Lighting)</label>
                      <input
                        type="number"
                        value={settings.targetLux}
                        onChange={e => setSettings(p => ({ ...p, targetLux: +e.target.value }))}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Light Maintenance Factor (MF)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={settings.lightMF}
                        onChange={e => setSettings(p => ({ ...p, lightMF: +e.target.value }))}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Default LPW (lm/W)</label>
                      <input
                        type="number"
                        value={settings.defaultLPW}
                        onChange={e => setSettings(p => ({ ...p, defaultLPW: +e.target.value }))}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Lighting Rounding Mode</label>
                      <select
                        value={settings.lightingRoundingMode}
                        onChange={e => setSettings(p => ({ ...p, lightingRoundingMode: e.target.value as any }))}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                      >
                        <option value="actual">Actual (Decimals)</option>
                        <option value="floor">Floor (Round Down)</option>
                        <option value="round">Round (Nearest Integer)</option>
                        <option value="ceil">Ceil (Round Up)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Room overrides with sub-tabs */}
              <div className="bg-[#13192a] p-3 rounded-lg border border-[#2d3748]/50">
                <div className="flex justify-between items-center mb-3 border-b border-[#2d3748]/60 pb-2 flex-wrap gap-2">
                  <span className="text-xs font-bold text-[#b794f4] flex items-center gap-1.5">
                    <span>🏠</span> Room-specific Sizing Overrides
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Add Room input and button */}
                    <div className="relative flex items-center gap-1.5 bg-[#0f1117] px-2 py-1 rounded-md border border-[#2d3748] focus-within:border-blue-500 transition-all">
                      <span className="text-[10px] text-gray-500 font-bold uppercase select-none">Add Room:</span>
                      <input
                        type="text"
                        placeholder="e.g. Server Room"
                        id="newRoomNameInput"
                        className="bg-transparent text-white text-xs outline-none w-28 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              handleAddCustomRoom(val);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('newRoomNameInput') as HTMLInputElement;
                          if (el && el.value.trim()) {
                            handleAddCustomRoom(el.value.trim());
                            el.value = '';
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300 font-bold text-xs p-0.5 cursor-pointer"
                        title="Add Custom Room"
                      >
                        ➕
                      </button>
                    </div>

                    <div className="flex bg-[#0f1117] p-0.5 rounded-lg border border-[#2d3748]">
                      <button
                        type="button"
                        onClick={() => setOverrideTab('sockets')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          overrideTab === 'sockets'
                            ? 'bg-blue-600 text-white'
                            : 'text-[#718096] hover:text-[#e2e8f0]'
                        }`}
                      >
                        🔌 Sockets (m²)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideTab('lighting')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          overrideTab === 'lighting'
                            ? 'bg-blue-600 text-white'
                            : 'text-[#718096] hover:text-[#e2e8f0]'
                        }`}
                      >
                        💡 Lighting (Lux)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideTab('dropdowns')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          overrideTab === 'dropdowns'
                            ? 'bg-blue-600 text-white'
                            : 'text-[#718096] hover:text-[#e2e8f0]'
                        }`}
                      >
                        🛠️ Dropdowns Manager
                      </button>
                    </div>
                  </div>
                </div>

                {newRoomError && (
                  <div className="mb-2.5 text-[10px] text-red-400 bg-red-950/30 border border-red-900/40 p-1.5 rounded animate-pulse">
                    ⚠️ {newRoomError}
                  </div>
                )}

                {overrideTab === 'sockets' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {dynamicRoomList.map(r => {
                      const currentVal = (settings.customRoomSockets && settings.customRoomSockets[r]) || settings.socketAreaFactor || 4;
                      const isCustomRoom = (settings.customRooms || []).includes(r);
                      return (
                        <div key={r} className="bg-[#1a1f2e] border border-[#2d3748] rounded p-2 text-[11px] flex flex-col justify-between relative">
                          {isCustomRoom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomRoom(r)}
                              className="absolute top-1 right-1 text-red-400 hover:text-red-300 font-extrabold text-[11px] bg-red-950/80 hover:bg-red-900/90 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer transition-all border border-red-800 shadow-md opacity-100 z-10"
                              title={`Remove custom room: ${r}`}
                            >
                              ✕
                            </button>
                          )}
                          <span className="block text-[#a0aec0] font-medium truncate mb-1 pr-4" title={r}>{r}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">1 per</span>
                            <input
                              type="number"
                              value={currentVal}
                              onChange={e => {
                                const val = Math.max(1, +e.target.value);
                                setSettings(p => ({
                                  ...p,
                                  customRoomSockets: {
                                    ...(p.customRoomSockets || {}),
                                    [r]: val
                                  }
                                }));
                              }}
                              className="w-10 bg-[#0f1117] border border-[#2d3748] rounded text-center text-xs text-green-400 font-bold outline-none"
                            />
                            <span className="text-[10px] text-gray-500 font-mono">m²</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {overrideTab === 'lighting' && (
                  <div>
                    {settings.lightingPresetMode !== 'overrides' && (
                      <div className="mb-2.5 text-[10px] text-blue-300 bg-blue-950/40 border border-blue-900/60 p-2 rounded">
                        💡 <strong>Note</strong>: Individual room Lux overrides below will only be active if <strong>Lighting Preset Mode</strong> (above) is set to <strong>Room overrides</strong>. Currently, it is set to <em>{settings.lightingPresetMode || 'standard'}</em>.
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {dynamicRoomList.map(r => {
                        const currentLux = (settings.customRoomLux && settings.customRoomLux[r] !== undefined)
                          ? settings.customRoomLux[r]
                          : (ROOM_LUX_DATABASE[r] || settings.targetLux || 300);
                        const isCustomRoom = (settings.customRooms || []).includes(r);
                        return (
                          <div key={r} className="bg-[#1a1f2e] border border-[#2d3748] rounded p-2 text-[11px] flex flex-col justify-between relative">
                            {isCustomRoom && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomRoom(r)}
                                className="absolute top-1 right-1 text-red-400 hover:text-red-300 font-extrabold text-[11px] bg-red-950/80 hover:bg-red-900/90 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer transition-all border border-red-800 shadow-md opacity-100 z-10"
                                title={`Remove custom room: ${r}`}
                              >
                                ✕
                              </button>
                            )}
                            <span className="block text-[#a0aec0] font-medium truncate mb-1 pr-4" title={r}>{r}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-500">Lux:</span>
                              <input
                                type="number"
                                value={currentLux}
                                onChange={e => {
                                  const val = Math.max(10, +e.target.value);
                                  setSettings(p => ({
                                    ...p,
                                    customRoomLux: {
                                      ...(p.customRoomLux || {}),
                                      [r]: val
                                    }
                                  }));
                                }}
                                className="w-14 bg-[#0f1117] border border-[#2d3748] rounded text-center text-xs text-amber-400 font-bold outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {overrideTab === 'dropdowns' && (
                  <div className="space-y-4 text-left">
                    <div className="bg-[#1a1f2e] p-4 rounded-xl border border-[#2d3748] grid grid-cols-1 lg:grid-cols-12 gap-5 shadow-2xl">
                      {/* Left Pane: Select Category, Router, and Add Item */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="bg-[#0f121d] p-3 rounded-lg border border-[#2d3748] space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="block text-[11px] text-sky-300 font-bold uppercase tracking-wider">
                              Select Dropdown Category (Edit Existing Lists)
                            </label>
                            <span className="text-[10px] text-gray-400 font-mono font-semibold">
                              {(dropdowns[selectedDropdownKey] || []).length} items
                            </span>
                          </div>
                          <select
                            value={selectedDropdownKey}
                            onChange={(e) => {
                              setSelectedDropdownKey(e.target.value);
                              setEditItemIndex(null);
                              setNewDropdownItem('');
                            }}
                            className="w-full bg-[#070a12] border border-[#2d3748] rounded px-3 py-2 text-xs text-sky-200 font-semibold outline-none cursor-pointer hover:border-sky-500/50 transition-all"
                            title={selectedDropdownKey}
                          >
                            {getCategoriesForTab('electrical', dropdowns).map(k => (
                              <option key={k} value={k} className="bg-[#070a12] text-sky-200">
                                {k} ({(dropdowns[k] || []).length} items)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Sizing Router configuration */}
                        <DropdownCategoryConfigPanel selectedKey={selectedDropdownKey} dropdowns={dropdowns} />

                        {/* Populate from table data */}
                        <div className="bg-[#13192a]/50 p-3 rounded border border-[#2d3748]/60 space-y-2">
                          <span className="block text-[10px] text-[#b794f4] font-bold uppercase tracking-wider">
                            Populate List From Table Data
                          </span>
                          <span className="block text-[9px] text-gray-500 leading-normal">
                            Scan existing boards/circuits to harvest values from table columns.
                          </span>
                          <div className="flex flex-col gap-1.5">
                            <select
                              id="tableImportColumnSelect"
                              className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1.5 text-[11px] text-[#cbd5e0] outline-none cursor-pointer"
                            >
                              <option value="room">Room Name</option>
                              <option value="lightingType">Lighting Type</option>
                              <option value="fixtureStyle">Fixture Style / Variance</option>
                              <option value="mountType">Mount Type</option>
                              <option value="switchType">Switch Type</option>
                              <option value="notes">Notes Column</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const selEl = document.getElementById('tableImportColumnSelect') as HTMLInputElement;
                                if (!selEl) return;
                                const col = selEl.value;
                                // harvest values
                                const harvested = new Set<string>();
                                boards.forEach(b => {
                                  b.circuits.forEach(c => {
                                    let v = '';
                                    if (col === 'room') v = c.room || '';
                                    else if (col === 'lightingType') {
                                      v = c.lightingType || c.socketType || c.acType || c.dedicatedType || '';
                                    } else if (col === 'fixtureStyle') {
                                      v = c.fixtureStyle || c.socketFixtureStyle || c.acFixtureStyle || c.dedicatedFixtureStyle || '';
                                    } else if (col === 'mountType') {
                                      v = c.mountType || c.socketMountType || c.acMountType || '';
                                    } else if (col === 'switchType') v = c.switchType || '';
                                    else if (col === 'notes') v = c.notes || '';
                                    v = v.trim();
                                    if (v && v !== '—' && v !== 'None' && v !== 'Ambient' && v !== 'Double' && v !== 'Single Phase' && v !== 'Three Phase') {
                                      harvested.add(v);
                                    }
                                  });
                                });

                                if (harvested.size === 0) {
                                  alert('No custom non-default unique values found in that column across any board circuits.');
                                  return;
                                }

                                const listToAdd = Array.from(harvested);
                                setDropdowns(prev => {
                                  const currentList = prev[selectedDropdownKey] || [];
                                  const filteredList = listToAdd.filter(item => !currentList.includes(item));
                                  if (filteredList.length === 0) {
                                    alert('All found unique values are already present in this dropdown category list.');
                                    return prev;
                                  }
                                  alert(`Successfully harvested and added ${filteredList.length} unique values: ${filteredList.join(', ')}`);
                                  return {
                                    ...prev,
                                    [selectedDropdownKey]: [...currentList, ...filteredList]
                                  };
                                });
                              }}
                              className="w-full bg-purple-900/40 border border-purple-700/60 hover:bg-purple-800/50 text-purple-200 font-bold text-[10px] py-1.5 rounded transition-all cursor-pointer"
                            >
                              Harvest Unique Values
                            </button>
                          </div>
                        </div>

                        {/* Add entirely new custom category list */}
                        <div className="bg-[#13192a]/50 p-3 rounded border border-[#2d3748]/60 space-y-2">
                          <span className="block text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                            Create New Dynamic List
                          </span>
                          <span className="block text-[9px] text-gray-500 leading-normal">
                            Define a brand new list category and assign it to a tab and role.
                          </span>
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={newCustomListName}
                              onChange={(e) => setNewCustomListName(e.target.value)}
                              placeholder="e.g. My Custom Fittings"
                              className="bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none"
                            />
                            
                            <div>
                              <label className="block text-[8px] text-gray-400 mb-0.5 uppercase font-semibold">Target Tab Location</label>
                              <select
                                value={newCustomListTab}
                                onChange={e => setNewCustomListTab(e.target.value)}
                                className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1 text-[10px] text-white outline-none cursor-pointer"
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
                                onChange={e => setNewCustomListRole(e.target.value as any)}
                                className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1 text-[10px] text-white outline-none cursor-pointer"
                              >
                                {MEP_ROLES.map(r => (
                                  <option key={r.id} value={r.id} title={r.description}>{r.name}</option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const name = newCustomListName.trim();
                                if (!name) return;
                                if (dropdowns[name]) {
                                  alert('This list name already exists.');
                                  return;
                                }

                                // Update metadata
                                const metadata = getMepDropdownMetadata();
                                metadata[name] = { tabId: newCustomListTab, role: newCustomListRole };
                                saveMepDropdownMetadata(metadata);

                                setDropdowns(prev => ({
                                  ...prev,
                                  [name]: []
                                }));

                                if (newCustomListTab === 'electrical' || newCustomListTab === 'all') {
                                  setSelectedDropdownKey(name);
                                }
                                setNewCustomListName('');
                                window.dispatchEvent(new Event('storage'));
                                alert(`Created new list category "${name}" on tab "${MEP_TABS.find(t => t.id === newCustomListTab)?.name || newCustomListTab}". You can now add options to it!`);
                              }}
                              className="w-full bg-teal-900/40 border border-teal-700/60 hover:bg-teal-800/50 text-teal-200 font-bold text-[10px] py-1.5 rounded transition-all cursor-pointer"
                            >
                              Create Category
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Pane: Option List View / Edit / Delete */}
                      <div className="lg:col-span-7 space-y-2.5 flex flex-col">
                        <div className="flex justify-between items-center pb-1 border-b border-[#2d3748]/60">
                          <span className="text-[10px] text-[#cbd5e0] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span>📋</span> Options List ({selectedDropdownKey})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the ENTIRE "${selectedDropdownKey}" category and reset it to default?`)) {
                                setDropdowns(prev => {
                                  const copy = { ...prev };
                                  delete copy[selectedDropdownKey];
                                  const remaining = Object.keys(copy);
                                  setSelectedDropdownKey(remaining[0] || 'Switch Types');
                                  return copy;
                                });
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-[10px] font-bold hover:underline cursor-pointer"
                            title="Delete category"
                          >
                            🗑️ Delete Category
                          </button>
                        </div>

                        <div className="bg-[#0f1117] border border-[#2d3748] rounded-md p-2 divide-y divide-[#2d3748]/40 max-h-[280px] overflow-y-auto flex-1 custom-scrollbar">
                          {(dropdowns[selectedDropdownKey] || []).length === 0 ? (
                            <div className="text-center text-gray-500 py-8 text-xs font-medium">
                              No options in this list. Click "Add" above to populate it.
                            </div>
                          ) : (
                            (dropdowns[selectedDropdownKey] || []).map((item, index) => {
                              const isEditing = editItemIndex === index;
                              return (
                                <div key={index} className="py-2 px-1.5 flex items-center justify-between gap-3 group hover:bg-[#1a2035]/30 rounded transition-all">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5 w-full">
                                      <input
                                        type="text"
                                        value={editItemText}
                                        onChange={(e) => setEditItemText(e.target.value)}
                                        className="flex-1 bg-[#151b2d] border border-[#2b6cb0]/60 rounded px-2 py-0.5 text-xs text-white font-semibold outline-none"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveEditItem(index);
                                          } else if (e.key === 'Escape') {
                                            setEditItemIndex(null);
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditItem(index)}
                                        className="bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] px-2 py-1 rounded cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditItemIndex(null)}
                                        className="bg-[#2d3748] hover:bg-gray-700 text-gray-300 font-bold text-[10px] px-2 py-1 rounded cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs text-gray-200 font-medium break-words leading-relaxed flex-1">{item}</span>
                                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditItemIndex(index);
                                            setEditItemText(item);
                                          }}
                                          className="text-blue-400 hover:text-blue-300 p-1 text-[10px] cursor-pointer"
                                          title="Edit Option"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDropdowns(prev => {
                                              const currentList = prev[selectedDropdownKey] || [];
                                              return {
                                                ...prev,
                                                [selectedDropdownKey]: currentList.filter((_, idx) => idx !== index)
                                              };
                                            });
                                          }}
                                          className="text-red-400 hover:text-red-300 p-1 text-xs cursor-pointer"
                                          title="Delete Option"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#2d3748] bg-[#0f1322] flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded transition-all cursor-pointer shadow-lg shadow-blue-500/20"
              >
                Apply & Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Active Panel Config Row */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 mb-3 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Panel Name</label>
          <input
            value={currentBoard.name}
            onChange={e => updatePanelField('name', e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-1.5 text-xs outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Board Type</label>
          <select
            value={currentBoard.boardType}
            onChange={e => updatePanelField('boardType', e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-1.5 text-xs outline-none focus:border-blue-500"
          >
            {z5.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[110px]">
          <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Phase Configuration</label>
          <select
            value={currentBoard.phase}
            onChange={e => updatePanelField('phase', e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-1.5 text-xs outline-none focus:border-blue-500"
          >
            {j5.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-[2] min-w-[180px] relative">
          <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Physical Location</label>
          <input
            value={currentBoard.location}
            onFocus={() => setActiveLocationDropdown(true)}
            onClick={() => setActiveLocationDropdown(true)}
            onChange={e => updatePanelField('location', e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-[#e2e8f0] p-1.5 text-xs outline-none focus:border-blue-500"
            placeholder="e.g. Electrical Room..."
          />
          {activeLocationDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setTimeout(() => setActiveLocationDropdown(false), 150)} 
              />
              <div className="absolute left-0 mt-1 w-full max-h-48 overflow-y-auto bg-[#1a1f2e] border border-[#2d3748] rounded-md shadow-xl z-50 text-xs text-[#cbd5e0] divide-y divide-[#2d3748]/50">
                <div className="p-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-[#13192a] select-none">
                  Select Location:
                </div>
                {LOCATION_SUGGESTIONS.map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      updatePanelField('location', loc);
                      setActiveLocationDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-all font-medium text-white bg-transparent border-none cursor-pointer"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {boards.length > 1 && (
          <button
            onClick={deletePanel}
            className="px-3 py-1.5 rounded-md bg-[#3d1a1a] border border-[#742a2a] text-red-400 hover:text-red-300 cursor-pointer text-xs font-semibold h-[31px]"
          >
            🗑️ Delete Panel
          </button>
        )}
      </div>

      {/* Combined Analytics & Cable Statistics Box */}
      {(isThreePhase || activeWires.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          {/* C. Industrial DB Specialized Specification & APFC Optimizer Card */}
          {currentBoard.boardType === 'Industrial DB' && (() => {
            const motorCircuits = currentBoard.circuits.filter(c => c.loadType === 'Motor');
            const pumpCircuits = currentBoard.circuits.filter(c => c.loadType === 'Pump');
            const compressorCircuits = currentBoard.circuits.filter(c => c.loadType === 'Compressor');
            const weldingCircuits = currentBoard.circuits.filter(c => c.loadType === 'Welding');
            const indSocketCircuits = currentBoard.circuits.filter(c => c.loadType === 'Industrial Socket');

            const totalInductiveWatts = currentBoard.circuits
              .filter(c => ['Motor', 'Pump', 'Compressor', 'Welding'].includes(c.loadType || ''))
              .reduce((sum, c) => sum + (c.watts || 0) * (c.qty || 1), 0);
            
            const totalInductiveHp = (totalInductiveWatts / 746).toFixed(1);
            const totalKwVal = totalWatts / 1000;
            // Tan(ArcCos(0.82)) - Tan(ArcCos(0.98)) = 0.697 - 0.203 = 0.494
            const requiredKvar = Math.max(0, totalKwVal * 0.494);
            const apfcSteps = requiredKvar > 0 
              ? requiredKvar < 10 
                ? `${Math.max(1, Math.round(requiredKvar))} kVAR Single-stage`
                : `${(requiredKvar / 4).toFixed(1)} kVAR x 4 Steps APFC`
              : 'N/A';

            return (
              <div className="bg-[#1a1f2e] border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-blue-500/5 select-none">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-[#2d3748]/50 pb-2">
                    <span className="font-bold text-[#e2e8f0] text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏭</span> INDUSTRIAL SPECIFICATIONS
                    </span>
                    <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase">
                      Industrial DB
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Machinery count bento */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#0f1117]/60 border border-[#2d3748]/60 p-2 rounded text-center">
                        <span className="text-[9px] text-gray-500 uppercase block font-semibold">Motor & Pump Loads</span>
                        <span className="text-xs font-bold text-teal-400 font-mono">
                          {motorCircuits.length + pumpCircuits.length} Active
                        </span>
                      </div>
                      <div className="bg-[#0f1117]/60 border border-[#2d3748]/60 p-2 rounded text-center">
                        <span className="text-[9px] text-gray-500 uppercase block font-semibold">Welder & Heavy Load</span>
                        <span className="text-xs font-bold text-amber-500 font-mono">
                          {weldingCircuits.length + compressorCircuits.length} Active
                        </span>
                      </div>
                    </div>

                    {/* Inductive stats */}
                    <div className="flex justify-between items-center text-xs border-b border-[#2d3748]/30 pb-2">
                      <span className="text-gray-400">Total Inductive Power</span>
                      <span className="font-bold text-white font-mono text-right">
                        {totalInductiveHp} HP <span className="text-[10px] text-gray-500">({(totalInductiveWatts/1000).toFixed(1)} kW)</span>
                      </span>
                    </div>

                    {/* APFC Compensation recommendation */}
                    <div className="bg-blue-950/20 border border-blue-900/50 p-3 rounded-lg space-y-2">
                      <div className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <span>⚡</span> APFC Power Factor Optimizer
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        Inductive motors & machinery degrade Power Factor (PF) to ~0.82. Installing capacitors brings PF to 0.98.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-center pt-1">
                        <div className="bg-[#141a29] p-1.5 rounded border border-[#2d3748]/40">
                          <span className="text-[8px] text-gray-500 uppercase block">Required APFC</span>
                          <span className="text-xs font-black font-mono text-green-400">
                            {requiredKvar.toFixed(1)} kVAR
                          </span>
                        </div>
                        <div className="bg-[#141a29] p-1.5 rounded border border-[#2d3748]/40">
                          <span className="text-[8px] text-gray-500 uppercase block">Capacitor Steps</span>
                          <span className="text-[10px] font-bold font-mono text-teal-300 font-medium">
                            {apfcSteps}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cable containment & safety rules */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">🛡️ Safety & Derating Standards</span>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div className="flex justify-between border-b border-[#2d3748]/10 py-0.5">
                          <span className="text-gray-500">Inrush Multiplier</span>
                          <span className="font-bold text-white">1.75x</span>
                        </div>
                        <div className="flex justify-between border-b border-[#2d3748]/10 py-0.5">
                          <span className="text-gray-500">Cable Containment</span>
                          <span className="font-bold text-white">Tray / Trunk</span>
                        </div>
                        <div className="flex justify-between border-b border-[#2d3748]/10 py-0.5">
                          <span className="text-gray-500">Containment Derating</span>
                          <span className="font-bold text-amber-400">0.80 Factor</span>
                        </div>
                        <div className="flex justify-between border-b border-[#2d3748]/10 py-0.5">
                          <span className="text-gray-500">Min Cable Cu</span>
                          <span className="font-bold text-white">2.5 mm²</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })()}

          {/* A. Phase Load Distribution (if 3-Phase is active) */}
          {isThreePhase && (() => {
            const rPct = totalWatts > 0 ? (wattsR / totalWatts) * 100 : 33.33;
            const yPct = totalWatts > 0 ? (wattsY / totalWatts) * 100 : 33.33;
            const bPct = totalWatts > 0 ? (wattsB / totalWatts) * 100 : 33.33;

            let statusStyle = "bg-[#1c3d27] border-[#276749] text-green-400";
            let statusText = `✅ Balanced (${imbalancePct.toFixed(1)}% Imbalance)`;

            if (imbalancePct >= 40) {
              statusStyle = "bg-[#3d1a1a] border-[#742a2a] text-red-400";
              statusText = `⚠️ Unbalanced (${imbalancePct.toFixed(1)}% Imbalance)`;
            } else if (imbalancePct >= 20) {
              statusStyle = "bg-[#3d2d1c] border-[#744210] text-amber-400";
              statusText = `⚠️ Unbalanced (${imbalancePct.toFixed(1)}% Imbalance)`;
            } else {
              statusStyle = "bg-[#1c3d27] border-[#276749] text-green-400";
              statusText = `✅ Balanced (${imbalancePct.toFixed(1)}% Imbalance)`;
            }

            return (
              <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 flex flex-col justify-between max-w-md md:max-w-lg w-full mx-auto">
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="font-bold text-[#cbd5e0] text-xs uppercase tracking-wider">Phase Load Distribution</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">Calculated Ideal CB:</span>
                      <span className="text-xs font-bold text-white">{recommendedCB}A</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusStyle}`}>
                        {statusText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[10px] text-[#f6ad55]">Set Mains:</span>
                      <select
                        value={selectedMainsCB}
                        onChange={e => setMainsOverrides(prev => ({ ...prev, [currentBoard.id]: +e.target.value }))}
                        className="bg-[#0f1117] border border-[#2d3748] rounded text-[#f6ad55] text-xs font-bold px-1 py-0.5 outline-none"
                      >
                        {CB_SIZES.map(f => (
                          <option key={f} value={f}>
                            {f}A
                          </option>
                        ))}
                      </select>
                      {mainsOverrides[currentBoard.id] !== undefined && (
                        <button
                          onClick={() =>
                            setMainsOverrides(prev => {
                              const updated = { ...prev };
                              delete updated[currentBoard.id];
                              return updated;
                            })
                          }
                          className="text-[10px] text-[#718096] hover:text-white underline cursor-pointer ml-1"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#0f1117] border border-[#2d3748]/60 rounded-xl p-3 shadow-lg">
                    <div className="flex justify-between items-center border-b border-[#2d3748]/50 pb-2 mb-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#cbd5e0] uppercase tracking-wider">
                          3-Phase current & Power chart
                        </span>
                        <span className="text-[9px] text-[#718096] mt-0.5">
                          Visual levels compared to {selectedMainsCB}A limit
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-[#718096] uppercase tracking-wider block">Mains Limit</span>
                        <span className="text-xs font-black font-mono text-blue-400">{selectedMainsCB} A</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 h-32 items-end border-b border-[#2d3748]/50 pb-2 relative">
                      <div className="absolute inset-x-0 top-0 h-full flex flex-col justify-between pointer-events-none text-[8px] font-mono text-[#4a5568]/50 select-none">
                        <div className="w-full border-t border-[#2d3748]/30 pt-0.5">100% (Limit)</div>
                        <div className="w-full border-t border-[#2d3748]/15 pt-0.5">75%</div>
                        <div className="w-full border-t border-[#2d3748]/15 pt-0.5">50%</div>
                        <div className="w-full border-t border-[#2d3748]/15 pt-0.5">25%</div>
                        <div className="w-full"></div>
                      </div>

                      {Pi.map(phase => {
                        const watts = phaseLoads[phase] || 0;
                        const amps = phaseCurrents[phase] || 0;
                        const pct = selectedMainsCB > 0 ? (amps / selectedMainsCB) * 100 : 0;
                        const color = PHASE_COLORS[phase];
                        const isOverloaded = amps > selectedMainsCB;

                        return (
                          <div key={phase} className="flex flex-col items-center h-full justify-end relative z-10">
                            <div className="text-center font-mono leading-tight mb-1 select-none">
                              <div className="text-[10px] font-black text-amber-400">
                                {pct.toFixed(0)}%
                              </div>
                              <div className="text-[9px] font-black" style={{ color }}>
                                {amps.toFixed(1)} A
                              </div>
                              <div className="text-[8px] text-gray-400 font-medium">
                                {(watts / 1000).toFixed(2)} kW
                              </div>
                            </div>

                            <div className={`w-8 sm:w-12 bg-[#1a1f2e] h-20 rounded-t-sm overflow-hidden relative border ${
                              isOverloaded ? 'border-red-500/80 animate-pulse' : 'border-[#2d3748]/80'
                            } flex flex-col justify-end shadow-inner`}>
                              <div
                                className="w-full transition-all duration-300"
                                style={{
                                  height: `${Math.min(pct, 100)}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2.5 text-center">
                      {Pi.map(phase => {
                        const watts = phaseLoads[phase] || 0;
                        const amps = phaseCurrents[phase] || 0;
                        const color = PHASE_COLORS[phase];
                        const isOverloaded = amps > selectedMainsCB;

                        return (
                          <div key={phase} className="flex flex-col items-center">
                            <div className="flex items-center gap-1 justify-center">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-[10px] font-bold tracking-wider" style={{ color }}>
                                Ph {phase}
                              </span>
                            </div>
                            <span className="text-[9px] text-[#cbd5e0] font-mono mt-0.5">
                              {(watts / 1000).toFixed(2)} kW
                            </span>
                            {isOverloaded && (
                              <span className="mt-0.5 px-1 rounded text-[8px] font-black uppercase tracking-wider bg-red-950 border border-red-500 text-red-400 animate-pulse">
                                Overload
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* B. Cable Color Statistics (if activeWires has elements) */}
          {activeWires.length > 0 && (
            <div className={`bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 flex flex-col justify-between ${!isThreePhase ? 'lg:col-span-2' : ''}`}>
              <div>
                <div className="text-[11px] font-bold text-[#cbd5e0] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <span>🎨</span> CABLE COLOR STATISTICS — LENGTH BY COLOR & SIZE
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#2d3748]/60 text-[#718096] uppercase text-[10px] tracking-wider">
                        <th className="pb-1.5 font-semibold">Color</th>
                        {activeWires.map(wSize => (
                          <th key={wSize} className="pb-1.5 text-center font-semibold">{wSize}mm²</th>
                        ))}
                        <th className="pb-1.5 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Red', 'Yellow', 'Blue', 'Black', 'Green'].map(col => {
                        const rowTotal = activeWires.reduce((sum, wSize) => sum + (colorLengths[col]?.[wSize]?.len || 0), 0);
                        const colorInfo = CABLE_PALETTE[col] || { hex: '#ccc', text: '#ccc' };

                        return (
                          <tr key={col} className="border-b border-[#2d3748]/30 hover:bg-[#1f2638]/40 transition-colors">
                            <td className="py-2 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colorInfo.hex }} />
                              <span className="font-bold" style={{ color: colorInfo.text }}>{col}</span>
                            </td>

                            {activeWires.map(wSize => {
                              const entry = colorLengths[col]?.[wSize];
                              if (!entry || entry.len === 0) {
                                return (
                                  <td key={wSize} className="py-2 text-center text-[#4a5568]">
                                    —
                                  </td>
                                );
                              }

                              return (
                                <td key={wSize} className="py-2 text-center">
                                  <span className="text-[#63b3ed] font-bold">{Math.ceil(entry.len)}m</span>{' '}
                                  <span className="text-[#718096] text-[9px]">({entry.count})</span>
                                </td>
                              );
                            })}

                            <td className="py-2 text-right font-bold text-green-400">
                              {rowTotal > 0 ? `${Math.ceil(rowTotal)}m` : <span className="text-[#4a5568]">—</span>}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Bottom "All colors" row */}
                      <tr className="bg-[#0f1117]/40 border-t border-[#2d3748]">
                        <td className="py-2.5 font-semibold text-[#718096]">All colors</td>
                        {activeWires.map(wSize => {
                          const colSum = ['Red', 'Yellow', 'Blue', 'Black', 'Green'].reduce(
                            (sum, col) => sum + (colorLengths[col]?.[wSize]?.len || 0),
                            0
                          );
                          return (
                            <td key={wSize} className="py-2.5 text-center font-bold text-gray-400">
                              {colSum > 0 ? `${Math.ceil(colSum)}m` : '0m'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 text-right font-extrabold text-yellow-400 text-xs">
                          {Math.ceil(grandTotalConductorLength)}m
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-[9px] text-[#718096] mt-3 italic leading-tight">
                (n) = number of circuits contributing to that cell. Each core in a multi-core run carries the circuit's full cable length.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key board statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-3">
        {[
          { label: 'Total Installed', val: `${Math.ceil(totalW).toLocaleString()} W`, color: '#68d391' },
          { label: 'Total Peak Current', val: `${totalCurrent} A`, color: '#63b3ed' },
          { label: 'Demand Load', val: `${demandLoadKW.toFixed(2)} kW`, color: '#f6ad55' },
          { label: 'Calculated Mains', val: `${recommendedCB} A`, color: '#fc8181' },
          { label: 'Total Cable Used', val: `${Math.ceil(totalCablesM)} m`, color: '#d6bcfa' },
          { label: 'Total Circuit Breakers', val: `${uniqueCircuitBreakersCount} Pcs`, color: '#a3b8cc' },
          { label: 'Suggested Generator', val: `${suggestedGeneratorKVA.toFixed(1)} kVA`, color: '#cbd5e0' },
          { label: 'Set Board Breaker', val: `${selectedMainsCB} A`, color: '#e2e8f0', hi: true },
        ].map(stat => (
          <div
            key={stat.label}
            className={`border rounded-lg p-3 transition-all ${
              stat.hi ? 'bg-[#14231b] border-green-800' : 'bg-[#1a1f2e] border-[#2d3748]'
            }`}
          >
            <div className="text-[10px] text-[#718096] mb-1 font-semibold uppercase tracking-wider truncate">
              {stat.label}
            </div>
            <div className="text-base font-bold" style={{ color: stat.hi ? '#68d391' : stat.color }}>
              {stat.val}
            </div>
          </div>
        ))}
      </div>

      {/* Cable by size inline overview */}
      {activeWires.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-xs text-[#a0aec0] mb-3">
          <span className="text-[#718096] font-bold uppercase tracking-wider text-[10px]">
            Cable by size (smallest → largest):
          </span>
          <div className="flex gap-2 flex-wrap">
            {activeWires.map(wSize => {
              const colSum = ['Red', 'Yellow', 'Blue', 'Black', 'Green'].reduce(
                (sum, col) => sum + (colorLengths[col]?.[wSize]?.len || 0),
                0
              );
              const activeColsForSize = ['Red', 'Yellow', 'Blue', 'Black', 'Green'].filter(
                col => (colorLengths[col]?.[wSize]?.len || 0) > 0
              );
              return (
                <div
                  key={wSize}
                  className="flex items-center gap-1.5 bg-[#1a1f2e] border border-[#2d3748] px-2.5 py-1 rounded text-xs"
                >
                  <span className="text-gray-300 font-semibold">{wSize}mm²:</span>
                  <span className="text-[#63b3ed] font-bold">{Math.ceil(colSum)} m</span>
                  <div className="flex gap-1 ml-1">
                    {activeColsForSize.map(col => (
                      <span
                        key={col}
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: CABLE_PALETTE[col]?.hex }}
                        title={`${col}: ${Math.ceil(colorLengths[col][wSize].len)}m`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Switch Bill of Materials inline overview */}
      {activeSwitches.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-xs text-[#a0aec0] mb-3">
          <span className="text-[#718096] font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <span>🎚️</span> Switch Bill of Materials:
          </span>
          <div className="flex gap-2 flex-wrap items-center">
            {activeSwitches.map(sw => (
              <div
                key={sw}
                className="bg-[#1a1f2e] border border-[#2d3748] rounded px-2.5 py-1 flex items-center gap-1.5 text-xs text-[#b794f4]"
              >
                <span className="text-gray-400">{sw}:</span>
                <span className="font-bold">{switchTotals[sw]}</span>
              </div>
            ))}
            <div className="bg-[#161a24] border border-[#553c9a60] rounded px-2.5 py-1 text-purple-200 font-bold">
              Total switches: {grandTotalSwitches}
            </div>
          </div>
        </div>
      )}

      {/* Socket Bill of Materials inline overview */}
      {activeSockets.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-xs text-[#a0aec0] mb-4">
          <span className="text-[#718096] font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <span>🔌</span> Socket Bill of Materials:
          </span>
          <div className="flex gap-2 flex-wrap items-center">
            {activeSockets.map(s => (
              <div
                key={s}
                className="bg-[#1a1f2e] border border-[#2d3748] rounded px-2.5 py-1 flex items-center gap-1.5 text-xs text-[#3182ce]"
              >
                <span className="text-gray-400">{s}:</span>
                <span className="font-bold">{socketTotals[s]}</span>
              </div>
            ))}
            <div className="bg-[#161a24] border border-[#2b6cb0]/40 rounded px-2.5 py-1 text-blue-200 font-bold">
              Total sockets: {grandTotalSockets}
            </div>
          </div>
        </div>
      )}

      {/* Recommended DB Physical Layout Card */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400">
              <Layout size={18} />
            </span>
            <div>
              <h3 className="font-bold text-sm text-[#cbd5e0] flex items-center gap-2">
                Distribution Board (DB) Physical Layout Enclosure
              </h3>
              <p className="text-[11px] text-gray-400">
                Recommended cabinet sizing & physical switchgear placement based on active breaker poles
              </p>
            </div>
          </div>
          {showPhysicalDb ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-[#121724] p-1 rounded-lg border border-[#2d3748]">
                <button
                  type="button"
                  onClick={() => setPanelViewMode('cabinet')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    panelViewMode === 'cabinet' ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Layers size={13} /> Physical Cabinet
                </button>
                <button
                  type="button"
                  onClick={() => setPanelViewMode('sld')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    panelViewMode === 'sld' ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap size={13} /> DB Line Diagram (SLD)
                </button>
                <button
                  type="button"
                  onClick={() => setPanelViewMode('split')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    panelViewMode === 'split' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Layout size={13} /> Dual Split View
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPhysicalDb(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e2538] hover:bg-[#2b354f] border border-[#2d3748] text-[#cbd5e0] transition-all cursor-pointer select-none"
              >
                <EyeOff size={14} /> Hide Panel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPhysicalDb(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e2538] hover:bg-[#2b354f] border border-[#2d3748] text-[#cbd5e0] transition-all cursor-pointer select-none"
            >
              <Eye size={14} /> Show Physical Cabinet & SLD Diagram ({currentBoard.circuits.filter(c => (c.cb || 0) > 0).reduce((acc, c) => {
                const cid = (c.circuitId || '').trim();
                if (cid && !acc.includes(cid)) {
                  acc.push(cid);
                }
                return acc;
              }, [] as string[]).length} MCBs)
            </button>
          )}
        </div>

        <AnimatePresence>
          {showPhysicalDb && (() => {
            const lightingSubCircuitMap = getLightingSubCircuitMap(currentBoard.circuits);

            // Group circuits by their circuitId
            const uniqueCircuitsMap = new Map<string, {
              circuitId: string;
              rooms: string[];
              loadTypes: string[];
              cb: number;
              phase: string;
              isThreePhase: boolean;
              wattage: number;
              subCircuitSummary: string;
            }>();

            currentBoard.circuits.forEach(c => {
              const rating = c.cb || 0;
              if (rating <= 0) return;

              const cid = (c.circuitId || '').trim();
              if (!cid) return;

              const isDedicated3Ph = c.dedicatedType === 'Three Phase' || (c.fixtureVariance && c.fixtureVariance.includes('3ph'));
              const subInfo = lightingSubCircuitMap[c.id];

              if (!uniqueCircuitsMap.has(cid)) {
                uniqueCircuitsMap.set(cid, {
                  circuitId: cid,
                  rooms: [c.room || ''],
                  loadTypes: [c.loadType || ''],
                  cb: rating,
                  phase: c.phase || 'L',
                  isThreePhase: isDedicated3Ph,
                  wattage: getCircuitWatts(c),
                  subCircuitSummary: subInfo?.summary || ''
                });
              } else {
                const existing = uniqueCircuitsMap.get(cid)!;
                existing.wattage += getCircuitWatts(c);
                if (c.room && !existing.rooms.includes(c.room)) {
                  existing.rooms.push(c.room);
                }
                if (c.loadType && !existing.loadTypes.includes(c.loadType)) {
                  existing.loadTypes.push(c.loadType);
                }
                if (rating > existing.cb) {
                  existing.cb = rating;
                }
                if (isDedicated3Ph) {
                  existing.isThreePhase = true;
                }
                if (subInfo?.summary && !existing.subCircuitSummary.includes(subInfo.summary)) {
                  existing.subCircuitSummary = existing.subCircuitSummary
                    ? `${existing.subCircuitSummary}, ${subInfo.summary}`
                    : subInfo.summary;
                }
              }
            });

            // Allocate physical slots (ways)
            const dbSlots: Array<{
              circuitId: string;
              room: string;
              loadType: string;
              cb: number;
              phase: string;
              isThreePhase: boolean;
              wire?: string;
              wattage?: number;
              subCircuitSummary?: string;
            }> = [];

            uniqueCircuitsMap.forEach(item => {
              const joinedRooms = item.rooms.filter(Boolean).join(' + ');
              const roomDisplay = joinedRooms || 'General';

              const joinedLoads = item.loadTypes.filter(Boolean).join('/');
              const loadTypeDisplay = joinedLoads || 'General';
              const ltLower = loadTypeDisplay.toLowerCase();
              const cidLower = item.circuitId.toLowerCase();

              const isLightning = ltLower.includes('lightning') || cidLower.includes('lightning') || cidLower.includes('spd');
              const isLighting = !isLightning && (ltLower.includes('light') || ltLower.includes('lamp') || ltLower.includes('led') || cidLower.startsWith('l') || cidLower.includes('ltg'));

              if (item.isThreePhase) {
                dbSlots.push({ circuitId: item.circuitId, room: roomDisplay, loadType: loadTypeDisplay, cb: item.cb, phase: 'R', isThreePhase: true, wire: '4.0', wattage: item.wattage, subCircuitSummary: item.subCircuitSummary });
                dbSlots.push({ circuitId: item.circuitId, room: roomDisplay, loadType: loadTypeDisplay, cb: item.cb, phase: 'Y', isThreePhase: true, wire: '4.0', wattage: item.wattage, subCircuitSummary: item.subCircuitSummary });
                dbSlots.push({ circuitId: item.circuitId, room: roomDisplay, loadType: loadTypeDisplay, cb: item.cb, phase: 'B', isThreePhase: true, wire: '4.0', wattage: item.wattage, subCircuitSummary: item.subCircuitSummary });
              } else {
                dbSlots.push({
                  circuitId: item.circuitId,
                  room: roomDisplay,
                  loadType: loadTypeDisplay,
                  cb: item.cb,
                  phase: item.phase || 'L',
                  isThreePhase: false,
                  wire: isLightning ? '10.0' : isLighting ? '1.5' : '2.5',
                  wattage: item.wattage,
                  subCircuitSummary: item.subCircuitSummary
                });
              }
            });

            const totalUsedPoles = dbSlots.length;
            const standardWays = [4, 6, 8, 12, 18, 24, 36, 48, 72];
            const recommendedWays = standardWays.find(w => w >= totalUsedPoles) || 72;
            const sparePoles = recommendedWays - totalUsedPoles;

            const lightingPoles = dbSlots.filter(s => {
              const lt = (s.loadType || '').toLowerCase();
              const cid = (s.circuitId || '').toLowerCase();
              return (lt.includes('light') || cid.startsWith('l') || cid.includes('ltg')) && !lt.includes('lightning') && !cid.includes('lightning');
            }).length;

            const lightningPoles = dbSlots.filter(s => {
              const lt = (s.loadType || '').toLowerCase();
              const cid = (s.circuitId || '').toLowerCase();
              return lt.includes('lightning') || cid.includes('lightning') || cid.includes('spd');
            }).length;

            const powerSocketsPoles = dbSlots.filter(s => {
              const lt = (s.loadType || '').toLowerCase();
              return lt.includes('socket') || lt.includes('power') || lt.includes('plug');
            }).length;

            const acHvacPoles = dbSlots.filter(s => {
              const lt = (s.loadType || '').toLowerCase();
              return lt.includes('air') || lt.includes('ac') || lt.includes('hvac') || lt.includes('cooler');
            }).length;

            const dedicatedPoles = dbSlots.filter(s => {
              const lt = (s.loadType || '').toLowerCase();
              return lt.includes('dedicated') || s.loadType === 'Dedicated';
            }).length;

            return (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mt-4"
              >
                <div className="pt-4 border-t border-[#2d3748] flex flex-col lg:flex-row gap-5">
                  
                  {/* Left: Metadata & Recommended Spec Badges */}
                  <div className="flex-1 max-w-sm flex flex-col gap-3">
                    <div className="bg-[#111622] border border-[#2d3748]/60 rounded-xl p-3 text-xs text-gray-300">
                      <span className="font-bold text-gray-400 block mb-2 text-[10px] uppercase tracking-wider">Cabinet Sizing Recommendation</span>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-400 font-bold font-mono text-sm border border-blue-500/20">
                          {recommendedWays}-Way
                        </span>
                        <div className="font-semibold text-white">DB Enclosure Case</div>
                      </div>
                      <p className="text-[11px] text-[#a0aec0] mb-3">
                        Recommended capacity based on <strong>{totalUsedPoles}</strong> active circuit poles. Fits standard single-tier DIN rail frames.
                      </p>

                      <div className="space-y-1.5 border-t border-[#2d3748]/50 pt-2.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-400">Enclosure Standard:</span>
                          <span className="text-white font-medium">IP41 Metal Clad Wall Box</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-400">Total Way Capacity:</span>
                          <span className="text-white font-medium font-mono">{recommendedWays} Poles</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-400">Used Breaker Ways:</span>
                          <span className="text-green-400 font-bold font-mono">{totalUsedPoles} Poles</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-400">Available Spare Ways:</span>
                          <span className="text-yellow-400 font-bold font-mono">{sparePoles} Poles</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-400">Spare Margin:</span>
                          <span className="text-yellow-400 font-mono font-bold">
                            {Math.round((sparePoles / recommendedWays) * 100)}% Spares
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-[#2d3748]/50 pt-2.5 mt-2.5">
                        <span className="font-bold text-gray-400 block mb-1 text-[10px] uppercase tracking-wider">Circuit Load Distribution</span>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-yellow-300 font-medium flex items-center gap-1">
                            <span>💡</span> Lighting Circuits:
                          </span>
                          <span className="text-yellow-300 font-bold font-mono bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/30">
                            {lightingPoles} Poles
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <span>🌩️</span> Lightning Arrester / SPD:
                          </span>
                          <span className="text-amber-400 font-bold font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                            {lightningPoles} Poles
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-blue-300 font-medium flex items-center gap-1">
                            <span>🔌</span> Power & Sockets:
                          </span>
                          <span className="text-blue-300 font-bold font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30">
                            {powerSocketsPoles} Poles
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-cyan-300 font-medium flex items-center gap-1">
                            <span>❄️</span> Air Conditioner (AC):
                          </span>
                          <span className="text-cyan-300 font-bold font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                            {acHvacPoles} Poles
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-purple-300 font-medium flex items-center gap-1">
                            <span>⚡</span> Dedicated Loads:
                          </span>
                          <span className="text-purple-300 font-bold font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                            {dedicatedPoles} Poles
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel Container Rendering based on panelViewMode */}
                  <div className="flex-1 space-y-4">
                    {/* 1. Physical Cabinet View */}
                    {(panelViewMode === 'cabinet' || panelViewMode === 'split') && (
                      <div className="bg-[#0b0f19] border-2 border-[#4a5568] rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                        {/* Metal Enclosure Screws in Corners */}
                        <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-gray-500/60 border border-gray-400/20" />
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-gray-500/60 border border-gray-400/20" />
                        <span className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-gray-500/60 border border-gray-400/20" />
                        <span className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-gray-500/60 border border-gray-400/20" />

                        {/* Inside Cabinet Container */}
                        <div>
                          {/* Top Compartment: Main Incomer Switch & SPD */}
                          <div className="border-b border-[#2d3748] pb-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#718096] uppercase tracking-widest font-bold block">Physical Cabinet Panel</span>
                              <span className="text-white text-xs font-extrabold tracking-wide uppercase flex items-center gap-1.5">
                                <Layers size={12} className="text-yellow-400" /> {currentBoard.name} Enclosure Setup
                              </span>
                            </div>

                            {/* Incomer + SPD modules */}
                            <div className="flex items-center gap-3">
                              {/* Main Incomer */}
                              <div className="flex items-center bg-[#171d2c] border border-red-500/30 rounded-lg p-1.5 text-left shadow-lg">
                                <div className="w-2 bg-red-600 h-8 rounded-l" />
                                <div className="px-2">
                                  <span className="block text-[8px] text-red-400 uppercase font-bold tracking-widest">Main Incomer</span>
                                  <span className="text-[11px] font-bold text-white block">
                                    {selectedMainsCB ? `${selectedMainsCB}A` : '100A'} Isolator
                                  </span>
                                </div>
                                <div className="w-5 h-7 bg-[#2d3748] rounded border border-gray-600 flex items-start justify-center p-0.5 ml-1">
                                  <div className="w-3.5 h-3 bg-red-600 rounded-sm shadow-md" />
                                </div>
                              </div>

                              {/* Surge Protection Device */}
                              <div className="flex items-center bg-[#171d2c] border border-green-500/30 rounded-lg p-1.5 text-left shadow-lg">
                                <div className="w-2 bg-green-500 h-8 rounded-l" />
                                <div className="px-2">
                                  <span className="block text-[8px] text-green-400 uppercase font-bold tracking-widest">Lightning SPD</span>
                                  <span className="text-[10px] font-extrabold text-white block">Class II Surge</span>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1" title="Surge & Lightning Protection Healthy" />
                              </div>
                            </div>
                          </div>

                          {/* Circuit Highlight Filter Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-[#121826] p-2 rounded-lg border border-[#2d3748]/80 text-[10px]">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-gray-300">
                              <span className="text-yellow-400">⚡</span> Panel Circuit Indication Mode:
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPanelHighlightMode('all')}
                                className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer ${
                                  panelHighlightMode === 'all'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-[#1a202c] text-gray-400 hover:text-white border border-gray-700'
                                }`}
                              >
                                All ({dbSlots.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPanelHighlightMode('lighting')}
                                className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                                  panelHighlightMode === 'lighting'
                                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 font-black ring-1 ring-yellow-400'
                                    : 'bg-[#1a202c] text-yellow-300 hover:bg-yellow-500/20 border border-yellow-500/30'
                                }`}
                              >
                                <span>💡</span> Lighting ({lightingPoles})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPanelHighlightMode('lightning')}
                                className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                                  panelHighlightMode === 'lightning'
                                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black ring-1 ring-amber-400'
                                    : 'bg-[#1a202c] text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                                }`}
                              >
                                <span>🌩️</span> Lightning Arrester ({lightningPoles})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPanelHighlightMode('power')}
                                className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                  panelHighlightMode === 'power'
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-[#1a202c] text-blue-300 hover:bg-blue-600/20 border border-blue-500/30'
                                }`}
                              >
                                <span>🔌</span> Power ({powerSocketsPoles})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPanelHighlightMode('ac')}
                                className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                  panelHighlightMode === 'ac'
                                    ? 'bg-cyan-600 text-white shadow'
                                    : 'bg-[#1a202c] text-cyan-300 hover:bg-cyan-600/20 border border-cyan-500/30'
                                }`}
                              >
                                <span>❄️</span> AC ({acHvacPoles})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPanelHighlightMode('dedicated')}
                                className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                  panelHighlightMode === 'dedicated'
                                    ? 'bg-purple-600 text-white shadow'
                                    : 'bg-[#1a202c] text-purple-300 hover:bg-purple-600/20 border border-purple-500/30'
                                }`}
                              >
                                <span>⚡</span> Dedicated ({dedicatedPoles})
                              </button>
                            </div>
                          </div>

                          {/* Main DIN Rail Breaker Grid */}
                          <div className="bg-[#111622]/90 border border-gray-700/60 rounded-xl p-3 relative shadow-inner">
                            <div className="absolute top-1/2 left-0 right-0 h-4 bg-gradient-to-b from-[#2d3748] to-[#1a202c] border-y border-gray-600/40 transform -translate-y-1/2 opacity-25" />
                            
                            <div className="relative z-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 xl:grid-cols-14 gap-1.5">
                              {/* Active breakers */}
                              {dbSlots.map((slot, idx) => {
                                const ltLower = (slot.loadType || '').toLowerCase();
                                const cidLower = (slot.circuitId || '').toLowerCase();

                                const isLightning = ltLower.includes('lightning') || cidLower.includes('lightning') || cidLower.includes('spd');
                                const isLighting = !isLightning && (ltLower.includes('light') || ltLower.includes('lamp') || ltLower.includes('led') || cidLower.startsWith('l') || cidLower.includes('ltg'));
                                const isPower = ltLower.includes('socket') || ltLower.includes('power') || ltLower.includes('plug');
                                const isAC = ltLower.includes('air') || ltLower.includes('ac') || ltLower.includes('hvac') || ltLower.includes('cooler');

                                let phaseColor = 'bg-[#4a5568] border-gray-600';
                                let phaseText = 'L';
                                let activeIcon = '💡';
                                let typeLabel = 'LIGHTING';

                                if (isLightning) {
                                  activeIcon = '🌩️';
                                  typeLabel = 'LIGHTNING SPD';
                                } else if (isLighting) {
                                  activeIcon = '💡';
                                  typeLabel = 'LIGHTING';
                                } else if (isPower) {
                                  activeIcon = '🔌';
                                  typeLabel = 'POWER';
                                } else if (isAC) {
                                  activeIcon = '❄️';
                                  typeLabel = 'AC';
                                } else if (slot.loadType === 'Dedicated') {
                                  activeIcon = '⚡';
                                  typeLabel = 'DEDICATED';
                                } else {
                                  typeLabel = slot.loadType.toUpperCase();
                                }

                                if (slot.phase === 'R') { phaseColor = 'bg-red-600 border-red-500'; phaseText = 'R'; }
                                else if (slot.phase === 'Y') { phaseColor = 'bg-yellow-500 border-yellow-400'; phaseText = 'Y'; }
                                else if (slot.phase === 'B') { phaseColor = 'bg-blue-600 border-blue-500'; phaseText = 'B'; }

                                const isDedicated = !isLightning && !isLighting && !isPower && !isAC && (ltLower.includes('dedicated') || slot.loadType === 'Dedicated');

                                let isDimmed = false;
                                if (panelHighlightMode === 'lighting' && !isLighting) isDimmed = true;
                                if (panelHighlightMode === 'lightning' && !isLightning) isDimmed = true;
                                if (panelHighlightMode === 'power' && !isPower) isDimmed = true;
                                if (panelHighlightMode === 'ac' && !isAC) isDimmed = true;
                                if (panelHighlightMode === 'dedicated' && !isDedicated) isDimmed = true;

                                return (
                                  <div
                                    key={`mcb-slot-${idx}`}
                                    className={`bg-[#1a202c]/95 border-t-4 border-l border-r border-b border-[#2d3748] rounded-md p-1 text-center flex flex-col justify-between shadow-md h-[96px] relative transition-all duration-200 hover:scale-105 min-w-0 ${
                                      isDimmed ? 'opacity-25 scale-95 grayscale' : 'opacity-100'
                                    } ${
                                      isLightning
                                        ? 'ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.35)] bg-[#241c10]/95'
                                        : isLighting
                                        ? 'ring-1 ring-yellow-400/60 shadow-[0_0_10px_rgba(234,179,8,0.25)] bg-[#1e201d]/95'
                                        : ''
                                    }`}
                                    style={{ borderTopColor: isLightning ? '#f59e0b' : isLighting ? '#facc15' : slot.phase === 'R' ? '#ef4444' : slot.phase === 'Y' ? '#eab308' : slot.phase === 'B' ? '#3b82f6' : '#718096' }}
                                  >
                                    <div className="flex items-center justify-between gap-0.5 border-b border-[#2d3748]/40 pb-0.5 mb-0.5">
                                      <span className="text-[9px] font-black text-white font-mono tracking-tight truncate">{slot.circuitId}</span>
                                      <span className={`w-2.5 h-2.5 flex items-center justify-center rounded-full text-[6.5px] font-extrabold text-white shrink-0 ${phaseColor}`}>
                                        {phaseText}
                                      </span>
                                    </div>

                                    {/* Indicator Tag for Lightning Protection */}
                                    {isLightning && (
                                      <div className="bg-amber-500/30 text-amber-300 border border-amber-400/60 rounded text-[5.5px] font-black uppercase tracking-wider py-0.2 px-0.5 mb-0.5 flex items-center justify-center gap-0.5 animate-pulse">
                                        <span>🌩️</span>
                                        <span>LIGHTNING CB</span>
                                      </div>
                                    )}

                                    {/* Sub-circuit summary tag for Lighting */}
                                    {isLighting && slot.subCircuitSummary && (
                                      <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded text-[6.5px] font-mono font-bold py-0.2 px-0.5 mb-0.5 truncate w-full text-center" title={`Sub-Circuits: ${slot.subCircuitSummary}`}>
                                        {slot.subCircuitSummary}
                                      </div>
                                    )}

                                    <div className="flex flex-col items-center justify-center flex-1 my-0.5 min-w-0">
                                      <span className="text-[10px] font-black text-white font-mono leading-none">{slot.cb}A</span>
                                      <span className="text-[6.5px] font-bold text-gray-400 mt-0.5 uppercase tracking-tight block truncate w-full max-w-full text-center">
                                        {slot.loadType}
                                      </span>
                                      <span className="text-[6.5px] text-gray-500 truncate w-full max-w-full text-center font-medium block">
                                        {!isLighting && !isLightning && activeIcon} {slot.room}
                                      </span>
                                      <span className="text-[6px] font-mono text-gray-400 mt-0.2">
                                        {slot.wire || '1.5'}mm²
                                      </span>
                                    </div>

                                    <div className="mt-0.5 w-full flex justify-center">
                                      <div className="w-3.5 h-3 bg-gray-800 rounded border border-gray-600 flex items-center justify-center p-0.5 shadow-inner">
                                        <div className={`w-2 h-1.5 rounded-sm shadow-md flex items-center justify-center text-[5px] font-extrabold leading-none ${isLightning ? 'bg-amber-400 text-black' : isLighting ? 'bg-yellow-400 text-black' : 'bg-green-500 text-black'}`}>
                                          |
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Spare slots */}
                              {Array.from({ length: sparePoles }).map((_, idx) => (
                                <div
                                  key={`spare-slot-${idx}`}
                                  className="bg-[#141824]/40 border border-dashed border-[#2d3748] rounded-md p-1 text-center flex flex-col justify-center items-center h-[92px] opacity-40 select-none min-w-0"
                                >
                                  <div className="text-gray-600 font-bold text-[7.5px] uppercase tracking-tight">Spare</div>
                                  <div className="text-[7px] text-gray-600 font-medium">Slot {totalUsedPoles + idx + 1}</div>
                                  <span className="text-[10px] mt-0.5 block text-gray-600">✖</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Enclosure Plate details */}
                        <div className="mt-4 pt-2.5 border-t border-[#2d3748]/50 flex items-center justify-between text-[10px] text-[#718096] font-semibold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <span className="text-yellow-400">💡</span> Lighting & Power Busbar Connected
                          </span>
                          <span>Enclosure Size: {recommendedWays}-Way DIN Rail Frame</span>
                        </div>
                      </div>
                    )}

                    {/* 2. Single-Line Schematic Diagram (SLD) View */}
                    {(panelViewMode === 'sld' || panelViewMode === 'split') && (
                      <div className="bg-[#090d16] border-2 border-cyan-500/40 rounded-2xl p-4 md:p-6 shadow-2xl space-y-4">
                        {/* SLD Header & Phase Filter */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#212b3d] pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded bg-yellow-500/10 text-yellow-400 font-bold">⚡</span>
                              <h4 className="text-sm font-extrabold text-white tracking-wide uppercase font-mono">
                                DB Circuit Single Line Diagram (SLD) — {currentBoard.name}
                              </h4>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              Standard Electrical Schematic Representation • IEC 60617 / BS 7671 Compliant
                            </p>
                          </div>

                          {/* Phase Filter Controls */}
                          <div className="flex items-center gap-1.5 bg-[#121724] p-1 rounded-lg border border-[#232d40]">
                            <span className="text-[10px] text-gray-400 font-mono font-bold px-1.5">Filter Phase:</span>
                            {(['ALL', 'R', 'Y', 'B'] as const).map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setSldPhaseFilter(p)}
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono transition-all cursor-pointer ${
                                  sldPhaseFilter === p
                                    ? p === 'R' ? 'bg-red-600 text-white'
                                    : p === 'Y' ? 'bg-yellow-500 text-black'
                                    : p === 'B' ? 'bg-blue-600 text-white'
                                    : 'bg-cyan-500 text-black'
                                    : 'bg-[#1b2235] text-gray-400 hover:text-white'
                                }`}
                              >
                                {p === 'ALL' ? '3-PH ALL' : `PH ${p}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Vector Schematic Canvas */}
                        {(() => {
                          const activeSlots = dbSlots.filter(s => {
                            if (sldPhaseFilter === 'ALL') return true;
                            return s.phase === sldPhaseFilter;
                          });

                          const spacing = 88;
                          const startX = 135;
                          const calculatedSvgWidth = Math.max(880, startX + activeSlots.length * spacing + 120);

                          return (
                            <div className="overflow-x-auto custom-scrollbar p-2 bg-[#060810] border border-[#1b2235] rounded-xl relative">
                              <svg className="h-[390px]" style={{ minWidth: `${calculatedSvgWidth}px`, width: '100%' }} viewBox={`0 0 ${calculatedSvgWidth} 390`} preserveAspectRatio="xMinYMid meet">
                                <defs>
                                  <pattern id="sld-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <circle cx="2" cy="2" r="1" fill="#1e293b" />
                                  </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#sld-grid)" />

                                {/* Utility Power Input */}
                                <g transform="translate(30, 15)">
                                  <circle cx="25" cy="25" r="16" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                                  <circle cx="25" cy="25" r="9" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
                                  <text x="25" y="28" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">UT</text>
                                  <text x="55" y="22" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="monospace">400V 3PH+N+PE</text>
                                  <text x="55" y="34" fill="#64748b" fontSize="8" fontFamily="monospace">Supply Utility Feed</text>

                                  <line x1="25" y1="41" x2="25" y2="75" stroke="#0284c7" strokeWidth="2.5" />
                                </g>

                                {/* Main Switchgear MCCB + SPD */}
                                <g transform="translate(30, 90)">
                                  <rect x="0" y="0" width="140" height="50" rx="6" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
                                  <text x="10" y="18" fill="#f87171" fontSize="9" fontWeight="bold" fontFamily="monospace">MAIN INCOMER</text>
                                  <text x="10" y="32" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">{selectedMainsCB || 100}A 3P MCCB</text>
                                  <text x="10" y="43" fill="#94a3b8" fontSize="8" fontFamily="monospace">30mA RCD | 10kA</text>
                                  
                                  <circle cx="120" cy="25" r="4" fill="#ef4444" />
                                  <line x1="110" y1="15" x2="120" y2="25" stroke="#ef4444" strokeWidth="2" />

                                  <line x1="70" y1="50" x2="70" y2="90" stroke="#38bdf8" strokeWidth="3" />

                                  <line x1="70" y1="70" x2="165" y2="70" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3,3" />
                                  <rect x="165" y="55" width="85" height="30" rx="4" fill="#052e16" stroke="#22c55e" strokeWidth="1.5" />
                                  <text x="207" y="70" textAnchor="middle" fill="#4ade80" fontSize="8" fontWeight="bold" fontFamily="monospace">SPD CLASS II</text>
                                  <text x="207" y="80" textAnchor="middle" fill="#86efac" fontSize="7" fontFamily="monospace">Surge Protection</text>
                                </g>

                                {/* Copper Busbars */}
                                {(() => {
                                  const rKw = ((isThreePhase ? (phaseLoads['R'] || 0) : totalW) / 1000).toFixed(2);
                                  const yKw = ((phaseLoads['Y'] || 0) / 1000).toFixed(2);
                                  const bKw = ((phaseLoads['B'] || 0) / 1000).toFixed(2);
                                  const busbarEndX = calculatedSvgWidth - 60;

                                  return (
                                    <g transform="translate(30, 180)">
                                      {(sldPhaseFilter === 'ALL' || sldPhaseFilter === 'R') && (
                                        <g>
                                          <line x1="70" y1="10" x2={busbarEndX} y2="10" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                                          <text x="5" y="13" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="monospace">L1 (RED)</text>
                                          <rect x={busbarEndX + 5} y="1" width="58" height="17" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                                          <text x={busbarEndX + 34} y="13" textAnchor="middle" fill="#fca5a5" fontSize="8.5" fontWeight="black" fontFamily="monospace">{rKw} kW</text>
                                        </g>
                                      )}

                                      {(sldPhaseFilter === 'ALL' || sldPhaseFilter === 'Y') && (
                                        <g>
                                          <line x1="70" y1="25" x2={busbarEndX} y2="25" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
                                          <text x="5" y="28" fill="#eab308" fontSize="9" fontWeight="bold" fontFamily="monospace">L2 (YEL)</text>
                                          <rect x={busbarEndX + 5} y="16" width="58" height="17" rx="4" fill="#422006" stroke="#eab308" strokeWidth="1" />
                                          <text x={busbarEndX + 34} y="28" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="black" fontFamily="monospace">{yKw} kW</text>
                                        </g>
                                      )}

                                      {(sldPhaseFilter === 'ALL' || sldPhaseFilter === 'B') && (
                                        <g>
                                          <line x1="70" y1="40" x2={busbarEndX} y2="40" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                                          <text x="5" y="43" fill="#3b82f6" fontSize="9" fontWeight="bold" fontFamily="monospace">L3 (BLU)</text>
                                          <rect x={busbarEndX + 5} y="31" width="58" height="17" rx="4" fill="#172554" stroke="#3b82f6" strokeWidth="1" />
                                          <text x={busbarEndX + 34} y="43" textAnchor="middle" fill="#bfdbfe" fontSize="8.5" fontWeight="black" fontFamily="monospace">{bKw} kW</text>
                                        </g>
                                      )}

                                      <line x1="70" y1="55" x2={busbarEndX} y2="55" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6,3" strokeLinecap="round" />
                                      <text x="5" y="58" fill="#06b6d4" fontSize="9" fontWeight="bold" fontFamily="monospace">N (NEUT)</text>

                                      <line x1="70" y1="70" x2={busbarEndX} y2="70" stroke="#10b981" strokeWidth="2" strokeDasharray="2,2" strokeLinecap="round" />
                                      <text x="5" y="73" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">PE (EARTH)</text>
                                    </g>
                                  );
                                })()}

                                {/* Branch Feeder Drop Lines for ALL Major Circuit IDs */}
                                {activeSlots.map((slot, idx) => {
                                  const x = startX + idx * spacing;
                                  let phaseY = 190;
                                  let phaseColor = '#ef4444';
                                  if (slot.phase === 'Y') { phaseY = 205; phaseColor = '#eab308'; }
                                  else if (slot.phase === 'B') { phaseY = 220; phaseColor = '#3b82f6'; }

                                  const ltLower = (slot.loadType || '').toLowerCase();
                                  const cidLower = (slot.circuitId || '').toLowerCase();
                                  const isLightning = ltLower.includes('lightning') || cidLower.includes('lightning') || cidLower.includes('spd');
                                  const isLighting = !isLightning && (ltLower.includes('light') || ltLower.includes('lamp') || ltLower.includes('led') || cidLower.startsWith('l') || cidLower.includes('ltg'));

                                  return (
                                    <g key={`sld-branch-${idx}`} transform={`translate(${x}, 0)`}>
                                      <circle cx="0" cy={phaseY} r="3.5" fill={phaseColor} />
                                      <line x1="0" y1={phaseY} x2="0" y2="270" stroke={phaseColor} strokeWidth="2" />

                                      {/* Major Circuit Breaker Box */}
                                      <rect x="-32" y="270" width="64" height="48" rx="5" fill="#0f172a" stroke={isLightning ? '#f59e0b' : isLighting ? '#facc15' : phaseColor} strokeWidth={isLightning || isLighting ? "2" : "1.5"} />
                                      <text x="0" y="283" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="extrabold" fontFamily="monospace">{slot.circuitId}</text>
                                      
                                      {/* Sub-circuit Label (e.g. L1,1, L1,2, L1,3) */}
                                      {slot.subCircuitSummary ? (
                                        <text x="0" y="293" textAnchor="middle" fill="#facc15" fontSize="7" fontWeight="black" fontFamily="monospace">{slot.subCircuitSummary}</text>
                                      ) : isLightning ? (
                                        <text x="0" y="293" textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="black" fontFamily="monospace">SPD</text>
                                      ) : null}

                                      <text x="0" y="304" textAnchor="middle" fill={phaseColor} fontSize="8" fontWeight="extrabold" fontFamily="monospace">{slot.cb}A MCB</text>
                                      <text x="0" y="314" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">{slot.wire || '1.5'}mm²</text>

                                      <line x1="0" y1="318" x2="0" y2="338" stroke={phaseColor} strokeWidth="1.5" />
                                      <circle cx="0" cy="338" r="2.5" fill={phaseColor} />

                                      <text x="0" y="352" textAnchor="middle" fill={isLightning ? "#f59e0b" : isLighting ? "#facc15" : "#e2e8f0"} fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
                                        {isLightning ? '🌩️ Lightning' : isLighting ? '💡 Lighting' : slot.loadType === 'Air Conditioner' ? '❄️ AC' : slot.loadType === 'Sockets' ? '🔌 Power' : slot.loadType}
                                      </text>
                                      <text x="0" y="363" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="sans-serif">
                                        {slot.room || 'General'}
                                      </text>
                                      <text x="0" y="373" textAnchor="middle" fill="#64748b" fontSize="6.5" fontFamily="monospace">
                                        {slot.wattage || 0}W
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}

                        {/* SLD Legend & Technical Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] font-mono border-t border-[#1e293b] pt-3">
                          <div className="flex items-center gap-2 text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            <span>L1 (Red)</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block ml-2" />
                            <span>L2 (Yellow)</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block ml-2" />
                            <span>L3 (Blue)</span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-300">
                            <span className="w-2.5 h-1 border-b-2 border-dashed border-cyan-400 inline-block" />
                            <span>Neutral (N)</span>
                            <span className="w-2.5 h-1 border-b-2 border-dotted border-emerald-400 inline-block ml-2" />
                            <span>Earth (PE)</span>
                          </div>

                          <div className="text-right text-cyan-400 font-bold">
                            Standard: IEC 60364 Electrical Installation Standard
                          </div>
                        </div>

                        {/* SLD Circuit ID Summary Table */}
                        <div className="border-t border-[#1e293b] pt-4 mt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 font-bold text-xs">📋</span>
                              <h5 className="text-xs font-extrabold text-cyan-300 tracking-wide uppercase font-mono">
                                Circuit ID Summary Schedule — {currentBoard.name} ({Array.from(uniqueCircuitsMap.values()).length} Circuits)
                              </h5>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className="text-gray-400">Total Connected Load:</span>
                              <span className="text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                                {(totalW / 1000).toFixed(2)} kW ({totalW.toLocaleString()} W)
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-[#232d40] bg-[#070b12] custom-scrollbar shadow-inner">
                            <table className="w-full text-left border-collapse text-[11px] font-mono">
                              <thead>
                                <tr className="bg-[#0f172a] text-gray-400 border-b border-[#1e293b] text-[10px] uppercase font-bold tracking-wider">
                                  <th className="p-2.5 text-center w-24">Circuit ID</th>
                                  <th className="p-2.5 text-center w-16">Phase</th>
                                  <th className="p-2.5">Load Type</th>
                                  <th className="p-2.5">Appliance / Purpose</th>
                                  <th className="p-2.5">Location / Room</th>
                                  <th className="p-2.5 text-center w-24">Breaker (CB)</th>
                                  <th className="p-2.5 text-center w-24">Wire Size</th>
                                  <th className="p-2.5 text-right w-36">Power (Watts)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#131b2e] text-gray-200">
                                {Array.from(uniqueCircuitsMap.values()).map((item, idx) => {
                                  const matchedCircuits = currentBoard.circuits.filter(c => (c.circuitId || '').trim() === item.circuitId);
                                  const firstCirc = matchedCircuits[0];
                                  const loadTypeStr = item.loadTypes.filter(Boolean).join('/') || 'General';
                                  const roomStr = item.rooms.filter(Boolean).join(' + ') || 'General';
                                  const appliancesStr = Array.from(new Set(matchedCircuits.map(c => c.socketVariance || c.acType || c.lightingType || c.dedicatedType).filter(Boolean))).join(', ');
                                  const wireStr = firstCirc?.wire || (loadTypeStr.includes('Lighting') ? '1.5' : loadTypeStr.includes('Sockets') ? '2.5' : '4.0');

                                  let phaseLetter = 'R';
                                  let phaseName = 'Red Phase (L1)';
                                  let phaseColor = 'text-red-400';

                                  if (item.isThreePhase) {
                                    phaseLetter = '3PH';
                                    phaseName = 'Three Phase';
                                    phaseColor = 'text-purple-300';
                                  } else if (item.phase === 'Y') {
                                    phaseLetter = 'Y';
                                    phaseName = 'Yellow Phase (L2)';
                                    phaseColor = 'text-yellow-300';
                                  } else if (item.phase === 'B') {
                                    phaseLetter = 'B';
                                    phaseName = 'Blue Phase (L3)';
                                    phaseColor = 'text-blue-300';
                                  }

                                  return (
                                    <tr key={`sld-summary-${item.circuitId}-${idx}`} className="hover:bg-[#0f172a]/70 transition-colors">
                                      <td className="p-2.5 text-center font-bold">
                                        <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs inline-block font-extrabold shadow-sm">
                                          {item.circuitId}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-center">
                                        {item.isThreePhase ? (
                                          <span className="px-2 py-0.5 rounded font-extrabold text-xs text-purple-300 bg-purple-950/80 border border-purple-500/50 shadow-sm inline-block">
                                            R+Y+B
                                          </span>
                                        ) : (
                                          <span
                                            className={`px-2.5 py-0.5 rounded font-extrabold text-xs shadow-sm inline-block ${
                                              item.phase === 'Y'
                                                ? 'text-yellow-300 bg-yellow-950/80 border border-yellow-500/50'
                                                : item.phase === 'B'
                                                ? 'text-blue-300 bg-blue-950/80 border border-blue-500/50'
                                                : 'text-red-400 bg-red-950/80 border border-red-500/50'
                                            }`}
                                          >
                                            {item.phase || 'R'}
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2.5 font-bold text-white">
                                        {loadTypeStr}
                                      </td>
                                      <td className="p-2.5 text-cyan-300 text-[10px] font-medium">
                                        {appliancesStr || item.subCircuitSummary || 'Standard Load'}
                                      </td>
                                      <td className="p-2.5 text-gray-300 font-sans text-xs">
                                        {roomStr}
                                      </td>
                                      <td className="p-2.5 text-center font-extrabold text-amber-400">
                                        {item.cb}A MCB
                                      </td>
                                      <td className="p-2.5 text-center text-gray-300 font-bold">
                                        {wireStr} mm²
                                      </td>
                                      <td className="p-2.5 text-right font-extrabold text-cyan-400">
                                        {item.wattage >= 1000 ? `${(item.wattage / 1000).toFixed(2)} kW (${Math.round(item.wattage).toLocaleString()} W)` : `${Math.round(item.wattage)} W`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Main Load Schedule Table */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4">
        <div className="sticky top-0 z-40 bg-[#1a1f2e] pt-1 pb-3 -mt-1 px-3 -mx-3 border-b border-[#2d3748]/70 shadow-md rounded-t-xl mb-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <span className="font-bold text-sm text-[#cbd5e0] shrink-0">Circuit Sizing & Cable Schedule</span>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter circuits by ID, room, type..."
                className="w-full pl-9 pr-3 py-1 bg-[#0f1117] border border-[#2d3748] rounded text-xs text-white placeholder-gray-600 outline-none focus:border-sky-500/80 transition-colors font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-[#0f1117] border border-[#2d3748] px-2.5 py-1 rounded text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Group By:</span>
              <select
                value={`${groupByOption}:${secGroupByOption}`}
                onChange={e => {
                  const [groupVal, secVal] = e.target.value.split(':');
                  setGroupByOption(groupVal as any);
                  setSecGroupByOption(secVal as any);
                }}
                className="bg-transparent text-blue-400 font-bold outline-none cursor-pointer"
              >
                <option value="circuitId:none">None (Circuit ID)</option>
                <option value="room:none">Room Name</option>
                <option value="room:loadType">Room Name ➔ Load Type</option>
                <option value="loadType:none">Load Type</option>
                <option value="loadType:room">Load Type ➔ Room Name</option>
              </select>
            </div>
          </div>
          
          {selectedCircuitIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-[#13192a]/95 border border-[#4a5568]/40 px-3 py-1.5 rounded-lg shadow-lg text-xs">
              <span className="text-[#a0aec0] font-medium mr-2">
                <strong className="text-blue-400 font-bold">{selectedCircuitIds.length}</strong> selected
              </span>

              {/* Duplicate */}
              <button
                onClick={bulkDuplicateCircuits}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-1 rounded transition cursor-pointer"
                title="Duplicate selected circuits"
              >
                👯 Duplicate
              </button>

              {/* Move to another Board */}
              <select
                onChange={(e) => {
                  const bId = e.target.value;
                  if (bId) {
                    bulkMoveCircuits(bId);
                    e.target.value = '';
                  }
                }}
                className="bg-[#2d3748] border border-[#4a5568]/60 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>📦 Move to Panel...</option>
                {boards.map(b => (
                  <option key={b.id} value={b.id} disabled={b.id === currentBoard.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Bulk Copy to Panel */}
              <select
                onChange={(e) => {
                  const bId = e.target.value;
                  if (bId) {
                    bulkCopyCircuits(bId);
                    e.target.value = '';
                  }
                }}
                className="bg-[#2d3748] border border-[#4a5568]/60 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>📋 Copy to Panel...</option>
                {boards.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Delete */}
              <button
                onClick={bulkDeleteCircuits}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold px-2.5 py-1 rounded transition cursor-pointer"
                title="Delete selected circuits"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>

        <div ref={tableContainerRef} onScroll={handleTableScroll} className="sticky top-[48px] lg:top-[50px] z-30 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar border border-[#2d3748]/60 rounded-lg relative">
          <table className="w-full min-w-[2800px] border-collapse text-xs text-left">
            <thead className="sticky top-0 bg-[#13192a] z-30 shadow">
              <tr className="border-b border-[#2d3748]">
                <th className="sticky top-0 left-0 z-40 bg-[#13192a] p-2 w-8 min-w-[32px] max-w-[32px] text-center">
                  <input
                    type="checkbox"
                    checked={currentBoard.circuits.length > 0 && selectedCircuitIds.length === currentBoard.circuits.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCircuitIds(currentBoard.circuits.map(c => c.id));
                      } else {
                        setSelectedCircuitIds([]);
                      }
                    }}
                    className="rounded text-blue-500 focus:ring-0 bg-transparent border-[#2d3748] cursor-pointer"
                  />
                </th>
                <th className="sticky top-0 left-8 z-40 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-[#718096] circuit-id-header">Circuit ID</th>
                <th className="sticky top-0 left-[112px] z-40 bg-[#13192a] p-2 w-32 min-w-[128px] max-w-[128px] text-[#718096]">Location / Room</th>
                <th className="sticky top-0 left-[240px] z-40 bg-[#13192a] p-2 w-32 min-w-[128px] max-w-[128px] text-[#718096] border-r border-[#2d3748]/50 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">Load Type</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-[#718096]">Room L(m)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-[#718096]">Room W(m)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-[#718096]">Height (m)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-center text-[#718096]">Area (m²)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-28 min-w-[112px] max-w-[112px] text-center text-[#718096]">Total lm</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-32 min-w-[128px] max-w-[128px] text-[#718096]">Type</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-44 min-w-[176px] max-w-[176px] text-[#718096]">Fixture Style</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-32 min-w-[128px] max-w-[128px] text-[#718096]">Mount Type</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-36 min-w-[144px] max-w-[144px] text-[#cbd5e0]">Switch Type</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-center text-[#cbd5e0]">Switch Qty</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-24 min-w-[96px] max-w-[96px] text-right text-[#718096]">Watts</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-center text-[#718096]">Quantity</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-24 min-w-[96px] max-w-[96px] text-right text-[#718096]">Total Watt</th>
                {isThreePhase && <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-16 min-w-[60px] max-w-[70px] text-center text-[#718096]">Phase</th>}
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-24 min-w-[96px] max-w-[96px] text-center text-[#718096]">CB Sizing</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-24 min-w-[96px] max-w-[96px] text-center text-[#718096]">Wire mm²</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-28 min-w-[112px] max-w-[112px] text-center text-[#718096]">Cable Length</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-24 min-w-[96px] max-w-[96px] text-center text-[#718096]">Cores</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-24 min-w-[96px] max-w-[96px] text-center text-[#718096]">Total Cable</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-40 min-w-[160px] max-w-[160px] text-[#718096]">Cable Core Palette</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-2 w-64 min-w-[256px] text-[#718096]">Notes</th>
                <th className="sticky top-0 right-0 z-40 bg-[#13192a] p-2 w-20 min-w-[80px] max-w-[80px] text-center border-l border-[#2d3748]/50 shadow-[-2px_0_5px_rgba(0,0,0,0.2)] text-[#718096]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2538]">
              {currentBoard.circuits.length === 0 ? (
                <tr>
                  <td colSpan={isThreePhase ? 27 : 26} className="p-8 text-center text-[#718096] italic">
                    No circuits added yet. Click "+ Add Circuit" below to populate this panel board.
                  </td>
                </tr>
              ) : (
                (() => {
                  const filteredCircuits = currentBoard.circuits.filter(c => {
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (c.circuitId && c.circuitId.toLowerCase().includes(q)) ||
                      (c.room && c.room.toLowerCase().includes(q)) ||
                      (c.loadType && c.loadType.toLowerCase().includes(q)) ||
                      (c.notes && c.notes.toLowerCase().includes(q))
                    );
                  });

                  if (filteredCircuits.length === 0) {
                    return (
                      <tr>
                        <td colSpan={isThreePhase ? 27 : 26} className="p-8 text-center text-[#718096] italic">
                          No circuits match your search query.
                        </td>
                      </tr>
                    );
                  }

                  let mappedRows: React.ReactNode[] = [];
                  let circuitIdsTracker: Record<string, number> = {};
                  let lastGroupKey: string | null = null;
                  let lastSecGroupKey: string | null = null;

                  const sortedCircuits = [...filteredCircuits].sort((a, bCircuit) => {
                    if (groupByOption === 'room') {
                      const rA = a.room || '';
                      const rB = bCircuit.room || '';
                      if (rA !== rB) return rA.localeCompare(rB);
                    } else if (groupByOption === 'loadType') {
                      const tA = a.loadType || '';
                      const tB = bCircuit.loadType || '';
                      if (tA !== tB) return tA.localeCompare(tB);
                    }

                    // Secondary sorting
                    if (secGroupByOption === 'room' && groupByOption !== 'room') {
                      const rA = a.room || '';
                      const rB = bCircuit.room || '';
                      if (rA !== rB) return rA.localeCompare(rB);
                    } else if (secGroupByOption === 'loadType' && groupByOption !== 'loadType') {
                      const tA = a.loadType || '';
                      const tB = bCircuit.loadType || '';
                      if (tA !== tB) return tA.localeCompare(tB);
                    }

                    const idA = parseInt((a.circuitId || '').replace(/\D/g, '')) || 0;
                    const idB = parseInt((bCircuit.circuitId || '').replace(/\D/g, '')) || 0;
                    return idA - idB;
                  });

                  sortedCircuits.forEach((c, idx) => {
                    const groupKey = groupByOption === 'room' ? (c.room || 'Unassigned') : (c.loadType || 'Unassigned');
                    const secGroupKey = secGroupByOption === 'room' ? (c.room || 'Unassigned') : (c.loadType || 'Unassigned');
                    
                    if (groupByOption !== 'circuitId' && groupKey !== lastGroupKey) {
                      lastGroupKey = groupKey;
                      lastSecGroupKey = null; // Reset secondary group tracking
                      const circuitsInThisGroup = sortedCircuits.filter(circ => {
                        const ck = groupByOption === 'room' ? (circ.room || 'Unassigned') : (circ.loadType || 'Unassigned');
                        return ck === groupKey;
                      });
                      const idsInThisGroup = circuitsInThisGroup.map(circ => circ.id);
                      const allSelected = idsInThisGroup.length > 0 && idsInThisGroup.every(id => selectedCircuitIds.includes(id));
                      const someSelected = idsInThisGroup.some(id => selectedCircuitIds.includes(id)) && !allSelected;

                      mappedRows.push(
                        <tr key={`group-header-${groupKey}`} className="bg-[#111625] border-y border-[#2d3748] h-10 select-none">
                          {/* Checkbox for group */}
                          <td className="sticky left-0 z-30 bg-[#111625] p-2 w-8 min-w-[32px] max-w-[32px] text-center border-r border-[#2d3748]/50">
                            <input
                              type="checkbox"
                              ref={el => {
                                if (el) {
                                  el.indeterminate = someSelected;
                                }
                              }}
                              checked={allSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCircuitIds(prev => Array.from(new Set([...prev, ...idsInThisGroup])));
                                } else {
                                  setSelectedCircuitIds(prev => prev.filter(id => !idsInThisGroup.includes(id)));
                                }
                              }}
                              className="rounded text-blue-500 focus:ring-0 bg-transparent border-[#2d3748] cursor-pointer"
                              title={`Select all circuits in ${groupByOption === 'room' ? 'room' : 'load type'}: ${groupKey}`}
                            />
                          </td>
                          
                          {/* Label and delete action */}
                          <td colSpan={isThreePhase ? 25 : 24} className="p-2 align-middle">
                            <div className="sticky left-8 z-30 inline-flex items-center gap-3 bg-[#111625] px-2 py-0.5 rounded">
                              <span className="text-gray-400 font-semibold tracking-wider text-[10px] uppercase">
                                {groupByOption === 'room' ? '🏠 Room' : '🔌 Load Type'}:
                              </span>
                              <span className="text-white font-extrabold text-xs px-2 py-0.5 rounded bg-[#1d2436] border border-[#2d3748]/60 shadow-sm">
                                {groupKey}
                              </span>
                              <span className="text-gray-500 font-mono text-[10px]">
                                ({circuitsInThisGroup.length} {circuitsInThisGroup.length === 1 ? 'circuit' : 'circuits'})
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Render secondary group header if enabled
                    if (secGroupByOption !== 'none' && secGroupKey !== lastSecGroupKey && (groupByOption === 'circuitId' || secGroupKey !== groupKey)) {
                      lastSecGroupKey = secGroupKey;
                      const circuitsInThisSecGroup = sortedCircuits.filter(circ => {
                        const ck = groupByOption === 'room' ? (circ.room || 'Unassigned') : (circ.loadType || 'Unassigned');
                        const s_ck = secGroupByOption === 'room' ? (circ.room || 'Unassigned') : (circ.loadType || 'Unassigned');
                        if (groupByOption !== 'circuitId') {
                          return ck === groupKey && s_ck === secGroupKey;
                        }
                        return s_ck === secGroupKey;
                      });

                      if (circuitsInThisSecGroup.length > 0) {
                        const idsInThisSecGroup = circuitsInThisSecGroup.map(circ => circ.id);
                        const allSelected = idsInThisSecGroup.length > 0 && idsInThisSecGroup.every(id => selectedCircuitIds.includes(id));
                        const someSelected = idsInThisSecGroup.some(id => selectedCircuitIds.includes(id)) && !allSelected;

                        mappedRows.push(
                          <tr key={`sec-group-header-${groupKey || 'root'}-${secGroupKey}`} className="bg-[#141a29] border-y border-[#2d3748]/40 h-8 select-none">
                            <td className="sticky left-0 z-30 bg-[#141a29] p-1.5 w-8 min-w-[32px] max-w-[32px] text-center border-r border-[#2d3748]/40">
                              <input
                                type="checkbox"
                                ref={el => {
                                  if (el) el.indeterminate = someSelected;
                                }}
                                checked={allSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCircuitIds(prev => Array.from(new Set([...prev, ...idsInThisSecGroup])));
                                  } else {
                                    setSelectedCircuitIds(prev => prev.filter(id => !idsInThisSecGroup.includes(id)));
                                  }
                                }}
                                className="rounded text-blue-500 focus:ring-0 bg-transparent border-[#2d3748] cursor-pointer"
                              />
                            </td>
                            <td colSpan={isThreePhase ? 25 : 24} className="p-1.5 align-middle pl-6">
                              <div className="sticky left-8 z-30 inline-flex items-center gap-2 bg-[#141a29] px-2 py-0.5 rounded">
                                <span className="text-gray-400 font-semibold tracking-wider text-[9px] uppercase">
                                  ↳ {secGroupByOption === 'room' ? '🏠 Sub-Room' : '🔌 Sub-Load Type'}:
                                </span>
                                <span className="text-gray-300 font-bold text-xs px-2 py-0.5 rounded bg-[#1e2538] border border-[#2d3748]/50 shadow-sm">
                                  {secGroupKey}
                                </span>
                                <span className="text-gray-500 font-mono text-[9px]">
                                  ({circuitsInThisSecGroup.length} {circuitsInThisSecGroup.length === 1 ? 'circuit' : 'circuits'})
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    }

                    const isSocketsOrDedicated = c.loadType === 'Sockets' || c.loadType === 'Dedicated';
                    const isLighting = c.loadType === 'Lighting';
                    const isThreePhaseDedicated =
                      (c.loadType === 'Dedicated' && c.dedicatedType === 'Three Phase') ||
                      (c.loadType === 'Air Conditioner' && (c.phase === 'Three Phase' || c.phase === '3-Phase')) ||
                      c.phase === 'Three Phase' ||
                      c.phase === '3-Phase';

                    const isDuplicatedId = circuitIdsTracker[c.circuitId] !== undefined;
                    if (!isDuplicatedId) {
                      circuitIdsTracker[c.circuitId] = idx;
                    }

                    const isRoomDuplicate = !!c.room && currentBoard.circuits.slice(0, idx).some(circ => circ.room && circ.room.trim().toLowerCase() === c.room.trim().toLowerCase());

                    const targetLux = isLighting ? getTargetLuxForRoom(c.room || '', settings) : 0;
                    const rProps = (c.room && roomProps[c.room]) ? roomProps[c.room] : {
                      l: c.roomL || 0,
                      w: c.roomW || 0,
                      h: c.ceilingH || 2.7
                    };
                    const l = rProps.l;
                    const w = rProps.w;
                    const h = rProps.h;
                    const area = Math.round(l * w * 10) / 10;

                    const defaultLpw = settings.defaultLPW || 200;
                    const currentLumenVal = c.lumensPerUnit || ((c.watts || 0) * defaultLpw);
                    const currentLpwVal = (c.watts || 0) > 0 ? currentLumenVal / c.watts : defaultLpw;

                    let totWattCalculated = 0;
                    if (isLighting && area > 0 && (l + w) > 0) {
                      const hWorkingForLumen = Math.max(h - 0.85, 0.5);
                      const roomIndexForLumen = area / (hWorkingForLumen * (l + w));
                      const cuForLumen = getCUFromRoomIndex(roomIndexForLumen);
                      const totalLumensVal = cuForLumen > 0 ? (targetLux * area) / (cuForLumen * settings.lightMF) : 0;
                      const totalRoomWVal = roomTotalWatts[c.room || ''] || c.watts || 0;
                      const scalingVal = totalRoomWVal > 0 ? ((c.watts || 0) / totalRoomWVal) : 0;
                      const proportionalLumensVal = totalLumensVal * scalingVal;
                      totWattCalculated = proportionalLumensVal / 180;
                    }

                    const rawBulbQty = isLighting && (c.watts || 0) > 0 ? totWattCalculated / c.watts : 1;
                    const calculatedBulbQty = isLighting
                      ? (settings.lightingRoundingMode === 'ceil'
                          ? Math.max(1, Math.ceil(rawBulbQty))
                          : settings.lightingRoundingMode === 'floor'
                          ? Math.max(1, Math.floor(rawBulbQty))
                          : settings.lightingRoundingMode === 'round'
                          ? Math.max(1, Math.round(rawBulbQty))
                          : Math.max(0.01, Math.round(rawBulbQty * 100) / 100))
                      : null;

                    const socketAreaFactor = (settings.customRoomSockets && settings.customRoomSockets[c.room || '']) || settings.socketAreaFactor || 4;
                    const calculatedSocketQty = area > 0 ? Math.max(1, Math.ceil(area / socketAreaFactor)) : 1;

                    const activeQty = isLighting
                      ? (calculatedBulbQty || 1)
                      : (c.loadType === 'Sockets' ? (c.qty || calculatedSocketQty) : (c.qty || 1));
                    const totalWatts = isLighting ? getCircuitWatts(c) : (c.watts || 0) * activeQty;
                    const displayTotalWattsVal = totalWatts;

                    let calculatedCircuitCB = calculateCB(
                      isLighting ? totalWatts : c.watts,
                      isLighting ? 1 : activeQty,
                      isThreePhaseDedicated ? systemVoltage : settings.voltage,
                      settings.powerFactor,
                      isThreePhase,
                      c.loadType
                    );
                    if (c.loadType === 'Air Conditioner' && c.cb) {
                      calculatedCircuitCB = c.cb;
                    }

                    const coresCount = ll_cores[c.cableCores] || 1;
                    const cableLength = c.cableLength || 0;
                    const totalCableRun = Math.ceil(cableLength * coresCount * 10) / 10;

                    // Row state highlights
                    const isActiveDragTarget = draggedIndex === idx;

                    const cellBgClass = isActiveDragTarget
                      ? 'bg-[#1e3a5f]'
                      : isLighting
                      ? (idx % 2 === 0 ? 'bg-[#1c1810]' : 'bg-[#242016]')
                      : (idx % 2 === 0 ? 'bg-[#161b27]' : 'bg-[#1a1f2e]');

                    mappedRows.push(
                      <tr
                        key={c.id}
                        style={{
                          position: activeRoomInputId === c.id ? 'relative' : undefined,
                          zIndex: activeRoomInputId === c.id ? 50 : undefined
                        }}
                        className={`transition-colors duration-150 ${cellBgClass}`}
                      >
                        {/* 0. Group Selection Checkbox */}
                        <td className={`sticky left-0 z-20 ${cellBgClass} p-2 w-8 min-w-[32px] max-w-[32px] text-center`}>
                          <input
                            type="checkbox"
                            checked={selectedCircuitIds.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCircuitIds(prev => [...prev, c.id]);
                              } else {
                                setSelectedCircuitIds(prev => prev.filter(id => id !== c.id));
                              }
                            }}
                            className="rounded text-blue-500 focus:ring-0 bg-transparent border-[#2d3748] cursor-pointer"
                          />
                        </td>

                        {/* 1. Circuit ID */}
                        <td className={`sticky left-8 z-20 ${cellBgClass} p-2 w-20 min-w-[80px] max-w-[80px] font-mono font-bold`}>
                          <div className="flex items-center gap-1">
                            {isDuplicatedId && <span className="text-[#4a5568] text-[10px]">↳</span>}
                            {isThreePhaseDedicated && (
                              <span className="text-[9px] text-[#b794f4] font-bold mr-1 circuit-id-threephase-indicator">3Φ</span>
                            )}
                            <input
                              value={c.circuitId}
                              onChange={e => updateCircuitField(c.id, 'circuitId', e.target.value)}
                              className={`bg-transparent outline-none w-14 font-mono font-bold border-b border-transparent focus:border-blue-500 circuit-id-input ${
                                isThreePhaseDedicated
                                  ? 'circuit-id-input-threephase text-purple-300'
                                  : isDuplicatedId
                                  ? 'circuit-id-input-dup text-blue-400'
                                  : 'circuit-id-input-normal text-yellow-400'
                              }`}
                            />
                          </div>
                        </td>

                        {/* 2. Room Name */}
                        <td className={`sticky left-[112px] ${cellBgClass} p-2 w-32 min-w-[128px] max-w-[128px] z-20`}>
                          {groupByOption === 'room' ? (
                            <div className="text-center text-gray-500 font-mono text-[10px]">—</div>
                          ) : (
                            <RoomSelector
                              value={c.room}
                              disabled={c.loadType === 'Air Conditioner'}
                              onChange={val => updateCircuitField(c.id, 'room', val)}
                              settings={settings}
                              placeholder="Room name..."
                            />
                          )}
                        </td>

                        {/* 3. Load Type */}
                        <td className={`sticky left-[240px] z-20 ${cellBgClass} p-2 w-36 min-w-[144px] max-w-[144px] border-r border-[#2d3748]/50 shadow-[2px_0_5px_rgba(0,0,0,0.2)]`}>
                          <div className="flex flex-col gap-1">
                            <select
                              value={c.loadType || ''}
                              disabled={c.loadType === 'Air Conditioner'}
                              title={c.loadType === 'Air Conditioner' ? "To change this, please edit or delete the AC unit in the HVAC Sizing tab." : ""}
                              onChange={e => {
                                const val = e.target.value as any;
                                updateCircuitField(c.id, 'loadType', val);
                                if (val === 'Sockets') {
                                  updateCircuitFields(c.id, {
                                    switchType: '',
                                    switchQty: 0,
                                    cableCores: '3 Cores',
                                    wire: '2.5'
                                  });
                                } else if (val === 'Lighting') {
                                  updateCircuitFields(c.id, {
                                    cableCores: '2 Cores',
                                    wire: '1.5'
                                  });
                                } else if (val === 'Air Conditioner') {
                                  updateCircuitFields(c.id, {
                                    cableCores: '3 Cores',
                                    wire: '4'
                                  });
                                } else if (val === 'Dedicated') {
                                  updateCircuitFields(c.id, {
                                    cableCores: '3 Cores',
                                    wire: '2.5'
                                  });
                                }
                              }}
                              className={`w-full max-w-full outline-none bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] focus:border-blue-500 ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              <option value="">Select...</option>
                              {(currentBoard.boardType === 'Industrial DB'
                                ? [...LOAD_TYPES, 'Motor', 'Welding', 'Compressor', 'Pump', 'Industrial Socket', 'Lighting Panel', 'UPS']
                                : LOAD_TYPES
                              ).map(t => (
                                <option key={t} value={t} disabled={t === 'Air Conditioner' && c.loadType !== 'Air Conditioner'}>
                                  {t} {t === 'Air Conditioner' && c.loadType !== 'Air Conditioner' ? '(Add via HVAC tab)' : ''}
                                </option>
                              ))}
                            </select>
                            {c.loadType === 'Sockets' && (
                              <select
                                value={c.socketVariance || '13A Socket (General Purpose)'}
                                onChange={e => {
                                  const val = e.target.value;
                                  const autoW = getSocketApplianceWatts(val);
                                  if (autoW !== null) {
                                    updateCircuitFields(c.id, {
                                      socketVariance: val,
                                      watts: autoW
                                    });
                                  } else {
                                    updateCircuitField(c.id, 'socketVariance', val);
                                  }
                                }}
                                className="w-full max-w-full outline-none bg-[#0f1117] border border-cyan-500/40 rounded px-1 py-0.5 text-[10px] text-cyan-300 font-semibold cursor-pointer truncate"
                                title="Select Home Appliance / Socket Purpose (Auto-fills connected load watts)"
                              >
                                {dynamic_SOCKET_VARIANCES.map(v => (
                                  <option key={v} value={v} className="bg-[#0f172a] text-cyan-300">
                                    {v}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>

                        {/* 5. Room L */}
                        <td className="p-2 w-20 min-w-[80px] max-w-[80px] text-center">
                          <input
                            type="number"
                            value={rProps.l || ''}
                            onChange={e => updateCircuitField(c.id, 'roomL', Math.round(+e.target.value * 10) / 10)}
                            placeholder="L"
                            disabled={isRoomDuplicate || c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC tab" : isRoomDuplicate ? "Room dimensions are inherited from the first circuit of this room and are read-only" : "Room length in meters"}
                            className={`bg-transparent outline-none w-14 text-center border-b border-transparent focus:border-blue-500 font-semibold ${(isRoomDuplicate || c.loadType === 'Air Conditioner') ? 'text-gray-500 cursor-not-allowed opacity-50' : 'text-green-400'}`}
                          />
                        </td>

                        {/* 6. Room W */}
                        <td className="p-2 w-20 min-w-[80px] max-w-[80px] text-center">
                          <input
                            type="number"
                            value={rProps.w || ''}
                            onChange={e => updateCircuitField(c.id, 'roomW', Math.round(+e.target.value * 10) / 10)}
                            placeholder="W"
                            disabled={isRoomDuplicate || c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC tab" : isRoomDuplicate ? "Room dimensions are inherited from the first circuit of this room and are read-only" : "Room width in meters"}
                            className={`bg-transparent outline-none w-14 text-center border-b border-transparent focus:border-blue-500 font-semibold ${(isRoomDuplicate || c.loadType === 'Air Conditioner') ? 'text-gray-500 cursor-not-allowed opacity-50' : 'text-green-400'}`}
                          />
                        </td>

                        {/* 7. Height */}
                        <td className="p-2 w-20 min-w-[80px] max-w-[80px] text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={rProps.h || ''}
                            onChange={e => updateCircuitField(c.id, 'ceilingH', Math.round(+e.target.value * 10) / 10)}
                            placeholder="H"
                            disabled={isRoomDuplicate || c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC tab" : isRoomDuplicate ? "Room dimensions are inherited from the first circuit of this room and are read-only" : "Room ceiling height in meters"}
                            className={`bg-transparent outline-none w-14 text-center border-b border-transparent focus:border-blue-500 font-semibold ${(isRoomDuplicate || c.loadType === 'Air Conditioner') ? 'text-gray-500 cursor-not-allowed opacity-50' : 'text-green-400'}`}
                          />
                        </td>

                        {/* 8. Area */}
                        <td className="p-2 w-20 min-w-[80px] max-w-[80px] text-center font-bold text-blue-400">
                          {area > 0 ? area : <span className="text-[#4a5568]">—</span>}
                        </td>

                        {/* 9. Total lm */}
                        <td className="p-2 w-28 min-w-[112px] max-w-[112px] text-center text-yellow-300 font-mono font-bold">
                          {isLighting && area > 0 && (l + w) > 0 ? (
                            (() => {
                              const hWorking = Math.max(h - 0.85, 0.5);
                              const roomIndex = area / (hWorking * (l + w));
                              const cu = getCUFromRoomIndex(roomIndex);
                              const totalLumens = cu > 0 ? (targetLux * area) / (cu * settings.lightMF) : 0;
                              const totalRoomW = roomTotalWatts[c.room || ''] || c.watts || 0;
                              const scaling = totalRoomW > 0 ? ((c.watts || 0) / totalRoomW) : 0;
                              const proportionalLumens = totalLumens * scaling;
                              const percent = Math.round(scaling * 100);
                              return (
                                <div className="flex flex-col items-center leading-tight">
                                  <span>{Math.round(proportionalLumens).toLocaleString()}</span>
                                  <span className="text-[10px] text-[#718096] font-normal block mt-0.5">
                                    {percent}% of {Math.round(totalLumens).toLocaleString()}
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-[#4a5568]">—</span>
                          )}
                        </td>

                        {/* 10. Type Detail (Sub-Dropdown) */}
                        <td className="p-2 w-32 min-w-[128px] max-w-[128px]">
                          {isLighting && (
                            <select
                              value={c.lightingType || 'Ambient'}
                              onChange={e => updateCircuitField(c.id, 'lightingType', e.target.value)}
                              className="w-full max-w-full outline-none bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0]"
                            >
                              {dynamic_LIGHTING_TYPES.map(t => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.loadType === 'Sockets' && (
                            <div className="flex flex-col gap-1">
                              <select
                                value={c.socketType || 'Double'}
                                onChange={e => updateCircuitField(c.id, 'socketType', e.target.value)}
                                className="w-full max-w-full outline-none bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-sky-300 font-semibold"
                                title="Socket Type (e.g. Double, Single)"
                              >
                                {dynamic_SOCKET_TYPES.map(t => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={c.socketRating || '13A'}
                                onChange={e => updateCircuitField(c.id, 'socketRating', e.target.value)}
                                className="w-full max-w-full outline-none bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-[10px] text-cyan-300 font-medium cursor-pointer"
                                title="Sub Variance / Socket Rating (13A, 15A, 20-45A)"
                              >
                                {dynamic_SOCKET_RATINGS.map(r => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {c.loadType === 'Air Conditioner' && (
                            <div className="flex flex-col gap-1">
                              <select
                                value={c.acType || 'Split'}
                                onChange={e => updateCircuitField(c.id, 'acType', e.target.value)}
                                className="w-full max-w-full outline-none bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-blue-300"
                              >
                                {dynamic_AC_TYPES.map(t => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                              {c.acHp !== undefined && (
                                <span className="text-[10px] text-orange-400 font-bold block bg-orange-400/10 px-1 py-0.5 rounded text-center w-full max-w-[80px]">
                                  {c.acHp} HP
                                </span>
                              )}
                            </div>
                          )}
                          {c.loadType === 'Dedicated' && (
                            <select
                              value={c.dedicatedType || 'Single Phase'}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === 'Single Phase') {
                                  updateCircuitFields(c.id, {
                                    dedicatedType: val,
                                    cableCores: '3 Cores',
                                    fixtureVariance: 'None'
                                  });
                                } else if (val === 'Three Phase') {
                                  updateCircuitFields(c.id, {
                                    dedicatedType: val,
                                    cableCores: '4 Cores',
                                    fixtureVariance: '13A 3ph Industrial'
                                  });
                                }
                              }}
                              className="w-full max-w-full outline-none bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-purple-300"
                            >
                              {dynamic_DEDICATED_TYPES.filter(t => isThreePhase || t !== 'Three Phase').map(t => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* 11. Fixture Style */}
                        <td className="p-2 w-44 min-w-[176px] max-w-[176px]">
                          {isLighting && (
                            <div className="flex flex-col gap-1.5">
                              <select
                                value={c.fixtureStyle || 'Spot'}
                                onChange={e => {
                                  const nextStyle = e.target.value;
                                  updateCircuitFields(c.id, { fixtureStyle: nextStyle, fixtureVariance: 'None' });
                                }}
                                className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] font-semibold"
                              >
                                {dynamic_FIXTURE_STYLES.map(s => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>

                              {/* Variance selection dropdown */}
                              {(() => {
                                const currentStyle = c.fixtureStyle || 'Spot';
                                let list: string[] = [];
                                if (currentStyle === 'Droplet') list = DROPLET_VARIANCES;
                                else if (currentStyle === 'Spot') list = SPOT_VARIANCES;
                                else if (currentStyle === 'Modular') list = MODULAR_VARIANCES;
                                else if (currentStyle === 'Strip Light') list = STRIP_VARIANCES;
                                else if (currentStyle === 'Wall Light') list = WALL_LIGHT_VARIANCES;
                                else if (currentStyle === 'Star Light') list = STAR_LIGHT_VARIANCES;
                                else if (currentStyle === 'Chandelier') list = CHANDELIER_VARIANCES;

                                if (list.length === 0) return null;

                                return (
                                  <select
                                    value={c.fixtureVariance || 'None'}
                                    onChange={e => updateCircuitField(c.id, 'fixtureVariance', e.target.value)}
                                    className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-[10px] text-green-300 font-medium outline-none cursor-pointer"
                                  >
                                    {list.map(v => (
                                      <option key={v} value={v}>
                                        {v}
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </div>
                          )}
                          {c.loadType === 'Sockets' && (
                            <select
                              value={c.socketFixtureStyle || 'Indoor'}
                              onChange={e => updateCircuitField(c.id, 'socketFixtureStyle', e.target.value)}
                              className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] font-semibold"
                            >
                              {dynamic_SOCKET_FIX_STYLES.map(s => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.loadType === 'Air Conditioner' && (
                            <select
                              value={c.acFixtureStyle || 'Inverter'}
                              disabled={true}
                              title="Synced from HVAC Sizing tab"
                              onChange={e => updateCircuitField(c.id, 'acFixtureStyle', e.target.value)}
                              className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-blue-300 cursor-not-allowed opacity-50"
                            >
                              {dynamic_AC_FIX_STYLES.map(s => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.loadType === 'Dedicated' && (
                            <div className="flex flex-col gap-1.5">
                              <select
                                value={c.dedicatedFixtureStyle || 'Indoor'}
                                onChange={e => updateCircuitField(c.id, 'dedicatedFixtureStyle', e.target.value)}
                                className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-purple-300 font-semibold font-sans outline-none"
                              >
                                {dynamic_DEDICATED_FIX_STYLES.map(s => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {c.dedicatedType === 'Three Phase' && (
                                <select
                                  value={c.fixtureVariance || '13A 3ph Industrial'}
                                  onChange={e => updateCircuitField(c.id, 'fixtureVariance', e.target.value)}
                                  className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-[10px] text-green-300 font-medium outline-none cursor-pointer"
                                >
                                  {dynamic_DEDICATED_3PH_VARIANCES.map(v => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 12. Mount Type */}
                        <td className="p-2">
                          {isLighting && (
                            <select
                              value={c.mountType || 'Recessed'}
                              onChange={e => updateCircuitField(c.id, 'mountType', e.target.value)}
                              className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0]"
                            >
                              {dynamic_MOUNT_TYPES.map(m => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.loadType === 'Sockets' && (
                            <select
                              value={c.socketMountType || 'Wall'}
                              onChange={e => updateCircuitField(c.id, 'socketMountType', e.target.value)}
                              className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0]"
                            >
                              {dynamic_SOCKET_MOUNTS.map(m => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.loadType === 'Air Conditioner' && (
                            <select
                              value={c.acMountType || 'Ceiling'}
                              disabled={true}
                              title="Synced from HVAC Sizing tab"
                              onChange={e => updateCircuitField(c.id, 'acMountType', e.target.value)}
                              className="bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-blue-300 cursor-not-allowed opacity-50"
                            >
                              {dynamic_AC_MOUNTS.map(m => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          )}
                          {c.loadType === 'Dedicated' && <span className="text-[#4a5568]">—</span>}
                        </td>

                        {/* 24. Switch Type */}
                        <td className="p-2">
                          {c.loadType === 'Sockets' ? (
                            <span className="text-[#4a5568]">—</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <select
                                value={c.switchType || '1 Gang'}
                                disabled={c.loadType === 'Air Conditioner'}
                                title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : ""}
                                onChange={e => updateCircuitField(c.id, 'switchType', e.target.value)}
                                className={`bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-purple-300 font-semibold ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                {dynamic_SWITCH_TYPES.map(sw => (
                                  <option key={sw} value={sw}>
                                    {sw}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        {/* 25. Switch Qty */}
                        <td className="p-2 text-center">
                          {c.loadType === 'Sockets' ? (
                            <span className="text-[#4a5568]">—</span>
                          ) : (
                            <input
                              type="number"
                              value={c.switchQty || 0}
                              disabled={c.loadType === 'Air Conditioner'}
                              title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : ""}
                              onChange={e =>
                                updateCircuitField(c.id, 'switchQty', Math.max(0, Math.ceil(+e.target.value)))
                              }
                              className={`bg-transparent outline-none text-center w-10 border-b border-transparent focus:border-blue-500 text-purple-300 font-semibold ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                            />
                          )}
                        </td>

                        {/* 14. Watts */}
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={c.watts || ''}
                            disabled={c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : ""}
                            onChange={e => updateCircuitField(c.id, 'watts', +e.target.value)}
                            className={`bg-transparent outline-none text-right w-14 font-semibold border-b border-transparent focus:border-blue-500 text-orange-400 ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                          />
                        </td>

                        {/* 16. Qty of Bulbs calculation */}
                        <td className="p-2 text-center">
                          <div className="flex flex-col items-center justify-center">
                            {isLighting ? (
                              <span className="text-white font-semibold font-mono text-xs">
                                {calculatedBulbQty}
                              </span>
                            ) : (
                              <input
                                type="number"
                                value={c.qty === 0 ? '' : c.qty || ''}
                                disabled={c.loadType === 'Air Conditioner'}
                                title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : ""}
                                onChange={e => {
                                  const val = e.target.value === '' ? 0 : Math.ceil(+e.target.value);
                                  updateCircuitField(c.id, 'qty', val);
                                }}
                                placeholder={c.loadType === 'Sockets' ? String(calculatedSocketQty) : "1"}
                                className={`bg-transparent outline-none text-center w-12 border-b border-transparent focus:border-blue-500 text-white font-semibold ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                              />
                            )}
                            {(isLighting || (c.loadType === 'Sockets' && !c.qty)) && (
                              <span className="text-[9px] text-[#4a5568] mt-0.5">auto</span>
                            )}
                          </div>
                        </td>

                        {/* Total Watt column */}
                        <td className="p-2 text-right text-cyan-400 font-mono font-bold text-xs">
                          {displayTotalWattsVal >= 10 ? Math.round(displayTotalWattsVal) : displayTotalWattsVal.toFixed(1)}W
                        </td>

                        {/* 17. Phase (for 3-Phase board only) */}
                        {isThreePhase && (
                          <td className="p-1.5 text-center w-16 min-w-[60px] max-w-[70px]">
                            {isThreePhaseDedicated ? (
                              <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-extrabold px-1 py-0.5 rounded bg-[#1e1a2e] border border-purple-500/50 shadow-sm w-full">
                                <span style={{ color: PHASE_COLORS.R }}>R</span>
                                <span className="text-gray-400">+</span>
                                <span style={{ color: PHASE_COLORS.Y }}>Y</span>
                                <span className="text-gray-400">+</span>
                                <span style={{ color: PHASE_COLORS.B }}>B</span>
                              </span>
                            ) : (() => {
                              const currentSelectedPhase = Pi.includes(c.phase) ? c.phase : (() => {
                                const is3PhLocal = (oc: any) =>
                                  (oc.loadType === 'Dedicated' && oc.dedicatedType === 'Three Phase') ||
                                  (oc.loadType === 'Air Conditioner' && (oc.phase === 'Three Phase' || oc.phase === '3-Phase')) ||
                                  oc.phase === 'Three Phase' ||
                                  oc.phase === '3-Phase';
                                const nonExplicitSinglePhases = currentBoard.circuits.filter(
                                  oc => !is3PhLocal(oc) && !Pi.includes(oc.phase || '')
                                );
                                const idx = nonExplicitSinglePhases.findIndex(oc => oc.id === c.id);
                                return Pi[idx !== -1 ? idx % 3 : 0];
                              })();

                              const pColor = PHASE_COLORS[currentSelectedPhase] || '#ff0017';

                              return (
                                <select
                                  value={currentSelectedPhase}
                                  onChange={e => updateCircuitField(c.id, 'phase', e.target.value)}
                                  className="w-full bg-[#0f1117] font-black border rounded px-1 py-0.5 text-xs outline-none cursor-pointer text-center focus:border-blue-500 shadow-sm"
                                  style={{
                                    color: pColor,
                                    backgroundColor: `${pColor}20`,
                                    borderColor: `${pColor}60`
                                  }}
                                >
                                  {Pi.map(phaseOption => {
                                    const optColor = PHASE_COLORS[phaseOption] || '#ffffff';
                                    return (
                                      <option
                                        key={phaseOption}
                                        value={phaseOption}
                                        style={{
                                          color: optColor,
                                          backgroundColor: '#0f172a',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {phaseOption}
                                      </option>
                                    );
                                  })}
                                </select>
                              );
                            })()}
                          </td>
                        )}

                        {/* 18. CB Sizing */}
                        <td className="p-2 text-center font-bold">
                          <span
                            className={
                              calculatedCircuitCB === 6
                                ? 'text-white'
                                : calculatedCircuitCB >= 63
                                ? 'text-red-400'
                                : calculatedCircuitCB >= 32
                                ? 'text-orange-400'
                                : 'text-green-400'
                            }
                          >
                            {calculatedCircuitCB}A
                          </span>
                        </td>

                        {/* 19. Wire Size */}
                        <td className="p-2 text-center">
                          <select
                            value={c.wire || ''}
                            disabled={c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : ""}
                            onChange={e => updateCircuitField(c.id, 'wire', e.target.value)}
                            className={`bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <option value="">—</option>
                            {WIRE_SIZES.map(w => (
                              <option key={w} value={w}>
                                {w} mm²
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 20. Cable Length */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={c.cableLength || ''}
                            disabled={c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : ""}
                            onChange={e => updateCircuitField(c.id, 'cableLength', +e.target.value)}
                            placeholder="m"
                            className={`bg-transparent outline-none w-12 text-center border-b border-transparent focus:border-blue-500 text-white ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                          />
                        </td>

                        {/* 21. Cores */}
                        <td className="p-2 text-center">
                          <select
                            value={c.cableCores || ''}
                            disabled={c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : ""}
                            onChange={e => updateCircuitField(c.id, 'cableCores', e.target.value)}
                            className={`bg-transparent border border-[#2d3748] rounded px-1.5 py-0.5 text-[#cbd5e0] ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <option value="">—</option>
                            {CABLE_CORES.map(coresOption => (
                              <option key={coresOption} value={coresOption}>
                                {coresOption}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 22. Total Conductor Cable */}
                        <td className="p-2 text-center font-bold text-blue-400">
                          {totalCableRun > 0 ? `${totalCableRun} m` : '—'}
                        </td>

                        {/* 23. Cable Core Palette */}
                        <td className="p-2">
                          {cableLength > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                {getCableColors(c.cableCores).map(coreCol => (
                                  <div
                                    key={coreCol}
                                    className="w-3.5 h-3.5 rounded border border-[#718096]/30 flex-shrink-0"
                                    style={{
                                      background: CABLE_PALETTE[coreCol]?.hex,
                                    }}
                                    title={coreCol}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-[#718096] uppercase font-bold truncate">
                                {getCableColors(c.cableCores).join('/')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#4a5568]">—</span>
                          )}
                        </td>

                        {/* 27. Notes */}
                        <td className="p-2">
                          <input
                            value={c.notes}
                            disabled={c.loadType === 'Air Conditioner'}
                            title={c.loadType === 'Air Conditioner' ? "Synced from HVAC Sizing tab" : "Add note..."}
                            onChange={e => updateCircuitField(c.id, 'notes', e.target.value)}
                            className={`bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-white w-20 ${c.loadType === 'Air Conditioner' ? 'cursor-not-allowed opacity-50' : ''}`}
                            placeholder="Add note..."
                          />
                        </td>

                        {/* 28. Actions */}
                        <td className={`sticky right-0 z-30 ${cellBgClass} p-2 w-28 text-center border-l border-[#2d3748]/50 shadow-[-2px_0_5px_rgba(0,0,0,0.2)]`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                editCircuit(c);
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded transition-colors cursor-pointer"
                              title="Edit Circuit Parameters"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => duplicateCircuit(c.id)}
                              className="text-cyan-400 hover:text-cyan-300 transition-colors p-1 rounded hover:bg-[#2d3748]/50 cursor-pointer"
                              title="Duplicate Circuit"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={() => removeCircuit(c.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-[#2d3748]/50 cursor-pointer"
                              title="Delete Circuit"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });

                  return mappedRows;
                })()
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
              Showing <span className="text-yellow-400 font-bold">{currentBoard.circuits.length}</span> circuits
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearCircuits}
              className="px-5 py-2.5 bg-[#3d1a1a] hover:bg-[#522525] text-[#fc8181] font-bold text-sm rounded-lg border border-[#742a2a80] transition-colors cursor-pointer"
            >
              🗑️ Clear Panel
            </button>
            <button
              onClick={addCircuit}
              className="bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
            >
              + Add Circuit
            </button>
          </div>
        </div>
      </div>

      {importOpen && (
        <ImportModal
          boardName={currentBoard.name}
          boardPhase={currentBoard.phase}
          existingCount={currentBoard.circuits.length}
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      <AnimatePresence>
        {addCircuitModalOpen && (() => {
          const activeRoomName = roomSelectValue === 'custom' ? customRoomName : roomSelectValue;
          const existingRoomCircuit = currentBoard.circuits.find(
            c => c.room && c.room.trim().toLowerCase() === activeRoomName.trim().toLowerCase() && (c.roomL || 0) > 0
          );
          const isRoomDuplicate = !!existingRoomCircuit;

          const displayRoomL = isRoomDuplicate ? String(existingRoomCircuit.roomL || '') : newCircuitForm.roomL;
          const displayRoomW = isRoomDuplicate ? String(existingRoomCircuit.roomW || '') : newCircuitForm.roomW;
          const displayCeilingH = isRoomDuplicate ? String(existingRoomCircuit.ceilingH || '') : newCircuitForm.ceilingH;

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setAddCircuitModalOpen(false);
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
                    <span>🔌</span> {editingId ? 'Edit Circuit Parameters' : 'Add Circuit to Panel Board'}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {editingId ? 'Update technical parameters for the selected circuit' : 'Configure technical parameters for the new circuit'} in <strong>{currentBoard.name}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddCircuitModalOpen(false);
                    setEditingId(null);
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveNewCircuit} className="p-5 overflow-y-auto space-y-4 flex-1 text-left select-none">
                {/* General Circuit Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Room Selector */}
                  <div>
                    <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                      Room Name <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={roomSelectValue}
                      onChange={e => {
                        const val = e.target.value;
                        setRoomSelectValue(val);
                        if (val !== 'custom' && val !== '') {
                          handleRoomChange(val);
                        }
                      }}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    >
                      <option value="">Select a Room...</option>
                      {dynamicRoomList.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="custom" className="text-blue-400 font-bold">+ Create Custom Room Name...</option>
                    </select>

                    {/* Show Custom Room text input if "custom" is selected */}
                    {roomSelectValue === 'custom' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Enter Custom Room Name"
                          value={customRoomName}
                          onChange={e => {
                            setCustomRoomName(e.target.value);
                            handleRoomChange(e.target.value);
                          }}
                          className="w-full bg-[#0f1117] border border-blue-500/50 rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-medium"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Load Type */}
                  <div>
                    <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                      Load Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={newCircuitForm.loadType}
                      onChange={e => handleLoadTypeChange(e.target.value)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    >
                      {(currentBoard.boardType === 'Industrial DB'
                        ? [...LOAD_TYPES.filter(t => t !== 'Air Conditioner'), 'Motor', 'Welding', 'Compressor', 'Pump', 'Industrial Socket', 'Lighting Panel', 'UPS']
                        : LOAD_TYPES.filter(t => t !== 'Air Conditioner')
                      ).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Room Dimensions Row (Only editable if new room name) */}
                <div className="bg-[#0c101b] border border-[#2d3748]/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                      <span>📏</span> Room Dimensions
                    </span>
                    {isRoomDuplicate && (
                      <span className="text-[10px] text-yellow-400 font-medium bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-900/40">
                        🔒 Inherited from {activeRoomName}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-1">
                        Length L (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={displayRoomL}
                        onChange={e => setNewCircuitForm(p => ({ ...p, roomL: e.target.value }))}
                        disabled={isRoomDuplicate}
                        placeholder="e.g. 5.0"
                        className={`w-full bg-[#121624] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 text-center font-bold ${
                          isRoomDuplicate ? 'opacity-50 cursor-not-allowed bg-transparent text-gray-400' : 'text-green-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-1">
                        Width W (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={displayRoomW}
                        onChange={e => setNewCircuitForm(p => ({ ...p, roomW: e.target.value }))}
                        disabled={isRoomDuplicate}
                        placeholder="e.g. 4.0"
                        className={`w-full bg-[#121624] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 text-center font-bold ${
                          isRoomDuplicate ? 'opacity-50 cursor-not-allowed bg-transparent text-gray-400' : 'text-green-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold uppercase mb-1">
                        Ceiling Height (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={displayCeilingH}
                        onChange={e => setNewCircuitForm(p => ({ ...p, ceilingH: e.target.value }))}
                        disabled={isRoomDuplicate}
                        placeholder="e.g. 2.7"
                        className={`w-full bg-[#121624] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 text-center font-bold ${
                          isRoomDuplicate ? 'opacity-50 cursor-not-allowed bg-transparent text-gray-400' : 'text-green-400'
                        }`}
                      />
                    </div>
                  </div>

                  {isRoomDuplicate && (
                    <p className="text-[10px] text-gray-500 italic mt-1 leading-normal">
                      Room dimensions are inherited from the first circuit of this room and are read-only.
                    </p>
                  )}
                </div>

                {/* Dynamic Load-Specific Properties Section */}
                <div className="border border-[#2d3748]/60 bg-[#161c2e]/40 p-4 rounded-lg space-y-3">
                  <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                    <span>⚡</span> {newCircuitForm.loadType} Properties
                  </span>

                  {/* Lighting specific subfields */}
                  {newCircuitForm.loadType === 'Lighting' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Lighting Type</label>
                        <select
                          value={newCircuitForm.lightingType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, lightingType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {LIGHTING_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Fixture Style</label>
                        <select
                          value={newCircuitForm.fixtureStyle}
                          onChange={e => setNewCircuitForm(p => ({ ...p, fixtureStyle: e.target.value, fixtureVariance: 'None' }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {FIXTURE_STYLES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Variance selection based on fixtureStyle */}
                      {(() => {
                        const currentStyle = newCircuitForm.fixtureStyle || 'Spot';
                        let list: string[] = [];
                        if (currentStyle === 'Droplet') list = DROPLET_VARIANCES;
                        else if (currentStyle === 'Spot') list = SPOT_VARIANCES;
                        else if (currentStyle === 'Modular') list = MODULAR_VARIANCES;
                        else if (currentStyle === 'Strip Light') list = STRIP_VARIANCES;
                        else if (currentStyle === 'Wall Light') list = WALL_LIGHT_VARIANCES;
                        else if (currentStyle === 'Star Light') list = STAR_LIGHT_VARIANCES;
                        else if (currentStyle === 'Chandelier') list = CHANDELIER_VARIANCES;

                        if (list.length === 0) return null;

                        return (
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Fixture Variance</label>
                            <select
                              value={newCircuitForm.fixtureVariance}
                              onChange={e => setNewCircuitForm(p => ({ ...p, fixtureVariance: e.target.value }))}
                              className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-green-300 p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                            >
                              {list.map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Mount Type</label>
                        <select
                          value={newCircuitForm.mountType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, mountType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {MOUNT_TYPES.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Control Type</label>
                        <select
                          value={newCircuitForm.controlType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, controlType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {LIGHTING_CONTROLS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                    </div>
                  )}

                  {/* Switch parameters for lighting/AC/dedicated */}
                  {(newCircuitForm.loadType === 'Lighting' || newCircuitForm.loadType === 'Air Conditioner' || newCircuitForm.loadType === 'Dedicated') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left border-t border-[#2d3748]/50 pt-3 mt-1">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Switch Type</label>
                        <select
                          value={newCircuitForm.switchType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, switchType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_SWITCH_TYPES.map(sw => (
                            <option key={sw} value={sw}>{sw}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Switch Qty</label>
                        <input
                          type="number"
                          value={newCircuitForm.switchQty}
                          onChange={e => setNewCircuitForm(p => ({ ...p, switchQty: e.target.value }))}
                          placeholder="e.g. 1"
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sockets specific subfields */}
                  {newCircuitForm.loadType === 'Sockets' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-left">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Socket Type</label>
                        <select
                          value={newCircuitForm.socketType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, socketType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                        >
                          {dynamic_SOCKET_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Sub Variance / Rating</label>
                        <select
                          value={newCircuitForm.socketRating || '13A'}
                          onChange={e => setNewCircuitForm(p => ({ ...p, socketRating: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-cyan-300 p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                        >
                          {dynamic_SOCKET_RATINGS.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">
                          Appliance Purpose <span className="text-cyan-400 font-normal lowercase">(auto-fills watts)</span>
                        </label>
                        <select
                          value={newCircuitForm.socketVariance}
                          onChange={e => {
                            const val = e.target.value;
                            const autoW = getSocketApplianceWatts(val);
                            setNewCircuitForm(p => ({
                              ...p,
                              socketVariance: val,
                              watts: autoW !== null ? String(autoW) : p.watts
                            }));
                          }}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-cyan-300 font-semibold p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_SOCKET_VARIANCES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Fixture Style</label>
                        <select
                          value={newCircuitForm.socketFixtureStyle}
                          onChange={e => setNewCircuitForm(p => ({ ...p, socketFixtureStyle: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_SOCKET_FIX_STYLES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Mount Type</label>
                        <select
                          value={newCircuitForm.socketMountType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, socketMountType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_SOCKET_MOUNTS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Control Type</label>
                        <select
                          value={newCircuitForm.socketControl}
                          onChange={e => setNewCircuitForm(p => ({ ...p, socketControl: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_SOCKET_CONTROLS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Air Conditioner specific subfields */}
                  {newCircuitForm.loadType === 'Air Conditioner' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">AC Type</label>
                        <select
                          value={newCircuitForm.acType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, acType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_AC_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">AC Fixture Style</label>
                        <select
                          value={newCircuitForm.acFixtureStyle}
                          onChange={e => setNewCircuitForm(p => ({ ...p, acFixtureStyle: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_AC_FIX_STYLES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Mount Type</label>
                        <select
                          value={newCircuitForm.acMountType}
                          onChange={e => setNewCircuitForm(p => ({ ...p, acMountType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_AC_MOUNTS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Control Type</label>
                        <select
                          value={newCircuitForm.acControl}
                          onChange={e => setNewCircuitForm(p => ({ ...p, acControl: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_AC_CONTROLS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Dedicated specific subfields */}
                  {newCircuitForm.loadType === 'Dedicated' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left font-sans">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Dedicated Type</label>
                        <select
                          value={newCircuitForm.dedicatedType}
                          onChange={e => {
                            const val = e.target.value;
                            setNewCircuitForm(p => ({
                              ...p,
                              dedicatedType: val,
                              cableCores: val === 'Three Phase' ? '4 Cores' : '3 Cores',
                              fixtureVariance: val === 'Three Phase' ? '13A 3ph Industrial' : 'None'
                            }));
                          }}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_DEDICATED_TYPES.filter(t => isThreePhase || t !== 'Three Phase').map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Fixture Style</label>
                        <select
                          value={newCircuitForm.dedicatedFixtureStyle}
                          onChange={e => setNewCircuitForm(p => ({ ...p, dedicatedFixtureStyle: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                        >
                          {dynamic_DEDICATED_FIX_STYLES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {newCircuitForm.dedicatedType === 'Three Phase' && (
                        <div className="md:col-span-2">
                          <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Type Variance</label>
                          <select
                            value={newCircuitForm.fixtureVariance || '13A 3ph Industrial'}
                            onChange={e => setNewCircuitForm(p => ({ ...p, fixtureVariance: e.target.value }))}
                            className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-green-300 p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                          >
                            {dynamic_DEDICATED_3PH_VARIANCES.map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Industrial Load Assistant Helper Info */}
                {['Motor', 'Welding', 'Compressor', 'Pump', 'Industrial Socket', 'Lighting Panel', 'UPS'].includes(newCircuitForm.loadType) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] p-2.5 rounded-lg flex items-start gap-2 select-none mb-3">
                    <span className="text-sm">🏭</span>
                    <div>
                      <span className="font-bold uppercase tracking-wider block mb-0.5">Industrial Load Assistant</span>
                      {newCircuitForm.loadType === 'Motor' && "Recommended: 1 HP = 746 Watts. Motor circuit breakers are sized at 1.75x multiplier for startup inrush current."}
                      {newCircuitForm.loadType === 'Welding' && "Recommended: Welding arcs create heavy inductive transients. Sized with a 2.0x breaker multiplier."}
                      {newCircuitForm.loadType === 'Compressor' && "Recommended: Compressors require high starting torque. Sized with a 1.5x breaker multiplier."}
                      {newCircuitForm.loadType === 'Pump' && "Recommended: Fluid pumps run continuously. Sized with a 1.4x breaker multiplier."}
                      {newCircuitForm.loadType === 'Industrial Socket' && "Recommended: Industrial sockets (Commando blue/red) default to 16A, 32A, or 63A breaker ratings."}
                      {newCircuitForm.loadType === 'Lighting Panel' && "Recommended: High-bay warehouse floodlights. Sized as continuous duty load (1.25x)."}
                      {newCircuitForm.loadType === 'UPS' && "Recommended: Backup server power system. Non-linear computer load profile."}
                    </div>
                  </div>
                )}

                {/* Sizing & Cable Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Watts</label>
                    <input
                      type="number"
                      value={newCircuitForm.watts}
                      onChange={e => setNewCircuitForm(p => ({ ...p, watts: e.target.value }))}
                      placeholder="e.g. 100"
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-bold text-center text-yellow-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Quantity</label>
                    <input
                      type="number"
                      value={newCircuitForm.qty}
                      onChange={e => setNewCircuitForm(p => ({ ...p, qty: e.target.value }))}
                      placeholder="Auto-calc"
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-bold text-center"
                    />
                  </div>

                  {isThreePhase && (
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Phase Connection</label>
                      <select
                        value={newCircuitForm.phase}
                        onChange={e => setNewCircuitForm(p => ({ ...p, phase: e.target.value }))}
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md p-2 text-xs outline-none focus:border-blue-500 font-extrabold cursor-pointer text-center"
                        style={{
                          color: PHASE_COLORS[newCircuitForm.phase] || '#ff0017',
                          backgroundColor: `${PHASE_COLORS[newCircuitForm.phase] || '#ff0017'}20`,
                          borderColor: `${PHASE_COLORS[newCircuitForm.phase] || '#ff0017'}60`
                        }}
                      >
                        {Pi.map(phaseOption => (
                          <option key={phaseOption} value={phaseOption} style={{ color: PHASE_COLORS[phaseOption], backgroundColor: '#0f172a', fontWeight: 'bold' }}>
                            {phaseOption}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Cable Length (m)</label>
                    <input
                      type="number"
                      value={newCircuitForm.cableLength}
                      onChange={e => setNewCircuitForm(p => ({ ...p, cableLength: e.target.value }))}
                      placeholder="e.g. 15"
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-bold text-center text-blue-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Wire size (mm²)</label>
                    <select
                      value={newCircuitForm.wire}
                      onChange={e => setNewCircuitForm(p => ({ ...p, wire: e.target.value }))}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-bold text-center cursor-pointer"
                    >
                      <option value="">—</option>
                      {WIRE_SIZES.map(w => (
                        <option key={w} value={w}>{w} mm²</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Cable Cores</label>
                    <select
                      value={newCircuitForm.cableCores}
                      onChange={e => setNewCircuitForm(p => ({ ...p, cableCores: e.target.value }))}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500 font-semibold cursor-pointer"
                    >
                      {CABLE_CORES.map(cc => (
                        <option key={cc} value={cc}>{cc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold text-left">Notes</label>
                  <input
                    type="text"
                    value={newCircuitForm.notes}
                    onChange={e => setNewCircuitForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="e.g. Dedicated ring circuit, outdoor use, etc."
                    className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-4 border-t border-[#2d3748] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAddCircuitModalOpen(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 bg-[#1e2538] hover:bg-[#2b354f] border border-[#2d3748] text-gray-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    {editingId ? 'Update Circuit' : 'Save Circuit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
        </>
      )}
    </div>
  );
}


