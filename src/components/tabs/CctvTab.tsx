import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CctvCamera, ProjectSettings } from '../../types';
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

export const DEFAULT_CAMERA_TYPES = ['Dome', 'Bullet', 'PTZ', 'Fisheye', 'Box', 'Turret', 'Covert'];
export const DEFAULT_RESOLUTIONS = ['1MP (720p)', '2MP (1080p)', '4MP (2K)', '5MP', '8MP (4K)', '12MP'];
export const DEFAULT_COMPRESSIONS = ['H.265+', 'H.265', 'H.264+', 'H.264', 'MJPEG'];
export const DEFAULT_LENSES = ['2.8', '3.6', '4', '6', '8', '12', '16', 'Varifocal 2.8-12', 'Varifocal 5-50'];
export const DEFAULT_POE_CLASSES = ['PoE (15.4W)', 'PoE+ (30W)', 'PoE++ (60W)', 'Non-PoE (12VDC)', 'Non-PoE (24VAC)'];

// Storage bitrates mapping in Mbps (approximate for H.265 at 15fps)
export const RESOLUTION_BITRATES: Record<string, number> = {
  '1MP (720p)': 2,
  '2MP (1080p)': 4,
  '4MP (2K)': 6,
  '5MP': 8,
  '8MP (4K)': 12,
  '12MP': 20,
};

interface CctvTabProps {
  cameras: CctvCamera[];
  setCameras: React.Dispatch<React.SetStateAction<CctvCamera[]>>;
  retentionDays: number;
  setRetentionDays: (days: number) => void;
  settings?: ProjectSettings;
  setSettings?: React.Dispatch<React.SetStateAction<ProjectSettings>>;
}

