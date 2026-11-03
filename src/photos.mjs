export const usesR2 = (trip) => trip.photoStorage === 'r2';

// Content and export manifests retain the original object paths. Resolve the
// public URL only when rendering, including covers and lightbox links.
export function resolveTripPhotos(site, trip) {
  if (!trip || !usesR2(trip)) return trip;
  const base = site.photoBaseUrl.replace(/\/+$/, '');
  const resolve = (photo) => ({ ...photo, src: `${base}${photo.src}` });
  return {
    ...trip,
    cover: resolve(trip.cover),
    chapters: trip.chapters.map((chapter) => ({ ...chapter, photos: chapter.photos.map(resolve) })),
  };
}
