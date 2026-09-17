import React from 'react';
import { Pitch, Player, PitcherSession, BaseballEvent, Coach } from '../../../types';
import { getCurrentCoach } from '../../../storage';
import { FileText } from 'lucide-react';
import { filterVisibleCoachNotes } from '../utils/playerStatsUtils';

export interface PlayerHistoryTabProps {
  player: Player;
  sessions: PitcherSession[];
  pitches: Pitch[];
  sessionEventMap: Map<string, BaseballEvent>;
  coaches: Coach[];
}

export const PlayerHistoryTab: React.FC<PlayerHistoryTabProps> = ({
  player,
  sessions,
  pitches,
  sessionEventMap,
  coaches,
}) => {
  const currentCoach = getCurrentCoach();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h4 className="font-bold text-sm text-slate-900">Historical Pitching Sessions</h4>
        <span className="text-xs text-slate-500">{sessions.length} recorded</span>
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">
          No sessions recorded for {player.name} yet.
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const ev = sessionEventMap.get(session.eventId);
            const sessionPitchesList = pitches.filter((p) => p.sessionId === session.id);
            const sessionStrikes = sessionPitchesList.filter((p) => p.outcome !== 'ball').length;
            const sessionStrikeRate =
              sessionPitchesList.length > 0
                ? Math.round((sessionStrikes / sessionPitchesList.length) * 100)
                : 0;

            const formattedSessionDate = ev
              ? new Date(ev.scheduledAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Past Session';

            const visibleNotes = filterVisibleCoachNotes(
              session?.coachNotes,
              currentCoach?.id,
              coaches,
            );

            return (
              <div
                key={session.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ev?.type === 'game'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ev?.type === 'game' ? 'Game' : 'Bullpen'}
                    </span>
                    <span className="font-bold text-sm text-slate-900">
                      {ev?.type === 'game'
                        ? ev.opponent
                          ? `vs ${ev.opponent}`
                          : 'Game Event'
                        : 'Bullpen Practice'}
                    </span>
                    <span className="text-xs text-slate-400">&bull; {formattedSessionDate}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-slate-900 font-mono">
                      {sessionPitchesList.length} Pitches
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      {sessionStrikeRate}% Strikes
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        session.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {session.status === 'active' ? 'Active' : 'Completed'}
                    </span>
                  </div>
                </div>

                {/* Coach Notes if any */}
                {visibleNotes.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" /> Coach Session Notes:
                    </div>
                    {visibleNotes.map((note) => (
                      <div
                        key={note.coachId}
                        className={`text-xs p-2 rounded-lg border text-slate-700 space-y-0.5 ${
                          note.isShared
                            ? 'bg-emerald-50/60 border-emerald-200/80'
                            : 'bg-amber-50/40 border-amber-200/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-slate-900">
                            {note.authorName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              note.isShared
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {note.isShared ? 'Shared' : 'Private'}
                          </span>
                        </div>
                        <p className="text-slate-700 font-normal leading-relaxed">{note.noteText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
