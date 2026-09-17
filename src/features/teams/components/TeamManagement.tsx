import React, { useState, useMemo } from 'react';
import { Team, Player, Coach, PitchRulePresetId } from '../../../types';
import { TeamList } from './TeamList';
import { TeamRoster } from './TeamRoster';
import { CreateTeamModal } from './CreateTeamModal';
import { EditTeamModal } from './EditTeamModal';
import { JoinTeamModal } from './JoinTeamModal';
import { DeleteTeamModal } from './DeleteTeamModal';
import { DeletePlayerModal } from './DeletePlayerModal';
import { PlayerEditModal } from './PlayerEditModal';
import { TeamCoachesModal } from './TeamCoachesModal';
import { TeamPitchPresetModal } from './TeamPitchPresetModal';
import { PitcherProfileModal } from '../../players/components/PitcherProfileModal';
import { calculatePlayerRestEligibility } from '../../../utils/pitchSmart';
import { getEventsForTeam, getAllSessions, getPitchesForPlayer } from '../../../storage';
import { useTeam } from '../hooks/useTeam';
import { useAuth } from '../../auth/hooks/useAuth';

export interface TeamManagementProps {
  currentCoach?: Coach | null;
  teams?: Team[];
  selectedTeam?: Team | null;
  onSelectTeam?: (team: Team) => void;
  onCreateTeam?: (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => void;
  onUpdateTeam?: (teamId: string, name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => void;
  onJoinTeam?: (codeOrLink: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  onDeleteTeam?: (teamId: string) => void;
  onRegenerateInviteLink?: (teamId: string) => void;
  onRemoveCoach?: (teamId: string, coachId: string) => void;
  onLeaveTeam?: (teamId: string) => void;
  onUpdateTeamPitchPreset?: (teamId: string, presetId: PitchRulePresetId) => void;
  teamCoaches?: Coach[];
  players?: Player[];
  onSavePlayer?: (player: {
    id?: string;
    teamId: string;
    name: string;
    jerseyNumber: string;
    imageUrl?: string;
    throws?: 'R' | 'L';
    seasonAge?: number;
  }) => void;
  onDeletePlayer?: (playerId: string) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = (props) => {
  const teamCtx = useTeam();
  const authCtx = useAuth();

  const currentCoach = props.currentCoach ?? authCtx.currentCoach;
  const teams = props.teams ?? teamCtx.teams;
  const selectedTeam = props.selectedTeam !== undefined ? props.selectedTeam : teamCtx.selectedTeam;
  const onSelectTeam = props.onSelectTeam ?? teamCtx.selectTeam;
  const onCreateTeam = props.onCreateTeam ?? teamCtx.createTeam;
  const onUpdateTeam = props.onUpdateTeam ?? teamCtx.updateTeam;
  const onJoinTeam = props.onJoinTeam ?? teamCtx.joinTeam;
  const onDeleteTeam = props.onDeleteTeam ?? teamCtx.deleteTeam;
  const onRegenerateInviteLink = props.onRegenerateInviteLink ?? teamCtx.regenerateInviteLink;
  const onRemoveCoach = props.onRemoveCoach ?? teamCtx.removeCoach;
  const onLeaveTeam = props.onLeaveTeam ?? teamCtx.leaveTeam;
  const onUpdateTeamPitchPreset = props.onUpdateTeamPitchPreset ?? teamCtx.updateTeamPitchPreset;
  const teamCoaches = props.teamCoaches ?? teamCtx.teamCoaches;
  const players = props.players ?? teamCtx.teamPlayers;
  const onSavePlayer = props.onSavePlayer ?? teamCtx.savePlayer;
  const onDeletePlayer = props.onDeletePlayer ?? teamCtx.deletePlayer;

  // Modal visibility states
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
  const [showCoachesModal, setShowCoachesModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  // Player editing state
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Join team feedback state
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [joinFeedback, setJoinFeedback] = useState<{ error?: string; success?: string } | null>(null);

  // Clipboard copy notification
  const [copiedState, setCopiedState] = useState<{ id: string; type: 'code' | 'link' } | null>(null);

  // Pitcher profile / scouting modal
  const [selectedPitcherForProfile, setSelectedPitcherForProfile] = useState<Player | null>(null);

  // Load team events, sessions, and pitches for rest calculations
  const teamEvents = useMemo(() => {
    if (!selectedTeam) return [];
    return getEventsForTeam(selectedTeam.id);
  }, [selectedTeam]);

  const allSessions = useMemo(() => {
    return getAllSessions();
  }, [selectedTeam, players]);

  // Map of playerId -> Rest Status on this team
  const playerRestStatusMap = useMemo(() => {
    if (!selectedTeam) return new Map();
    const map = new Map();
    players.forEach((p) => {
      const pitches = getPitchesForPlayer(p.id);
      const rest = calculatePlayerRestEligibility({
        player: p,
        teamId: selectedTeam.id,
        teamPresetId: selectedTeam.pitchRulePresetId || 'usa_pitch_smart',
        events: teamEvents,
        sessions: allSessions,
        pitches,
      });
      map.set(p.id, rest);
    });
    return map;
  }, [selectedTeam, players, teamEvents, allSessions]);

  const handleJoinTeam = async (code: string) => {
    setIsJoiningTeam(true);
    setJoinFeedback(null);
    try {
      const res = await onJoinTeam(code);
      if (res.success) {
        setJoinFeedback({ success: 'Successfully joined team!' });
        setTimeout(() => {
          setShowJoinTeamModal(false);
          setJoinFeedback(null);
        }, 1000);
      } else {
        setJoinFeedback({ error: res.message || 'Invalid invite code or link.' });
      }
    } catch {
      setJoinFeedback({ error: 'Failed to look up invite code. Please try again.' });
    } finally {
      setIsJoiningTeam(false);
    }
  };

  const copyInviteCode = (code: string, teamId: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedState({ id: teamId, type: 'code' });
      setTimeout(() => setCopiedState(null), 2500);
    });
  };

  const copyShareLink = (team: Team) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?join=${team.inviteCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedState({ id: team.id, type: 'link' });
      setTimeout(() => setCopiedState(null), 2500);
    });
  };

  const handleSavePlayer = (data: {
    name: string;
    jerseyNumber: string;
    throwsHand?: 'R' | 'L';
    seasonAge: number;
    imageUrl?: string;
  }) => {
    if (!selectedTeam) return;
    onSavePlayer({
      id: editingPlayer?.id,
      teamId: selectedTeam.id,
      name: data.name,
      jerseyNumber: data.jerseyNumber,
      imageUrl: data.imageUrl,
      throws: data.throwsHand,
      seasonAge: data.seasonAge,
    });
    setShowPlayerModal(false);
  };

  return (
    <div id="team-management-section" className="space-y-6">
      {/* Selected Team Roster */}
      {selectedTeam && currentCoach && (
        <TeamRoster
          selectedTeam={selectedTeam}
          currentCoach={currentCoach}
          players={players}
          teamCoaches={teamCoaches}
          copiedState={copiedState}
          playerRestStatusMap={playerRestStatusMap}
          onOpenEditTeam={() => setShowEditTeamModal(true)}
          onShowPreset={() => setShowPresetModal(true)}
          onShowCoaches={() => setShowCoachesModal(true)}
          onCopyInviteCode={copyInviteCode}
          onOpenAddPlayer={() => {
            setEditingPlayer(null);
            setShowPlayerModal(true);
          }}
          onSelectPitcherProfile={(p) => setSelectedPitcherForProfile(p)}
          onConfirmDeletePlayer={(p) => setPlayerToDelete(p)}
          onOpenEditPlayer={(p) => {
            setEditingPlayer(p);
            setShowPlayerModal(true);
          }}
          onShowDeleteTeam={() => setShowDeleteTeamModal(true)}
        />
      )}

      {/* Available Teams List */}
      {currentCoach && (
        <TeamList
          teams={teams}
          selectedTeam={selectedTeam}
          currentCoach={currentCoach}
          copiedState={copiedState}
          onSelectTeam={onSelectTeam}
          onOpenCreateTeam={() => setShowCreateTeamModal(true)}
          onOpenJoinTeam={() => setShowJoinTeamModal(true)}
          onCopyInviteCode={copyInviteCode}
        />
      )}

      {/* Modals */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
        onCreateTeam={(teamData) => {
          onCreateTeam(teamData.name, teamData.imageUrl, teamData.pitchRulePresetId);
        }}
      />

      <EditTeamModal
        isOpen={showEditTeamModal}
        selectedTeam={selectedTeam}
        onClose={() => setShowEditTeamModal(false)}
        onSaveTeam={(teamId, data) => {
          onUpdateTeam(teamId, data.name, data.imageUrl, data.pitchRulePresetId);
        }}
      />

      <JoinTeamModal
        isOpen={showJoinTeamModal}
        isJoiningTeam={isJoiningTeam}
        joinFeedback={joinFeedback}
        onClose={() => {
          setShowJoinTeamModal(false);
          setJoinFeedback(null);
        }}
        onJoinTeam={handleJoinTeam}
      />

      {currentCoach && (
        <TeamCoachesModal
          isOpen={showCoachesModal}
          selectedTeam={selectedTeam}
          currentCoach={currentCoach}
          teamCoaches={teamCoaches}
          copiedState={copiedState}
          onClose={() => setShowCoachesModal(false)}
          onCopyInviteCode={copyInviteCode}
          onCopyShareLink={copyShareLink}
          onRegenerateInviteLink={onRegenerateInviteLink}
          onRemoveCoach={onRemoveCoach}
          onLeaveTeam={onLeaveTeam}
        />
      )}

      <TeamPitchPresetModal
        isOpen={showPresetModal}
        selectedTeam={selectedTeam}
        onClose={() => setShowPresetModal(false)}
        onUpdatePreset={(teamId, presetId) => {
          if (onUpdateTeamPitchPreset) {
            onUpdateTeamPitchPreset(teamId, presetId as PitchRulePresetId);
          }
        }}
      />

      <PlayerEditModal
        isOpen={showPlayerModal}
        editingPlayer={editingPlayer}
        onClose={() => setShowPlayerModal(false)}
        onSave={handleSavePlayer}
      />

      <DeleteTeamModal
        isOpen={showDeleteTeamModal}
        selectedTeam={selectedTeam}
        onClose={() => setShowDeleteTeamModal(false)}
        onConfirmDelete={(teamId) => onDeleteTeam(teamId)}
      />

      <DeletePlayerModal
        player={playerToDelete}
        onClose={() => setPlayerToDelete(null)}
        onConfirmDelete={(playerId) => onDeletePlayer(playerId)}
      />

      {/* Pitcher Profile & Season Scouting Modal */}
      {selectedPitcherForProfile && selectedTeam && (
        <PitcherProfileModal
          isOpen={Boolean(selectedPitcherForProfile)}
          player={selectedPitcherForProfile}
          team={selectedTeam}
          onClose={() => setSelectedPitcherForProfile(null)}
        />
      )}
    </div>
  );
};
