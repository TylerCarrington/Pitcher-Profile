import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import pitchLogo from '../assets/pitch.png';
import firebaseConfig from '../../firebase-applet-config.json';
import { AlertCircle, HelpCircle, Mail, Copy, Check, X } from 'lucide-react';

interface GoogleSignInScreenProps {
  onSignIn: (profile: { name: string; email: string; avatar?: string }) => void;
}

export const GoogleSignInScreen: React.FC<GoogleSignInScreenProps> = ({
  onSignIn,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // App support email derived from the Firebase project identity or custom env
  const appSupportEmail =
    (import.meta as any).env?.VITE_APP_SUPPORT_EMAIL ||
    `support@${firebaseConfig.projectId || 'pitcher-profile'}.firebaseapp.com`;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      onSignIn({
        name: user.displayName || user.email?.split('@')[0] || 'Coach',
        email: user.email || '',
        avatar: user.photoURL || undefined,
      });
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);

      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing. Please try again.');
      } else if (
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('auth/unauthorized-domain')
      ) {
        setError(
          'This domain is not yet authorized in the Firebase project settings. Please notify app support to complete setup.'
        );
      } else if (err?.code === 'auth/network-request-failed') {
        setError('Network connection error. Please check your internet and try again.');
      } else {
        setError(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(appSupportEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const supportMailtoUrl = (() => {
    const subject = encodeURIComponent('Pitch Tracker Support: Sign-in Assistance');
    const body = encodeURIComponent(
      `Hello Pitch Tracker Support,\n\nI need assistance signing in to the Pitch Tracker application.\n\nIssue Details:\n- App: Pitch Tracker (${firebaseConfig.projectId})\n- Page URL: ${typeof window !== 'undefined' ? window.location.href : 'Unknown'}\n- Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}\n- Error Message: ${error || 'None'}\n\nPlease help resolve this login issue.\n\nThank you.`
    );
    return `mailto:${appSupportEmail}?subject=${subject}&body=${body}`;
  })();

  return (
    <div
      id="google-signin-screen"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-6 py-12 relative"
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

        {/* Error Notification with Direct Support Action */}
        {error && (
          <div className="w-full text-left bg-rose-950/40 border border-rose-500/30 p-4 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-rose-300">
                  {error}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
              <span className="text-[11px] text-rose-300/80">Need help resolving this?</span>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="text-xs font-semibold text-rose-200 hover:text-white underline inline-flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Support</span>
              </button>
            </div>
          </div>
        )}

        {/* Sign In CTA */}
        <div className="w-full space-y-4">
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

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Having trouble signing in? Contact App Support</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contact Support Dialog */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">App Support</h3>
                  <p className="text-xs text-slate-400">Pitch Tracker Helpdesk</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If you or any coach runs into authentication or access issues, contact the app support team directly.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Application Support Email
              </span>
              <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700/80">
                <code className="text-xs font-mono text-emerald-400 select-all truncate">
                  {appSupportEmail}
                </code>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 shrink-0 p-1 font-medium"
                  title="Copy email"
                >
                  {copiedEmail ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={supportMailtoUrl}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>Open Email with Diagnostics</span>
              </a>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


