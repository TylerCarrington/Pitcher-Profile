import React from 'react';
import { BaseballEvent } from '../../../types';
import {
  Swords,
  Dumbbell,
  Clock,
  MapPin,
  Trash2,
  Play,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';

export interface TeamEventsListProps {
  events: BaseballEvent[];
  onSelectEvent: (event: BaseballEvent) => void;
  onDeleteEvent?: (event: BaseballEvent) => void;
  onReopenEvent?: (event: BaseballEvent) => void;
}

export const TeamEventsList: React.FC<TeamEventsListProps> = ({
  events = [],
  onSelectEvent,
  onDeleteEvent,
  onReopenEvent,
}) => {
  const validEvents = (events || []).filter((e): e is BaseballEvent => !!e && typeof e === 'object');
  const activeEvents = validEvents.filter((e) => e.status === 'in_progress');
  const endedEvents = validEvents.filter((e) => e.status === 'ended');

  return (
    <div className="space-y-6">
      {/* Active Events List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Active Tracking ({activeEvents.length})
          </h3>
        </div>

        {activeEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
            No live events in progress. Click "New Event" to start a live game or bullpen session.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeEvents.map((ev) => (
              <div
                key={ev.id}
                id={`active-event-${ev.id}`}
                onClick={() => onSelectEvent(ev)}
                className="bg-white rounded-xl border-2 border-emerald-500/80 p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800">
                      {ev.type === 'game' ? (
                        <>
                          <Swords className="w-3 h-3" />
                          Game
                        </>
                      ) : (
                        <>
                          <Dumbbell className="w-3 h-3" />
                          Bullpen Session
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Now
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition">
                    {ev.type === 'game'
                      ? ev.opponent
                        ? `vs ${ev.opponent}`
                        : 'Live Game'
                      : 'Bullpen Workout'}
                  </h4>

                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(ev.scheduledAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {onDeleteEvent && (
                    <button
                      type="button"
                      id={`delete-active-event-${ev.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(ev);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!onDeleteEvent && <span className="text-slate-400 font-medium">Pitch-by-pitch live</span>}
                  <span className="font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                    <Play className="w-3.5 h-3.5 fill-emerald-600" />
                    Track Pitcher
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Events List */}
      {endedEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completed Events ({endedEvents.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            {endedEvents.map((ev) => (
              <div
                key={ev.id}
                id={`ended-event-${ev.id}`}
                onClick={() => onSelectEvent(ev)}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    {ev.type === 'game' ? (
                      <Swords className="w-4 h-4" />
                    ) : (
                      <Dumbbell className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {ev.type === 'game'
                          ? ev.opponent
                            ? `vs ${ev.opponent}`
                            : 'Game'
                          : 'Bullpen Session'}
                      </h4>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {ev.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>
                        {new Date(ev.scheduledAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {ev.location && (
                        <>
                          <span>•</span>
                          <span className="truncate">{ev.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onReopenEvent && (
                    <button
                      type="button"
                      id={`reopen-event-btn-${ev.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReopenEvent(ev);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                      title="Reopen event if accidentally ended"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-600" />
                      <span className="hidden sm:inline">Reopen Event</span>
                    </button>
                  )}

                  {onDeleteEvent && (
                    <button
                      type="button"
                      id={`delete-ended-event-${ev.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(ev);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
