import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartDevice, ProjectSettings } from '../../types';
import { parseMEPFile } from '../../utils/mepImporter';
import { Settings, Plus, Trash2, FileSpreadsheet, Copy, Search } from 'lucide-react';
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

export const DEFAULT_SMART_DEVICE_TYPES = [
  'Smart Light / Bulb',
  'Smart Switch / Relay',
  'Motion Sensor',
  'Door/Window Sensor',
  'Thermostat',
  'Smart Lock',
  'Smart Plug',
  'Voice Assistant (Echo/Nest)',
  'Presence Detector',
  'IR Blaster',
  'Smart Curtain / Blind Driver',
  'IP Camera',
  'Other IoT Device',
];

export const DEFAULT_SMART_PROTOCOLS = ['Zigbee', 'Z-Wave', 'WiFi', 'Matter', 'Thread', 'BLE', 'KNX', 'Modbus'];
export const DEFAULT_SMART_PLATFORMS = ['Google Home', 'Amazon Alexa', 'Apple HomeKit', 'SmartThings', 'Home Assistant', 'Tuya', 'Philips Hue', 'KNX/Modbus Wired'];

interface SmartHomeTabProps {
  devices: SmartDevice[];
  setDevices: React.Dispatch<React.SetStateAction<SmartDevice[]>>;
  activeRooms?: string[];
  settings?: ProjectSettings;
  setSettings?: React.Dispatch<React.SetStateAction<ProjectSettings>>;
}

