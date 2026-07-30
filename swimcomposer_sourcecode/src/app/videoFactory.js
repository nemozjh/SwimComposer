export function createVideoElement(src) {
  const videoEl = document.createElement('video');
  videoEl.src = src || '';
  videoEl.muted = true;
  videoEl.loop = false;
  videoEl.playsInline = true;
  videoEl.crossOrigin = 'anonymous';
  videoEl.preload = 'auto';
  if ('preservesPitch' in videoEl) {
    videoEl.preservesPitch = false;
  }
  if ('webkitPreservesPitch' in videoEl) {
    videoEl.webkitPreservesPitch = false;
  }
  if ('mozPreservesPitch' in videoEl) {
    videoEl.mozPreservesPitch = false;
  }
  return videoEl;
}

export default createVideoElement;
