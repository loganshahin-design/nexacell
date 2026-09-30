// Descarrega um canvas (ou data URL) como PNG, para colar no relatório.
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return false;
  try {
    downloadDataUrl(canvas.toDataURL("image/png"), filename);
    return true;
  } catch {
    return false;
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
