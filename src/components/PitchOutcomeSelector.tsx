import React, { useState } from 'react';
import {
  EventType,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
} from '../types';
import { PITCH_TYPES_CONFIG } from '../utils/pitchSmart';
import { Check, X, Disc } from 'lucide-react';

interface PitchOutcomeSelectorProps {
  eventType: EventType;
  currentLocation: PitchLocation | null;
  onRecordPitch: (
    outcome: PitchOutcome,
    strikeDetail?: StrikeSubDetail,
    inPlayDetail?: InPlaySubDetail,
    pitchType?: PitchType,
  ) => void;
  isSubmitting?: boolean;
}

export const PitchOutcomeSelector: React.FC<PitchOutcomeSelectorProps> = ({
  eventType,
  currentLocation,
  onRecordPitch,
  isSubmitting = false,
}) => {
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('fastball');
  const [pendingStrike, setPendingStrike] = useState(false);
  const [pendingInPlay, setPendingInPlay] = useState(false);

  const handleRecord = (
    outcome: PitchOutcome,
    strikeDetail?: StrikeSubDetail,
    inPlayDetail?: InPlaySubDetail,
  ) => {
    onRecordPitch(outcome, strikeDetail, inPlayDetail, selectedPitchType);
  };

  const pitchTypesList: PitchType[] = ['fastball', 'changeup', 'curveball', 'slider', 'other'];

  // Bullpen Mode: Straightforward Ball / Strike
  if (eventType === 'bullpen') {
    return (
      <div id="bullpen-outcome-selector" className="w-full max-w-md mx-auto space-y-3">
        {/* Quick Pitch Type Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Type:</span>
          {pitchTypesList.map((type) => {
            const cfg = PITCH_TYPES_CONFIG[type] || PITCH_TYPES_CONFIG.fastball;
            const isSelected = selectedPitchType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedPitchType(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <span>{cfg.abbr}</span>
                <span className="hidden sm:inline font-normal text-[11px] opacity-80">
                  {type === 'fastball' ? 'Fastball' : type === 'changeup' ? 'Change' : type}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* BALL BUTTON */}
          <button
            type="button"
            id="record-ball-btn"
            disabled={isSubmitting}
            onClick={() => handleRecord('ball')}
            className="h-16 sm:h-20 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xl sm:text-2xl shadow-lg hover:shadow-amber-500/25 active:scale-95 transition-all flex flex-col items-center justify-center border-b-4 border-amber-600"
          >
            <span>BALL</span>
            <span className="text-[11px] font-semibold text-amber-950/70 tracking-normal">
              {currentLocation ? 'Log with location' : 'Fast tap'}
            </span>
          </button>

          {/* STRIKE BUTTON */}
          <button
            type="button"
            id="record-strike-btn"
            disabled={isSubmitting}
            onClick={() => handleRecord('strike', 'called')}
            className="h-16 sm:h-20 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xl sm:text-2xl shadow-lg hover:shadow-emerald-600/25 active:scale-95 transition-all flex flex-col items-center justify-center border-b-4 border-emerald-700"
          >
            <span>STRIKE</span>
            <span className="text-[11px] font-semibold text-emerald-100/80 tracking-normal">
              {currentLocation ? 'Log with location' : 'Fast tap'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Game Mode: Ball, Strike (with sub-options), Foul, In-Play (with sub-options)
  return (
    <div id="game-outcome-selector" className="w-full max-w-md mx-auto space-y-3">
      {/* Quick Pitch Type Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Arsenal:</span>
        {pitchTypesList.map((type) => {
          const cfg = PITCH_TYPES_CONFIG[type] || PITCH_TYPES_CONFIG.fastball;
          const isSelected = selectedPitchType === type;
          return (
            <button
              key={type}
              type="button"
              id={`select-pitchtype-${type}`}
              onClick={() => setSelectedPitchType(type)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border shrink-0 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-500/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span>{cfg.abbr}</span>
              <span className="hidden sm:inline font-normal text-[11px] opacity-80">
                {type === 'fastball' ? 'Fast' : type === 'changeup' ? 'Change' : type === 'curveball' ? 'Curve' : type}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pending Strike Sub-Options Modal/Overlay */}
      {pendingStrike && (
        <div
          id="strike-detail-modal"
          className="p-4 rounded-xl bg-slate-900 border-2 border-emerald-500 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="font-bold text-sm tracking-wide text-emerald-400 uppercase">
              Select Strike Type
            </span>
            <button
              type="button"
              onClick={() => setPendingStrike(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="strike-called-btn"
              onClick={() => {
                setPendingStrike(false);
                handleRecord('strike', 'called');
              }}
              className="py-3 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-center font-bold text-sm text-emerald-200 active:scale-95 transition flex flex-col items-center gap-1"
            >
              <span>Called</span>
              <span className="text-[10px] text-slate-400 font-normal">Looked</span>
            </button>

            <button
              type="button"
              id="strike-swinging-btn"
              onClick={() => {
                setPendingStrike(false);
                handleRecord('strike', 'swinging');
              }}
              className="py-3 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-center font-bold text-sm text-emerald-200 active:scale-95 transition flex flex-col items-center gap-1"
            >
              <span>Swinging</span>
              <span className="text-[10px] text-slate-400 font-normal">Whiff</span>
            </button>

            <button
              type="button"
              id="strike-foul-tip-btn"
              onClick={() => {
                setPendingStrike(false);
                handleRecord('strike', 'foul_tip');
              }}
              className="py-3 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-center font-bold text-sm text-emerald-200 active:scale-95 transition flex flex-col items-center gap-1"
            >
              <span>Foul Tip</span>
              <span className="text-[10px] text-slate-400 font-normal">Held Strike</span>
            </button>
          </div>

          <div className="mt-3 text-right">
            <button
              type="button"
              id="quick-strike-btn"
              onClick={() => {
                setPendingStrike(false);
                handleRecord('strike');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Skip detail (Generic Strike)
            </button>
          </div>
        </div>
      )}

      {/* Pending In-Play Sub-Options Modal/Overlay */}
      {pendingInPlay && (
        <div
          id="in-play-detail-modal"
          className="p-4 rounded-xl bg-slate-900 border-2 border-indigo-500 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="font-bold text-sm tracking-wide text-indigo-400 uppercase">
              Select In-Play Outcome
            </span>
            <button
              type="button"
              onClick={() => setPendingInPlay(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              id="in-play-out-btn"
              onClick={() => {
                setPendingInPlay(false);
                handleRecord('in_play', undefined, 'out');
              }}
              className="py-3 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/50 text-center font-bold text-sm text-rose-200 active:scale-95 transition flex flex-col items-center gap-1"
            >
              <span>Out</span>
              <span className="text-[10px] text-slate-400 font-normal">Batter Out</span>
            </button>

            <button
              type="button"
              id="in-play-safe-btn"
              onClick={() => {
                setPendingInPlay(false);
                handleRecord('in_play', undefined, 'safe');
              }}
              className="py-3 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-center font-bold text-sm text-emerald-200 active:scale-95 transition flex flex-col items-center gap-1"
            >
              <span>Safe / Hit</span>
              <span className="text-[10px] text-slate-400 font-normal">Base Hit</span>
            </button>

            <button
              type="button"
              id="in-play-error-btn"
              onClick={() => {
                setPendingInPlay(false);
                handleRecord('in_play', undefined, 'error');
              }}
              className="py-3 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/50 text-center font-bold text-sm text-amber-200 active:scale-95 transition flex flex-col items-center gap-1"
            >
              <span>Error</span>
              <span className="text-[10px] text-slate-400 font-normal">Defensive E</span>
            </button>

            <button
              type="button"
              id="in-play-hbp-btn"
              onClick={() => {
                setPendingInPlay(false);
                handleRecord('in_play', undefined, 'hbp');
              }}
              className="py-3 px-2 rounded-lg bg-orange-950/60 hover:bg-orange-900 border border-orange-500/50 text-center font-bold text-sm text-orange-200 active:scale-95 transition flex flex-col items-center gap-1"
            >
              <span>Hit by Pitch</span>
              <span className="text-[10px] text-slate-400 font-normal">HBP &bull; 1st Base</span>
            </button>
          </div>

          <div className="mt-3 text-right">
            <button
              type="button"
              id="quick-in-play-btn"
              onClick={() => {
                setPendingInPlay(false);
                handleRecord('in_play');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Skip detail (Generic In-Play)
            </button>
          </div>
        </div>
      )}

      {/* Primary 4-Button Grid for Live Game */}
      {!pendingStrike && !pendingInPlay && (
        <div className="grid grid-cols-2 gap-3">
          {/* BALL */}
          <button
            type="button"
            id="game-record-ball-btn"
            disabled={isSubmitting}
            onClick={() => handleRecord('ball')}
            className="h-16 sm:h-20 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xl sm:text-2xl shadow-md hover:shadow-amber-500/20 active:scale-95 transition-all flex flex-col items-center justify-center border-b-4 border-amber-600"
          >
            <span>BALL</span>
            <span className="text-[10px] font-semibold text-amber-950/70">Ball 1-4</span>
          </button>

          {/* STRIKE */}
          <button
            type="button"
            id="game-record-strike-btn"
            disabled={isSubmitting}
            onClick={() => setPendingStrike(true)}
            className="h-16 sm:h-20 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xl sm:text-2xl shadow-md hover:shadow-emerald-600/20 active:scale-95 transition-all flex flex-col items-center justify-center border-b-4 border-emerald-700"
          >
            <span>STRIKE</span>
            <span className="text-[10px] font-semibold text-emerald-100/80">
              Called / Swing / Tip &rsaquo;
            </span>
          </button>

          {/* FOUL */}
          <button
            type="button"
            id="game-record-foul-btn"
            disabled={isSubmitting}
            onClick={() => handleRecord('foul')}
            className="h-14 sm:h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 font-bold text-lg sm:text-xl shadow border border-slate-700 active:scale-95 transition-all flex flex-col items-center justify-center"
          >
            <span>FOUL</span>
            <span className="text-[10px] text-slate-400 font-normal">Foul Ball</span>
          </button>

          {/* IN-PLAY */}
          <button
            type="button"
            id="game-record-inplay-btn"
            disabled={isSubmitting}
            onClick={() => setPendingInPlay(true)}
            className="h-14 sm:h-16 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-lg sm:text-xl shadow-md active:scale-95 transition-all flex flex-col items-center justify-center border-b-4 border-indigo-800"
          >
            <span>IN-PLAY</span>
            <span className="text-[10px] text-indigo-200">Out / Hit / Err / HBP &rsaquo;</span>
          </button>
        </div>
      )}
    </div>
  );
};
