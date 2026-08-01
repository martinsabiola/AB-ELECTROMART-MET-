import React, { useState, useEffect } from 'react';
import { Board, HvacUnit, PlumbingFixture, FireZone, SolarLoad, SolarConfig, GenLoad, SmartDevice, CctvCamera } from '../../types';
import { Trophy, Shield, Award, Sparkles, Plus, Trash2, Check, Lock, Edit, Key, Star, Package, RefreshCw } from 'lucide-react';

interface InventoryItem {
  id: string;
  type: 'electrical' | 'hvac' | 'plumbing' | 'fire' | 'solar' | 'generator' | 'smarthome' | 'cctv';
  name: string;
  specs: string;
  data: any;
  addedAt: number;
}

interface UserProfile {
  username: string;
  avatar: string;
  accentColor: string;
  title: string;
  xp: number;
  completedQuests: string[];
  inventory: InventoryItem[];
}

interface ProfileTabProps {
  user: { username: string };
  boards: Board[];
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  hvacUnits: HvacUnit[];
  setHvacUnits: React.Dispatch<React.SetStateAction<HvacUnit[]>>;
  plumbingFixtures: PlumbingFixture[];
  setPlumbingFixtures: React.Dispatch<React.SetStateAction<PlumbingFixture[]>>;
  fireZones: FireZone[];
  setFireZones: React.Dispatch<React.SetStateAction<FireZone[]>>;
  solarLoads: SolarLoad[];
  setSolarLoads: React.Dispatch<React.SetStateAction<SolarLoad[]>>;
  solarCfg: SolarConfig;
  setSolarCfg: React.Dispatch<React.SetStateAction<SolarConfig>>;
  genLoads: GenLoad[];
  setGenLoads: React.Dispatch<React.SetStateAction<GenLoad[]>>;
  smartDevices: SmartDevice[];
  setSmartDevices: React.Dispatch<React.SetStateAction<SmartDevice[]>>;
  cameras: CctvCamera[];
  setCameras: React.Dispatch<React.SetStateAction<CctvCamera[]>>;
  onChangeAccent: (color: string) => void;
  showToast: (ok: boolean, text: string) => void;
}

// Pre-defined engineering avatars
const AVATARS = [
  { id: '⚡', label: 'Power Grid Specialist' },
  { id: '❄️', label: 'Thermal Systems Architect' },
  { id: '💧', label: 'Hydraulics Director' },
  { id: '☀️', label: 'Solar Array Engineer' },
  { id: '⚙️', label: 'Kinetic Drive Sizer' },
  { id: '🏭', label: 'Heavy MCC Designer' },
  { id: '🏡', label: 'IoT automation Lead' },
  { id: '🛡️', label: 'Critical Fire Shield' },
  { id: '🎓', label: 'Sizing Scholar' },
];

