export interface User {
  username: string;
}

export interface ProjectSettings {
  projectName: string;
  projectNo: string;
  engineer: string;
  client: string;
  voltage: number;
  frequency: number;
  powerFactor: number;
  demandFactor: number;
  diversityFactor: number;
  tempDesign: number;
  altitudeFactor: number;
  safetyMargin: number;
  targetLux: number;
  lightMF: number;
  defaultLPW: number;
  currencyCode?: string;
  currencySymbol?: string;
  currencyRate?: number;
  lightingRoundingMode?: 'floor' | 'round' | 'ceil' | 'actual';
  lightingPresetMode?: 'standard' | 'custom' | 'high' | 'low' | 'overrides';
  customRoomLux?: Record<string, number>;
  socketAreaFactor?: number;
  customRoomSockets?: Record<string, number>;
  customRooms?: string[];
  acDefaultWatts?: number;
  acDefaultWire?: string;
  dedicatedDefaultWatts?: number;
  dedicatedDefaultWire?: string;
  // HVAC Sizing parameters
  hvacSafetyFactor?: number;
  hvacCfmPerKw?: number;
  hvacAchDefault?: number;
  hvacDefaultRefrigerant?: string;
  // Plumbing Sizing parameters
  plumbingVelocityLimit?: number;
  plumbingPipeRoughness?: number;
  plumbingHotWaterTemp?: number;
  // Fire Sizing parameters
  fireHazardDensity?: number;
  fireMaxSprinklerArea?: number;
  fireHoseStreamAllowance?: number;
  // CCTV & Smart Sizing parameters
  cctvDefaultFps?: number;
  cctvDefaultRetention?: number;
  cctvPoeLimit?: number;
}

export interface Circuit {
  id: string;
  circuitId: string;
  room: string;
  roomL?: number;
  roomW?: number;
  ceilingH?: number;
  lumensPerUnit?: number;
  loadType: 'Lighting' | 'Sockets' | 'Air Conditioner' | 'Dedicated' | 'Motor' | 'Welding' | 'Compressor' | 'Pump' | 'Industrial Socket' | 'Lighting Panel' | 'UPS' | '';
  lightingType?: string;
  fixtureStyle?: string;
  fixtureVariance?: string;
  mountType?: string;
  controlType?: string;
  socketType?: string;
  socketFixtureStyle?: string;
  socketMountType?: string;
  socketControl?: string;
  acType?: string;
  acFixtureStyle?: string;
  acMountType?: string;
  acControl?: string;
  acHp?: number;
  dedicatedType?: string;
  dedicatedFixtureStyle?: string;
  watts: number;
  qty: number;
  cableLength: number;
  cableCores: string;
  phase: string;
  cb: number;
  wire: string;
  notes: string;
  switchType?: string;
  switchQty?: number;
  controlledFrom?: string;
  socketVariance?: string;
  customValues?: Record<string, any>;
}

export interface Board {
  id: string;
  name: string;
  phase: string; // '1-Phase' | '3-Phase'
  boardType: string;
  location: string;
  voltage: number;
  circuits: Circuit[];
}

export interface SwitchBoardItem {
  id: string;
  room: string;
  switchType: string;
  qty: number;
  notes: string;
}

export interface HvacUnit {
  id: string;
  zone: string;
  system: string;
  area: number;
  length?: number;
  width?: number;
  height: number;
  coolingLoad: number;
  refrigerant: string;
  cfm: number;
  notes: string;
  switchType?: string;
  switchQty?: number;
  watts?: number;
  totalWatts?: number;
  quantity?: number;
  phase?: string;
  cbSizing?: number;
  wire?: string;
  cableLength?: number;
  cores?: string;
  totalCable?: number;
  cableColors?: string;
  linkedCircuitId?: string;
  acHp?: number;
  factors?: string[];
  customValues?: Record<string, any>;
}

export interface PlumbingFixture {
  id: string;
  zone: string;
  fixture: string;
  qty: number;
  fixtureUnits: number;
  pipeSize: number;
  material: string;
  coldFlow: number;
  hotFlow: number;
  pipeLength?: number;
  notes: string;
  customValues?: Record<string, any>;
}

