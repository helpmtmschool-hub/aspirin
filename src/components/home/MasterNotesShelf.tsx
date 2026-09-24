import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { NoteItem } from '../../types/lms';

interface MasterNotesShelfProps {
  books: NoteItem[];
  onSelectNote: (note: NoteItem) => void;
}

export const MasterNotesShelf: React.FC<MasterNotesShelfProps> = ({
  books,
  onSelectNote,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -500 : 500;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!books || books.length === 0) return null;

  return (
    <section className="space-y-4 relative group/notes">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a0a0a] font-display flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#0a0a0a]" />
            Master Clinical Review Textbooks
          </h3>
          <p className="text-xs sm:text-sm text-[#6a6a6a]">
            Full-color faculty review textbooks across preclinical and clinical specialties.
          </p>
        </div>

        {/* Scroll Controls */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover/notes:opacity-100 transition-opacity">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('left')}
            className="p-2 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] transition"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('right')}
            className="p-2 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] transition"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Horizontal Carousel with Clay Surface Cards */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {books.map((book) => {
          return (
            <motion.div
              key={book.id}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectNote(book)}
              className="flex-shrink-0 w-48 sm:w-56 rounded-[20px] border border-[#e5e5e5] bg-[#f5f0e0] hover:bg-[#faf5e8] cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              {/* Book Spine / Cover Mockup */}
              <div className="p-5 border-b border-[#e5e5e5]/80 space-y-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#fffaf0] border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 text-[#ff4d8b]" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6a6a6a]">
                    {book.subject_id}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0a0a0a] font-display line-clamp-2 leading-snug">
                    {book.title}
                  </h4>
                </div>
              </div>

              {/* Book Footer */}
              <div className="p-3.5 bg-[#ebe6d6]/60 flex items-center justify-between text-xs text-[#6a6a6a] font-mono">
                <span>{book.file_size_mb ? `${book.file_size_mb} MB` : 'PDF'}</span>
                <span className="text-[#0a0a0a] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-sans font-bold">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
