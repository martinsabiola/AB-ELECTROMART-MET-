import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, 
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
  isPinned?: boolean;
  setIsPinned?: (pinned: boolean) => void;
  activeTab?: string;
}

export default function SizingParamsSidebar({
  settings,
  setSettings,
  activeTab = 'electrical'
}: SizingParamsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'core' | 'rooms'>('core');
  const [newRoomName, setNewRoomName] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomError, setRoomError] = useState('');

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-sizing-params-sidebar', handleOpen);
    return () => window.removeEventListener('open-sizing-params-sidebar', handleOpen);
  }, []);

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
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-[#0d1322]/20 backdrop-blur-md border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-black/80 relative animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    📐 Sizing Parameters & Engineering Coefficients
                  </h3>
                  <p className="text-[10px] text-slate-400">Grid Supply Constants, Safety Margins & Zone Profiles</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Section Tabs */}
            <div className="flex bg-[#0a0d14] px-6 py-2.5 border-b border-[#202d44]/60 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSection('core')}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeSection === 'core'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-[#121824] text-gray-400 hover:text-gray-200 border border-[#202d44]'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400" /> Core System Coefficients
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('rooms')}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeSection === 'rooms'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                    : 'bg-[#121824] text-gray-400 hover:text-gray-200 border border-[#202d44]'
                }`}
              >
                <Home className="w-4 h-4 text-purple-400" /> Zones Register & Overrides
              </button>
            </div>

            {/* Parameters Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar text-xs">
              
              {/* SECTION A: CORE ELECTRICAL & SAFETY LIMITS */}
              {activeSection === 'core' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-xl p-4 space-y-3">
                    <span className="block text-xs text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> Grid Supply Constants
                    </span>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Supply Voltage (V)</label>
                        <input
                          type="number"
                          value={settings.voltage}
                          onChange={e => updateSetting('voltage', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Frequency (Hz)</label>
                        <input
                          type="number"
                          value={settings.frequency}
                          onChange={e => updateSetting('frequency', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Target Power Factor</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="1.0"
                          value={settings.powerFactor}
                          onChange={e => updateSetting('powerFactor', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Safety Margin (%)</label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          value={settings.safetyMargin}
                          onChange={e => updateSetting('safetyMargin', +e.target.value)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Demand Factor (%)</label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          max="100"
                          value={Math.round(settings.demandFactor * 100)}
                          onChange={e => updateSetting('demandFactor', +e.target.value / 100)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Diversity Factor (%)</label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          max="100"
                          value={Math.round(settings.diversityFactor * 100)}
                          onChange={e => updateSetting('diversityFactor', +e.target.value / 100)}
                          className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500 font-mono text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE TAB DYNAMIC COEFFICIENTS */}
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-xl p-4 space-y-3">
                    <span className="block text-xs text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      {activeTab === 'hvac' && <Wind className="w-4 h-4" />}
                      {activeTab === 'plumbing' && <Droplets className="w-4 h-4" />}
                      {activeTab === 'fire' && <Flame className="w-4 h-4" />}
                      {activeTab === 'solar' && <Sun className="w-4 h-4" />}
                      {activeTab === 'cctv' && <Tv className="w-4 h-4" />}
                      {(activeTab === 'electrical' || activeTab === 'industrial') && <Lightbulb className="w-4 h-4" />}
                      <span>{activeTab.toUpperCase()} Sizing Coefficients</span>
                    </span>

                    {/* HVAC specific */}
                    {activeTab === 'hvac' && (
                      <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Cooling Safety (%)</label>
                          <input
                            type="number"
                            value={settings.hvacSafetyFactor ?? 15}
                            onChange={e => updateSetting('hvacSafetyFactor', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Flow Ratio (CFM/kW)</label>
                          <input
                            type="number"
                            value={settings.hvacCfmPerKw ?? 80}
                            onChange={e => updateSetting('hvacCfmPerKw', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Air Change (ACH)</label>
                          <input
                            type="number"
                            value={settings.hvacAchDefault ?? 6}
                            onChange={e => updateSetting('hvacAchDefault', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Plumbing specific */}
                    {activeTab === 'plumbing' && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Velocity Limit (m/s)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={settings.plumbingVelocityLimit ?? 2.0}
                            onChange={e => updateSetting('plumbingVelocityLimit', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Pipe Roughness (mm)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={settings.plumbingPipeRoughness ?? 0.15}
                            onChange={e => updateSetting('plumbingPipeRoughness', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Fire specific */}
                    {activeTab === 'fire' && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Design Density (L/min/m²)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={settings.fireHazardDensity ?? 8.1}
                            onChange={e => updateSetting('fireHazardDensity', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Max Sprinkler Area (m²)</label>
                          <input
                            type="number"
                            value={settings.fireMaxSprinklerArea ?? 12}
                            onChange={e => updateSetting('fireMaxSprinklerArea', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* CCTV specific */}
                    {(activeTab === 'cctv' || activeTab === 'smarthome') && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">PoE Wattage limit (W/Port)</label>
                          <input
                            type="number"
                            value={settings.cctvPoeLimit ?? 15.4}
                            onChange={e => updateSetting('cctvPoeLimit', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Default Video Feed FPS</label>
                          <input
                            type="number"
                            value={settings.cctvDefaultFps ?? 15}
                            onChange={e => updateSetting('cctvDefaultFps', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* Lighting/Electrical base defaults */}
                    {(activeTab === 'electrical' || activeTab === 'industrial' || activeTab === 'solar' || activeTab === 'generator') && (
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-150 text-left">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Socket Target Area (m²/Sk)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.socketAreaFactor ?? 4.0}
                            onChange={e => updateSetting('socketAreaFactor', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Lighting Maintenance Factor</label>
                          <input
                            type="number"
                            step="0.05"
                            value={settings.lightMF ?? 0.8}
                            onChange={e => updateSetting('lightMF', +e.target.value)}
                            className="w-full bg-[#0a0d14] border border-[#202d44] rounded-lg p-2 text-xs text-white outline-none focus:border-sky-500 font-bold text-center"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION B: ROOM REGISTRATION & LUX OVERRIDES */}
              {activeSection === 'rooms' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* Create / Add Custom Room */}
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-xl p-4 space-y-2.5">
                    <span className="block text-xs text-purple-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Create Custom Zone / Room Profile
                    </span>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Server Room 2A, Cleanroom Lab..."
                        value={newRoomName}
                        onChange={e => setNewRoomName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomRoom();
                          }
                        }}
                        className="flex-1 bg-[#0a0d14] border border-[#202d44] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomRoom}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 rounded-lg cursor-pointer transition-colors shadow-md shadow-purple-950"
                      >
                        Add Zone
                      </button>
                    </div>

                    {roomError && (
                      <span className="text-[10px] text-red-400 block animate-pulse font-medium">{roomError}</span>
                    )}
                  </div>

                  {/* Overrides List with Search */}
                  <div className="bg-[#121824]/60 border border-[#202d44]/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#202d44]/60 pb-2">
                      <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">Registered Zone Profiles</span>
                      <span className="text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-700/40">{filteredRooms.length} Zones</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Search zones..."
                      value={roomSearch}
                      onChange={e => setRoomSearch(e.target.value)}
                      className="bg-[#0a0d14] border border-[#202d44]/80 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500 w-full font-semibold"
                    />

                    {/* Rooms List */}
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredRooms.length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500 italic">No matching zones found</div>
                      ) : (
                        filteredRooms.map(room => {
                          const isCustom = (settings.customRooms || []).includes(room);
                          const socketVal = (settings.customRoomSockets && settings.customRoomSockets[room]) || settings.socketAreaFactor || 4;
                          const luxVal = (settings.customRoomLux && settings.customRoomLux[room]) || ROOM_LUX_DATABASE[room as any] || 300;

                          return (
                            <div key={room} className="bg-[#0a0d14] border border-[#202d44]/80 rounded-lg p-3 space-y-2 relative group text-left">
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomRoom(room)}
                                  className="absolute top-2.5 right-2.5 text-red-400 hover:text-red-300 bg-red-950/50 hover:bg-red-900/50 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer transition-colors border border-red-900/40 opacity-0 group-hover:opacity-100"
                                  title={`Delete Custom Zone: ${room}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}

                              <div className="font-bold text-xs text-slate-200 truncate pr-8 block">
                                {room} {isCustom && <span className="text-[9px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded font-normal uppercase ml-1.5">Custom</span>}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="block text-[9px] text-slate-400 font-semibold mb-1 uppercase">🔌 Sockets (m²/Sk)</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    value={socketVal}
                                    onChange={e => updateRoomSockets(room, +e.target.value)}
                                    className="w-full bg-[#121824] border border-[#202d44]/50 rounded-lg px-2 py-1 text-xs text-white focus:border-purple-500 text-center font-mono font-semibold"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[9px] text-slate-400 font-semibold mb-1 uppercase">💡 Target Lux</span>
                                  <input
                                    type="number"
                                    step="25"
                                    min="20"
                                    value={luxVal}
                                    onChange={e => updateRoomLux(room, +e.target.value)}
                                    className="w-full bg-[#121824] border border-[#202d44]/50 rounded-lg px-2 py-1 text-xs text-white focus:border-purple-500 text-center font-mono font-semibold"
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
            <div className="px-6 py-3.5 border-t border-slate-800/80 bg-[#12192b]/95 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">📐 MEP ENGINEERING PARAMETER MATRIX</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-cyan-950 cursor-pointer transition-colors"
              >
                Done & Apply
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
