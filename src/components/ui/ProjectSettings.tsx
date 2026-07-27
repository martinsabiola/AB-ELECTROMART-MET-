import React from 'react';
import { ProjectSettings as ISettings } from '../../types';

interface ProjectSettingsProps {
  settings: ISettings;
  setSettings: React.Dispatch<React.SetStateAction<ISettings>>;
  onClose: () => void;
}

export default function ProjectSettings({ settings, setSettings, onClose }: ProjectSettingsProps) {
  const updateField = (key: keyof ISettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[#0d1322]/20 backdrop-blur-md border border-slate-700/60 rounded-2xl max-w-2xl w-full shadow-2xl shadow-black/80 relative max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#12192b]/95 shrink-0">
          <div className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <span>⚙️</span> General Project Information & Meta Settings
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Project Name</label>
              <input
                value={settings.projectName}
                onChange={e => updateField('projectName', e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg text-slate-100 p-2 text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Project No.</label>
              <input
                value={settings.projectNo}
                onChange={e => updateField('projectNo', e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg text-slate-100 p-2 text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Engineer Name</label>
              <input
                value={settings.engineer}
                onChange={e => updateField('engineer', e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg text-slate-100 p-2 text-xs outline-none focus:border-cyan-500"
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#718096] mb-1 uppercase tracking-wider font-semibold">Client</label>
              <input
                value={settings.client}
                onChange={e => updateField('client', e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg text-slate-100 p-2 text-xs outline-none focus:border-cyan-500"
                placeholder="e.g. ACME Corp"
              />
            </div>
          </div>

          <p className="mt-6 text-[11px] text-[#718096] leading-relaxed border-t border-[#2d3748]/60 pt-4">
            💡 <strong>Decentralized Workspace Settings</strong>: Sizing equations, default lumens, currency parameters, rounding profiles, and safety constraints have been migrated to their respective discipline worksheets. You can view, tune, and expand these calculations directly on their active tab pages.
          </p>
        </div>
      </div>
    </div>
  );
}
