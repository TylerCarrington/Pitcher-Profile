import React, { useState } from 'react';
import { Player } from '../../../types';
import { Camera, X } from 'lucide-react';
import { ImageUploadInput } from '../../../components/shared/ImageUploadInput';
import { savePlayer } from '../../../storage';

export interface PlayerPhotoModalProps {
  isOpen: boolean;
  player: Player;
  onClose: () => void;
  onPlayerUpdated: (updatedPlayer: Player) => void;
}

export const PlayerPhotoModal: React.FC<PlayerPhotoModalProps> = ({
  isOpen,
  player,
  onClose,
  onPlayerUpdated,
}) => {
  const [photoDraft, setPhotoDraft] = useState(player.imageUrl || '');

  if (!isOpen) return null;

  return (
    <div
      id="pitcher-photo-modal"
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
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
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
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
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
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
                onPlayerUpdated(updated);
                onClose();
              }}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
            >
              Save Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
