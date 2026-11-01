import { useEffect } from 'react';

const BASE_TITLE = 'Solar EPC CRM';

/**
 * Custom hook to dynamically manage document title and meta description
 * for enhanced SEO, browser accessibility, and user navigation.
 */
export function usePageSeo(title: string, description?: string) {
  useEffect(() => {
    // 1. Update Title
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    document.title = fullTitle;

    // 2. Update Meta Description
    if (description) {
      let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;

      // Also update og:description if present
      const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.content = description;
      }
    }

    // Also update og:title
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.content = fullTitle;
    }
  }, [title, description]);
}
