import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Plus, Trash2, Settings } from 'lucide-react';
import { ROOM_LUX_DATABASE, ProjectSettings } from '../types';

export interface DropdownMeta {
  tabId: string; // 'electrical' | 'industrial' | 'hvac' | 'plumbing' | 'fire' | 'solar' | 'generator' | 'smarthome' | 'cctv' | 'all'
  role: 'options' | 'column_dropdown' | 'column_text' | 'column_number' | 'variance';
}

export interface TabInfo {
  id: string;
  name: string;
}

export const MEP_TABS: TabInfo[] = [
  { id: 'electrical', name: 'Electrical Sizing' },
  { id: 'industrial', name: 'Industrial Sizing' },
  { id: 'hvac', name: 'HVAC Sizing' },
  { id: 'plumbing', name: 'Plumbing Sizing' },
  { id: 'fire', name: 'Fire Protection' },
  { id: 'solar', name: 'Solar PV & Battery' },
  { id: 'generator', name: 'Generator Sizing' },
  { id: 'smarthome', name: 'Smart Home / IoT' },
  { id: 'cctv', name: 'CCTV Security' },
  { id: 'all', name: 'All Tabs / Shared MEP' },
];

export interface RoleInfo {
  id: DropdownMeta['role'];
  name: string;
  description: string;
}

export const MEP_ROLES: RoleInfo[] = [
  { id: 'options', name: 'Dropdown Options List', description: 'Displays as options for existing tab dropdowns' },
  { id: 'column_dropdown', name: 'New Column (Dropdown)', description: 'Adds a new table column with this list as dropdown options' },
  { id: 'column_text', name: 'New Column (Plain Text)', description: 'Adds a new table column with plain text input' },
  { id: 'column_number', name: 'New Column (Number)', description: 'Adds a new table column with number input' },
  { id: 'variance', name: 'Load Variance / Sizing Category', description: 'Acts as custom load variances or sub-categories' },
];

// Map of standard categories to default tab/role
export const DEFAULT_MEP_METADATA: Record<string, DropdownMeta> = {
  'Lighting Types': { tabId: 'electrical', role: 'options' },
  'Fixture Styles': { tabId: 'electrical', role: 'options' },
  'Mount Types': { tabId: 'electrical', role: 'options' },
  'Lighting Controls': { tabId: 'electrical', role: 'options' },
  'Socket Types': { tabId: 'electrical', role: 'options' },
  'Socket Sizing / Rating': { tabId: 'electrical', role: 'variance' },
  'Socket Fix Styles': { tabId: 'electrical', role: 'options' },
  'Socket Mounts': { tabId: 'electrical', role: 'options' },
  'Socket Controls': { tabId: 'electrical', role: 'options' },
  'AC Types': { tabId: 'electrical', role: 'options' },
  'AC Fix Styles': { tabId: 'electrical', role: 'options' },
  'AC Mounts': { tabId: 'electrical', role: 'options' },
  'AC Controls': { tabId: 'electrical', role: 'options' },
  'Dedicated Types': { tabId: 'electrical', role: 'options' },
  'Dedicated Fix Styles': { tabId: 'electrical', role: 'options' },
  'Dedicated 3Phase Variances': { tabId: 'electrical', role: 'variance' },
  'Wire Sizes (mm²)': { tabId: 'electrical', role: 'options' },
  'Cable Cores': { tabId: 'electrical', role: 'options' },
  'Switch Types': { tabId: 'electrical', role: 'options' },
  'CB Sizes (A)': { tabId: 'electrical', role: 'options' },
  'Cable Core Palette': { tabId: 'all', role: 'options' },

  'Plumbing Fixtures': { tabId: 'plumbing', role: 'options' },
  'Pipe Sizes (mm)': { tabId: 'plumbing', role: 'options' },
  'Pipe Materials': { tabId: 'plumbing', role: 'options' },

  'Fire Hazards': { tabId: 'fire', role: 'options' },
  'Sprinkler Types': { tabId: 'fire', role: 'options' },
  'Fire Pipe Sizes (mm)': { tabId: 'fire', role: 'options' },

  'Inverter Types': { tabId: 'solar', role: 'options' },
  'Battery Types': { tabId: 'solar', role: 'options' },
  'Panel Wattages (W)': { tabId: 'solar', role: 'options' },

  'Generator Load Types': { tabId: 'generator', role: 'options' },
  'Generator Fuel Types': { tabId: 'generator', role: 'options' },

  'Industrial Load Types': { tabId: 'industrial', role: 'options' },
  'Industrial Volts (V)': { tabId: 'industrial', role: 'options' },
  'Industrial Breakers (A)': { tabId: 'industrial', role: 'options' },

  'IoT Device Types': { tabId: 'smarthome', role: 'options' },
  'IoT Protocols': { tabId: 'smarthome', role: 'options' },
  'IoT Platforms': { tabId: 'smarthome', role: 'options' },
  'IoT Rooms': { tabId: 'smarthome', role: 'options' },

  'HVAC System Types': { tabId: 'hvac', role: 'options' },
  'HVAC Refrigerants': { tabId: 'hvac', role: 'options' },

  'Camera Types': { tabId: 'cctv', role: 'options' },
  'Resolutions': { tabId: 'cctv', role: 'options' },
  'Compression': { tabId: 'cctv', role: 'options' },
  'Lenses (mm)': { tabId: 'cctv', role: 'options' },
  'PoE Classes': { tabId: 'cctv', role: 'options' },
};

