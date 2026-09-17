import React from 'react';
import { Users, Plus, Link, Shield } from 'lucide-react';
import { Team, Coach } from '../../../types';

export interface TeamListProps {
  teams: Team[];
  selectedTeam: Team | null;
  currentCoach: Coach;
  onSelectTeam: (team: Team) => void;
  onOpenCreateTeam: () => void;
  onOpenJoinTeam: () => void;
}

export const TeamList: React.FC<TeamListProps> = ({
  teams,
  selectedTeam,
  currentCoach,
  onSelectTeam,
  onOpenCreateTeam,
  onOpenJoinTeam,
}) => {
  return (
    <div id="team-list-container" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900">Your Baseball Teams</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch between youth rosters, review pitch counts, or collaborate with co-coaches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="join-team-btn"
            onClick={onOpenJoinTeam}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Link className="w-3.5 h-3.5 text-slate-500" />
            <span>Join with Code</span>
          </button>
          <button
            type="button"
            id="new-team-btn"
            onClick={onOpenCreateTeam}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Team</span>
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">No Teams Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Create your first baseball team roster or join an existing team with an invite code from your head coach.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onOpenCreateTeam}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              Create Team
            </button>
            <button
              type="button"
              onClick={onOpenJoinTeam}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Join Team
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((team) => {
            const isSelected = selectedTeam?.id === team.id;
            const isCreator = team.createdBy === currentCoach.id;

            return (
              <div
                key={team.id}
                id={`team-card-${team.id}`}
                onClick={() => onSelectTeam(team)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {team.imageUrl ? (
                    <img
                      src={team.imageUrl}
                      alt={team.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {team.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{team.name}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        {isCreator ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" />
                            Head Coach
                          </span>
                        ) : (
                          <span>Assistant Coach</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                    Active
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
