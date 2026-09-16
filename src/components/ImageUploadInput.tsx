import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Link as LinkIcon,
  Camera,
  RefreshCw,
  Crop as CropIcon,
  Sliders,
} from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';

interface ImageUploadInputProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  shape?: 'circle' | 'rounded';
  theme?: 'light' | 'dark';
  helperText?: string;
  placeholderText?: string;
  maxDimension?: number;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value = '',
  onChange,
  label = 'Photo',
  shape = 'circle',
  theme = 'light',
  helperText,
  placeholderText = 'Drag & drop image here or click to browse',
  maxDimension = 480,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cropperSource, setCropperSource] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  // Read file and launch Cropper / Zoom modal
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setIsProcessing(false);
      const rawUrl = e.target?.result as string;
      if (rawUrl) {
        setCropperSource(rawUrl);
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setErrorMsg('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset input so same file can be chosen again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlDraft.trim()) {
      setCropperSource(urlDraft.trim());
      setUrlDraft('');
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label
            className={`block text-xs font-bold ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            {label}
          </label>
          {!value && (
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={`text-[11px] font-medium transition ${
                isDark
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-emerald-600 hover:text-emerald-700'
              }`}
            >
              {showUrlInput ? 'Upload file instead' : 'Or paste URL'}
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
      />

      {/* If Value Exists: Show Active Image Preview & Controls */}
      {value ? (
        <div
          className={`flex items-center gap-3 p-2.5 rounded-xl border ${
            isDark
              ? 'bg-slate-900/80 border-slate-700'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="relative shrink-0 group/preview cursor-pointer" onClick={() => setCropperSource(value)}>
            <img
              src={value}
              alt="Preview"
              referrerPolicy="no-referrer"
              className={`object-cover border ${
                shape === 'circle'
                  ? 'w-14 h-14 rounded-full'
                  : 'w-14 h-14 rounded-xl'
              } ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
              onError={(e) => {
                // If invalid URL, show broken placeholder
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition text-white ${
              shape === 'circle' ? 'rounded-full' : 'rounded-xl'
            }`} title="Click to adjust crop & zoom">
              <CropIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <span
              className={`text-xs font-semibold block truncate ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Photo Attached
            </span>
            <span
              className={`text-[11px] block ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {value.startsWith('data:image')
                ? 'Ready (Cropped & Optimized)'
                : 'Linked from web URL'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCropperSource(value)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                  : 'bg-white hover:bg-slate-100 text-emerald-700 border border-slate-200 shadow-xs'
              }`}
              title="Adjust Crop & Zoom"
            >
              <CropIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Crop / Zoom</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
              }`}
              title="Replace image"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change</span>
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : showUrlInput ? (
        /* Alternative URL Input Form */
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              className={`flex-1 text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlDraft.trim()}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition"
            >
              Crop &amp; Attach
            </button>
          </div>
        </div>
      ) : (
        /* Drag and Drop / Browse Upload Box */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? isDark
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-emerald-500 bg-emerald-50'
              : isDark
              ? 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/80'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
              <span className="text-xs font-semibold text-emerald-500">
                Loading photo...
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  shape === 'circle' ? 'rounded-full' : 'rounded-xl'
                } ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                    : 'bg-white text-slate-600 border border-slate-200 shadow-xs'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-left">
                <div
                  className={`text-xs font-bold ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Click to upload or drag &amp; drop
                </div>
                <div
                  className={`text-[11px] ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Drag to reposition, pinch/zoom &amp; circle crop
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-rose-500 font-medium">{errorMsg}</div>
      )}

      {helperText && !errorMsg && (
        <p
          className={`text-[11px] ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {helperText}
        </p>
      )}

      {/* Interactive Crop & Zoom Modal */}
      {cropperSource && (
        <ImageCropperModal
          imageSrc={cropperSource}
          shape={shape}
          title={label ? `Adjust ${label}` : 'Adjust Crop & Zoom'}
          onCropComplete={(croppedData) => {
            onChange(croppedData);
            setCropperSource(null);
          }}
          onCancel={() => {
            setCropperSource(null);
          }}
        />
      )}
    </div>
  );
};

