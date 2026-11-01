export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/webp' | 'image/jpeg';
  maxSizeBytes?: number;
}

/**
 * High-performance client-side image compression for mobile and desktop uploads.
 * Reduces 5MB-15MB smartphone camera photos to lightweight (<500KB) compressed
 * assets before uploading, saving network bandwidth and backend memory.
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<File> {
  // If not an image, return original file untouched
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip SVG or GIF animations to prevent flattening
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    mimeType = 'image/jpeg',
    maxSizeBytes = 800 * 1024, // 800KB target
  } = options;

  // If already smaller than target size, return original
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight;
            height = Math.round((height * maxWidth) / img.width);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback to original
          return;
        }

        // High quality bicubic scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + (mimeType === 'image/webp' ? '.webp' : '.jpg');
            const compressedFile = new File([blob], cleanName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          mimeType,
          quality,
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
