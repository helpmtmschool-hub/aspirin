import React from 'react';
import { Home, BookOpen, Bookmark, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface MobileNavProps {
  activeTab: 'home' | 'study' | 'bookmarks';
  onTabChange: (tab: 'home' | 'study' | 'bookmarks') => void;
  onOpenSearch: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSearch,
}) => {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'study' as const, label: 'Subjects', icon: BookOpen },
    { id: 'bookmarks' as const, label: 'Saved', icon: Bookmark },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fffaf0]/95 backdrop-blur-md border-t border-[#e5e5e5] px-4 py-2 flex items-center justify-around shadow-sm">
      {tabs.slice(0, 2).map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center gap-1 text-[11px] font-medium transition ${
              isActive ? 'text-[#0a0a0a] font-bold' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
            }`}
          >
            <div className="relative p-1.5 rounded-full">
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 bg-[#f5f0e0] border border-[#e5e5e5] rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
            </div>
            <span>{tab.label}</span>
          </motion.button>
        );
      })}

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onOpenSearch}
        className="flex flex-col items-center gap-1 text-[11px] font-medium text-[#6a6a6a] hover:text-[#0a0a0a] transition"
      >
        <div className="p-1.5 rounded-full">
          <Search className="w-4 h-4" />
        </div>
        <span>Search</span>
      </motion.button>

      {tabs.slice(2).map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center gap-1 text-[11px] font-medium transition ${
              isActive ? 'text-[#0a0a0a] font-bold' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
            }`}
          >
            <div className="relative p-1.5 rounded-full">
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 bg-[#f5f0e0] border border-[#e5e5e5] rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
            </div>
            <span>{tab.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};
