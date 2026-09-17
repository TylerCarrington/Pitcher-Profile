import React from 'react';
import { Target, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { PitcherSession, Pitch, BaseballEvent, Coach, Player } from '../../../types';
import { calculateGamePitchingMetrics, getSessionsForEvent } from '../../../storage';
import { PitchSmartBadge } from '../../players/components/PitchSmartBadge';
import { StrikeZoneHeatmap } from '../../pitches/components/StrikeZoneHeatmap';
import { PitcherNotesEditor } from './PitcherNotesEditor';
import { BullpenAdjustmentPanel } from './BullpenAdjustmentPanel';

export interface PitcherReviewCardProps {
  pitcher: Player;
  pitchesThrown: number;
  balls: number;
  strikes: number;
  pitches: Pitch[];
  session?: PitcherSession;
  uncountedPitches?: number;
  totalPitches?: number;
  strikePercent?: number;
  isExpanded: boolean;
  gameMetrics?: ReturnType<typeof calculateGamePitchingMetrics>;
  currentCoach?: Coach | null;
  event?: BaseballEvent | null;
  allCoaches?: Coach[];
  onToggleExpand: (pitcherId: string | null) => void;
  onSaveNotes?: (sessionId: string, coachId: string, notes: string) => void;
  onUpdateSessionUncountedPitches?: (sessionId: string, count: number) => void;
}

export const PitcherReviewCard: React.FC<PitcherReviewCardProps> = ({
  pitcher,
  pitchesThrown,
  balls,
  strikes,
  pitches,
  session,
  uncountedPitches: customUncounted,
  totalPitches: customTotal,
  strikePercent: customStrikePercent,
  isExpanded,
  gameMetrics: customGameMetrics,
  currentCoach = null,
  event = null,
  allCoaches = [],
  onToggleExpand,
  onSaveNotes,
  onUpdateSessionUncountedPitches,
}) => {
  const uncountedPitches = customUncounted ?? session?.uncountedPitches ?? 0;
  const totalPitches = customTotal ?? (pitchesThrown + uncountedPitches);
  const strikePercent =
    customStrikePercent ??
    (pitchesThrown > 0 ? Math.round((strikes / pitchesThrown) * 100) : 0);
  const gameMetrics = customGameMetrics ?? calculateGamePitchingMetrics(pitches);
  const isGame = event?.type === 'game';
  const isBullpen = event?.type === 'bullpen';
  return (
    <div
      id={`pitcher-summary-${pitcher.id}`}
      className="divide-y divide-slate-100"
    >
      {/* Pitcher Row */}
      <div
        onClick={() => onToggleExpand(isExpanded ? null : pitcher.id)}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition cursor-pointer"
      >
        {/* Pitcher Identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {pitcher.imageUrl ? (
              <img
                src={pitcher.imageUrl}
                alt={pitcher.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-600 text-lg">
                #{pitcher.jerseyNumber}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white font-bold text-[10px] px-1.5 rounded-full border border-white">
              #{pitcher.jerseyNumber}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-slate-900">{pitcher.name}</h4>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                {pitcher.throws || 'R'}HP
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>{strikePercent}% Strike Rate</span>
              <span>&bull;</span>
              {isBullpen && uncountedPitches > 0 ? (
                <span>
                  {pitchesThrown} charted, {totalPitches} total
                </span>
              ) : (
                <span>{pitchesThrown} Pitches</span>
              )}
              {isGame && (
                <>
                  <span>&bull;</span>
                  <span className="font-semibold text-slate-700">
                    {gameMetrics.inningsPitched} IP, {gameMetrics.strikeouts} K, {gameMetrics.walks} BB
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right side: Pitch Smart Badge, Counts & Expand Toggle */}
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          {/* Pitch Smart Safety Badge */}
          <PitchSmartBadge
            pitchCount={totalPitches}
            seasonAge={pitcher.seasonAge || 11}
          />

          {/* Game Line or Bullpen Counts */}
          {isGame ? (
            <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">IP</div>
                <div className="font-mono font-bold text-slate-900">{gameMetrics.inningsPitched}</div>
              </div>
              <div className="h-5 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-cyan-600">K-BB</div>
                <div className="font-mono font-bold text-cyan-700">
                  {gameMetrics.strikeouts}-{gameMetrics.walks}
                </div>
              </div>
              <div className="h-5 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-600">FPS%</div>
                <div className="font-mono font-bold text-emerald-600">
                  {gameMetrics.fpsRate}%
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  {uncountedPitches > 0 ? 'Total' : 'Pitches'}
                </div>
                <div className="font-mono font-bold text-slate-900">{totalPitches}</div>
              </div>
              <div className="h-5 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-amber-600">Balls</div>
                <div className="font-mono font-bold text-amber-600">{balls}</div>
              </div>
              <div className="h-5 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-600">Strikes</div>
                <div className="font-mono font-bold text-emerald-600">{strikes}</div>
              </div>
            </div>
          )}

          {/* Toggle Breakdown Button */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{isExpanded ? 'Hide Breakdown' : 'Breakdown'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Scouting Analysis & Strike Zone Breakdown */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-50/50 space-y-5">
          <div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>{pitcher.name}'s Event Strike Zone &amp; Arsenal Breakdown</span>
            </h4>
            <p className="text-xs text-slate-500">
              Interactive breakdown of pitch locations, outcomes, and arsenal mix for this event.
            </p>
          </div>

          {isBullpen && session && (
            <BullpenAdjustmentPanel
              session={session}
              pitchesThrown={pitchesThrown}
              totalPitches={totalPitches}
              onUpdateSessionUncountedPitches={onUpdateSessionUncountedPitches || (() => {})}
            />
          )}

          <StrikeZoneHeatmap
            pitches={pitches}
            title={`${pitcher.name} (#${pitcher.jerseyNumber}) Event Summary`}
          />

          {(() => {
            const eventSessions = event ? getSessionsForEvent(event.id) : [];
            const pitcherSessions = eventSessions.filter((s) => s.pitcherId === pitcher.id);

            // Notes from other coaches (must be [SHARED])
            const coCoachNotes = pitcherSessions.flatMap((s) => {
              return Object.entries(s?.coachNotes || {}).map(([coachId, note]) => {
                if (currentCoach && coachId === currentCoach.id) return null;
                const author = allCoaches.find((c) => c.id === coachId);
                const isShared = typeof note === 'string' && note.startsWith('[SHARED]');
                const cleanText = typeof note === 'string' ? note.replace(/^\[SHARED\]\s*/, '') : '';
                
                return {
                  coachId,
                  authorName: author?.name || 'Co-Coach',
                  noteText: cleanText,
                  isShared,
                  isValid: cleanText.trim().length > 0,
                };
              }).filter((n): n is NonNullable<typeof n> => n !== null && n.isValid && n.isShared);
            });

            const targetSession = session || pitcherSessions[0];
            const currentCoachId = currentCoach?.id;
            const initialCoachNote = (targetSession && currentCoachId && targetSession.coachNotes?.[currentCoachId]) || '';

            return (
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <div className="mb-1">
                  <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Coaches' Observations &amp; Session Notes</span>
                  </h5>
                  <p className="text-xs text-slate-500">
                    Scouting comments, delivery feedback, and pitch strategy shared between coaches or kept private.
                  </p>
                </div>

                {/* Other coaches' comments */}
                {coCoachNotes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Co-Coaches' Shared Observations
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {coCoachNotes.map((n, index) => (
                        <div
                          key={`${n.coachId}-${index}`}
                          className="p-3.5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 text-emerald-950 text-xs shadow-3xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900">{n.authorName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Shared Comment
                            </span>
                          </div>
                          <p className="leading-relaxed font-medium">
                            {n.noteText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Self-observations editor */}
                {targetSession && currentCoachId ? (
                  <PitcherNotesEditor
                    sessionId={targetSession.id}
                    coachId={currentCoachId}
                    initialNote={initialCoachNote}
                    onSaveNotes={onSaveNotes}
                  />
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Note taking is only available for active or logged pitcher sessions.
                  </p>
                )}

                {coCoachNotes.length === 0 && !initialCoachNote && (
                  <div className="bg-slate-100/50 rounded-xl p-4 text-center text-xs text-slate-400 italic border border-slate-200">
                    No shared co-coach observations logged for this pitcher in this event yet.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
