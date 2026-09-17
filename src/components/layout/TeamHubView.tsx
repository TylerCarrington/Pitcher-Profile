import React, { useState } from 'react';
import { Users, Calendar } from 'lucide-react';
import { TeamSwitcher } from '../../features/teams/components/TeamSwitcher';
import { TeamManagement } from '../../features/teams/components/TeamManagement';
import { EventManagement } from '../../features/events/components/EventManagement';
import { useTeam } from '../../features/teams/hooks/useTeam';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const TeamHubView: React.FC = () => {
  const { currentCoach } = useAuth();
  const { selectedTeam, teamPlayers, teamEvents } = useTeam();
  const [activeTab, setActiveTab] = useState<'events' | 'roster'>('roster');

  if (!selectedTeam) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-md mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">No Team Selected</h3>
          <p className="text-xs text-slate-500">
            Create a squad or join an existing team with an invite code from the team switcher above to manage rosters and track pitches.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          {currentCoach && <TeamSwitcher />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* View Switcher Tabs (Roster vs Events) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          id="tab-roster-btn"
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Roster &amp; Pitch Limits ({teamPlayers.length})</span>
        </button>

        <button
          type="button"
          id="tab-events-btn"
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Events &amp; Games ({teamEvents.length})</span>
        </button>
      </div>

      {/* Tab 1: Roster & Pitch Count Management */}
      {activeTab === 'roster' && <TeamManagement />}

      {/* Tab 2: Events & Games Management */}
      {activeTab === 'events' && <EventManagement />}
    </div>
  );
};
