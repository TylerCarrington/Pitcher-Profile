import React, { useState } from 'react';
import { BaseballEvent, Player, Pitch, Team } from '../types';
import { calculateGamePitchingMetrics } from '../storage';
import { PitchSmartBadge } from './PitchSmartBadge';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  RotateCcw,
  Award,
  Trash2,
  ChevronDown,
  ChevronUp,
  Target,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface EventReviewSummaryProps {
  event: BaseballEvent;
  team: Team;
  players: Player[];
  allEventPitches: Pitch[];
  onBackToEvents: () => void;
  onReopenEvent: () => void;
  onDeleteEvent?: () => void;
}

export const EventReviewSummary: React.FC<EventReviewSummaryProps> = ({
  event,
  team,
  players,
  allEventPitches,
  onBackToEvents,
  onReopenEvent,
  onDeleteEvent,
}) => {
  const [expandedPitcherId, setExpandedPitcherId] = useState<string | null>(null);

  // Group pitches by pitcher
  const pitcherStatsMap = new Map<
    string,
    {
      pitcher: Player;
      pitchesThrown: number;
      balls: number;
      strikes: number;
      pitches: Pitch[];
    }
  >();

  allEventPitches.forEach((p) => {
    let stat = pitcherStatsMap.get(p.pitcherId);
    if (!stat) {
      const pitcher = players.find((pl) => pl.id === p.pitcherId) || {
        id: p.pitcherId,
        name: 'Unknown Pitcher',
        jerseyNumber: '?',
        teamId: team.id,
        seasonAge: 11,
        createdAt: new Date().toISOString(),
      };
      stat = {
        pitcher,
        pitchesThrown: 0,
        balls: 0,
        strikes: 0,
        pitches: [],
      };
      pitcherStatsMap.set(p.pitcherId, stat);
    }

    stat.pitches.push(p);
    stat.pitchesThrown += 1;
    if (p.outcome === 'ball') {
      stat.balls += 1;
    } else {
      // Strike, foul, in-play count as strikes
      stat.strikes += 1;
    }
  });

  const pitchersList = Array.from(pitcherStatsMap.values());

  const totalEventPitches = allEventPitches.length;
  const formattedDate = new Date(event.scheduledAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div id="event-review-summary" className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToEvents}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {team.name}</span>
        </button>

        <div className="flex items-center gap-2">
          {onDeleteEvent && (
            <button
              type="button"
              id="delete-event-review-btn"
              onClick={() => {
                if (confirm(`Are you sure you want to permanently delete this event and its pitch records?`)) {
                  onDeleteEvent();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition"
              title="Delete event"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Delete Event</span>
            </button>
          )}

          <button
            type="button"
            id="reopen-event-btn"
            onClick={onReopenEvent}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resume / Reopen Event</span>
          </button>
        </div>
      </div>

      {/* Event Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
                {event.type === 'game' ? 'Game Summary' : 'Bullpen Session Summary'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Completed
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {event.type === 'game'
                ? event.opponent
                  ? `${team.name} vs ${event.opponent}`
                  : `${team.name} Game`
                : `${team.name} Bullpen Session`}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-500 mt-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Pitches</div>
              <div className="text-xl font-black text-slate-900">{totalEventPitches}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Pitchers Used</div>
              <div className="text-xl font-black text-slate-900">{pitchersList.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pitchers Review & Scouting Analysis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-800">
              Pitcher Performance &amp; Heatmaps
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            USA Baseball Pitch Smart &bull; Arsenal Analysis
          </span>
        </div>

        {pitchersList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No pitches were recorded during this event.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {pitchersList.map(({ pitcher, pitchesThrown, balls, strikes, pitches }) => {
              const strikePercent =
                pitchesThrown > 0 ? Math.round((strikes / pitchesThrown) * 100) : 0;
              const isExpanded = expandedPitcherId === pitcher.id;
              const gameMetrics = calculateGamePitchingMetrics(pitches);

              return (
                <div
                  key={pitcher.id}
                  id={`pitcher-summary-${pitcher.id}`}
                  className="divide-y divide-slate-100"
                >
                  {/* Pitcher Row */}
                  <div
                    onClick={() => setExpandedPitcherId(isExpanded ? null : pitcher.id)}
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
                          <span>{pitchesThrown} Pitches</span>
                          {event.type === 'game' && (
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
                        pitchCount={pitchesThrown}
                        seasonAge={pitcher.seasonAge || 11}
                      />

                      {/* Game Line or Bullpen Counts */}
                      {event.type === 'game' ? (
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
                            <div className="text-[10px] uppercase font-bold text-slate-400">Total</div>
                            <div className="font-mono font-bold text-slate-900">{pitchesThrown}</div>
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

                      {/* Toggle Heatmap Button */}
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center gap-1 text-xs font-semibold"
                      >
                        <Target className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">{isExpanded ? 'Hide Map' : 'Heatmap'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Scouting Analysis & Strike Zone Heatmap */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-slate-50/50">
                      <div className="mb-4">
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-600" />
                          <span>{pitcher.name}'s Event Strike Zone &amp; Arsenal Heatmap</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Interactive breakdown of pitch locations, outcomes, and arsenal mix for this event.
                        </p>
                      </div>

                      <StrikeZoneHeatmap
                        pitches={pitches}
                        title={`${pitcher.name} (#${pitcher.jerseyNumber}) Event Summary`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety & Scouting Note */}
      <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-4 text-xs text-slate-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Pitch Smart &amp; Scouting Integration: </span>
          Rest day requirements are determined by official USA Baseball pitch limit thresholds. Tap
          on any pitcher row to inspect their 9-cell strike zone concentration and pitch arsenal distribution.
        </div>
      </div>
    </div>
  );
};
