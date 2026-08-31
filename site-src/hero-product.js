const hero = document.querySelector("#hero");
const heroScroll = document.querySelector("#heroScroll");
const host = document.querySelector("#heroProductScene");
const video = document.querySelector("#heroProductVideo");

if (hero && heroScroll && host && video) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const smoothstep = (edge0, edge1, value) => {
    const x = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
  };

  let pointerX = 0.67;
  let pointerY = 0.47;
  let currentProgress = 0.5;
  let duration = 10;
  let targetProgress = 0.5;
  let lastAppliedProgress = -1;

  video.pause();
  video.addEventListener("loadedmetadata", () => {
    duration = Math.max(0.1, video.duration || 10);
    video.currentTime = duration * currentProgress;
  });
  video.addEventListener("loadeddata", async () => {
    host.classList.add("is-video-ready");
    // Decode one frame under the browser's media pipeline before mouse-driven
    // seeking. Some Chromium builds otherwise keep a paused WebM on its poster.
    try {
      await video.play();
      video.pause();
      video.currentTime = duration * currentProgress;
    } catch {
      video.currentTime = duration * currentProgress;
    }
  }, { once: true });

  const seekToProgress = (progress) => {
    if (video.readyState < 2) return;
    const time = clamp(progress * (duration - 0.045), 0, duration - 0.045);
    if (Math.abs(video.currentTime - time) > 0.015) video.currentTime = time;
  };

  document.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) return;
    pointerX = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    pointerY = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    targetProgress = pointerX;
    seekToProgress(targetProgress);
  }, { passive: true });

  hero.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    const rect = hero.getBoundingClientRect();
    pointerX = clamp((touch.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    pointerY = clamp((touch.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    targetProgress = pointerX;
    seekToProgress(targetProgress);
  }, { passive: true });

  const tick = (now) => {
    const rect = hero.getBoundingClientRect();
    const trackRect = heroScroll.getBoundingClientRect();
    const scrollDistance = Math.max(1, trackRect.height - innerHeight);
    const scrollProgress = clamp(-trackRect.top / scrollDistance, 0, 1);
    const settle = smoothstep(0.02, 0.78, scrollProgress);
    const targetX = lerp(pointerX, 0.5, settle);
    const targetY = lerp(pointerY, 0.5, settle);
    targetProgress = settle > 0.92 ? 0.5 : pointerX;

    host.style.setProperty("--product-x", `${targetX * rect.width}px`);
    host.style.setProperty("--product-y", `${targetY * rect.height}px`);
    host.style.setProperty("--product-scale", innerWidth < 768 ? "0.68" : "0.82");

    currentProgress = lerp(currentProgress, targetProgress, 0.18);
    if (Math.abs(currentProgress - lastAppliedProgress) > 0.002) {
      seekToProgress(currentProgress);
      lastAppliedProgress = currentProgress;
    }

    requestAnimationFrame(tick);
  };

  video.load();
  requestAnimationFrame(tick);
}
