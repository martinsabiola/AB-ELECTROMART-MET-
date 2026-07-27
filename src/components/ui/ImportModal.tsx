import React, { useRef, useState } from 'react';
import { Circuit } from '../../types';
import { dD as parseCircuitsFromAOA, cD as parseCSVorTSV } from '../../utils/csvParser';
import { parseMEPFile } from '../../utils/mepImporter';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';

interface ImportModalProps {
  boardName: string;
  boardPhase: string;
  existingCount: number;
  onImport: (circuits: Circuit[], mode: 'append' | 'replace') => void;
  onClose: () => void;
}

export default function ImportModal({ boardName, boardPhase, existingCount, onImport, onClose }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; aoa: any[][] }[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [parsedResult, setParsedResult] = useState<{ circuits: Circuit[]; skipped: number } | null>(null);
  const [isReading, setIsReading] = useState(false);

  const importMode = existingCount > 0 ? 'append' : 'replace';

  const handleFile = async (file: File) => {
    setError(null);
    setSheets([]);
    setParsedResult(null);
    setIsReading(true);

    try {
      const mepResult = await parseMEPFile(file);
      if (mepResult && Object.keys(mepResult).length > 0) {
        window.dispatchEvent(new CustomEvent('trigger-mep-update-workspace', { detail: mepResult }));
        if (mepResult.summaryMessage) {
          window.dispatchEvent(new CustomEvent('trigger-mep-toast', { detail: { ok: true, text: mepResult.summaryMessage } }));
        }
      }
    } catch (e) {
      // ignore mep parse error and proceed to sheet inspection
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ['xlsx', 'xls'].includes(ext || '');

    const processData = (arrayBuffer: ArrayBuffer) => {
      try {
        let loadedSheets: { name: string; aoa: any[][] }[] = [];
        if (isExcel) {
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          loadedSheets = workbook.SheetNames.map(name => ({
            name,
            aoa: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }) as any[][],
          }));
        } else {
          const text = new TextDecoder().decode(arrayBuffer);
          loadedSheets = [
            {
              name: file.name,
              aoa: parseCSVorTSV(text),
            },
          ];
        }

        setSheets(loadedSheets);
        setSelectedSheetIndex(0);
        analyzeSheet(loadedSheets, 0);
      } catch (err: any) {
        setError('Failed to parse file: ' + (err.message || 'unknown error'));
      }
      setIsReading(false);
    };

    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result instanceof ArrayBuffer) {
        processData(e.target.result);
      }
    };
    reader.onerror = () => {
      setError('Could not read the file.');
      setIsReading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const analyzeSheet = (allSheets: { name: string; aoa: any[][] }[], index: number) => {
    const sheet = allSheets[index];
    if (!sheet) return;

    const { circuits, skipped } = parseCircuitsFromAOA(sheet.aoa, boardPhase);
    setParsedResult({
      circuits,
      skipped,
    });
  };

  const handleSheetChange = (idx: number) => {
    setSelectedSheetIndex(idx);
    analyzeSheet(sheets, idx);
  };

  const executeImport = () => {
    if (parsedResult && parsedResult.circuits.length > 0) {
      onImport(parsedResult.circuits, importMode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/10 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
        className="bg-[#0d1322]/95 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/80"
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <div>
            <div className="font-bold text-base text-slate-100 flex items-center gap-2">📥 Import Circuits to {boardName}</div>
            <div className="text-xs text-slate-400 mt-1">
              Phase Mode: <span className="font-semibold text-cyan-400">{boardPhase}</span>
              {existingCount > 0 && (
                <span className="text-amber-400 ml-2 font-medium">
                  (⚠️ Will append to {existingCount} existing circuit{existingCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={`border-2 border-dashed ${
            isReading ? 'border-blue-500' : 'border-[#2d3748]'
          } hover:border-[#4a5568] rounded-lg p-6 text-center cursor-pointer mb-4 bg-[#13192a] transition-all`}
        >
          <div className="text-3xl mb-2">{isReading ? '⏳' : '📁'}</div>
          <div className="text-sm text-[#a0aec0] font-semibold">
            {isReading ? 'Reading file...' : 'Drag & drop Excel, CSV, JSON, or Tab-Delimited text file here'}
          </div>
          <div className="text-xs text-[#718096] mt-1">Supports .xlsx, .xls, .csv, .txt, .json files</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt,.json,text/plain,text/csv,application/json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = ''; // Reset input
            }}
          />
        </div>

        {/* Errors */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-300 text-xs mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* Sheet Selector */}
        {sheets.length > 1 && (
          <div className="mb-4">
            <div className="text-xs text-[#718096] mb-2 font-semibold uppercase tracking-wider">Select Sheet</div>
            <div className="flex gap-2 flex-wrap">
              {sheets.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSheetChange(idx)}
                  className={`px-3 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                    idx === selectedSheetIndex
                      ? 'bg-blue-600 text-white font-bold border border-blue-500'
                      : 'bg-[#13192a] text-[#718096] border border-[#2d3748] hover:text-[#e2e8f0]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Preview */}
        {parsedResult && (
          <div>
            <div className="text-xs text-[#718096] mb-2 font-semibold uppercase tracking-wider flex justify-between">
              <span>Preview detected rows ({parsedResult.circuits.length} circuits found)</span>
              {parsedResult.skipped > 0 && (
                <span className="text-amber-500">{parsedResult.skipped} blank/invalid rows skipped</span>
              )}
            </div>

            <div className="overflow-x-auto max-h-56 border border-[#2d3748] rounded-md mb-4 bg-[#0f1117]">
              <table className="border-collapse width-full text-xs text-left">
                <thead className="sticky top-0 bg-[#13192a] text-[#718096] border-b border-[#2d3748]">
                  <tr>
                    <th className="p-2 circuit-id-header">Circuit ID</th>
                    <th className="p-2">Room</th>
                    <th className="p-2">Load Type</th>
                    <th className="p-2 text-right">W/Unit</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2">Wire</th>
                    <th className="p-2 text-right">Cable m</th>
                    <th className="p-2">Cores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2538] text-[#cbd5e0]">
                  {parsedResult.circuits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-[#718096]">
                        No valid circuits could be parsed. Check column headers.
                      </td>
                    </tr>
                  ) : (
                    parsedResult.circuits.map((c, i) => (
                      <tr key={c.id} className="hover:bg-[#1a253a]">
                        <td className="p-2 font-mono text-yellow-400 font-bold">{c.circuitId}</td>
                        <td className="p-2">{c.room || '—'}</td>
                        <td className="p-2">{c.loadType}</td>
                        <td className="p-2 text-right">{c.watts}</td>
                        <td className="p-2 text-right">{c.qty}</td>
                        <td className="p-2">{c.wire || '—'}</td>
                        <td className="p-2 text-right">{c.cableLength || '—'}</td>
                        <td className="p-2">{c.cableCores}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {parsedResult.circuits.length > 0 && (
              <button
                onClick={executeImport}
                className={`w-full py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-all ${
                  importMode === 'append'
                    ? 'bg-amber-600 hover:bg-amber-500 border border-amber-400 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white'
                }`}
              >
                {importMode === 'append'
                  ? `⊕ Append ${parsedResult.circuits.length} Circuits to Panel`
                  : `✓ Load ${parsedResult.circuits.length} Circuits`}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 p-3 background-[#0f1117] rounded-lg text-[10px] text-[#4a5568] line-height-relaxed border border-[#2d3748]">
          <strong style={{ color: "#718096" }}>Supported Column Headers (case-insensitive):</strong>
          <br />
          <span className="circuit-id-text" style={{ color: "#63b3ed" }}>Circuit ID / ID</span> |{" "}
          <span style={{color: "#63b3ed"}}>Room</span> |{" "}
          <span style={{color: "#63b3ed"}}>Load Type</span> |{" "}
          <span style={{color: "#63b3ed"}}>Type Detail / Type</span> |{" "}
          <span style={{color: "#63b3ed"}}>W/Unit / Watts</span> |{" "}
          <span style={{color: "#63b3ed"}}>Qty</span> |{" "}
          <span style={{color: "#63b3ed"}}>CB (A) / CB</span> |{" "}
          <span style={{color: "#63b3ed"}}>Wire mm² / Wire</span> |{" "}
          <span style={{color: "#63b3ed"}}>Cable m / Cable length</span> |{" "}
          <span style={{color: "#63b3ed"}}>Cores</span> |{" "}
          <span style={{color: "#63b3ed"}}>Phase</span> |{" "}
          <span style={{color: "#63b3ed"}}>Switch Type</span> |{" "}
          <span style={{color: "#63b3ed"}}>Sw Qty</span> |{" "}
          <span style={{color: "#63b3ed"}}>Notes</span>
          <br />
          <span style={{ color: "#718096" }}>
            Note: Load Types are mapped to "Lighting", "Sockets", "Air Conditioner", "Dedicated". Cores carry Red/Black/Green wire color stats!
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
