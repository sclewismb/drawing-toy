/**
 * Load an image and wait until it's ready to draw.
 *
 * Uses the plain load/error events rather than img.decode(): decode() can
 * stall when the page isn't actively drawing frames, while load always fires.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src.slice(0, 60)}`));
    img.src = src;
  });
}
