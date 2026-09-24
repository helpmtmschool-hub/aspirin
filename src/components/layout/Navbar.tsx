import React, { useEffect } from 'react';
import { 
  Stethoscope, 
  Search, 
  Home, 
  BookOpen, 
  Bookmark, 
  Command,
  Cloud
} from 'lucide-react';
import { UserProfileButton } from '../auth/AuthProvider';

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

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'study' as const, label: '19 Subjects', icon: BookOpen },
    { id: 'bookmarks' as const, label: 'Bookmarks', icon: Bookmark },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5e5e5] bg-[#fffaf0]/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Clay Brand Identity */}
        <div className="flex items-center gap-6">
          <motion.div 
            onClick={() => onTabChange('home')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5 text-[#ffb084]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-[#0a0a0a] font-display">
                  aspirin
                </span>
                <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-[#f5f0e0] text-[#0a0a0a] border border-[#e5e5e5]">
                  LMS
                </span>
              </div>
              <span className="text-[10px] text-[#6a6a6a] font-medium flex items-center gap-1">
                <Cloud className="w-3 h-3 text-[#22c55e]" />
                SharePoint Azure CDN
              </span>
            </div>
          </motion.div>

          {/* Desktop Navigation Links: Shared Layout Animated Pill */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] relative">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
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
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center / Search: Clay text-input style button */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a] text-xs sm:text-sm transition group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="w-4 h-4 text-[#0a0a0a] group-hover:scale-105 transition-transform shrink-0" />
              <span className="truncate">Search lectures, textbooks, faculty...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md border border-[#e5e5e5] bg-[#f5f0e0] text-[#0a0a0a]">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Auth Profile Button */}
        <div className="flex items-center gap-3 shrink-0">
          <UserProfileButton />
        </div>
      </div>
    </header>
  );
};
