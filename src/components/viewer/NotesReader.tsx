import React, { useState, useEffect } from 'react';
import { X, FileText, ExternalLink, CloudUpload } from 'lucide-react';
import { motion } from 'motion/react';
import { NoteItem } from '../../types/lms';
import { ForensicWatermark } from '../security/ForensicWatermark';

interface NotesReaderProps {
  note: NoteItem;
  onClose: () => void;
}

export const NotesReader: React.FC<NotesReaderProps> = ({
  note,
  onClose,
}) => {
  const noteStreamUrl = `/api/notes/${note.telegram_chat_id}/${note.telegram_message_id}`;
  const [loadState, setLoadState] = useState<'checking' | 'ready' | 'pending'>('checking');

  useEffect(() => {
    let isMounted = true;
    fetch(noteStreamUrl)
      .then((res) => {
        if (!isMounted) return;
        if (res.status === 404 || res.status === 423) {
          setLoadState('pending');
        } else {
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (isMounted) setLoadState('pending');
      });

    return () => {
      isMounted = false;
    };
  }, [noteStreamUrl]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0a0a0a]/60 backdrop-blur-md"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full h-full max-w-6xl flex flex-col bg-[#fffaf0] border border-[#e5e5e5] rounded-[24px] overflow-hidden shadow-2xl select-none"
      >
        {/* Dynamic Forensic Watermark Overlay */}
        <ForensicWatermark />

        {/* Top Header */}
        <div className="p-4 bg-[#faf5e8] border-b border-[#e5e5e5] flex items-center justify-between z-40 relative">
          <div className="flex items-center gap-3 truncate max-w-xl">
            <div className="w-9 h-9 rounded-[12px] bg-[#ff4d8b]/10 border border-[#ff4d8b]/20 flex items-center justify-center text-[#ff4d8b] shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ff4d8b]">
                {note.subject_id} • Clinical Notes
              </span>
              <h3 className="text-sm font-medium text-[#0a0a0a] truncate">{note.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loadState === 'ready' && (
              <a
                href={noteStreamUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 px-3 rounded-full bg-[#ebe6d6]/60 hover:bg-[#ebe6d6] text-[#0a0a0a] transition flex items-center gap-1.5 text-xs font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pop Out</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#ebe6d6]/50 transition shrink-0"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 w-full h-full bg-white relative overflow-hidden flex items-center justify-center">
          {loadState === 'pending' ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-4">
              <div className="w-14 h-14 rounded-[18px] bg-[#e8b94a]/20 border border-[#e8b94a]/40 flex items-center justify-center text-[#946600]">
                <CloudUpload className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-display font-medium text-lg text-[#0a0a0a]">Queued for Cloud Migration</h4>
                <p className="text-xs text-[#3a3a3a] leading-relaxed">
                  This clinical PDF is queued to be uploaded to your 25 TB SharePoint drive.
                  Run <code className="text-[#0a0a0a] font-mono bg-[#f5f0e0] px-1.5 py-0.5 rounded border border-[#e5e5e5]">pnpm migrate:notes</code> in the terminal to upload master notes to Azure CDN.
                </p>
              </div>
              <button
                onClick={onClose}
                className="clay-btn-primary px-5 py-2 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] text-xs font-medium transition"
              >
                Back to Curriculum
              </button>
            </div>
          ) : (
            <iframe
              src={`${noteStreamUrl}#toolbar=0&navpanes=0`}
              title={note.title}
              className="w-full h-full border-none bg-white"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