export interface FireZone {
  id: string;
  zone: string;
  hazard: string;
  sprinklerType: string;
  area: number;
  spacing?: number;
  flowRate?: number;
  pipeSize?: number;
  notes: string;
  customValues?: Record<string, any>;
  height?: number;
  volume?: number;
  temp?: number;
  agentType?: string;
  concentration?: number;
  agentWeight?: number;
  cylinderQty?: number;
  cylinderSize?: string;
  pipeMain?: string | number;
  pipeBranch?: string | number;
  nozzles?: number;
}

export interface SolarLoad {
  id: string;
  category?: string;
  subCategory?: string;
  description: string;
  watts: number;
  qty: number;
  hoursPerDay: number;
  notes: string;
  customValues?: Record<string, any>;
}

export interface SolarConfig {
  panelWattage: number;
  peakSunHours: number;
  systemVoltage: number;
  batteryAh: number;
  batteryVoltage: number;
  batteryType: string;
  daysAutonomy: number;
  dod: number;
  batteryEff: number;
  inverterType: string;
  inverterEff: number;
  safetyFactor: number;
}

export interface GenLoad {
  id: string;
  description: string;
  loadType: string;
  kw: number;
  pf: number;
  qty: number;
  demandFactor: number;
  startingFactor: number;
  notes: string;
  startingCurrent?: number;
  runningCurrent?: number;
  dutyCycle?: number;
  diversityFactor?: number;
  isCritical?: boolean;
  startingMethod?: 'DOL' | 'Star Delta' | 'Soft Starter' | 'VFD';
  customValues?: Record<string, any>;
}

export interface GenClientInfo {
  clientName: string;
  company: string;
  projectName: string;
  projectAddress: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  buildingType: 'Residential' | 'Commercial' | 'Industrial' | 'Hospital' | 'School' | 'Hotel' | 'Factory' | 'Mixed Use' | string;
  numberOfFloors: number;
  occupancy: number;
  existingSupply: string;
  utilityVoltage: number;
  phase: 'Single Phase' | 'Three Phase';
}

export interface GenSiteInspectionItem {
  id: string;
  category: 'Electrical' | 'Mechanical' | 'Civil';
  item: string;
  checked: boolean;
  status: 'Pass' | 'Fail' | 'Needs Attention' | 'N/A';
  notes: string;
}

export interface GenEarthingDesign {
  targetResistance: number; // ohms (e.g. 1.0 or 5.0)
  soilResistivity: number; // ohm-m
  electrodeType: 'Copper Rod' | 'Copper Bonded Rod' | 'GI Rod';
  rodLength: number; // meters
  rodDiameter: number; // mm
  earthCableSize: string; // e.g. '70mm²'
  earthStripSize: string; // e.g. '25x3mm'
  enhancementCompound: string;
  testLinkType: string;
  inspectionChamberType: string;
}

export interface GenPlumbingReq {
  fuelLineSize: string; // e.g. '1/2" Steel'
  returnLineSize: string; // e.g. '1/2" Steel'
  tankCapacityLitres: number;
  dailyConsumptionHours: number;
  drainLineSize: string;
  bundWallCapacityLitres: number;
  coolingWaterReq: string;
  oilSeparatorReq: boolean;
  pipeMaterial: string;
  pipeInsulation: string;
}

export interface GenAtsSizing {
  ratingAmps: number;
  amfCompatible: boolean;
  numberOfPoles: 3 | 4;
  shortCircuitRatingKa: number;
  interlockType: 'Mechanical & Electrical' | 'Electrical Only' | 'Mechanical Only';
  bypassArrangement: boolean;
}

export interface SmartDevice {
  id: string;
  room: string;
  device: string;
  brand: string;
  protocol: string;
  qty: number;
  watts: number;
  platform: string;
  notes: string;
  customValues?: Record<string, any>;
}

export interface CctvCamera {
  id: string;
  location: string;
  type: string;
  resolution: string;
  fps: number;
  compression: string;
  lens: string;
  poeClass: string;
  qty: number;
  indoor: boolean;
  ir: boolean;
  notes: string;
  customValues?: Record<string, any>;
}

