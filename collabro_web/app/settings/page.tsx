'use client';

import React, { useState } from 'react';
import { useWorkspace } from '../components/WorkspaceProvider';

export default function Settings() {
  const { resetWorkspace } = useWorkspace();
  const [model, setModel] = useState('minimax');
  const [logSpeed, setLogSpeed] = useState('medium');
  const [tokensLimit, setTokensLimit] = useState(100000);
  const [notifications, setNotifications] = useState(true);
  const [apiKey, setApiKey] = useState('sk-••••••••••••••••••••••••');
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col p-8 md:p-12 relative z-20 max-w-3xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-8">
        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-md text-label-md uppercase tracking-wider mb-2 inline-block">
          Workspace System Preferences
        </span>
        <h2 className="font-headline-xl text-3xl font-extrabold text-white">
          Configuration Settings
        </h2>
      </div>

      {/* Settings Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-6 w-full shadow-2xl">
        
        {/* Model Selection */}
        <div>
          <label className="text-[11px] font-bold text-primary uppercase tracking-widest block mb-2 font-mono">
            Default LLM Model Setup
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 font-mono text-[13px] cursor-pointer"
          >
            <option value="minimax">Minimax — Default</option>
          </select>
        </div>

        {/* API Key Configuration */}
        <div>
          <label className="text-[11px] font-bold text-primary uppercase tracking-widest block mb-2 font-mono">
            Minimax API Authentication Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 font-mono text-[13px]"
          />
        </div>

        {/* Simulation Speed & Token Limit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[11px] font-bold text-primary uppercase tracking-widest block mb-2 font-mono">
              Build Logs Stream Rate
            </label>
            <select
              value={logSpeed}
              onChange={(e) => setLogSpeed(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 font-mono text-[13px] cursor-pointer"
            >
              <option value="fast">Fast (1.0s stream increments)</option>
              <option value="medium">Medium (2.5s stream increments)</option>
              <option value="slow">Slow (5.0s stream increments)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-primary uppercase tracking-widest block mb-2 font-mono">
              Max Tokens Budget Per Prompt
            </label>
            <input
              type="number"
              value={tokensLimit}
              onChange={(e) => setTokensLimit(parseInt(e.target.value))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 font-mono text-[13px]"
            />
          </div>
        </div>

        {/* Toggle Notification Settings */}
        <div className="flex items-center justify-between border-t border-b border-white/5 py-4">
          <div>
            <span className="text-[13px] font-bold text-white block mb-0.5">
              Deploy Success Notifications
            </span>
            <span className="text-[11px] text-on-surface-variant/70 leading-relaxed block">
              Show toast notifications in bottom corner when a build is fully deployed.
            </span>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              notifications ? 'bg-primary' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-md ${
                notifications ? 'left-6.5' : 'left-0.5'
              }`}
            ></div>
          </button>
        </div>

        {/* Form Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Workspace Hard Reset Button */}
          <button
            onClick={resetWorkspace}
            className="px-5 py-3.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 active:scale-95 transition-all text-body-sm font-bold cursor-pointer"
          >
            Reset Workspace State
          </button>

          <div className="flex items-center gap-4">
            {showSaved && (
              <span className="text-secondary text-body-sm font-bold font-mono animate-fade-in">
                ✓ System configurations saved!
              </span>
            )}
            
            <button
              onClick={handleSave}
              className="primary-gradient text-white font-body-md text-body-sm px-8 py-3.5 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/10 cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
