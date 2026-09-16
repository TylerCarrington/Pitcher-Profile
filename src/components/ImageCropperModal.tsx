import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Move,
  Maximize2,
  RefreshCw,
  Crop as CropIcon,
} from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  shape?: 'circle' | 'rounded';
  aspectRatio?: number; // default 1:1
  outputSize?: number; // default 400
  title?: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  shape = 'circle',
  aspectRatio = 1,
  outputSize = 400,
  title = 'Adjust Crop & Zoom',
  onCropComplete,
  onCancel,
}) => {
  // Image metadata & loading
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Transform states
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3.5);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270

  // Dragging interaction
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });

  // Viewport crop aperture size in CSS pixels
  const CROP_BOX_SIZE = 280;

  // Load image
  useEffect(() => {
    setImageLoaded(false);
    setLoadError(null);
    const img = new Image();
    // Enable cross-origin loading if possible
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);

      // Compute initial zoom so image fits/covers crop box
      const isRotated90 = rotation % 180 !== 0;
      const imgW = isRotated90 ? img.height : img.width;
      const imgH = isRotated90 ? img.width : img.height;

      const scaleX = CROP_BOX_SIZE / imgW;
      const scaleY = CROP_BOX_SIZE / imgH;
      const initialScale = Math.max(scaleX, scaleY);

      setMinZoom(Math.max(0.2, initialScale * 0.8));
      setMaxZoom(Math.max(initialScale * 4, 3.5));
      setZoom(initialScale);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      setLoadError('Failed to load image. If linking from the web, ensure the URL allows direct access.');
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle pointer down for drag
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom slider helper
  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.min(Math.max(newZoom, minZoom), maxZoom));
  };

  // 90deg rotation
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset all adjustments
  const handleReset = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const scaleX = CROP_BOX_SIZE / img.width;
    const scaleY = CROP_BOX_SIZE / img.height;
    const initialScale = Math.max(scaleX, scaleY);
    setZoom(initialScale);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Perform Final Crop on Canvas
  const handleApplyCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Target center
    const targetCenterX = outputSize / 2;
    const targetCenterY = outputSize / 2;

    ctx.save();
    // Move origin to canvas center
    ctx.translate(targetCenterX, targetCenterY);

    // Apply scaling ratio between CROP_BOX_SIZE and outputSize
    const outputScale = outputSize / CROP_BOX_SIZE;

    // Apply offset translated to canvas scale
    ctx.translate(offset.x * outputScale, offset.y * outputScale);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply zoom
    ctx.scale(zoom * outputScale, zoom * outputScale);

    // Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Export as high quality JPEG or PNG
    try {
      const croppedUrl = canvas.toDataURL('image/jpeg', 0.88);
      onCropComplete(croppedUrl);
    } catch (err) {
      console.error('Canvas export error:', err);
      // Fallback
      onCropComplete(imageSrc);
    }
  };

  return (
    <div
      id="image-cropper-modal"
      className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onPointerUp={handlePointerUp}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CropIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">
                Drag to reposition &amp; pinch or zoom to fit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Canvas Stage */}
        <div className="relative bg-slate-950 flex items-center justify-center p-4 min-h-[320px] overflow-hidden">
          {loadError ? (
            <div className="text-center p-6 text-rose-400 text-xs space-y-2">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1 bg-slate-800 rounded-lg text-slate-200 font-semibold"
              >
                Close
              </button>
            </div>
          ) : !imageLoaded ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs">Loading image...</span>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative w-[280px] h-[280px] cursor-grab active:cursor-grabbing touch-none overflow-hidden"
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 1) {
                  handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
            >
              {/* Underlying Image Element transformed by zoom, rotation & offset */}
              <div
                className="absolute top-1/2 left-1/2 origin-center pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg) scale(${zoom})`,
                }}
              >
                <img
                  src={imageSrc}
                  alt="Crop Preview"
                  className="max-w-none block select-none pointer-events-none"
                  crossOrigin="anonymous"
                  draggable={false}
                />
              </div>

              {/* Crop Aperture Overlay & Grid */}
              <div className="absolute inset-0 pointer-events-none">
                {/* SVG Mask with darkened backdrop outside circular/rounded aperture */}
                <svg className="w-full h-full" viewBox="0 0 280 280">
                  <defs>
                    <mask id="crop-aperture-mask">
                      <rect width="280" height="280" fill="white" />
                      {shape === 'circle' ? (
                        <circle cx="140" cy="140" r="136" fill="black" />
                      ) : (
                        <rect x="8" y="8" width="264" height="264" rx="28" fill="black" />
                      )}
                    </mask>
                  </defs>
                  {/* Semi-translucent dark vignette outside aperture */}
                  <rect
                    width="280"
                    height="280"
                    fill="rgba(2, 6, 23, 0.78)"
                    mask="url(#crop-aperture-mask)"
                  />
                  {/* Aperture border ring */}
                  {shape === 'circle' ? (
                    <circle
                      cx="140"
                      cy="140"
                      r="136"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  ) : (
                    <rect
                      x="8"
                      y="8"
                      width="264"
                      height="264"
                      rx="28"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  )}
                </svg>

                {/* Subtle Rule-of-Thirds Grid inside Crop Circle */}
                <div
                  className={`absolute inset-[8px] pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30 ${
                    shape === 'circle' ? 'rounded-full overflow-hidden' : 'rounded-[28px] overflow-hidden'
                  }`}
                >
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                  <div className="border-r border-white/40" />
                  <div className="border-r border-white/40" />
                  <div />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3.5">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.15)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={minZoom}
                max={maxZoom}
                step={(maxZoom - minZoom) / 100}
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.15)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Action Tools: Rotate, Reset, Cancel, Save */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rotate</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Reset crop adjustments"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                disabled={!imageLoaded}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition"
              >
                <Check className="w-4 h-4" />
                <span>Save Crop</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
