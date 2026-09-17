import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Team, Player, Coach, BaseballEvent, PitchRulePresetId } from '../../../types';
import {
  getTeamsForCoach,
  getTeamById,
  saveTeam as storageSaveTeam,
  updateTeam as storageUpdateTeam,
  updateTeamPitchPreset as storageUpdateTeamPitchPreset,
  joinTeamByCode,
  deleteTeam as storageDeleteTeam,
  regenerateTeamInviteCode,
  removeCoachFromTeam,
  leaveTeam as storageLeaveTeam,
  getPlayersForTeam,
  savePlayer as storageSavePlayer,
  deletePlayer as storageDeletePlayer,
  getEventsForTeam,
  getAllCoaches,
  subscribeToStore,
} from '../../../storage';
import { useAuth } from '../../auth/hooks/useAuth';

export interface TeamContextType {
  teams: Team[];
  selectedTeam: Team | null;
  selectedTeamId: string | null;
  teamPlayers: Player[];
  teamEvents: BaseballEvent[];
  teamCoaches: Coach[];
  selectTeam: (teamOrId: Team | string | null) => void;
  createTeam: (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => Team | undefined;
  updateTeam: (teamId: string, name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => void;
  joinTeam: (codeOrLink: string) => Promise<{ success: boolean; message?: string; team?: Team }>;
  deleteTeam: (teamId: string) => { success: boolean; error?: string };
  regenerateInviteLink: (teamId: string) => void;
  removeCoach: (teamId: string, coachId: string) => { success: boolean; error?: string };
  leaveTeam: (teamId: string) => { success: boolean; error?: string };
  updateTeamPitchPreset: (teamId: string, presetId: PitchRulePresetId) => void;
  savePlayer: (playerData: {
    id?: string;
    teamId: string;
    name: string;
    jerseyNumber: string;
    imageUrl?: string;
    throws?: 'R' | 'L';
    seasonAge?: number;
  }) => Player;
  deletePlayer: (playerId: string) => void;
  refreshTeamData: () => void;
}

export const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const { currentCoach } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    return localStorage.getItem('pitch_tracker_last_team_id') || null;
  });

  const refreshTeamData = useCallback(() => {
    if (!currentCoach) {
      setTeams([]);
      setSelectedTeamId(null);
      return;
    }

    const coachTeams = getTeamsForCoach(currentCoach.id);
    setTeams(coachTeams);

    // Keep selected team valid and prioritize stored last team id
    if (coachTeams.length > 0) {
      const storedLastTeamId = localStorage.getItem('pitch_tracker_last_team_id');
      const candidateTeam = coachTeams.find((t) => t.id === storedLastTeamId);
      if (candidateTeam) {
        setSelectedTeamId(candidateTeam.id);
      } else if (!selectedTeamId || !coachTeams.some((t) => t.id === selectedTeamId)) {
        setSelectedTeamId(coachTeams[0].id);
        localStorage.setItem('pitch_tracker_last_team_id', coachTeams[0].id);
      }
    } else {
      setSelectedTeamId(null);
    }
  }, [currentCoach, selectedTeamId]);

  useEffect(() => {
    refreshTeamData();
    const unsubscribe = subscribeToStore(refreshTeamData);
    return unsubscribe;
  }, [refreshTeamData]);

  const selectedTeam = useMemo(() => {
    if (!selectedTeamId) return null;
    return getTeamById(selectedTeamId) || null;
  }, [selectedTeamId, teams]);

  const teamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    return getPlayersForTeam(selectedTeam.id);
  }, [selectedTeam]);

  const teamEvents = useMemo(() => {
    if (!selectedTeam) return [];
    return getEventsForTeam(selectedTeam.id);
  }, [selectedTeam]);

  const teamCoaches = useMemo(() => {
    if (!selectedTeam) return [];
    const all = getAllCoaches();
    return all.filter((c) => selectedTeam.memberCoachIds?.includes(c.id));
  }, [selectedTeam]);

  const selectTeam = useCallback((teamOrId: Team | string | null) => {
    if (!teamOrId) {
      setSelectedTeamId(null);
      localStorage.removeItem('pitch_tracker_last_team_id');
      return;
    }
    const id = typeof teamOrId === 'string' ? teamOrId : teamOrId.id;
    setSelectedTeamId(id);
    localStorage.setItem('pitch_tracker_last_team_id', id);
  }, []);

  const createTeam = useCallback(
    (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => {
      if (!currentCoach) return undefined;
      const newTeam = storageSaveTeam({
        name,
        imageUrl,
        createdBy: currentCoach.id,
        pitchRulePresetId: pitchRulePresetId || 'usa_pitch_smart',
      });
      setSelectedTeamId(newTeam.id);
      localStorage.setItem('pitch_tracker_last_team_id', newTeam.id);
      refreshTeamData();
      return newTeam;
    },
    [currentCoach, refreshTeamData],
  );

  const updateTeam = useCallback(
    (teamId: string, name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => {
      storageUpdateTeam(teamId, { name, imageUrl, pitchRulePresetId });
      refreshTeamData();
    },
    [refreshTeamData],
  );

  const updateTeamPitchPreset = useCallback(
    (teamId: string, presetId: PitchRulePresetId) => {
      storageUpdateTeamPitchPreset(teamId, presetId);
      refreshTeamData();
    },
    [refreshTeamData],
  );

  const joinTeam = useCallback(
    async (codeOrLink: string) => {
      if (!currentCoach) return { success: false, message: 'Not signed in' };
      const res = await joinTeamByCode(codeOrLink, currentCoach.id);
      if (res.success && res.team) {
        setSelectedTeamId(res.team.id);
        localStorage.setItem('pitch_tracker_last_team_id', res.team.id);
        refreshTeamData();
      }
      return res;
    },
    [currentCoach, refreshTeamData],
  );

  const deleteTeam = useCallback(
    (teamId: string) => {
      if (!currentCoach) return { success: false, error: 'Not signed in' };
      const res = storageDeleteTeam(teamId, currentCoach.id);
      if (res.success) {
        if (selectedTeamId === teamId) {
          localStorage.removeItem('pitch_tracker_last_team_id');
        }
        refreshTeamData();
      }
      return res;
    },
    [currentCoach, selectedTeamId, refreshTeamData],
  );

  const regenerateInviteLink = useCallback(
    (teamId: string) => {
      regenerateTeamInviteCode(teamId);
      refreshTeamData();
    },
    [refreshTeamData],
  );

  const removeCoach = useCallback(
    (teamId: string, coachId: string) => {
      if (!currentCoach) return { success: false, error: 'Not signed in' };
      const res = removeCoachFromTeam(teamId, coachId, currentCoach.id);
      if (res.success) {
        refreshTeamData();
      }
      return res;
    },
    [currentCoach, refreshTeamData],
  );

  const leaveTeam = useCallback(
    (teamId: string) => {
      if (!currentCoach) return { success: false, error: 'Not signed in' };
      const res = storageLeaveTeam(teamId, currentCoach.id);
      if (res.success) {
        if (selectedTeamId === teamId) {
          localStorage.removeItem('pitch_tracker_last_team_id');
        }
        refreshTeamData();
      }
      return res;
    },
    [currentCoach, selectedTeamId, refreshTeamData],
  );

  const savePlayer = useCallback(
    (playerData: {
      id?: string;
      teamId: string;
      name: string;
      jerseyNumber: string;
      imageUrl?: string;
      throws?: 'R' | 'L';
      seasonAge?: number;
    }) => {
      const saved = storageSavePlayer(playerData);
      refreshTeamData();
      return saved;
    },
    [refreshTeamData],
  );

  const deletePlayer = useCallback(
    (playerId: string) => {
      storageDeletePlayer(playerId);
      refreshTeamData();
    },
    [refreshTeamData],
  );

  return (
    <TeamContext.Provider
      value={{
        teams,
        selectedTeam,
        selectedTeamId,
        teamPlayers,
        teamEvents,
        teamCoaches,
        selectTeam,
        createTeam,
        updateTeam,
        joinTeam,
        deleteTeam,
        regenerateInviteLink,
        removeCoach,
        leaveTeam,
        updateTeamPitchPreset,
        savePlayer,
        deletePlayer,
        refreshTeamData,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};