const STORAGE_KEY = 'mep_dropdown_metadata_v1';

export function getMepDropdownMetadata(): Record<string, DropdownMeta> {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_MEP_METADATA, ...JSON.parse(saved) };
    } catch (e) {
      // fallback
    }
  }
  return DEFAULT_MEP_METADATA;
}

export function saveMepDropdownMetadata(metadata: Record<string, DropdownMeta>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
}

// Get dropdown categories that should be configured on a given tab
export function getCategoriesForTab(tabId: string, dropdowns: Record<string, any>): string[] {
  const metadata = getMepDropdownMetadata();
  return Object.keys(dropdowns).filter(key => {
    const meta = metadata[key];
    if (!meta) {
      // default fallbacks if not in metadata
      if (tabId === 'electrical') {
        const otherTabsKeys = new Set([
          'Plumbing Fixtures', 'Pipe Sizes (mm)', 'Pipe Materials',
          'Fire Hazards', 'Sprinkler Types', 'Fire Pipe Sizes (mm)',
          'Inverter Types', 'Battery Types', 'Panel Wattages (W)',
          'Generator Load Types', 'Generator Fuel Types',
          'Industrial Load Types', 'Industrial Volts (V)', 'Industrial Breakers (A)',
          'IoT Device Types', 'IoT Protocols', 'IoT Platforms', 'IoT Rooms',
          'HVAC System Types', 'HVAC Refrigerants', 'Cable Core Palette',
          'Camera Types', 'Resolutions', 'Compression', 'Lenses (mm)', 'PoE Classes'
        ]);
        return !otherTabsKeys.has(key);
      }
      return false;
    }
    return meta.tabId === tabId || meta.tabId === 'all';
  });
}

// Get custom columns defined for a given tab
export interface CustomColumnConfig {
  categoryName: string;
  role: 'column_dropdown' | 'column_text' | 'column_number';
}

export function getCustomColumnsForTab(tabId: string): CustomColumnConfig[] {
  const metadata = getMepDropdownMetadata();
  return Object.entries(metadata)
    .filter(([_, meta]) => meta.tabId === tabId && meta.role.startsWith('column_'))
    .map(([categoryName, meta]) => ({
      categoryName,
      role: meta.role as CustomColumnConfig['role']
    }));
}

// React components for easy table integration
export function RenderCustomHeaders({ tabId }: { tabId: string }) {
  const customCols = getCustomColumnsForTab(tabId);
  return (
    <>
      {customCols.map(col => (
        <th
          key={col.categoryName}
          className="p-2 text-[#718096] font-semibold text-center min-w-[120px] max-w-[200px]"
        >
          {col.categoryName}
        </th>
      ))}
    </>
  );
}

