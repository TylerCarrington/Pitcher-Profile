import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export interface PdfExportOptions {
  pageSize?: 'letter' | 'a4';
  margin?: number; // points, default 18
  filename?: string;
  onProgress?: (current: number, total: number, message: string) => void;
}

/**
 * Renders an array of HTML elements into a multi-page PDF document,
 * placing each element centered on its own dedicated page.
 */
export async function generateMultiPagePdfFromElements(
  elements: HTMLElement[],
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    pageSize = 'letter',
    margin = 20,
    filename = 'pitching-report.pdf',
    onProgress,
  } = options;

  if (elements.length === 0) {
    throw new Error('No elements provided for PDF generation');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: pageSize,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availWidth = pageWidth - margin * 2;
  const availHeight = pageHeight - margin * 2;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    onProgress?.(i + 1, elements.length, `Rendering page ${i + 1} of ${elements.length}...`);

    // Give browser brief time to layout and resolve assets
    await new Promise((resolve) => setTimeout(resolve, 150));

    const rect = el.getBoundingClientRect();
    const elWidth = Math.ceil(Math.max(rect.width, el.scrollWidth, el.offsetWidth, 780));
    const elHeight = Math.ceil(Math.max(rect.height, el.scrollHeight, el.offsetHeight));

    const dataUrl = await toPng(el, {
      quality: 0.98,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      width: elWidth,
      height: elHeight,
      filter: (node) => {
        if (node instanceof HTMLElement && node.dataset.noExport === 'true') {
          return false;
        }
        return true;
      },
    });

    // Calculate natural dimensions to preserve exact aspect ratio without distortion
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = reject;
    });

    const imgAspect = img.naturalWidth / img.naturalHeight;
    let renderWidth = availWidth;
    let renderHeight = renderWidth / imgAspect;

    if (renderHeight > availHeight) {
      renderHeight = availHeight;
      renderWidth = renderHeight * imgAspect;
    }

    const x = (pageWidth - renderWidth) / 2;
    // Align card to top of page using top margin
    const y = margin;

    if (i > 0) {
      pdf.addPage(pageSize, 'portrait');
    }

    pdf.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');
  }

  onProgress?.(elements.length, elements.length, 'Finalizing and downloading PDF document...');
  await new Promise((resolve) => setTimeout(resolve, 100));

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeFilename);
}
