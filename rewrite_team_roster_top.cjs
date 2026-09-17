const fs = require('fs');
let r = fs.readFileSync('src/features/teams/components/TeamRoster.tsx', 'utf8');

const interfaceRegex = /interface TeamRosterProps \{[\s\S]*?\}\s*export const TeamRoster: React\.FC<TeamRosterProps> = \(\{[\s\S]*?\}\) => \{/;

const newTop = `interface TeamRosterProps {
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
  onShowDeleteTeam: () => void;
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
  onOpenEditPlayer,
  onShowDeleteTeam
}) => {`;

r = r.replace(interfaceRegex, newTop);

// Fix comma operator
r = r.replace(/onClick=\{\(\) => onOpenEditPlayer,\n  onShowDeleteTeam\(p\)\}/g, 'onClick={() => onOpenEditPlayer(p)}');

fs.writeFileSync('src/features/teams/components/TeamRoster.tsx', r);
console.log("Rewritten!");
