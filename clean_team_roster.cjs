const fs = require('fs');
let r = fs.readFileSync('src/features/teams/components/TeamRoster.tsx', 'utf8');

// Fix interface duplicate
r = r.replace('onOpenEditPlayer: (player: Player) => void,\n  onShowDeleteTeam: (player: Player) => void;\n  onShowDeleteTeam: () => void;', 'onOpenEditPlayer: (player: Player) => void;\n  onShowDeleteTeam: () => void;');

// Oh I see what happened. Let me just write the file from scratch carefully.