// Pre-defined template blueprints
const DEFAULT_BLUEPRINTS: InventoryItem[] = [
  {
    id: 'bp-schneider-mdb',
    type: 'electrical',
    name: 'Schneider Acti9 MDB',
    specs: '3-Phase, 400V, 125A Incomer Panel',
    addedAt: Date.now(),
    data: {
      name: 'Schneider Acti9 MDB',
      phase: '3-Phase',
      boardType: 'MDB',
      location: 'Main Substation Room',
      voltage: 400,
      circuits: [
        { id: 'c1', circuitId: 'C1', room: 'Server Room AC', watts: 7500, qty: 1, cableLength: 25, cableCores: '4C', phase: '3-Phase', cb: 32, wire: '6', loadType: 'Air Conditioner', notes: 'Continuous duty server climate control' },
        { id: 'c2', circuitId: 'C2', room: 'General Power Sockets', watts: 3000, qty: 5, cableLength: 15, cableCores: '3C', phase: '1-Phase', cb: 20, wire: '2.5', loadType: 'Sockets', notes: 'Radial circuit for power tools' },
        { id: 'c3', circuitId: 'C3', room: 'Highbay LED Lighting', watts: 2000, qty: 10, cableLength: 35, cableCores: '3C', phase: '1-Phase', cb: 10, wire: '1.5', loadType: 'Lighting', notes: 'Office grid lights' }
      ]
    }
  },
  {
    id: 'bp-daikin-vrv',
    type: 'hvac',
    name: 'Daikin VRV Heat Recovery AC',
    specs: '10.0 kW Capacity, R-410A system, 850 CFM',
    addedAt: Date.now(),
    data: {
      zone: 'Executive Suite',
      system: 'VRV Heat Recovery',
      area: 45,
      height: 3.2,
      coolingLoad: 10.0,
      refrigerant: 'R-410A',
      cfm: 850,
      notes: 'High-efficiency variable cooling',
      acHp: 3.5
    }
  },
  {
    id: 'bp-rehau-wc',
    type: 'plumbing',
    name: 'REHAU Quiet Drainage WC',
    specs: 'Wall-Hung Carrier, 6 DFU Load, 110mm pipe',
    addedAt: Date.now(),
    data: {
      zone: 'Shared Amenities block',
      fixture: 'WC',
      qty: 2,
      fixtureUnits: 6,
      pipeSize: 110,
      material: 'REHAU HDPE',
      coldFlow: 12,
      hotFlow: 0,
      notes: 'Sound-dampened carrier framework'
    }
  },
  {
    id: 'bp-tyco-sprinkler',
    type: 'fire',
    name: 'Tyco Quick Response Pendant',
    specs: 'Ordinary Hazard, 12m spacing, 150L/min',
    addedAt: Date.now(),
    data: {
      zone: 'Warehouse bay 2',
      hazard: 'Ordinary Hazard (Group 1)',
      sprinklerType: 'Pendant Quick Response',
      area: 250,
      spacing: 12,
      flowRate: 150,
      pipeSize: 50,
      notes: 'Pre-action sprinkler protection'
    }
  },
  {
    id: 'bp-jinko-solar',
    type: 'solar',
    name: 'Jinko Solar Array Grid',
    specs: '550W N-Type Bifacial Mono panels',
    addedAt: Date.now(),
    data: {
      description: 'Main Roof Solar Grid (Jinko Mono)',
      watts: 550,
      qty: 12,
      hoursPerDay: 5.5,
      notes: 'Tier-1 bifacial panels'
    }
  },
  {
    id: 'bp-cummins-gen',
    type: 'generator',
    name: 'Cummins Standby Power Specs',
    specs: '15.0 kW Standby starting load factor',
    addedAt: Date.now(),
    data: {
      description: 'HVAC Compressors Surge Load',
      loadType: 'Motor',
      kw: 15.0,
      pf: 0.8,
      qty: 1,
      demandFactor: 1.0,
      startingFactor: 3.0,
      notes: 'Critical backup generator target load'
    }
  }
];

// XP level formula: Level = Math.floor(sqrt(XP / 100)) + 1
function getLevel(xp: number): { level: number; label: string; xpNext: number; xpPrev: number } {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpPrev = Math.pow(level - 1, 2) * 100;
  const xpNext = Math.pow(level, 2) * 100;
  
  let label = 'Sizing Apprentice';
  if (level >= 2) label = 'Systems Technician';
  if (level >= 3) label = 'Infrastructure Specialist';
  if (level >= 4) label = 'MEP Design Lead';
  if (level >= 5) label = 'Senior Chief Architect';
  if (level >= 6) label = 'Grand Consultant Master';
  
  return { level, label, xpNext, xpPrev };
}