export default function CctvTab({
  cameras,
  setCameras,
  retentionDays,
  setRetentionDays,
  settings,
  setSettings
}: CctvTabProps) {
  // Hidden File Input Ref for Imports
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // File Import Logic
  const handleImportFile = async (file: File, mode: 'append' | 'replace') => {
    try {
      window.dispatchEvent(new CustomEvent('trigger-mep-import-loading', { detail: true }));
      await new Promise(r => setTimeout(r, 100));
      const res = await parseMEPFile(file, [], settings);
      if (res.cameras && res.cameras.length > 0) {
        setCameras(prev => mode === 'replace' ? res.cameras! : [...prev, ...res.cameras!]);
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
      'Location / Room', 'Camera Type', 'Resolution', 'FPS', 'Compression', 'Lens', 'PoE Class', 'Qty', 'Indoor', 'IR Support', 'Notes'
    ];
    
    const dataRows = cameras.map(c => [
      c.location, c.type, c.resolution, c.fps, c.compression, c.lens, c.poeClass, c.qty, c.indoor ? 'True' : 'False', c.ir ? 'True' : 'False', c.notes
    ]);
    
    const allRows = [headers, ...dataRows];
    
    if (format === 'xlsx' || format === 'xls') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, 'CCTV Cameras Schedule');
      XLSX.writeFile(wb, `CCTV_Cameras_Schedule.${format}`);
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
      link.setAttribute('download', `CCTV_Cameras_Schedule.${isCsv ? 'csv' : 'txt'}`);
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

    window.addEventListener('trigger-mep-import-cctv', handleImportTrigger);
    window.addEventListener('trigger-mep-export-cctv', handleExportTrigger);

    return () => {
      window.removeEventListener('trigger-mep-import-cctv', handleImportTrigger);
      window.removeEventListener('trigger-mep-export-cctv', handleExportTrigger);
    };
  }, [cameras]);

  // --- Collapsible Dropdowns State ---
  const [showSettings, setShowSettings] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const customCols = getCustomColumnsForTab('cctv');

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
  }, [cameras]);
  const [dropdowns, setDropdowns] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('electrical_dropdowns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          'Camera Types': DEFAULT_CAMERA_TYPES,
          'Resolutions': DEFAULT_RESOLUTIONS,
          'Compression': DEFAULT_COMPRESSIONS,
          'Lenses (mm)': DEFAULT_LENSES,
          'PoE Classes': DEFAULT_POE_CLASSES,
          ...parsed
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      'Camera Types': DEFAULT_CAMERA_TYPES,
      'Resolutions': DEFAULT_RESOLUTIONS,
      'Compression': DEFAULT_COMPRESSIONS,
      'Lenses (mm)': DEFAULT_LENSES,
      'PoE Classes': DEFAULT_POE_CLASSES
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
  const [selectedKey, setSelectedKey] = useState('Camera Types');
  const [newOption, setNewOption] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newListName, setNewListName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCameras = cameras.filter(cam => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (cam.location && cam.location.toLowerCase().includes(q)) ||
      (cam.type && cam.type.toLowerCase().includes(q)) ||
      (cam.notes && cam.notes.toLowerCase().includes(q)) ||
      (cam.resolution && cam.resolution.toLowerCase().includes(q)) ||
      (cam.compression && cam.compression.toLowerCase().includes(q)) ||
      (cam.poeClass && cam.poeClass.toLowerCase().includes(q)) ||
      (cam.lens && cam.lens.toLowerCase().includes(q))
    );
  });

  // Sourced dropdown vectors
  const cameraTypesList = dropdowns['Camera Types'] || DEFAULT_CAMERA_TYPES;
  const resolutionsList = dropdowns['Resolutions'] || DEFAULT_RESOLUTIONS;
  const compressionsList = dropdowns['Compression'] || DEFAULT_COMPRESSIONS;
  const lensesList = dropdowns['Lenses (mm)'] || DEFAULT_LENSES;
  const poeClassesList = dropdowns['PoE Classes'] || DEFAULT_POE_CLASSES;

  // Edit & Group By State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<string>('none');

  const clearTable = () => {
    if (confirm('Are you sure you want to clear all CCTV camera nodes from the schedule?')) {
      setCameras([]);
    }
  };

  const handleEditCamera = (cam: CctvCamera) => {
    setEditingId(cam.id);
    setNewCameraForm({ ...cam });
    setModalTab('physical');
    setAddModalOpen(true);
  };
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'physical' | 'cctv'>('physical');
  const [newCameraForm, setNewCameraForm] = useState<Partial<CctvCamera>>({
    location: '',
    type: 'Dome',
    resolution: '2MP (1080p)',
    fps: 15,
    compression: 'H.265',
    lens: '2.8',
    poeClass: 'PoE (15.4W)',
    qty: 1,
    indoor: true,
    ir: true,
    notes: '',
  });

  const addCamera = () => {
    setEditingId(null);
    setNewCameraForm({
      location: `Camera Area ${cameras.length + 1}`,
      type: cameraTypesList[0] || 'Dome',
      resolution: resolutionsList[1] || '2MP (1080p)',
      fps: 15,
      compression: compressionsList[1] || 'H.265',
      lens: lensesList[0] || '2.8',
      poeClass: poeClassesList[0] || 'PoE (15.4W)',
      qty: 1,
      indoor: true,
      ir: true,
      notes: '',
    });
    setModalTab('physical');
    setAddModalOpen(true);
  };

  const handleSaveNewCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setCameras(prev => prev.map(item => item.id === editingId ? {
        ...item,
        location: newCameraForm.location || item.location,
        type: newCameraForm.type || item.type,
        resolution: newCameraForm.resolution || item.resolution,
        fps: Number(newCameraForm.fps) || item.fps,
        compression: newCameraForm.compression || item.compression,
        lens: newCameraForm.lens || item.lens,
        poeClass: newCameraForm.poeClass || item.poeClass,
        qty: Number(newCameraForm.qty) || item.qty,
        indoor: newCameraForm.indoor !== undefined ? newCameraForm.indoor : item.indoor,
        ir: newCameraForm.ir !== undefined ? newCameraForm.ir : item.ir,
        notes: newCameraForm.notes !== undefined ? newCameraForm.notes : item.notes
      } : item));
      setEditingId(null);
    } else {
      const newCamera: CctvCamera = {
        id: Math.random().toString(36).slice(2, 8).toUpperCase(),
        location: newCameraForm.location || `Camera Area ${cameras.length + 1}`,
        type: newCameraForm.type || cameraTypesList[0] || 'Dome',
        resolution: newCameraForm.resolution || resolutionsList[1] || '2MP (1080p)',
        fps: Number(newCameraForm.fps) || 15,
        compression: newCameraForm.compression || compressionsList[1] || 'H.265',
        lens: newCameraForm.lens || lensesList[0] || '2.8',
        poeClass: newCameraForm.poeClass || poeClassesList[0] || 'PoE (15.4W)',
        qty: Number(newCameraForm.qty) || 1,
        indoor: newCameraForm.indoor !== undefined ? newCameraForm.indoor : true,
        ir: newCameraForm.ir !== undefined ? newCameraForm.ir : true,
        notes: newCameraForm.notes || '',
      };
      setCameras(prev => [...prev, newCamera]);
    }
    setAddModalOpen(false);
  };

  const updateCameraField = (id: string, key: keyof CctvCamera, value: any) => {
    setCameras(prev => prev.map(item => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const removeCamera = (id: string) => {
    if (confirm('Are you sure you want to remove this camera node?')) {
      setCameras(prev => prev.filter(item => item.id !== id));
    }
  };

  const duplicateCamera = (id: string) => {
    const targetIdx = cameras.findIndex(c => c.id === id);
    if (targetIdx === -1) return;
    const target = cameras[targetIdx];
    const copy: CctvCamera = {
      ...target,
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    setCameras(prev => {
      const updated = [...prev];
      updated.splice(targetIdx + 1, 0, copy);
      return updated;
    });
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === cameras.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...cameras];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCameras(updated);
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
    meta[name] = { tabId: 'cctv', role: 'column_dropdown' };
    saveMepDropdownMetadata(meta);
    window.dispatchEvent(new Event('storage'));

    setSelectedKey(name);
    setNewListName('');
    alert(`Created custom list "${name}". We have automatically set it to display as a Custom Column in this tab. Add options to it!`);
  };

  const handleHarvestFromTable = (field: 'location' | 'notes') => {
    const harvested = new Set<string>();
    cameras.forEach(c => {
      const v = (c[field] || '').toString().trim();
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
  const totalQty = cameras.reduce((sum, item) => sum + (item.qty || 1), 0);

  // Storage = Mbps * (fps/15) * 86400s * qty * retentionDays / 8 bits / 1024 GB
  const totalStorageGB = cameras.reduce((sum, item) => {
    const baseBitrate = RESOLUTION_BITRATES[item.resolution] || 4;
    const fpsScaling = (item.fps || 15) / 15;
    const dailyCamFootprintGB = (baseBitrate * fpsScaling * 86400) / 8 / 1024;
    return sum + dailyCamFootprintGB * (item.qty || 1) * retentionDays;
  }, 0);

  // Recommended HDD in TB with a 20% system cushion
  const recommendedHddTB = (totalStorageGB * 1.2) / 1024;

  const totalPoEWatts = cameras.reduce((sum, item) => {
    const clsWatts =
      item.poeClass === 'PoE (15.4W)'
        ? 15.4
        : item.poeClass === 'PoE+ (30W)'
        ? 30.0
        : item.poeClass === 'PoE++ (60W)'
        ? 60.0
        : 0;
    return sum + clsWatts * (item.qty || 1);
  }, 0);

  const poeSwitchBudgetW = Math.ceil(totalPoEWatts * 1.3); // 30% overhead for switch rating sizing

  const nvrType =
    totalQty <= 4
      ? '4-Ch NVR'
      : totalQty <= 8
      ? '8-Ch NVR'
      : totalQty <= 16
      ? '16-Ch NVR'
      : totalQty <= 32
      ? '32-Ch NVR'
      : '64-Ch NVR';

  const handleExportCSV = () => {
    let csv = `CCTV SECURITY CAMERAS SCHEDULE REPORT\n\n`;
    csv += `Location,Type,Resolution,FPS,Compression,Lens (mm),Power PoE,Qty,Indoor,IR Night,Notes\n`;

    cameras.forEach(c => {
      csv += `"${c.location}","${c.type}","${c.resolution}",${c.fps},"${c.compression}","${c.lens}","${c.poeClass}",${c.qty},${c.indoor},${c.ir},"${(c.notes || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEP_CCTV_Schedule.csv`;
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
            <span>📹</span> CCTV Security System Design
          </div>
          <div className="text-xs text-[#718096]">Camera specification schedules, power budget, and HDD calculations</div>
        </div>

      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="bg-[#111522] border border-[#2b6cb0]/40 rounded-xl p-4 shadow-2xl space-y-4">
          <div className="text-xs font-bold text-sky-400 flex items-center gap-2 uppercase tracking-wider">
            <span>⚙️</span> CCTV Dropdowns Config
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Configure dynamic lists for Camera Body Styles, Lens Focal Lengths, and PoE Classes.
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
                  {getCategoriesForTab('cctv', dropdowns).map(k => (
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
                    onClick={() => handleHarvestFromTable('location')}
                    className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/50 text-purple-300 text-[10px] font-bold py-1 px-1.5 rounded cursor-pointer"
                  >
                    Locations
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
                    placeholder="e.g. Brand Choices"
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

            {/* Right option content */}
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
                        setSelectedKey(remaining[0] || 'Camera Types');
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

      {/* Hidden File Input for CCTV Sizing Sheet Imports */}
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
          { label: 'Total Cameras Provisioned', val: `${totalQty} Nodes`, col: 'text-sky-300' },
          { label: 'Estimated Video Storage', val: `${totalStorageGB >= 1024 ? (totalStorageGB / 1024).toFixed(2) : Math.ceil(totalStorageGB)} ${totalStorageGB >= 1024 ? 'TB' : 'GB'}`, col: 'text-[#63b3ed]' },
          { label: 'Recommended HDD Size', val: `${Math.ceil(recommendedHddTB)} TB`, col: 'text-[#f6ad55]' },
          { label: 'Total PoE Budget', val: `${totalPoEWatts.toFixed(1)} Watts`, col: 'text-purple-400' },
          { label: 'PoE Switch Budget (Overhead)', val: `≥ ${poeSwitchBudgetW} Watts`, col: 'text-purple-300' },
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

      {/* Global Config Settings */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-md">
        <div>
          <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Video Retention Days</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={retentionDays}
              onChange={e => setRetentionDays(Math.max(1, parseInt(e.target.value) || 30))}
              className="bg-[#0f1117] border border-[#2d3748] rounded text-[#cbd5e0] text-xs font-bold px-3 py-1 outline-none w-24 font-mono"
            />
            <span className="text-xs text-[#718096]">Days (Default: 30 days)</span>
          </div>
        </div>
        <div className="text-[11px] text-[#718096] leading-relaxed max-w-md">
          Hardware sizing calculations assume continuous 24/7 video recording stream using modern <span className="text-[#63b3ed] font-semibold">H.265 compression format</span>.
        </div>
        <div className="ml-auto bg-[#0f1117] px-3 py-2 rounded-lg border border-[#2d3748] text-right font-mono">
          <div className="text-[9px] text-[#718096]">SUGGESTED EQUIPMENT</div>
          <div className="text-xs text-sky-400 font-bold">{nvrType} with {Math.ceil(recommendedHddTB)}TB HDD</div>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-xl overflow-hidden shadow-xl">
        {/* Search & Group Bar */}
        <div className="sticky top-0 z-40 bg-[#13192a] p-3 border-b border-[#2d3748]/70 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-sky-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-sky-400" />
              <span>CCTV Node Search Filters</span>
            </span>
            <div className="flex items-center gap-1.5 bg-[#0f1117] border border-[#2d3748] px-2.5 py-1 rounded text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Group By:</span>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="bg-transparent text-sky-400 font-bold outline-none cursor-pointer"
              >
                <option value="none">None</option>
                <option value="location">Location / Room</option>
                <option value="type">Body Style</option>
                <option value="poeClass">PoE Classification</option>
              </select>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter cameras by location or style..."
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
          <table className="w-full border-collapse text-xs text-left min-w-[1250px]">
            <thead className="sticky top-0 bg-[#13192a] z-30 shadow">
              <tr className="bg-[#13192a] text-[#718096] uppercase text-[10px] tracking-wider border-b border-[#2d3748] font-bold font-mono">
                <th className="sticky top-0 left-0 z-40 bg-[#13192a] p-3 w-14 border-r border-[#2d3748]/60 text-center text-[#718096]">Drag</th>
                <th className="sticky top-0 left-14 z-40 bg-[#13192a] p-3 w-48 border-r border-[#2d3748]/60 shadow-[3px_0_5px_rgba(0,0,0,0.2)]">Location / Room</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-36">Body Style</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-40">Resolution</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-20 text-center">FPS</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28">Compression</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-28 text-center">Lens (mm)</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-40">PoE Classification</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-20 text-center">Qty</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">Outdoor?</th>
                <th className="sticky top-0 z-30 bg-[#13192a] p-3 w-24 text-center">IR/LED?</th>
                <RenderCustomHeaders tabId="cctv" />
                <th className="sticky top-0 z-30 bg-[#13192a] p-3">Notes</th>
                <th className="sticky top-0 right-0 z-40 bg-[#13192a] p-3 w-20 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3748]/40">
              {cameras.length === 0 ? (
                <tr>
                  <td colSpan={13 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No CCTV nodes mapped yet. Click "+ Add Camera Node" to configure CCTV schedule.
                  </td>
                </tr>
              ) : filteredCameras.length === 0 ? (
                <tr>
                  <td colSpan={13 + customCols.length} className="p-12 text-center text-[#718096] italic">
                    No camera nodes match your search query.
                  </td>
                </tr>
              ) : (
                filteredCameras.map((cam) => {
                  const originalIdx = cameras.findIndex(c => c.id === cam.id);
                  const isBeingDragged = draggedIndex === originalIdx;
                  return (
                    <tr
                      key={cam.id}
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
                          const updated = [...cameras];
                          const [moved] = updated.splice(draggedIndex, 1);
                          updated.splice(originalIdx, 0, moved);
                          setCameras(updated);
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
                          value={cam.location}
                          onChange={val => updateCameraField(cam.id, 'location', val)}
                          settings={settings}
                          placeholder="Camera Location..."
                        />
                      </td>

                      {/* Camera Body Style */}
                      <td className="p-2">
                        <select
                          value={cam.type}
                          onChange={e => updateCameraField(cam.id, 'type', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                        >
                          {cameraTypesList.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>

                      {/* Resolution */}
                      <td className="p-2">
                        <select
                          value={cam.resolution}
                          onChange={e => updateCameraField(cam.id, 'resolution', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-[#cbd5e0] w-full outline-none font-semibold text-sky-400"
                        >
                          {resolutionsList.map(res => (
                            <option key={res} value={res}>{res}</option>
                          ))}
                        </select>
                      </td>

                      {/* FPS */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={cam.fps || 15}
                          onChange={e => updateCameraField(cam.id, 'fps', parseInt(e.target.value) || 15)}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-14 text-center text-white outline-none font-mono"
                        />
                      </td>

                      {/* Compression */}
                      <td className="p-2">
                        <select
                          value={cam.compression}
                          onChange={e => updateCameraField(cam.id, 'compression', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                        >
                          {compressionsList.map(comp => (
                            <option key={comp} value={comp}>{comp}</option>
                          ))}
                        </select>
                      </td>

                      {/* Lens Focal Length */}
                      <td className="p-2 text-center">
                        <select
                          value={cam.lens}
                          onChange={e => updateCameraField(cam.id, 'lens', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-white w-24 outline-none font-mono"
                        >
                          {lensesList.map(len => (
                            <option key={len} value={len}>{len} mm</option>
                          ))}
                        </select>
                      </td>

                      {/* PoE Classification */}
                      <td className="p-2">
                        <select
                          value={cam.poeClass}
                          onChange={e => updateCameraField(cam.id, 'poeClass', e.target.value)}
                          className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-purple-300 w-full outline-none font-semibold"
                        >
                          {poeClassesList.map(pCls => (
                            <option key={pCls} value={pCls}>{pCls}</option>
                          ))}
                        </select>
                      </td>

                      {/* Qty */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={cam.qty || 1}
                          onChange={e => updateCameraField(cam.id, 'qty', Math.ceil(parseFloat(e.target.value) || 1))}
                          className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-12 text-center text-white outline-none font-bold font-mono"
                        />
                      </td>

                      {/* Indoor checkbox toggle */}
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!cam.indoor}
                          onChange={e => updateCameraField(cam.id, 'indoor', e.target.checked)}
                          className="w-4 h-4 text-sky-600 bg-gray-900 border-gray-700 rounded focus:ring-sky-500 cursor-pointer"
                        />
                      </td>

                      {/* IR checkbox toggle */}
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!cam.ir}
                          onChange={e => updateCameraField(cam.id, 'ir', e.target.checked)}
                          className="w-4 h-4 text-sky-600 bg-gray-900 border-gray-700 rounded focus:ring-sky-500 cursor-pointer"
                        />
                      </td>

                      <RenderCustomCells
                        tabId="cctv"
                        row={cam}
                        dropdowns={dropdowns}
                        onChange={(val) => updateCameraField(cam.id, 'customValues' as any, val)}
                      />

                      {/* Notes */}
                      <td className="p-2">
                        <input
                          value={cam.notes || ''}
                          onChange={e => updateCameraField(cam.id, 'notes', e.target.value)}
                          placeholder="Node details..."
                          className="bg-transparent text-gray-300 px-1 py-0.5 outline-none focus:border-b focus:border-sky-500 w-full"
                        />
                      </td>

                      {/* Actions */}
                      <td className="sticky right-0 z-10 bg-[#151a26] p-2 text-center border-l border-[#2d3748]/60 shadow-[-3px_0_5px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditCamera(cam)}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 rounded transition-all cursor-pointer"
                            title="Edit Camera"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => duplicateCamera(cam.id)}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded transition-all cursor-pointer"
                            title="Duplicate Camera"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => removeCamera(cam.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-[#2c1a1e] rounded transition-all cursor-pointer"
                            title="Delete Camera"
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
              Total Cameras: <span className="text-sky-400 font-bold">{cameras.length}</span>
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
              onClick={addCamera}
              className="bg-sky-600 hover:bg-sky-500 border border-sky-400 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-lg shadow-sky-500/20 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Camera Node
            </button>
          </div>
        </div>
      </div>

      {/* Add Camera Overlay Modal */}
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
                  <h3 className="font-sans font-bold text-base text-purple-400 flex items-center gap-2">
                    <span>📹</span> Add Security CCTV Camera
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure camera location, specifications, network bandwidth, and PoE details.
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
                {(['physical', 'cctv'] as const).map((t) => {
                  const labels = {
                    physical: { title: '1. Location', desc: 'Room / Area Selector' },
                    cctv: { title: '2. Camera Specs', desc: 'Hardware, Optics & PoE Power' }
                  };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalTab(t)}
                      className={`flex-1 py-2 px-3 rounded-md transition-all text-left cursor-pointer ${
                        modalTab === t
                          ? 'bg-[#1e3a5f] text-purple-300 border border-purple-500/40 shadow'
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
              <form onSubmit={handleSaveNewCamera} className="p-5 overflow-y-auto space-y-4 flex-1 text-left select-none max-h-[60vh]">
                {modalTab === 'physical' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Installation Location / Room <span className="text-red-400">*</span>
                      </label>
                      <RoomSelector
                        value={newCameraForm.location || ''}
                        onChange={(val) => setNewCameraForm(prev => ({ ...prev, location: val }))}
                        settings={settings}
                        placeholder="Select or search installation room name..."
                      />
                    </div>
                    <div className="flex items-center gap-4 bg-[#0c101b] p-4 border border-[#2d3748]/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="newIndoorCheck"
                          checked={newCameraForm.indoor ?? true}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, indoor: e.target.checked }))}
                          className="rounded text-purple-500 bg-transparent border-[#2d3748] cursor-pointer"
                        />
                        <label htmlFor="newIndoorCheck" className="text-xs font-semibold cursor-pointer">Indoor Camera Mode</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="newIrCheck"
                          checked={newCameraForm.ir ?? true}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, ir: e.target.checked }))}
                          className="rounded text-purple-500 bg-transparent border-[#2d3748] cursor-pointer"
                        />
                        <label htmlFor="newIrCheck" className="text-xs font-semibold cursor-pointer">Night Vision / IR Active</label>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'cctv' && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Camera type */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Camera Type / Housing
                        </label>
                        <select
                          value={newCameraForm.type || 'Dome'}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500 font-semibold cursor-pointer"
                        >
                          {cameraTypesList.map((camType) => (
                            <option key={camType} value={camType}>{camType}</option>
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
                          value={newCameraForm.qty || 1}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Resolution */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Sensor Resolution
                        </label>
                        <select
                          value={newCameraForm.resolution || '2MP (1080p)'}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, resolution: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500 font-semibold cursor-pointer"
                        >
                          {resolutionsList.map((res) => (
                            <option key={res} value={res}>{res}</option>
                          ))}
                        </select>
                      </div>

                      {/* Compression */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Codec / Compression
                        </label>
                        <select
                          value={newCameraForm.compression || 'H.265'}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, compression: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500 font-semibold cursor-pointer"
                        >
                          {compressionsList.map((comp) => (
                            <option key={comp} value={comp}>{comp}</option>
                          ))}
                        </select>
                      </div>

                      {/* Lens */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Lens Focal length (mm)
                        </label>
                        <select
                          value={newCameraForm.lens || '2.8'}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, lens: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500 font-semibold cursor-pointer"
                        >
                          {lensesList.map((lens) => (
                            <option key={lens} value={lens}>{lens} mm</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* FPS */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          Recording Framerate (FPS)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={newCameraForm.fps ?? 15}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, fps: parseInt(e.target.value) || 15 }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      {/* PoE Class */}
                      <div>
                        <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                          PoE Class (Load)
                        </label>
                        <select
                          value={newCameraForm.poeClass || 'PoE (15.4W)'}
                          onChange={(e) => setNewCameraForm(prev => ({ ...prev, poeClass: e.target.value }))}
                          className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500 font-semibold cursor-pointer"
                        >
                          {poeClassesList.map((poe) => (
                            <option key={poe} value={poe}>{poe}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                        Notes & Comments
                      </label>
                      <input
                        type="text"
                        value={newCameraForm.notes || ''}
                        onChange={(e) => setNewCameraForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional IP, switch, or cabling comments..."
                        className="w-full bg-[#0f1117] border border-[#2d3748] rounded-md text-white p-2 text-xs outline-none focus:border-purple-500"
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
                    className="bg-purple-600 hover:bg-purple-500 border border-purple-400 text-white text-xs font-bold px-5 py-2 rounded cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <span>📹</span> Save Camera
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
