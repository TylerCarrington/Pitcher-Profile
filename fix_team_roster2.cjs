const fs = require('fs');
let r = fs.readFileSync('src/features/teams/components/TeamRoster.tsx', 'utf8');
r = r.replace('onOpenEditPlayer: (player: Player) => void;', 'onOpenEditPlayer: (player: Player) => void;\n  onShowDeleteTeam: () => void;');
r = r.replace('onOpenEditPlayer', 'onOpenEditPlayer,\n  onShowDeleteTeam');
fs.writeFileSync('src/features/teams/components/TeamRoster.tsx', r);

let m = fs.readFileSync('src/features/teams/components/TeamManagement.tsx', 'utf8');
m = m.replace('onOpenEditPlayer={openEditPlayer}', 'onOpenEditPlayer={openEditPlayer}\n          onShowDeleteTeam={() => setShowDeleteTeamModal(true)}');
fs.writeFileSync('src/features/teams/components/TeamManagement.tsx', m);
console.log("Fixed!");
