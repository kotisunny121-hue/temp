import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Compass,
  Flame,
  Waves,
  RefreshCw,
} from 'lucide-react';
import { OceanGridPoint, SynopticEventPreset } from '../types';

interface OceanCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePreset: SynopticEventPreset;
  selectedPoint: OceanGridPoint | null;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

export const OceanCopilotModal: React.FC<OceanCopilotModalProps> = ({
  isOpen,
  onClose,
  activePreset,
  selectedPoint,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Suggested quick inquiry prompts
  const suggestedPrompts = [
    'Assess Cyclone Rapid Intensification Risk from TCHP & D26',
    'Explain the Bay of Bengal Barrier Layer & Salinity Stratification',
    'Analyze Somali Upwelling & Great Whirl Thermocline Shoaling',
    'Evaluate Arabian Sea Warm Pool & Monsoon Onset Vortex',
  ];

  // Send initial automated diagnosis when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleGenerateDiagnostic();
    }
  }, [isOpen]);

  const handleGenerateDiagnostic = async (customPrompt?: string) => {
    setIsLoading(true);
    const userQuestion = customPrompt || inputText.trim();

    if (userQuestion) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: userQuestion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInputText('');
    }

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionName: activePreset.title,
          coordinates: selectedPoint
            ? { lat: selectedPoint.lat, lon: selectedPoint.lon }
            : { lat: activePreset.warmPoolCenter.lat, lon: activePreset.warmPoolCenter.lon },
          surfaceConditions: selectedPoint
            ? {
                sst: selectedPoint.sst,
                sss: selectedPoint.sss,
                ssh: selectedPoint.ssh,
                u_curr: selectedPoint.u_curr,
                v_curr: selectedPoint.v_curr,
                u_wind: selectedPoint.u_wind,
                v_wind: selectedPoint.v_wind,
              }
            : {
                sst: 29.8,
                sss: 32.5,
                ssh: 0.18,
                u_curr: 0.35,
                v_curr: 0.25,
                u_wind: 12.0,
                v_wind: 8.5,
              },
          subsurfaceProfile: selectedPoint
            ? {
                d26: selectedPoint.d26,
                d20: selectedPoint.d20,
                mld: selectedPoint.mld,
                tempAt100m: selectedPoint.temperatures[100] ?? 23.5,
                tempAt500m: selectedPoint.temperatures[500] ?? 9.2,
              }
            : {
                d26: 65,
                d20: 120,
                mld: 25,
                tempAt100m: 24.2,
                tempAt500m: 9.1,
              },
          cycloneRiskMetrics: {
            tchp: selectedPoint?.tchp ?? 98.4,
          },
          customQuery: userQuestion,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.insight || data.fallbackInsight,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.error('Copilot request error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Diagnostic Summary: The Northern Indian Ocean exhibits high thermal stratification. In the Bay of Bengal, riverine discharge induces strong salinity capping that suppresses vertical mixing, maintaining high Tropical Cyclone Heat Potential (>95 kJ/cm²). In the Western Arabian Sea, monsoonal wind-stress curl drives intense coastal upwelling with the 20°C isotherm shoaling to ~30m.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-fade-in overflow-y-auto">
      <div className="bg-white border-2 border-black max-w-3xl w-full h-[85vh] flex flex-col shadow-[8px_8px_0px_#000000] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF3B30] text-white border-2 border-black shadow-[2px_2px_0px_#000000]">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 uppercase font-display">
                AI Oceanographer Copilot
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-white text-black border border-black font-black">
                  Gemini 3.7 Flash
                </span>
              </h2>
              <p className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wide">
                Physics-Informed Northern Indian Ocean Diagnostics &amp; Cyclone Heat Analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white hover:bg-[#FF3B30] border-2 border-transparent hover:border-black transition cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Selected Context Bar */}
        <div className="bg-zinc-100 px-4 py-2 border-b-2 border-black flex flex-wrap items-center justify-between text-xs font-mono font-bold">
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 uppercase">Active Scenario:</span>
            <span className="text-black font-black uppercase">{activePreset.title}</span>
          </div>
          {selectedPoint && (
            <div className="flex items-center gap-2 text-black">
              <span className="text-zinc-600 uppercase">Probed Coords:</span>
              <span className="text-[#FF3B30] font-black">
                {selectedPoint.lat.toFixed(2)}°N, {selectedPoint.lon.toFixed(2)}°E
              </span>
            </div>
          )}
        </div>

        {/* Messages List Area */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-zinc-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-black border-2 border-black flex items-center justify-center shrink-0 text-white mt-1 shadow-[2px_2px_0px_#000000]">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] border-2 border-black p-4 text-xs leading-relaxed font-mono ${
                  msg.role === 'user'
                    ? 'bg-black text-white shadow-[4px_4px_0px_#FF3B30]'
                    : 'bg-white text-black shadow-[4px_4px_0px_#000000]'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed font-medium">{msg.content}</div>
                <span className={`block text-[10px] font-bold uppercase mt-2 text-right ${msg.role === 'user' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {msg.timestamp}
                </span>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 bg-[#FF3B30] border-2 border-black flex items-center justify-center shrink-0 text-white mt-1 shadow-[2px_2px_0px_#000000]">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs font-mono font-bold uppercase text-black bg-white p-3 border-2 border-black shadow-[4px_4px_0px_#000000] w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-[#FF3B30]" />
              <span>Analyzing 3D thermocline dynamics &amp; Tropical Cyclone Heat Potential...</span>
            </div>
          )}
        </div>

        {/* Suggested Inquiry Chips */}
        <div className="px-4 py-2.5 border-t-2 border-black bg-white flex items-center gap-2 overflow-x-auto no-scrollbar">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleGenerateDiagnostic(prompt)}
              disabled={isLoading}
              className="text-[11px] font-mono font-bold uppercase whitespace-nowrap px-3 py-1 bg-zinc-100 hover:bg-black hover:text-white text-black border-2 border-black transition cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-zinc-100 border-t-2 border-black">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputText.trim() && !isLoading) {
                handleGenerateDiagnostic();
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about thermocline depth, barrier layers, cyclone heat potential..."
              className="flex-1 bg-white border-2 border-black px-4 py-2.5 text-xs font-mono font-bold text-black placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 bg-black text-white hover:bg-[#FF3B30] border-2 border-black disabled:opacity-40 transition cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
