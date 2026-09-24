import React, { useEffect } from 'react';
import { 
  Search, 
  Home, 
  BookOpen, 
  Bookmark, 
  Command,
  Check,
  RefreshCw,
} from 'lucide-react';
import { UserProfileButton } from '../auth/AuthProvider';
import { ProgressService, SyncStatus } from '../../services/progress';
import { useState } from 'react';

import { motion } from 'motion/react';

interface NavbarProps {
  activeTab: 'home' | 'study' | 'bookmarks';
  onTabChange: (tab: 'home' | 'study' | 'bookmarks') => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
}) => {
  // Global keyboard shortcut: Cmd+K or Ctrl+K opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    const unsubscribe = ProgressService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'study' as const, label: '19 Subjects', icon: BookOpen },
    { id: 'bookmarks' as const, label: 'Bookmarks', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e5e5] bg-[#fffaf0]/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Clay Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          <motion.div 
            onClick={() => onTabChange('home')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          >
            <img
              src="/logo-main.png"
              alt="Aspirin"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#0a0a0a] font-display">
                Aspirin
              </span>
              <span className="hidden lg:flex text-[10px] text-[#6a6a6a] font-medium items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                Clinical Video Library
              </span>
            </div>
          </motion.div>

          {/* Desktop & Tablet Navigation Links: Shared Layout Animated Pill */}
          <nav className="hidden md:flex items-center gap-0.5 sm:gap-1 p-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] relative shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
                    isActive ? 'text-white' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center / Search: Clay adaptive input style button */}
        <div className="flex-1 max-w-[200px] sm:max-w-xs lg:max-w-md mx-1 sm:mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a] text-xs sm:text-sm transition group"
            aria-label="Search curriculum"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-[#0a0a0a] group-hover:scale-105 transition-transform shrink-0" />
              <span className="truncate hidden sm:inline">Search lectures, books...</span>
              <span className="truncate sm:hidden">Search...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md border border-[#e5e5e5] bg-[#f5f0e0] text-[#0a0a0a]">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Cloud Sync Status & Auth Profile Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Mobile subtle sync status dot */}
          <div 
            title={
              syncStatus === 'syncing' ? 'Saving progress...' :
              syncStatus === 'synced' ? 'All progress saved' :
              syncStatus === 'error' ? 'Working offline' : 'Saved'
            }
            className="sm:hidden flex items-center p-1"
          >
            <span 
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'syncing' ? 'bg-[#ff4d8b] animate-ping' :
                syncStatus === 'synced' ? 'bg-[#10b981]' :
                syncStatus === 'error' ? 'bg-[#f59e0b]' : 'bg-[#10b981]'
              }`} 
            />
          </div>

          {/* Progress Status Indicator */}
          <div 
            title={
              syncStatus === 'syncing' 
                ? 'Saving your progress...' 
                : syncStatus === 'synced' 
                ? 'All watch progress is saved' 
                : syncStatus === 'error'
                ? 'Working offline — changes will save when connected'
                : 'Progress saved'
            }
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-[11px] font-mono text-[#4a4a4a]"
          >
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3 h-3 text-[#ff4d8b] animate-spin" />
                <span className="text-[10px] text-[#ff4d8b] font-medium">Saving</span>
              </>
            ) : syncStatus === 'synced' ? (
              <>
                <Check className="w-3 h-3 text-[#10b981]" />
                <span className="text-[10px] text-[#0a0a0a] font-medium">Saved</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                <span className="text-[10px] text-[#b45309] font-medium">Offline</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-[#6a6a6a]" />
                <span className="text-[10px] text-[#6a6a6a]">Saved</span>
              </>
            )}
          </div>

          <UserProfileButton />
        </div>
      </div>
    </header>
  );
};