export const ROOM_LUX_DATABASE: Record<string, number> = {
  'Entrance Terrace': 200,
  'Power Room': 200,
  'Entry Stairway': 200,
  'Exit Stairway': 200,
  'Down Passage': 200,
  'Up Passage': 200,
  'Kitchen Terrace': 200,
  'Store': 200,
  'Room 1 Terrace': 200,
  'Room 2 Terrace': 200,
  'Room 3 Terrace': 200,
  'Master Terrace': 200,
  'Lounge Terrace': 200,
  'In-Compound': 200,
  'Out-Compound': 200,
  'Visitor\'s Toilet': 250,
  'Guest Room': 250,
  'Room 1': 250,
  'Room 2': 250,
  'Room 3': 250,
  'Guest Toilet & Bath': 250,
  'Room 1 Toilet & Bath': 250,
  'Room 2 Toilet & Bath': 250,
  'Room 3 Toilet & Bath': 250,
  'Lobby': 300,
  'Living Room 1': 300,
  'Living Room 2': 300,
  'Master Room': 300,
  'Family Lounge': 300,
  'Dining 1': 300,
  'Dining 2': 300,
  'Laundry': 300,
  'Master Toilet & Bath': 300,
  'Kitchen': 400,
  'Study': 400,
  'Room 1 In-Wardrobe': 400,
  'Room 2 In-Wardrobe': 400,
  'Room 3 In-Wardrobe': 400,
  'Master In-Wardrobe': 400,
};

export function getTargetLuxForRoom(roomName: string, settings: ProjectSettings): number {
  const mode = settings.lightingPresetMode || 'standard';
  
  if (mode === 'custom') {
    return settings.targetLux || 300;
  }
  
  const baseLux = (mode === 'overrides' && settings.customRoomLux && settings.customRoomLux[roomName] !== undefined)
    ? settings.customRoomLux[roomName]
    : (ROOM_LUX_DATABASE[roomName] || settings.targetLux || 300);
    
  let multiplier = 1.0;
  if (mode === 'high') multiplier = 1.5;
  if (mode === 'low') multiplier = 0.8;
  
  return Math.round(baseLux * multiplier);
}

export function getRoundingValue(value: number, mode: 'floor' | 'round' | 'ceil' | 'actual' = 'actual'): number {
  if (mode === 'round') return Math.round(value);
  if (mode === 'ceil') return Math.ceil(value);
  if (mode === 'actual') return Math.round(value * 100) / 100;
  return Math.floor(value);
}

export interface CustomTabConfig {
  id: string;
  icon: string;
  label: string;
  type?: 'standard' | 'selfdesign' | 'custom_canvas';
  description?: string;
  isCustom?: boolean;
}

export interface KitComponentItem {
  id: string;
  templateId: string;
  label: string;
  category: 'Electrical' | 'HVAC' | 'Plumbing' | 'Fire' | 'CCTV/ELV' | 'Civil' | 'UI/Tools' | 'Electrical Symbols';
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rating: string;
  powerKw?: number;
  flowGpm?: number;
  airCfm?: number;
  cost?: number;
  status: 'Normal' | 'Standby' | 'Critical';
  notes?: string;
  color?: string;

  // Custom Drag & Drop Tool Widget Extensions
  elementType?: 'equipment' | 'line' | 'table' | 'chart' | 'checklist' | 'radio' | 'demarcator' | 'calculator' | 'button' | 'range' | 'list';
  tableData?: { headers: string[]; rows: (string | number)[][] };
  chartData?: { type: 'bar' | 'pie' | 'gauge'; title: string; labels: string[]; values: number[] };
  checklistData?: { id: string; text: string; done: boolean }[];
  radioData?: { options: string[]; selectedIndex: number };
  demarcatorData?: { zoneTitle: string; color: string; borderStyle: 'solid' | 'dashed' | 'dotted' };
  calculatorData?: { calcType: 'load_kw' | 'voltage_drop' | 'pipe_flow' | 'air_cfm'; inputA: number; inputB: number; result?: number };
  buttonData?: { label: string; actionType: 'alert' | 'recalc' | 'toggle_status'; variant: 'primary' | 'success' | 'warning' | 'danger' };
  rangeData?: { min: number; max: number; current: number; unit: string; label: string };
  listData?: string[];
  lineData?: { lineStyle: 'solid' | 'dashed' | 'dotted'; strokeWidth: number; color: string };
}

export interface KitConnection {
  id: string;
  fromId: string;
  toId: string;
  type: 'Cable/Wire' | 'Pipe' | 'Duct' | 'Busbar' | 'Fiber';
  color?: string;
  label?: string;
  spec?: string;
}