export default function SmartHomeTab({ devices, setDevices, activeRooms = [], settings, setSettings }: SmartHomeTabProps) {
  // Hidden File Input Ref for Imports
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // File Import Logic
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: true }));
      await new Promise(r => setTimeout(r, 100));
      const res = await parseMEPFile(file, [], settings);
      if (res.smartDevices && res.smartDevices.length > 0) {
        setDevices(prev => mode === 'replace' ? res.smartDevices! : [...prev, ...res.smartDevices!]);
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
      'Location / Room', 'Device Name', 'Brand', 'Protocol', 'Qty', 'Standby Power (W)', 'Smart Platform', 'Notes'
    ];
    
    const dataRows = devices.map(d => [
      d.room, d.device, d.brand, d.protocol, d.qty, d.watts, d.platform, d.notes
    ]);
    
    const allRows = [headers, ...dataRows];
    
    if (format === 'xlsx' || format === 'xls') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Smart Home Devices Schedule');
      XLSX.writeFile(wb, `Smart_Home_Devices_Schedule.${format}`);
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
      link.setAttribute('download', `Smart_Home_Devices_Schedule.${isCsv ? 'csv' : 'txt'}`);
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

    window.addEventListener('trigger-mep-import-smarthome', handleImportTrigger);
    window.addEventListener('trigger-mep-export-smarthome', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import-smarthome', handleImportTrigger);
      window.removeEventListener('trigger-mep-export-smarthome', handleExportTrigger);
    };
  }, [devices]);

  const availableRooms = activeRooms.length > 0
    ? activeRooms
    : ['Living Room 1', 'Master Room', 'Kitchen', 'Guest Room', 'Lobby'];

  // --- Collapsible Dropdowns State ---
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDevices = devices.filter(d => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (d.room && d.room.toLowerCase().includes(q)) ||
      (d.device && d.device.toLowerCase().includes(q)) ||
      (d.brand && d.brand.toLowerCase().includes(q)) ||
      (d.protocol && d.protocol.toLowerCase().includes(q)) ||
      (d.platform && d.platform.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q))
    );
  });
  const customCols = getCustomColumnsForTab('smarthome');

  // Scrollbar synchronisation
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const dummyScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(2100);
  const isSyncingScroll = useRef(false);

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
  }, [devices]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('electrical_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          'IoT Device Types': DEFAULT_SMART_DEVICE_TYPES,
          'IoT Protocols': DEFAULT_SMART_PROTOCOLS,
          'IoT Platforms': DEFAULT_SMART_PLATFORMS,
          'IoT Rooms': availableRooms,
          ...parsed
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      'IoT Device Types': DEFAULT_SMART_DEVICE_TYPES,
      'IoT Protocols': DEFAULT_SMART_PROTOCOLS,
      'IoT Platforms': DEFAULT_SMART_PLATFORMS,
      'IoT Rooms': availableRooms,
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

  // Dropdowns Manager Controls
  const [selectedKey, setSelectedKey] = useState('IoT Device Types');
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newListName, setNewListName] = useState('');

  // Sourced dropdown vectors
  const smartDeviceTypesList = dropdowns['IoT Device Types'] || DEFAULT_SMART_DEVICE_TYPES;
  const smartProtocolsList = dropdowns['IoT Protocols'] || DEFAULT_SMART_PROTOCOLS;
  const smartPlatformsList = dropdowns['IoT Platforms'] || DEFAULT_SMART_PLATFORMS;
  const roomsList = dropdowns['IoT Rooms'] || availableRooms;

  // Edit & Group By State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<string>('none');

  const clearTable = () => {
    if (confirm('Are you sure you want to clear all smart home devices from the schedule?')) {
      setDevices([]);
    }
  };

  const handleEditDevice = (dev: SmartDevice) => {
    setEditingId(dev.id);
    setNewDeviceForm({ ...dev });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  // --- Add Smart Device Overlay Modal State ---
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'physical' | 'iot'>('physical');
  const [newDeviceForm, setNewDeviceForm] = useState<Partial<SmartDevice>>({
    room: '',
    device: 'Smart Switch / Relay',
    brand: 'Sonoff ZBMINI',
    protocol: 'Zigbee',
    qty: 1,
    watts: 1.5,
    platform: 'Home Assistant',
    notes: '',
  });

  const addDevice = () => {
    setEditingId(null);
    setNewDeviceForm({
      room: roomsList[0] || 'Living Room 1',
      device: smartDeviceTypesList[0] || 'Smart Switch / Relay',
      brand: 'Sonoff ZBMINI',
      protocol: smartProtocolsList[0] || 'Zigbee',
      qty: 1,
      watts: 1.5,
      platform: smartPlatformsList[0] || 'Home Assistant',
      notes: '',
    });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  const handleSaveNewDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setDevices(prev => prev.map(item => item.id === editingId ? {
        ...item,
        room: newDeviceForm.room || item.room,
        device: newDeviceForm.device || item.device,
        brand: newDeviceForm.brand || item.brand,
        protocol: newDeviceForm.protocol || item.protocol,
        qty: newDeviceForm.qty !== undefined ? Number(newDeviceForm.qty) : item.qty,
        watts: newDeviceForm.watts !== undefined ? Number(newDeviceForm.watts) : item.watts,
        platform: newDeviceForm.platform || item.platform,
        notes: newDeviceForm.notes !== undefined ? newDeviceForm.notes : item.notes
      } : item));
      setEditingId(null);
    } else {
      const newDevice: SmartDevice = {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        room: newDeviceForm.room || roomsList[0] || 'Living Room 1',
        device: newDeviceForm.device || smartDeviceTypesList[0] || 'Smart Switch / Relay',
        brand: newDeviceForm.brand || 'Sonoff ZBMINI',
        protocol: newDeviceForm.protocol || smartProtocolsList[0] || 'Zigbee',
        qty: Number(newDeviceForm.qty) || 1,
        watts: Number(newDeviceForm.watts) || 1.5,
        platform: newDeviceForm.platform || smartPlatformsList[0] || 'Home Assistant',
        notes: newDeviceForm.notes || '',
      };
      setDevices(prev => [...prev, newDevice]);
    }
    setAddModalOpen(false);
  };

  const updateDeviceField = (id: string, key: keyof SmartDevice, value: any) => {
    setDevices(prev => prev.map(item => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeDevice = (id: string) => {
    if (confirm('Are you sure you want to remove this smart IoT device?')) {
      setDevices(prev => prev.filter(item => item.id !== id));
    }
  };

  const duplicateDevice = (id: string) => {
    const targetIdx = devices.findIndex(d => d.id === id);
    if (targetIdx === -1) return;
    const target = devices[targetIdx];
    const copy: SmartDevice = {
      ...target,
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    setDevices(prev => {
      const updated = [...prev];
      updated.splice(targetIdx + 1, 0, copy);
      return updated;
    });
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === devices.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...devices];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setDevices(updated);
  };

  // --- Dropdown Management Actions ---
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
    meta[name] = { tabId: 'smarthome', role: 'column_dropdown' };
    saveMepDropdownMetadata(meta);
    window.dispatchEvent(new Event('storage'));

    setSelectedKey(name);
    setNewListName('');
    alert(`Created custom list "${name}". We have automatically set it to display as a Custom Column in this tab. Add options to it!`);
  };

  const handleHarvestFromTable = (field: 'brand' | 'notes') => {
    const harvested = new Set<string>();
    devices.forEach(d => {
      const v = (d[field] || '').toString().trim();
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

  // Metrics
  const totalQty = devices.reduce((sum, item) => sum + (item.qty || 1), 0);
  const totalStandbyW = devices.reduce((sum, item) => sum + (item.watts || 0) * (item.qty || 1), 0);

  // Protocol count
  const protocolCounts = smartProtocolsList.reduce((acc, prot) => {
    acc[prot] = devices.filter(d => d.protocol === prot).reduce((sum, d) => sum + (d.qty || 1), 0);
    return acc;
  }, {} as Record<string, number>);

  const handleExportCSV = () => {
    let csv = `SMART HOME & IOT SYSTEM DESIGN REPORT\n\n`;
    csv += `Room/Area,Device Type,Brand/Model,Protocol,Platform,Qty,Standby Watts,Notes\n`;

    devices.forEach(d => {
      csv += `"${d.room}","${d.device}","${d.brand || ''}","${d.protocol}","${d.platform}",${d.qty},${d.watts},"${(d.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEP_SmartHome_Schedule.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Title block */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-base font-bold text-violet-400 flex items-center gap-2">
            <span>🏡</span> Smart Home & IoT Design
          </div>
          <div className="text-xs text-[#718096]">IoT ecosystem design, integration protocols, and standby power analysis</div>
        </div>

      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="bg-[#111522] border border-[#2b6cb0]/40 rounded-xl p-4 shadow-2xl space-y-4">
          <div className="text-xs font-bold text-violet-400 flex items-center gap-2 uppercase tracking-wider">
            <span>⚙️</span> Smart Home Dropdowns Config
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Configure dynamic lists for IoT Device Categories, Automation Protocols, smart Platforms, and Rooms.
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
                  {getCategoriesForTab('smarthome', dropdowns).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Sizing Router configuration */}
              <DropdownCategoryConfigPanel selectedKey={selectedKey} dropdowns={dropdowns} />

              <div className="bg-[#161a2b] p-3 rounded border border-[#2d3748]/50 space-y-2">
                <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider">Harvest From Table</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleHarvestFromTable('brand')}
                    className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer"
                  >
                    Brands/Models
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHarvestFromTable('notes')}
                    className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer"
                  >
                    Notes Column
                  </button>
                </div>
              </div>

              <div className="bg-[#161a2b] p-3 rounded border border-[#2d3748]/50 space-y-2">
                <span className="block text-[10px] text-teal-400 font-bold uppercase tracking-wider">Create Custom List</span>
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="e.g. Wire Types"
                    className="bg-[#0f1117] border border-[#2d3748] rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none w-full"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCustomCategory}
                    className="bg-teal-950/40 hover:bg-teal-900/50 border border-teal-700/50 text-teal-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer"
                  >
                    Create List
                  </button>
                </div>
              </div>
            </div>

            {/* Right option drawer */}
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
                        setSelectedKey(remaining[0] || 'IoT Device Types');
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
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer"
                >
                  Add Option
                </button>
              </div>

              <div className="bg-[#0c0f1a] border border-[#2d3748] rounded-md p-2 divide-y divide-[#2d3748]/30 max-h-[180px] overflow-y-auto flex-1 custom-scrollbar text-xs">
                {(dropdowns[selectedKey] || []).length === 0 ? (
                  <div className="text-center text-gray-500 py-6 italic">
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
                            className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="bg-gray-600 text-white text-[10px] font-bold px-2 py-0.5 rounded"
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

      {/* Hidden File Input for Smart Home Sizing Sheet Imports */}
      <input
        type="file"
        ref={importFileInputRef}
        className="hidden"
        accept=".xlsx,.xls,.csv,.txt,.json"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handleImportFile(e.target.files[0], 'append');
            e.target.value = '';
          }
        }}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Smart Devices', val: `${totalQty} Units`, col: 'text-violet-300' },
          { label: 'Standby Power Overhead', val: `${totalStandbyW.toFixed(1)} Watts`, col: 'text-[#63b3ed]' },
          { label: 'Unique Configurations', val: `${devices.length} Classes`, col: 'text-gray-400' },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-lg p-3 border bg-[#1a1f2e] border-[#2d3748]"
          >
            <div className="text-[9px] text-[#718096] mb-1 font-semibold uppercase tracking-wider">
              {card.label}
            </div>
            <div className={`text-base font-black font-mono ${card.col}`}>{card.val}</div>
          </div>
        ))}
      </div>

      {/* Protocols visual bar */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 shadow-md">
        <div className="text-xs font-bold text-[#718096] mb-3 uppercase tracking-wider">
          🛰️ Wireless & Wired Protocol Density (Active Nodes)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {Object.entries(protocolCounts).map(([prot, count]) => {
            const numCount = count as number;
            return (
              <div key={prot} className="bg-[#0f1117] rounded-lg p-2.5 border border-[#2d3748] text-center">
                <div className="text-[10px] text-[#718096] mb-0.5 font-semibold">{prot}</div>
                <div className={`text-sm font-black font-mono ${numCount > 0 ? 'text-violet-400' : 'text-gray-600'}`}>{numCount} Nodes</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* IoT Devices Schedule Table */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden shadow-xl">
        {/* Search & Group Bar */}
        <div className="sticky top-0 z-40 bg-[#13192a] p-3 border-b border-[#2d3748]/70 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-sky-400" />
              <span>Smart Home Devices Filter</span>
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
                <option value="device">Device Category</option>
                <option value="protocol">Protocol</option>
                <option value="platform">Platform</option>
              </select>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter devices by room, category, brand..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0f1117] border border-[#2d3748] rounded-md text-xs text-white placeholder-gray-600 outline-none focus:border-sky-500/80 transition-colors font-medium"
            />
          </div>
        </div>

        {/* Top Scrollbar */}
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="sticky top-12 z-30 overflow-x-auto w-full bg-[#13192a]/95 border-b border-[#2d3748]/60 custom-scrollbar shadow-md rounded-t-lg"
          style={{ height: '14px' }}
        >
          <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
        </div>

        <div
          ref={tableContainerRef}
          onScroll={handleTableScroll}
          className="sticky top-[48px] lg:top-[50px] z-30 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] relative custom-scrollbar border border-[#2d3748]/60 rounded-lg"
        >
          <table className="w-full border-collapse text-xs text-left min-w-[1000px]">
            <thead className="sticky top-0 bg-[#13192a] z-30 shadow">
              <tr className="bg-[#13192a] text-[#718096] uppercase text-[10px] tracking-wider border-b border-[#2d3748] font-bold font-mono">
                <th className="sticky top-0 left-0 z-40 bg-[#13192a] p-3 w-14 border-r border-[#2d3748]/60 text-center text-[#718096]">Drag</th>
                <th className="sticky top-0 left-14 z-40 bg-[#13192a] p-3 w-44 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">Location / Room</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-48">Smart Device Category</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-44">Brand & Model Name</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32">Protocol</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-40">Integration Platform</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-20 text-center">Qty</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center text-violet-400">Standby (W)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32 text-center text-violet-400">Total Standby</th>
                <RenderCustomHeaders tabId="smarthome" />
                <th className="sticky top-0 z-30 bg-[#13192a] p-3">Notes</th>
                <th className="sticky top-0 right-0 z-40 bg-[#13192a] p-3 w-20 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748]/40">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={11 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No Smart home devices listed yet. Click "+ Add IoT Device" to configure schedule.
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={11 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No Smart home devices match your search query.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const originalIdx = devices.findIndex(d => d.id === dev.id);
                  const totalStandby = (dev.watts || 0) * (dev.qty || 1);

                  const isBeingDragged = draggedIndex === originalIdx;

                  return (
                    <tr
                      key={dev.id}
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
                          const updated = [...devices];
                          const [moved] = updated.splice(draggedIndex, 1);
                          updated.splice(originalIdx, 0, moved);
                          setDevices(updated);
                        }
                        setDraggedIndex(null);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                      className={`hover:bg-[#1e2538]/50 transition-colors ${
                        isBeingDragged ? 'bg-sky-950 border-y-2 border-sky-500' : 'bg-[#161a26]'
                      }`}
                    >
                      {/* Sticky Drag Handle */}
                      <td className="sticky left-0 z-20 bg-[#151a26] p-2 w-14 min-w-[56px] max-w-[56px] text-center border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)] cursor-grab active:cursor-grabbing text-gray-500 hover:text-sky-400 select-none">
                        <span className="text-base font-bold">☰</span>
                      </td>

                      {/* Sticky Location */}
                      <td className="sticky left-14 z-20 bg-[#151a26] p-2 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">
                        <RoomSelector
                          value={dev.room}
                          onChange={val => updateDeviceField(dev.id, 'room', val)}
                          settings={settings}
                          placeholder="Room..."
                        />
                      </td>

                      {/* Device type */}
                      <td className="p-2">
                        <select
                          value={dev.device}
                          onChange={e => updateDeviceField(dev.id, 'device', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none font-semibold text-violet-400"
                        >
                          {smartDeviceTypesList.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>

                      {/* Brand & model */}
                      <td className="p-2">
                        <input
                          value={dev.brand || ''}
                          onChange={e => updateDeviceField(dev.id, 'brand', e.target.value)}
                          placeholder="e.g. Sonoff ZBMINI"
                          className="bg-[#0f1117]/40 border border-[#2d3748] rounded px-2 py-1 text-white w-full outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Protocol select */}
                      <td className="p-2">
                        <select
                          value={dev.protocol}
                          onChange={e => updateDeviceField(dev.id, 'protocol', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                        >
                          {smartProtocolsList.map(prot => (
                            <option key={prot} value={prot}>{prot}</option>
                          ))}
                        </select>
                      </td>

                      {/* Platform select */}
                      <td className="p-2">
                        <select
                          value={dev.platform}
                          onChange={e => updateDeviceField(dev.id, 'platform', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                        >
                          {smartPlatformsList.map(plat => (
                            <option key={plat} value={plat}>{plat}</option>
                          ))}
                        </select>
                      </td>

                      {/* Qty */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={dev.qty || 1}
                          onChange={e => updateDeviceField(dev.id, 'qty', Math.ceil(parseFloat(e.target.value) || 1))}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-12 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Standby Watts */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={dev.watts !== undefined ? dev.watts : 1.5}
                          onChange={e => updateDeviceField(dev.id, 'watts', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-16 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Total Standby Watts (derived) */}
                      <td className="p-2 text-center text-violet-400 font-bold font-mono bg-[#141a29]/40">
                        {totalStandby.toFixed(1)} W
                      </td>

                      <RenderCustomCells
                        tabId="smarthome"
                        row={dev}
                        dropdowns={dropdowns}
                        onChange={(val) => updateDeviceField(dev.id, 'customValues' as any, val)}
                      />

                      {/* Notes */}
                      <td className="p-2">
                        <input
                          value={dev.notes || ''}
                          onChange={e => updateDeviceField(dev.id, 'notes', e.target.value)}
                          placeholder="Device details..."
                          className="bg-transparent text-gray-300 px-1 py-0.5 outline-none focus:border-b focus:border-violet-500 w-full"
                        />
                      </td>

                      {/* Actions */}
                      <td className="sticky right-0 z-10 bg-[#151a26] p-2 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditDevice(dev)}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 rounded transition-all cursor-pointer"
                            title="Edit Device"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => duplicateDevice(dev.id)}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded transition-all cursor-pointer"
                            title="Duplicate Device"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => removeDevice(dev.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-[#2c1a1e] rounded transition-all cursor-pointer"
                            title="Delete Device"
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
              Total Devices: <span className="text-sky-400 font-bold">{devices.length}</span>
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
              onClick={addDevice}
              className="bg-sky-600 hover:bg-sky-500 border border-sky-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-lg shadow-sky-500/20 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add IoT Device
            </button>
          </div>
        </div>
      </div>

      {/* Add Smart Device Overlay Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm overflow-y-auto font-sans"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setAddModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-[#0d1322]/20 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/80 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white my-8 animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-[#12192b]/95 shrink-0">
                <div>
                  <h3 className="font-sans font-bold text-base text-violet-400 flex items-center gap-2">
                    <span>🎛️</span> Add Smart IoT Device
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure room location, smart communication protocol, integration platforms, and standby loads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b border-[#2d3748] bg-[#0c101b] p-1 gap-1">
                {(['physical', 'iot'] as const).map((t) => {
                  const labels = {
                    physical: { title: '1. Location', desc: 'Target Room Selector' },
                    iot: { title: '2. IoT Device Specs', desc: 'Category, Brand, Protocol & Platform' }
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTab(t)}
                      className={`flex-1 py-2 px-3 rounded-md transition-all text-left cursor-pointer ${
                        modalTab === t
                          ? 'bg-[#1e3a5f] text-violet-300 border border-violet-500/40 shadow'
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
              <form onSubmit={handleSaveNewDevice} className="p-5 overflow-y-auto space-y-4 flex-1 text-left select-none max-h-[60vh]">
                {modalTab === 'physical' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Target Room Name <span className="text-red-400">*</span>
                      </label>
                      <RoomSelector
                        value={newDeviceForm.room || ''}
                        onChange={(val) => setNewDeviceForm(prev => ({ ...prev, room: val }))}
                        settings={settings}
                        placeholder="Select or search target installation room..."
                      />
                    </div>
                    <div className="bg-[#0c101b] border border-[#2d3748]/50 p-4 rounded-lg">
                      <span className="text-xs text-gray-400 leading-relaxed block">
                        Linking smart switches, controllers, and sensors directly with registered rooms tracks IoT coverage zones and smart home device density accurately.
                      </span>
                    </div>
                  </div>
                )}

                {modalTab === 'iot' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Device type */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          IoT Device Category
                        </label>
                        <select
                          value={newDeviceForm.device || 'Smart Switch / Relay'}
                          onChange={(e) => setNewDeviceForm(prev => ({ ...prev, device: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-violet-500 font-semibold cursor-pointer"
                        >
                          {smartDeviceTypesList.map((dType) => (
                            <option key={dType} value={dType}>{dType}</option>
                          ))}
                        </select>
                      </div>

                      {/* Brand / Model */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Brand / Model
                        </label>
                        <input
                          type="text"
                          value={newDeviceForm.brand || ''}
                          onChange={(e) => setNewDeviceForm(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="e.g. Sonoff ZBMINI"
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Protocol */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Wireless / Wired Protocol
                        </label>
                        <select
                          value={newDeviceForm.protocol || 'Zigbee'}
                          onChange={(e) => setNewDeviceForm(prev => ({ ...prev, protocol: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-violet-500 font-semibold cursor-pointer"
                        >
                          {smartProtocolsList.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      {/* Integration Platform */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          IoT Platform
                        </label>
                        <select
                          value={newDeviceForm.platform || 'Home Assistant'}
                          onChange={(e) => setNewDeviceForm(prev => ({ ...prev, platform: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-violet-500 font-semibold cursor-pointer"
                        >
                          {smartPlatformsList.map((pf) => (
                            <option key={pf} value={pf}>{pf}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Standby Watts */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Standby Power (Watts)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={newDeviceForm.watts ?? 1.5}
                          onChange={(e) => setNewDeviceForm(prev => ({ ...prev, watts: Number(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-violet-500 font-mono"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newDeviceForm.qty || 1}
                          onChange={(e) => setNewDeviceForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Notes & Comments
                      </label>
                      <input
                        type="text"
                        value={newDeviceForm.notes || ''}
                        onChange={(e) => setNewDeviceForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional IP, MAC, pairing code, or cabling comments..."
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="p-5 border-t border-[#2d3748] flex justify-end gap-3 bg-[#0c101b] shrink-0">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="bg-[#1a2035] hover:bg-[#252d4a] border border-[#3b4970] text-gray-300 text-xs font-bold px-4 py-2 rounded cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-500 border border-violet-400 text-white text-xs font-bold px-5 py-2 rounded cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <span>🎛️</span> Save Device
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
