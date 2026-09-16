import React, { useState } from 'react';
import { BaseballEvent, Team, Coach, EventType } from '../types';
import {
  Calendar,
  Plus,
  Play,
  CheckCircle,
  MapPin,
  Clock,
  Swords,
  Dumbbell,
  X,
  ChevronRight,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface EventManagementProps {
  currentCoach: Coach;
  team: Team;
  events: BaseballEvent[];
  onSelectEvent: (event: BaseballEvent) => void;
  onCreateEvent: (input: {
    teamId: string;
    type: EventType;
    opponent?: string;
    location?: string;
    scheduledAt: string;
  }) => void;
  onDeleteEvent?: (eventId: string) => void;
  onReopenEvent?: (eventId: string) => void;
}

export const EventManagement: React.FC<EventManagementProps> = ({
  currentCoach,
  team,
  events,
  onSelectEvent,
  onCreateEvent,
  onDeleteEvent,
  onReopenEvent,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventType, setEventType] = useState<EventType>('game');
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');

  // Default to local datetime
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localIso = new Date(now.getTime() - offset).toISOString().slice(0, 16);
  const [scheduledAt, setScheduledAt] = useState(localIso);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateEvent({
      teamId: team.id,
      type: eventType,
      opponent: eventType === 'game' ? opponent.trim() || undefined : undefined,
      location: location.trim() || undefined,
      scheduledAt: new Date(scheduledAt).toISOString(),
    });

    setOpponent('');
    setLocation('');
    setShowCreateModal(false);
  };

  const activeEvents = events.filter((e) => e.status === 'in_progress');
  const endedEvents = events.filter((e) => e.status === 'ended');

  return (
    <div id="event-management-container" className="space-y-6">
      {/* Header and Action */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {team.name} Events
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Start live pitch tracking during games or bullpen training sessions.
          </p>
        </div>

        <button
          type="button"
          id="create-event-btn"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Event (Game / Bullpen)</span>
        </button>
      </div>

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
                        if (confirm(`Delete this ${ev.type} event and all associated pitch logs?`)) {
                          onDeleteEvent(ev.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
                        if (confirm(`Reopen this event to continue tracking pitches?`)) {
                          onReopenEvent(ev.id);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1"
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
                        if (confirm(`Permanently delete this event and its pitch logs?`)) {
                          onDeleteEvent(ev.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex items-center gap-1 text-xs font-bold text-slate-600 pl-1">
                    <span>Review</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div
          id="create-event-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create Team Event</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Event Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEventType('game')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      eventType === 'game'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Game</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventType('bullpen')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      eventType === 'bullpen'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Bullpen</span>
                  </button>
                </div>
              </div>

              {/* Opponent (if game) */}
              {eventType === 'game' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opponent (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cascade Mariners 12U"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / Field (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Memorial Park - Field 2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              {/* Date / Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
