import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, RotateCw, Copy, Download, Upload, RefreshCw, ZoomIn, ZoomOut, 
  Move, Link, Lock, Unlock, Eye, FileText, CheckCircle2, Layers, Grid, Zap, 
  Wind, Droplets, Flame, Camera, Sun, Settings, DollarSign, Printer, Sparkles, Box,
  Sliders, CheckSquare, BarChart2, PieChart, Table, Radio, Square, List, Calculator, Play, Minus, Type
} from 'lucide-react';
import { KitComponentItem, KitConnection, ProjectSettings } from '../../types';

interface SelfDesignTabProps {
  settings: ProjectSettings;
  tabId?: string;
  tabName?: string;
  selfDesignData?: { items: KitComponentItem[]; connections: KitConnection[] };
  onSelfDesignDataChange?: (data: { items: KitComponentItem[]; connections: KitConnection[] }) => void;
}

// Full Drag & Drop Palette Catalog Templates (Widgets + Equipment)
const PALETTE_TEMPLATES: Omit<KitComponentItem, 'id' | 'x' | 'y'>[] = [
  // UI & DESIGN TOOLS
  { 
    templateId: 'demarcator', 
    label: 'Zone Demarcator / Boundary', 
    category: 'UI/Tools', 
    icon: '▢', 
    width: 280, 
    height: 180, 
    rotation: 0, 
    rating: 'Area Enclosure Boundary', 
    status: 'Normal',
    elementType: 'demarcator',
    demarcatorData: { zoneTitle: 'Equipment Substation Zone A', color: '#0284c7', borderStyle: 'dashed' } 
  },
  { 
    templateId: 'line', 
    label: 'Divider Line / Wire Divider', 
    category: 'UI/Tools', 
    icon: '—', 
    width: 220, 
    height: 40, 
    rotation: 0, 
    rating: 'Separation Line', 
    status: 'Normal',
    elementType: 'line',
    lineData: { lineStyle: 'solid', strokeWidth: 3, color: '#38bdf8' },
    notes: 'HV/LV Separation Line'
  },
  { 
    templateId: 'table', 
    label: 'Equipment Schedule Table', 
    category: 'UI/Tools', 
    icon: '▦', 
    width: 320, 
    height: 200, 
    rotation: 0, 
    rating: 'Data Grid Table', 
    status: 'Normal',
    elementType: 'table',
    tableData: {
      headers: ['Tag', 'Equipment', 'Rating', 'Status'],
      rows: [
        ['MDB-01', 'Main LV Panel', '1600A 400V', 'Active'],
        ['GEN-01', 'Standby Diesel Gen', '500 kVA', 'Standby'],
        ['CH-01', 'Screw Chiller', '150 TR', 'Active']
      ]
    }
  },
  { 
    templateId: 'chart_bar', 
    label: 'Power Load Bar Chart', 
    category: 'UI/Tools', 
    icon: '📊', 
    width: 280, 
    height: 190, 
    rotation: 0, 
    rating: 'Visual Load Distribution', 
    status: 'Normal',
    elementType: 'chart',
    chartData: {
      type: 'bar',
      title: 'Phase Power Load (kW)',
      labels: ['L1 (Red)', 'L2 (Yellow)', 'L3 (Blue)', 'Neutral'],
      values: [145, 138, 152, 12]
    }
  },
  { 
    templateId: 'chart_gauge', 
    label: 'System Load Gauge Meter', 
    category: 'UI/Tools', 
    icon: '🥧', 
    width: 220, 
    height: 170, 
    rotation: 0, 
    rating: 'Percentage Meter', 
    status: 'Normal',
    elementType: 'chart',
    chartData: {
      type: 'gauge',
      title: 'Transformer Load Capacity',
      labels: ['Used Capacity'],
      values: [74]
    }
  },
  { 
    templateId: 'checklist', 
    label: 'Site Inspection Checklist', 
    category: 'UI/Tools', 
    icon: '☑', 
    width: 260, 
    height: 190, 
    rotation: 0, 
    rating: 'Quality QA/QC Items', 
    status: 'Normal',
    elementType: 'checklist',
    checklistData: [
      { id: 'ck-1', text: 'Earthing Resistance < 1 Ohm Tested', done: true },
      { id: 'ck-2', text: 'Generator Fuel Line Pressure Verified', done: true },
      { id: 'ck-3', text: 'Chiller Water Leak Test Approved', done: false },
      { id: 'ck-4', text: 'Fire Alarm Smoke Detector Loop Test', done: false }
    ]
  },
  { 
    templateId: 'radio', 
    label: 'Mode Radio Selector', 
    category: 'UI/Tools', 
    icon: '🔘', 
    width: 220, 
    height: 130, 
    rotation: 0, 
    rating: 'Operation Mode Switch', 
    status: 'Normal',
    elementType: 'radio',
    radioData: {
      options: ['Mains Utility Mode', 'Standby Diesel Mode', 'Solar Hybrid Peak Load'],
      selectedIndex: 0
    }
  },
  { 
    templateId: 'calculator', 
    label: 'kVA Load Quick Calculator', 
    category: 'UI/Tools', 
    icon: '🧮', 
    width: 250, 
    height: 180, 
    rotation: 0, 
    rating: 'Interactive MEP Formula', 
    status: 'Normal',
    elementType: 'calculator',
    calculatorData: {
      calcType: 'load_kw',
      inputA: 350, // kW
      inputB: 0.85, // Power Factor
      result: 411.8
    }
  },
  { 
    templateId: 'range', 
    label: 'Adjustable Range Slider', 
    category: 'UI/Tools', 
    icon: '⚙', 
    width: 240, 
    height: 120, 
    rotation: 0, 
    rating: '0-100% Parameter Control', 
    status: 'Normal',
    elementType: 'range',
    rangeData: {
      label: 'Chiller Chilled Water Supply Temp',
      min: 4,
      max: 18,
      current: 7,
      unit: '°C'
    }
  },
  { 
    templateId: 'button', 
    label: 'Action Trigger Button', 
    category: 'UI/Tools', 
    icon: '▶', 
    width: 200, 
    height: 100, 
    rotation: 0, 
    rating: 'Executable Control Trigger', 
    status: 'Normal',
    elementType: 'button',
    buttonData: {
      label: '⚡ Test ATS Changeover',
      actionType: 'toggle_status',
      variant: 'primary'
    }
  },
  { 
    templateId: 'list', 
    label: 'Specification Notes List', 
    category: 'UI/Tools', 
    icon: '📋', 
    width: 260, 
    height: 170, 
    rotation: 0, 
    rating: 'Project Notes & Specs', 
    status: 'Normal',
    elementType: 'list',
    listData: [
      '• XLPE/SWA Armored Cables for all outdoor underground runs.',
      '• Busduct IP65 rated with copper conductors.',
      '• All motors fitted with soft starters or VFD drives.'
    ]
  },

  // ELECTRICAL EQUIPMENT & SYMBOLS
  { templateId: 'sym_mcb', label: 'Miniature Circuit Breaker (MCB)', category: 'Electrical Symbols', icon: '🔲', width: 120, height: 80, rotation: 0, rating: 'MCB 1P/3P 16A-63A', powerKw: 0, cost: 45, status: 'Normal', notes: 'Thermal Magnetic Protection', elementType: 'equipment' },
  { templateId: 'sym_mccb', label: 'Molded Case Circuit Breaker (MCCB)', category: 'Electrical Symbols', icon: '🔳', width: 130, height: 85, rotation: 0, rating: 'MCCB 3P 250A 36kA', powerKw: 0, cost: 350, status: 'Normal', notes: 'Adjustable Electronic Trip Unit', elementType: 'equipment' },
  { templateId: 'sym_acb', label: 'Air Circuit Breaker (ACB)', category: 'Electrical Symbols', icon: '⚡', width: 140, height: 95, rotation: 0, rating: 'ACB 4P 1600A 65kA', powerKw: 0, cost: 2800, status: 'Normal', notes: 'Main LV Incomer Breaker', elementType: 'equipment' },
  { templateId: 'sym_isolator', label: 'Main Disconnect Isolator Switch', category: 'Electrical Symbols', icon: '🔌', width: 125, height: 80, rotation: 0, rating: '400A 3P Load Break Isolator', powerKw: 0, cost: 180, status: 'Normal', notes: 'Lockable Off Isolation Switch', elementType: 'equipment' },
  { templateId: 'sym_motor', label: '3-Phase Electric Motor', category: 'Electrical Symbols', icon: '⚙️', width: 130, height: 90, rotation: 0, rating: '45kW 3P 400V Motor', powerKw: 45, cost: 2100, status: 'Normal', notes: 'IE3 Premium Efficiency Induction Motor', elementType: 'equipment' },
  { templateId: 'sym_meter', label: 'Digital Power & Energy Meter', category: 'Electrical Symbols', icon: '📟', width: 120, height: 75, rotation: 0, rating: 'Class 0.5S Modbus RS485 Meter', powerKw: 0, cost: 220, status: 'Normal', notes: 'V, I, kW, kVAR, kWh, THD Analyzer', elementType: 'equipment' },
  { templateId: 'sym_switch', label: 'Lighting Switch / Dimmer', category: 'Electrical Symbols', icon: '🔘', width: 110, height: 70, rotation: 0, rating: '2-Gang 2-Way 10A Switch', powerKw: 0, cost: 25, status: 'Normal', notes: 'Wall Flush Mounting Switch', elementType: 'equipment' },
  { templateId: 'sym_socket', label: 'Power Socket Outlet', category: 'Electrical Symbols', icon: '🔌', width: 115, height: 75, rotation: 0, rating: 'Dual 13A Switched Socket Outlet', powerKw: 0.5, cost: 35, status: 'Normal', notes: 'Twin Gang Wall Power Socket', elementType: 'equipment' },
  { templateId: 'sym_tray', label: 'Cable Tray / Trunking', category: 'Electrical Symbols', icon: '🛤️', width: 150, height: 70, rotation: 0, rating: '300x50mm Perforated GI Tray', powerKw: 0, cost: 85, status: 'Normal', notes: 'Heavy Duty Cable Pathway', elementType: 'equipment' },
  { templateId: 'sym_earth', label: 'Earth Rod & Chamber', category: 'Electrical Symbols', icon: '⏚', width: 115, height: 80, rotation: 0, rating: '16mm Copper Rod & Pit', powerKw: 0, cost: 150, status: 'Normal', notes: 'Earth Resistance < 1.0 Ohm', elementType: 'equipment' },
  { templateId: 'sym_busbar', label: '3-Phase Busbar System', category: 'Electrical Symbols', icon: '➖', width: 160, height: 60, rotation: 0, rating: '1600A Copper Busbar (TPN)', powerKw: 0, cost: 650, status: 'Normal', notes: 'Switchboard Main Busbar System', elementType: 'equipment' },
  { templateId: 'sym_transformer', label: 'Step-Down Transformer', category: 'Electrical Symbols', icon: '🔌', width: 135, height: 95, rotation: 0, rating: '11kV/400V 1000kVA Transformer', powerKw: 800, cost: 22000, status: 'Normal', notes: 'Cast Resin Dry Type Unit', elementType: 'equipment' },
  { templateId: 'sym_pfc', label: 'PFC Capacitor Bank', category: 'Electrical Symbols', icon: '🔋', width: 125, height: 85, rotation: 0, rating: '100 kVAR Auto PFC Bank', powerKw: 0, cost: 2400, status: 'Normal', notes: 'Target Power Factor 0.98', elementType: 'equipment' },
  { templateId: 'sym_rcd', label: 'Residual Current Breaker (RCD)', category: 'Electrical Symbols', icon: '🛡️', width: 120, height: 80, rotation: 0, rating: '4P 63A 30mA RCD Breaker', powerKw: 0, cost: 95, status: 'Normal', notes: 'Earth Leakage Safety Protection', elementType: 'equipment' },
  { templateId: 'sym_spd', label: 'Surge Protection Device (SPD)', category: 'Electrical Symbols', icon: '⚡', width: 120, height: 80, rotation: 0, rating: 'Type 1+2 40kA Surge Arrester', powerKw: 0, cost: 140, status: 'Normal', notes: 'Transient Voltage Protection', elementType: 'equipment' },

  { templateId: 'mdb', label: 'Main Distribution Board (MDB)', category: 'Electrical', icon: '⚡', width: 150, height: 100, rotation: 0, rating: '1600A 3P 400V 50kA', powerKw: 450, cost: 8500, status: 'Normal', notes: 'Main Low Voltage Switchboard', elementType: 'equipment' },
  { templateId: 'smdb', label: 'Sub-Distribution Board (SMDB)', category: 'Electrical', icon: '⚡', width: 130, height: 90, rotation: 0, rating: '400A 3P 400V', powerKw: 120, cost: 3200, status: 'Normal', notes: 'Floor Level Distribution Panel', elementType: 'equipment' },
  { templateId: 'ats', label: 'Automatic Transfer Switch (ATS)', category: 'Electrical', icon: '🔄', width: 120, height: 85, rotation: 0, rating: '1250A 4P Motorized', powerKw: 350, cost: 4500, status: 'Normal', notes: 'Mains / Generator Auto Changeover', elementType: 'equipment' },
  { templateId: 'gen', label: 'Standby Diesel Generator', category: 'Electrical', icon: '⚙️', width: 160, height: 105, rotation: 0, rating: '500 kVA Prime Diesel', powerKw: 400, cost: 35000, status: 'Standby', notes: 'Soundproof Canopy Unit', elementType: 'equipment' },
  { templateId: 'xfmr', label: 'Distribution Transformer', category: 'Electrical', icon: '🔌', width: 130, height: 95, rotation: 0, rating: '1000 kVA 11kV/415V', powerKw: 800, cost: 22000, status: 'Normal', notes: 'Outdoor Substation Unit', elementType: 'equipment' },
  { templateId: 'solar_inv', label: 'Solar Hybrid Inverter', category: 'Electrical', icon: '☀️', width: 120, height: 85, rotation: 0, rating: '100 kW 3-Phase MPPT', powerKw: 100, cost: 7800, status: 'Normal', notes: 'Grid-Tied with Battery Port', elementType: 'equipment' },

  // HVAC EQUIPMENT
  { templateId: 'chiller', label: 'Air-Cooled Screw Chiller', category: 'HVAC', icon: '🧊', width: 170, height: 105, rotation: 0, rating: '150 TR Eco-Chiller', powerKw: 130, airCfm: 0, cost: 48000, status: 'Normal', notes: 'Dual Compressor High Efficiency', elementType: 'equipment' },
  { templateId: 'ahu', label: 'Air Handling Unit (AHU)', category: 'HVAC', icon: '❄️', width: 145, height: 95, rotation: 0, rating: '12,000 CFM Coil Unit', powerKw: 22, airCfm: 12000, cost: 9500, status: 'Normal', notes: 'Variable Air Volume Control', elementType: 'equipment' },
  { templateId: 'vrf', label: 'VRF Outdoor Unit Cluster', category: 'HVAC', icon: '🌀', width: 135, height: 90, rotation: 0, rating: '24 HP Heat Recovery', powerKw: 18, airCfm: 8500, cost: 11200, status: 'Normal', notes: 'Multi-split Inverter System', elementType: 'equipment' },

  // PLUMBING EQUIPMENT
  { templateId: 'booster_pump', label: 'Hydro-Pneumatic Booster', category: 'Plumbing', icon: '💧', width: 135, height: 90, rotation: 0, rating: '30 GPM @ 5.5 Bar VFD', powerKw: 7.5, flowGpm: 30, cost: 5400, status: 'Normal', notes: 'Constant Pressure Water Supply', elementType: 'equipment' },
  { templateId: 'water_tank', label: 'Sectional Water Storage Tank', category: 'Plumbing', icon: '🪣', width: 155, height: 100, rotation: 0, rating: '25,000 Litres Capacity', powerKw: 0, flowGpm: 0, cost: 8200, status: 'Normal', notes: 'Food Grade Insulated Panel', elementType: 'equipment' },

  // FIRE PROTECTION
  { templateId: 'fire_pump', label: 'UL/FM Fire Pump Set', category: 'Fire', icon: '🚒', width: 155, height: 100, rotation: 0, rating: '750 GPM @ 10 Bar', powerKw: 75, flowGpm: 750, cost: 28000, status: 'Standby', notes: 'Duty, Standby & Jockey Set', elementType: 'equipment' },
  { templateId: 'facp', label: 'Addressable Fire Alarm Panel', category: 'Fire', icon: '🚨', width: 120, height: 80, rotation: 0, rating: '4 Loop 1000 Point Panel', powerKw: 0.5, cost: 3100, status: 'Normal', notes: 'GSM Auto Dialer Panel', elementType: 'equipment' },

  // CCTV / ELV
  { templateId: 'nvr_rack', label: '64-Channel CCTV NVR Rack', category: 'CCTV/ELV', icon: '📹', width: 130, height: 90, rotation: 0, rating: '64-Ch 4K AI Analytics', powerKw: 1.2, cost: 5800, status: 'Normal', notes: 'Redundant Power Unit', elementType: 'equipment' }
];

