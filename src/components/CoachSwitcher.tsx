import React, { useState } from 'react';
import { Coach } from '../types';
import { UserCheck, ChevronDown, Check, LogOut } from 'lucide-react';

interface CoachSwitcherProps {
  currentCoach: Coach;
  allCoaches: Coach[];
  onSelectCoach: (coachId: string) => void;
  onSignOut?: () => void;
}

export const CoachSwitcher: React.FC<CoachSwitcherProps> = ({
  currentCoach,
  allCoaches,
  onSelectCoach,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        id="coach-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
      >
        <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
          {currentCoach.name.charAt(0)}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold leading-none max-w-[120px] truncate">
            {currentCoach.name}
          </div>
          <div className="text-[9px] text-slate-400 font-normal leading-none mt-0.5 max-w-[120px] truncate">
            {currentCoach.email}
          </div>
        </div>
        <span className="sm:hidden max-w-[90px] truncate">{currentCoach.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div
          id="coach-dropdown-menu"
          className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Current Signed-In Google Account Header */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
              {/* Google G mini */}
              <svg className="w-3 h-3" viewBox="0 0 24 24">
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
              <span>Signed In Account</span>
            </div>
            <p className="text-xs font-bold text-slate-900 truncate">{currentCoach.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{currentCoach.email}</p>
          </div>

          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Switch Coach Profile
          </div>

          <div className="divide-y divide-slate-50">
            {allCoaches.map((c) => {
              const isSelected = c.id === currentCoach.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  id={`select-coach-option-${c.id}`}
                  onClick={() => {
                    onSelectCoach(c.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-slate-50 transition ${
                    isSelected ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center border border-slate-300 shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate">{c.email}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {onSignOut && (
            <div className="p-1 border-t border-slate-100 mt-1">
              <button
                type="button"
                id="coach-signout-btn"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg text-left transition flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Google</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
