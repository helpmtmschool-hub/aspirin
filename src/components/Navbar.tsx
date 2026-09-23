import React, { useState, useEffect } from 'react';
import { 
  Search, 
  PanelLeft, 
  Radio, 
  Sparkles, 
  Palette,
  ChevronRight,
  Menu
} from 'lucide-react';
import { LMSTheme, Subject } from '../types/lms';
import { LiquidGlassWrapper } from './LiquidGlassWrapper';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  currentTheme: LMSTheme;
  onToggleTheme: (theme: LMSTheme) => void;
  selectedSubject: Subject | null;
  onGoHome: () => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  currentTheme,
  onToggleTheme,
  selectedSubject,
  onGoHome,
  activeView,
}) => {
  const [bridgeStatus, setBridgeStatus] = useState<'connected' | 'checking' | 'offline'>('checking');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Ping health check to verify live stream bridge latency
  useEffect(() => {
    const checkBridge = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch('/api/info/health', { signal: AbortSignal.timeout(2000) });
        const t1 = performance.now();
        if (res.ok) {
          setBridgeStatus('connected');
          setLatencyMs(Math.round(t1 - t0));
        } else {
          setBridgeStatus('offline');
        }
      } catch {
        setBridgeStatus('offline');
      }
    };
    checkBridge();
    const timer = setInterval(checkBridge, 12000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 px-3 sm:px-6 py-2 sm:py-2.5 select-none">
      {/* Floating Apple Liquid Glass Toolbar */}
      <LiquidGlassWrapper
        cornerRadius={20}
        variant="regular"
        className="max-w-7xl mx-auto shadow-xl"
      >
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Sidebar Toggle + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4 sm:hidden" />
              <PanelLeft className="w-4 h-4 hidden sm:inline" />
            </button>

            {/* Breadcrumb Hierarchy */}
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold truncate text-slate-400">
              <span 
                onClick={onGoHome} 
                className="hover:text-white cursor-pointer transition-colors text-slate-300 shrink-0 flex items-center gap-1.5 font-bold"
              >
                <img src="/logo.png" alt="aspirin" className="w-4 h-4 object-contain" />
                <span>aspirin</span>
              </span>

              {selectedSubject && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-white font-bold truncate max-w-[120px] sm:max-w-[220px]">
                    {selectedSubject.name}
                  </span>
                  <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10 shrink-0">
                    {selectedSubject.code}
                  </span>
                </>
              )}

              {!selectedSubject && activeView === 'pearls' && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-amber-400 font-bold truncate">Pearls</span>
                </>
              )}

              {!selectedSubject && activeView === 'notes_atlas' && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-sky-400 font-bold truncate">Atlas</span>
                </>
              )}

              {!selectedSubject && activeView === 'bookmarks' && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-amber-400 font-bold truncate">Bookmarks</span>
                </>
              )}
            </div>
          </div>

          {/* Center: Apple Spotlight Search Capsule (Desktop & Tablet) */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors shrink-0" />
                <span className="truncate">Search lectures, operative videos & OSCE notes...</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Mobile Search Button + Live Stream Status + Segmented Theme Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Search Button (visible on < md) */}
            <button
              onClick={onOpenSearch}
              className="md:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Search (⌘K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Live MTProto Stream Status Pill */}
            <div 
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium"
              title={bridgeStatus === 'connected' ? 'Connected to Telegram MTProto Stream Engine' : 'Offline / Standby'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                bridgeStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'
              }`} />
              <span className="text-slate-300 hidden sm:inline">
                {bridgeStatus === 'connected' ? `${latencyMs ? `${latencyMs}ms ` : ''}TG Stream` : 'Standby'}
              </span>
            </div>

            {/* Apple Segmented Theme Switcher */}
            <div className="flex items-center bg-white/5 p-0.5 rounded-full border border-white/10">
              <button
                onClick={() => onToggleTheme('marrow')}
                className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all ${
                  currentTheme === 'marrow'
                    ? 'bg-teal-500/30 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Marrow Clinical Theme"
              >
                Marrow
              </button>
              <button
                onClick={() => onToggleTheme('prepladder')}
                className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all ${
                  currentTheme === 'prepladder'
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="PrepLadder Theme"
              >
                Prep
              </button>
            </div>
          </div>
        </div>
      </LiquidGlassWrapper>
    </header>
  );
};
