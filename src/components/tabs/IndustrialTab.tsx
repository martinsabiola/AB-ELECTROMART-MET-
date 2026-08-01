import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectSettings } from '../../types';
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
  RoomSelector
} from '../../utils/dropdownMetadata';

export const DEFAULT_MOTOR_LOAD_TYPES = [
  'Motor',
  'Welding',
  'Lighting',
  'HVAC',
  'Panel/MCC',
  'UPS',
  'Compressor',
  'Pump',
  'Other',
];

export const DEFAULT_INDUSTRIAL_VOLTAGES = ['110', '220', '230', '400', '415', '440', '600', '690', '1000', '3300', '6600', '11000'];

export const DEFAULT_INDUSTRIAL_CB_SIZES = [
  '6', '10', '16', '20', '25', '32', '40', '50', '63', '80', '100', '125', '160', '200', '250', '315', '400', '500', '630', '800', '1000', '1250',
];

interface IndustrialLoad {
  id: string;
  description: string;
  loadType: string;
  voltage: number;
  kw: number;
  pf: number;
  eff: number;
  qty: number;
  demandFactor: number;
  notes: string;
  customValues?: Record<string, any>;
}

interface IndustrialTabProps {
  settings: ProjectSettings;
}

export default function IndustrialTab({ settings }: IndustrialTabProps) {
  // Local state for loads with localStorage persistence
  const [loads, setLoads] = useState<IndustrialLoad[]>(() => {
    const saved = localStorage.getItem('mep_industrial_loads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore fallback
      }
    }
    return [
      {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        description: 'Main Compressor MCC',
        loadType: 'Motor',
        voltage: 400,
        kw: 45,
        pf: 0.85,
        eff: 0.92,
        qty: 1,
        demandFactor: 0.8,
        notes: 'Continuous Duty',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('mep_industrial_loads', JSON.stringify(loads));
  }, [loads]);

  // Hidden File Input Ref for Imports
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // File Import Logic
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: true }));
    await new Promise(r => setTimeout(r, 100));
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ab = e.target?.result;
        if (!ab) return;
        const ext = file.name.split('.').pop()?.toLowerCase();
        let rows: any[][] = [];
        if (ext === 'xlsx' || ext === 'xls') {
          const wb = XLSX.read(new Uint8Array(ab as ArrayBuffer), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        } else if (ext === 'json') {
          const text = new TextDecoder().decode(ab as ArrayBuffer);
          const p = JSON.parse(text);
          if (Array.isArray(p.industrialLoads) && p.industrialLoads.length > 0) {
            setLoads(prev => mode === 'replace' ? p.industrialLoads : [...prev, ...p.industrialLoads]);
            window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: true, text: `📥 Restored ${p.industrialLoads.length} industrial loads` } }));
            return;
          }
        } else {
          const text = new TextDecoder().decode(ab as ArrayBuffer);
          rows = text.split('\n').map(line => line.split(ext === 'csv' ? ',' : '\t').map(cell => cell.trim().replace(/^"|"$/g, '')));
        }
        
        if (rows.length >= 2) {
          const header = rows[0].map(h => String(h).trim().toLowerCase());
          const mappedLoads: IndustrialLoad[] = [];
          
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length === 0 || !row[0]) continue;
            
            const valOf = (colNames: string[]) => {
              for (const colName of colNames) {
                const idx = header.indexOf(colName.toLowerCase());
                if (idx !== -1) return row[idx];
              }
              return undefined;
            };
            
            const description = String(valOf(['location / room', 'description', 'location', 'room']) || row[0] || '').trim();
            if (!description) continue;
            
            const loadType = String(valOf(['load type', 'type']) || 'Motor');
            const voltage = parseInt(String(valOf(['voltage (v)', 'voltage', 'volt']))) || 400;
            const kw = parseFloat(String(valOf(['power (kw)', 'power', 'kw']))) || 1.5;
            const pf = parseFloat(String(valOf(['pf', 'power factor']))) || 0.85;
            const eff = parseFloat(String(valOf(['efficiency %', 'eff %', 'efficiency', 'eff']))) || 0.90;
            const qty = parseInt(String(valOf(['qty', 'quantity']))) || 1;
            const demandFactor = parseFloat(String(valOf(['demand factor', 'df']))) || 1.0;
            const notes = String(valOf(['notes', 'remark']) || '');
            
            mappedLoads.push({
              id: Math.random().toString(36).slice(2, 8).toUpperCase(),
              description,
              loadType,
              voltage,
              kw,
              pf,
              eff: eff > 1 ? eff / 100 : eff,
              qty,
              demandFactor,
              notes
            });
          }
          
          if (mappedLoads.length > 0) {
            setLoads(prev => mode === 'replace' ? mappedLoads : [...prev, ...mappedLoads]);
            window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: true, text: `📥 Imported ${mappedLoads.length} industrial loads` } }));
          }
        }
      } catch (err: any) {
        window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: false, text: 'Import failed: ' + (err.message || 'invalid file') } }));
      } finally {
        window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: false }));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // File Export Logic
  const handleExportFile = (format: string) => {
    const headers = [
      'Location / Room', 'Load Type', 'Voltage (V)', 'Power (kW)', 'PF', 'Efficiency %', 'Qty', 'Demand Factor', 'Total Demand (kW)', 'FLA Current (ea)', 'Total FLA', 'Notes'
    ];
    
    const dataRows = loads.map(l => {
      const v = l.voltage || 400;
      const efficiency = l.eff || 0.90;
      const powerFactor = l.pf || 0.85;
      const demandF = l.demandFactor !== undefined ? l.demandFactor : 1.0;
      const quantity = l.qty || 1;
      
      const isThreePhase = v >= 380;
      const denominator = isThreePhase ? (Math.sqrt(3) * v * powerFactor * efficiency) : (v * powerFactor * efficiency);
      const singleFla = denominator > 0 ? (l.kw * 1000) / denominator : 0;
      const totalFla = singleFla * quantity;
      const totalDemand = l.kw * quantity * demandF;

      return [
        l.description, l.loadType, v, l.kw, powerFactor, efficiency * 100, quantity, demandF, totalDemand.toFixed(2), singleFla.toFixed(2), totalFla.toFixed(2), l.notes
      ];
    });
    
    const allRows = [headers, ...dataRows];
    
    if (format === 'xlsx' || format === 'xls') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Industrial Machinery Schedule');
      XLSX.writeFile(wb, `Industrial_Machinery_Schedule.${format}`);
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
      link.setAttribute('download', `Industrial_Machinery_Schedule.${isCsv ? 'csv' : 'txt'}`);
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

    window.addEventListener('trigger-mep-import-industrial', handleImportTrigger);
    window.addEventListener('trigger-mep-export-industrial', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import-industrial', handleImportTrigger);
      window.removeEventListener('trigger-mep-export-industrial', handleExportTrigger);
    };
  }, [loads]);

  // --- Collapsible Dropdowns State ---
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLoads = loads.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.loadType && l.loadType.toLowerCase().includes(q)) ||
      (l.notes && l.notes.toLowerCase().includes(q))
    );
  });
  const customCols = getCustomColumnsForTab('industrial');

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
  }, [loads]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('electrical_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          'Industrial Load Types': DEFAULT_MOTOR_LOAD_TYPES,
          'Industrial Volts (V)': DEFAULT_INDUSTRIAL_VOLTAGES,
          'Industrial Breakers (A)': DEFAULT_INDUSTRIAL_CB_SIZES,
          ...parsed
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      'Industrial Load Types': DEFAULT_MOTOR_LOAD_TYPES,
      'Industrial Volts (V)': DEFAULT_INDUSTRIAL_VOLTAGES,
      'Industrial Breakers (A)': DEFAULT_INDUSTRIAL_CB_SIZES
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
  const [selectedKey, setSelectedKey] = useState('Industrial Load Types');
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newListName, setNewListName] = useState('');

  // Sourced dropdown vectors
  const motorLoadTypesList = dropdowns['Industrial Load Types'] || DEFAULT_MOTOR_LOAD_TYPES;
  const voltagesList = dropdowns['Industrial Volts (V)'] || DEFAULT_INDUSTRIAL_VOLTAGES;
  const cbSizesList = dropdowns['Industrial Breakers (A)'] || DEFAULT_INDUSTRIAL_CB_SIZES;

  // --- Add Industrial Load Overlay Modal State ---
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'physical' | 'industrial'>('physical');
  const [newLoadForm, setNewLoadForm] = useState<Partial<IndustrialLoad>>({
    description: '',
    loadType: 'Motor',
    voltage: 400,
    kw: 15,
    pf: 0.85,
    eff: 0.92,
    qty: 1,
    demandFactor: 0.8,
    notes: '',
  });

  const addLoad = () => {
    setNewLoadForm({
      description: `Load ${loads.length + 1}`,
      loadType: motorLoadTypesList[0] || 'Motor',
      voltage: parseInt(voltagesList[3] || '400'),
      kw: 15,
      pf: 0.85,
      eff: 0.92,
      qty: 1,
      demandFactor: 0.8,
      notes: '',
    });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  const handleSaveNewLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const newLoad: IndustrialLoad = {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      description: newLoadForm.description || `Load ${loads.length + 1}`,
      loadType: newLoadForm.loadType || motorLoadTypesList[0] || 'Motor',
      voltage: Number(newLoadForm.voltage) || 400,
      kw: Number(newLoadForm.kw) || 15,
      pf: Number(newLoadForm.pf) || 0.85,
      eff: Number(newLoadForm.eff) || 0.92,
      qty: Number(newLoadForm.qty) || 1,
      demandFactor: Number(newLoadForm.demandFactor) || 0.8,
      notes: newLoadForm.notes || '',
    };
    setLoads(prev => [...prev, newLoad]);
    setAddModalOpen(false);
  };

  const updateField = (id: string, key: keyof IndustrialLoad, value: any) => {
    setLoads(prev => prev.map(item => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeLoad = (id: string) => {
    if (confirm('Are you sure you want to remove this industrial load schedule?')) {
      setLoads(prev => prev.filter(item => item.id !== id));
    }
  };

  const duplicateLoad = (id: string) => {
    const targetIdx = loads.findIndex(item => item.id === id);
    if (targetIdx === -1) return;
    const target = loads[targetIdx];
    const copy: IndustrialLoad = {
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
    meta[name] = { tabId: 'industrial', role: 'column_dropdown' };
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

  // Metrics
  const totalInstalledKVA = loads.reduce(
    (sum, item) => sum + ((item.kw || 0) * (item.qty || 1)) / ((item.eff || 1) * (item.pf || 1)),
    0
  );

  const totalDemandKW = loads.reduce((sum, item) => sum + (item.kw || 0) * (item.qty || 1) * (item.demandFactor || 1), 0);

  const totalDemandKVA = loads.reduce(
    (sum, item) => sum + ((item.kw || 0) * (item.qty || 1) * (item.demandFactor || 1)) / ((item.eff || 1) * (item.pf || 1)),
    0
  );

  const fullLoadAmps = totalDemandKVA > 0 ? (totalDemandKVA * 1000) / (Math.sqrt(3) * 400 * (settings.powerFactor || 0.85)) : 0;
  const mainsCB = cbSizesList.map(v => parseInt(v)).find(size => size >= fullLoadAmps * 1.25) || 1250;

  const handleExportCSV = () => {
    let csv = `INDUSTRIAL MOTOR & MACHINERY LOADS SCHEDULE REPORT\n\n`;
    csv += `Description,Load Type,Voltage (V),Power kW,PF,Eff %,Qty,Demand Factor,FLA Current (A),Notes\n`;

    loads.forEach(l => {
      // FLA calculation: (kW) / (sqrt(3) * V * PF * Eff) * 1000
      const denominator = Math.sqrt(3) * (l.voltage || 400) * (l.pf || 0.85) * (l.eff || 0.90);
      const flaVal = denominator > 0 ? (((l.kw || 0) * 1000) / denominator) * (l.qty || 1) : 0;

      csv += `"${l.description}","${l.loadType}",${l.voltage},${l.kw},${l.pf},${(l.eff * 100).toFixed(0)},${l.qty},${l.demandFactor},${flaVal.toFixed(1)},"${(l.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEP_Industrial_Schedule.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Title block */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-base font-bold text-sky-400 flex items-center gap-2">
            <span>⚙️</span> Industrial Motor & Machinery Loads
          </div>
          <div className="text-xs text-[#718096]">3-Phase motor sizing, efficiency factors, and Full Load Amperage (FLA) calculations</div>
        </div>

      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="bg-[#111522] border border-[#2b6cb0]/40 rounded-xl p-4 shadow-2xl space-y-4">
          <div className="text-xs font-bold text-sky-400 flex items-center gap-2 uppercase tracking-wider">
            <span>⚙️</span> Industrial Dropdowns Config
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Configure dynamic lists for Industrial Machinery Load Types, Standard voltages, and Circuit Breaker sizes.
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
                  {getCategoriesForTab('industrial', dropdowns).map(k => (
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
                    placeholder="e.g. Pump Brands"
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
                        setSelectedKey(remaining[0] || 'Industrial Load Types');
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
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer"
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

      {/* Hidden File Input for Sizing Sheet Imports */}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Connected Power', val: `${totalInstalledKVA.toFixed(1)} kVA`, col: 'text-sky-300' },
          { label: 'Total Demand kW', val: `${totalDemandKW.toFixed(1)} kW`, col: 'text-sky-400' },
          { label: 'Total Demand kVA', val: `${totalDemandKVA.toFixed(1)} kVA`, col: 'text-orange-400 font-bold' },
          { label: 'Calculated Mains FLA', val: `${fullLoadAmps.toFixed(1)} Amps`, col: 'text-red-400 font-black' },
          { label: 'Recommended Mains CB Sizing', val: `${mainsCB} A`, col: 'text-green-400 font-black' },
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

      {/* Industrial Machinery Schedule Table */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden shadow-xl">
        {/* Search Input Bar */}
        <div className="sticky top-0 z-40 bg-[#13192a] p-3 border-b border-[#2d3748]/70 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-sky-400" />
              <span>Industrial Load Filter</span>
            </span>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter machinery by type, room, description..."
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
          <table className="w-full border-collapse text-xs text-left min-w-[1200px]">
            <thead className="sticky top-0 bg-[#13192a] z-30 shadow">
              <tr className="bg-[#13192a] text-[#718096] uppercase text-[10px] tracking-wider border-b border-[#2d3748] font-bold font-mono">
                <th className="sticky top-0 left-0 z-40 bg-[#13192a] p-3 w-14 border-r border-[#2d3748]/60 text-center text-[#718096]">Drag</th>
                <th className="sticky top-0 left-14 z-40 bg-[#13192a] p-3 w-52 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">Location / Room</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-36">Load Type</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Voltage (V)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center text-sky-400">Power (kW)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-20 text-center">PF</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Efficiency %</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-20 text-center">Qty</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Demand Factor</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32 text-center text-orange-400 font-bold">Total Demand (kW)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32 text-center text-red-400 font-bold">FLA Current (ea)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-32 text-center text-purple-400 font-bold">Total FLA</th>
                <RenderCustomHeaders tabId="industrial" />
                <th className="sticky top-0 z-30 bg-[#13192a] p-3">Notes</th>
                <th className="sticky top-0 right-0 z-40 bg-[#13192a] p-3 w-20 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748]/40">
              {loads.length === 0 ? (
                <tr>
                  <td colSpan={14 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No industrial machinery loads mapped yet. Click "+ Add Machinery Load" to configure scheduling.
                  </td>
                </tr>
              ) : filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={14 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No machinery loads match your search query.
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => {
                  const originalIdx = loads.findIndex(l => l.id === load.id);
                  const motorDemandKW = (load.kw || 0) * (load.qty || 1) * (load.demandFactor || 1);

                  // FLA calculation: (kW) / (sqrt(3) * V * PF * Eff) * 1000
                  const denominator = Math.sqrt(3) * (load.voltage || 400) * (load.pf || 0.85) * (load.eff || 0.90);
                  const itemFLA = denominator > 0 ? ((load.kw || 0) * 1000) / denominator : 0;
                  const totalFLA = itemFLA * (load.qty || 1);

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
                      <td className="sticky left-0 z-10 bg-[#151a26] p-2 w-14 min-w-[56px] max-w-[56px] text-center border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)] cursor-grab active:cursor-grabbing text-gray-500 hover:text-sky-400 select-none">
                        <span className="text-base font-bold">☰</span>
                      </td>

                      {/* Sticky Description */}
                      <td className="sticky left-14 z-10 bg-[#151a26] p-2 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">
                        <input
                          value={load.description}
                          onChange={e => updateField(load.id, 'description', e.target.value)}
                          className="bg-transparent text-white font-bold px-1.5 py-0.5 outline-none focus:border-b focus:border-sky-500 w-full"
                        />
                      </td>

                      {/* Load Type select */}
                      <td className="p-2">
                        <select
                          value={load.loadType}
                          onChange={e => updateField(load.id, 'loadType', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] w-full outline-none"
                        >
                          {motorLoadTypesList.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>

                      {/* Voltage select */}
                      <td className="p-2 text-center">
                        <select
                          value={load.voltage}
                          onChange={e => updateField(load.id, 'voltage', parseInt(e.target.value) || 400)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-20 outline-none font-mono text-center mx-auto"
                        >
                          {voltagesList.map(v => (
                            <option key={v} value={v}>{v} V</option>
                          ))}
                        </select>
                      </td>

                      {/* Power kW */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={load.kw || ''}
                          onChange={e => updateField(load.id, 'kw', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-16 text-center text-sky-400 font-bold outline-none font-mono"
                        />
                      </td>

                      {/* PF */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={load.pf || ''}
                          onChange={e => updateField(load.id, 'pf', parseFloat(e.target.value) || 0.85)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 w-14 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Efficiency */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={load.eff !== undefined ? load.eff : 0.9}
                          onChange={e => updateField(load.id, 'eff', parseFloat(e.target.value) || 0.9)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 w-16 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Qty */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={load.qty || 1}
                          onChange={e => updateField(load.id, 'qty', Math.ceil(parseFloat(e.target.value) || 1))}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 w-12 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Demand Factor */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.05"
                          value={load.demandFactor !== undefined ? load.demandFactor : 1}
                          onChange={e => updateField(load.id, 'demandFactor', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1 py-0.5 w-16 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Total Demand kW */}
                      <td className="p-2 text-center text-orange-400 font-bold font-mono bg-[#141a29]/40">
                        {motorDemandKW.toFixed(1)} kW
                      </td>

                      {/* FLA Current Individual */}
                      <td className="p-2 text-center text-red-400 font-semibold font-mono bg-[#141a29]/40">
                        {itemFLA.toFixed(1)} A
                      </td>

                      {/* Total FLA Current */}
                      <td className="p-2 text-center text-purple-400 font-bold font-mono bg-[#141a29]/40">
                        {totalFLA.toFixed(1)} A
                      </td>

                      <RenderCustomCells
                        tabId="industrial"
                        row={load}
                        dropdowns={dropdowns}
                        onChange={(val) => updateField(load.id, 'customValues' as any, val)}
                      />

                      {/* Notes */}
                      <td className="p-2">
                        <input
                          value={load.notes || ''}
                          onChange={e => updateField(load.id, 'notes', e.target.value)}
                          placeholder="Load details..."
                          className="bg-transparent text-gray-300 px-1 py-0.5 outline-none focus:border-b focus:border-sky-500 w-full"
                        />
                      </td>

                      {/* Actions */}
                      <td className="sticky right-0 z-10 bg-[#151a26] p-2 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => duplicateLoad(load.id)}
                            className="p-1 text-[#38bdf8] hover:text-sky-300 hover:bg-sky-950/30 rounded transition-all cursor-pointer"
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
              Total Loads: <span className="text-sky-400 font-bold">{loads.length}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addLoad}
              className="bg-sky-600 hover:bg-sky-500 border border-sky-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-lg shadow-sky-500/20 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Machinery Load
            </button>
          </div>
        </div>
      </div>

      {/* Add Industrial Load Overlay Modal */}
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
                  <h3 className="font-sans font-bold text-base text-indigo-400 flex items-center gap-2">
                    <span>🏭</span> Add Industrial Machinery Load
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure machine location, voltage systems, power capacity, efficiency, and factors.
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
                {(['physical', 'industrial'] as const).map((t) => {
                  const labels = {
                    physical: { title: '1. Location', desc: 'Factory Zone / Area' },
                    industrial: { title: '2. Machine Specs', desc: 'Voltage, kW, Efficiency & PF' }
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTab(t)}
                      className={`flex-1 py-2 px-3 rounded-md transition-all text-left cursor-pointer ${
                        modalTab === t
                          ? 'bg-[#1e3a5f] text-indigo-300 border border-indigo-500/40 shadow'
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
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Machinery Location Name <span className="text-red-400">*</span>
                      </label>
                      <RoomSelector
                        value={newLoadForm.description || ''}
                        onChange={(val) => setNewLoadForm(prev => ({ ...prev, description: val }))}
                        settings={settings}
                        placeholder="Select or search machinery bay name..."
                      />
                    </div>
                    <div className="bg-[#0c101b] border border-[#2d3748]/50 p-4 rounded-lg">
                      <span className="text-xs text-gray-400 leading-relaxed block">
                        Linking heavy industrial loads directly to specific factory rooms or utility bays calculates accurate sub-panel distribution needs and cooling margins.
                      </span>
                    </div>
                  </div>
                )}

                {modalTab === 'industrial' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Load type */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Load Category / Type
                        </label>
                        <select
                          value={newLoadForm.loadType || 'Motor'}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, loadType: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                        >
                          {motorLoadTypesList.map((mType) => (
                            <option key={mType} value={mType}>{mType}</option>
                          ))}
                        </select>
                      </div>

                      {/* Voltage */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          System Voltage (V)
                        </label>
                        <select
                          value={newLoadForm.voltage || 400}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, voltage: parseInt(e.target.value) || 400 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                        >
                          {voltagesList.map((volt) => (
                            <option key={volt} value={volt}>{volt} V</option>
                          ))}
                        </select>
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
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* kW rating */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Active Load (kW)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={newLoadForm.kw ?? 15}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, kw: Number(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      {/* Power Factor (PF) */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Power Factor (PF)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="1.0"
                          value={newLoadForm.pf ?? 0.85}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, pf: Number(e.target.value) || 0.85 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      {/* Efficiency (Eff) */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Efficiency (Eff)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="1.0"
                          value={newLoadForm.eff ?? 0.92}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, eff: Number(e.target.value) || 0.92 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      {/* Demand Factor */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Demand Factor
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="1.0"
                          value={newLoadForm.demandFactor ?? 0.8}
                          onChange={(e) => setNewLoadForm(prev => ({ ...prev, demandFactor: Number(e.target.value) || 0.8 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500 font-mono"
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
                        placeholder="Optional machinery starter type, inrush, or wiring code notes..."
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-indigo-500"
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
                    className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white text-xs font-bold px-5 py-2 rounded cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <span>🏭</span> Save Machine Load
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
