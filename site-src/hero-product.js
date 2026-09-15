const hero = document.querySelector("#hero");
const heroInk = document.querySelector("#heroInk");
const heroScroll = document.querySelector("#heroScroll");
const host = document.querySelector("#heroProductScene");
const productPanel = document.querySelector("#product");
const productCopy = document.querySelector(".product-formula-copy");
const canvas = document.querySelector("#heroProductFrames");

if (hero && heroInk && heroScroll && productPanel && host && canvas) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const smoothstep = (edge0, edge1, value) => {
    const x = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
  };

  let pointerX = 0.67;
  let pointerY = 0.47;
  const context = canvas.getContext("2d");
  const frameCount = 72;
  const frames = new Array(frameCount);
  let renderedFrame = -1;
  // Skip the source video's opening hold and frontal hold.
  const activeFrames = [...Array.from({length: 26}, (_, i) => i + 10),
    ...Array.from({length: 23}, (_, i) => i + 49)];
  let targetProgress = 0;
  // Frames come from the existing can rotation, retaining its original alpha.
  function renderFrame() {
    const wanted = activeFrames[Math.round(targetProgress * (activeFrames.length - 1))];
    if (!frames[wanted] || renderedFrame === wanted) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(frames[wanted], 0, 0, canvas.width, canvas.height);
    renderedFrame = wanted;
    canvas.dataset.rotationFrame = String(wanted);
    host.classList.add("is-video-ready");
  }
  const order = activeFrames;
  for (const index of order) {
    const frame = new Image();
    frame.onload = () => { frames[index] = frame; renderFrame(); };
    frame.src = `assets/can-frames/frame-${String(index).padStart(3, "0")}.webp`;
  }

  document.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) return;
    pointerX = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    pointerY = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  }, { passive: true });

  hero.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    const rect = hero.getBoundingClientRect();
    pointerX = clamp((touch.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    pointerY = clamp((touch.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  }, { passive: true });

  const tick = (now) => {
    const rect = hero.getBoundingClientRect();
    const trackRect = heroScroll.getBoundingClientRect();
    const scrollDistance = Math.max(1, trackRect.height - hero.offsetHeight);
    const progress = clamp(-trackRect.top / scrollDistance, 0, 1);
    const expand = smoothstep(0.16, 0.40, progress);
    const settle = smoothstep(0.40, 0.64, progress);
    const reveal = smoothstep(0.50, 0.68, progress);
    const mobile = innerWidth < 768;
    // One pinned stage: no DOM reparenting, coordinate jumps or independent timers.
    const centeredX = lerp(pointerX, 0.5, expand);
    const centeredY = lerp(pointerY, 0.5, expand);
    const targetX = lerp(centeredX, mobile ? 0.5 : 0.73, settle);
    const targetY = lerp(centeredY, mobile ? 0.22 : 0.5, settle);
    // Show a substantial turn while the initial circle is still intact.
    const scrollRotation = 0.5 * clamp(progress / 0.16, 0, 1)
      + 0.5 * clamp((progress - 0.16) / 0.84, 0, 1);
    // In the opening lens, horizontal cursor position scrubs the same frames.
    // Cursor turns the can in both opening and product stages.
    const cursorRotation = clamp((pointerX - 0.15) / 0.70, 0, 1);
    targetProgress = lerp(clamp(cursorRotation * 0.5 + scrollRotation, 0, 1), cursorRotation, settle);
    host.style.setProperty("--product-x", `${targetX * rect.width}px`);
    host.style.setProperty("--product-y", `${targetY * rect.height}px`);
    host.style.setProperty("--product-scale", String(lerp(0.78, 1, expand)));
    host.style.setProperty("--ingredients-opacity", String(reveal));
    host.style.setProperty("--ingredients-offset", `${lerp(36, 0, reveal)}px`);
    productPanel.style.opacity = String(reveal);
    productPanel.style.visibility = reveal > 0 ? "visible" : "hidden";
    if (productCopy) {
      productCopy.style.transform = `translate3d(${lerp(-48, 0, reveal)}px, 0, 0)`;
      productCopy.style.opacity = String(reveal);
    }


    renderFrame();

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
