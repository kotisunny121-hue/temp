import React, { useState, useEffect } from 'react';
import {
  Waves,
  Brain,
  Layers,
  Sparkles,
  Download,
  Activity,
  Compass,
  BarChart3,
  Cpu,
  FileCode2,
  Database,
  User,
  LogOut,
  LogIn,
} from 'lucide-react';
import { SynopticEventPreset } from '../types';
import { PRESET_EVENTS } from '../utils/oceanEngine';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'map' | 'transect' | 'benchmark' | 'pipeline' | 'architecture' | 'database';
  setActiveTab: (tab: 'map' | 'transect' | 'benchmark' | 'pipeline' | 'architecture' | 'database') => void;
  currentPreset: SynopticEventPreset;
  onSelectPreset: (preset: SynopticEventPreset) => void;
  onOpenCopilot: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentPreset,
  onSelectPreset,
  onOpenCopilot,
  onOpenExport,
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && user.email) {
        // Register or sync user in PostgreSQL users table
        try {
          await fetch('/api/db/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, email: user.email }),
          });
        } catch (err) {
          console.error('Failed to sync user to PostgreSQL:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  return (
    <header className="bg-white border-b-2 border-black sticky top-0 z-40 px-4 lg:px-6 py-3 shadow-[0px_3px_0px_#000000]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#FF3B30] shrink-0">
            <Waves className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-black tracking-tight uppercase flex items-center gap-2 font-display">
                NIO DeepOcean-Transformer
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#FF3B30] text-white font-black border border-black">
                NIO 0.25° • 15 Depths
              </span>
            </div>
            <p className="text-[11px] font-mono font-bold text-zinc-600 uppercase tracking-wide">
              3D Ocean Subsurface Reconstruction • 7 Satellite Channels &rarr; 15 Depth Layers
            </p>
          </div>
        </div>

        {/* Synoptic Scenario Preset & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-100 border-2 border-black px-2.5 py-1 text-xs shadow-[2px_2px_0px_#000000]">
            <Compass className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span className="text-zinc-600 font-mono font-black uppercase text-[10px] hidden sm:inline">Scenario:</span>
            <select
              value={currentPreset.id}
              onChange={(e) => {
                const found = PRESET_EVENTS.find((p) => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-transparent text-black font-black uppercase tracking-tight focus:outline-none cursor-pointer pr-1 text-xs"
            >
              {PRESET_EVENTS.map((preset) => (
                <option
                  key={preset.id}
                  value={preset.id}
                  className="bg-white text-black font-bold uppercase"
                >
                  {preset.title}
                </option>
              ))}
            </select>
          </div>

          {/* AI Oceanographer Copilot */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#FF3B30] hover:bg-black text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>AI Copilot</span>
          </button>

          {/* Export NetCDF / Data */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span className="hidden sm:inline">Export NetCDF</span>
          </button>

          {/* Google Auth status */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-zinc-100 border-2 border-black px-2 py-1 text-xs shadow-[2px_2px_0px_#000000]">
              <User className="w-3.5 h-3.5 text-[#FF3B30]" />
              <span className="font-mono text-[10px] font-bold truncate max-w-[100px]">{currentUser.email}</span>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-zinc-600 hover:text-black cursor-pointer ml-1"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={authLoading}
              className="flex items-center gap-1 px-2.5 py-1 bg-black hover:bg-zinc-800 text-white font-mono font-bold text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <LogIn className="w-3 h-3 text-[#FF3B30]" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t-2 border-black flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
        <nav className="flex items-center gap-1.5 flex-nowrap">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
            Spatial Map
          </button>

          <button
            onClick={() => setActiveTab('transect')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'transect'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
            Vertical Transects
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 stroke-[2.5]" />
            Model Architecture
          </button>

          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'benchmark'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
            Evaluation Benchmark
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-[#FF3B30]/10 text-black hover:bg-[#FF3B30]/20 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5]" />
            PostgreSQL Database (8 Tables)
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'bg-black text-white shadow-[2px_2px_0px_#FF3B30]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 stroke-[2.5]" />
            Preprocessing Pipeline
          </button>
        </nav>

        {/* Live Status indicator */}
        <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono font-black uppercase text-black bg-zinc-100 border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_#000000]">
          <span className="w-2 h-2 bg-[#FF3B30] border border-black animate-pulse"></span>
          <span>PostgreSQL Active • Cloud SQL</span>
        </div>
      </div>
    </header>
  );
};

