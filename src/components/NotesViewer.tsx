import React from 'react';
import { NoteItem, LMSTheme } from '../types/lms';
import { ArrowLeft, Download, FileText, ExternalLink, X } from 'lucide-react';

interface NotesViewerProps {
  note: NoteItem;
  subjectName: string;
  onClose: () => void;
  currentTheme: LMSTheme;
}

export const NotesViewer: React.FC<NotesViewerProps> = ({
  note,
  subjectName,
  onClose,
  currentTheme,
}) => {
  const noteUrl = `/api/notes/${note.telegram_chat_id}/${note.telegram_message_id}`;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Subject"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs text-slate-400 font-medium">
              {subjectName} • Clinical Note / PDF
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-1">
              {note.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={noteUrl}
            download={note.filename}
            target="_blank"
            rel="noreferrer"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5 ${
              currentTheme === 'marrow' ? 'bg-marrow-600 hover:bg-marrow-500' : 'bg-prep-600 hover:bg-prep-500'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* PDF Viewer Canvas / Iframe */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        <iframe
          src={`${noteUrl}#toolbar=1`}
          className="w-full h-full border-none"
          title={note.title}
        />
      </div>
    </div>
  );
};
