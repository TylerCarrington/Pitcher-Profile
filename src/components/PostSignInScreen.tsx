import React, { useState } from 'react';
import { Coach, PitchRulePresetId } from '../types';
import pitchLogo from '../assets/pitch.png';
import {
  Plus,
  Link,
  Shield,
  Users,
  ArrowRight,
  Check,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';
import { PITCH_RULE_PRESETS } from '../utils/pitchSmart';

interface PostSignInScreenProps {
  currentCoach: Coach;
  onCreateTeam: (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => void;
  onJoinTeam: (codeOrLink: string) => { success: boolean; message?: string };
  onSignOut: () => void;
}

export const PostSignInScreen: React.FC<PostSignInScreenProps> = ({
  currentCoach,
  onCreateTeam,
  onJoinTeam,
  onSignOut,
}) => {
  const [activeModal, setActiveModal] = useState<'create' | 'join' | null>(null);

  // Create team state
  const [teamName, setTeamName] = useState('');
  const [teamImage, setTeamImage] = useState('');
  const [pitchPreset, setPitchPreset] = useState<PitchRulePresetId>('usa_pitch_smart');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Join team state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const firstName = currentCoach.name ? currentCoach.name.split(' ')[0] : 'Coach';

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreateSubmitting(true);
    onCreateTeam(teamName.trim(), teamImage.trim() || undefined, pitchPreset);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);
    if (!joinCode.trim()) return;

    const res = onJoinTeam(joinCode.trim());
    if (res.success) {
      setJoinSuccess('Successfully joined team! Loading dugout...');
    } else {
      setJoinError(res.message || 'Invalid or expired invite code. Please check with your head coach.');
    }
  };

  return (
    <div
      id="post-signin-screen"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between"
    >
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={pitchLogo}
              alt="Pitch Tracker App Icon"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl object-cover shadow-lg border border-emerald-500/30"
            />
            <div>
              <span className="font-bold text-white text-base tracking-tight leading-none block">
                PitchScout Live
              </span>
              <span className="text-[11px] text-slate-400 font-medium leading-none block mt-0.5">
                Coach Onboarding
              </span>
            </div>
          </div>

          {/* Coach Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs text-slate-300">
              {currentCoach.avatar ? (
                <img
                  src={currentCoach.avatar}
                  alt={currentCoach.name}
                  className="w-5 h-5 rounded-full object-cover border border-slate-600"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-slate-200">{currentCoach.name}</span>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition"
              title="Sign out of Google"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center">
        {/* Step Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 1: Set Up Your Dugout</span>
        </div>

        {/* Headline & Body */}
        <div className="space-y-4 max-w-xl mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Welcome to the dugout, Coach {firstName}.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every pitch log, rest-day alert, and scouting report is organized by team. Choose whether you're creating a new squad or joining an existing coaching staff:
          </p>
        </div>

        {/* Two Competing Actions / Fork */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
          {/* Action 1: Create Team */}
          <div
            id="option-create-team"
            onClick={() => setActiveModal('create')}
            className="group relative p-6 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 shadow-xl transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Head Coach Path
                </span>
                <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Create a New Team
                </h2>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Start your squad from scratch, choose your pitch-limit rules (Pitch Smart, Little League, USSSA), and add your pitchers.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs font-bold text-emerald-400">
              <span>Start New Squad</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Action 2: Join Team */}
          <div
            id="option-join-team"
            onClick={() => setActiveModal('join')}
            className="group relative p-6 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 shadow-xl transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Link className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                  Assistant / Staff Path
                </span>
                <h2 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                  Join with Invite Code
                </h2>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  Have a 6-character team invite code or share link from your head coach? Enter it here to sync with their dugout immediately.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs font-bold text-sky-400">
              <span>Enter Team Code</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="w-full text-center py-6 text-xs text-slate-500 border-t border-slate-800/40">
        PitchScout Live &bull; Real-time pitch tracking, strike zone plots &amp; USA Baseball Pitch Smart safety.
      </footer>

      {/* Modal: Create Team */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Create Your Team</h3>
                  <p className="text-slate-400 text-xs">Set up your roster and pitch count safety rules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westlake Wildcats 11U"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Pitch Limit &amp; Rest Days Rule Preset *
                </label>
                <select
                  value={pitchPreset}
                  onChange={(e) => setPitchPreset(e.target.value as PitchRulePresetId)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                >
                  {PITCH_RULE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.badge})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Enforces automatic daily pitch thresholds and mandatory rest-day countdowns per pitcher age.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Team Logo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={teamImage}
                  onChange={(e) => setTeamImage(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/70">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting || !teamName.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 shadow-md transition"
                >
                  {createSubmitting ? 'Creating...' : 'Create Team & Enter Dugout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Team */}
      {activeModal === 'join' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Join Existing Team</h3>
                  <p className="text-slate-400 text-xs">Enter the invite code from your head coach</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setJoinError(null);
                  setJoinSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Team Invite Code or Link *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HAWKS-2026"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full text-base px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Head coaches can find this code in their team settings or share link.
                </p>
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {joinError}
                </div>
              )}

              {joinSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {joinSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/70">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setJoinError(null);
                    setJoinSuccess(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 shadow-md transition"
                >
                  Join Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
