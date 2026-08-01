import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SolarLoad, SolarConfig } from '../../types';
import { parseMEPFile } from '../../utils/mepImporter';
import { SOLAR_LOAD_DATABASE } from '../../utils/solarLoadDatabase';
import { Settings, Plus, Trash2, FileSpreadsheet, Copy, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getCategoriesForTab,
  getCustomColumnsForTab,
  getMepDropdownMetadata,
  saveMepDropdownMetadata,
  RenderCustomHeaders,
  RenderCustomCells,
  DropdownCategoryConfigPanel
} from '../../utils/dropdownMetadata';

export const DEFAULT_INVERTER_TYPES = ['Pure Sine Wave', 'Modified Sine Wave', 'Hybrid'];
export const DEFAULT_BATTERY_TYPES = ['Lithium (LiFePO4)', 'AGM', 'Gel', 'Flooded Lead-Acid'];
export const DEFAULT_PANEL_WATTAGES = ['100', '150', '200', '250', '300', '350', '400', '450', '500', '550', '600'];

interface SolarTabProps {
  loads: SolarLoad[];
  setLoads: React.Dispatch<React.SetStateAction<SolarLoad[]>>;
  config: SolarConfig;
  setConfig: React.Dispatch<React.SetStateAction<SolarConfig>>;
}

