import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, RefreshCw, CloudOff } from 'lucide-react';
import pitchLogo from '../../assets/pitch.png';
import { TeamSwitcher } from '../../features/teams/components/TeamSwitcher';
import { CoachSwitcher } from '../../features/teams/components/CoachSwitcher';
import { PWAInstallButton } from '../shared/PWAInstallButton';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useTeam } from '../../features/teams/hooks/useTeam';
import { useEvent } from '../../features/events/hooks/useEvent';
import { useSyncListener } from '../../features/sync/hooks/useSyncListener';
import { getCanonicalTeamSlugForTeam } from '../../storage';

interface AppHeaderProps {
  onOpenAdmin?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenAdmin }) => {
  const { currentCoach } = useAuth();
  const { selectedTeam } = useTeam();
  const { selectEvent } = useEvent();
  const { syncStatus, lastSyncTime } = useSyncListener();
  const navigate = useNavigate();

  const handleGoHome = () => {
    selectEvent(null);
    if (selectedTeam) {
      const slug = getCanonicalTeamSlugForTeam(selectedTeam);
      navigate(`/teams/${slug}/roster`);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Identity - Click to return Home */}
        <div
          id="app-header-brand-logo"
          role="button"
          tabIndex={0}
          aria-label="Return to Home"
          title="Return to Team Home"
          onClick={handleGoHome}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleGoHome();
            }
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none hover:opacity-90 active:scale-[0.98] transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-lg pr-2 py-0.5"
        >
          <img
            src={pitchLogo}
            alt="Pitcher Profile"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover shadow-sm border border-emerald-500/30 group-hover:border-emerald-400/70 transition shrink-0"
          />
          <div className="hidden sm:block">
            <h1 className="font-black text-base tracking-tight text-white leading-none group-hover:text-emerald-300 transition">
              Pitcher Profile
            </h1>
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
              Youth Baseball Scouting &amp; Live Tracking
            </p>
          </div>
        </div>

        {/* Right Header Controls: Cloud Status + Team Switcher + Coach Switcher */}
        <div className="flex items-center gap-2">
          {/* Real-time Cloud Sync Indicator */}
          <div
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
              syncStatus === 'synced'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                : syncStatus === 'syncing'
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
            title={
              syncStatus === 'synced'
                ? `Real-time Cloud Sync Active (Last synced: ${lastSyncTime || 'Just now'})`
                : syncStatus === 'syncing'
                ? 'Syncing changes to Firestore...'
                : 'Operating locally (changes will sync when online)'
            }
          >
            {syncStatus === 'synced' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cloud Synced</span>
              </>
            ) : syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Cached</span>
              </>
            )}
          </div>

          {currentCoach && <TeamSwitcher />}
          <PWAInstallButton />
          {currentCoach && <CoachSwitcher onOpenAdmin={onOpenAdmin} />}
        </div>
      </div>
    </header>
  );
};
