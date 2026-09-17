import { useState, useEffect } from 'react';
import { Coach, Team } from '../../../types';
import { joinTeamByCode } from '../../../storage';

interface UseUrlJoinOptions {
  currentCoach: Coach | null;
  onTeamJoined?: (team: Team) => void;
}

export const useUrlJoin = ({ currentCoach, onTeamJoined }: UseUrlJoinOptions) => {
  const [joinNotification, setJoinNotification] = useState<string | null>(null);

  useEffect(() => {
    const handleUrlJoin = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlJoinCode = params.get('join');
      if (urlJoinCode) {
        sessionStorage.setItem('pending_join_code', urlJoinCode);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      const pendingCode = sessionStorage.getItem('pending_join_code') || urlJoinCode;
      if (pendingCode && currentCoach) {
        const res = await joinTeamByCode(pendingCode, currentCoach.id);
        if (res.success && res.team) {
          sessionStorage.removeItem('pending_join_code');
          setJoinNotification(`You joined ${res.team.name}!`);
          if (onTeamJoined) {
            onTeamJoined(res.team);
          }
          setTimeout(() => setJoinNotification(null), 4500);
        } else if (res.message) {
          sessionStorage.removeItem('pending_join_code');
        }
      }
    };

    handleUrlJoin();
  }, [currentCoach, onTeamJoined]);

  return {
    joinNotification,
    setJoinNotification,
  };
};
