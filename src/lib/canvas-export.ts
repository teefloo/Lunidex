const DEFAULT_CANVAS_EXPORT_TIMEOUT_MS = 20_000;

/** Waits for the browser's asynchronous canvas encoder and rejects bounded failures. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  timeoutMs = DEFAULT_CANVAS_EXPORT_TIMEOUT_MS,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error('Canvas image generation timed out.')));
    }, timeoutMs);

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          finish(() => reject(new Error('Browser could not create the canvas image.')));
          return;
        }
        finish(() => resolve(blob));
      }, type);
    } catch (error) {
      finish(() => reject(error));
    }
  });
}
