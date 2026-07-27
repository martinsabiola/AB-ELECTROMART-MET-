import React, { useState } from 'react';
import {
  FileText,
  Table as TableIcon,
  GitCommit,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ArrowRight,
  Clock,
  Coins
} from 'lucide-react';

export interface CustomStepToolData {
  notes: string;
  checklist: { id: string; text: string; done: boolean }[];
  table: {
    headers: string[];
    rows: string[][];
  };
  flowchart: {
    nodes: { id: string; label: string; type: 'start' | 'process' | 'decision' | 'end' }[];
  };
  schedule: {
    startDate: string;
    targetDate: string;
    milestoneTime: string;
    durationDays: number;
    status: 'Planned' | 'In Progress' | 'Under Review' | 'Completed';
  };
  financials: {
    currency: string;
    items: { id: string; description: string; qty: number; unitCost: number }[];
  };
}

const DEFAULT_STEP_DATA: CustomStepToolData = {
  notes: '',
  checklist: [
    { id: 'cl-1', text: 'Initial site verification & documentation', done: false },
    { id: 'cl-2', text: 'Engineering review and safety compliance check', done: false }
  ],
  table: {
    headers: ['Item No', 'Specification / Equipment', 'Capacity / Rating', 'Status'],
    rows: [
      ['01', 'Main Isolation Breaker', '250A 4P MCCB', 'Inspected'],
      ['02', 'Exhaust Duct Line', '6 inch Stainless Steel', 'Pending']
    ]
  },
  flowchart: {
    nodes: [
      { id: 'f-1', label: '1. Initial Inspection', type: 'start' },
      { id: 'f-2', label: '2. Measure Electrical Loads', type: 'process' },
      { id: 'f-3', label: '3. Capacity Approval Check', type: 'decision' },
      { id: 'f-4', label: '4. Sign-off & Commissioning', type: 'end' }
    ]
  },
  schedule: {
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    milestoneTime: '09:00',
    durationDays: 7,
    status: 'Planned'
  },
  financials: {
    currency: 'USD ($)',
    items: [
      { id: 'fin-1', description: 'Equipment & Installation Materials', qty: 1, unitCost: 1500 },
      { id: 'fin-2', description: 'Labor & Technical Audit Fee', qty: 2, unitCost: 350 }
    ]
  }
};

interface CustomStepToolboxProps {
  stepId: string;
  stepTitle: string;
  stepNum: number;
  data?: CustomStepToolData;
  onChange: (updated: CustomStepToolData) => void;
  onDeleteStep?: () => void;
}

