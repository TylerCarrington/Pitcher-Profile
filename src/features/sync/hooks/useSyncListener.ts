import { useAuth } from '../../auth/hooks/useAuth';

export const useSyncListener = () => {
  const { syncStatus, lastSyncTime } = useAuth();
  return {
    syncStatus,
    lastSyncTime,
    isSynced: syncStatus === 'synced',
    isSyncing: syncStatus === 'syncing',
    isOffline: syncStatus === 'offline',
  };
};
