import React, { useState, useMemo } from 'react';
import { BaseballEvent, Player, Pitch, Team, PitcherSession } from '../../../types';
import { calculateGamePitchingMetrics } from '../../../storage';
import { Trash2, Trophy } from 'lucide-react';
import { EventReviewHeader } from './EventReviewHeader';
import { PitcherReviewCard } from './PitcherReviewCard';
import { aggregateEventPitcherStats } from '../utils/eventStatsUtils';
import { useEvent } from '../hooks/useEvent';
import { useTeam } from '../../teams/hooks/useTeam';
import { useAuth } from '../../auth/hooks/useAuth';

export interface EventReviewSummaryProps {
  event?: BaseballEvent | null;
  team?: Team | null;
  players?: Player[];
  allEventPitches?: Pitch[];
  allEventSessions?: PitcherSession[];
  onBackToEvents?: () => void;
  onDeleteEvent?: () => void;
  onSaveNotes?: (sessionId: string, coachId: string, notes: string) => void;
  onUpdateSessionUncountedPitches?: (sessionId: string, count: number) => void;
}

export const EventReviewSummary: React.FC<EventReviewSummaryProps> = (props) => {
  const eventCtx = useEvent();
  const teamCtx = useTeam();
  const authCtx = useAuth();

  const event = props.event !== undefined ? props.event : eventCtx.selectedEvent;
  const team = props.team !== undefined ? props.team : teamCtx.selectedTeam;
  const players = props.players ?? teamCtx.teamPlayers;
  const allEventPitches = props.allEventPitches ?? eventCtx.allEventPitches;
  const allEventSessions = props.allEventSessions ?? eventCtx.allEventSessions;
  const onBackToEvents = props.onBackToEvents ?? (() => eventCtx.selectEvent(null));
  const onDeleteEvent = props.onDeleteEvent ?? (() => {
    if (event) {
      eventCtx.deleteEvent(event.id);
      eventCtx.selectEvent(null);
    }
  });
  const onSaveNotes = props.onSaveNotes ?? eventCtx.saveNotes;
  const onUpdateSessionUncountedPitches = props.onUpdateSessionUncountedPitches ?? eventCtx.updateSessionUncountedPitches;

  const [expandedPitcherId, setExpandedPitcherId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const currentCoach = authCtx.currentCoach;
  const allCoaches = authCtx.allCoaches;

  const pitcherStats = useMemo(() => {
    if (!team) return [];
    return aggregateEventPitcherStats(team.id, players, allEventSessions, allEventPitches);
  }, [team, players, allEventSessions, allEventPitches]);

  const totalPitches = useMemo(() => {
    return pitcherStats.reduce((acc, curr) => acc + curr.pitchesThrown, 0);
  }, [pitcherStats]);

  const eventMetrics = useMemo(() => {
    return calculateGamePitchingMetrics(allEventPitches);
  }, [allEventPitches]);

  if (!event || !team) return null;

  return (
    <div id="event-review-summary" className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header & Quick Stats */}
      <EventReviewHeader
        event={event}
        team={team}
        totalPitches={totalPitches}
        eventMetrics={eventMetrics}
        pitcherStatsCount={pitcherStats.length}
        onBackToEvents={onBackToEvents}
        onOpenDeleteModal={() => setShowDeleteModal(true)}
      />

      {/* Pitcher Performance & Breakdowns Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-800">Pitcher Performance &amp; Breakdowns</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">USA Baseball Pitch Smart &bull; Arsenal Analysis</span>
        </div>

        {pitcherStats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No pitching sessions or logs found for this event.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {pitcherStats.map(({ pitcher, pitchesThrown, balls, strikes, pitches, session }) => {
              const isExpanded = expandedPitcherId === pitcher.id;
              return (
                <PitcherReviewCard
                  key={pitcher.id}
                  pitcher={pitcher}
                  pitchesThrown={pitchesThrown}
                  balls={balls}
                  strikes={strikes}
                  pitches={pitches}
                  session={session}
                  isExpanded={isExpanded}
                  event={event}
                  team={team}
                  currentCoach={currentCoach}
                  allCoaches={allCoaches}
                  onToggleExpand={() => setExpandedPitcherId(isExpanded ? null : pitcher.id)}
                  onSaveNotes={onSaveNotes}
                  onUpdateSessionUncountedPitches={onUpdateSessionUncountedPitches}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Event Confirmation Modal */}
      {showDeleteModal && onDeleteEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Event?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Permanently delete this event log and all {totalPitches} pitch records?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEvent();
                  setShowDeleteModal(false);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
