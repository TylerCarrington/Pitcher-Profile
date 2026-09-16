import React, { useState, useMemo } from 'react';
import { Player, Team, Pitch, PitcherSession, BaseballEvent, PitchType } from '../types';
import {
  getPitchesForPlayer,
  getAllSessions,
  getEventsForTeam,
  getAllCoaches,
  savePlayer,
} from '../storage';
import { calculatePitchSmartStatus, calculatePlayerRestEligibility, PITCH_TYPES_CONFIG } from '../utils/pitchSmart';
import { PitchSmartBadge } from './PitchSmartBadge';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import { ImageUploadInput } from './ImageUploadInput';
import {
  X,
  Target,
  ShieldCheck,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Award,
  AlertTriangle,
  FileText,
  Filter,
  CheckCircle2,
  Camera,
  Edit2,
} from 'lucide-react';

interface PitcherProfileModalProps {
  player: Player;
  team: Team;
  onClose: () => void;
  onEditPlayer?: (player: Player) => void;
}

export const PitcherProfileModal: React.FC<PitcherProfileModalProps> = ({
  player: initialPlayer,
  team,
  onClose,
  onEditPlayer,
}) => {
  const [player, setPlayer] = useState<Player>(initialPlayer);
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'sessions'>('overview');
  const [filterEventType, setFilterEventType] = useState<'all' | 'game' | 'bullpen'>('all');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(initialPlayer.imageUrl || '');

  // Load all pitcher data
  const pitches = useMemo(() => getPitchesForPlayer(player.id), [player.id]);
  const sessions = useMemo(
    () => getAllSessions().filter((s) => s.pitcherId === player.id),
    [player.id],
  );
  const teamEvents = useMemo(() => getEventsForTeam(team.id), [team.id]);
  const coaches = useMemo(() => getAllCoaches(), []);

  // Map session to event
  const sessionEventMap = useMemo(() => {
    const map = new Map<string, BaseballEvent>();
    teamEvents.forEach((ev) => {
      map.set(ev.id, ev);
    });
    return map;
  }, [teamEvents]);

  // Filter pitches based on filterEventType
  const filteredPitches = useMemo(() => {
    if (filterEventType === 'all') return pitches;
    return pitches.filter((p) => {
      const ev = sessionEventMap.get(p.eventId);
      return ev?.type === filterEventType;
    });
  }, [pitches, filterEventType, sessionEventMap]);

  // Performance calculations
  const totalPitches = pitches.length;
  const strikesCount = pitches.filter((p) => p.outcome !== 'ball').length;
  const ballsCount = pitches.filter((p) => p.outcome === 'ball').length;
  const strikePercent = totalPitches > 0 ? Math.round((strikesCount / totalPitches) * 100) : 0;
  const ballPercent = totalPitches > 0 ? Math.round((ballsCount / totalPitches) * 100) : 0;

  // First-Pitch Strikes: Pitches with pitchNumber === 1 in an at-bat (ballsBefore === 0 && strikesBefore === 0)
  const firstPitches = pitches.filter((p) => p.ballsBefore === 0 && p.strikesBefore === 0);
  const firstPitchStrikes = firstPitches.filter((p) => p.outcome !== 'ball').length;
  const fpsPercent =
    firstPitches.length > 0 ? Math.round((firstPitchStrikes / firstPitches.length) * 100) : 0;

  // In-play breakdown
  const inPlayPitches = pitches.filter((p) => p.outcome === 'in_play');
  const inPlayOuts = inPlayPitches.filter((p) => p.inPlayDetail === 'out').length;
  const inPlayHits = inPlayPitches.filter((p) => p.inPlayDetail === 'hit').length;

  // Pitch Smart calculations
  const seasonAge = player.seasonAge || 11;
  const pitchSmart = useMemo(
    () =>
      calculatePitchSmartStatus(
        pitches.length,
        seasonAge,
        undefined,
        team.pitchRulePresetId || 'usa_pitch_smart',
      ),
    [pitches.length, seasonAge, team.pitchRulePresetId],
  );

  // Per-Team Rest Day Eligibility
  const restStatus = useMemo(
    () =>
      calculatePlayerRestEligibility({
        player,
        teamId: team.id,
        teamPresetId: team.pitchRulePresetId || 'usa_pitch_smart',
        events: teamEvents,
        sessions,
        pitches,
      }),
    [player, team.id, team.pitchRulePresetId, teamEvents, sessions, pitches],
  );

  // Arsenal breakdown
  const arsenalStats = useMemo(() => {
    const counts: Record<string, { count: number; strikes: number }> = {};
    pitches.forEach((p) => {
      const type = p.pitchType || 'fastball';
      if (!counts[type]) {
        counts[type] = { count: 0, strikes: 0 };
      }
      counts[type].count += 1;
      if (p.outcome !== 'ball') {
        counts[type].strikes += 1;
      }
    });

    return Object.entries(counts).map(([typeKey, data]) => {
      const config = PITCH_TYPES_CONFIG[typeKey as PitchType] || {
        name: typeKey,
        abbr: typeKey.substring(0, 2).toUpperCase(),
        color: '#64748b',
      };
      const usagePercent = totalPitches > 0 ? Math.round((data.count / totalPitches) * 100) : 0;
      const strikeRate = data.count > 0 ? Math.round((data.strikes / data.count) * 100) : 0;
      return {
        type: typeKey as PitchType,
        name: config.name,
        abbr: config.abbr,
        color: config.color,
        count: data.count,
        usagePercent,
        strikeRate,
      };
    }).sort((a, b) => b.count - a.count);
  }, [pitches, totalPitches]);

  return (
    <div
      id="pitcher-profile-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="pitcher-profile-modal-content"
        className="bg-white rounded-2xl max-w-2xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group/avatar shrink-0">
                {player.imageUrl ? (
                  <img
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center font-black text-emerald-400 text-2xl">
                    #{player.jerseyNumber}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 font-black text-xs px-1.5 py-0.5 rounded-full border border-slate-900">
                  #{player.jerseyNumber}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDraft(player.imageUrl || '');
                    setShowPhotoModal(true);
                  }}
                  title="Upload / Change player photo"
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition text-white"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{player.name}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    {player.throws || 'R'}HP
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>{team.name}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-400 font-semibold">{seasonAge}U Season Age</span>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDraft(player.imageUrl || '');
                      setShowPhotoModal(true);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium"
                  >
                    {player.imageUrl ? 'Change Photo' : 'Add Photo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Pitch Smart Badge */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <PitchSmartBadge
                pitchCount={pitchSmart.pitchCount}
                seasonAge={seasonAge}
                showDetails
              />
              <span className="text-[11px] text-slate-400">
                Daily Max: {pitchSmart.dailyMax} pitches
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview &amp; Metrics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'heatmap'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Strike Zone Heatmap</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Sessions Log ({sessions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pitch Smart Safety & Per-Team Rest Card */}
              <div
                className={`p-4 rounded-xl border ${
                  !restStatus.isEligible
                    ? 'bg-amber-50/80 border-amber-300'
                    : pitchSmart.isAtOrOverMax
                    ? 'bg-rose-50 border-rose-300'
                    : pitchSmart.isNearMax
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-emerald-50/60 border-emerald-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {!restStatus.isEligible ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : pitchSmart.isAtOrOverMax ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900">
                          {pitchSmart.preset.name}
                        </h4>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-900 text-emerald-400">
                          {team.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Age Group: <span className="font-bold">{seasonAge}U</span> ({pitchSmart.bracket.ageLabel}) &bull; Daily Max:{' '}
                        <span className="font-bold">{pitchSmart.dailyMax} pitches</span>
                      </p>
                      <div className="mt-2 text-xs flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                            restStatus.isEligible
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {restStatus.statusText}
                        </span>
                        <span className="text-slate-500">{restStatus.eligibleDateText}</span>
                      </div>
                      {restStatus.lastEventDate && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Last appearance on {team.name}: <strong>{restStatus.lastPitchCount} pitches</strong> thrown in{' '}
                          {restStatus.lastEventType === 'game' ? 'a game' : 'bullpen'}.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-slate-900 font-mono">
                      {pitchSmart.pitchCount}{' '}
                      <span className="text-xs text-slate-400 font-normal">/ {pitchSmart.dailyMax}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Career Recorded Pitches</span>
                  </div>
                </div>

                {/* Progress bar towards daily limit */}
                <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      pitchSmart.isAtOrOverMax
                        ? 'bg-rose-600'
                        : pitchSmart.isNearMax
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(pitchSmart.percentOfMax, 100)}%` }}
                  />
                </div>
              </div>

              {/* Core Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Total Pitches
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{totalPitches}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{sessions.length} sessions</div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                    Strike Rate
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-0.5">{strikePercent}%</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">{strikesCount} strikes</div>
                </div>

                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">
                    1st-Pitch Strike %
                  </div>
                  <div className="text-2xl font-black text-blue-600 mt-0.5">{fpsPercent}%</div>
                  <div className="text-[11px] text-blue-700 mt-0.5">{firstPitchStrikes}/{firstPitches.length} 1st pitches</div>
                </div>

                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">
                    Ball Rate
                  </div>
                  <div className="text-2xl font-black text-amber-600 mt-0.5">{ballPercent}%</div>
                  <div className="text-[11px] text-amber-700 mt-0.5">{ballsCount} balls</div>
                </div>
              </div>

              {/* Arsenal Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Pitch Arsenal Distribution</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-medium">{arsenalStats.length} pitch types</span>
                </div>

                {arsenalStats.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No pitch data logged yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {arsenalStats.map((stat) => (
                      <div key={stat.type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: stat.color }}
                            />
                            <span className="font-bold text-slate-800">{stat.name}</span>
                            <span className="text-slate-400">({stat.count} pitches)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-medium">
                              Strike Rate: <strong className="text-slate-800">{stat.strikeRate}%</strong>
                            </span>
                            <span className="font-bold text-slate-900 font-mono w-10 text-right">
                              {stat.usagePercent}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${stat.usagePercent}%`,
                              backgroundColor: stat.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In-Play & Contact Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-sm text-slate-900 mb-3">Batted Ball &amp; Contact Outcomes</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">In-Play Balls</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{inPlayPitches.length}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Outs Generated</div>
                    <div className="text-lg font-black text-emerald-600 mt-0.5">{inPlayOuts}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-amber-700">Hits Allowed</div>
                    <div className="text-lg font-black text-amber-600 mt-0.5">{inPlayHits}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STRIKE ZONE HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Career / Season Heatmap</h4>
                  <p className="text-xs text-slate-500">
                    Filtered across {filteredPitches.length} pitches
                  </p>
                </div>

                {/* Filter by Event Type */}
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilterEventType('all')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterEventType === 'all'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Events
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterEventType('game')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterEventType === 'game'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Games Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterEventType('bullpen')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterEventType === 'bullpen'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Bullpens Only
                  </button>
                </div>
              </div>

              <StrikeZoneHeatmap
                pitches={filteredPitches}
                title={`${player.name} (#${player.jerseyNumber}) Full Season Heatmap`}
              />
            </div>
          )}

          {/* TAB 3: SESSIONS LOG */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-sm text-slate-900">Historical Pitching Sessions</h4>
                <span className="text-xs text-slate-500">{sessions.length} recorded</span>
              </div>

              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No sessions recorded for {player.name} yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const ev = sessionEventMap.get(session.eventId);
                    const sessionPitchesList = pitches.filter((p) => p.sessionId === session.id);
                    const sessionStrikes = sessionPitchesList.filter((p) => p.outcome !== 'ball').length;
                    const sessionStrikeRate =
                      sessionPitchesList.length > 0
                        ? Math.round((sessionStrikes / sessionPitchesList.length) * 100)
                        : 0;

                    const formattedSessionDate = ev
                      ? new Date(ev.scheduledAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Past Session';

                    const coachNotesEntries = session.coachNotes
                      ? Object.entries(session.coachNotes).filter(
                          ([_, note]) => typeof note === 'string' && !!note.trim(),
                        )
                      : [];

                    return (
                      <div
                        key={session.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ev?.type === 'game'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ev?.type === 'game' ? 'Game' : 'Bullpen'}
                            </span>
                            <span className="font-bold text-sm text-slate-900">
                              {ev?.type === 'game'
                                ? ev.opponent
                                  ? `vs ${ev.opponent}`
                                  : 'Game Event'
                                : 'Bullpen Practice'}
                            </span>
                            <span className="text-xs text-slate-400">&bull; {formattedSessionDate}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-slate-900 font-mono">
                              {sessionPitchesList.length} Pitches
                            </span>
                            <span className="text-emerald-600 font-semibold">
                              {sessionStrikeRate}% Strikes
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                session.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {session.status === 'active' ? 'Active' : 'Completed'}
                            </span>
                          </div>
                        </div>

                        {/* Coach Notes if any */}
                        {coachNotesEntries.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-slate-400" /> Coach Session Notes:
                            </div>
                            {coachNotesEntries.map(([coachId, noteVal]) => {
                              const author = coaches.find((c) => c.id === coachId);
                              const rawNote = String(noteVal || '');
                              const isShared = rawNote.startsWith('[SHARED]');
                              const noteText = rawNote.replace(/^\[SHARED\]\s*/, '');

                              return (
                                <div
                                  key={coachId}
                                  className={`text-xs p-2 rounded-lg border text-slate-700 space-y-0.5 ${
                                    isShared
                                      ? 'bg-emerald-50/60 border-emerald-200/80'
                                      : 'bg-amber-50/40 border-amber-200/60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-semibold text-slate-900">
                                      {author?.name || 'Coach'}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                        isShared
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {isShared ? 'Shared' : 'Private'}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 font-normal leading-relaxed">{noteText}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Player ID: <span className="font-mono">{player.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPhotoDraft(player.imageUrl || '');
                setShowPhotoModal(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Update Photo</span>
            </button>
            {onEditPlayer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPlayer(player);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
              >
                Edit Player Info
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Quick Photo Upload Modal */}
      {showPhotoModal && (
        <div
          id="pitcher-photo-modal"
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowPhotoModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Update Photo: {player.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <ImageUploadInput
                label="Player Headshot"
                value={photoDraft}
                onChange={setPhotoDraft}
                shape="circle"
                helperText="Upload or drag-and-drop a photo from your phone or device."
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = savePlayer({
                      id: player.id,
                      teamId: player.teamId,
                      name: player.name,
                      jerseyNumber: player.jerseyNumber,
                      seasonAge: player.seasonAge,
                      imageUrl: photoDraft.trim() || undefined,
                      throws: player.throws,
                      bats: player.bats,
                    });
                    setPlayer(updated);
                    setShowPhotoModal(false);
                  }}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Save Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
