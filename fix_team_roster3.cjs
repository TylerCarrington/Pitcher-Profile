const fs = require('fs');
let r = fs.readFileSync('src/features/teams/components/TeamRoster.tsx', 'utf8');

r = r.replace('onOpenEditPlayer,\n  onShowDeleteTeam: (player: Player) => void;\n  onShowDeleteTeam: () => void;', 'onOpenEditPlayer: (player: Player) => void;\n  onShowDeleteTeam: () => void;');

r = r.replace('onOpenEditPlayer,\n  onShowDeleteTeam\n}) => {', 'onOpenEditPlayer,\n  onShowDeleteTeam\n}) => {');

// Fix missing onShowDeleteTeam around line 156
r = r.replace('onClick={() => }', 'onClick={() => onShowDeleteTeam()}');

fs.writeFileSync('src/features/teams/components/TeamRoster.tsx', r);
console.log("Fixed again!");
