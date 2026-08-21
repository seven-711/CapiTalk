/**
 * CapiTalk Image Processing Pipeline
 * Handles client-side validation, webp conversion, compression, and thumbnail generation.
 */

export interface ProcessedImage {
  fullDataUrl: string;
  thumbDataUrl: string;
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export const processUploadedImage = (
  file: File,
  maxWidth = 900,
  thumbWidth = 320,
  quality = 0.72
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    // 1. Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return reject(new Error('Invalid file type. Please upload a JPG, PNG, or WEBP image.'));
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      return reject(new Error('Image exceeds maximum allowed size of 10MB.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Corrupted or unreadable image file.'));
      img.onload = () => {
        // Calculate dimensions for full image
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // Render full WebP image on canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get 2d canvas context.'));
        ctx.drawImage(img, 0, 0, width, height);

        const fullDataUrl = canvas.toDataURL('image/webp', quality);

        // Render thumbnail on separate canvas
        let tWidth = img.width;
        let tHeight = img.height;
        if (tWidth > thumbWidth) {
          tHeight = Math.round((tHeight * thumbWidth) / tWidth);
          tWidth = thumbWidth;
        }

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = tWidth;
        thumbCanvas.height = tHeight;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (!thumbCtx) return reject(new Error('Could not get thumbnail canvas context.'));
        thumbCtx.drawImage(img, 0, 0, tWidth, tHeight);

        const thumbDataUrl = thumbCanvas.toDataURL('image/webp', 0.7);

        resolve({
          fullDataUrl,
          thumbDataUrl,
          fileName: file.name.replace(/\.[^/.]+$/, "") + ".webp",
          sizeBytes: Math.round((fullDataUrl.length * 3) / 4),
          width,
          height,
        });
      };
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};