interface RenderCustomCellsProps {
  tabId: string;
  row: any;
  dropdowns: Record<string, string[]>;
  onChange: (val: Record<string, any>) => void;
}

export function RenderCustomCells({ tabId, row, dropdowns, onChange }: RenderCustomCellsProps) {
  const customCols = getCustomColumnsForTab(tabId);
  if (customCols.length === 0) return null;

  return (
    <>
      {customCols.map(col => {
        const val = (row.customValues && row.customValues[col.categoryName]) || '';
        return (
          <td key={col.categoryName} className="p-2 text-center">
            {col.role === 'column_dropdown' ? (
              <select
                value={val}
                onChange={e => {
                  const updated = { ...(row.customValues || {}), [col.categoryName]: e.target.value };
                  onChange(updated);
                }}
                className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 text-xs text-sky-400 font-semibold w-full outline-none"
              >
                <option value="">-- Select --</option>
                {(dropdowns[col.categoryName] || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : col.role === 'column_number' ? (
              <input
                type="number"
                value={val}
                onChange={e => {
                  const updated = { ...(row.customValues || {}), [col.categoryName]: e.target.value };
                  onChange(updated);
                }}
                className="bg-[#0f1117]/50 border border-[#2d3748] rounded px-1.5 py-0.5 w-24 text-center text-white outline-none font-mono"
              />
            ) : (
              <input
                type="text"
                value={val}
                onChange={e => {
                  const updated = { ...(row.customValues || {}), [col.categoryName]: e.target.value };
                  onChange(updated);
                }}
                placeholder="..."
                className="bg-transparent text-gray-300 px-1 py-0.5 outline-none focus:border-b focus:border-sky-500 w-full"
              />
            )}
          </td>
        );
      })}
    </>
  );
}

// Global Export and Import utilities for Dropdown Selections
export function handleExportDropdownCategory(selectedKey: string, dropdowns: Record<string, string[]>, format: 'json' | 'csv' = 'json') {
  if (!selectedKey) return;
  const list = dropdowns[selectedKey] || [];
  if (format === 'json') {
    const payload = {
      categoryName: selectedKey,
      items: list,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dropdown_${selectedKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    let csv = `Category,Option\n`;
    list.forEach(item => {
      csv += `"${selectedKey.replace(/"/g, '""')}","${item.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dropdown_${selectedKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export function handleImportDropdownCategoryFile(
  file: File,
  targetCategory: string,
  onComplete: (categoryName: string, newItems: string[]) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      let category = targetCategory;
      let items: string[] = [];

      if (file.name.endsWith('.csv')) {
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        lines.forEach((line, idx) => {
          if (idx === 0 && (line.toLowerCase().includes('category') || line.toLowerCase().includes('option'))) {
            return;
          }
          const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 2) {
            if (parts[0]) category = parts[0];
            if (parts[1]) items.push(parts[1]);
          } else if (parts.length === 1 && parts[0]) {
            items.push(parts[0]);
          }
        });
      } else {
        const data = JSON.parse(content);
        if (data.categoryName && Array.isArray(data.items)) {
          category = data.categoryName;
          items = data.items;
        } else if (Array.isArray(data)) {
          items = data.map(String);
        } else if (typeof data === 'object') {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const firstKey = targetCategory && data[targetCategory] ? targetCategory : keys[0];
            category = firstKey;
            items = Array.isArray(data[firstKey]) ? data[firstKey] : [];
          }
        }
      }

      if (items.length === 0) {
        alert('No items found in the imported file.');
        return;
      }

      onComplete(category, items);
    } catch (err: any) {
      alert('Import failed: ' + (err.message || 'Invalid file structure.'));
    }
  };
  reader.readAsText(file);
}

interface DropdownCategoryConfigPanelProps {
  selectedKey: string;
  dropdowns: Record<string, string[]>;
}

export function DropdownCategoryConfigPanel({ selectedKey, dropdowns }: DropdownCategoryConfigPanelProps) {
  const [metadata, setMetadata] = React.useState(() => getMepDropdownMetadata());

  // Form states for creating a new custom category
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatTabId, setNewCatTabId] = React.useState('electrical');
  const [newCatRole, setNewCatRole] = React.useState<'options' | 'column_dropdown' | 'column_text' | 'column_number' | 'variance'>('options');

  // Form state for adding a sub-variance (option) to the selected category
  const [newSubVarName, setNewSubVarName] = React.useState('');

  React.useEffect(() => {
    // Keep metadata state in sync when selectedKey changes or storage updates
    setMetadata(getMepDropdownMetadata());
  }, [selectedKey]);

  // Keep track of the current category's metadata
  const currentMeta = metadata[selectedKey] || { tabId: 'electrical', role: 'options' };

  // Listen to storage changes to keep option list values updated
  const [localDropdowns, setLocalDropdowns] = React.useState(dropdowns);
  React.useEffect(() => {
    setLocalDropdowns(dropdowns);
  }, [dropdowns]);

  const handleUpdate = (updates: Partial<DropdownMeta>) => {
    const updated = {
      ...metadata,
      [selectedKey]: {
        ...currentMeta,
        ...updates
      }
    };
    setMetadata(updated);
    saveMepDropdownMetadata(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const handleCreateCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // 1. Load active dropdowns database
    const saved = localStorage.getItem('electrical_dropdowns');
    let db: Record<string, string[]> = {};
    if (saved) {
      try {
        db = JSON.parse(saved);
      } catch (e) {}
    }
    db = { ...localDropdowns, ...db };

    if (db[trimmed]) {
      alert(`The category / column "${trimmed}" already exists!`);
      return;
    }

    // 2. Create the list
    db[trimmed] = [];
    localStorage.setItem('electrical_dropdowns', JSON.stringify(db));

    // 3. Register route metadata
    const updatedMeta = {
      ...metadata,
      [trimmed]: {
        tabId: newCatTabId,
        role: newCatRole
      }
    };
    setMetadata(updatedMeta);
    saveMepDropdownMetadata(updatedMeta);

    // 4. Reset state & dispatch
    setNewCatName('');
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeleteCategory = () => {
    if (!selectedKey) return;
    if (!confirm(`Are you sure you want to delete the category / column "${selectedKey}" and all of its sub-variances?`)) {
      return;
    }

    // 1. Delete from dropdowns database
    const saved = localStorage.getItem('electrical_dropdowns');
    let db: Record<string, string[]> = {};
    if (saved) {
      try {
        db = JSON.parse(saved);
      } catch (e) {}
    }
    db = { ...localDropdowns, ...db };
    delete db[selectedKey];
    localStorage.setItem('electrical_dropdowns', JSON.stringify(db));

    // 2. Delete from metadata
    const updatedMeta = { ...metadata };
    delete updatedMeta[selectedKey];
    setMetadata(updatedMeta);
    saveMepDropdownMetadata(updatedMeta);

    // 3. Dispatch storage sync
    window.dispatchEvent(new Event('storage'));
  };

  const handleAddSubVariance = () => {
    const trimmed = newSubVarName.trim();
    if (!trimmed || !selectedKey) return;

    // 1. Load database
    const saved = localStorage.getItem('electrical_dropdowns');
    let db: Record<string, string[]> = {};
    if (saved) {
      try {
        db = JSON.parse(saved);
      } catch (e) {}
    }
    db = { ...localDropdowns, ...db };

    const currentList = db[selectedKey] || [];
    if (currentList.includes(trimmed)) {
      alert('This sub-variance option already exists in the list!');
      return;
    }

    db[selectedKey] = [...currentList, trimmed];
    localStorage.setItem('electrical_dropdowns', JSON.stringify(db));
    setNewSubVarName('');
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeleteSubVariance = (option: string) => {
    if (!selectedKey) return;

    // 1. Load database
    const saved = localStorage.getItem('electrical_dropdowns');
    let db: Record<string, string[]> = {};
    if (saved) {
      try {
        db = JSON.parse(saved);
      } catch (e) {}
    }
    db = { ...localDropdowns, ...db };

    const currentList = db[selectedKey] || [];
    db[selectedKey] = currentList.filter(o => o !== option);
    localStorage.setItem('electrical_dropdowns', JSON.stringify(db));
    window.dispatchEvent(new Event('storage'));
  };

  const activeOptions = localDropdowns[selectedKey] || [];

  return (
    <div className="bg-[#1a1f2e] p-4 rounded-xl border-2 border-[#2d3748] space-y-4 shadow-xl text-left">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-[#2d3748]/70 pb-2">
        <div className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <Settings size={14} className="text-emerald-400" />
          <span>Tab & Column Routing Router</span>
        </div>
        {selectedKey && (
          <button
            type="button"
            onClick={handleDeleteCategory}
            className="flex items-center gap-1 text-[10px] bg-red-950/50 hover:bg-red-900/60 border border-red-700/50 text-red-300 font-bold px-2 py-1 rounded transition-all cursor-pointer"
            title={`Delete complete category: ${selectedKey}`}
          >
            <Trash2 size={11} /> Delete Category
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-400 leading-normal">
        Route the active category to any MEP sizing tab, assign roles (plain dropdown, custom spreadsheet columns, or load sizing variances), and manage their allowed list options.
      </p>

      {/* Grid: Route Destination & Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#111522] p-2.5 rounded-lg border border-[#2d3748]/50">
        <div>
          <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold tracking-wider">Route Destination Tab</label>
          <select
            value={currentMeta.tabId}
            onChange={e => handleUpdate({ tabId: e.target.value })}
            className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-2.5 py-1.5 text-xs text-sky-400 font-bold outline-none cursor-pointer"
          >
            {MEP_TABS.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[9px] text-gray-400 mb-1 uppercase font-bold tracking-wider">Function & Display Role</label>
          <select
            value={currentMeta.role}
            onChange={e => handleUpdate({ role: e.target.value as any })}
            className="w-full bg-[#0f1117] border border-[#2d3748] rounded px-2.5 py-1.5 text-xs text-teal-400 font-bold outline-none cursor-pointer"
          >
            {MEP_ROLES.map(r => (
              <option key={r.id} value={r.id} title={r.description}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Sub-Variances / Options Editor for the selected Category */}
      {selectedKey && (
        <div className="bg-[#111522] p-3 rounded-lg border border-[#2d3748]/50 space-y-2">
          <div className="flex justify-between items-center pb-1 border-b border-[#2d3748]/30">
            <span className="text-[9px] text-[#cbd5e0] font-extrabold uppercase tracking-wider">
              ⚙️ Options / Sub-Variances ({selectedKey})
            </span>
            <span className="text-[9px] text-gray-500 font-bold font-mono">
              Count: {activeOptions.length}
            </span>
          </div>

          {/* Sub-variance List */}
          <div className="max-h-36 overflow-y-auto divide-y divide-[#2d3748]/30 bg-[#0a0d16] border border-[#2d3748]/40 rounded p-1">
            {activeOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 italic text-[10px]">
                No active sub-variances. Add some below.
              </div>
            ) : (
              activeOptions.map(opt => (
                <div key={opt} className="flex justify-between items-center py-1.5 px-2 hover:bg-slate-800/40 rounded transition-all group">
                  <span className="text-xs text-gray-200 font-medium">{opt}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubVariance(opt)}
                    className="text-red-400 hover:text-red-300 opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                    title="Remove item"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick Add Sub-variance Option */}
          <div className="flex gap-2.5">
            <input
              type="text"
              value={newSubVarName}
              onChange={e => setNewSubVarName(e.target.value)}
              placeholder="Add sub-variance / option..."
              className="flex-1 bg-[#0c0e16] border border-[#2d3748] rounded px-2.5 py-1 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500/80"
              onKeyDown={e => e.key === 'Enter' && handleAddSubVariance()}
            />
            <button
              type="button"
              onClick={handleAddSubVariance}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs text-white font-bold cursor-pointer transition-all"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      )}

      {/* Create New Column / Category Section */}
      <div className="bg-[#111522] p-3 rounded-lg border border-[#2d3748]/50 space-y-2.5">
        <div className="text-[9px] text-[#cbd5e0] font-extrabold uppercase tracking-wider flex items-center gap-1 pb-1 border-b border-[#2d3748]/30">
          <Settings size={11} className="text-teal-400" />
          <span>➕ Create New Custom Column / Sizing Variance</span>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-[9px] text-gray-500 mb-0.5 uppercase font-bold tracking-wider">Column / Category Name</label>
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Manufacturer, IP Rating, Wire Variance"
              className="w-full bg-[#0c0e16] border border-[#2d3748] rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-teal-500/80"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] text-gray-500 mb-0.5 uppercase font-bold tracking-wider">Initial Destination</label>
              <select
                value={newCatTabId}
                onChange={e => setNewCatTabId(e.target.value)}
                className="w-full bg-[#0c0e16] border border-[#2d3748] rounded px-2 py-1 text-[11px] text-sky-400 font-bold outline-none cursor-pointer"
              >
                {MEP_TABS.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-gray-500 mb-0.5 uppercase font-bold tracking-wider">Display Function</label>
              <select
                value={newCatRole}
                onChange={e => setNewCatRole(e.target.value as any)}
                className="w-full bg-[#0c0e16] border border-[#2d3748] rounded px-2 py-1 text-[11px] text-teal-400 font-bold outline-none cursor-pointer"
              >
                {MEP_ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateCategory}
            disabled={!newCatName.trim()}
            className="w-full py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:from-gray-800 disabled:to-gray-800 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs text-white font-extrabold uppercase tracking-wider cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Plus size={13} /> Create Category & Route Column
          </button>
        </div>
      </div>
    </div>
  );
}

interface RoomSelectorProps {
  value: string;
  onChange: (val: string) => void;
  settings?: ProjectSettings;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RoomSelector({
  value,
  onChange,
  settings,
  placeholder = 'Select or type room...',
  className = '',
  disabled = false
}: RoomSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0, triggerTop: 0 });

  const updateCoords = React.useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
        triggerTop: rect.top
      });
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen, updateCoords]);

  // Compile the combined room list (keys of ROOM_LUX_DATABASE + settings.customRooms)
  const roomList = React.useMemo(() => {
    const custom = settings?.customRooms || [];
    return Array.from(new Set([
      ...Object.keys(ROOM_LUX_DATABASE),
      ...custom
    ]));
  }, [settings?.customRooms]);

  // Filter based on search query
  const filteredRooms = React.useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return roomList;
    return roomList.filter(r => r.toLowerCase().includes(query));
  }, [roomList, search]);

  // Handle click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = containerRef.current && containerRef.current.contains(target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const showAbove = coords.top + 250 > window.innerHeight && coords.triggerTop > 250;
  const topVal = showAbove ? coords.triggerTop - 250 - 4 : coords.top + 4;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="flex items-center w-full bg-[#0f1117]/40 border border-[#2d3748] rounded px-1.5 py-1 text-xs justify-between gap-1">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-white w-full outline-none disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-white focus:outline-none transition-colors cursor-pointer p-0 font-bold"
            title="Toggle Rooms List"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${topVal}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
          className="max-h-64 overflow-y-auto bg-[#161a26] border-2 border-[#4a5568] rounded-md shadow-[0_12px_36px_rgba(0,0,0,0.9)] z-[100000] text-xs text-[#cbd5e0] divide-y divide-[#2d3748]/50 flex flex-col"
        >
          {/* Search Input inside Dropdown */}
          <div className="p-1.5 bg-[#13192a] flex items-center gap-1.5 sticky top-0 z-10">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rooms..."
              className="bg-[#0f1117] border border-[#2d3748] rounded px-1.5 py-0.5 w-full text-[11px] text-white outline-none"
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className="overflow-y-auto flex-1 max-h-44 divide-y divide-[#2d3748]/30">
            {filteredRooms.length === 0 ? (
              <div className="p-2 text-[10px] text-gray-500 italic text-center">No matching rooms found</div>
            ) : (
              filteredRooms.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-600 hover:text-white transition-all font-medium text-white bg-transparent border-none cursor-pointer block"
                >
                  {r}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

