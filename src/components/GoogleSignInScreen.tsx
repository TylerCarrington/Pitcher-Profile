import React, { useState } from 'react';
import { Coach } from '../types';
import { Target, ShieldCheck, Activity, Users, ArrowRight } from 'lucide-react';

interface GoogleSignInScreenProps {
  onSignIn: (profile: { name: string; email: string; avatar?: string }) => void;
  availableCoaches?: Coach[];
}

export const GoogleSignInScreen: React.FC<GoogleSignInScreenProps> = ({
  onSignIn,
  availableCoaches = [],
}) => {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  const defaultAccount = {
    name: 'Tyler Carrington',
    email: 'TylerCarringtonWA@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const name = customName.trim() || customEmail.split('@')[0];
    onSignIn({
      name,
      email: customEmail.trim(),
    });
  };

  return (
    <div
      id="google-signin-screen"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8"
    >
      <div className="w-full max-w-md space-y-6">
        {/* App Logo & Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg mb-1">
            <Target className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            PitchScout Live
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Youth Baseball Pitch Tracking, Scouting Reports & Live Strike Zone Analytics
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">Coach Sign-In Required</h2>
            <p className="text-xs text-slate-400">
              Sign in with your Google account to access your teams, pitch logs, and private scouting notes.
            </p>
          </div>

          {/* Primary One-Tap Google Sign-In with Default Account */}
          {!customMode ? (
            <div className="space-y-4">
              <button
                type="button"
                id="google-signin-primary-btn"
                onClick={() => onSignIn(defaultAccount)}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-3 active:scale-[0.99] border border-slate-200 group"
              >
                {/* Official Google G SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12c0 2.06.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-900 leading-tight">
                    Continue as Tyler Carrington
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {defaultAccount.email}
                  </span>
                </div>
              </button>

              {/* Quick switch to another existing coach if present */}
              {availableCoaches.length > 1 && (
                <div className="space-y-2 pt-1 border-t border-slate-700/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block text-center">
                    Or choose another coach profile
                  </span>
                  <div className="space-y-1.5">
                    {availableCoaches
                      .filter((c) => c.email !== defaultAccount.email)
                      .map((coach) => (
                        <button
                          key={coach.id}
                          type="button"
                          id={`signin-coach-${coach.id}`}
                          onClick={() =>
                            onSignIn({
                              name: coach.name,
                              email: coach.email,
                              avatar: coach.avatar,
                            })
                          }
                          className="w-full p-2.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600/70 text-left transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {coach.avatar ? (
                              <img
                                src={coach.avatar}
                                alt={coach.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                                {coach.name[0]}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-bold text-slate-200">{coach.name}</span>
                              <span className="text-[10px] text-slate-400 ml-1.5 truncate">
                                ({coach.email})
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  id="toggle-custom-google-btn"
                  onClick={() => setCustomMode(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                >
                  Use a different Google email address
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Coach Full Name
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Coach Alex Johnson"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Email Account
                </label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  id="submit-custom-google-btn"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
                >
                  Sign In with Google
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Feature Highlights / Value Points */}
        <div className="grid grid-cols-3 gap-2 text-center text-slate-400 text-[11px]">
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col items-center gap-1">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">Fast Location Entry</span>
            <span className="text-[10px] text-slate-500">Touch & loupe grid</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col items-center gap-1">
            <Users className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-300">Team Sharing</span>
            <span className="text-[10px] text-slate-500">Revocable join links</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-300">Private Notes</span>
            <span className="text-[10px] text-slate-500">Coach-isolated logs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
