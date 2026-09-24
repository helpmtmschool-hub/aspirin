import React from 'react';
import { X, Film, FileText, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, PlatformId } from '../../types/lms';
import { PLATFORMS } from '../../services/api';

interface PlatformModalProps {
  subject: Subject | null;
  onClose: () => void;
  onSelectPlatform: (platformId: PlatformId) => void;
}

export const PlatformModal: React.FC<PlatformModalProps> = ({
  subject,
  onClose,
  onSelectPlatform,
}) => {
  const platforms: PlatformId[] = ['prepx_en', 'prepx_hi', 'cerebellum', 'marrow'];

  return (
    <AnimatePresence>
      {subject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0a0a0a]/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="w-full max-w-xl bg-[#fffaf0] border border-[#e5e5e5] rounded-[20px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[#e5e5e5] bg-[#faf5e8] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 sm:gap-3.5 truncate mr-2">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#0a0a0a] flex items-center justify-center font-bold text-white text-xs sm:text-sm font-display shadow-xs shrink-0">
                  {subject.code || subject.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] font-mono block truncate">
                    {subject.prof} • Select Curriculum Track
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-[#0a0a0a] font-display truncate">{subject.name}</h3>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#e5e5e5]/50 transition flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Platforms Choice Cards */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
              <p className="text-xs text-[#6a6a6a] font-medium">
                Choose your preferred faculty curriculum for this subject:
              </p>

              <div className="space-y-2.5 sm:space-y-3">
                {platforms.map((pid) => {
                  const p = PLATFORMS[pid];
                  const pData = subject.platform_data?.[pid];
                  const topicCount = pData?.modules.reduce((sum, m) => sum + m.topics.length, 0) || 0;
                  const noteCount = pData?.notes.length || 0;

                  const cardBg = 
                    pid === 'prepx_en' ? 'bg-[#faf5e8] hover:bg-[#f5f0e0]' :
                    pid === 'prepx_hi' ? 'bg-[#fffaf0] hover:bg-[#faf5e8]' :
                    'bg-[#faf5e8] hover:bg-[#f5f0e0]';

                  return (
                    <motion.div
                      key={pid}
                      whileHover={{ y: -2, scale: 1.008 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onSelectPlatform(pid)}
                      className={`p-3.5 sm:p-4 rounded-[16px] border border-[#e5e5e5] ${cardBg} cursor-pointer transition-shadow shadow-xs hover:shadow-md group flex items-center justify-between gap-3 sm:gap-4`}
                    >
                      <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#0a0a0a] text-white text-[9px] font-bold uppercase tracking-wider shrink-0">
                            {p.badge}
                          </span>
                          <h4 className="text-xs sm:text-base font-bold text-[#0a0a0a] font-display truncate">
                            {p.name}
                          </h4>
                        </div>

                        <p className="text-xs text-[#3a3a3a] leading-relaxed line-clamp-2 sm:line-clamp-none">
                          {p.tagline}
                        </p>

                        <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#6a6a6a]">
                          <span className="flex items-center gap-1 font-semibold text-[#0a0a0a]">
                            <Film className="w-3.5 h-3.5" />
                            {topicCount} Lectures
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-semibold text-[#0a0a0a]">
                            <FileText className="w-3.5 h-3.5" />
                            {noteCount} Notes
                          </span>
                        </div>
                      </div>

                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#f5f0e0] group-hover:bg-[#0a0a0a] group-hover:text-white flex items-center justify-center text-[#0a0a0a] transition-all shrink-0">
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
