import React, { useState } from 'react';
import {
  BaseballEvent,
  PitcherSession,
  Player,
} from '../../../types';
import {
  ArrowLeft,
  ChevronRight,
  Users,
  RotateCcw,
  Trash2,
  History,
  CheckCircle2,
} from 'lucide-react';

export interface PitcherPickerProps {
  event?: BaseballEvent | null;
  teamPlayers: Player[];
  allEventSessions?: PitcherSession[];
  activePitcher: Player | null;
  activeSession: PitcherSession | null;
  onStartSession: (pitcherId: string) => void;
  onReopenSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onBackToTeam: () => void;
  onEndEvent: () => void;
  onClosePicker?: () => void;
}

export const PitcherPicker: React.FC<PitcherPickerProps> = ({
  event,
  teamPlayers,
  allEventSessions = [],
  activePitcher,
  activeSession,
  onStartSession,
  onReopenSession,
  onDeleteSession,
  onBackToTeam,
  onEndEvent,
  onClosePicker,
}) => {
  const [sessionToDelete, setSessionToDelete] = useState<PitcherSession | null>(null);

  const isGame = event?.type === 'game';

  return (
    <div id="pitcher-picker-screen" className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToTeam}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Live Tracking</span>
        </button>

        <button
          type="button"
          id="picker-end-event-btn"
          onClick={onEndEvent}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition active:scale-95 cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
          <span>End Entire Event</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
            {isGame ? 'Game In Progress' : 'Bullpen In Progress'}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Select Pitcher for this Session
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Choose who is taking the mound or entering the bullpen. You can switch pitchers
            anytime.
          </p>
        </div>

        {teamPlayers.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500">
              No players found in this team roster. Please add players to the roster first.
            </p>
            <button
              type="button"
              onClick={onBackToTeam}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white cursor-pointer"
            >
              Go to Roster
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {teamPlayers.map((player) => {
              const playerSession = allEventSessions.find((s) => s.pitcherId === player.id);
              const isPlayerActive = playerSession?.status === 'active';
              const isPlayerCompleted = playerSession?.status === 'completed';

              return (
                <button
                  key={player.id}
                  id={`select-pitcher-${player.id}`}
                  type="button"
                  onClick={() => {
                    if (activePitcher && activePitcher.id === player.id && onClosePicker) {
                      onClosePicker();
                    } else {
                      onStartSession(player.id);
                      if (onClosePicker) onClosePicker();
                    }
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition flex items-center justify-between gap-3 group cursor-pointer ${
                    isPlayerActive
                      ? 'border-blue-200 bg-blue-50/10 hover:border-blue-500 hover:bg-blue-50/20'
                      : isPlayerCompleted
                      ? 'border-slate-200 bg-slate-50/40 hover:border-slate-400'
                      : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      {player.imageUrl ? (
                        <img
                          src={player.imageUrl}
                          alt={player.name}
                          className={`w-12 h-12 rounded-full object-cover border-2 transition ${
                            isPlayerActive ? 'border-blue-500' : 'border-slate-200 group-hover:border-emerald-500'
                          }`}
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-base transition ${
                          isPlayerActive
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-slate-100 border-slate-200 group-hover:border-emerald-500 text-slate-700'
                        }`}>
                          #{player.jerseyNumber}
                        </div>
                      )}
                      <span className={`absolute -bottom-1 -right-1 font-bold text-[9px] px-1 rounded-full border border-white text-white ${
                        isPlayerActive ? 'bg-blue-600' : 'bg-slate-900'
                      }`}>
                        #{player.jerseyNumber}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className={`font-bold text-sm truncate transition ${
                          isPlayerActive ? 'text-blue-900' : 'text-slate-900 group-hover:text-emerald-800'
                        }`}>
                          {player.name}
                        </h4>
                        {isPlayerActive && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-extrabold text-[9px] uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                        {isPlayerCompleted && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-bold text-[9px] uppercase tracking-wider">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{player.throws || 'R'}HP • #{player.jerseyNumber}</span>
                        {player.seasonAge && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            {player.seasonAge}U
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
                    isPlayerActive
                      ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white'
                      : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white'
                  }`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Return to current active session button if exists */}
        {activeSession && activePitcher && onClosePicker && (
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClosePicker}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Return to {activePitcher.name}'s Active Session
            </button>
          </div>
        )}
      </div>

      {/* Existing / Completed Pitching Sessions in this Event */}
      {allEventSessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Sessions in this Event ({allEventSessions.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Tap Reopen if ended accidentally
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {allEventSessions.map((session) => {
              const pitcher = teamPlayers.find((p) => p.id === session.pitcherId);
              const isCurrentActive = activeSession?.id === session.id;
              const isSessionActive = session.status === 'active';

              return (
                <div
                  key={session.id}
                  id={`event-session-row-${session.id}`}
                  className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                      #{pitcher?.jerseyNumber || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {pitcher?.name || 'Pitcher'}
                        </span>
                        {isCurrentActive ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Tracking Now
                          </span>
                        ) : isSessionActive ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                            Active
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Started {new Date(session.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCurrentActive ? (
                      <button
                        type="button"
                        onClick={onClosePicker}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                      >
                        Resume View
                      </button>
                    ) : isSessionActive ? (
                      <button
                        type="button"
                        id={`switch-session-${session.id}`}
                        onClick={() => {
                          onStartSession(session.pitcherId);
                          if (onClosePicker) onClosePicker();
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
                      >
                        Switch to Pitcher
                      </button>
                    ) : (
                      <>
                        {onReopenSession && (
                          <button
                            type="button"
                            id={`reopen-session-${session.id}`}
                            onClick={() => {
                              onReopenSession(session.id);
                              if (onClosePicker) onClosePicker();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Reopen ended session"
                          >
                            <RotateCcw className="w-3 h-3 text-slate-500" />
                            <span>Reopen</span>
                          </button>
                        )}

                        {onDeleteSession && (
                          <button
                            type="button"
                            id={`delete-session-${session.id}`}
                            onClick={() => setSessionToDelete(session)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {sessionToDelete && onDeleteSession && (
        <div
          id="confirm-delete-session-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">Delete Pitcher Session?</h3>
                <p className="text-xs text-slate-400">Permanently remove this session and all pitch logs</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action cannot be undone. All pitches recorded during this session will be removed from event stats.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                id="cancel-delete-session-btn"
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-session-btn"
                onClick={() => {
                  onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
