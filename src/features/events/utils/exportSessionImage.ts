import { toPng, toBlob } from 'html-to-image';

export interface ExportImageOptions {
  filename?: string;
  pixelRatio?: number;
  backgroundColor?: string;
}

/**
 * Converts a DOM element into a PNG data URL and triggers browser file download.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  options: ExportImageOptions = {}
): Promise<string> {
  const pixelRatio = options.pixelRatio ?? 2;
  const backgroundColor = options.backgroundColor ?? '#ffffff';
  const filename = options.filename || 'pitcher_session_review.png';

  // Generate PNG data URL with high-res pixel ratio
  const dataUrl = await toPng(element, {
    pixelRatio,
    backgroundColor,
    cacheBust: true,
    quality: 0.95,
  });

  // Trigger browser download
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
}

/**
 * Copies the DOM element as a PNG image to the system clipboard (if supported).
 */
export async function copyElementToClipboard(
  element: HTMLElement,
  options: ExportImageOptions = {}
): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }

    const pixelRatio = options.pixelRatio ?? 2;
    const backgroundColor = options.backgroundColor ?? '#ffffff';

    const blob = await toBlob(element, {
      pixelRatio,
      backgroundColor,
      cacheBust: true,
      quality: 0.95,
    });

    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);

    return true;
  } catch (err) {
    console.warn('Clipboard copy error:', err);
    return false;
  }
}
