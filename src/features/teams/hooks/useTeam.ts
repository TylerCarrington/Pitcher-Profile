import { useContext } from 'react';
import { TeamContext, TeamContextType } from '../context/TeamContext';

export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
