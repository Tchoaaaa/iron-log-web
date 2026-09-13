// Crops a centered square out of an image/video source and returns it as a
// JPEG data URL. Shared by every avatar-capture path (file upload, camera)
// so a change to size/quality/crop math only has to happen once.
export function cropSquareToDataUrl(source, { width, height, size = 240, quality = 0.85 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const side = Math.min(width, height);
  canvas
    .getContext("2d")
    .drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}
