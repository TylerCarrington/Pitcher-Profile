import React, { useState } from 'react';
import { BaseballEvent, Team, Coach, EventType } from '../../../types';
import {
  Calendar,
  Plus,
  X,
  RotateCcw,
  Trash2,
  Swords,
  Dumbbell,
} from 'lucide-react';
import { TeamEventsList } from './TeamEventsList';
import { useTeam } from '../../teams/hooks/useTeam';
import { useEvent } from '../hooks/useEvent';
import { useAuth } from '../../auth/hooks/useAuth';

export interface EventManagementProps {
  currentCoach?: Coach | null;
  team?: Team | null;
  events?: BaseballEvent[];
  onSelectEvent?: (event: BaseballEvent) => void;
  onCreateEvent?: (input: {
    teamId: string;
    type: EventType;
    opponent?: string;
    location?: string;
    scheduledAt: string;
  }) => void;
  onDeleteEvent?: (eventId: string) => void;
  onReopenEvent?: (eventId: string) => void;
}

export const EventManagement: React.FC<EventManagementProps> = (props) => {
  const teamCtx = useTeam();
  const eventCtx = useEvent();
  const authCtx = useAuth();

  const team = props.team !== undefined ? props.team : teamCtx.selectedTeam;
  const events = props.events ?? teamCtx.teamEvents;
  const onSelectEvent = props.onSelectEvent ?? ((ev: BaseballEvent) => eventCtx.selectEvent(ev.id));
  const onCreateEvent = props.onCreateEvent ?? ((input) => eventCtx.createEvent(input));
  const onDeleteEvent = props.onDeleteEvent ?? eventCtx.deleteEvent;
  const onReopenEvent = props.onReopenEvent ?? eventCtx.reopenEvent;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventType, setEventType] = useState<EventType>('game');
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [eventToDelete, setEventToDelete] = useState<BaseballEvent | null>(null);
  const [eventToReopen, setEventToReopen] = useState<BaseballEvent | null>(null);

  // Default to local datetime
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localIso = new Date(now.getTime() - offset).toISOString().slice(0, 16);
  const [scheduledAt, setScheduledAt] = useState(localIso);

  if (!team) return null;

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
          className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Event (Game / Bullpen)</span>
        </button>
      </div>

      {/* Team Events List */}
      <TeamEventsList
        events={events}
        onSelectEvent={onSelectEvent}
        onDeleteEvent={onDeleteEvent ? (ev) => setEventToDelete(ev) : undefined}
        onReopenEvent={onReopenEvent ? (ev) => setEventToReopen(ev) : undefined}
      />

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
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
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
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
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
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {eventToDelete && onDeleteEvent && (
        <div
          id="confirm-delete-event-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  Delete {eventToDelete.type === 'game' ? `vs ${eventToDelete.opponent || 'Game'}` : 'Bullpen'}?
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(eventToDelete.scheduledAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Permanently delete this event and all associated pitch logs, sessions, and statistics?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="cancel-delete-event-btn"
                onClick={() => setEventToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-event-btn"
                onClick={() => {
                  onDeleteEvent(eventToDelete.id);
                  setEventToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Event Modal */}
      {eventToReopen && onReopenEvent && (
        <div
          id="confirm-reopen-event-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Reopen Event?</h3>
                <p className="text-xs text-slate-500">Continue pitch tracking</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Reopen this event to resume live pitch tracking and session editing?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEventToReopen(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onReopenEvent(eventToReopen.id);
                  setEventToReopen(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
              >
                Reopen Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
