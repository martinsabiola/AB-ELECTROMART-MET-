import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pin, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Home, 
  Plus, 
  Trash2, 
  Wind, 
  Droplets, 
  Flame, 
  Sun, 
  Tv, 
  Lightbulb
} from 'lucide-react';
import { ProjectSettings, ROOM_LUX_DATABASE } from '../../types';

interface SizingParamsSidebarProps {
  settings: ProjectSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProjectSettings>>;
  isPinned: boolean;
  setIsPinned: (pinned: boolean) => void;
  activeTab?: string;
}

export default function SizingParamsSidebar({
  settings,
  setSettings,
  isPinned,
  setIsPinned,
  activeTab = 'electrical'
}: SizingParamsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'core' | 'rooms'>('core');
  const [newRoomName, setNewRoomName] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomError, setRoomError] = useState('');

  const isExpanded = isOpen || isPinned;

  // Auto-collapse if not pinned and cursor leaves
  const handleMouseLeave = () => {
    if (!isPinned) setIsOpen(false);
  };

  const handleMouseEnter = () => {
    if (!isPinned) setIsOpen(true);
  };

  // Compile full room list
  const dynamicRoomList = useMemo(() => {
    return Array.from(new Set([
      ...Object.keys(ROOM_LUX_DATABASE),
      ...(settings.customRooms || [])
    ]));
  }, [settings.customRooms]);

  // Filtered rooms for the overrides section
  const filteredRooms = useMemo(() => {
    const q = roomSearch.toLowerCase().trim();
    if (!q) return dynamicRoomList;
    return dynamicRoomList.filter(r => r.toLowerCase().includes(q));
  }, [dynamicRoomList, roomSearch]);

  const updateSetting = (key: keyof ProjectSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddCustomRoom = () => {
    const trimmed = newRoomName.trim();
    if (!trimmed) return;
    
    const exists = dynamicRoomList.some(r => r.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setRoomError(`Room "${trimmed}" already exists!`);
      setTimeout(() => setRoomError(''), 3000);
      return;
    }

    setSettings(prev => ({
      ...prev,
      customRooms: [...(prev.customRooms || []), trimmed]
    }));
    setNewRoomName('');
    setRoomError('');
  };

  const handleRemoveCustomRoom = (name: string) => {
    setSettings(prev => ({
      ...prev,
      customRooms: (prev.customRooms || []).filter(r => r !== name)
    }));
  };

  const updateRoomSockets = (room: string, val: number) => {
    setSettings(prev => {
      const current = { ...(prev.customRoomSockets || {}) };
      current[room] = val;
      return { ...prev, customRoomSockets: current };
    });
  };

  const updateRoomLux = (room: string, val: number) => {
    setSettings(prev => {
      const current = { ...(prev.customRoomLux || {}) };
      current[room] = val;
      return { ...prev, customRoomLux: current };
    });
  };

  return (
    <div 
      className="relative z-[100] flex"
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Slim hover strip on left edge (Always visible when collapsed or floating) */}
      {!isExpanded && (
        <div
          onMouseEnter={handleMouseEnter}
          onClick={() => setIsOpen(true)}
          className="w-12 h-screen bg-[#0d111a]/95 border-r border-[#1a243a] flex flex-col items-center py-6 gap-8 cursor-pointer select-none text-gray-400 hover:text-white hover:bg-[#111622] transition-all duration-300 shadow-2xl shrink-0 group"
          title="Hover or Click to open Sizing Parameters"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Sliders className="w-4 h-4" />
          </div>

          <div className="flex-1 flex items-center justify-center">
            <span 
              className="font-bold text-[10px] tracking-[0.3em] text-gray-500 uppercase select-none whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              📐 Sizing Parameters
            </span>
          </div>

          <div className="w-8 h-8 rounded-full border border-[#2d3748] flex items-center justify-center text-gray-500 group-hover:text-sky-400 transition-colors">
            <ChevronRight className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      )}

      {/* 2. Full Sidebar Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className={`h-screen bg-[#0d111a]/98 backdrop-blur-md border-r border-[#202d44] flex flex-col overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.6)] ${
              isPinned ? 'relative' : 'absolute left-0 top-0'
            }`}
          >
            {/* Header */}
            <div className="p-4 bg-[#0a0d14] border-b border-[#202d44] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">Sizing Parameters</h3>
                  <p className="text-[9px] text-[#4a5568]">Engineering Coefficients & Calibrations</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Pin/Unpin Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    isPinned 
                      ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' 
                      : 'text-[#4a5568] hover:text-white border border-transparent'
                  }`}
                  title={isPinned ? 'Unpin Sidebar (Floating Auto-hide)' : 'Pin Sidebar to Workspace Layout'}
                >
                  <Pin className="w-3.5 h-3.5 rotate-45" />
                </button>

                {/* Manual Close if Floating */}
                {!isPinned && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-md text-[#4a5568] hover:text-white transition-all cursor-pointer border border-transparent"
                    title="Collapse Sidebar"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-[#0a0d14] p-1 border-b border-[#202d44]/60 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSection('core')}
                className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === 'core'
                    ? 'bg-[#151c2c] text-amber-300 border-b-2 border-amber-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Core System
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('rooms')}
                className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === 'rooms'
                    ? 'bg-[#151c2c] text-purple-300 border-b-2 border-purple-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Home className="w-3.5 h-3.5" /> Zones Register
              </button>
            </div>

            {/* Parameters Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
              {/* SECTION A: CORE ELECTRICAL & SAFETY LIMITS */}
              {activeSection === 'core' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-lg p-3 space-y-3">
                    <span className="block text-[10px] text-amber-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Grid Supply Constants
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Supply Voltage (V)</label>
                        <input
                          type="number"
                          value={settings.voltage}
                          onChange={e => updateSetting('voltage', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Frequency (Hz)</label>
                        <input
                          type="number"
                          value={settings.frequency}
                          onChange={e => updateSetting('frequency', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Target Power Factor</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="1.0"
                          value={settings.powerFactor}
                          onChange={e => updateSetting('powerFactor', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Safety Margin (%)</label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          value={settings.safetyMargin}
                          onChange={e => updateSetting('safetyMargin', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Demand Factor (%)</label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          max="100"
                          value={Math.round(settings.demandFactor * 100)}
                          onChange={e => updateSetting('demandFactor', +e.target.value / 100)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Diversity Factor (%)</label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          max="100"
                          value={Math.round(settings.diversityFactor * 100)}
                          onChange={e => updateSetting('diversityFactor', +e.target.value / 100)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE TAB DYNAMIC COEFFICIENTS */}
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-lg p-3 space-y-3">
                    <span className="block text-[10px] text-sky-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                      {activeTab === 'hvac' && <Wind className="w-3.5 h-3.5" />}
                      {activeTab === 'plumbing' && <Droplets className="w-3.5 h-3.5" />}
                      {activeTab === 'fire' && <Flame className="w-3.5 h-3.5" />}
                      {activeTab === 'solar' && <Sun className="w-3.5 h-3.5" />}
                      {activeTab === 'cctv' && <Tv className="w-3.5 h-3.5" />}
                      {(activeTab === 'electrical' || activeTab === 'industrial') && <Lightbulb className="w-3.5 h-3.5" />}
                      <span>{activeTab.toUpperCase()} Sizing Coefficients</span>
                    </span>

                    {/* HVAC specific */}
                    {activeTab === 'hvac' && (
                      <div className="space-y-3 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Cooling Safety Factor (%)</label>
                          <input
                            type="number"
                            value={settings.hvacSafetyFactor ?? 15}
                            onChange={e => updateSetting('hvacSafetyFactor', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Flow Ratio (CFM per kW)</label>
                          <input
                            type="number"
                            value={settings.hvacCfmPerKw ?? 80}
                            onChange={e => updateSetting('hvacCfmPerKw', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Air Change Rate (ACH)</label>
                          <input
                            type="number"
                            value={settings.hvacAchDefault ?? 6}
                            onChange={e => updateSetting('hvacAchDefault', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Plumbing specific */}
                    {activeTab === 'plumbing' && (
                      <div className="space-y-3 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Velocity Limit (m/s)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={settings.plumbingVelocityLimit ?? 2.0}
                            onChange={e => updateSetting('plumbingVelocityLimit', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Pipe Roughness (mm)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={settings.plumbingPipeRoughness ?? 0.15}
                            onChange={e => updateSetting('plumbingPipeRoughness', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Fire specific */}
                    {activeTab === 'fire' && (
                      <div className="space-y-3 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Design Density (L/min/m²)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={settings.fireHazardDensity ?? 8.1}
                            onChange={e => updateSetting('fireHazardDensity', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Max Sprinkler Area (m²)</label>
                          <input
                            type="number"
                            value={settings.fireMaxSprinklerArea ?? 12}
                            onChange={e => updateSetting('fireMaxSprinklerArea', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* CCTV specific */}
                    {(activeTab === 'cctv' || activeTab === 'smarthome') && (
                      <div className="space-y-3 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">PoE Wattage limit per Port (W)</label>
                          <input
                            type="number"
                            value={settings.cctvPoeLimit ?? 15.4}
                            onChange={e => updateSetting('cctvPoeLimit', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Default Video Feed FPS</label>
                          <input
                            type="number"
                            value={settings.cctvDefaultFps ?? 15}
                            onChange={e => updateSetting('cctvDefaultFps', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Lighting/Electrical base defaults */}
                    {(activeTab === 'electrical' || activeTab === 'industrial' || activeTab === 'solar' || activeTab === 'generator') && (
                      <div className="space-y-3 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Socket Target Area (m²/Sk)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.socketAreaFactor ?? 4.0}
                            onChange={e => updateSetting('socketAreaFactor', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#718096] mb-1 uppercase font-semibold">Lighting Maintenance Factor</label>
                          <input
                            type="number"
                            step="0.05"
                            value={settings.lightMF ?? 0.8}
                            onChange={e => updateSetting('lightMF', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded p-1.5 text-xs text-white outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION B: ROOM REGISTRATION & LUX OVERRIDES */}
              {activeSection === 'rooms' && (
                <div className="space-y-4 animate-in fade-in duration-200 flex flex-col h-full">
                  
                  {/* Create / Add Custom Room */}
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-lg p-3 space-y-2 shrink-0">
                    <span className="block text-[10px] text-purple-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Create Custom Room
                    </span>
                    
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. Server Room 2A"
                        value={newRoomName}
                        onChange={e => setNewRoomName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomRoom();
                          }
                        }}
                        className="flex-1 bg-[#0a0d14] border border-[#202d44] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomRoom}
                        className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[11px] font-bold px-3 rounded cursor-pointer transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {roomError && (
                      <span className="text-[9px] text-red-400 block animate-pulse font-medium">{roomError}</span>
                    )}
                  </div>

                  {/* Overrides List with Search */}
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-lg p-3 flex flex-col flex-1 overflow-hidden min-h-[200px]">
                    <div className="flex items-center justify-between border-b border-[#202d44]/60 pb-2 mb-2.5 shrink-0">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Registered Zone Profiles</span>
                      <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded-full font-bold">{filteredRooms.length}</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Search zones..."
                      value={roomSearch}
                      onChange={e => setRoomSearch(e.target.value)}
                      className="bg-[#0a0d14] border border-[#202d44]/80 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500 mb-2 w-full shrink-0 font-semibold"
                    />

                    {/* Rooms Scroll Area */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[360px] custom-scrollbar">
                      {filteredRooms.length === 0 ? (
                        <div className="text-center py-4 text-xs text-gray-500 italic">No matching zones found</div>
                      ) : (
                        filteredRooms.map(room => {
                          const isCustom = (settings.customRooms || []).includes(room);
                          const socketVal = (settings.customRoomSockets && settings.customRoomSockets[room]) || settings.socketAreaFactor || 4;
                          const luxVal = (settings.customRoomLux && settings.customRoomLux[room]) || ROOM_LUX_DATABASE[room as any] || 300;

                          return (
                            <div key={room} className="bg-[#0a0d14] border border-[#202d44]/80 rounded-md p-2.5 space-y-2 relative group text-left">
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomRoom(room)}
                                  className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-300 bg-red-950/50 hover:bg-red-900/50 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer transition-colors border border-red-900/40 opacity-0 group-hover:opacity-100"
                                  title={`Delete Custom Zone: ${room}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}

                              <div className="font-bold text-[11px] text-[#e2e8f0] truncate pr-6 block">
                                {room} {isCustom && <span className="text-[8px] bg-purple-900/50 text-purple-300 px-1 rounded font-normal uppercase ml-1">Custom</span>}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="block text-[8px] text-gray-400 font-bold mb-0.5 uppercase">🔌 Sockets (m²/Sk)</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    value={socketVal}
                                    onChange={e => updateRoomSockets(room, +e.target.value)}
                                    className="w-full bg-[#121824] border border-[#202d44]/50 rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] focus:border-purple-500 text-center font-mono font-semibold"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[8px] text-gray-400 font-bold mb-0.5 uppercase">💡 Target Lux</span>
                                  <input
                                    type="number"
                                    step="25"
                                    min="20"
                                    value={luxVal}
                                    onChange={e => updateRoomLux(room, +e.target.value)}
                                    className="w-full bg-[#121824] border border-[#202d44]/50 rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] focus:border-purple-500 text-center font-mono font-semibold"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="p-3 bg-[#0a0d14] border-t border-[#202d44] text-[9px] text-[#718096] text-center flex items-center justify-center gap-1 shrink-0 select-none">
              <span>📐 MEP INTEGRATED PARAMETERS</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
