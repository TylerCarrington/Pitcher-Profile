export interface CoachNotePhoto {
  id: string;
  dataUrl: string; // Base64 compressed image data URL
  caption?: string;
  timestamp?: string;
}

export interface ParsedCoachNote {
  text: string;
  isShared: boolean;
  photos: CoachNotePhoto[];
}

/**
 * Parses a raw coach note string into structured content (text, shared status, photos).
 * Supports legacy plain strings, [SHARED] prefixed strings, and JSON-encoded structured notes.
 */
export function parseCoachNote(rawNote: string | undefined | null): ParsedCoachNote {
  if (!rawNote || typeof rawNote !== 'string') {
    return { text: '', isShared: false, photos: [] };
  }

  const trimmed = rawNote.trim();
  if (!trimmed) {
    return { text: '', isShared: false, photos: [] };
  }

  // Check if this is a structured JSON note
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const text = typeof parsed.text === 'string' ? parsed.text : '';
        const isShared = Boolean(parsed.isShared ?? parsed.shared ?? false);
        const photos: CoachNotePhoto[] = Array.isArray(parsed.photos)
          ? parsed.photos.filter((p: any) => p && typeof p.dataUrl === 'string' && p.dataUrl.length > 0)
          : [];
        return { text, isShared, photos };
      }
    } catch {
      // Fall through to standard text parsing if JSON parse fails
    }
  }

  // Legacy format: check for [SHARED] prefix
  const isShared = trimmed.startsWith('[SHARED]');
  const text = trimmed.replace(/^\[SHARED\]\s*/, '');

  return {
    text,
    isShared,
    photos: [],
  };
}

/**
 * Serializes coach note data into a string format.
 * If photos exist, encodes as JSON string.
 * If no photos, uses lightweight standard / [SHARED] format for backward compatibility.
 */
export function serializeCoachNote(note: {
  text: string;
  isShared: boolean;
  photos?: CoachNotePhoto[];
}): string {
  const cleanText = (note.text || '').trim();
  const validPhotos = (note.photos || []).filter(
    (p) => p && typeof p.dataUrl === 'string' && p.dataUrl.length > 0
  );

  if (!cleanText && validPhotos.length === 0) {
    return '';
  }

  if (validPhotos.length > 0) {
    return JSON.stringify({
      text: cleanText,
      isShared: note.isShared,
      photos: validPhotos,
    });
  }

  return note.isShared ? `[SHARED] ${cleanText}` : cleanText;
}

/**
 * Compresses an image file (File or Blob) to a maximum dimension and quality,
 * returning a lightweight Base64 data URL string suitable for persistent storage.
 */
export async function compressImageBase64(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect-ratio preserved scaling
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback if canvas context is not available
          resolve(String(e.target?.result || ''));
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = String(e.target?.result || '');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Creates a new CoachNotePhoto from a File with automatic compression.
 */
export async function createCoachNotePhotoFromFile(
  file: File,
  caption = ''
): Promise<CoachNotePhoto> {
  const dataUrl = await compressImageBase64(file);
  return {
    id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    dataUrl,
    caption: caption.trim() || undefined,
    timestamp: new Date().toISOString(),
  };
}
