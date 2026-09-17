import React from 'react';
import { Calendar, MapPin, ArrowLeft, Trash2 } from 'lucide-react';
import { BaseballEvent, Team } from '../../../types';
import { calculateGamePitchingMetrics } from '../../../storage';

export interface EventReviewHeaderProps {
  event?: BaseballEvent | null;
  team?: Team | null;
  formattedDate?: string;
  totalOverallPitches?: number;
  totalChartedPitches?: number;
  totalUncountedPitches?: number;
  pitchersCount?: number;
  totalPitches?: number;
  pitcherStatsCount?: number;
  eventMetrics?: ReturnType<typeof calculateGamePitchingMetrics>;
  onBackToEvents?: () => void;
  onOpenDeleteModal?: () => void;
}

export const EventReviewHeader: React.FC<EventReviewHeaderProps> = (props) => {
  const {
    event,
    team,
    totalOverallPitches,
    totalChartedPitches,
    totalUncountedPitches = 0,
    pitchersCount,
    totalPitches = 0,
    pitcherStatsCount,
    onBackToEvents,
    onOpenDeleteModal,
  } = props;

  const eventType = event?.type ?? 'game';
  const isGame = eventType === 'game';
  const isBullpen = eventType === 'bullpen';

  const displayTotalPitches =
    totalOverallPitches ?? totalPitches ?? totalChartedPitches ?? 0;
  const displayPitchersCount = pitchersCount ?? pitcherStatsCount ?? 0;

  const formattedDate =
    props.formattedDate ||
    (event?.scheduledAt
      ? new Date(event.scheduledAt).toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'Completed Event');

  const teamName = team?.name || 'Team';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 relative overflow-hidden space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        {onBackToEvents && (
          <button
            type="button"
            id="back-to-events-btn"
            onClick={onBackToEvents}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </button>
        )}

        {onOpenDeleteModal && (
          <button
            type="button"
            id="open-delete-event-modal-btn"
            onClick={onOpenDeleteModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Event</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
              {isGame ? 'Game Summary' : 'Bullpen Session Summary'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Completed
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isGame
              ? event?.opponent
                ? `${teamName} vs ${event.opponent}`
                : `${teamName} Game`
              : `${teamName} Bullpen Session`}
          </h1>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-500 mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{formattedDate}</span>
            </div>
            {event?.location && (
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
            <div className="text-xl font-black text-slate-900">{displayTotalPitches}</div>
            {isBullpen && totalUncountedPitches > 0 && (
              <div className="text-[9px] text-slate-500 font-medium">
                {(totalChartedPitches ?? displayTotalPitches)} ch + {totalUncountedPitches} unc
              </div>
            )}
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pitchers Used</div>
            <div className="text-xl font-black text-slate-900">{displayPitchersCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
