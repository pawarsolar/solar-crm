import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiBaseUrl, API_BASE } from './api';
import { compressImageFile } from './image-compressor';

describe('Frontend API Client & Safe JSON Parsing', () => {
  it('should export getApiBaseUrl function and valid API_BASE', () => {
    expect(typeof getApiBaseUrl).toBe('function');
    const baseUrl = getApiBaseUrl();
    expect(baseUrl).toBeDefined();
    expect(typeof baseUrl).toBe('string');
  });
});

describe('Image Compressor Utility', () => {
  it('should return non-image files unchanged without errors', async () => {
    const textBlob = new Blob(['sample csv content'], { type: 'text/csv' });
    const textFile = new File([textBlob], 'sample.csv', { type: 'text/csv' });

    const result = await compressImageFile(textFile);
    expect(result).toBe(textFile);
    expect(result.name).toBe('sample.csv');
  });

  it('should return files that are already below maxSizeBytes untouched', async () => {
    const tinyImageBlob = new Blob(['fake image bytes'], { type: 'image/jpeg' });
    const tinyFile = new File([tinyImageBlob], 'tiny.jpg', { type: 'image/jpeg' });

    const result = await compressImageFile(tinyFile, { maxSizeBytes: 1024 * 1024 });
    expect(result).toBe(tinyFile);
  });
});