export default function SolarTab({ loads, setLoads, config, setConfig }: SolarTabProps) {
  // Hidden File Input Ref for Imports
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // File Import Logic
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: true }));
      await new Promise(r => setTimeout(r, 100));
      const res = await parseMEPFile(file, []);
      if (res.solarLoads && res.solarLoads.length > 0) {
        setLoads(prev => mode === 'replace' ? res.solarLoads! : [...prev, ...res.solarLoads!]);
      }
      if (res.solarCfg && Object.keys(res.solarCfg).length > 0) {
        setConfig(prev => ({ ...prev, ...res.solarCfg }));
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
      'Description / Load Name', 'Power (Watts)', 'Quantity', 'Hours / Day', 'Daily Watt-Hours', 'Notes'
    ];
    
    const dataRows = loads.map(l => [
      l.description, l.watts, l.qty, l.hoursPerDay, (l.watts * l.qty * l.hoursPerDay).toFixed(1), l.notes
    ]);
    
    const allRows = [headers, ...dataRows];
    
    if (format === 'xlsx' || format === 'xls') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Solar Load Schedule');
      XLSX.writeFile(wb, `Solar_Load_Schedule.${format}`);
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
      link.setAttribute('download', `Solar_Load_Schedule.${isCsv ? 'csv' : 'txt'}`);
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

    window.addEventListener('trigger-mep-import-solar', handleImportTrigger);
    window.addEventListener('trigger-mep-export-solar', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import-solar', handleImportTrigger);
      window.removeEventListener('trigger-mep-export-solar', handleExportTrigger);
    };
  }, [loads]);

  // --- Collapsible Dropdowns State ---
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLoads = loads.filter(load => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (load.category && load.category.toLowerCase().includes(q)) ||
      (load.subCategory && load.subCategory.toLowerCase().includes(q)) ||
      (load.description && load.description.toLowerCase().includes(q)) ||
      (load.notes && load.notes.toLowerCase().includes(q))
    );
  });
  const customCols = getCustomColumnsForTab('solar');

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
  }, [loads]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('electrical_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          'Inverter Types': DEFAULT_INVERTER_TYPES,
          'Battery Types': DEFAULT_BATTERY_TYPES,
          'Panel Wattages (W)': DEFAULT_PANEL_WATTAGES,
          ...parsed
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      'Inverter Types': DEFAULT_INVERTER_TYPES,
      'Battery Types': DEFAULT_BATTERY_TYPES,
      'Panel Wattages (W)': DEFAULT_PANEL_WATTAGES
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
  const [selectedKey, setSelectedKey] = useState('Inverter Types');
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newListName, setNewListName] = useState('');

  // Sourced dropdown vectors
  const inverterTypesList = dropdowns['Inverter Types'] || DEFAULT_INVERTER_TYPES;
  const batteryTypesList = dropdowns['Battery Types'] || DEFAULT_BATTERY_TYPES;
  const panelWattagesList = dropdowns['Panel Wattages (W)'] || DEFAULT_PANEL_WATTAGES;

  // Edit & Group By State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<string>('none');

  // Parameters View Mode State (Grid, Tabs, Table)
  const [paramsViewMode, setParamsViewMode] = useState<'grid' | 'tabs' | 'table'>('grid');
  const [paramsActiveTab, setParamsActiveTab] = useState<'pv' | 'battery' | 'inverter'>('pv');

  const clearTable = () => {
    if (confirm('Are you sure you want to clear all solar backup loads from the schedule?')) {
      setLoads([]);
    }
  };

  const handleEditLoad = (load: SolarLoad) => {
    setEditingId(load.id);
    setNewLoadForm({ ...load });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  // --- Add Solar Load Overlay Modal State ---
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'physical' | 'solar_spec'>('physical');
  const [newLoadForm, setNewLoadForm] = useState<Partial<SolarLoad>>({
    category: '',
    subCategory: '',
    description: '',
    watts: 150,
    qty: 1,
    hoursPerDay: 4,
    notes: '',
  });

  const addLoad = () => {
    setEditingId(null);
    setNewLoadForm({
      category: '',
      subCategory: '',
      description: `Load ${loads.length + 1}`,
      watts: 150,
      qty: 1,
      hoursPerDay: 4,
      notes: '',
    });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  const handleSaveNewLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setLoads(prev => prev.map(item => item.id === editingId ? {
        ...item,
        category: newLoadForm.category !== undefined ? newLoadForm.category : item.category,
        subCategory: newLoadForm.subCategory !== undefined ? newLoadForm.subCategory : item.subCategory,
        description: newLoadForm.description || item.description,
        watts: Number(newLoadForm.watts) || item.watts,
        qty: Number(newLoadForm.qty) || item.qty,
        hoursPerDay: Number(newLoadForm.hoursPerDay) || item.hoursPerDay,
        notes: newLoadForm.notes !== undefined ? newLoadForm.notes : item.notes
      } : item));
      setEditingId(null);
    } else {
      const newLoad: SolarLoad = {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        category: newLoadForm.category || '',
        subCategory: newLoadForm.subCategory || '',
        description: newLoadForm.description || `Load ${loads.length + 1}`,
        watts: Number(newLoadForm.watts) || 150,
        qty: Number(newLoadForm.qty) || 1,
        hoursPerDay: Number(newLoadForm.hoursPerDay) || 4,
        notes: newLoadForm.notes || '',
      };
      setLoads(prev => [...prev, newLoad]);
    }
    setAddModalOpen(false);
  };

  const updateLoadField = (id: string, key: keyof SolarLoad, value: any) => {
    setLoads(prev => prev.map(item => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeLoad = (id: string) => {
    if (confirm('Are you sure you want to remove this solar load item?')) {
      setLoads(prev => prev.filter(item => item.id !== id));
    }
  };

  const duplicateLoad = (id: string) => {
    const targetIdx = loads.findIndex(item => item.id === id);
    if (targetIdx === -1) return;
    const target = loads[targetIdx];
    const copy: SolarLoad = {
      ...target,
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    setLoads(prev => {
      const updated = [...prev];
      updated.splice(targetIdx + 1, 0, copy);
      return updated;
    });
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === loads.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...loads];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setLoads(updated);
  };

  const updateConfig = (key: keyof SolarConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
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
    meta[name] = { tabId: 'solar', role: 'column_dropdown' };
    saveMepDropdownMetadata(meta);
    window.dispatchEvent(new Event('storage'));

    setSelectedKey(name);
    setNewListName('');
    alert(`Created custom list "${name}". We have automatically set it to display as a Custom Column in this tab. Add options to it!`);
  };

  const handleHarvestFromTable = (field: 'description' | 'notes') => {
    const harvested = new Set<string>();
    loads.forEach(l => {
      const v = (l[field] || '').toString().trim();
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

  // Sizing Calculations
  const dailyEnergyWh = loads.reduce((sum, item) => sum + (item.watts || 0) * (item.qty || 1) * (item.hoursPerDay || 0), 0);
  const totalW = loads.reduce((sum, item) => sum + (item.watts || 0) * (item.qty || 1), 0);

  // Array size needed = (Daily Energy / Inverter Efficiency) / (Panel Wattage * Peak Sun Hours)
  const adjustedEnergyWh = dailyEnergyWh / (config.inverterEff || 0.9);
  const panelCountNeeded = Math.ceil(adjustedEnergyWh / ((config.panelWattage || 400) * (config.peakSunHours || 5)));
  const arraySizeKWp = (panelCountNeeded * (config.panelWattage || 400)) / 1000;

  // Battery sizing = (Daily Energy * Autonomy) / (DOD * Battery Efficiency)
  const batteryEnergyWh = (dailyEnergyWh * (config.daysAutonomy || 1)) / ((config.dod || 0.8) * (config.batteryEff || 0.85));
  // Batteries in Ah = Battery Energy Wh / (Ah * battery nominal voltage)
  const batteryAhNeeded = Math.ceil(batteryEnergyWh / ((config.batteryAh || 200) * (config.batteryVoltage || 12)));
  const totalAhCapacity = batteryAhNeeded * (config.batteryAh || 200);

  // Inverter rating minimum sizing kW = (Total Load W * Safety Factor) / 1000
  const minInverterKW = totalW > 0 ? ((totalW * (config.safetyFactor || 1.25)) / 1000).toFixed(2) : '0';

  const handleExportCSV = () => {
    let csv = `SOLAR PV & INVERTER SIZING SCHEDULE REPORT\n\n`;
    csv += `Category,Sub-Category,Load Label,Watts,Qty,Hours/Day,Daily Energy Wh,Notes\n`;

    loads.forEach(l => {
      const energy = (l.watts || 0) * (l.qty || 1) * (l.hoursPerDay || 0);
      csv += `"${l.category || 'Custom'}","${l.subCategory || '—'}","${l.description}",${l.watts},${l.qty},${l.hoursPerDay},${energy},"${(l.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEP_Solar_Schedule.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-base font-bold text-yellow-400 flex items-center gap-2">
            <span>☀️</span> Solar Photovoltaic & Inverter Sizing
          </div>
          <div className="text-xs text-[#718096]">Off-grid / hybrid systems battery bank and panel array calculation</div>
        </div>

      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#111522] border border-[#2d3748]/60 rounded-xl p-4 shadow-2xl space-y-4">
          <div className="text-xs font-bold text-yellow-400 flex items-center gap-2 uppercase tracking-wider">
            <span>⚙️</span> Solar Options Configuration Drawer
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Manage dynamic option lists for Inverter Types, Battery Bank Chemistries, and standard Solar Panel Wattages.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Select Dropdown Category (Edit Existing Lists)</label>
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded p-2 text-xs text-white focus:border-blue-500 outline-none"
                >
                  {getCategoriesForTab('solar', dropdowns).map(k => (
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
                    onClick={() => handleHarvestFromTable('description')}
                    className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer"
                  >
                    Descriptions
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
                    placeholder="e.g. Charge Controllers"
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

            {/* Right */}
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
                        setSelectedKey(remaining[0] || 'Inverter Types');
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
                  className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer"
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

      {/* Hidden File Input for Solar Sizing Sheet Imports */}
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
      <div className="flex gap-3 flex-wrap mb-4">
        {[
          { label: 'Daily Energy Demand', val: `${dailyEnergyWh.toLocaleString()} Wh`, col: 'text-yellow-300' },
          { label: 'Solar PV Panels', val: `${panelCountNeeded} × ${config.panelWattage}W`, col: 'text-[#f6ad55]' },
          { label: 'Total Array Size', val: `${arraySizeKWp.toFixed(2)} kWp`, col: 'text-[#f6ad55]' },
          { label: 'Battery Bank Sizing', val: `${totalAhCapacity} Ah`, col: 'text-green-400' },
          { label: 'Req. Battery Energy', val: `${Math.ceil(batteryEnergyWh).toLocaleString()} Wh`, col: 'text-green-400' },
          { label: 'Min Inverter Sizing', val: `≥ ${minInverterKW} kW`, col: 'text-blue-300', hi: true },
        ].map(card => (
          <div
            key={card.label}
            className={`flex-1 min-w-[120px] rounded-lg p-3 border transition-all ${
              card.hi ? 'bg-[#0d1f35] border-blue-900' : 'bg-[#1a1f2e] border-[#2d3748]'
            }`}
          >
            <div className={`text-[9px] mb-1 font-semibold uppercase tracking-wider ${card.hi ? 'text-blue-300' : 'text-[#718096]'}`}>
              {card.label}
            </div>
            <div className={`text-base font-bold ${card.hi ? 'text-blue-300' : card.col}`}>{card.val}</div>
          </div>
        ))}
      </div>

      {/* Main Layout split: daily loads table & system configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Load table */}
        <div className="lg:col-span-2 bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 shadow-xl">
          <div className="sticky top-0 z-40 bg-[#1a1f2e] pt-1 pb-3 -mt-1 border-b border-[#2d3748]/70 shadow-md flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="font-bold text-xs text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Search size={14} />
                <span>Daily Solar / Backup Loads Schedule</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0f1117] border border-[#2d3748] px-2.5 py-1 rounded text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Group By:</span>
                <select
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value)}
                  className="bg-transparent text-sky-400 font-bold outline-none cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="category">Category</option>
                  <option value="subCategory">Group / Class</option>
                </select>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter loads by category, description..."
                className="w-full pl-9 pr-3 py-1 bg-[#0f1117] border border-[#2d3748] rounded-md text-xs text-white placeholder-gray-600 outline-none focus:border-sky-500/80 transition-colors font-medium"
              />
            </div>
          </div>

          <div
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            className="sticky top-[48px] lg:top-[50px] z-30 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] relative custom-scrollbar border border-[#2d3748]/60 rounded-lg"
          >
            <table className="w-full border-collapse text-xs text-left min-w-[850px]">
              <thead className="sticky top-0 bg-[#13192a] z-30 shadow">
              <tr className="bg-[#13192a] border-b border-[#2d3748] text-[#718096] uppercase text-[10px] tracking-wider font-bold">
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-14 text-center text-[#718096]">Drag</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-40">Category</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-40">Group / Class</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-44">Load / Variance</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-36">Custom Label</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Watts</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-20 text-center">Qty</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Hours/Day</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center text-yellow-300 font-bold">Daily Wh</th>
                <RenderCustomHeaders tabId="solar" />
                <th className="sticky top-0 z-30 bg-[#13192a] p-3">Notes</th>
                <th className="sticky top-0 right-0 z-40 bg-[#13192a] p-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748]/40">
              {loads.length === 0 ? (
                <tr>
                  <td colSpan={11 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No Daily backup loads added. Click "+ Add Load Item" to size solar/battery setups.
                  </td>
                </tr>
              ) : filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={11 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No loads match your search query.
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => {
                  const originalIdx = loads.findIndex(l => l.id === load.id);
                  const energyWh = (load.watts || 0) * (load.qty || 1) * (load.hoursPerDay || 0);

                  const mainCat = SOLAR_LOAD_DATABASE.find(c => c.name === load.category);
                  const subCatList = mainCat ? mainCat.subCategories : [];
                  const currentSub = subCatList.find(s => s.name === load.subCategory);
                  const itemList = currentSub ? currentSub.items : [];

                  const isBeingDragged = draggedIndex === originalIdx;

                  return (
                    <tr
                      key={load.id}
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
                          const updated = [...loads];
                          const [moved] = updated.splice(draggedIndex, 1);
                          updated.splice(originalIdx, 0, moved);
                          setLoads(updated);
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

                      {/* Main category */}
                      <td className="p-2">
                        <select
                          value={load.category || ''}
                          onChange={e => {
                            const catName = e.target.value;
                            if (catName === '') {
                              setLoads(prev => prev.map(item => item.id === load.id ? {
                                ...item,
                                category: '',
                                subCategory: '',
                              } : item));
                            } else {
                              const newMain = SOLAR_LOAD_DATABASE.find(c => c.name === catName);
                              const firstSub = newMain?.subCategories[0];
                              const firstItem = firstSub?.items[0];
                              setLoads(prev => prev.map(item => item.id === load.id ? {
                                ...item,
                                category: catName,
                                subCategory: firstSub?.name || '',
                                description: firstItem?.name || item.description,
                                watts: firstItem?.defaultWatts !== undefined ? firstItem.defaultWatts : item.watts,
                                hoursPerDay: firstItem?.defaultHours !== undefined ? firstItem.defaultHours : item.hoursPerDay,
                              } : item));
                            }
                          }}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-1 text-[#cbd5e0] focus:border-yellow-500 focus:outline-none text-xs w-full"
                        >
                          <option value="" className="bg-[#1a1f2e]">Custom / Other</option>
                          {SOLAR_LOAD_DATABASE.map(cat => (
                            <option key={cat.name} value={cat.name} className="bg-[#1a1f2e]">
                              {cat.name.replace(' Loads', '')}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Sub category */}
                      <td className="p-2">
                        <select
                          value={load.subCategory || ''}
                          disabled={!load.category}
                          onChange={e => {
                            const subName = e.target.value;
                            const newSub = subCatList.find(s => s.name === subName);
                            const firstItem = newSub?.items[0];
                            setLoads(prev => prev.map(item => item.id === load.id ? {
                              ...item,
                              subCategory: subName,
                              description: firstItem?.name || item.description,
                              watts: firstItem?.defaultWatts !== undefined ? firstItem.defaultWatts : item.watts,
                              hoursPerDay: firstItem?.defaultHours !== undefined ? firstItem.defaultHours : item.hoursPerDay,
                            } : item));
                          }}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-1 text-[#cbd5e0] focus:border-yellow-500 focus:outline-none text-xs w-full disabled:opacity-40"
                        >
                          <option value="" className="bg-[#1a1f2e]">—</option>
                          {subCatList.map(sub => (
                            <option key={sub.name} value={sub.name} className="bg-[#1a1f2e]">{sub.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Item option selection */}
                      <td className="p-2">
                        <select
                          value={itemList.some(i => i.name === load.description) ? load.description : (load.subCategory ? 'Custom' : '')}
                          disabled={!load.subCategory}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'Custom') {
                              setLoads(prev => prev.map(item => item.id === load.id ? {
                                ...item,
                                description: 'Custom Load Item',
                              } : item));
                            } else {
                              const selectedItem = itemList.find(i => i.name === val);
                              if (selectedItem) {
                                setLoads(prev => prev.map(item => item.id === load.id ? {
                                  ...item,
                                  description: selectedItem.name,
                                  watts: selectedItem.defaultWatts,
                                  hoursPerDay: selectedItem.defaultHours,
                                } : item));
                              }
                            }
                          }}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-1 text-[#cbd5e0] focus:border-yellow-500 focus:outline-none text-xs w-full disabled:opacity-40"
                        >
                          <option value="" className="bg-[#1a1f2e]">—</option>
                          {itemList.map(i => (
                            <option key={i.name} value={i.name} className="bg-[#1a1f2e]">{i.name}</option>
                          ))}
                          <option value="Custom" className="bg-[#1a1f2e]">Custom Load...</option>
                        </select>
                      </td>

                      {/* Custom Label */}
                      <td className="p-2">
                        <input
                          value={load.description}
                          onChange={e => updateLoadField(load.id, 'description', e.target.value)}
                          className="bg-[#0f1117]/40 border border-[#2d3748] rounded px-1.5 py-1 text-white w-full outline-none focus:border-yellow-500"
                        />
                      </td>

                      {/* Watts */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={load.watts || ''}
                          onChange={e => updateLoadField(load.id, 'watts', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 w-16 text-center text-orange-400 font-bold outline-none font-mono"
                        />
                      </td>

                      {/* Qty */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={load.qty || 1}
                          onChange={e => updateLoadField(load.id, 'qty', Math.ceil(parseFloat(e.target.value) || 1))}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 w-12 text-center text-white outline-none font-mono font-semibold"
                        />
                      </td>

                      {/* Hours per Day */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.5"
                          value={load.hoursPerDay || ''}
                          onChange={e => updateLoadField(load.id, 'hoursPerDay', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 w-14 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Daily energy Wh */}
                      <td className="p-2 text-center text-yellow-300 font-bold font-mono bg-[#141a29]/40">
                        {energyWh.toLocaleString()} Wh
                      </td>

                      <RenderCustomCells
                        tabId="solar"
                        row={load}
                        dropdowns={dropdowns}
                        onChange={(val) => updateLoadField(load.id, 'customValues' as any, val)}
                      />

                      {/* Notes */}
                      <td className="p-2">
                        <input
                          value={load.notes || ''}
                          onChange={e => updateLoadField(load.id, 'notes', e.target.value)}
                          placeholder="Load notes..."
                          className="bg-transparent text-gray-300 px-1 py-0.5 outline-none focus:border-b focus:border-yellow-500 w-full"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditLoad(load)}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 border border-yellow-500/40 rounded transition-all cursor-pointer"
                            title="Edit Load"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => duplicateLoad(load.id)}
                            className="p-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/30 rounded transition-all cursor-pointer"
                            title="Duplicate Load"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => removeLoad(load.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-[#2c1a1e] rounded transition-all cursor-pointer"
                            title="Delete Load"
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

        {/* Table Footer */}
        <div className="mt-3 pt-3 border-t border-[#2d3748] flex justify-between items-center">
          <div className="text-xs text-gray-400 font-mono">
            Total Solar Loads: <span className="text-yellow-400 font-bold">{loads.length}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearTable}
              className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Clear Table
            </button>
            <button
              onClick={addLoad}
              className="bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Load Item
            </button>
          </div>
        </div>
      </div>

        {/* Configurations column */}
        <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2d3748] pb-2.5">
            <div className="font-bold text-xs text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>☀️ Solar PV / Battery Parameters</span>
            </div>
            <div className="flex bg-[#0f1117] border border-[#2d3748] rounded p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setParamsViewMode('grid')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  paramsViewMode === 'grid' ? 'bg-yellow-600 text-slate-950 shadow' : 'text-gray-400 hover:text-white'
                }`}
                title="Grid View"
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setParamsViewMode('tabs')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  paramsViewMode === 'tabs' ? 'bg-yellow-600 text-slate-950 shadow' : 'text-gray-400 hover:text-white'
                }`}
                title="Tabbed View"
              >
                Tabs
              </button>
              <button
                type="button"
                onClick={() => setParamsViewMode('table')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  paramsViewMode === 'table' ? 'bg-yellow-600 text-slate-950 shadow' : 'text-gray-400 hover:text-white'
                }`}
                title="Table View"
              >
                Table
              </button>
            </div>
          </div>

          {/* GRID VIEW MODE */}
          {paramsViewMode === 'grid' && (
            <div className="space-y-4">
              {/* PV Array & Radiation Grid */}
              <div className="bg-[#131722] border border-[#2d3748]/80 rounded-lg p-3 space-y-3">
                <div className="text-[11px] text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#2d3748]/50 pb-1.5">
                  <span>☀️</span> PV Array & Solar Insolation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Peak Sun Hours (hrs/day)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.peakSunHours || 5}
                      onChange={e => updateConfig('peakSunHours', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Selected Panel Wattage (W)</label>
                    <select
                      value={config.panelWattage || 400}
                      onChange={e => updateConfig('panelWattage', parseInt(e.target.value) || 400)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500"
                    >
                      {panelWattagesList.map(w => (
                        <option key={w} value={w}>{w}W Panel</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Battery Bank Storage Grid */}
              <div className="bg-[#131722] border border-[#2d3748]/80 rounded-lg p-3 space-y-3">
                <div className="text-[11px] text-green-400 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#2d3748]/50 pb-1.5">
                  <span>🔋</span> Battery Storage System
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Battery Bank Type</label>
                    <select
                      value={config.batteryType || 'Lithium (LiFePO4)'}
                      onChange={e => updateConfig('batteryType', e.target.value)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500"
                    >
                      {batteryTypesList.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Nominal Voltage (VDC)</label>
                    <select
                      value={config.batteryVoltage || 12}
                      onChange={e => updateConfig('batteryVoltage', parseInt(e.target.value) || 12)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    >
                      {[12, 24, 48, 96, 120, 240, 360].map(v => (
                        <option key={v} value={v}>{v} VDC Bank</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Battery Rating (Ah)</label>
                    <input
                      type="number"
                      value={config.batteryAh || 200}
                      onChange={e => updateConfig('batteryAh', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Days of Autonomy</label>
                    <input
                      type="number"
                      step="1"
                      value={config.daysAutonomy || 1}
                      onChange={e => updateConfig('daysAutonomy', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Inverter & Efficiency Grid */}
              <div className="bg-[#131722] border border-[#2d3748]/80 rounded-lg p-3 space-y-3">
                <div className="text-[11px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#2d3748]/50 pb-1.5">
                  <span>⚡</span> Inverter & Efficiency Loss
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Inverter Efficiency</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.inverterEff || 0.9}
                      onChange={e => updateConfig('inverterEff', parseFloat(e.target.value) || 0.9)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Depth of Discharge (DoD)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.dod || 0.8}
                      onChange={e => updateConfig('dod', parseFloat(e.target.value) || 0.8)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABBED VIEW MODE */}
          {paramsViewMode === 'tabs' && (
            <div className="space-y-3">
              <div className="flex border-b border-[#2d3748] bg-[#0c101b] p-1 rounded-lg gap-1">
                <button
                  type="button"
                  onClick={() => setParamsActiveTab('pv')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    paramsActiveTab === 'pv' ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ☀️ PV Array
                </button>
                <button
                  type="button"
                  onClick={() => setParamsActiveTab('battery')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    paramsActiveTab === 'battery' ? 'bg-green-600/30 text-green-300 border border-green-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🔋 Battery Bank
                </button>
                <button
                  type="button"
                  onClick={() => setParamsActiveTab('inverter')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    paramsActiveTab === 'inverter' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ⚡ Losses & Eff
                </button>
              </div>

              {paramsActiveTab === 'pv' && (
                <div className="bg-[#131722] border border-[#2d3748]/80 rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Peak Sun Hours (hrs/day)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.peakSunHours || 5}
                      onChange={e => updateConfig('peakSunHours', parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Selected Panel Wattage (W)</label>
                    <select
                      value={config.panelWattage || 400}
                      onChange={e => updateConfig('panelWattage', parseInt(e.target.value) || 400)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500"
                    >
                      {panelWattagesList.map(w => (
                        <option key={w} value={w}>{w}W Panel</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {paramsActiveTab === 'battery' && (
                <div className="bg-[#131722] border border-[#2d3748]/80 rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Battery Bank Type</label>
                    <select
                      value={config.batteryType || 'Lithium (LiFePO4)'}
                      onChange={e => updateConfig('batteryType', e.target.value)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500"
                    >
                      {batteryTypesList.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Nominal Voltage (VDC)</label>
                    <select
                      value={config.batteryVoltage || 12}
                      onChange={e => updateConfig('batteryVoltage', parseInt(e.target.value) || 12)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    >
                      {[12, 24, 48, 96, 120, 240, 360].map(v => (
                        <option key={v} value={v}>{v} VDC Bank</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Battery Rating (Ah)</label>
                    <input
                      type="number"
                      value={config.batteryAh || 200}
                      onChange={e => updateConfig('batteryAh', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Days of Autonomy (Reserve)</label>
                    <input
                      type="number"
                      step="1"
                      value={config.daysAutonomy || 1}
                      onChange={e => updateConfig('daysAutonomy', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {paramsActiveTab === 'inverter' && (
                <div className="bg-[#131722] border border-[#2d3748]/80 rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Inverter Efficiency</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.inverterEff || 0.9}
                      onChange={e => updateConfig('inverterEff', parseFloat(e.target.value) || 0.9)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Depth of Discharge (DoD)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.dod || 0.8}
                      onChange={e => updateConfig('dod', parseFloat(e.target.value) || 0.8)}
                      className="w-full bg-[#0f1117] border border-[#2d3748] rounded text-white text-xs px-2.5 py-1.5 outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TABULATED / TABLE VIEW MODE */}
          {paramsViewMode === 'table' && (
            <div className="overflow-x-auto border border-[#2d3748] rounded-lg bg-[#131722]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0f1117] border-b border-[#2d3748] text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-2">Parameter</th>
                    <th className="p-2">Config Value</th>
                    <th className="p-2">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3748]/40 text-gray-300">
                  <tr>
                    <td className="p-2 font-semibold">Peak Sun Hours</td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.1"
                        value={config.peakSunHours || 5}
                        onChange={e => updateConfig('peakSunHours', parseFloat(e.target.value) || 0)}
                        className="w-20 bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">hrs/day</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Panel Wattage</td>
                    <td className="p-2">
                      <select
                        value={config.panelWattage || 400}
                        onChange={e => updateConfig('panelWattage', parseInt(e.target.value) || 400)}
                        className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white text-xs"
                      >
                        {panelWattagesList.map(w => (
                          <option key={w} value={w}>{w}W</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">Watts</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Days of Autonomy</td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="1"
                        value={config.daysAutonomy || 1}
                        onChange={e => updateConfig('daysAutonomy', parseInt(e.target.value) || 1)}
                        className="w-20 bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">days</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Battery Chemistry</td>
                    <td className="p-2">
                      <select
                        value={config.batteryType || 'Lithium (LiFePO4)'}
                        onChange={e => updateConfig('batteryType', e.target.value)}
                        className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white text-xs max-w-[130px]"
                      >
                        {batteryTypesList.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">Type</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Nominal Voltage</td>
                    <td className="p-2">
                      <select
                        value={config.batteryVoltage || 12}
                        onChange={e => updateConfig('batteryVoltage', parseInt(e.target.value) || 12)}
                        className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      >
                        {[12, 24, 48, 96, 120, 240, 360].map(v => (
                          <option key={v} value={v}>{v} VDC</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">VDC</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Battery Rating</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={config.batteryAh || 200}
                        onChange={e => updateConfig('batteryAh', parseInt(e.target.value) || 0)}
                        className="w-20 bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">Ah</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Inverter Efficiency</td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={config.inverterEff || 0.9}
                        onChange={e => updateConfig('inverterEff', parseFloat(e.target.value) || 0.9)}
                        className="w-20 bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">Ratio ({Math.round((config.inverterEff || 0.9)*100)}%)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Depth of Discharge</td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.05"
                        value={config.dod || 0.8}
                        onChange={e => updateConfig('dod', parseFloat(e.target.value) || 0.8)}
                        className="w-20 bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-white font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 text-gray-400 text-[11px]">DoD ({Math.round((config.dod || 0.8)*100)}%)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
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
              Total Solar Load Items: <span className="text-yellow-400 font-bold">{loads.length}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addLoad}
              className="bg-yellow-600 hover:bg-yellow-500 border border-yellow-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-lg shadow-yellow-500/20 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Load Item
            </button>
          </div>
        </div>
      </div>

      {/* Add Solar Load Overlay Modal */}
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
                  <h3 className="font-sans font-bold text-base text-yellow-400 flex items-center gap-2">
                    <span>☀️</span> Add Solar Backup Load
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure device category, power demands (Watts), and target daily operational hours.
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
                {(['physical', 'solar_spec'] as const).map((t) => {
                  const labels = {
                    physical: { title: '1. Load Category', desc: 'Sizing Class & Presets' },
                    solar_spec: { title: '2. Sizing Specs', desc: 'Watts, Operational Hours & Qty' }
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTab(t)}
                      className={`flex-1 py-2 px-3 rounded-md transition-all text-left cursor-pointer ${
                        modalTab === t
                          ? 'bg-[#1e3a5f] text-yellow-300 border border-yellow-500/40 shadow'
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
              <form onSubmit={handleSaveNewLoad} className="p-5 overflow-y-auto space-y-4 flex-1 text-left select-none max-h-[60vh]">
                {modalTab === 'physical' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Load Category */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Equipment Category <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={newLoadForm.category || ''}
                          onChange={(e) => {
                            const cat = e.target.value;
                            setNewLoadForm(prev => ({ ...prev, category: cat, subCategory: '', description: '', watts: 150, hoursPerDay: 4 }));
                          }}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500 font-semibold cursor-pointer"
                        >
                          <option value="">-- Choose Category --</option>
                          {SOLAR_LOAD_DATABASE.map(mainCat => (
                            <option key={mainCat.name} value={mainCat.name}>{mainCat.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sub Category */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Sub-category Preset
                        </label>
                        <select
                          value={newLoadForm.subCategory || ''}
                          disabled={!newLoadForm.category}
                          onChange={(e) => {
                            const sub = e.target.value;
                            setNewLoadForm(prev => ({ ...prev, subCategory: sub, description: '', watts: 150, hoursPerDay: 4 }));
                          }}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Choose Sub-category --</option>
                          {newLoadForm.category &&
                            SOLAR_LOAD_DATABASE.find(c => c.name === newLoadForm.category)?.subCategories.map(subCat => (
                              <option key={subCat.name} value={subCat.name}>{subCat.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    {/* Specific Equipment Preset */}
                    {newLoadForm.subCategory && (
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Specific Equipment Preset
                        </label>
                        <select
                          onChange={(e) => {
                            const itemName = e.target.value;
                            const mainCat = SOLAR_LOAD_DATABASE.find(c => c.name === newLoadForm.category);
                            const subCat = mainCat?.subCategories.find(s => s.name === newLoadForm.subCategory);
                            const match = subCat?.items.find(item => item.name === itemName);
                            if (match) {
                              setNewLoadForm(prev => ({
                                ...prev,
                                description: match.name,
                                watts: match.defaultWatts,
                                hoursPerDay: match.defaultHours
                              }));
                            }
                          }}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500 font-semibold cursor-pointer"
                        >
                          <option value="">-- Choose Preset Equipment (Optional) --</option>
                          {(() => {
                            const mainCat = SOLAR_LOAD_DATABASE.find(c => c.name === newLoadForm.category);
                            const subCat = mainCat?.subCategories.find(s => s.name === newLoadForm.subCategory);
                            return subCat?.items.map(item => (
                              <option key={item.name} value={item.name}>
                                {item.name} ({item.defaultWatts}W, {item.defaultHours} hrs)
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                    )}

                    <div className="bg-[#0c101b] border border-[#2d3748]/50 p-4 rounded-lg">
                      <span className="text-xs text-gray-400 leading-relaxed block">
                        Using standard energy presets automatically loads typical active wattages and duty hours, simplifying compliance calculations for solar sizing arrays.
                      </span>
                    </div>
                  </div>
                )}

                {modalTab === 'solar_spec' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Description */}
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Load Label / Description <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLoadForm.description || ''}
                        onChange={(e) => setNewLoadForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g. Server Room Backup UPS, Fridge, Living Lights"
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500 font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Watts */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Load Rating (Watts)
                        </label>
                        <input
                          type="number"
                          step="10"
                          value={newLoadForm.watts ?? 150}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, watts: Number(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500 font-mono"
                        />
                      </div>

                      {/* Daily hours */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Daily Use (Hours)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          max="24"
                          value={newLoadForm.hoursPerDay ?? 4}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, hoursPerDay: Number(e.target.value) || 1 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500 font-mono"
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
                          value={newLoadForm.qty || 1}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500 font-mono"
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
                        value={newLoadForm.notes || ''}
                        onChange={(e) => setNewLoadForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional backup priority level or sizing group comments..."
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-yellow-500"
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
                    className="bg-yellow-600 hover:bg-yellow-500 border border-yellow-400 text-white text-xs font-bold px-5 py-2 rounded cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <span>☀️</span> Save Solar Load
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
