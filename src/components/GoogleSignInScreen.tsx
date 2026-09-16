import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import pitchLogo from '../assets/pitch.png';
import { AlertCircle, ExternalLink, Copy, Check, UserCheck } from 'lucide-react';

interface GoogleSignInScreenProps {
  onSignIn: (profile: { name: string; email: string; avatar?: string }) => void;
}

export const GoogleSignInScreen: React.FC<GoogleSignInScreenProps> = ({
  onSignIn,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorizedDomain(false);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      onSignIn({
        name: user.displayName || user.email?.split('@')[0] || 'Unknown Coach',
        email: user.email || '',
        avatar: user.photoURL || undefined,
      });
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const isDomainErr =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('auth/unauthorized-domain') ||
        err?.message?.toLowerCase()?.includes('unauthorized domain');

      setIsUnauthorizedDomain(Boolean(isDomainErr));
      setError(err?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleBypassSignIn = () => {
    onSignIn({
      name: 'Coach Tyler',
      email: 'tylercarringtonwa@gmail.com',
    });
  };

  return (
    <div
      id="google-signin-screen"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-6 py-12"
    >
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-8">
        {/* Logo/Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30 bg-slate-800">
          <img
            src={pitchLogo}
            alt="Pitch Tracker Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Copy Section */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Coach smarter pitching.
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-medium">
            Track every pitch's location and outcome live from the mound, keep an eye on pitch counts and rest days automatically, and turn each outing into a scouting report you can use with your pitchers afterward.
          </p>
        </div>

        {/* Unauthorized Domain Guide Box */}
        {isUnauthorizedDomain ? (
          <div className="w-full text-left bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-200">
                  Firebase Domain Authorization Required
                </h3>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  Firebase Authentication requires your custom domain to be in the authorized list before Google popups can proceed.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400 font-medium">Your current domain to add:</div>
              <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                <code className="text-xs font-mono text-emerald-400 truncate">
                  {currentHostname || 'tylercarrington.github.io'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 shrink-0 p-1"
                  title="Copy domain"
                >
                  {copiedDomain ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-slate-200">How to fix in 1 minute:</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                <li>Open the <a href="https://console.firebase.google.com/project/pitcher-profile/authentication/settings" target="_blank" rel="noreferrer" className="text-amber-300 underline font-semibold inline-flex items-center gap-0.5">Firebase Console Settings <ExternalLink className="w-2.5 h-2.5" /></a></li>
                <li>In the <strong>Authorized domains</strong> section, click <strong>Add domain</strong></li>
                <li>Paste <code className="text-amber-200">{currentHostname || 'tylercarrington.github.io'}</code> and click <strong>Save</strong></li>
              </ol>
            </div>

            <div className="pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={handleBypassSignIn}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Continue as Coach for now (Bypass)</span>
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="w-full text-sm font-medium text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20 text-left">
            {error}
          </div>
        ) : null}

        {/* Call to Action */}
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 font-bold text-base shadow-xl shadow-white/5 hover:shadow-2xl hover:shadow-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98] border border-transparent"
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
            <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>

          {!isUnauthorizedDomain && (
            <button
              type="button"
              onClick={handleBypassSignIn}
              className="text-xs text-slate-400 hover:text-slate-300 font-medium underline py-1"
            >
              Or test app as Coach Tyler
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