export default function ProfileTab({
  user,
  boards,
  setBoards,
  hvacUnits,
  setHvacUnits,
  plumbingFixtures,
  setPlumbingFixtures,
  fireZones,
  setFireZones,
  solarLoads,
  setSolarLoads,
  solarCfg,
  setSolarCfg,
  genLoads,
  setGenLoads,
  smartDevices,
  setSmartDevices,
  cameras,
  setCameras,
  onChangeAccent,
  showToast,
}: ProfileTabProps) {
  // DB Load and Sync
  const [profile, setProfile] = useState<UserProfile>(() => {
    const key = `mep_profile_${user.username}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed loading user profile:', e);
    }
    return {
      username: user.username,
      avatar: '⚡',
      accentColor: 'coolblend',
      title: 'Infrastructure Architect',
      xp: 150,
      completedQuests: [],
      inventory: DEFAULT_BLUEPRINTS,
    };
  });

  // Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Custom Item Creation for Locker
  const [customBpName, setCustomBpName] = useState('');
  const [customBpType, setCustomBpType] = useState<'electrical' | 'hvac' | 'plumbing' | 'fire' | 'solar' | 'generator' | 'smarthome' | 'cctv'>('electrical');
  const [customBpSpecs, setCustomBpSpecs] = useState('');

  // Save profile to local storage whenever it changes
  useEffect(() => {
    const key = `mep_profile_${user.username}`;
    localStorage.setItem(key, JSON.stringify(profile));
    onChangeAccent(profile.accentColor);
  }, [profile, user.username, onChangeAccent]);

  // Handle changing avatar
  const handleSelectAvatar = (avatar: string) => {
    setProfile(prev => ({ ...prev, avatar }));
    showToast(true, `Profile avatar updated to ${avatar}`);
  };

  // Handle changing Accent Color
  const handleSelectAccent = (color: string) => {
    setProfile(prev => ({ ...prev, accentColor: color }));
    onChangeAccent(color);
    showToast(true, `Accent theme changed to ${color.toUpperCase()}`);
  };

  // Handle changing password
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showToast(false, 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast(false, 'Passwords do not match.');
      return;
    }

    try {
      const usersDB = JSON.parse(localStorage.getItem('mep_users_v1') || '{}');
      const cleanUser = user.username.trim().toLowerCase();
      const userEntry = usersDB[cleanUser];

      if (!userEntry) {
        showToast(false, 'Account record not found.');
        return;
      }

      // Import PBKDF2 function from auth page or re-derive
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(oldPassword),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          hash: 'SHA-256',
          salt: encoder.encode(userEntry.salt),
          iterations: 100000,
        },
        keyMaterial,
        256
      );
      const computedHash = Array.from(new Uint8Array(derivedBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (computedHash !== userEntry.hash) {
        showToast(false, 'Current password is incorrect.');
        return;
      }

      // Re-derive with new password
      const newKeyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(newPassword),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const newBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          hash: 'SHA-256',
          salt: encoder.encode(userEntry.salt),
          iterations: 100000,
        },
        newKeyMaterial,
        256
      );
      const newHash = Array.from(new Uint8Array(newBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      usersDB[cleanUser].hash = newHash;
      localStorage.setItem('mep_users_v1', JSON.stringify(usersDB));
      showToast(true, 'Password updated successfully!');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (e: any) {
      showToast(false, 'Error changing password: ' + e.message);
    }
  };

  // Evaluate project metrics for Quest progression
  const totalCircuitsCount = boards.reduce((sum, b) => sum + (b.circuits?.length || 0), 0);
  const totalHvacCount = hvacUnits.length;
  const totalPlumbingFU = plumbingFixtures.reduce((acc, p) => acc + (p.qty || 1) * (p.fixtureUnits || 0), 0);
  const maxFireArea = fireZones.reduce((max, f) => f.area > max ? f.area : max, 0);
  const totalSolarW = solarLoads.reduce((sum, l) => sum + (l.watts * l.qty), 0);
  const totalGenKW = genLoads.reduce((sum, l) => sum + (l.kw * l.qty), 0);
  const totalSmartCount = smartDevices.length;
  const hasH265Camera = cameras.some(c => c.compression.includes('H.265'));
  
  // Checking for complete design across all tabs
  const hasCompleteDesign = 
    boards.some(b => b.circuits.length > 0) &&
    hvacUnits.length > 0 &&
    plumbingFixtures.length > 0 &&
    fireZones.length > 0 &&
    solarLoads.length > 0 &&
    genLoads.length > 0 &&
    smartDevices.length > 0 &&
    cameras.length > 0;

  // Active Quest configurations
  const QUESTS = [
    {
      id: 'quest_volt',
      title: 'Volt Master Sizer',
      desc: 'Formulate an electrical schedule with 5+ circuits on a board.',
      metric: `Circuits added: ${totalCircuitsCount} / 5`,
      isMet: totalCircuitsCount >= 5,
      xp: 50,
      icon: '⚡',
    },
    {
      id: 'quest_thermal',
      title: 'Thermal Core Sizer',
      desc: 'Settle at least 2 distinct HVAC Zone cooling loads.',
      metric: `HVAC Sizers: ${totalHvacCount} / 2`,
      isMet: totalHvacCount >= 2,
      xp: 40,
      icon: '❄️',
    },
    {
      id: 'quest_hydronics',
      title: 'Plumbing Overlord',
      desc: 'Accumulate 20+ total fixture units (FU) in sanitation scheduling.',
      metric: `Fixture Units: ${totalPlumbingFU} / 20 FU`,
      isMet: totalPlumbingFU >= 20,
      xp: 45,
      icon: '💧',
    },
    {
      id: 'quest_sprinkler',
      title: 'Inundation Warden',
      desc: 'Size a fire suppression sprinkler grid for an area of 100 m² or more.',
      metric: `Max Sprinkler Area: ${maxFireArea} / 100 m²`,
      isMet: maxFireArea >= 100,
      xp: 50,
      icon: '🔥',
    },
    {
      id: 'quest_solar',
      title: 'Solar Pioneer',
      desc: 'Configure solar backup loads exceeding 500 Watts.',
      metric: `Solar Load: ${totalSolarW} / 500 W`,
      isMet: totalSolarW >= 500,
      xp: 60,
      icon: '☀️',
    },
    {
      id: 'quest_gen',
      title: 'Grid Resilience planner',
      desc: 'Formulate generator starting loads exceeding 10 kW.',
      metric: `Generator Load: ${totalGenKW} / 10 kW`,
      isMet: totalGenKW >= 10,
      xp: 55,
      icon: '⚙️',
    },
    {
      id: 'quest_smart',
      title: 'Home Automation Lead',
      desc: 'Add 4+ Smart devices / IoT relays to your platform.',
      metric: `IoT devices: ${totalSmartCount} / 4`,
      isMet: totalSmartCount >= 4,
      xp: 40,
      icon: '🏡',
    },
    {
      id: 'quest_cctv',
      title: 'Optoelectronic Specifier',
      desc: 'Configure CCTV schedules featuring advanced H.265+ compression.',
      metric: hasH265Camera ? 'H.265+ Found!' : 'No H.265+ Camera configured',
      isMet: hasH265Camera,
      xp: 45,
      icon: '📹',
    },
    {
      id: 'quest_fullstack',
      title: 'Grand MEP Consultant Sizer',
      desc: 'Populate sizing models in every single panel of the suite.',
      metric: hasCompleteDesign ? 'Complete!' : 'Incomplete',
      isMet: hasCompleteDesign,
      xp: 100,
      icon: '🏆',
    }
  ];

  // Earn XP
  const claimQuestXp = (questId: string, xpReward: number) => {
    if (profile.completedQuests.includes(questId)) return;
    setProfile(prev => ({
      ...prev,
      xp: prev.xp + xpReward,
      completedQuests: [...prev.completedQuests, questId]
    }));
    showToast(true, `Claimed ${xpReward} XP! Leveling up your engineering career.`);
  };

  // Add Item to Profile Blueprint Locker
  const handleAddBlueprint = () => {
    if (!customBpName) {
      showToast(false, 'Please provide a name for the equipment blueprint.');
      return;
    }

    let extractedData: any = {};
    let computedSpecs = customBpSpecs || 'Standard customized blueprint';

    // Extract current design state as templates based on type
    if (customBpType === 'electrical') {
      const activeBoard = boards[0] || { name: 'Custom MDB', phase: '3-Phase', boardType: 'MDB', location: 'Plant', voltage: 400, circuits: [] };
      extractedData = { ...activeBoard, name: customBpName };
      computedSpecs = `${activeBoard.phase}, ${activeBoard.voltage}V Panel (${activeBoard.circuits.length} Circuits)`;
    } else if (customBpType === 'hvac') {
      const unit = hvacUnits[0] || { zone: 'Custom Zone', system: 'Split AC', area: 25, height: 3.0, coolingLoad: 5.0, refrigerant: 'R-32', cfm: 400, acHp: 1.5, notes: '' };
      extractedData = { ...unit, zone: customBpName };
      computedSpecs = `${unit.system}, Cooling ${unit.coolingLoad}kW, refrigerant ${unit.refrigerant}`;
    } else if (customBpType === 'plumbing') {
      const fixture = plumbingFixtures[0] || { zone: 'Custom Bath', fixture: 'WC', qty: 1, fixtureUnits: 4, pipeSize: 100, material: 'PVC', coldFlow: 8, hotFlow: 0, notes: '' };
      extractedData = { ...fixture, zone: customBpName };
      computedSpecs = `${fixture.fixture} Unit, ${fixture.fixtureUnits} FU, Pipe ${fixture.pipeSize}mm`;
    } else if (customBpType === 'fire') {
      const zone = fireZones[0] || { zone: 'Custom Zone', hazard: 'Light Hazard', sprinklerType: 'Pendant', area: 100, spacing: 12, flowRate: 80, pipeSize: 25, notes: '' };
      extractedData = { ...zone, zone: customBpName };
      computedSpecs = `${zone.hazard} Sprinklers, ${zone.sprinklerType}`;
    } else if (customBpType === 'solar') {
      const load = solarLoads[0] || { description: 'LED Array', watts: 100, qty: 10, hoursPerDay: 6, notes: '' };
      extractedData = { ...load, description: customBpName };
      computedSpecs = `${load.watts}W Load, Qty ${load.qty}, ${load.hoursPerDay}h/day`;
    } else if (customBpType === 'generator') {
      const load = genLoads[0] || { description: 'Starting motor', loadType: 'Motor', kw: 5.5, pf: 0.8, qty: 1, demandFactor: 1.0, startingFactor: 2.5, notes: '' };
      extractedData = { ...load, description: customBpName };
      computedSpecs = `${load.kw}kW starting spec, starting factor ${load.startingFactor}`;
    } else if (customBpType === 'smarthome') {
      const dev = smartDevices[0] || { room: 'Server Room', device: 'Relay', brand: 'Custom', protocol: 'WiFi', qty: 1, watts: 1.0, platform: 'SmartThings', notes: '' };
      extractedData = { ...dev, room: customBpName };
      computedSpecs = `${dev.device}, Brand ${dev.brand}, platform ${dev.platform}`;
    } else if (customBpType === 'cctv') {
      const camera = cameras[0] || { location: 'Outer perimeter', type: 'Bullet', resolution: '4MP', fps: 15, compression: 'H.265+', lens: '4', poeClass: 'Class 3', qty: 1, indoor: false, ir: true, notes: '' };
      extractedData = { ...camera, location: customBpName };
      computedSpecs = `${camera.type} Camera, Res ${camera.resolution}, ${camera.compression}`;
    }

    const newItem: InventoryItem = {
      id: Math.random().toString(36).slice(2, 9),
      type: customBpType,
      name: customBpName,
      specs: computedSpecs,
      data: extractedData,
      addedAt: Date.now()
    };

    setProfile(prev => ({
      ...prev,
      inventory: [newItem, ...prev.inventory]
    }));

    setCustomBpName('');
    showToast(true, `Equipment template "${customBpName}" added to inventory locker!`);
  };

  // Delete Item from Blueprint Locker
  const handleDeleteBlueprint = (id: string, name: string) => {
    setProfile(prev => ({
      ...prev,
      inventory: prev.inventory.filter(item => item.id !== id)
    }));
    showToast(true, `Deleted template "${name}" from inventory locker.`);
  };

  // Quick-insert blueprint data into active MEP tabs
  const handleInsertBlueprint = (item: InventoryItem) => {
    try {
      if (item.type === 'electrical') {
        const boardData: Board = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setBoards(prev => [boardData, ...prev]);
        showToast(true, `Loaded panel "${item.name}" into Electrical schedules!`);
      } else if (item.type === 'hvac') {
        const unitData: HvacUnit = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setHvacUnits(prev => [unitData, ...prev]);
        showToast(true, `Inserted AC Zone "${item.name}" into HVAC schedules!`);
      } else if (item.type === 'plumbing') {
        const fixtureData: PlumbingFixture = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setPlumbingFixtures(prev => [fixtureData, ...prev]);
        showToast(true, `Inserted fixture "${item.name}" into Plumbing schedules!`);
      } else if (item.type === 'fire') {
        const zoneData: FireZone = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setFireZones(prev => [zoneData, ...prev]);
        showToast(true, `Inserted fire zone "${item.name}" into Fire Suppressors!`);
      } else if (item.type === 'solar') {
        const loadData: SolarLoad = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setSolarLoads(prev => [loadData, ...prev]);
        showToast(true, `Inserted Solar load "${item.name}" into Solar & Inverter arrays!`);
      } else if (item.type === 'generator') {
        const loadData: GenLoad = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setGenLoads(prev => [loadData, ...prev]);
        showToast(true, `Inserted Gen demand "${item.name}" into Standby schedules!`);
      } else if (item.type === 'smarthome') {
        const devData: SmartDevice = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setSmartDevices(prev => [devData, ...prev]);
        showToast(true, `Inserted device "${item.name}" into Smart Home/IoT relays!`);
      } else if (item.type === 'cctv') {
        const cameraData: CctvCamera = {
          ...item.data,
          id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        };
        setCameras(prev => [cameraData, ...prev]);
        showToast(true, `Inserted camera "${item.name}" into CCTV schedules!`);
      }
    } catch (e: any) {
      showToast(false, `Could not load item: ${e.message}`);
    }
  };

  const { level, label, xpNext, xpPrev } = getLevel(profile.xp);
  const xpProgressPercent = Math.min(100, Math.max(0, ((profile.xp - xpPrev) / (xpNext - xpPrev)) * 100));

  return (
    <div id="mep-profile-dashboard" className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-10">
      
      {/* LEFT COLUMN: Profile info, Avatar, Customization */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        
        {/* Profile Card */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 shadow-lg relative overflow-hidden">
          {/* Subtle decorative grid in card background */}
          <div className="absolute inset-0 bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Custom Avatar Selector */}
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-[#2b6cb0] flex items-center justify-center text-4xl shadow-xl transition-transform group-hover:scale-105">
                {profile.avatar}
              </div>
              <div className="absolute inset-0 bg-[#0f1117]/80 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 justify-center mb-1">
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">{profile.username}</h3>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            
            <div className="text-xs text-blue-400 font-bold uppercase tracking-widest">{label}</div>
            <div className="text-[10px] text-[#718096] mt-0.5">MEP Board Member &bull; Level {level}</div>

            {/* Level Experience Indicator */}
            <div className="w-full mt-5">
              <div className="flex justify-between text-[10px] font-bold text-[#718096] mb-1.5 uppercase">
                <span>XP PROGRESS ({profile.xp} / {xpNext})</span>
                <span>{Math.round(xpProgressPercent)}%</span>
              </div>
              <div className="w-full h-3 bg-[#0f1117] rounded-full border border-[#2d3748] overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${xpProgressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Change title field */}
            <div className="w-full mt-4 text-left">
              <label className="block text-[10px] font-bold text-[#718096] mb-1 uppercase tracking-wider">Engineering Badge Title</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profile.title}
                  onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Master Consultant"
                  className="flex-1 px-2 py-1 bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password and administrative actions */}
            <div className="w-full mt-4 flex flex-col gap-2">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="w-full py-2 bg-[#2d3748]/50 hover:bg-[#2d3748] border border-[#4a5568]/50 rounded-lg text-[#cbd5e0] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-blue-400" /> Change Sizing Password
              </button>
            </div>
          </div>
        </div>

        {/* Change Avatar Grid selection */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 shadow-lg">
          <div className="text-xs font-bold text-[#718096] mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <span>👤</span> Choose Engineering Avatar Icon
          </div>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((av) => (
              <button
                key={av.id}
                onClick={() => handleSelectAvatar(av.id)}
                className={`p-2 rounded-lg bg-[#0f1117] border text-xl flex items-center justify-center hover:bg-[#24335c]/50 transition-colors cursor-pointer ${
                  profile.avatar === av.id ? 'border-blue-500 bg-[#1e2d3d]' : 'border-[#2d3748]'
                }`}
                title={av.label}
              >
                {av.id}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Accent Color Settings */}
        <div className="bg-[#101422] border border-[#1f293d] rounded-xl p-4 shadow-lg">
          <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <span>🎨</span> Sizing Workspace UI Theme Accent
          </div>
          <div className="flex flex-col gap-2">
            {[
              { id: 'coolblend', name: 'Polar Ice Blend (Default)', bg: 'bg-gradient-to-r from-sky-400 via-indigo-300 to-indigo-500', border: 'border-sky-300' },
              { id: 'blue', name: 'Electric Blue', bg: 'bg-blue-600', border: 'border-blue-400' },
              { id: 'amber', name: 'Solar Amber', bg: 'bg-amber-500', border: 'border-amber-400' },
              { id: 'green', name: 'Environmental Green', bg: 'bg-emerald-600', border: 'border-emerald-400' },
              { id: 'ruby', name: 'Inferno Thermal Ruby', bg: 'bg-rose-600', border: 'border-rose-400' },
              { id: 'indigo', name: 'Midnight Indigo', bg: 'bg-indigo-600', border: 'border-indigo-400' },
            ].map(col => (
              <button
                key={col.id}
                onClick={() => handleSelectAccent(col.id)}
                className={`w-full p-2.5 rounded-lg bg-[#070a14] border text-left text-xs font-semibold flex items-center justify-between hover:bg-[#0e1322] cursor-pointer transition-all ${
                  profile.accentColor === col.id ? 'border-sky-400 bg-[#0e1322]' : 'border-[#1f293d]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${col.bg} border ${col.border}`}></span>
                  <span className="text-[#cbd5e0]">{col.name}</span>
                </div>
                {profile.accentColor === col.id && <span className="text-sky-400 text-[10px] font-bold">ACTIVE</span>}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Career Academy (Quests) + Saved Inventory Locker */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* Career Academy Quests Section */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Career Engineering Academy & Quests
              </h2>
              <p className="text-[11px] text-[#718096] mt-0.5">Realize project layouts in other sizing panels to trigger quest completions!</p>
            </div>
            <div className="px-3 py-1 bg-[#1e2d3d] border border-blue-500/30 rounded-lg text-xs font-mono font-bold text-blue-300">
              🎖️ XP Pool: {profile.xp}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
            {QUESTS.map((quest) => {
              const isCompleted = profile.completedQuests.includes(quest.id);
              return (
                <div 
                  key={quest.id} 
                  className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                    isCompleted 
                      ? 'bg-green-950/20 border-green-500/30' 
                      : quest.isMet && !isCompleted 
                        ? 'bg-blue-950/20 border-blue-500/45 animate-pulse'
                        : 'bg-[#0f1117] border-[#2d3748]'
                  }`}
                >
                  <div className="flex gap-2.5 items-start">
                    <span className="text-2xl mt-0.5">{quest.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white truncate uppercase tracking-wide">{quest.title}</span>
                        <span className="text-[9px] bg-indigo-950 text-indigo-300 font-mono font-bold px-1 rounded-sm flex-shrink-0">+{quest.xp} XP</span>
                      </div>
                      <p className="text-[10px] text-[#718096] leading-relaxed mt-0.5">{quest.desc}</p>
                      <div className="text-[9px] text-[#4a5568] font-bold mt-1.5 uppercase">Status: <span className={quest.isMet ? "text-green-400" : "text-amber-500"}>{quest.metric}</span></div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    {isCompleted ? (
                      <span className="text-[10px] text-green-400 font-bold flex items-center gap-1 bg-green-950/40 px-2 py-0.5 rounded-sm border border-green-500/30">
                        ✓ VERIFIED + CLAIMED
                      </span>
                    ) : quest.isMet ? (
                      <button
                        onClick={() => claimQuestXp(quest.id, quest.xp)}
                        className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded font-bold text-[10px] cursor-pointer shadow-lg shadow-blue-500/20 flex items-center gap-1 hover:scale-[1.03] transition-transform"
                      >
                        <Sparkles className="w-3 h-3" /> CLAIM REWARD
                      </button>
                    ) : (
                      <span className="text-[9px] text-[#4a5568] font-bold flex items-center gap-1 uppercase bg-gray-950/30 px-2 py-0.5 rounded border border-transparent">
                        <Lock className="w-2.5 h-2.5 text-[#4a5568]" /> IN PROGRESS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blueprint Locker & Inventory */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 shadow-lg flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-400" /> Professional Equipment Blueprint Locker (Inventory)
                </h2>
                <p className="text-[11px] text-[#718096] mt-0.5">Save your bespoke calculations, MCCs, or HVAC specifications as reusable inventory items. Insert them instantly back into any project workspace.</p>
              </div>
              <button 
                onClick={() => {
                  setProfile(prev => ({
                    ...prev,
                    inventory: DEFAULT_BLUEPRINTS
                  }));
                  showToast(true, 'Restored standard inventory blueprints.');
                }}
                className="p-1 px-2 text-[10px] text-blue-400 font-bold bg-blue-950/30 hover:bg-blue-950/60 border border-blue-500/20 rounded cursor-pointer flex items-center gap-1"
                title="Reset locker to pre-built items"
              >
                <RefreshCw className="w-3 h-3" /> Reload Defaults
              </button>
            </div>

            {/* Custom Template Creation Block */}
            <div className="bg-[#0f1117] border border-[#2d3748] rounded-lg p-3 mb-4 text-xs">
              <div className="font-semibold text-gray-300 mb-2 uppercase tracking-wide text-[10px]">📦 Lock Current Sizer Setup to Locker</div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-[9px] font-bold text-[#718096] mb-1.5 uppercase">Blueprint Template Label</label>
                  <input
                    type="text"
                    value={customBpName}
                    onChange={(e) => setCustomBpName(e.target.value)}
                    placeholder="e.g. Master Suite Daikin MultiVRF"
                    className="w-full px-2.5 py-1.5 bg-[#1a1f2e] border border-[#2d3748] rounded text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[9px] font-bold text-[#718096] mb-1.5 uppercase">Component Category</label>
                  <select
                    value={customBpType}
                    onChange={(e) => setCustomBpType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#1a1f2e] border border-[#2d3748] rounded text-[#cbd5e0] text-xs outline-none"
                  >
                    <option value="electrical">Electrical Panels</option>
                    <option value="hvac">HVAC Cooling Zones</option>
                    <option value="plumbing">Plumbing Fixtures</option>
                    <option value="fire">Sprinkler Suppression</option>
                    <option value="solar">Solar Arrays</option>
                    <option value="generator">Standby Generator</option>
                    <option value="smarthome">Smart Home relays</option>
                    <option value="cctv">CCTV Cameras</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <button
                    onClick={handleAddBlueprint}
                    className="w-full py-2 bg-gradient-to-r from-[#2b6cb0] to-blue-500 text-white rounded font-bold text-xs cursor-pointer shadow flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Locker Lock
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#4a5568] mt-1.5 leading-normal">
                *Locks the first configuration item currently scheduled in the selected tab as a global template for reuse.
              </p>
            </div>

            {/* Inventory Listing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {profile.inventory.length === 0 ? (
                <div className="sm:col-span-2 py-8 text-center text-xs text-[#718096] border border-dashed border-[#2d3748] rounded-xl">
                  Inventory is empty. Construct some calculations and lock them into your blueprints!
                </div>
              ) : (
                profile.inventory.map((item) => (
                  <div key={item.id} className="p-3 bg-[#0f1117] border border-[#2d3748] rounded-lg flex items-center justify-between hover:border-[#4a5568] transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs bg-[#1a2d37] text-blue-300 font-bold px-1.5 py-0.5 rounded uppercase">
                          {item.type}
                        </span>
                        <span className="font-bold text-xs text-[#e2e8f0] truncate">{item.name}</span>
                      </div>
                      <p className="text-[11px] text-[#718096] truncate">{item.specs}</p>
                    </div>

                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleInsertBlueprint(item)}
                        className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-[10px] rounded cursor-pointer transition-colors"
                        title="Load item blueprint into active project workspace"
                      >
                        LOAD INTO APP
                      </button>
                      <button
                        onClick={() => handleDeleteBlueprint(item.id, item.name)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded cursor-pointer"
                        title="Discard Blueprint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CHANGE PASSWORD MODAL CONTAINER */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordModal(false);
            }
          }}
        >
          <div className="w-full max-w-[400px] bg-[#0d1322]/20 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" /> Change Sizing Password
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-[#718096] mb-1 uppercase">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-2 bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#718096] mb-1 uppercase">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-2 bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#718096] mb-1 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-2 bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 bg-[#2d3748] border border-[#4a5568]/50 text-gray-300 font-semibold rounded cursor-pointer hover:bg-[#2d3748]/80 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded cursor-pointer text-xs"
                >
                  Update Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
