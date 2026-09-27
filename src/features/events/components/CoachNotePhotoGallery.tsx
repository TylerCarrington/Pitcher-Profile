import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, Plus, ZoomIn, Loader2 } from 'lucide-react';
import { CoachNotePhoto, createCoachNotePhotoFromFile } from '../utils/coachNotesUtils';
import { CoachPhotoLightboxModal } from './CoachPhotoLightboxModal';

export interface CoachNotePhotoGalleryProps {
  photos: CoachNotePhoto[];
  authorName?: string;
  isEditing?: boolean;
  onPhotosChange?: (photos: CoachNotePhoto[]) => void;
  maxPhotos?: number;
}

export const CoachNotePhotoGallery: React.FC<CoachNotePhotoGalleryProps> = ({
  photos = [],
  authorName,
  isEditing = false,
  onPhotosChange,
  maxPhotos = 6,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onPhotosChange) return;

    try {
      setIsProcessing(true);
      const remainingSlots = Math.max(0, maxPhotos - photos.length);
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      const newPhotos: CoachNotePhoto[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        const photo = await createCoachNotePhotoFromFile(file);
        newPhotos.push(photo);
      }

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos]);
      }
    } catch (err) {
      console.error('Failed to process reference photos:', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (idToRemove: string) => {
    if (!onPhotosChange) return;
    onPhotosChange(photos.filter((p) => p.id !== idToRemove));
  };

  const handleCaptionChange = (idToUpdate: string, newCaption: string) => {
    if (!onPhotosChange) return;
    onPhotosChange(
      photos.map((p) => (p.id === idToUpdate ? { ...p, caption: newCaption } : p))
    );
  };

  if (!isEditing && photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mt-2">
      {/* Lightbox Modal when clicking a thumbnail */}
      {activeLightboxIndex !== null && photos.length > 0 && (
        <CoachPhotoLightboxModal
          photos={photos}
          initialIndex={activeLightboxIndex}
          authorName={authorName}
          onClose={() => setActiveLightboxIndex(null)}
        />
      )}

      {/* Gallery Header / Label */}
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
        <span className="flex items-center gap-1">
          <Camera className="w-3.5 h-3.5 text-emerald-600" />
          <span>Reference Photos {photos.length > 0 ? `(${photos.length})` : ''}</span>
        </span>
        {isEditing && (
          <span className="text-[10px] text-slate-400 font-normal">
            Max {maxPhotos} photos &bull; Auto-compressed
          </span>
        )}
      </div>

      {/* Grid of photos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {photos.map((photo, index) => (
          <div
            key={photo.id || index}
            className={`group relative rounded-xl overflow-hidden border ${
              isEditing ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white shadow-3xs'
            } transition-all`}
          >
            {/* Image Thumbnail with click to expand */}
            <div
              onClick={() => setActiveLightboxIndex(index)}
              className="relative aspect-4/3 w-full bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
            >
              <img
                src={photo.dataUrl}
                alt={photo.caption || `Observation photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="bg-black/60 text-white rounded-full p-1.5 shadow backdrop-blur-xs">
                  <ZoomIn className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Editing mode: Caption input + Remove button */}
            {isEditing ? (
              <div className="p-2 space-y-1.5 bg-white border-t border-slate-200">
                <input
                  type="text"
                  value={photo.caption || ''}
                  onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                  placeholder="Caption (e.g. Arm slot)"
                  className="w-full text-[11px] px-2 py-1 rounded bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white outline-none text-slate-800"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(photo.id);
                  }}
                  className="w-full py-1 text-[10px] font-bold rounded text-rose-600 hover:bg-rose-50 border border-rose-100 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              /* Display mode: caption text */
              photo.caption && (
                <div className="p-1.5 bg-white/95 border-t border-slate-100">
                  <p className="text-[11px] text-slate-700 font-medium truncate" title={photo.caption}>
                    {photo.caption}
                  </p>
                </div>
              )
            )}
          </div>
        ))}

        {/* Edit mode: "Add Photo" Card */}
        {isEditing && photos.length < maxPhotos && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-4/3 min-h-[90px] border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-emerald-700 transition cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span className="text-[10px] font-bold">Compressing...</span>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold">Add Photo</span>
                  <span className="text-[9px] text-slate-400">Camera or Gallery</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
