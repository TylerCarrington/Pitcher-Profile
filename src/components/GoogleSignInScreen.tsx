import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface GoogleSignInScreenProps {
  onSignIn: (profile: { name: string; email: string; avatar?: string }) => void;
}

export const GoogleSignInScreen: React.FC<GoogleSignInScreenProps> = ({
  onSignIn,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      onSignIn({
        name: user.displayName || user.email?.split('@')[0] || 'Unknown Coach',
        email: user.email || '',
        avatar: user.photoURL || undefined,
      });
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="google-signin-screen"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-6 py-12"
    >
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-10">
        {/* Logo/Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30 bg-slate-800">
          <img
            src="/assets/pitch.png"
            alt="Pitch Tracker Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Copy Section */}
        <div className="space-y-5">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Coach smarter pitching.
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-medium">
            Track every pitch's location and outcome live from the mound, keep an eye on pitch counts and rest days automatically, and turn each outing into a scouting report you can use with your pitchers afterward.
          </p>
        </div>

        {/* Error (if any) */}
        {error && (
          <div className="w-full text-sm font-medium text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20">
            {error}
          </div>
        )}

        {/* Call to Action */}
        <div className="w-full pt-4">
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
        </div>
      </div>
    </div>
  );
};

