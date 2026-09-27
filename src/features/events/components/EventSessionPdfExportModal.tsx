import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  Check,
  Loader2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';
import { BaseballEvent, Coach, PitcherSession, Team, CoachNotePhoto } from '../../../types';
import { calculateGamePitchingMetrics } from '../../../storage';
import { getPitchRulePreset } from '../../../utils/pitchSmart';
import { PitcherEventStat } from '../utils/eventStatsUtils';
import { SinglePlayerSessionExportCard } from './SinglePlayerSessionExportCard';
import { generateMultiPagePdfFromElements } from '../utils/exportSessionPdf';
import { parseCoachNote } from '../utils/coachNotesUtils';

export interface EventSessionPdfExportModalProps {
  event: BaseballEvent;
  team: Team;
  pitcherStats: PitcherEventStat[];
  allEventSessions?: PitcherSession[];
  allCoaches?: Coach[];
  currentCoach?: Coach | null;
  onClose: () => void;
}

export const EventSessionPdfExportModal: React.FC<EventSessionPdfExportModalProps> = ({
  event,
  team,
  pitcherStats,
  allEventSessions = [],
  allCoaches = [],
  currentCoach = null,
  onClose,
}) => {
  // 1. Pitcher selection: default all selected
  const [selectedPitcherIds, setSelectedPitcherIds] = useState<string[]>(() =>
    pitcherStats.map((ps) => ps.pitcher.id)
  );

  // 2. Active preview page index (0 to selectedPitchers.length - 1)
  const [previewIndex, setPreviewIndex] = useState(0);

  // 3. Export settings
  const [pageSize, setPageSize] = useState<'letter' | 'a4'>('letter');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'strike' | 'ball'>('all');

  // 4. Progress & State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Refs for off-screen rendering of each card
  const cardElementsMap = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Filtered pitcher list
  const selectedPitchers = useMemo(() => {
    return pitcherStats.filter((ps) => selectedPitcherIds.includes(ps.pitcher.id));
  }, [pitcherStats, selectedPitcherIds]);

  // Ensure preview index is within range
  const safePreviewIndex = Math.min(
    Math.max(0, previewIndex),
    Math.max(0, selectedPitchers.length - 1)
  );
  const currentPreviewStat = selectedPitchers[safePreviewIndex];

  // Helper to extract coach notes for a specific pitcher across event sessions
  const getPitcherNotes = (pitcherId: string) => {
    const list: { authorName: string; noteText: string; photos?: CoachNotePhoto[] }[] = [];
    const sessions = allEventSessions.filter((s) => s.pitcherId === pitcherId);

    sessions.forEach((s) => {
      Object.entries(s?.coachNotes || {}).forEach(([coachId, note]) => {
        if (typeof note === 'string' && note.trim().length > 0) {
          const parsed = parseCoachNote(note);
          const author = allCoaches.find((c) => c.id === coachId);
          if (parsed.text || parsed.photos.length > 0) {
            const authorName =
              author?.name || (coachId === currentCoach?.id ? currentCoach?.name || 'You' : 'Coach');
            if (!list.some((item) => item.authorName === authorName && item.noteText === parsed.text)) {
              list.push({ authorName, noteText: parsed.text, photos: parsed.photos });
            }
          }
        }
      });
    });
    return list;
  };

  // Total notes count across selected pitchers
  const totalNotesCount = useMemo(() => {
    return selectedPitchers.reduce((acc, curr) => acc + getPitcherNotes(curr.pitcher.id).length, 0);
  }, [selectedPitchers, allEventSessions, allCoaches, currentCoach]);

  const togglePitcherSelection = (id: string) => {
    setSelectedPitcherIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((pId) => pId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllPitchers = () => {
    setSelectedPitcherIds(pitcherStats.map((ps) => ps.pitcher.id));
  };

  const handleDownloadPdf = async () => {
    if (selectedPitchers.length === 0 || isExporting) return;

    try {
      setIsExporting(true);
      setDownloadSuccess(false);

      // Collect DOM elements for each selected pitcher in order
      const elements: HTMLElement[] = [];
      for (const ps of selectedPitchers) {
        const el = cardElementsMap.current.get(ps.pitcher.id);
        if (el) {
          elements.push(el);
        }
      }

      if (elements.length === 0) {
        throw new Error('Unable to locate pitcher cards for rendering.');
      }

      const teamSlug = team.name.replace(/[^a-zA-Z0-9]/g, '_');
      const eventDateStr = event.scheduledAt ? event.scheduledAt.split('T')[0] : 'session';
      const eventTypeStr = event.type === 'bullpen' ? 'Bullpen' : 'Game';
      const filename = `${teamSlug}_${eventTypeStr}_Report_${eventDateStr}.pdf`;

      await generateMultiPagePdfFromElements(elements, {
        pageSize,
        filename,
        margin: 20,
        onProgress: (current, total, message) => {
          setExportProgress({ current, total, message });
        },
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Could not generate PDF. Please try again or check your browser permissions.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div
        id="session-pdf-export-modal"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isExporting) onClose();
        }}
      >
      <div className="bg-white rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh]">
        {/* 1. Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs font-bold text-sm shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Export Event PDF Report
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {selectedPitchers.length} {selectedPitchers.length === 1 ? 'Page' : 'Pages'} (1 per Pitcher)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Full session breakdown with pitch counts, recovery rest days &amp; strike zone scatter for every pitcher
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Pitcher Selection & Filter Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 space-y-3 shrink-0">
          {/* Pitcher Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Included Pitchers ({selectedPitchers.length}/{pitcherStats.length})
              </span>
              {selectedPitchers.length < pitcherStats.length && (
                <button
                  type="button"
                  onClick={selectAllPitchers}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  Select All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {pitcherStats.map((ps) => {
                const isSelected = selectedPitcherIds.includes(ps.pitcher.id);
                return (
                  <button
                    key={ps.pitcher.id}
                    type="button"
                    onClick={() => togglePitcherSelection(ps.pitcher.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-xs'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>
                      #{ps.pitcher.jerseyNumber} {ps.pitcher.name}
                    </span>
                    <span className="text-[10px] font-normal opacity-70">
                      ({ps.pitchesThrown}P)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options & Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Format & Filters */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Paper Format */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Page Size:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setPageSize('letter')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      pageSize === 'letter'
                        ? 'bg-white text-slate-900 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Letter (US)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('a4')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      pageSize === 'a4'
                        ? 'bg-white text-slate-900 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    A4
                  </button>
                </div>
              </div>

              {/* Pitch Outcome Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" /> Pitches:
                </span>
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden cursor-pointer"
                >
                  <option value="all">All Pitches</option>
                  <option value="strike">Strikes Only</option>
                  <option value="ball">Balls Only</option>
                </select>
              </div>

              {/* Coach Notes Toggle */}
              {totalNotesCount > 0 && (
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Include Coach Notes ({totalNotesCount})</span>
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={isExporting}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Print or Save as PDF via browser print dialog"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>

              <button
                type="button"
                id="download-multi-page-pdf-btn"
                onClick={handleDownloadPdf}
                disabled={isExporting || selectedPitchers.length === 0}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Generating PDF...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>PDF Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF ({selectedPitchers.length} {selectedPitchers.length === 1 ? 'Page' : 'Pages'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Progress Overlay Banner */}
        {exportProgress && (
          <div className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between gap-3 shrink-0 animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{exportProgress.message}</span>
            </div>
            <span className="font-mono bg-emerald-700/80 px-2 py-0.5 rounded text-[11px]">
              {Math.round((exportProgress.current / exportProgress.total) * 100)}%
            </span>
          </div>
        )}

        {/* 4. Pagination / Page Switcher Bar */}
        {selectedPitchers.length > 1 && (
          <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Previewing Page:</span>
              <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-3xs">
                {safePreviewIndex + 1} of {selectedPitchers.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({currentPreviewStat?.pitcher.name})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                disabled={safePreviewIndex === 0}
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40 transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewIndex((prev) => Math.min(selectedPitchers.length - 1, prev + 1))}
                disabled={safePreviewIndex >= selectedPitchers.length - 1}
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40 transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 5. Live Page Preview Viewport */}
        <div className="p-4 sm:p-6 overflow-auto bg-slate-200/60 flex-1 flex justify-center items-start">
          {currentPreviewStat ? (
            <div className="shadow-2xl rounded-2xl bg-white shrink-0">
              <SinglePlayerSessionExportCard
                pitcher={currentPreviewStat.pitcher}
                pitches={currentPreviewStat.pitches}
                session={currentPreviewStat.session}
                event={event}
                team={team}
                pitchesThrown={currentPreviewStat.pitchesThrown}
                balls={currentPreviewStat.balls}
                strikes={currentPreviewStat.strikes}
                totalPitches={currentPreviewStat.pitchesThrown + (currentPreviewStat.session?.uncountedPitches ?? 0)}
                strikePercent={
                  currentPreviewStat.pitchesThrown > 0
                    ? Math.round((currentPreviewStat.strikes / currentPreviewStat.pitchesThrown) * 100)
                    : 0
                }
                gameMetrics={calculateGamePitchingMetrics(currentPreviewStat.pitches)}
                coachNotes={getPitcherNotes(currentPreviewStat.pitcher.id)}
                includeNotes={includeNotes}
                outcomeFilter={outcomeFilter}
              />
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              Please select at least one pitcher to export.
            </div>
          )}
        </div>

        {/* 6. Footer Note */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Each pitcher is printed on their own clean page in the resulting PDF.</span>
          </div>
          <span>{getPitchRulePreset(team?.pitchRulePresetId).shortName} Compliant</span>
        </div>
      </div>

      {/* 7. Hidden Off-screen Rendering Container for all selected pitchers */}
      <div
        id="pdf-offscreen-rendering-container"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0px',
          width: '840px',
          minWidth: '840px',
          zIndex: -100,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {selectedPitchers.map((ps) => {
          const notes = getPitcherNotes(ps.pitcher.id);
          const total = ps.pitchesThrown + (ps.session?.uncountedPitches ?? 0);
          const strikePct =
            ps.pitchesThrown > 0
              ? Math.round((ps.strikes / ps.pitchesThrown) * 100)
              : 0;
          const metrics = calculateGamePitchingMetrics(ps.pitches);

          return (
            <div
              key={ps.pitcher.id}
              className="bg-white mb-8"
              style={{ width: '780px', minWidth: '780px' }}
            >
              <SinglePlayerSessionExportCard
                ref={(el) => {
                  cardElementsMap.current.set(ps.pitcher.id, el);
                }}
                pitcher={ps.pitcher}
                pitches={ps.pitches}
                session={ps.session}
                event={event}
                team={team}
                pitchesThrown={ps.pitchesThrown}
                balls={ps.balls}
                strikes={ps.strikes}
                totalPitches={total}
                strikePercent={strikePct}
                gameMetrics={metrics}
                coachNotes={notes}
                includeNotes={includeNotes}
                outcomeFilter={outcomeFilter}
              />
            </div>
          );
        })}
      </div>
    </div>

    {/* 8. Dedicated Print Container (rendered only when browser printing window.print()) */}
    <div className="hidden print:block print:w-full print:m-0 print:p-0">
      {selectedPitchers.map((ps, idx) => {
        const notes = getPitcherNotes(ps.pitcher.id);
        const total = ps.pitchesThrown + (ps.session?.uncountedPitches ?? 0);
        const strikePct =
          ps.pitchesThrown > 0
            ? Math.round((ps.strikes / ps.pitchesThrown) * 100)
            : 0;
        const metrics = calculateGamePitchingMetrics(ps.pitches);

        return (
          <div
            key={`print-${ps.pitcher.id}`}
            className="print-page-break print:w-[780px] print:mx-auto print:mb-0"
            style={{ pageBreakAfter: idx < selectedPitchers.length - 1 ? 'always' : 'auto' }}
          >
            <SinglePlayerSessionExportCard
              pitcher={ps.pitcher}
              pitches={ps.pitches}
              session={ps.session}
              event={event}
              team={team}
              pitchesThrown={ps.pitchesThrown}
              balls={ps.balls}
              strikes={ps.strikes}
              totalPitches={total}
              strikePercent={strikePct}
              gameMetrics={metrics}
              coachNotes={notes}
              includeNotes={includeNotes}
              outcomeFilter={outcomeFilter}
            />
          </div>
        );
      })}
    </div>
  </>
  );
};
