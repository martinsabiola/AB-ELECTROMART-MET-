import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlumbingFixture, ProjectSettings } from '../../types';
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

export const DEFAULT_PLUMBING_FIXTURES = ['WC', 'Lavatory', 'Bathtub', 'Shower', 'Kitchen Sink', 'Urinal', 'Floor Drain'];
export const DEFAULT_PIPE_SIZES = ['15', '20', '25', '32', '40', '50', '65', '80', '100', '150'];
export const DEFAULT_PIPE_MATERIALS = ['PVC', 'CPVC', 'PPR', 'PEX', 'Galvanized Steel'];

export const FIXTURE_UNIT_REFERENCE: Record<string, number> = {
  WC: 6,
  Lavatory: 1,
  Bathtub: 2,
  Shower: 2,
  'Kitchen Sink': 2,
  Urinal: 4,
  'Floor Drain': 1,
};

interface PlumbingTabProps {
  fixtures: PlumbingFixture[];
  setFixtures: React.Dispatch<React.SetStateAction<PlumbingFixture[]>>;
  settings?: ProjectSettings;
  setSettings?: React.Dispatch<React.SetStateAction<ProjectSettings>>;
}

export default function PlumbingTab({ fixtures, setFixtures, settings, setSettings }: PlumbingTabProps) {
  // Hidden File Input Ref for Imports
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // File Import Logic
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: true }));
      await new Promise(r => setTimeout(r, 100));
      const res = await parseMEPFile(file, [], settings);
      if (res.plumbingFixtures && res.plumbingFixtures.length > 0) {
        setFixtures(prev => mode === 'replace' ? res.plumbingFixtures! : [...prev, ...res.plumbingFixtures!]);
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
      'Location / Room', 'Fixture Type', 'Quantity', 'Fixture Units', 'Pipe Size mm', 'Material', 'Cold Flow', 'Hot Flow', 'Pipe Length', 'Notes'
    ];
    
    const dataRows = fixtures.map(f => [
      f.zone, f.fixture, f.qty || 1, f.fixtureUnits || 0, f.pipeSize || 20, f.material || 'PVC', f.coldFlow || 0, f.hotFlow || 0, f.pipeLength || 0, f.notes
    ]);
    
    const allRows = [headers, ...dataRows];
    
    if (format === 'xlsx' || format === 'xls') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Plumbing Fixture Schedule');
      XLSX.writeFile(wb, `Plumbing_Fixture_Schedule.${format}`);
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
      link.setAttribute('download', `Plumbing_Fixture_Schedule.${isCsv ? 'csv' : 'txt'}`);
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

    window.addEventListener('trigger-mep-import-plumbing', handleImportTrigger);
    window.addEventListener('trigger-mep-export-plumbing', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import-plumbing', handleImportTrigger);
      window.removeEventListener('trigger-mep-export-plumbing', handleExportTrigger);
    };
  }, [fixtures]);

  // --- Collapsible Dropdowns State ---
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFixtures = fixtures.filter(f => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (f.zone && f.zone.toLowerCase().includes(q)) ||
      (f.fixture && f.fixture.toLowerCase().includes(q)) ||
      (f.material && f.material.toLowerCase().includes(q)) ||
      (f.notes && f.notes.toLowerCase().includes(q))
    );
  });
  const customCols = getCustomColumnsForTab('plumbing');

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
  }, [fixtures]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('electrical_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          'Plumbing Fixtures': DEFAULT_PLUMBING_FIXTURES,
          'Pipe Sizes (mm)': DEFAULT_PIPE_SIZES,
          'Pipe Materials': DEFAULT_PIPE_MATERIALS,
          ...parsed
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      'Plumbing Fixtures': DEFAULT_PLUMBING_FIXTURES,
      'Pipe Sizes (mm)': DEFAULT_PIPE_SIZES,
      'Pipe Materials': DEFAULT_PIPE_MATERIALS
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

  // Dropdowns Manager state
  const [selectedKey, setSelectedKey] = useState('Plumbing Fixtures');
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newListName, setNewListName] = useState('');

  // Sourced dropdown vectors (Ensure WC is at the top)
  const rawFixturesList = dropdowns['Plumbing Fixtures'] || DEFAULT_PLUMBING_FIXTURES;
  const fixturesList = [...rawFixturesList].sort((a, b) => (a === 'WC' ? -1 : b === 'WC' ? 1 : 0));
  const pipeSizesList = dropdowns['Pipe Sizes (mm)'] || DEFAULT_PIPE_SIZES;
  const materialsList = dropdowns['Pipe Materials'] || DEFAULT_PIPE_MATERIALS;

  // Group By State
  const [groupBy, setGroupBy] = useState<string>('none');

  // --- Add/Edit Fixture Overlay Modal State ---
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'physical' | 'fixture'>('physical');
  const [newFixtureForm, setNewFixtureForm] = useState<Partial<PlumbingFixture>>({
    zone: '',
    fixture: 'WC',
    qty: 1,
    fixtureUnits: 6,
    pipeSize: 100,
    material: 'PVC',
    coldFlow: 8,
    hotFlow: 0,
    pipeLength: 10,
    notes: '',
  });

  const addFixture = () => {
    setEditingId(null);
    setNewFixtureForm({
      zone: `Toilet ${fixtures.length + 1}`,
      fixture: fixturesList[0] || 'WC',
      qty: 1,
      fixtureUnits: FIXTURE_UNIT_REFERENCE[fixturesList[0]] || 6,
      pipeSize: parseInt(pipeSizesList[0]) || 100,
      material: materialsList[0] || 'PVC',
      coldFlow: 8,
      hotFlow: 0,
      pipeLength: 10,
      notes: '',
    });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  const handleEditFixture = (fixture: PlumbingFixture) => {
    setEditingId(fixture.id);
    setNewFixtureForm({ ...fixture });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  const clearTable = () => {
    if (confirm('Are you sure you want to clear all plumbing fixtures from the table?')) {
      setFixtures([]);
    }
  };

  const handleSaveNewFixture = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setFixtures(prev => prev.map(item => item.id === editingId ? {
        ...item,
        zone: newFixtureForm.zone || item.zone,
        fixture: newFixtureForm.fixture || item.fixture,
        qty: Number(newFixtureForm.qty) || item.qty,
        fixtureUnits: Number(newFixtureForm.fixtureUnits) || item.fixtureUnits,
        pipeSize: Number(newFixtureForm.pipeSize) || item.pipeSize,
        material: newFixtureForm.material || item.material,
        coldFlow: Number(newFixtureForm.coldFlow) ?? item.coldFlow,
        hotFlow: Number(newFixtureForm.hotFlow) ?? item.hotFlow,
        pipeLength: Number(newFixtureForm.pipeLength) ?? item.pipeLength,
        notes: newFixtureForm.notes ?? item.notes,
      } : item));
      setEditingId(null);
    } else {
      const newFixture: PlumbingFixture = {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        zone: newFixtureForm.zone || `Area ${fixtures.length + 1}`,
        fixture: newFixtureForm.fixture || fixturesList[0] || 'WC',
        qty: Number(newFixtureForm.qty) || 1,
        fixtureUnits: FIXTURE_UNIT_REFERENCE[newFixtureForm.fixture || 'WC'] || 2,
        pipeSize: Number(newFixtureForm.pipeSize) || parseInt(pipeSizesList[0]) || 15,
        material: newFixtureForm.material || materialsList[0] || 'PVC',
        coldFlow: Number(newFixtureForm.coldFlow) || 8,
        hotFlow: Number(newFixtureForm.hotFlow) || 0,
        pipeLength: Number(newFixtureForm.pipeLength) || 10,
        notes: newFixtureForm.notes || '',
      };
      setFixtures(prev => [...prev, newFixture]);
    }
    setAddModalOpen(false);
  };

  const duplicateFixture = (id: string) => {
    const targetIdx = fixtures.findIndex(f => f.id === id);
    if (targetIdx === -1) return;
    const target = fixtures[targetIdx];
    const copy: PlumbingFixture = {
      ...target,
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    setFixtures(prev => {
      const updated = [...prev];
      updated.splice(targetIdx + 1, 0, copy);
      return updated;
    });
  };

  const updateField = (id: string, key: keyof PlumbingFixture, value: any) => {
    setFixtures(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [key]: value };
        // update default fixture units if fixture type is updated
        if (key === 'fixture' && FIXTURE_UNIT_REFERENCE[value] !== undefined) {
          updated.fixtureUnits = FIXTURE_UNIT_REFERENCE[value];
        }
        return updated;
      }
      return item;
    }));
  };

  const removeFixture = (id: string) => {
    if (confirm('Are you sure you want to remove this plumbing fixture?')) {
      setFixtures(prev => prev.filter(item => item.id !== id));
    }
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fixtures.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fixtures];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setFixtures(updated);
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
    meta[name] = { tabId: 'plumbing', role: 'column_dropdown' };
    saveMepDropdownMetadata(meta);
    window.dispatchEvent(new Event('storage'));

    setSelectedKey(name);
    setNewListName('');
    alert(`Created custom list "${name}". We have automatically set it to display as a Custom Column in this tab. Add options to it!`);
  };

  const handleHarvestFromTable = (field: 'zone' | 'notes') => {
    const harvested = new Set<string>();
    fixtures.forEach(f => {
      const v = (f[field] || '').toString().trim();
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

  // --- Sizing Calculations ---
  const totalFixtureUnits = fixtures.reduce((sum, p) => sum + (p.qty || 1) * (p.fixtureUnits || 0), 0);
  const estimatedPeakFlow = totalFixtureUnits * 0.5; // Hunter peak flow approximation

  const handleExportCSV = () => {
    let csv = `PLUMBING FIXTURE & DRAINAGE SCHEDULE REPORT\n\n`;
    csv += `Zone/Area,Plumbing Fixture,Qty,Fixture Units,Total FU,Pipe Size (mm),Material,Cold Flow L/m,Hot Flow L/m,Pipe Length (m),Notes\n`;

    fixtures.forEach(f => {
      const totalFU = (f.qty || 1) * (f.fixtureUnits || 0);
      csv += `"${f.zone}","${f.fixture}",${f.qty},${f.fixtureUnits},${totalFU},${f.pipeSize},"${f.material}",${f.coldFlow},${f.hotFlow},${f.pipeLength || 0},"${(f.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEP_Plumbing_Schedule.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Header Panel */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="text-base font-bold text-sky-400 flex items-center gap-2">
            <span>💧</span> Plumbing & Drainage Sizing
          </div>
          <div className="text-xs text-[#718096]">Fixture units allocation, peak flow estimations, and drainage layout</div>
        </div>

      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="bg-[#111522] border border-[#2b6cb0]/40 rounded-xl p-4 shadow-2xl space-y-4">
          <div className="text-xs font-bold text-sky-400 flex items-center gap-2 uppercase tracking-wider">
            <span>⚙️</span> Plumbing Dropdown Manager
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Configure dynamic lists for Plumbing Fixtures, Piping Sizes, and Piping Materials.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left controller */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase font-semibold">Select Dropdown Category (Edit Existing Lists)</label>
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded p-2 text-xs text-white focus:border-blue-500 outline-none"
                >
                  {getCategoriesForTab('plumbing', dropdowns).map(k => (
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
                    onClick={() => handleHarvestFromTable('zone')}
                    className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer"
                  >
                    Zones/Areas
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

            {/* Right option list */}
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
                        setSelectedKey(remaining[0] || 'Plumbing Fixtures');
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

      {/* Hidden File Input for Plumbing Sizing Sheet Imports */}
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Fixture Units (FU)', val: `${totalFixtureUnits} FU`, col: 'text-sky-300' },
          { label: 'Est. Peak Water Demand', val: `${estimatedPeakFlow.toFixed(1)} L/min`, col: 'text-[#63b3ed]' },
          { label: 'Fixture Types Listed', val: `${fixtures.length} Schedules`, col: 'text-gray-400' },
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

      {/* Schedule Table */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden shadow-xl">
        {/* Search & Group Bar */}
        <div className="sticky top-0 z-40 bg-[#13192a] p-3 border-b border-[#2d3748]/70 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-sky-400" />
              <span>Plumbing Fixtures Filter</span>
            </span>
            <div className="flex items-center gap-1.5 bg-[#0f1117] border border-[#2d3748] px-2.5 py-1 rounded text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Group By:</span>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="bg-transparent text-sky-400 font-bold outline-none cursor-pointer"
              >
                <option value="none">None</option>
                <option value="zone">Location / Room</option>
                <option value="fixture">Fixture Type</option>
                <option value="material">Material</option>
                <option value="pipeSize">Pipe Size</option>
              </select>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter fixtures by name, room, material..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0f1117] border border-[#2d3748] rounded-md text-xs text-white placeholder-gray-600 outline-none focus:border-sky-500/80 transition-colors font-medium"
            />
          </div>
        </div>

        <div
          ref={tableContainerRef}
          onScroll={handleTableScroll}
          className="sticky top-[48px] lg:top-[50px] z-30 overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] relative custom-scrollbar border border-[#2d3748]/60 rounded-lg"
        >
          <table className="w-full border-collapse text-xs text-left min-w-[1100px]">
            <thead className="sticky top-0 bg-[#13192a] z-30 shadow">
              <tr className="bg-[#13192a] text-[#718096] uppercase text-[10px] tracking-wider border-b border-[#2d3748] font-bold">
                <th className="sticky top-0 left-0 z-40 bg-[#13192a] p-3 w-14 border-r border-[#2d3748]/60 text-center text-[#718096]">Drag</th>
                <th className="sticky top-0 left-14 z-40 bg-[#13192a] p-3 w-44 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">Location / Room</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-48">Plumbing Fixture</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-20 text-center">Qty</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Fixture Units (ea)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center text-sky-400">Total FU</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Pipe Size (mm)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-36">Material</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Cold Flow L/m</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Hot Flow L/m</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center text-gray-400">Pipe Length (m)</th>
                <RenderCustomHeaders tabId="plumbing" />
                <th className="sticky top-0 z-30 bg-[#13192a] p-3">Notes</th>
                <th className="sticky top-0 right-0 z-40 bg-[#13192a] p-3 w-20 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748]/40">
              {fixtures.length === 0 ? (
                <tr>
                  <td colSpan={13 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No plumbing fixture groups listed yet. Click "+ Add Fixture Group" to provision drainage sizing.
                  </td>
                </tr>
              ) : filteredFixtures.length === 0 ? (
                <tr>
                  <td colSpan={13 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No plumbing fixtures match your search query.
                  </td>
                </tr>
              ) : (
                filteredFixtures.map((fixture) => {
                  const originalIdx = fixtures.findIndex(f => f.id === fixture.id);
                  const totalFU = (fixture.qty || 1) * (fixture.fixtureUnits || 0);

                  const isBeingDragged = draggedIndex === originalIdx;

                  return (
                    <tr
                      key={fixture.id}
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
                          const updated = [...fixtures];
                          const [moved] = updated.splice(draggedIndex, 1);
                          updated.splice(originalIdx, 0, moved);
                          setFixtures(updated);
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

                      {/* Sticky Area */}
                      <td className="sticky left-14 z-20 bg-[#151a26] p-2 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">
                        <RoomSelector
                          value={fixture.zone}
                          onChange={val => updateField(fixture.id, 'zone', val)}
                          settings={settings}
                          placeholder="Zone/Room..."
                        />
                      </td>

                      {/* Fixture Selector */}
                      <td className="p-2">
                        <select
                          value={fixture.fixture}
                          onChange={e => updateField(fixture.id, 'fixture', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-sky-400 font-semibold w-full outline-none"
                        >
                          {fixturesList.map(fix => (
                            <option key={fix} value={fix}>{fix}</option>
                          ))}
                        </select>
                      </td>

                      {/* Qty */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={fixture.qty || ''}
                          onChange={e => updateField(fixture.id, 'qty', Math.ceil(parseFloat(e.target.value) || 1))}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-14 text-center text-white outline-none font-bold font-mono"
                        />
                      </td>

                      {/* Fixture Units Individual */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.5"
                          value={fixture.fixtureUnits !== undefined ? fixture.fixtureUnits : 6}
                          onChange={e => updateField(fixture.id, 'fixtureUnits', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-16 text-center text-sky-300 font-mono outline-none font-semibold"
                        />
                      </td>

                      {/* Total FU */}
                      <td className="p-2 text-center text-sky-400 font-bold font-mono bg-[#141a29]/40">
                        {totalFU} FU
                      </td>

                      {/* Pipe Size */}
                      <td className="p-2 text-center">
                        <select
                          value={fixture.pipeSize}
                          onChange={e => updateField(fixture.id, 'pipeSize', parseInt(e.target.value) || 100)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-20 outline-none font-mono"
                        >
                          {pipeSizesList.map(sz => (
                            <option key={sz} value={sz}>{sz} mm</option>
                          ))}
                        </select>
                      </td>

                      {/* Material */}
                      <td className="p-2">
                        <select
                          value={fixture.material}
                          onChange={e => updateField(fixture.id, 'material', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-sky-300 font-semibold w-full outline-none"
                        >
                          {materialsList.map(mat => (
                            <option key={mat} value={mat}>{mat}</option>
                          ))}
                        </select>
                      </td>

                      {/* Cold Flow */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={fixture.coldFlow !== undefined ? fixture.coldFlow : 0}
                          onChange={e => updateField(fixture.id, 'coldFlow', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-16 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Hot Flow */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          value={fixture.hotFlow !== undefined ? fixture.hotFlow : 0}
                          onChange={e => updateField(fixture.id, 'hotFlow', parseFloat(e.target.value) || 0)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-16 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Pipe Length */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={fixture.pipeLength !== undefined ? fixture.pipeLength : ''}
                          onChange={e => updateField(fixture.id, 'pipeLength', parseFloat(e.target.value) || 0)}
                          placeholder="L"
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-16 text-center text-gray-400 outline-none font-mono font-semibold"
                        />
                      </td>

                      <RenderCustomCells
                        tabId="plumbing"
                        row={fixture}
                        dropdowns={dropdowns}
                        onChange={(val) => updateField(fixture.id, 'customValues' as any, val)}
                      />

                      {/* Notes */}
                      <td className="p-2">
                        <input
                          value={fixture.notes || ''}
                          onChange={e => updateField(fixture.id, 'notes', e.target.value)}
                          placeholder="Piping details..."
                          className="bg-transparent text-gray-300 px-1 py-0.5 outline-none focus:border-b focus:border-sky-500 w-full"
                        />
                      </td>

                      {/* Actions */}
                      <td className="sticky right-0 z-10 bg-[#151a26] p-2 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditFixture(fixture)}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 rounded transition-all cursor-pointer"
                            title="Edit Fixture Group"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => duplicateFixture(fixture.id)}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded transition-all cursor-pointer"
                            title="Duplicate Fixture Group"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => removeFixture(fixture.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-[#2c1a1e] rounded transition-all cursor-pointer"
                            title="Delete Fixture Group"
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
              Total Fixture Groups: <span className="text-sky-400 font-bold">{fixtures.length}</span>
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
              onClick={addFixture}
              className="bg-sky-600 hover:bg-sky-500 border border-sky-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-lg shadow-sky-500/20 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Fixture Group
            </button>
          </div>
        </div>
      </div>

      {/* ASPE Reference Board */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 mt-4 shadow-md">
        <div className="text-xs font-bold text-[#718096] mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <span>📐</span> ASPE Fixture Unit Reference Values
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {Object.entries(FIXTURE_UNIT_REFERENCE).map(([fix, fu]) => (
            <div key={fix} className="bg-[#0f1117] rounded-lg p-2.5 border border-[#2d3748] text-center">
              <div className="text-[10px] text-[#718096] mb-1 font-semibold">{fix}</div>
              <div className="text-base font-black text-sky-400 font-mono">{fu} FU</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Fixture Overlay Modal */}
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
              className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/80 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white my-8"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-[#12192b]/95 shrink-0">
                <div>
                  <h3 className="font-sans font-bold text-base text-sky-400 flex items-center gap-2">
                    <span>🚰</span> Add Plumbing Fixture Group
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure room dimensions, fixture count, sizing units, and pipe configurations.
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
                {(['physical', 'fixture'] as const).map((t) => {
                  const labels = {
                    physical: { title: '1. Location', desc: 'Zone / Room Selector' },
                    fixture: { title: '2. Fixture Specs', desc: 'Type, Quantity & Pipe Sizing' }
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTab(t)}
                      className={`flex-1 py-2 px-3 rounded-md transition-all text-left cursor-pointer ${
                        modalTab === t
                          ? 'bg-[#1e3a5f] text-sky-300 border border-sky-500/40 shadow'
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
              <form onSubmit={handleSaveNewFixture} className="p-5 overflow-y-auto space-y-4 flex-1 text-left select-none max-h-[60vh]">
                {modalTab === 'physical' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Zone / Room Name <span className="text-red-400">*</span>
                      </label>
                      <RoomSelector
                        value={newFixtureForm.zone || ''}
                        onChange={(val) => setNewFixtureForm(prev => ({ ...prev, zone: val }))}
                        settings={settings}
                        placeholder="Select or search toilet / bathroom name..."
                      />
                    </div>
                    <div className="bg-[#0c101b] border border-[#2d3748]/50 p-4 rounded-lg">
                      <span className="text-xs text-gray-400 leading-relaxed block">
                        Select a target room from your project settings to align plumbing fixtures with your spatial blueprint automatically.
                      </span>
                    </div>
                  </div>
                )}

                {modalTab === 'fixture' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fixture type */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Fixture Type
                        </label>
                        <select
                          value={newFixtureForm.fixture || 'WC'}
                          onChange={(e) => {
                            const fType = e.target.value;
                            setNewFixtureForm(prev => ({
                              ...prev,
                              fixture: fType,
                              fixtureUnits: FIXTURE_UNIT_REFERENCE[fType] || 2
                            }));
                          }}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-semibold cursor-pointer"
                        >
                          {fixturesList.map((f) => (
                            <option key={f} value={f}>{f}</option>
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
                          value={newFixtureForm.qty || 1}
                          onChange={(e) => setNewFixtureForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Fixture Units (Calculated automatically but editable) */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Fixture Units (FU)
                        </label>
                        <input
                          type="number"
                          value={newFixtureForm.fixtureUnits || 0}
                          onChange={(e) => setNewFixtureForm(prev => ({ ...prev, fixtureUnits: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      {/* Pipe Size */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Pipe Size (mm)
                        </label>
                        <select
                          value={newFixtureForm.pipeSize || 15}
                          onChange={(e) => setNewFixtureForm(prev => ({ ...prev, pipeSize: parseInt(e.target.value) || 15 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-semibold cursor-pointer"
                        >
                          {pipeSizesList.map((size) => (
                            <option key={size} value={size}>{size} mm</option>
                          ))}
                        </select>
                      </div>

                      {/* Material */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Material
                        </label>
                        <select
                          value={newFixtureForm.material || 'PVC'}
                          onChange={(e) => setNewFixtureForm(prev => ({ ...prev, material: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-semibold cursor-pointer"
                        >
                          {materialsList.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Cold Water Flow */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Cold Water Flow (L/m)
                        </label>
                        <input
                          type="number"
                          value={newFixtureForm.coldFlow ?? 8}
                          onChange={(e) => setNewFixtureForm(prev => ({ ...prev, coldFlow: Number(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      {/* Hot Water Flow */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Hot Water Flow (L/m)
                        </label>
                        <input
                          type="number"
                          value={newFixtureForm.hotFlow ?? 0}
                          onChange={(e) => setNewFixtureForm(prev => ({ ...prev, hotFlow: Number(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      {/* Pipe Length */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Pipe Run Length (m)
                        </label>
                        <input
                          type="number"
                          value={newFixtureForm.pipeLength ?? 10}
                          onChange={(e) => setNewFixtureForm(prev => ({ ...prev, pipeLength: Number(e.target.value) || 0 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500 font-mono"
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
                        value={newFixtureForm.notes || ''}
                        onChange={(e) => setNewFixtureForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional installation notes..."
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-sky-500"
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
                    className="bg-sky-600 hover:bg-sky-500 border border-sky-400 text-white text-xs font-bold px-5 py-2 rounded cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <span>🚰</span> Save Fixture
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
