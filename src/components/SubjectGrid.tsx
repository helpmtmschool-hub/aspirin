import React from 'react';
import { 
  Subject, 
  MBBSProf, 
  LMSTheme,
  Topic 
} from '../types/lms';
import { 
  Play, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  BookOpen,
  Clock
} from 'lucide-react';

interface SubjectGridProps {
  subjects: Subject[];
  currentProf: MBBSProf | 'all';
  onSelectProf: (prof: MBBSProf | 'all') => void;
  onSelectSubject: (subject: Subject) => void;
  currentTheme: LMSTheme;
  recentTopic?: Topic | null;
  onResumeTopic?: (topic: Topic) => void;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({
  subjects,
  currentProf,
  onSelectProf,
  onSelectSubject,
  currentTheme,
  recentTopic,
  onResumeTopic,
}) => {
  const filteredSubjects = currentProf === 'all'
    ? subjects
    : subjects.filter((s) => s.prof === currentProf);

  const profFilters: Array<{ id: MBBSProf | 'all'; label: string }> = [
    { id: 'all', label: 'All 19 Subjects' },
    { id: '1st Prof', label: '1st Prof (Pre-Clinical)' },
    { id: '2nd Prof', label: '2nd Prof (Para-Clinical)' },
    { id: '3rd Prof Part 1', label: '3rd Prof Pt 1' },
    { id: 'Final Prof Part 2', label: 'Final Prof Pt 2 (Clinical)' },
  ];

  const totalVideos = subjects.reduce((acc, s) => acc + s.total_topics, 0);
  const totalNotes = subjects.reduce((acc, s) => acc + s.total_notes, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Marrow "Resume Study Session" Card (when available) */}
      {recentTopic && onResumeTopic && (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 shadow-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center text-white shrink-0 shadow-md">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                    Resume Studying
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {recentTopic.duration_formatted || '30 mins'}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-lg">
                  {recentTopic.title}
                </h3>
              </div>
            </div>

            <button
              onClick={() => onResumeTopic(recentTopic)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-all flex items-center justify-center gap-1.5 shadow-md shrink-0"
            >
              <span>Continue Lecture</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Apple Segmented Controller for MBBS Phases */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-white/5">
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
          {profFilters.map((tab) => {
            const isActive = currentProf === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectProf(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Global Catalog Stats */}
        <div className="text-xs text-slate-400 font-mono flex items-center gap-2.5 shrink-0 px-1">
          <span>{totalVideos} Lectures</span>
          <span>•</span>
          <span>{totalNotes} Practical Notes</span>
        </div>
      </div>

      {/* 3. High-Density Subject Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredSubjects.map((sub) => {
          const progress = sub.progress_percentage || 0;

          return (
            <div
              key={sub.id}
              onClick={() => onSelectSubject(sub)}
              className="group relative bg-slate-900/50 hover:bg-slate-900/80 border border-white/10 hover:border-white/20 rounded-2xl p-4 sm:p-4.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Header: Subject Code Badge & Category */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <span 
                    className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border"
                    style={{ 
                      borderColor: `${sub.color}40`, 
                      backgroundColor: `${sub.color}15`,
                      color: sub.color 
                    }}
                  >
                    {sub.code}
                  </span>

                  <span className="text-[10px] text-slate-400 font-medium">
                    {sub.prof}
                  </span>
                </div>

                {/* Subject Name */}
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors line-clamp-1 mb-1">
                  {sub.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1 mb-4">
                  {sub.category}
                </p>
              </div>

              {/* Footer: Metrics & Progress Bar */}
              <div className="space-y-2.5 pt-2.5 border-t border-white/5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>{sub.total_topics} Videos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-sky-400" />
                    <span>{sub.total_notes} Notes</span>
                  </div>
                </div>

                {/* Subtle Apple Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Progress</span>
                    <span className="font-bold text-slate-200">{progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
