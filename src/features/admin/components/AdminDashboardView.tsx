import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Search,
  Copy,
  Check,
  Calendar,
  GitCommit,
  Clock,
  ArrowLeft,
  Database,
  Layers,
  UserCheck,
  RefreshCw,
  Award,
  Hash,
  Activity,
  Code2,
  Trash2,
  AlertTriangle,
  UserPlus,
  UserMinus,
  X,
  Plus,
} from 'lucide-react';
import { collection, getDocs, deleteDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { loadData, subscribeToStore } from '../../../store/localStore';
import { Coach, Team } from '../../../types';
import { useAuth } from '../../auth/hooks/useAuth';
import { deleteTeam, addCoachToTeam, removeCoachFromTeam } from '../../teams/teamService';

interface AdminDashboardViewProps {
  onClose: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onClose }) => {
  const { currentCoach } = useAuth();
  const [storeData, setStoreData] = useState(() => loadData());
  const [cloudCoaches, setCloudCoaches] = useState<Coach[]>([]);
  const [cloudTeams, setCloudTeams] = useState<Team[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [coachSearch, setCoachSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'teams' | 'coaches' | 'system'>('teams');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [adminNotification, setAdminNotification] = useState<string | null>(null);
  const [teamForAddCoach, setTeamForAddCoach] = useState<Team | null>(null);
  const [coachForAssignTeam, setCoachForAssignTeam] = useState<Coach | null>(null);
  const [selectedCoachIdToAdd, setSelectedCoachIdToAdd] = useState('');
  const [customCoachEmail, setCustomCoachEmail] = useState('');
  const [selectedTeamIdToAssign, setSelectedTeamIdToAssign] = useState('');
  const [isSubmittingCoachAction, setIsSubmittingCoachAction] = useState(false);

  const fetchCloudAdminData = useCallback(async () => {
    setIsLoadingCloud(true);
    try {
      const local = loadData();
      const coachMap = new Map<string, Coach>();

      // Seed with local store coaches
      local.coaches.forEach((c) => {
        if (c) {
          const rawKey = c.email || c.id;
          if (rawKey && typeof rawKey === 'string') {
            const key = rawKey.toLowerCase();
            coachMap.set(key, c);
          }
        }
      });

      // 1. Fetch all teams from Cloud Firestore
      const fetchedTeams: Team[] = [];
      try {
        const teamsSnap = await getDocs(collection(db, 'teams'));
        teamsSnap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (
            data &&
            data.id &&
            !data.isDeleted &&
            !data.deletedAt &&
            (!local.deletedTeamIds || !local.deletedTeamIds[data.id])
          ) {
            fetchedTeams.push({
              id: data.id,
              name: data.name || 'Unnamed Team',
              imageUrl: data.imageUrl || undefined,
              createdBy: data.createdBy || 'coach_creator',
              createdAt: data.createdAt || new Date().toISOString(),
              memberCoachIds: Array.isArray(data.memberCoachIds) ? data.memberCoachIds : [],
              inviteCode: data.inviteCode || undefined,
              inviteCodeCreatedAt: data.inviteCodeCreatedAt || undefined,
              pitchRulePresetId: data.pitchRulePresetId || 'usa_pitch_smart',
            });

            // Extract creator coach profile metadata if present
            if (data.creatorEmail) {
              const cleanEmail = data.creatorEmail.trim().toLowerCase();
              if (!coachMap.has(cleanEmail)) {
                coachMap.set(cleanEmail, {
                  id: data.createdBy || `coach_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
                  name: data.creatorName || cleanEmail.split('@')[0],
                  email: data.creatorEmail,
                  role: 'head_coach',
                });
              }
            }

            // Extract any member coach IDs and generate entries if email format
            if (Array.isArray(data.memberCoachIds)) {
              data.memberCoachIds.forEach((mcId: string) => {
                if (typeof mcId === 'string' && mcId.includes('@')) {
                  const cleanEmail = mcId.trim().toLowerCase();
                  if (!coachMap.has(cleanEmail)) {
                    coachMap.set(cleanEmail, {
                      id: `coach_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
                      name: cleanEmail.split('@')[0],
                      email: cleanEmail,
                      role: 'assistant_coach',
                    });
                  }
                }
              });
            }
          }
        });
      } catch (tErr) {
        console.warn('Notice fetching cloud teams in Admin mode:', tErr);
      }

      // 2. Fetch root coaches collection from Cloud Firestore
      try {
        const coachesSnap = await getDocs(collection(db, 'coaches'));
        coachesSnap.forEach((docSnap) => {
          const cData = docSnap.data() as any;
          if (cData) {
            const email = cData.email || (docSnap.id.includes('_') ? docSnap.id : null);
            if (email) {
              const cleanEmail = email.trim().toLowerCase();
              const existing = coachMap.get(cleanEmail);
              coachMap.set(cleanEmail, {
                id: cData.id || existing?.id || docSnap.id,
                name: cData.name || existing?.name || cleanEmail.split('@')[0],
                email: cData.email || email,
                role: cData.role || existing?.role || 'head_coach',
                avatar: cData.avatar || existing?.avatar,
              });
            }
          }
        });
      } catch (cErr) {
        console.warn('Notice fetching cloud coaches collection in Admin mode:', cErr);
      }

      setCloudTeams(fetchedTeams);
      setCloudCoaches(Array.from(coachMap.values()));
    } catch (err) {
      console.warn('Admin cloud data fetch error:', err);
    } finally {
      setIsLoadingCloud(false);
    }
  }, []);

  useEffect(() => {
    fetchCloudAdminData();
    const unsubscribe = subscribeToStore(() => {
      setStoreData(loadData());
    });
    return () => unsubscribe();
  }, [fetchCloudAdminData]);

  // Merge local and cloud data sources
  const teamsList = cloudTeams.length > 0 ? cloudTeams : storeData.teams;
  const coachesList = cloudCoaches.length > 0 ? cloudCoaches : storeData.coaches;

  // System & Build metadata
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
  const rawBuildDate = import.meta.env.VITE_BUILD_DATE || new Date().toISOString();
  const commitSha = import.meta.env.VITE_COMMIT_SHA || 'dev-local';

  const formattedBuildDate = (() => {
    try {
      const d = new Date(rawBuildDate);
      return isNaN(d.getTime()) ? rawBuildDate : d.toLocaleString();
    } catch {
      return rawBuildDate;
    }
  })();

  const shortCommitSha =
    commitSha.length > 7 && commitSha !== 'dev-local' ? commitSha.substring(0, 7) : commitSha;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleExecuteDeleteTeam = async () => {
    if (!teamToDelete) return;
    setIsDeletingTeam(true);
    const targetTeam = teamToDelete;
    try {
      const now = new Date().toISOString();

      // 1. Write tombstone to Firestore so all devices receive the deletion
      await setDoc(doc(db, 'teams', targetTeam.id), {
        id: targetTeam.id,
        name: targetTeam.name,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
        lastUpdated: now,
      });

      // 2. Delete invite code document if present
      if (targetTeam.inviteCode) {
        const cleanCode = targetTeam.inviteCode.trim().toUpperCase();
        try {
          await deleteDoc(doc(db, 'invite_codes', cleanCode));
          await deleteDoc(doc(db, 'invite_codes', cleanCode.replace(/-/g, '')));
        } catch {
          // Ignore if missing
        }
      }

      // 3. Clean up from localStore (which records deletedTeamIds)
      deleteTeam(targetTeam.id, currentCoach?.id || 'admin');
      setStoreData(loadData());

      // 4. Refresh cloud state
      await fetchCloudAdminData();

      setAdminNotification(`Successfully deleted squad "${targetTeam.name}".`);
      setTimeout(() => setAdminNotification(null), 4000);
    } catch (err) {
      console.error('Error deleting team:', err);
      deleteTeam(targetTeam.id, currentCoach?.id || 'admin');
      setStoreData(loadData());
      await fetchCloudAdminData();
      setAdminNotification(`Deleted squad "${targetTeam.name}".`);
      setTimeout(() => setAdminNotification(null), 4000);
    } finally {
      setIsDeletingTeam(false);
      setTeamToDelete(null);
    }
  };

  const handleAdminAddCoachToTeam = async (targetTeamId: string, coachIdOrEmail: string) => {
    const cleanTarget = coachIdOrEmail.trim();
    if (!targetTeamId || !cleanTarget) return;
    setIsSubmittingCoachAction(true);
    try {
      const res = addCoachToTeam(targetTeamId, cleanTarget, currentCoach?.id || 'admin');
      if (!res.success) {
        setAdminNotification(`Error: ${res.error || 'Failed to add coach'}`);
        setTimeout(() => setAdminNotification(null), 4000);
        return;
      }

      const local = loadData();
      const updatedTeam = local.teams.find((t) => t.id === targetTeamId);
      if (updatedTeam) {
        const now = new Date().toISOString();
        await setDoc(
          doc(db, 'teams', targetTeamId),
          {
            memberCoachIds: updatedTeam.memberCoachIds,
            updatedAt: now,
            lastUpdated: now,
          },
          { merge: true },
        );
      }

      setStoreData(local);
      await fetchCloudAdminData();
      setAdminNotification(`Successfully added coach to squad.`);
      setTimeout(() => setAdminNotification(null), 4000);
      setTeamForAddCoach(null);
      setCoachForAssignTeam(null);
      setSelectedCoachIdToAdd('');
      setCustomCoachEmail('');
      setSelectedTeamIdToAssign('');
    } catch (err) {
      console.error('Error adding coach to team:', err);
      setAdminNotification('Error adding coach to team.');
      setTimeout(() => setAdminNotification(null), 4000);
    } finally {
      setIsSubmittingCoachAction(false);
    }
  };

  const handleAdminRemoveCoachFromTeam = async (targetTeamId: string, coachIdToRemove: string) => {
    if (!targetTeamId || !coachIdToRemove) return;
    setIsSubmittingCoachAction(true);
    try {
      const res = removeCoachFromTeam(targetTeamId, coachIdToRemove, currentCoach?.id || 'admin');
      if (!res.success) {
        setAdminNotification(`Error: ${res.error || 'Failed to remove coach'}`);
        setTimeout(() => setAdminNotification(null), 4000);
        return;
      }

      const local = loadData();
      const updatedTeam = local.teams.find((t) => t.id === targetTeamId);
      if (updatedTeam) {
        const now = new Date().toISOString();
        await setDoc(
          doc(db, 'teams', targetTeamId),
          {
            memberCoachIds: updatedTeam.memberCoachIds,
            updatedAt: now,
            lastUpdated: now,
          },
          { merge: true },
        );
      }

      setStoreData(local);
      await fetchCloudAdminData();
      setAdminNotification(`Successfully removed coach from squad.`);
      setTimeout(() => setAdminNotification(null), 4000);
    } catch (err) {
      console.error('Error removing coach from team:', err);
      setAdminNotification('Error removing coach from team.');
      setTimeout(() => setAdminNotification(null), 4000);
    } finally {
      setIsSubmittingCoachAction(false);
    }
  };

  const safeTeamSearch = (teamSearch || '').toLowerCase();
  const filteredTeams = teamsList.filter(
    (t) =>
      (t?.name || '').toLowerCase().includes(safeTeamSearch) ||
      (t?.inviteCode || '').toLowerCase().includes(safeTeamSearch) ||
      (t?.id || '').toLowerCase().includes(safeTeamSearch),
  );

  const safeCoachSearch = (coachSearch || '').toLowerCase();
  const filteredCoaches = coachesList.filter(
    (c) =>
      (c?.name || '').toLowerCase().includes(safeCoachSearch) ||
      (c?.email || '').toLowerCase().includes(safeCoachSearch) ||
      (c?.id || '').toLowerCase().includes(safeCoachSearch),
  );

  return (
    <div
      id="admin-dashboard-view"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans animate-in fade-in"
    >
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="admin-exit-btn"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Return to Application"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Back to App</span>
            </button>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black text-white tracking-tight leading-none">
                    System Admin Panel
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                    Admin Mode
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Authenticated as <strong className="text-slate-200">{currentCoach?.email}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="admin-refresh-data-btn"
              onClick={() => {
                setStoreData(loadData());
                fetchCloudAdminData();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoadingCloud ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">{isLoadingCloud ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        {/* Admin Notification Toast */}
        {adminNotification && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{adminNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminNotification(null)}
              className="text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        )}
        {/* System Build Metadata & High-Level Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Site Version & Build Info Card */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Code2 className="w-4 h-4" />
                <span>Build & Version Info</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                v{appVersion}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  Build Date &amp; Time
                </div>
                <p className="font-mono text-slate-200 font-semibold truncate text-[11px]">
                  {formattedBuildDate}
                </p>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <GitCommit className="w-3 h-3 text-indigo-400" />
                  Commit Hash
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-indigo-300 font-bold text-xs truncate">
                    {shortCommitSha}
                  </span>
                  {commitSha !== 'dev-local' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(commitSha, 'commit')}
                      className="text-[10px] text-slate-400 hover:text-white transition flex items-center gap-1"
                      title="Copy full commit SHA"
                    >
                      {copiedCode === 'commit' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Environment: <strong className="text-slate-200">{import.meta.env.MODE}</strong>
              </span>
              <span className="text-emerald-400 font-semibold">Ready &amp; Operational</span>
            </div>
          </div>

          {/* Teams Counter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Teams
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-white tracking-tight">
                {teamsList.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Active squads across the platform</p>
            </div>
          </div>

          {/* Coaches Counter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Coaches
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-white tracking-tight">
                {coachesList.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Registered staff &amp; head coaches</p>
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            id="admin-tab-teams"
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Teams ({teamsList.length})</span>
          </button>

          <button
            type="button"
            id="admin-tab-coaches"
            onClick={() => setActiveTab('coaches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'coaches'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Coaches ({coachesList.length})</span>
          </button>

          <button
            type="button"
            id="admin-tab-system"
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'system'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Stats</span>
          </button>
        </div>

        {/* TAB 1: ALL TEAMS */}
        {activeTab === 'teams' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Search Filter Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search team name, ID, or invite code..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-medium self-end sm:self-auto">
                Showing {filteredTeams.length} of {teamsList.length} teams
              </span>
            </div>

            {/* Teams Grid */}
            {filteredTeams.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400">
                <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No teams found matching search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTeams.map((team) => {
                  const creatorCoach = coachesList.find(
                    (c) =>
                      (c.id && c.id === team.createdBy) ||
                      (c.email && team.creatorEmail && typeof c.email === 'string' && typeof team.creatorEmail === 'string' && c.email.toLowerCase() === team.creatorEmail.toLowerCase()),
                  );
                  const memberCoaches = coachesList.filter(
                    (c) =>
                      (c.id && team.memberCoachIds?.includes(c.id)) ||
                      (c.email && typeof c.email === 'string' && team.memberCoachIds?.some((id) => typeof id === 'string' && id.toLowerCase().includes(c.email.toLowerCase()))),
                  );
                  const teamPlayers = storeData.players.filter((p) => p.teamId === team.id);
                  const teamEvents = storeData.events.filter((e) => e.teamId === team.id);

                  return (
                    <div
                      key={team.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-md hover:border-slate-700 transition"
                    >
                      {/* Team Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden font-black text-emerald-400 text-base">
                            {team.imageUrl ? (
                              <img
                                src={team.imageUrl}
                                alt={team.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              team.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base leading-snug">
                              {team.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span className="font-mono text-slate-500">ID: {team.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Preset Badge & Delete Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            {team.pitchRulePresetId === 'high_school'
                              ? 'NFHS High School'
                              : team.pitchRulePresetId === 'little_league'
                              ? 'Little League'
                              : 'USA Pitch Smart'}
                          </span>
                          <button
                            type="button"
                            id={`admin-delete-team-${team.id}`}
                            onClick={() => setTeamToDelete(team)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer flex items-center justify-center"
                            title={`Delete ${team.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Invite Code Bar */}
                      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-400 text-[11px]">Invite Code:</span>
                          <strong className="font-mono text-white tracking-wide">
                            {team.inviteCode || 'N/A'}
                          </strong>
                        </div>
                        {team.inviteCode && (
                          <button
                            type="button"
                            onClick={() => handleCopy(team.inviteCode!, `code-${team.id}`)}
                            className="px-2 py-1 text-[10px] font-bold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            {copiedCode === `code-${team.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Team Details Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Roster</div>
                          <div className="text-sm font-black text-white mt-0.5">
                            {teamPlayers.length}
                          </div>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Coaches</div>
                          <div className="text-sm font-black text-emerald-400 mt-0.5">
                            {memberCoaches.length}
                          </div>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Events</div>
                          <div className="text-sm font-black text-indigo-400 mt-0.5">
                            {teamEvents.length}
                          </div>
                        </div>
                      </div>

                      {/* Coaches List */}
                      <div className="text-xs space-y-1.5 pt-2 border-t border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            Associated Coaches ({memberCoaches.length}):
                          </div>
                          <button
                            type="button"
                            id={`admin-add-coach-btn-${team.id}`}
                            onClick={() => {
                              setTeamForAddCoach(team);
                              setSelectedCoachIdToAdd('');
                              setCustomCoachEmail('');
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                            title="Add Coach to Team"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>+ Add Coach</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {memberCoaches.length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">
                              Creator: {creatorCoach?.name || team.createdBy} (no additional coaches)
                            </span>
                          ) : (
                            memberCoaches.map((mc) => (
                              <span
                                key={mc.id}
                                className="px-2 py-1 text-[11px] rounded-lg bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center gap-1.5"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <strong>{mc.name}</strong>
                                <span className="text-[9px] text-slate-400 font-mono">({mc.email})</span>
                                <button
                                  type="button"
                                  id={`admin-remove-coach-${team.id}-${mc.id}`}
                                  onClick={() => handleAdminRemoveCoachFromTeam(team.id, mc.id)}
                                  disabled={isSubmittingCoachAction}
                                  className="p-0.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer ml-1"
                                  title={`Remove ${mc.name} from ${team.name}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALL COACHES */}
        {activeTab === 'coaches' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Search Filter Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search coach name, email, or ID..."
                  value={coachSearch}
                  onChange={(e) => setCoachSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-medium self-end sm:self-auto">
                Showing {filteredCoaches.length} of {coachesList.length} coaches
              </span>
            </div>

            {/* Coaches List */}
            {filteredCoaches.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No coaches found matching search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCoaches.map((coach) => {
                  const ownedTeams = teamsList.filter(
                    (t) =>
                      (coach.id && t.createdBy === coach.id) ||
                      (coach.id && t.memberCoachIds?.includes(coach.id)) ||
                      (coach.email && typeof coach.email === 'string' && t.creatorEmail && typeof t.creatorEmail === 'string' && t.creatorEmail.toLowerCase() === coach.email.toLowerCase()) ||
                      (coach.email && typeof coach.email === 'string' && t.memberCoachIds?.some((id) => typeof id === 'string' && id.toLowerCase().includes(coach.email.toLowerCase()))),
                  );

                  return (
                    <div
                      key={coach.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-400/40">
                            {coach.name?.charAt(0) || coach.email?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm">{coach.name}</h3>
                            <p className="text-xs text-emerald-400 font-mono">{coach.email}</p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {coach.role === 'head_coach' ? 'Head Coach' : 'Assistant'}
                        </span>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Coach ID:</span>
                          <span className="font-mono text-slate-300">{coach.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Joined Teams:</span>
                          <span className="font-bold text-emerald-400">{ownedTeams.length}</span>
                        </div>
                      </div>

                      {/* Associated Teams Badges */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            Squads Managed ({ownedTeams.length}):
                          </div>
                          <button
                            type="button"
                            id={`admin-assign-squad-btn-${coach.id}`}
                            onClick={() => {
                              setCoachForAssignTeam(coach);
                              setSelectedTeamIdToAssign('');
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                            title="Assign Coach to Squad"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>+ Assign to Squad</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ownedTeams.length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">Not assigned to any team</span>
                          ) : (
                            ownedTeams.map((t) => (
                              <span
                                key={t.id}
                                className="px-2 py-1 text-[11px] rounded-md bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                              >
                                <span>{t.name}</span>
                                <button
                                  type="button"
                                  id={`admin-unassign-squad-${coach.id}-${t.id}`}
                                  onClick={() => handleAdminRemoveCoachFromTeam(t.id, coach.id)}
                                  disabled={isSubmittingCoachAction}
                                  className="p-0.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer ml-1"
                                  title={`Remove ${coach.name} from ${t.name}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DATABASE & SYSTEM STATS */}
        {activeTab === 'system' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">System Data Footprint</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Teams</div>
                  <div className="text-xl font-black text-white mt-1">
                    {storeData.teams.length}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Coaches</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {storeData.coaches.length}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Players</div>
                  <div className="text-xl font-black text-blue-400 mt-1">
                    {storeData.players.length}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Events</div>
                  <div className="text-xl font-black text-indigo-400 mt-1">
                    {storeData.events.length}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Sessions</div>
                  <div className="text-xl font-black text-purple-400 mt-1">
                    {storeData.sessions.length}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Pitches Logged</div>
                  <div className="text-xl font-black text-amber-400 mt-1">
                    {storeData.pitches.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Team Confirmation Modal */}
      {teamToDelete && (
        <div
          id="admin-delete-team-modal"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white leading-snug">
                Delete Squad "{teamToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                This action will permanently remove <strong className="text-white">{teamToDelete.name}</strong> (ID: {teamToDelete.id}), its active invite codes, and associated player roster references from both Cloud Firestore and local storage.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Team Name:</span>
                <strong className="text-slate-200">{teamToDelete.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Invite Code:</span>
                <strong className="font-mono text-emerald-400">{teamToDelete.inviteCode || 'None'}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                id="admin-cancel-delete-team-btn"
                disabled={isDeletingTeam}
                onClick={() => setTeamToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="admin-confirm-delete-team-btn"
                disabled={isDeletingTeam}
                onClick={handleExecuteDeleteTeam}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingTeam ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Squad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Coach to Team Modal */}
      {teamForAddCoach && (
        <div
          id="admin-add-coach-modal"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Coach to Team</h3>
                  <p className="text-[11px] text-slate-400">{teamForAddCoach.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTeamForAddCoach(null);
                  setSelectedCoachIdToAdd('');
                  setCustomCoachEmail('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Select Existing Registered Coach
                </label>
                <select
                  value={selectedCoachIdToAdd}
                  onChange={(e) => {
                    setSelectedCoachIdToAdd(e.target.value);
                    if (e.target.value) setCustomCoachEmail('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">-- Choose Coach from Registry --</option>
                  {coachesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">OR Enter Email</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Coach Email Address
                </label>
                <input
                  type="email"
                  placeholder="coach@example.com"
                  value={customCoachEmail}
                  onChange={(e) => {
                    setCustomCoachEmail(e.target.value);
                    if (e.target.value) setSelectedCoachIdToAdd('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingCoachAction}
                onClick={() => {
                  setTeamForAddCoach(null);
                  setSelectedCoachIdToAdd('');
                  setCustomCoachEmail('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCoachAction || (!selectedCoachIdToAdd && !customCoachEmail.trim())}
                onClick={() => {
                  const targetCoach = selectedCoachIdToAdd || customCoachEmail.trim();
                  if (targetCoach && teamForAddCoach) {
                    handleAdminAddCoachToTeam(teamForAddCoach.id, targetCoach);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                {isSubmittingCoachAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Coach</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Coach to Squad Modal */}
      {coachForAssignTeam && (
        <div
          id="admin-assign-squad-modal"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assign Squad to Coach</h3>
                  <p className="text-[11px] text-slate-400">{coachForAssignTeam.name} ({coachForAssignTeam.email})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCoachForAssignTeam(null);
                  setSelectedTeamIdToAssign('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Select Squad
                </label>
                <select
                  value={selectedTeamIdToAssign}
                  onChange={(e) => setSelectedTeamIdToAssign(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">-- Choose Squad --</option>
                  {teamsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Code: {t.inviteCode || t.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingCoachAction}
                onClick={() => {
                  setCoachForAssignTeam(null);
                  setSelectedTeamIdToAssign('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCoachAction || !selectedTeamIdToAssign}
                onClick={() => {
                  if (selectedTeamIdToAssign && coachForAssignTeam) {
                    handleAdminAddCoachToTeam(selectedTeamIdToAssign, coachForAssignTeam.id);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-950/40"
              >
                {isSubmittingCoachAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign Squad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
