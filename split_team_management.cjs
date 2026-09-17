const fs = require('fs');

const code = fs.readFileSync('src/features/teams/components/TeamManagement.tsx', 'utf8');
const lines = code.split('\n');

const getBlock = (start, end) => lines.slice(start - 1, end).join('\n');

const rosterBody = getBlock(259, 527);

// Roster needs props:
// selectedTeam, currentCoach, players, teamCoaches, openEditTeamModal, setShowPresetModal, setShowCoachesModal, copyInviteCode, copiedState, openAddPlayer, playerRestStatusMap, setSelectedPitcherForProfile, confirmDeletePlayer, openEditPlayer

const teamRosterContent = `
import React from 'react';
import { Camera, Shield, Users, Copy, Check, UserPlus, Trash2, Edit2 } from 'lucide-react';
import { Team, Player, Coach } from '../../../types';
import { getPitchRulePreset } from '../../../utils/pitchSmart';

interface TeamRosterProps {
  selectedTeam: Team;
  currentCoach: Coach;
  players: Player[];
  teamCoaches: Coach[];
  copiedState: { id: string; type: 'code' | 'link' } | null;
  playerRestStatusMap: Map<string, any>;
  onOpenEditTeam: () => void;
  onShowPreset: () => void;
  onShowCoaches: () => void;
  onCopyInviteCode: (code: string, teamId: string) => void;
  onOpenAddPlayer: () => void;
  onSelectPitcherProfile: (player: Player) => void;
  onConfirmDeletePlayer: (player: Player) => void;
  onOpenEditPlayer: (player: Player) => void;
}

export const TeamRoster: React.FC<TeamRosterProps> = ({
  selectedTeam,
  currentCoach,
  players,
  teamCoaches,
  copiedState,
  playerRestStatusMap,
  onOpenEditTeam,
  onShowPreset,
  onShowCoaches,
  onCopyInviteCode,
  onOpenAddPlayer,
  onSelectPitcherProfile,
  onConfirmDeletePlayer,
  onOpenEditPlayer
}) => {
  const isSelectedTeamCreator = selectedTeam.createdBy === currentCoach.id;
  const currentPreset = getPitchRulePreset(selectedTeam.pitchRulePresetId);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    ${rosterBody.trim().replace(/^/gm, '    ')}
  );
};
`;

fs.writeFileSync('src/features/teams/components/TeamRoster.tsx', teamRosterContent);

console.log("TeamRoster extracted!");