export const CustomStepToolbox: React.FC<CustomStepToolboxProps> = ({
  stepTitle,
  stepNum,
  data = DEFAULT_STEP_DATA,
  onChange,
  onDeleteStep
}) => {
  const [activeTool, setActiveTool] = useState<'notepad' | 'table' | 'flowchart' | 'schedule' | 'financials'>('notepad');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newFlowNodeText, setNewFlowNodeText] = useState('');
  const [newFlowNodeType, setNewFlowNodeType] = useState<'start' | 'process' | 'decision' | 'end'>('process');

  // Ensure robust data structure
  const currentData: CustomStepToolData = {
    notes: data?.notes ?? DEFAULT_STEP_DATA.notes,
    checklist: data?.checklist ?? DEFAULT_STEP_DATA.checklist,
    table: data?.table ?? DEFAULT_STEP_DATA.table,
    flowchart: data?.flowchart ?? DEFAULT_STEP_DATA.flowchart,
    schedule: data?.schedule ?? DEFAULT_STEP_DATA.schedule,
    financials: data?.financials ?? DEFAULT_STEP_DATA.financials
  };

  const updateToolData = (patch: Partial<CustomStepToolData>) => {
    onChange({
      ...currentData,
      ...patch
    });
  };

  // --- NOTEPAD & CHECKLIST HANDLERS ---
  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    const newItem = { id: `cl-${Date.now()}`, text: newChecklistText.trim(), done: false };
    updateToolData({ checklist: [...currentData.checklist, newItem] });
    setNewChecklistText('');
  };

  const handleToggleChecklist = (id: string) => {
    const updated = currentData.checklist.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    updateToolData({ checklist: updated });
  };

  const handleDeleteChecklist = (id: string) => {
    const updated = currentData.checklist.filter(item => item.id !== id);
    updateToolData({ checklist: updated });
  };

  // --- TABLE HANDLERS ---
  const handleTableCellChange = (rIdx: number, cIdx: number, val: string) => {
    const newRows = currentData.table.rows.map((row, r) =>
      r === rIdx ? row.map((cell, c) => (c === cIdx ? val : cell)) : row
    );
    updateToolData({ table: { ...currentData.table, rows: newRows } });
  };

  const handleHeaderCellChange = (cIdx: number, val: string) => {
    const newHeaders = currentData.table.headers.map((h, c) => (c === cIdx ? val : h));
    updateToolData({ table: { ...currentData.table, headers: newHeaders } });
  };

  const handleAddTableRow = () => {
    const emptyRow = new Array(currentData.table.headers.length).fill('');
    updateToolData({
      table: { ...currentData.table, rows: [...currentData.table.rows, emptyRow] }
    });
  };

  const handleDeleteTableRow = (rIdx: number) => {
    const newRows = currentData.table.rows.filter((_, r) => r !== rIdx);
    updateToolData({ table: { ...currentData.table, rows: newRows } });
  };

  const handleAddTableColumn = () => {
    const colName = `Column ${currentData.table.headers.length + 1}`;
    const newHeaders = [...currentData.table.headers, colName];
    const newRows = currentData.table.rows.map(row => [...row, '']);
    updateToolData({ table: { headers: newHeaders, rows: newRows } });
  };

  // --- FLOWCHART HANDLERS ---
  const handleAddFlowNode = () => {
    if (!newFlowNodeText.trim()) return;
    const newNode = {
      id: `fn-${Date.now()}`,
      label: newFlowNodeText.trim(),
      type: newFlowNodeType
    };
    updateToolData({
      flowchart: { nodes: [...currentData.flowchart.nodes, newNode] }
    });
    setNewFlowNodeText('');
  };

  const handleDeleteFlowNode = (id: string) => {
    const updated = currentData.flowchart.nodes.filter(n => n.id !== id);
    updateToolData({ flowchart: { nodes: updated } });
  };

  const handleMoveFlowNode = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === currentData.flowchart.nodes.length - 1)
    )
      return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newNodes = [...currentData.flowchart.nodes];
    const temp = newNodes[index];
    newNodes[index] = newNodes[targetIdx];
    newNodes[targetIdx] = temp;
    updateToolData({ flowchart: { nodes: newNodes } });
  };

  // --- FINANCIALS HANDLERS ---
  const handleAddFinancialItem = () => {
    const newItem = { id: `fin-${Date.now()}`, description: 'New Material / Service Item', qty: 1, unitCost: 100 };
    updateToolData({
      financials: {
        ...currentData.financials,
        items: [...currentData.financials.items, newItem]
      }
    });
  };

  const handleFinancialItemChange = (id: string, field: 'description' | 'qty' | 'unitCost', val: string | number) => {
    const updated = currentData.financials.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    updateToolData({
      financials: { ...currentData.financials, items: updated }
    });
  };

  const handleDeleteFinancialItem = (id: string) => {
    const updated = currentData.financials.items.filter(item => item.id !== id);
    updateToolData({
      financials: { ...currentData.financials, items: updated }
    });
  };

  const totalFinancialCost = currentData.financials.items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
    0
  );

  return (
    <div className="bg-[#111625] border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              STEP {stepNum}
            </span>
            <h2 className="text-base font-bold text-white">{stepTitle}</h2>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Design toolbox for tables, flowcharts, calendars, financial estimates & notes
          </p>
        </div>

        {onDeleteStep && (
          <button
            type="button"
            onClick={onDeleteStep}
            className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Step
          </button>
        )}
      </div>

      {/* Tool Selector Toolbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTool('notepad')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTool === 'notepad'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400'
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Notepad & Checklist
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('table')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTool === 'table'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400'
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" /> Data Table
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('flowchart')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTool === 'flowchart'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400'
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" /> Flowchart Builder
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('schedule')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTool === 'schedule'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400'
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Schedule & Time
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('financials')}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTool === 'financials'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400'
              : 'bg-slate-900/80 text-gray-300 hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> Currency & Estimator
        </button>
      </div>

      {/* TOOL 1: NOTEPAD & CHECKLIST */}
      {activeTool === 'notepad' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Engineering Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Engineering Notes & Specifications
            </label>
            <textarea
              rows={9}
              value={currentData.notes}
              onChange={e => updateToolData({ notes: e.target.value })}
              placeholder="Enter technical specifications, equipment details, site notes or guidelines..."
              className="w-full bg-[#0b0e17] border border-slate-700/80 focus:border-cyan-500 rounded-xl p-3 text-gray-200 text-xs font-mono outline-none leading-relaxed"
            />
          </div>

          {/* Interactive Checklist */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" /> Interactive Action Item Checklist
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={e => setNewChecklistText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddChecklist()}
                placeholder="Add checklist item..."
                className="flex-1 bg-[#0b0e17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="bg-[#0b0e17] border border-slate-800 rounded-xl p-2.5 max-h-56 overflow-y-auto space-y-1.5">
              {currentData.checklist.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-4">No checklist items created yet.</div>
              ) : (
                currentData.checklist.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 text-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(item.id)}
                      className="flex items-center gap-2 text-left cursor-pointer flex-1"
                    >
                      {item.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500 shrink-0" />
                      )}
                      <span className={item.done ? 'line-through text-gray-500 font-medium' : 'text-gray-200 font-semibold'}>
                        {item.text}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChecklist(item.id)}
                      className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOOL 2: DATA TABLE */}
      {activeTool === 'table' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <TableIcon className="w-3.5 h-3.5" /> Custom Engineering Data Table
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddTableColumn}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Column
              </button>
              <button
                type="button"
                onClick={handleAddTableRow}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0b0e17]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800">
                  {currentData.table.headers.map((h, cIdx) => (
                    <th key={cIdx} className="p-2 border-r border-slate-800 min-w-[120px]">
                      <input
                        type="text"
                        value={h}
                        onChange={e => handleHeaderCellChange(cIdx, e.target.value)}
                        className="w-full bg-transparent font-bold text-cyan-400 text-xs outline-none focus:bg-slate-800/80 px-1 rounded"
                      />
                    </th>
                  ))}
                  <th className="p-2 w-10 text-center text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentData.table.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-1.5 border-r border-slate-800/60">
                        <input
                          type="text"
                          value={cell}
                          onChange={e => handleTableCellChange(rIdx, cIdx, e.target.value)}
                          className="w-full bg-transparent text-gray-200 text-xs outline-none focus:bg-slate-800 px-1.5 py-1 rounded font-mono"
                        />
                      </td>
                    ))}
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteTableRow(rIdx)}
                        className="text-gray-500 hover:text-rose-400 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOOL 3: FLOWCHART BUILDER */}
      {activeTool === 'flowchart' && (
        <div className="space-y-4">
          <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5" /> Process Flowchart & Sequence Diagram Builder
          </label>

          {/* Node Add Form */}
          <div className="flex flex-col sm:flex-row gap-2 bg-[#0b0e17] p-3 rounded-xl border border-slate-800">
            <input
              type="text"
              value={newFlowNodeText}
              onChange={e => setNewFlowNodeText(e.target.value)}
              placeholder="Enter process stage (e.g. Inspect Cable Isolation)..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            />

            <select
              value={newFlowNodeType}
              onChange={e => setNewFlowNodeType(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-bold outline-none cursor-pointer"
            >
              <option value="start">🟢 Start Node</option>
              <option value="process">🔷 Task / Process</option>
              <option value="decision">🔶 Decision Check</option>
              <option value="end">🛑 End / Output</option>
            </select>

            <button
              type="button"
              onClick={handleAddFlowNode}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Process Step
            </button>
          </div>

          {/* Visual Sequence Diagrams */}
          <div className="bg-[#0b0e17] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sequential Process Pipeline</div>

            <div className="flex flex-col md:flex-row items-center gap-2 overflow-x-auto pb-2">
              {currentData.flowchart.nodes.map((node, idx) => {
                const nodeColors = {
                  start: 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300',
                  process: 'bg-blue-950/80 border-blue-500/80 text-blue-200',
                  decision: 'bg-amber-950/80 border-amber-500/80 text-amber-200',
                  end: 'bg-rose-950/80 border-rose-500/80 text-rose-300'
                };

                return (
                  <React.Fragment key={node.id}>
                    <div
                      className={`p-3 rounded-xl border flex flex-col justify-between min-w-[150px] shadow-md relative group ${nodeColors[node.type]}`}
                    >
                      <div className="flex justify-between items-center text-[9px] uppercase font-bold text-gray-400 mb-1">
                        <span>{node.type}</span>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => handleMoveFlowNode(idx, 'up')}
                            disabled={idx === 0}
                            className="hover:text-cyan-300 disabled:opacity-20 cursor-pointer"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFlowNode(idx, 'down')}
                            disabled={idx === currentData.flowchart.nodes.length - 1}
                            className="hover:text-cyan-300 disabled:opacity-20 cursor-pointer"
                          >
                            ▶
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFlowNode(node.id)}
                            className="text-rose-400 hover:text-rose-200 ml-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="font-bold text-xs leading-snug">{node.label}</div>
                    </div>

                    {idx < currentData.flowchart.nodes.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-cyan-500 shrink-0 hidden md:block" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TOOL 4: SCHEDULE & CALENDAR */}
      {activeTool === 'schedule' && (
        <div className="space-y-4">
          <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Project Schedule & Milestone Deadline Tracker
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#0b0e17] p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <label className="block text-gray-400 font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={currentData.schedule.startDate}
                onChange={e =>
                  updateToolData({
                    schedule: { ...currentData.schedule, startDate: e.target.value }
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1">Target End Date</label>
              <input
                type="date"
                value={currentData.schedule.targetDate}
                onChange={e =>
                  updateToolData({
                    schedule: { ...currentData.schedule, targetDate: e.target.value }
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Milestone Time
              </label>
              <input
                type="time"
                value={currentData.schedule.milestoneTime}
                onChange={e =>
                  updateToolData({
                    schedule: { ...currentData.schedule, milestoneTime: e.target.value }
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1">Execution Status</label>
              <select
                value={currentData.schedule.status}
                onChange={e =>
                  updateToolData({
                    schedule: { ...currentData.schedule, status: e.target.value as any }
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold outline-none cursor-pointer"
              >
                <option value="Planned">🗓️ Planned</option>
                <option value="In Progress">⚡ In Progress</option>
                <option value="Under Review">🔍 Under Review</option>
                <option value="Completed">✅ Completed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 5: CURRENCY & FINANCIAL ESTIMATOR */}
      {activeTool === 'financials' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Currency & Financial Cost Estimator
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold">Currency:</span>
              <select
                value={currentData.financials.currency}
                onChange={e =>
                  updateToolData({
                    financials: { ...currentData.financials, currency: e.target.value }
                  })
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-bold outline-none cursor-pointer"
              >
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="GBP (£)">GBP (£)</option>
                <option value="NGN (₦)">NGN (₦)</option>
                <option value="INR (₹)">INR (₹)</option>
                <option value="AED (AED)">AED (AED)</option>
                <option value="CAD ($)">CAD ($)</option>
                <option value="AUD ($)">AUD ($)</option>
                <option value="KES (KSh)">KES (KSh)</option>
                <option value="ZAR (R)">ZAR (R)</option>
              </select>

              <button
                type="button"
                onClick={handleAddFinancialItem}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Cost Item
              </button>
            </div>
          </div>

          <div className="bg-[#0b0e17] border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-cyan-400 font-bold">
                  <th className="p-2.5">Cost Item Description</th>
                  <th className="p-2.5 w-24 text-center">Qty</th>
                  <th className="p-2.5 w-32 text-right">Unit Rate ({currentData.financials.currency.split(' ')[1] || '$'})</th>
                  <th className="p-2.5 w-36 text-right">Subtotal</th>
                  <th className="p-2.5 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentData.financials.items.map(item => {
                  const subtotal = (Number(item.qty) || 0) * (Number(item.unitCost) || 0);
                  return (
                    <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => handleFinancialItemChange(item.id, 'description', e.target.value)}
                          className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-gray-200 outline-none focus:border-cyan-500 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => handleFinancialItemChange(item.id, 'qty', Number(e.target.value))}
                          className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-center text-gray-200 outline-none focus:border-cyan-500 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={item.unitCost}
                          onChange={e => handleFinancialItemChange(item.id, 'unitCost', Number(e.target.value))}
                          className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2 py-1 text-right text-gray-200 outline-none focus:border-cyan-500 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-cyan-300">
                        {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteFinancialItem(item.id)}
                          className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900/90 font-bold border-t border-slate-800">
                  <td colSpan={3} className="p-3 text-right uppercase text-gray-400">
                    Estimated Budget Total:
                  </td>
                  <td className="p-3 text-right text-sm font-mono text-emerald-400 font-extrabold">
                    {currentData.financials.currency.split(' ')[1] || '$'} {totalFinancialCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