export const SelfDesignTab: React.FC<SelfDesignTabProps> = ({ settings, tabId = 'selfdesign', tabName = 'Kit Design Studio', selfDesignData, onSelfDesignDataChange }) => {
  const storageKey = `mep_self_design_kit_${tabId}`;

  // Canvas Items State
  const [items, setItems] = useState<KitComponentItem[]>(() => {
    if (selfDesignData && Array.isArray(selfDesignData.items)) {
      return selfDesignData.items;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
      }
    } catch (e) {
      console.error('Failed to load self design kit items:', e);
    }
    
    // Default Starter Blank / Sample Canvas based on tab
    if (tabId === 'selfdesign') {
      return [
        { 
          id: 'item-demo-1', templateId: 'demarcator', label: 'Main Power Substation Enclosure', category: 'UI/Tools', icon: '▢', x: 40, y: 40, width: 440, height: 260, rotation: 0, rating: 'Zone A High Voltage', status: 'Normal', elementType: 'demarcator', demarcatorData: { zoneTitle: 'Substation Zone A', color: '#0284c7', borderStyle: 'dashed' } 
        },
        { 
          id: 'item-demo-2', templateId: 'gen', label: '500 kVA Standby Generator', category: 'Electrical', icon: '⚙️', x: 70, y: 100, width: 160, height: 105, rotation: 0, rating: '500 kVA Prime Diesel', powerKw: 400, cost: 35000, status: 'Standby', notes: 'Acoustic Enclosure Unit', elementType: 'equipment' 
        },
        { 
          id: 'item-demo-3', templateId: 'ats', label: '1250A Auto Transfer Switch', category: 'Electrical', icon: '🔄', x: 280, y: 110, width: 130, height: 85, rotation: 0, rating: '1250A 4P ATS', powerKw: 350, cost: 4500, status: 'Normal', notes: 'Main Emergency Switch', elementType: 'equipment' 
        },
        { 
          id: 'item-demo-4', templateId: 'chart_bar', label: 'Phase Power Load (kW)', category: 'UI/Tools', icon: '📊', x: 510, y: 40, width: 300, height: 190, rotation: 0, rating: 'Phase Balancer', status: 'Normal', elementType: 'chart', chartData: { type: 'bar', title: 'Phase Power Load (kW)', labels: ['Phase A', 'Phase B', 'Phase C'], values: [145, 138, 152] } 
        },
        { 
          id: 'item-demo-5', templateId: 'checklist', label: 'Commissioning Checklist', category: 'UI/Tools', icon: '☑', x: 510, y: 250, width: 300, height: 180, rotation: 0, rating: 'QA Inspection', status: 'Normal', elementType: 'checklist', checklistData: [
            { id: 'c1', text: 'Insulation Resistance Test Passed', done: true },
            { id: 'c2', text: 'Auto Transfer Switch Interlock Verified', done: true },
            { id: 'c3', text: 'Full Load Heat Run Approved', done: false }
          ]}
        ];
    }
    // For completely new tabs, start with clean BLANK PAGE
    return [];
  });

  const [connections, setConnections] = useState<KitConnection[]>(() => {
    if (selfDesignData && Array.isArray(selfDesignData.connections)) {
      return selfDesignData.connections;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.connections && Array.isArray(parsed.connections)) return parsed.connections;
      }
    } catch (e) {
      console.error('Failed to load connections:', e);
    }
    if (tabId === 'selfdesign') {
      return [
        { id: 'conn-demo-1', fromId: 'item-demo-2', toId: 'item-demo-3', type: 'Cable/Wire', label: 'Power Feeder Cable', spec: '4x(1x240mm²) XLPE/SWA' }
      ];
    }
    return [];
  });

  // Editor Interaction Controls
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isConnectMode, setIsConnectMode] = useState<boolean>(false);
  const [connectStartId, setConnectStartId] = useState<string | null>(null);
  const [isBoqOpen, setIsBoqOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [draggedTemplate, setDraggedTemplate] = useState<Omit<KitComponentItem, 'id' | 'x' | 'y'> | null>(null);

  // Dragging State
  const [isDraggingItem, setIsDraggingItem] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync state if selfDesignData prop changes from parent (e.g., Undo / Redo)
  useEffect(() => {
    if (selfDesignData) {
      if (JSON.stringify(items) !== JSON.stringify(selfDesignData.items || [])) {
        setItems(selfDesignData.items || []);
      }
      if (JSON.stringify(connections) !== JSON.stringify(selfDesignData.connections || [])) {
        setConnections(selfDesignData.connections || []);
      }
    }
  }, [selfDesignData]);

  // Persistence and Notify Parent
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ items, connections }));
    } catch (e) {
      console.error('Failed to save self design kit state:', e);
    }
    if (onSelfDesignDataChange) {
      onSelfDesignDataChange({ items, connections });
    }
  }, [items, connections, storageKey]);

  const selectedItem = items.find(i => i.id === selectedItemId);

  // Filter Palette Catalog
  const filteredTemplates = PALETTE_TEMPLATES.filter(tmpl => {
    const matchesCat = activeCategoryFilter === 'All' || tmpl.category === activeCategoryFilter;
    const matchesQuery = tmpl.label.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.rating.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Handler: Add Item onto Canvas
  const handleAddItem = (tmpl: Omit<KitComponentItem, 'id' | 'x' | 'y'>, customX?: number, customY?: number) => {
    const xPos = customX !== undefined ? customX : Math.floor(80 + Math.random() * 150);
    const yPos = customY !== undefined ? customY : Math.floor(80 + Math.random() * 150);

    const newItem: KitComponentItem = JSON.parse(JSON.stringify({
      ...tmpl,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: snapToGrid ? Math.round(xPos / 20) * 20 : xPos,
      y: snapToGrid ? Math.round(yPos / 20) * 20 : yPos,
    }));

    setItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  // Handler: Mouse Down on Item
  const handleMouseDownItem = (e: React.MouseEvent, item: KitComponentItem) => {
    e.stopPropagation();

    if (isConnectMode) {
      if (!connectStartId) {
        setConnectStartId(item.id);
      } else if (connectStartId !== item.id) {
        const newConn: KitConnection = {
          id: `conn-${Date.now()}`,
          fromId: connectStartId,
          toId: item.id,
          type: item.category === 'HVAC' ? 'Duct' : item.category === 'Plumbing' ? 'Pipe' : 'Cable/Wire',
          label: 'Interconnection Link',
          spec: 'Standard Bus/Cable'
        };
        setConnections(prev => [...prev, newConn]);
        setConnectStartId(null);
        setIsConnectMode(false);
      }
      return;
    }

    setSelectedItemId(item.id);
    setIsDraggingItem(true);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoomLevel;
      const mouseY = (e.clientY - rect.top) / zoomLevel;
      setDragOffset({
        x: mouseX - item.x,
        y: mouseY - item.y
      });
    }
  };

  // Handler: Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingItem || !selectedItemId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let newX = (e.clientX - rect.left) / zoomLevel - dragOffset.x;
    let newY = (e.clientY - rect.top) / zoomLevel - dragOffset.y;

    if (snapToGrid) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
    }

    newX = Math.max(10, Math.min(2400, newX));
    newY = Math.max(10, Math.min(1800, newY));

    setItems(prev => prev.map(item => item.id === selectedItemId ? { ...item, x: newX, y: newY } : item));
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingItem(false);
  };

  // Handler: Drop onto Canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTemplate || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoomLevel - draggedTemplate.width / 2;
    const rawY = (e.clientY - rect.top) / zoomLevel - draggedTemplate.height / 2;

    handleAddItem(draggedTemplate, rawX, rawY);
    setDraggedTemplate(null);
  };

  // Item Transformations
  const handleRotateItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, rotation: (i.rotation + 90) % 360 } : i));
  };

  const handleDuplicateItem = (item: KitComponentItem) => {
    const newItem: KitComponentItem = JSON.parse(JSON.stringify({
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x: item.x + 30,
      y: item.y + 30,
      label: `${item.label} (Copy)`
    }));
    setItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleDeleteConnection = (connId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  // Canvas Windows Shortkeys Effect
  useEffect(() => {
    const handleCanvasKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if (isInputFocused) return;

      if (selectedItemId) {
        // Delete / Backspace -> Remove selected item
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteItem(selectedItemId);
          return;
        }

        // Ctrl + D -> Duplicate selected item
        if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          const target = items.find(i => i.id === selectedItemId);
          if (target) handleDuplicateItem(target);
          return;
        }

        // Arrow Keys -> Nudge selected item position
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const delta = e.shiftKey ? 20 : 10;
          setItems(prev => prev.map(item => {
            if (item.id !== selectedItemId) return item;
            let nx = item.x;
            let ny = item.y;
            if (e.key === 'ArrowUp') ny = Math.max(0, ny - delta);
            if (e.key === 'ArrowDown') ny += delta;
            if (e.key === 'ArrowLeft') nx = Math.max(0, nx - delta);
            if (e.key === 'ArrowRight') nx += delta;
            return { ...item, x: nx, y: ny };
          }));
          return;
        }
      }

      // Zoom Shortcuts: Ctrl + Plus / Ctrl + Minus
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoomLevel(prev => Math.min(1.8, prev + 0.1));
        return;
      }
      if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        setZoomLevel(prev => Math.max(0.6, prev - 0.1));
        return;
      }
    };

    window.addEventListener('keydown', handleCanvasKeyDown);
    return () => window.removeEventListener('keydown', handleCanvasKeyDown);
  }, [selectedItemId, items]);

  // Calculated Metrics
  const totalKw = items.reduce((sum, item) => sum + (item.powerKw || 0), 0);
  const totalKva = (totalKw / 0.85).toFixed(1);
  const totalCfm = items.reduce((sum, item) => sum + (item.airCfm || 0), 0);
  const totalGpm = items.reduce((sum, item) => sum + (item.flowGpm || 0), 0);
  const currencySymbol = settings.currencySymbol || '$';
  const totalCost = items.reduce((sum, item) => sum + (item.cost || 0), 0);

  // Preset Template Loader
  const loadBlankCanvas = () => {
    if (items.length > 0 && !confirm('Clear current canvas to start a fresh blank project page?')) return;
    setItems([]);
    setConnections([]);
    setSelectedItemId(null);
  };

  return (
    <div className="space-y-4 pb-12 select-none">
      {/* Top Header & Project Action Bar */}
      <div className="bg-[#111625] border border-[#232d42] rounded-2xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>{tabName}</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-mono uppercase">
                Blank Project Studio & Tools
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Drag & Drop customizable widgets (tables, charts, checklists, demarcators, calculators, ranges, lines) & MEP kit equipment.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={loadBlankCanvas}
            className="bg-[#0b0e17] hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-bold px-3 py-2 rounded-xl border border-gray-700 transition-colors flex items-center gap-1.5"
            title="Start a completely clear blank project page"
          >
            <Square className="w-3.5 h-3.5 text-cyan-400" /> Start Blank Project Page
          </button>

          <button
            onClick={() => setIsBoqOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-500/50 shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Kit BOQ ({currencySymbol}{totalCost.toLocaleString()})
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Catalog Palette | Center Canvas Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PALETTE: Component & Widget Library */}
        <div className="lg:col-span-3 bg-[#111625] border border-[#232d42] rounded-2xl p-4 shadow-xl space-y-3 flex flex-col max-h-[840px] overflow-hidden">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" /> Tool & Kit Catalog
            </h2>
            <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded font-mono">
              {filteredTemplates.length} Tools
            </span>
          </div>

          {/* Search & Category Pills */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search tools & components..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b0e17] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-cyan-500"
            />

            <div className="flex flex-wrap gap-1">
              {['All', 'UI/Tools', 'Electrical Symbols', 'Electrical', 'HVAC', 'Plumbing', 'Fire', 'CCTV/ELV'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${
                    activeCategoryFilter === cat 
                      ? 'bg-cyan-600 text-white font-bold shadow' 
                      : 'bg-[#0b0e17] text-gray-400 hover:text-gray-200 border border-gray-800/80'
                  }`}
                >
                  {cat === 'UI/Tools' ? '🛠️ UI Tools' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredTemplates.map(tmpl => (
              <div
                key={tmpl.templateId}
                draggable
                onDragStart={() => setDraggedTemplate(tmpl)}
                onClick={() => handleAddItem(tmpl)}
                className="bg-[#0b0e17] hover:bg-[#151c2e] border border-gray-800/80 hover:border-cyan-500/50 p-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all group flex items-center justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-800/80 group-hover:bg-cyan-950/80 border border-gray-700/60 group-hover:border-cyan-600/60 flex items-center justify-center text-base shrink-0">
                    {tmpl.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-200 group-hover:text-cyan-300 leading-tight">
                      {tmpl.label}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {tmpl.rating}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  title="Click to add onto project canvas"
                  className="p-1 bg-gray-800 group-hover:bg-cyan-600 text-gray-300 group-hover:text-white rounded-md text-[10px] font-bold shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER CANVAS WORKSPACE */}
        <div className="lg:col-span-9 bg-[#111625] border border-[#232d42] rounded-2xl p-4 shadow-xl space-y-3 flex flex-col">
          {/* Canvas Toolbar Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b0e17] p-2 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  snapToGrid 
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700' 
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> Snap Grid ({snapToGrid ? 'ON' : 'OFF'})
              </button>

              <button
                onClick={() => {
                  setIsConnectMode(!isConnectMode);
                  setConnectStartId(null);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isConnectMode 
                    ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse' 
                    : 'bg-gray-800 text-gray-300 hover:text-white border-gray-700'
                }`}
              >
                <Link className="w-3.5 h-3.5" /> {isConnectMode ? (connectStartId ? 'Click target component to connect...' : 'Select 1st component...') : 'Wire / Link Mode'}
              </button>
            </div>

            {/* Zoom & Canvas Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-lg border border-gray-700">
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))} 
                  className="p-1 hover:bg-gray-700 rounded text-gray-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-cyan-300 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.1))} 
                  className="p-1 hover:bg-gray-700 rounded text-gray-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => {
                  if (confirm('Clear entire project design canvas?')) {
                    setItems([]);
                    setConnections([]);
                    setSelectedItemId(null);
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 border border-rose-900/60 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                title="Clear All Canvas Items"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Canvas
              </button>
            </div>
          </div>

          {/* Interactive Canvas Stage */}
          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onDragOver={e => e.preventDefault()}
            onDrop={handleCanvasDrop}
            onClick={() => {
              if (!isDraggingItem) setSelectedItemId(null);
            }}
            className="relative w-full h-[620px] bg-[#070a12] border-2 border-dashed border-gray-800 rounded-xl overflow-hidden cursor-crosshair select-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
              backgroundSize: `${20 * zoomLevel}px ${20 * zoomLevel}px`
            }}
          >
            {/* Blank Canvas Empty Prompt */}
            {items.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-500 pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-3 animate-pulse">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-300 mb-1">
                  Blank Project Page Ready
                </h3>
                <p className="text-xs text-gray-400 max-w-md">
                  Drag and drop tools from the left catalog (Tables, Charts, Checklists, Radio Buttons, Demarcators, Calculators, Lines, Equipment) to build your customized project design layout.
                </p>
              </div>
            )}

            {/* Wire / Link Connection SVG Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {connections.map(conn => {
                const fromItem = items.find(i => i.id === conn.fromId);
                const toItem = items.find(i => i.id === conn.toId);
                if (!fromItem || !toItem) return null;

                const x1 = (fromItem.x + fromItem.width / 2) * zoomLevel;
                const y1 = (fromItem.y + fromItem.height / 2) * zoomLevel;
                const x2 = (toItem.x + toItem.width / 2) * zoomLevel;
                const y2 = (toItem.y + toItem.height / 2) * zoomLevel;

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                const strokeColor = conn.type === 'Cable/Wire' ? '#38bdf8' :
                                    conn.type === 'Pipe' ? '#06b6d4' :
                                    conn.type === 'Duct' ? '#a855f7' :
                                    conn.type === 'Busbar' ? '#f59e0b' : '#10b981';

                return (
                  <g key={conn.id} className="group pointer-events-auto">
                    <path
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={3 * zoomLevel}
                      strokeDasharray={conn.type === 'Busbar' ? '6 3' : 'none'}
                      className="opacity-80 hover:opacity-100 transition-opacity"
                    />

                    <foreignObject x={midX - 50} y={midY - 12} width={100} height={24}>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete connection "${conn.label}"?`)) {
                            handleDeleteConnection(conn.id);
                          }
                        }}
                        className="bg-[#0b0e17] border border-gray-700/80 rounded px-1.5 py-0.5 text-[9px] font-mono text-gray-300 text-center truncate cursor-pointer hover:border-rose-500 hover:text-rose-300 shadow"
                      >
                        {conn.label}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>

            {/* Render Canvas Elements (Widgets & Equipment) */}
            <div 
              className="absolute inset-0 w-full h-full"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
            >
              {items.map(item => {
                const isSelected = selectedItemId === item.id;
                const isConnectStart = connectStartId === item.id;

                // SPECIAL WIDGET RENDERING CASES
                
                // 1. DEMARCATOR / ZONE BOUNDARY
                if (item.elementType === 'demarcator') {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        width: `${item.width}px`,
                        height: `${item.height}px`,
                        borderColor: item.demarcatorData?.color || '#0284c7',
                        borderStyle: item.demarcatorData?.borderStyle || 'dashed'
                      }}
                      className={`absolute rounded-2xl border-2 p-3 bg-cyan-950/10 backdrop-blur-[1px] flex flex-col justify-between shadow-lg cursor-grab active:cursor-grabbing z-0 ${
                        isSelected ? 'ring-2 ring-cyan-400 bg-cyan-950/20' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center bg-[#0b0e17]/90 px-2.5 py-1 rounded-lg border border-gray-800">
                        <strong className="text-xs text-white flex items-center gap-1.5 font-bold">
                          <span>{item.icon}</span> {item.demarcatorData?.zoneTitle || item.label}
                        </strong>
                        <span className="text-[9px] font-mono text-cyan-300 uppercase">Demarcator Zone</span>
                      </div>

                      {/* Quick Floating Handles */}
                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 2. DIVIDER LINE
                if (item.elementType === 'line') {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        width: `${item.width}px`,
                        height: `${item.height}px`,
                      }}
                      className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing z-10 ${
                        isSelected ? 'ring-1 ring-cyan-400' : ''
                      }`}
                    >
                      <div className="w-full flex items-center gap-2">
                        <div 
                          className="flex-1"
                          style={{
                            height: `${item.lineData?.strokeWidth || 2}px`,
                            backgroundColor: item.lineData?.color || '#38bdf8',
                            borderStyle: item.lineData?.lineStyle || 'solid'
                          }}
                        />
                        <span className="text-[10px] font-mono text-gray-300 bg-[#0b0e17] px-1.5 py-0.5 rounded border border-gray-800 whitespace-nowrap">
                          {item.label}
                        </span>
                        <div 
                          className="flex-1"
                          style={{
                            height: `${item.lineData?.strokeWidth || 2}px`,
                            backgroundColor: item.lineData?.color || '#38bdf8',
                            borderStyle: item.lineData?.lineStyle || 'solid'
                          }}
                        />
                      </div>

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 3. TABLE WIDGET
                if (item.elementType === 'table' && item.tableData) {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl overflow-auto cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-gray-800 mb-2">
                        <strong className="text-xs text-white flex items-center gap-1 font-bold">
                          <span>▦</span> {item.label}
                        </strong>
                        <span className="text-[9px] text-cyan-400 font-mono">Editable Table</span>
                      </div>

                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="bg-[#182035] text-gray-300 font-semibold border-b border-gray-800">
                            {item.tableData.headers.map((h, idx) => (
                              <th key={idx} className="p-1.5">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {item.tableData.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-gray-800/60 hover:bg-gray-800/40 text-gray-200">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1.5 font-mono">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 4. CHART WIDGET (BAR or GAUGE)
                if (item.elementType === 'chart' && item.chartData) {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center pb-1 border-b border-gray-800 mb-1">
                        <strong className="text-xs text-white font-bold truncate">📊 {item.chartData.title}</strong>
                        <span className="text-[9px] text-cyan-300 font-mono uppercase">{item.chartData.type}</span>
                      </div>

                      {/* Bar Chart Visual */}
                      {item.chartData.type === 'bar' && (
                        <div className="flex-1 flex items-end justify-around gap-2 pt-3 pb-1 border-b border-gray-800">
                          {item.chartData.values.map((val, idx) => {
                            const maxVal = Math.max(...item.chartData!.values, 1);
                            const heightPercent = Math.round((val / maxVal) * 100);
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                                <span className="text-[8px] font-mono text-cyan-300">{val}</span>
                                <div 
                                  className="w-full bg-gradient-to-t from-cyan-600 to-sky-400 rounded-t transition-all"
                                  style={{ height: `${heightPercent}%` }}
                                />
                                <span className="text-[7px] text-gray-400 font-mono mt-1 truncate w-full text-center">
                                  {item.chartData!.labels[idx] || `Item ${idx+1}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Gauge Chart Visual */}
                      {item.chartData.type === 'gauge' && (
                        <div className="flex-1 flex flex-col items-center justify-center my-1">
                          <div className="relative w-24 h-24 rounded-full border-4 border-gray-800 flex items-center justify-center bg-cyan-950/30">
                            <span className="text-lg font-bold font-mono text-cyan-300">
                              {item.chartData.values[0]}%
                            </span>
                          </div>
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 5. CHECKLIST WIDGET
                if (item.elementType === 'checklist' && item.checklistData) {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl overflow-auto cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-gray-800 mb-2">
                        <strong className="text-xs text-white font-bold flex items-center gap-1">
                          <span>☑</span> {item.label}
                        </strong>
                        <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                          {item.checklistData.filter(c => c.done).length}/{item.checklistData.length} Done
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[10px]">
                        {item.checklistData.map(cItem => (
                          <label key={cItem.id} className="flex items-center gap-2 cursor-pointer text-gray-200 hover:text-white">
                            <input
                              type="checkbox"
                              checked={cItem.done}
                              onChange={() => {
                                setItems(prev => prev.map(i => {
                                  if (i.id === item.id && i.checklistData) {
                                    return {
                                      ...i,
                                      checklistData: i.checklistData.map(cd => cd.id === cItem.id ? { ...cd, done: !cd.done } : cd)
                                    };
                                  }
                                  return i;
                                }));
                              }}
                              className="accent-cyan-500 rounded"
                            />
                            <span className={cItem.done ? 'line-through text-gray-500' : ''}>
                              {cItem.text}
                            </span>
                          </label>
                        ))}
                      </div>

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 6. RADIO SELECTOR WIDGET
                if (item.elementType === 'radio' && item.radioData) {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <div className="pb-1.5 border-b border-gray-800 mb-2">
                        <strong className="text-xs text-white font-bold flex items-center gap-1">
                          <span>🔘</span> {item.label}
                        </strong>
                      </div>

                      <div className="space-y-1.5 text-[10px]">
                        {item.radioData.options.map((opt, rIdx) => (
                          <label key={rIdx} className="flex items-center gap-2 cursor-pointer text-gray-200">
                            <input
                              type="radio"
                              name={`radio_${item.id}`}
                              checked={item.radioData?.selectedIndex === rIdx}
                              onChange={() => {
                                setItems(prev => prev.map(i => i.id === item.id && i.radioData ? {
                                  ...i,
                                  radioData: { ...i.radioData, selectedIndex: rIdx }
                                } : i));
                              }}
                              className="accent-cyan-500"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 7. CALCULATOR WIDGET
                if (item.elementType === 'calculator' && item.calculatorData) {
                  const calc = item.calculatorData;
                  const res = (calc.inputA / (calc.inputB || 0.85)).toFixed(1);

                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <div className="pb-1 border-b border-gray-800 mb-2 flex justify-between items-center">
                        <strong className="text-xs text-white font-bold flex items-center gap-1">
                          <span>🧮</span> {item.label}
                        </strong>
                        <span className="text-[9px] text-amber-400 font-mono">Live Calc</span>
                      </div>

                      <div className="space-y-2 text-[10px]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-gray-400 block mb-0.5">Active kW Load</label>
                            <input
                              type="number"
                              value={calc.inputA}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setItems(prev => prev.map(i => i.id === item.id && i.calculatorData ? {
                                  ...i,
                                  calculatorData: { ...i.calculatorData, inputA: val }
                                } : i));
                              }}
                              className="w-full bg-[#0b0e17] border border-gray-800 rounded px-2 py-1 text-amber-300 font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-gray-400 block mb-0.5">Power Factor (PF)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={calc.inputB}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0.85;
                                setItems(prev => prev.map(i => i.id === item.id && i.calculatorData ? {
                                  ...i,
                                  calculatorData: { ...i.calculatorData, inputB: val }
                                } : i));
                              }}
                              className="w-full bg-[#0b0e17] border border-gray-800 rounded px-2 py-1 text-cyan-300 font-mono"
                            />
                          </div>
                        </div>

                        <div className="bg-[#0b0e17] p-2 rounded border border-gray-800 flex justify-between items-center">
                          <span className="text-gray-400">Resulting kVA:</span>
                          <strong className="text-sm font-mono text-emerald-400">{res} kVA</strong>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 8. RANGE SLIDER WIDGET
                if (item.elementType === 'range' && item.rangeData) {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center pb-1 border-b border-gray-800 mb-2">
                        <strong className="text-xs text-white font-bold flex items-center gap-1">
                          <span>⚙</span> {item.rangeData.label}
                        </strong>
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {item.rangeData.current} {item.rangeData.unit}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={item.rangeData.min}
                        max={item.rangeData.max}
                        value={item.rangeData.current}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          setItems(prev => prev.map(i => i.id === item.id && i.rangeData ? {
                            ...i,
                            rangeData: { ...i.rangeData, current: val }
                          } : i));
                        }}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 9. ACTION BUTTON WIDGET
                if (item.elementType === 'button' && item.buttonData) {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Action Triggered: ${item.buttonData?.label}`);
                        }}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {item.buttonData.label}
                      </button>

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // 10. LIST / NOTES WIDGET
                if (item.elementType === 'list' && item.listData) {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={e => handleMouseDownItem(e, item)}
                      style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${item.width}px`, height: `${item.height}px` }}
                      className={`absolute bg-[#0f1524] border border-gray-800 rounded-xl p-3 shadow-xl overflow-auto cursor-grab active:cursor-grabbing z-20 ${
                        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : ''
                      }`}
                    >
                      <div className="pb-1 border-b border-gray-800 mb-2">
                        <strong className="text-xs text-white font-bold flex items-center gap-1">
                          <span>📋</span> {item.label}
                        </strong>
                      </div>

                      <ul className="space-y-1 text-[10px] text-gray-300">
                        {item.listData.map((note, nIdx) => (
                          <li key={nIdx} className="leading-snug">{note}</li>
                        ))}
                      </ul>

                      {isSelected && (
                        <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                          <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  );
                }

                // DEFAULT: MEP EQUIPMENT CARD
                return (
                  <div
                    key={item.id}
                    onMouseDown={e => handleMouseDownItem(e, item)}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      width: `${item.width}px`,
                      height: `${item.height}px`,
                      transform: `rotate(${item.rotation}deg)`
                    }}
                    className={`absolute rounded-xl border p-2 flex flex-col justify-between shadow-xl transition-shadow cursor-grab active:cursor-grabbing z-20 ${
                      isConnectStart 
                        ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/80 animate-pulse' 
                        : isSelected 
                          ? 'bg-[#151d30] border-cyan-400 ring-2 ring-cyan-500/50 shadow-cyan-950/80' 
                          : 'bg-[#0f1524]/95 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-1 pointer-events-none">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[80px]">
                          {item.category}
                        </span>
                      </div>

                      <span className={`text-[8px] font-bold px-1 py-0.2 rounded border ${
                        item.status === 'Normal' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' :
                        item.status === 'Standby' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                        'bg-rose-950/80 text-rose-300 border-rose-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Label & Rating */}
                    <div className="my-1 pointer-events-none">
                      <h4 className="text-[11px] font-bold text-white leading-snug line-clamp-1">
                        {item.label}
                      </h4>
                      <p className="text-[9px] text-cyan-300 font-mono truncate">
                        {item.rating}
                      </p>
                    </div>

                    {/* Footer Metrics */}
                    <div className="flex items-center justify-between text-[8px] font-mono text-gray-400 pt-1 border-t border-gray-800/80 pointer-events-none">
                      <span>{item.powerKw ? `${item.powerKw} kW` : item.airCfm ? `${item.airCfm} CFM` : `${item.flowGpm || 0} GPM`}</span>
                      <span className="text-emerald-400 font-bold">{currencySymbol}{item.cost?.toLocaleString()}</span>
                    </div>

                    {/* Floating Controls */}
                    {isSelected && (
                      <div className="absolute -top-7 right-0 flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/60 p-1 rounded-lg shadow-xl z-30">
                        <button onClick={(e) => { e.stopPropagation(); handleRotateItem(item.id); }} className="p-1 text-cyan-400 rounded"><RotateCw className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDuplicateItem(item); }} className="p-1 text-cyan-400 rounded"><Copy className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className="p-1 text-amber-400 rounded"><Settings className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-1 text-rose-400 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Metrics & Summary Footer */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Placed Elements</span>
              <strong className="text-sm font-mono text-cyan-300">{items.length} Units</strong>
            </div>

            <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Power Load</span>
              <strong className="text-sm font-mono text-amber-300">{totalKw} kW ({totalKva} kVA)</strong>
            </div>

            <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Air Flow</span>
              <strong className="text-sm font-mono text-sky-300">{totalCfm.toLocaleString()} CFM</strong>
            </div>

            <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Plumbing Flow</span>
              <strong className="text-sm font-mono text-cyan-300">{totalGpm} GPM</strong>
            </div>

            <div className="bg-[#0b0e17] p-2.5 rounded-xl border border-gray-800 col-span-2 md:col-span-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Project Cost</span>
              <strong className="text-sm font-mono text-emerald-400">{currencySymbol}{totalCost.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT COMPONENT / WIDGET MODAL */}
      {isEditModalOpen && selectedItem && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
            }
          }}
        >
          <div className="bg-[#0d1322]/20 backdrop-blur-md border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/80 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>⚙️</span> Edit Properties – {selectedItem.label}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Tag / Label Title</label>
                <input
                  type="text"
                  value={selectedItem.label}
                  onChange={e => {
                    const val = e.target.value;
                    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, label: val } : i));
                  }}
                  className="w-full bg-[#0b0e17] border border-gray-800 rounded px-3 py-2 text-gray-200 outline-none focus:border-cyan-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Width (px)</label>
                  <input
                    type="number"
                    value={selectedItem.width}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 100;
                      setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, width: val } : i));
                    }}
                    className="w-full bg-[#0b0e17] border border-gray-800 rounded px-3 py-2 text-gray-200 outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Height (px)</label>
                  <input
                    type="number"
                    value={selectedItem.height}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 100;
                      setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, height: val } : i));
                    }}
                    className="w-full bg-[#0b0e17] border border-gray-800 rounded px-3 py-2 text-gray-200 outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* DEMARCATOR SPECIFIC EDIT */}
              {selectedItem.elementType === 'demarcator' && (
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold">Zone Title</label>
                  <input
                    type="text"
                    value={selectedItem.demarcatorData?.zoneTitle || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setItems(prev => prev.map(i => i.id === selectedItem.id ? {
                        ...i,
                        demarcatorData: { ...i.demarcatorData!, zoneTitle: val }
                      } : i));
                    }}
                    className="w-full bg-[#0b0e17] border border-gray-800 rounded px-3 py-2 text-cyan-300 font-semibold"
                  />
                </div>
              )}

              {/* ESTIMATED COST FOR EQUIPMENT */}
              {selectedItem.elementType === 'equipment' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1 font-semibold">Power Load (kW)</label>
                    <input
                      type="number"
                      value={selectedItem.powerKw || 0}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, powerKw: val } : i));
                      }}
                      className="w-full bg-[#0b0e17] border border-gray-800 rounded px-3 py-2 text-amber-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 font-semibold">Cost ({currencySymbol})</label>
                    <input
                      type="number"
                      value={selectedItem.cost || 0}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, cost: val } : i));
                      }}
                      className="w-full bg-[#0b0e17] border border-gray-800 rounded px-3 py-2 text-emerald-400 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-[#12192b]/95 flex justify-end">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOQ / BEME MODAL */}
      {isBoqOpen && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBoqOpen(false);
            }
          }}
        >
          <div className="bg-[#0d1322]/20 backdrop-blur-md border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl shadow-black/80 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Bill of Quantities (BOQ) / BEME Schedule
              </h3>
              <button 
                onClick={() => setIsBoqOpen(false)} 
                className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#182035] text-gray-300 font-semibold border-b border-gray-800">
                    <th className="p-2">Item Tag</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Specification Rating</th>
                    <th className="p-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-800/60 text-gray-200">
                      <td className="p-2 font-bold text-cyan-300">{item.label}</td>
                      <td className="p-2 text-gray-400">{item.category}</td>
                      <td className="p-2 font-mono text-gray-300">{item.rating}</td>
                      <td className="p-2 text-right font-mono text-emerald-400">{currencySymbol}{(item.cost || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-[#0b0e17] p-3 rounded-xl border border-gray-800 flex justify-between items-center">
                <span className="font-bold text-gray-300">Total Project Estimate:</span>
                <strong className="text-base font-mono text-emerald-400">{currencySymbol}{totalCost.toLocaleString()}</strong>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-[#12192b]/95 flex justify-end">
              <button onClick={() => setIsBoqOpen(false)} className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
