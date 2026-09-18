import React, { useRef, useState } from 'react';
import { Player, Pitch, PitcherSession, BaseballEvent, Team } from '../../../types';
import { calculateGamePitchingMetrics } from '../../../storage';
import { SinglePlayerSessionExportCard } from './SinglePlayerSessionExportCard';
import { downloadElementAsPng, copyElementToClipboard } from '../utils/exportSessionImage';
import {
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  Loader2,
  FileImage,
  Eye,
  MessageSquare,
  Filter,
} from 'lucide-react';

export interface SinglePlayerSessionExportModalProps {
  pitcher: Player;
  pitches: Pitch[];
  session?: PitcherSession;
  event?: BaseballEvent | null;
  team?: Team | null;
  pitchesThrown: number;
  balls: number;
  strikes: number;
  totalPitches?: number;
  strikePercent?: number;
  gameMetrics?: ReturnType<typeof calculateGamePitchingMetrics>;
  coachNotes?: { authorName: string; noteText: string }[];
  onClose: () => void;
}

export const SinglePlayerSessionExportModal: React.FC<SinglePlayerSessionExportModalProps> = ({
  pitcher,
  pitches,
  session,
  event,
  team,
  pitchesThrown,
  balls,
  strikes,
  totalPitches,
  strikePercent,
  gameMetrics,
  coachNotes = [],
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [includeNotes, setIncludeNotes] = useState(coachNotes.length > 0);
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'strike' | 'ball' | 'in_play' | 'foul'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const cleanName = pitcher.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const eventLabel = event?.type === 'game' ? 'Game' : 'Bullpen';
  const defaultFilename = `${cleanName}_#${pitcher.jerseyNumber}_${eventLabel}_Session_Review.png`;

  const handleDownloadPng = async () => {
    if (!cardRef.current || isExporting) return;

    try {
      setIsExporting(true);
      setStatusMessage('Rendering high-resolution graphic (2x)...');

      // Small delay to ensure any layout paints
      await new Promise((resolve) => setTimeout(resolve, 60));

      await downloadElementAsPng(cardRef.current, {
        filename: defaultFilename,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      setDownloadSuccess(true);
      setStatusMessage('PNG image downloaded successfully!');
      setTimeout(() => {
        setDownloadSuccess(false);
        setStatusMessage(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to export PNG:', err);
      setStatusMessage('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!cardRef.current || isExporting) return;

    try {
      setIsExporting(true);
      setStatusMessage('Copying high-resolution PNG to clipboard...');

      await new Promise((resolve) => setTimeout(resolve, 60));

      const success = await copyElementToClipboard(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      if (success) {
        setIsCopied(true);
        setStatusMessage('Graphic copied to clipboard! You can paste it into messages or documents.');
        setTimeout(() => {
          setIsCopied(false);
          setStatusMessage(null);
        }, 3500);
      } else {
        setStatusMessage('Direct clipboard image copy not supported in this browser. Please use "Download PNG".');
      }
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      setStatusMessage('Failed to copy image. Please use "Download PNG".');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="player-session-export-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Export Session Review PNG</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {pitcher.name} (#{pitcher.jerseyNumber})
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Strike Zone, Key Metrics &amp; Arsenal Breakdown in a single high-resolution image
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
            aria-label="Close export modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Toolbar */}
        <div className="px-5 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Outcome Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
              </span>
              {(['all', 'strike', 'ball'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setOutcomeFilter(opt)}
                  className={`px-2 py-1 rounded-md font-semibold capitalize transition cursor-pointer ${
                    outcomeFilter === opt
                      ? 'bg-slate-900 text-white shadow-3xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt === 'all' ? 'All Pitches' : `${opt}s`}
                </button>
              ))}
            </div>

            {/* Coach Notes Toggle */}
            {coachNotes.length > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Include Coach Notes ({coachNotes.length})</span>
              </label>
            )}
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyToClipboard}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Copy image to clipboard"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PNG...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Live Preview Container (Scrollable viewport) */}
        <div className="p-4 sm:p-6 overflow-auto bg-slate-200/60 flex-1 flex justify-center items-start">
          <div className="shadow-2xl rounded-2xl overflow-hidden bg-white max-w-full">
            <SinglePlayerSessionExportCard
              ref={cardRef}
              pitcher={pitcher}
              pitches={pitches}
              session={session}
              event={event}
              team={team}
              pitchesThrown={pitchesThrown}
              balls={balls}
              strikes={strikes}
              totalPitches={totalPitches}
              strikePercent={strikePercent}
              gameMetrics={gameMetrics}
              coachNotes={coachNotes}
              includeNotes={includeNotes}
              outcomeFilter={outcomeFilter}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>High-res preview rendered at 2x sharpness (1560px crisp width)</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200/70 font-semibold cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
