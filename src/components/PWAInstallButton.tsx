import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  return null;
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running as standalone or dismissed, hide
  if (isInstalled || isDismissed) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800/60 text-emerald-50 px-3 py-1.5 rounded-lg shadow-sm">
        <button
          onClick={install}
          className="flex items-center gap-1.5 text-xs font-black hover:text-white transition uppercase tracking-wider"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Install App</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-emerald-400 hover:text-white p-0.5 rounded transition"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-800/60 text-emerald-50 px-3 py-1.5 rounded-lg shadow-sm">
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 text-xs font-black hover:text-white transition uppercase tracking-wider"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Install App</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-emerald-400 hover:text-white p-0.5 rounded transition"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Install on iOS</span>
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                To install <strong className="text-slate-900">Pitcher Profile</strong> to your Home Screen:
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2 font-medium">
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 shrink-0">1</span>
                  <span>Tap the <strong className="text-slate-900">Share</strong> button in the Safari toolbar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 shrink-0">2</span>
                  <span>Scroll down and tap <strong className="text-slate-900">Add to Home Screen</strong>.</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-2 text-xs font-black text-white shadow-3xs uppercase tracking-wider transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
