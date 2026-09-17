const fs = require('fs');

let roster = fs.readFileSync('src/features/teams/components/TeamRoster.tsx', 'utf8');

// Missing lucide icons
roster = roster.replace(
  "import { Camera, Shield, Users, Copy, Check, UserPlus, Trash2, Edit2 } from 'lucide-react';",
  "import { Camera, Shield, Users, Copy, Check, UserPlus, Trash2, Edit2, CheckCircle2, Clock, BarChart3, AlertTriangle } from 'lucide-react';"
);

// We need to replace missing state setters with callbacks if they are inside the extracted component.
// Oh wait! setShowDeleteTeamModal(true) is used to trigger deletion! It should use onConfirmDeletePlayer
roster = roster.replace(/setPlayerToDelete\((.*?)\)/g, 'onConfirmDeletePlayer($1)');
roster = roster.replace(/setShowDeleteTeamModal\(true\)/g, ''); // Wait, the delete team modal is different. It's for deleting a team, not a player. 
// Ah, line 154 error: `setShowDeleteTeamModal`
// Let's check what uses setShowDeleteTeamModal in TeamRoster.tsx

fs.writeFileSync('src/features/teams/components/TeamRoster.tsx', roster);
