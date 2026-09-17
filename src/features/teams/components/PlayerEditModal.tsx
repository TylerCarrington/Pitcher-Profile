import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Player } from '../../../types';
import { ImageUploadInput } from '../../../components/shared/ImageUploadInput';

export interface PlayerEditModalProps {
  isOpen: boolean;
  editingPlayer: Player | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    jerseyNumber: string;
    throwsHand?: 'R' | 'L';
    seasonAge: number;
    imageUrl?: string;
  }) => void;
}

export const PlayerEditModal: React.FC<PlayerEditModalProps> = ({
  isOpen,
  editingPlayer,
  onClose,
  onSave,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerThrows, setPlayerThrows] = useState<'R' | 'L'>('R');
  const [playerSeasonAge, setPlayerSeasonAge] = useState<number | ''>(11);
  const [playerImage, setPlayerImage] = useState<string>('');

  useEffect(() => {
    if (editingPlayer) {
      setPlayerName(editingPlayer.name);
      setPlayerNumber(editingPlayer.jerseyNumber);
      setPlayerThrows(editingPlayer.throwsHand || 'R');
      setPlayerSeasonAge(editingPlayer.seasonAge ?? 11);
      setPlayerImage(editingPlayer.imageUrl || '');
    } else {
      setPlayerName('');
      setPlayerNumber('');
      setPlayerThrows('R');
      setPlayerSeasonAge(11);
      setPlayerImage('');
    }
  }, [editingPlayer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !playerNumber.trim()) return;
    const finalAge = typeof playerSeasonAge === 'number' ? playerSeasonAge : 11;
    onSave({
      name: playerName.trim(),
      jerseyNumber: playerNumber.trim(),
      throwsHand: playerThrows,
      seasonAge: finalAge,
      imageUrl: playerImage.trim() || undefined,
    });
  };

  return (
    <div
      id="player-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">
            {editingPlayer ? 'Edit Player' : 'Add Player to Roster'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Player Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Liam Parker"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jersey # *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 11"
                value={playerNumber}
                onChange={(e) => setPlayerNumber(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Throws
              </label>
              <select
                value={playerThrows}
                onChange={(e) => setPlayerThrows(e.target.value as 'R' | 'L')}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
              >
                <option value="R">Right (RHP)</option>
                <option value="L">Left (LHP)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Season Age (Youth Bracket) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={6}
                max={19}
                placeholder="e.g. 9"
                required
                value={playerSeasonAge}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setPlayerSeasonAge('');
                  } else {
                    const num = parseInt(val, 10);
                    setPlayerSeasonAge(isNaN(num) ? '' : num);
                  }
                }}
                className="w-24 text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono shadow-xs"
              />
              <span className="text-xs text-slate-500 font-medium">
                {playerSeasonAge !== '' ? `${playerSeasonAge}U Bracket (used for Pitch Count limits)` : 'Select League Age (e.g. 9U, 11U)'}
              </span>
            </div>
          </div>

          <ImageUploadInput
            label="Pitcher / Player Photo (Optional)"
            value={playerImage}
            onChange={setPlayerImage}
            shape="circle"
            helperText="Upload a player headshot or action photo from camera or files."
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              {editingPlayer ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
