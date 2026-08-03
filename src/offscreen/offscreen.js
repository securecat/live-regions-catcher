// Offscreen document for catch notification sounds.
// A single Audio element is reused: a new catch stops the sound that is
// still playing and restarts, so rapid catches never overlap.
const player = new Audio();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'lrc:play-sound' || typeof message.file !== 'string') {
    return;
  }
  player.volume =
    typeof message.volume === 'number' ? Math.min(Math.max(message.volume, 0), 1) : 1;
  const url = chrome.runtime.getURL(`sounds/${message.file}`);
  if (player.src !== url) {
    player.src = url;
  } else {
    player.currentTime = 0;
  }
  player.play().catch(() => {
    // Playback failures (e.g. missing file) must not break anything.
  });
});
