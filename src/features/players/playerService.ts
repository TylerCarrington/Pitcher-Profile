import { Player } from '../../types';
import { loadData, saveData } from '../../store/localStore';
import { syncSingleTeamToCloud } from '../sync/syncService';

export function getPlayersForTeam(teamId: string): Player[] {
  const data = loadData();
  return data.players.filter((p) => p.teamId === teamId);
}

export function getPlayerById(playerId: string): Player | undefined {
  return loadData().players.find((p) => p.id === playerId);
}

export function savePlayer(playerInput: {
  id?: string;
  teamId: string;
  name: string;
  jerseyNumber: string;
  seasonAge?: number;
  imageUrl?: string;
  throws?: 'R' | 'L';
  bats?: 'R' | 'L' | 'S';
}): Player {
  const data = loadData();
  const seasonAge = typeof playerInput.seasonAge === 'number' && !isNaN(playerInput.seasonAge)
    ? playerInput.seasonAge
    : 12;

  let savedPlayer: Player;

  if (playerInput.id) {
    const idx = data.players.findIndex((p) => p.id === playerInput.id);
    if (idx !== -1) {
      data.players[idx] = {
        ...data.players[idx],
        name: playerInput.name.trim(),
        jerseyNumber: playerInput.jerseyNumber.trim(),
        seasonAge,
        imageUrl: playerInput.imageUrl?.trim() || undefined,
        throws: playerInput.throws || data.players[idx].throws,
        bats: playerInput.bats || data.players[idx].bats,
      };
      savedPlayer = data.players[idx];
    } else {
      savedPlayer = {
        id: playerInput.id,
        teamId: playerInput.teamId,
        name: playerInput.name.trim(),
        jerseyNumber: playerInput.jerseyNumber.trim(),
        seasonAge,
        imageUrl: playerInput.imageUrl?.trim() || undefined,
        throws: playerInput.throws || 'R',
        bats: playerInput.bats || 'R',
        createdAt: new Date().toISOString(),
      };
      data.players.push(savedPlayer);
    }
  } else {
    savedPlayer = {
      id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: playerInput.teamId,
      name: playerInput.name.trim(),
      jerseyNumber: playerInput.jerseyNumber.trim(),
      seasonAge,
      imageUrl: playerInput.imageUrl?.trim() || undefined,
      throws: playerInput.throws || 'R',
      bats: playerInput.bats || 'R',
      createdAt: new Date().toISOString(),
    };
    data.players.push(savedPlayer);
  }

  saveData(data);

  // Instantly push updated team roster to Firestore so all co-coaches receive it immediately
  const team = data.teams.find((t) => t.id === playerInput.teamId);
  if (team) {
    syncSingleTeamToCloud(team).catch((err) => console.warn('Instant team player sync notice:', err));
  }

  return savedPlayer;
}

export function deletePlayer(playerId: string): void {
  const data = loadData();
  const playerToDelete = data.players.find((p) => p.id === playerId);
  const teamId = playerToDelete?.teamId;

  data.players = data.players.filter((p) => p.id !== playerId);
  saveData(data);

  if (teamId) {
    const team = data.teams.find((t) => t.id === teamId);
    if (team) {
      syncSingleTeamToCloud(team).catch((err) => console.warn('Instant player delete sync notice:', err));
    }
  }
}

// Events