/** Loads images (template data URLs) with a small cache. Data URLs are
 *  same-origin, so the resulting canvas is never tainted for getImageData. */

const cache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = cache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("template image failed to load"));
    img.src = src;
  });
}
