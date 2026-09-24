import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, MBBSProf, PlatformId } from '../../types/lms';
import { PLATFORMS, getSubjectVisual } from '../../services/api';

interface SubjectGridProps {
  subjects: Subject[];
  onSelectSubject: (subject: Subject, platformId?: PlatformId) => void;
}

const PROF_TABS: (MBBSProf | 'all')[] = [
  'all',
  '1st Prof',
  '2nd Prof',
  '3rd Prof Part 1',
  'Final Prof Part 2',
];

// Clay Saturated Card Color Mapper based on Medical Curriculum hierarchy
const getSubjectClayTheme = (subject: Subject) => {
  switch (subject.id) {
    case 'anatomy':
      return { bg: 'bg-[#ffb084]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'physiology':
      return { bg: 'bg-[#e8b94a]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'biochemistry':
      return { bg: 'bg-[#f5f0e0]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'pathology':
      return { bg: 'bg-[#b8a4ed]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'pharmacology':
      return { bg: 'bg-[#a4d4c5]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'microbiology':
      return { bg: 'bg-[#f5f0e0]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'forensic_medicine':
      return { bg: 'bg-[#faf5e8]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'psm':
      return { bg: 'bg-[#a4d4c5]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'ophthalmology':
      return { bg: 'bg-[#ff6b5a]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'ent':
      return { bg: 'bg-[#ffb084]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'medicine':
      return { bg: 'bg-[#1a3a3a]', text: 'text-white', badge: 'bg-white/15 text-white', isDark: true };
    case 'surgery':
      return { bg: 'bg-[#ff4d8b]', text: 'text-white', badge: 'bg-white/20 text-white', isDark: true };
    case 'obgyn':
      return { bg: 'bg-[#b8a4ed]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'pediatrics':
      return { bg: 'bg-[#e8b94a]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'orthopedics':
      return { bg: 'bg-[#f5f0e0]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'dermatology':
      return { bg: 'bg-[#ffb084]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'psychiatry':
      return { bg: 'bg-[#b8a4ed]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    case 'radiology':
      return { bg: 'bg-[#1a3a3a]', text: 'text-white', badge: 'bg-white/15 text-white', isDark: true };
    case 'anesthesiology':
      return { bg: 'bg-[#faf5e8]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
    default:
      return { bg: 'bg-[#f5f0e0]', text: 'text-[#0a0a0a]', badge: 'bg-[#0a0a0a]/10 text-[#0a0a0a]', isDark: false };
  }
};

export const SubjectGrid: React.FC<SubjectGridProps> = ({
  subjects,
  onSelectSubject,
}) => {
  const [selectedProf, setSelectedProf] = useState<MBBSProf | 'all'>('all');

  const filteredSubjects = subjects.filter((s) => {
    if (selectedProf === 'all') return true;
    return s.prof === selectedProf;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#0a0a0a] font-display flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#0a0a0a]" />
            19 MBBS Subjects Curriculum
          </h2>
          <p className="text-xs sm:text-sm text-[#6a6a6a]">
            Choose between PrepLadder Edition X (English / Hinglish) and Cerebellum Academy faculty tracks.
          </p>
        </div>

        {/* Prof Filter Pills: Shared Layout Animated Pill */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none p-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] relative">
          {PROF_TABS.map((prof) => {
            const isSelected = selectedProf === prof;
            return (
              <button
                key={prof}
                onClick={() => setSelectedProf(prof)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
                  isSelected ? 'text-white' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="subject-prof-pill"
                    className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {prof === 'all' ? 'All 19 Subjects' : prof}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of 19 Subjects with Clay Saturated Cards and Layout Animation */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence>
          {filteredSubjects.map((sub, index) => {
            const pct = sub.progress_percentage || 0;
            const theme = getSubjectClayTheme(sub);
            const visual = sub.visual || getSubjectVisual(sub.id);

            return (
              <motion.div
                layout
                key={sub.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectSubject(sub)}
                className={`p-6 rounded-[24px] ${theme.bg} ${theme.text} border border-[#e5e5e5]/80 cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200 group flex flex-col justify-between`}
              >
              <div className="space-y-4">
                {/* Top Badge & Category */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full ${theme.badge} text-[10px] font-mono font-bold uppercase tracking-wider`}>
                    {sub.prof}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider font-mono opacity-80`}>
                    {sub.category}
                  </span>
                </div>

                {/* Subject Title & Emoji Icon */}
                <div className="flex items-center gap-3.5">
                  <div className={`w-14 h-14 rounded-2xl ${theme.isDark ? 'bg-white/10 text-white' : 'bg-white/80 text-[#0a0a0a]'} border border-black/5 flex items-center justify-center text-3xl shadow-xs group-hover:scale-110 transition-transform duration-200 shrink-0`}>
                    <span role="img" aria-label={sub.name}>
                      {visual.emoji}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold font-display tracking-tight leading-snug truncate">
                      {sub.name}
                    </h3>
                    <p className={`text-xs ${theme.isDark ? 'text-white/80' : 'text-[#3a3a3a]'} line-clamp-1 mt-0.5 font-medium`}>
                      {visual.tagline}
                    </p>
                    <div className={`text-[11px] font-mono ${theme.isDark ? 'text-white/70' : 'text-[#6a6a6a]'} flex items-center gap-2 mt-1`}>
                      <span>{sub.total_topics} lectures</span>
                      <span>•</span>
                      <span>{sub.total_notes} notes</span>
                    </div>
                  </div>
                </div>

                {/* Available Platforms Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(sub.available_platforms || ['prepx_en', 'cerebellum']).map((pid) => {
                    const p = PLATFORMS[pid];
                    if (!p) return null;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSubject(sub, pid);
                        }}
                        className={`px-2 py-0.5 rounded-md ${theme.isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/60 hover:bg-white text-[#0a0a0a]'} border border-black/5 text-[10px] font-mono font-medium transition cursor-pointer`}
                        title={`Open in ${p.name}`}
                      >
                        {p.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Bar & Footer */}
              <div className={`pt-4 border-t ${theme.isDark ? 'border-white/15' : 'border-[#0a0a0a]/10'} mt-5 space-y-2`}>
                <div className={`flex items-center justify-between text-xs font-mono ${theme.isDark ? 'text-white/80' : 'text-[#3a3a3a]'}`}>
                  <span>{pct}% Completed</span>
                  <span className="font-sans font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Enter Classroom <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full ${theme.isDark ? 'bg-white/20' : 'bg-[#0a0a0a]/10'} overflow-hidden`}>
                  <div
                    className={`h-full ${theme.isDark ? 'bg-white' : 'bg-[#0a0a0a]'} rounded-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
