import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { CoachNotePhoto } from '../utils/coachNotesUtils';

export interface CoachPhotoLightboxModalProps {
  photos: CoachNotePhoto[];
  initialIndex?: number;
  authorName?: string;
  onClose: () => void;
}

export const CoachPhotoLightboxModal: React.FC<CoachPhotoLightboxModalProps> = ({
  photos,
  initialIndex = 0,
  authorName,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, photos.length - 1))
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && photos.length > 1) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && photos.length > 1) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose]);

  const handlePrev = () => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    if (!currentPhoto?.dataUrl) return;
    const link = document.createElement('a');
    link.href = currentPhoto.dataUrl;
    link.download = `coach-observation-photo-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentPhoto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Coaches' Observation Reference Photo</span>
              {photos.length > 1 && (
                <span className="text-xs text-slate-400 font-mono">
                  ({currentIndex + 1} of {photos.length})
                </span>
              )}
            </h4>
            {authorName && (
              <p className="text-xs text-slate-400">Captured by {authorName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-1 mr-2 border border-white/10">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1.5 hover:bg-white/20 rounded text-slate-200 hover:text-white transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-1 text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
              className="p-1.5 hover:bg-white/20 rounded text-slate-200 hover:text-white transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel !== 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 hover:bg-white/20 rounded text-slate-300 hover:text-white transition cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold border border-white/10 cursor-pointer"
            title="Download Reference Photo"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-rose-600/80 text-slate-200 hover:text-white transition border border-white/10 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative max-w-5xl max-h-[80vh] w-full h-full flex items-center justify-center p-2 select-none overflow-hidden">
        <img
          src={currentPhoto.dataUrl}
          alt={currentPhoto.caption || 'Coach reference photo'}
          className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-transform duration-150"
          style={{ transform: `scale(${zoomLevel})` }}
        />

        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            title="Previous Photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            title="Next Photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Caption / Thumbnail strip */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center gap-2 pointer-events-auto">
        {currentPhoto.caption && (
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs sm:text-sm font-medium max-w-xl text-center shadow-lg">
            "{currentPhoto.caption}"
          </div>
        )}

        {photos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1 px-2">
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setCurrentIndex(idx);
                }}
                className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                  idx === currentIndex
                    ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/20'
                    : 'border-white/30 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={p.dataUrl}
                  alt={p.caption || `Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
