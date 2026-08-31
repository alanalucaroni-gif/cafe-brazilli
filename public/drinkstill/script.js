/* ============================================================
   CAFÉ BAZILLI — da lavoura à xícara
   JavaScript: preloader, partículas, scroll reveals, stages,
   story scroller, menu, carrinho, cursor
   ============================================================ */

"use strict";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(v.substr(i, 2), 16)).join(",");
};
const isFinePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ============================================================
   1. HERO TIMELINE (preloader → ink circle → bone face → letters)
   ============================================================ */
const hero = $("#hero");
const heroInk = $("#heroInk");
const heroScroll = $("#heroScroll");
let heroPointerX = window.innerWidth * 0.67;
let heroPointerY = window.innerHeight * 0.47;
let heroLensBaseRadius = clamp(Math.min(window.innerWidth, window.innerHeight) * 0.225, 158, 232);
let heroScrollProgress = 0;

const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

function updateHeroScrollTransition() {
  if (!heroScroll) return;
  const trackRect = heroScroll.getBoundingClientRect();
  const distance = Math.max(1, trackRect.height - window.innerHeight);
  heroScrollProgress = clamp(-trackRect.top / distance, 0, 1);
  const expand = smoothstep(0.02, 0.78, heroScrollProgress);
  const heroRect = hero.getBoundingClientRect();
  const centerX = heroRect.width / 2;
  const centerY = heroRect.height / 2;
  const lensX = lerp(heroPointerX - heroRect.left, centerX, expand);
  const lensY = lerp(heroPointerY - heroRect.top, centerY, expand);
  const coverRadius = Math.hypot(heroRect.width, heroRect.height) * 0.62;

  hero.style.setProperty("--lens-x", `${lensX}px`);
  hero.style.setProperty("--lens-y", `${lensY}px`);
  hero.style.setProperty("--lens-radius", `${lerp(heroLensBaseRadius, coverRadius, expand)}px`);
  hero.style.setProperty("--hero-scroll-progress", heroScrollProgress.toFixed(4));
}

window.addEventListener("scroll", updateHeroScrollTransition, { passive: true });
window.addEventListener("resize", updateHeroScrollTransition, { passive: true });
updateHeroScrollTransition();

function startHeroTimeline() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $("#preloader").classList.add("is-done");
    hero.classList.add("is-ink", "is-support", "is-face", "is-word", "is-lens");
    $(".scroll-hint").classList.add("is-playing");
    return;
  }
  setTimeout(() => hero.classList.add("is-ink"), 350);              // dark circle expands
  setTimeout(() => $("#preloader").classList.add("is-done"), 500);  // preloader fades
  setTimeout(() => hero.classList.add("is-support"), 700);          // support column staggers
  setTimeout(() => hero.classList.add("is-face"), 1900);            // bone face wipes up
  setTimeout(() => {
    hero.classList.add("is-word", "is-lens");                     // letters + interactive lens
    $(".scroll-hint").classList.add("is-playing");
  }, 3050);
}

if (document.readyState === "complete") startHeroTimeline();
else window.addEventListener("load", startHeroTimeline);

/* ============================================================
   2. PARTICLE / BOTANICAL CANVAS ENGINE
   ============================================================ */
class ParticleField {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = opts.color || "176,101,63";
    this.baseCount = opts.count || 60;
    this.radius = opts.radius || 1.6;
    this.speed = opts.speed || 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.particles = [];
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth || this.canvas.clientWidth;
    const h = parent.clientHeight || this.canvas.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.spawn();
  }
  spawn() {
    const n = clamp(Math.round(this.baseCount * ((this.w * this.h) / (1200 * 800))), 20, this.baseCount);
    this.particles = Array.from({ length: n }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: (Math.random() * 1.2 + 0.4) * this.radius,
      vy: -(0.05 + Math.random() * 0.25) * this.speed,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.004 + Math.random() * 0.012,
      amp: 3 + Math.random() * 10,
      a: 0.15 + Math.random() * 0.5,
    }));
  }
  setColor(rgb) {
    this.color = rgb;
  }
  draw(t) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const p of this.particles) {
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * 0.18;
      p.y += p.vy;
      if (p.y < -12) { p.y = this.h + 12; p.x = Math.random() * this.w; }
      if (p.x < -12) p.x = this.w + 12;
      if (p.x > this.w + 12) p.x = -12;
      const alpha = p.a * (0.55 + 0.45 * Math.sin(t * 1.2 + p.sway * 3));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${Math.max(0, alpha).toFixed(3)})`;
      ctx.fill();
    }
  }
  start() {
    if (this.raf) return;
    const loop = (t) => {
      this.draw(t / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
}

class Botanical {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = opts.color || "#B0653F";
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth || this.canvas.clientWidth;
    const h = parent.clientHeight || this.canvas.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
  }
  setColor(hex) {
    this.color = hex;
  }
  draw(t) {
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.58;
    const s = Math.min(w, h);

    ctx.save();
    ctx.translate(cx, cy);

    // stem
    ctx.strokeStyle = "rgba(239,237,230,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.20);
    ctx.quadraticCurveTo(Math.sin(t * 0.6) * 6, 0, 0, -s * 0.22);
    ctx.stroke();

    // leaves
    const leafCount = 5;
    for (let i = 0; i < leafCount; i++) {
      const y = -s * 0.20 + i * (s * 0.085);
      const side = i % 2 === 0 ? 1 : -1;
      const sway = Math.sin(t * 0.7 + i * 1.1) * 0.28;
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(side * (0.6 + sway));
      ctx.beginPath();
      ctx.ellipse(s * 0.05, 0, s * 0.09, s * 0.022, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.hexA(0.7 - i * 0.08);
      ctx.fill();
      ctx.restore();
    }

    // tip bud
    ctx.beginPath();
    ctx.arc(0, -s * 0.22, s * 0.018, 0, Math.PI * 2);
    ctx.fillStyle = this.hexA(0.9);
    ctx.fill();

    // outer pulse ring
    const pulse = (t * 0.5) % 1;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.16 + pulse * s * 0.12, 0, Math.PI * 2);
    ctx.strokeStyle = this.hexA(0.28 * (1 - pulse));
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
  hexA(alpha) {
    const rgb = hexToRgb(this.color);
    return `rgba(${rgb},${alpha})`;
  }
  start() {
    if (this.raf) return;
    const loop = (t) => {
      this.draw(t / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
}

const heroField = new ParticleField($("#heroCanvas"), {
  color: "176,101,63",
  count: 70,
  radius: 1.5,
  speed: 1,
});
heroField.start();

const flavorField = new ParticleField($("#flavorsCanvas"), {
  color: "176,101,63",
  count: 55,
  radius: 1.4,
  speed: 0.9,
});
flavorField.start();

const insideBotanical = new Botanical($("#insideCanvas"), { color: "#B0653F" });
insideBotanical.start();

/* ============================================================
   3. NAV — solid on scroll, hide on scroll down
   ============================================================ */
const nav = $("#nav");
let lastScrollY = window.scrollY;
let menuOpen = false;

function onNavScroll() {
  const y = window.scrollY;
  nav.classList.toggle("is-solid", y > 40);
  if (y > 140) {
    nav.classList.toggle("is-hidden", y > lastScrollY && !menuOpen);
  } else {
    nav.classList.remove("is-hidden");
  }
  lastScrollY = y;
}
window.addEventListener("scroll", onNavScroll, { passive: true });
onNavScroll();

/* ============================================================
   4. MOBILE MENU
   ============================================================ */
const menuBtn = $("#menuBtn");
const mobileMenu = $("#mobileMenu");
const menuCloseBtn = $("#menuCloseBtn");

function setMenu(open) {
  menuOpen = open;
  menuBtn.classList.toggle("is-open", open);
  mobileMenu.classList.toggle("is-open", open);
  mobileMenu.setAttribute("aria-hidden", String(!open));
  menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  document.body.style.overflow = open ? "hidden" : "";
}
menuBtn.addEventListener("click", () => setMenu(true));
menuCloseBtn.addEventListener("click", () => setMenu(false));
$$(".mobile-menu-link, .mobile-menu-shop").forEach((a) => a.addEventListener("click", () => setMenu(false)));

/* ============================================================
   5. SCROLL REVEALS (IntersectionObserver)
   ============================================================ */
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in-view");
        revealObserver.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
);

$$("[data-reveal], [data-reveal-line]").forEach((el) => {
  if (el.closest(".flavor-pane, .story-chapter")) return;
  revealObserver.observe(el);
});

// inside section: reveal wordmark, plant draw and details on first entry
const insideSec = $("#inside");
const insideRevealObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        $(".inside-wordmark", insideSec).classList.add("is-in");
        $(".inside-plant", insideSec).classList.add("is-in");
        $(".inside-details", insideSec).classList.add("in");
        insideRevealObserver.disconnect();
      }
    }
  },
  { threshold: 0.3 }
);
insideRevealObserver.observe(insideSec);

// deck cards (inside, mobile) observed within horizontal scroller
const deck = $("#insideDeck");
const deckCardObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in-view");
        deckCardObserver.unobserve(e.target);
      }
    }
  },
  { root: deck, threshold: 0.55 }
);
$$(".deck-card", deck).forEach((c) => deckCardObserver.observe(c));

/* ============================================================
   6. FLAVORS STAGE
   ============================================================ */
const FLAVOR_COLORS = ["176,101,63", "217,160,91", "140,91,95"];
let currentFlavor = 0;

function setFlavor(i) {
  if (i === currentFlavor) return;
  currentFlavor = i;

  $$(".flavor-pane").forEach((p, idx) => p.classList.toggle("is-active", idx === i));
  $$(".flavor-tint").forEach((t, idx) => t.classList.toggle("is-active", idx === i));
  $$(".flavor-numeral").forEach((n, idx) => n.classList.toggle("is-active", idx === i));
  $$(".flavor-bloom").forEach((b, idx) => b.classList.toggle("is-active", idx === i));
  $(".flavor-counter").textContent = `${i + 1} / 3`;
  flavorField.setColor(FLAVOR_COLORS[i]);
  $$(".flavor-page").forEach((b, idx) => b.classList.toggle("is-active", idx === i));
}

$$(".flavor-page").forEach((btn) => btn.addEventListener("click", () => setFlavor(Number(btn.dataset.flavorBtn))));

// arrows: keyboard on pagination
$$(".flavor-page").forEach((btn) =>
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") setFlavor(clamp(currentFlavor + 1, 0, 2));
    if (e.key === "ArrowLeft") setFlavor(clamp(currentFlavor - 1, 0, 2));
  })
);

/* ============================================================
   7. INSIDE — ingredient pills + mobile deck
   ============================================================ */
const INGREDIENTS = [
  {
    wm: ["TERRA", "VULCÂNICA"],
    latin: "Coffea arábica",
    color: "#B0653F",
    rgb: "176,101,63",
    index: "01 / 04",
    desc: "Cafeeiros cultivados em solo vulcânico a cerca de 1.000 m de altitude, em Caconde/SP. A base de tudo: terroir de origem controlada.",
    source: "Região Vulcânica · Caconde/SP",
    role: "Base de sabor",
    dose: "40% do perfil",
    frac: 0.4,
  },
  {
    wm: ["COLHEITA", "SELETIVA"],
    latin: "Cerejas maduras",
    color: "#D9A05B",
    rgb: "217,160,91",
    index: "02 / 04",
    desc: "A seleção começa no campo. Apenas frutos no ponto ideal seguem para o processamento e revelam doçura, limpeza e identidade.",
    source: "Seleção manual",
    role: "Doçura e uniformidade",
    dose: "30% do perfil",
    frac: 0.3,
  },
  {
    wm: ["TORRA", "ARTESANAL"],
    latin: "Pequenos lotes",
    color: "#8C5B5F",
    rgb: "140,91,95",
    index: "03 / 04",
    desc: "Cada lote recebe uma curva de torra própria para equilibrar aroma, acidez, corpo e finalização sem esconder a origem.",
    source: "Torrefação Bazilli",
    role: "Expressão sensorial",
    dose: "20% do perfil",
    frac: 0.2,
  },
  {
    wm: ["CONTROLE", "DE QUALIDADE"],
    latin: "Da lavoura à xícara",
    color: "#46624B",
    rgb: "70,98,75",
    index: "04 / 04",
    desc: "Rastreabilidade, prova e consistência acompanham o café em todas as etapas até ele chegar fresco à sua xícara.",
    source: "Sítio Boa Vista do Engano",
    role: "Consistência e frescor",
    dose: "10% do perfil",
    frac: 0.1,
  },
];

let currentIngredient = 0;

function setIngredient(i) {
  if (i === currentIngredient) return;
  currentIngredient = i;
  const ing = INGREDIENTS[i];

  // pills
  $$(".pill").forEach((p, idx) => p.classList.toggle("is-active", idx === i));

  // wordmark + plant draw
  const wm = $(".inside-wordmark");
  $(".wm-line-1", wm).textContent = ing.wm[0];
  $(".wm-line-2", wm).textContent = ing.wm[1];
  wm.classList.remove("is-in");
  $(".inside-plant").classList.remove("is-in");
  void wm.offsetWidth;
  wm.classList.add("is-in");
  $(".inside-plant").classList.add("is-in");
  $(".inside-latin").textContent = ing.latin;

  // visual
  $(".inside-glow").style.setProperty("--ing-color", ing.color);
  insideBotanical.setColor(ing.color);

  // details swap
  const details = $(".inside-details");
  details.classList.remove("in");
  details.classList.add("swapping");
  setTimeout(() => {
    $(".ing-index", details).textContent = ing.index;
    $(".ing-desc", details).textContent = ing.desc;
    const rows = $$(".ing-row", details);
    rows[0].querySelector("dt").textContent = "Origem";
    rows[0].querySelector("dd").textContent = ing.source;
    rows[1].querySelector("dt").textContent = "Papel";
    rows[1].querySelector("dd").textContent = ing.role;
    rows[2].querySelector("dt").textContent = "Na xícara";
    rows[2].querySelector("dd").childNodes[0].textContent = `${ing.dose} `;
    const fill = $("[data-dose-fill]", details);
    fill.style.setProperty("--dose", String(ing.frac));
    details.classList.remove("swapping");
    details.classList.add("in");
  }, 340);
}

$$(".pill").forEach((p) => p.addEventListener("click", () => setIngredient(Number(p.dataset.ingPill))));

// mobile deck scroll → pagination sync
const deckPages = $$(".deck-page");
function updateDeckPagination() {
  const cards = $$(".deck-card", deck);
  let active = 0;
  cards.forEach((c, idx) => {
    const r = c.getBoundingClientRect();
    if (r.left <= window.innerWidth * 0.5) active = idx;
  });
  deckPages.forEach((p, idx) => p.classList.toggle("is-active", idx === active));
}
deck.addEventListener("scroll", updateDeckPagination, { passive: true });
window.addEventListener("resize", updateDeckPagination);
deckPages.forEach((p) =>
  p.addEventListener("click", () => {
    const cards = $$(".deck-card", deck);
    cards[Number(p.dataset.deckBtn)].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  })
);

/* ============================================================
   8. STORY SCROLLER (pinned scroll progress)
   ============================================================ */
const CHAPTERS = 5;
const storyScroller = $("#storyScroller");
const storyPinned = $(".story-pinned");
let storyProgress = 0;
let currentChapter = -1;

storyScroller.style.height = `${CHAPTERS * 100}vh`;

function setChapter(i) {
  if (i === currentChapter) return;
  currentChapter = i;

  $$(".story-chapter").forEach((c, idx) => {
    const on = idx === i;
    c.classList.remove("is-active");
    if (on) {
      void c.offsetWidth; // reflow to replay entry animations
      c.classList.add("is-active");
    }
  });
  $$(".story-image-panel").forEach((p, idx) => p.classList.toggle("is-active", idx === i));
  $$(".story-year-bg").forEach((y, idx) => y.classList.toggle("is-active", idx === i));
  $$(".story-year-btn").forEach((b, idx) => b.classList.toggle("is-active", idx === i));
}

function onStoryProgress() {
  const rect = storyScroller.getBoundingClientRect();
  const vh = window.innerHeight;
  if (rect.bottom < 0 || rect.top > vh) return;

  const scrolled = clamp(-rect.top, 0, rect.height - vh);
  storyProgress = scrolled / (rect.height - vh);

  // intro overlay: visible at start, fades as first chapter takes over
  const intro = $(".story-intro");
  const stage = $(".story-stage");
  const introEnd = 1 / CHAPTERS;
  if (storyProgress < introEnd) {
    intro.style.opacity = String(1 - storyProgress / introEnd);
    intro.style.transform = `translateY(${-storyProgress * 60}px)`;
    stage.style.opacity = String(storyProgress / introEnd);
  } else {
    intro.style.opacity = "0";
    stage.style.opacity = "1";
  }

  // progress rail
  $("#storyRailFill").style.transform = `scaleY(${storyProgress})`;

  // chapter index
  const chapter = clamp(Math.floor(storyProgress * CHAPTERS), 0, CHAPTERS - 1);
  setChapter(chapter);
}

function scrollStoryToChapter(i) {
  const rectTop = storyScroller.getBoundingClientRect().top + window.scrollY;
  const max = storyScroller.offsetHeight - window.innerHeight;
  window.scrollTo({ top: rectTop + ((i + 0.5) / CHAPTERS) * max, behavior: "smooth" });
}
$$(".story-year-btn").forEach((b) =>
  b.addEventListener("click", () => scrollStoryToChapter(Number(b.dataset.yearBtn || b.dataset.yearBtnM)))
);

let storyTicking = false;
window.addEventListener(
  "scroll",
  () => {
    if (!storyTicking) {
      requestAnimationFrame(() => {
        onStoryProgress();
        storyTicking = false;
      });
      storyTicking = true;
    }
  },
  { passive: true }
);
onStoryProgress();

/* ============================================================
   9. PONTOS DE VENDA — acordeão mobile + cursor contextual
   ============================================================ */
$$(".stockist-col").forEach((col) => {
  const head = $(".stockist-head", col);
  head.addEventListener("click", () => {
    if (window.innerWidth >= 768) return;
    const wasOpen = col.classList.contains("is-open");
    $$(".stockist-col").forEach((c) => c.classList.remove("is-open"));
    if (!wasOpen) col.classList.add("is-open");
  });
});

const pouringTip = $("#pouringTip");
const ptBloom = $("#ptBloom");
const ptLabel = $("#ptLabel");
if (isFinePointer()) {
  let tipCol = null;
  document.addEventListener("mouseover", (e) => {
    const col = e.target.closest(".stockist-col");
    if (col && col !== tipCol) {
      tipCol = col;
      const city = col.dataset.city;
      ptBloom.style.setProperty("--pt-c", col.dataset.cityColor);
      ptLabel.textContent = `Servindo em ${city}`;
      pouringTip.classList.add("is-visible");
    } else if (!col) {
      tipCol = null;
      pouringTip.classList.remove("is-visible");
    }
  });
  document.addEventListener("mousemove", (e) => {
    if (!tipCol) return;
    pouringTip.style.left = e.clientX + "px";
    pouringTip.style.top = e.clientY + "px";
  });
  document.addEventListener("mouseleave", () => {
    tipCol = null;
    pouringTip.classList.remove("is-visible");
  });
}

/* ============================================================
   10. CUSTOM CURSOR + HERO SPOTLIGHT
   ============================================================ */
if (isFinePointer()) {
  const dot = $("#cursorDot");
  const ring = $("#cursorRing");
  const spotlight = $("#heroSpotlight");
  const fallbackFrames = $$('[data-product-fallback]');
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my, sx = mx, sy = my;
  let inHero = false;
  let hoverTarget = null;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + "px";
    dot.style.top = my + "px";
    dot.style.opacity = "1";
    ring.style.opacity = "1";

    // hero spotlight detection
    const hr = hero.getBoundingClientRect();
    inHero = mx >= hr.left && mx <= hr.right && my >= hr.top && my <= hr.bottom;
    if (inHero && hero.classList.contains("is-word")) {
      const nx = clamp((mx - hr.left) / Math.max(1, hr.width), 0, 0.999);
      const ny = clamp((my - hr.top) / Math.max(1, hr.height), 0, 1);
      heroPointerX = mx;
      heroPointerY = my;
      heroLensBaseRadius = clamp(Math.min(hr.width, hr.height) * 0.225, 158, 232);
      updateHeroScrollTransition();
      hero.style.setProperty("--fallback-x", `${clamp(nx * 100, 10, 90)}%`);
      hero.style.setProperty("--fallback-y", `${clamp(ny * 100, 16, 84)}%`);
      hero.style.setProperty("--fallback-tilt", `${((nx - 0.5) * 7).toFixed(2)}deg`);
      const framePosition = nx * Math.max(0, fallbackFrames.length - 1);
      fallbackFrames.forEach((frame, index) => {
        frame.style.opacity = String(clamp(1 - Math.abs(framePosition - index), 0, 1));
      });
    }

    // interactive hover
    const target = e.target.closest("a, button, .stockist-list a, [data-add-to-cart]");
    if (target !== hoverTarget) {
      hoverTarget = target;
      ring.classList.toggle("is-hover", Boolean(target));
    }
  });

  document.addEventListener("mouseleave", () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
    spotlight.style.opacity = "0";
  });

  (function cursorLoop() {
    rx = lerp(rx, mx, 0.22);
    ry = lerp(ry, my, 0.22);
    ring.style.left = rx + "px";
    ring.style.top = ry + "px";
    if (inHero) {
      sx = lerp(sx, mx, 0.08);
      sy = lerp(sy, my, 0.08);
      spotlight.style.opacity = "1";
      spotlight.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%) scale(${1 + heroScrollProgress * 0.7})`;
    } else {
      spotlight.style.opacity = "0";
    }
    requestAnimationFrame(cursorLoop);
  })();
}

if (!isFinePointer()) {
  const fallbackFrames = $$('[data-product-fallback]');
  const moveHeroLensFromTouch = (event) => {
    const rect = hero.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    const nx = x / Math.max(1, rect.width);
    heroPointerX = event.clientX;
    heroPointerY = event.clientY;
    heroLensBaseRadius = clamp(Math.min(rect.width, rect.height) * 0.29, 132, 210);
    updateHeroScrollTransition();
    const framePosition = nx * Math.max(0, fallbackFrames.length - 1);
    fallbackFrames.forEach((frame, index) => {
      frame.style.opacity = String(clamp(1 - Math.abs(framePosition - index), 0, 1));
    });
  };

  hero.addEventListener("pointerdown", moveHeroLensFromTouch);
  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") moveHeroLensFromTouch(event);
  });
}

/* ============================================================
   11. CART DRAWER + CHECKOUT MODAL
   ============================================================ */
const cart = $("#cartDrawer");
const cartOverlay = $("#cartOverlay");
const checkoutModal = $("#checkoutModal");
const checkoutOverlay = $("#checkoutOverlay");

function openCart() {
  cart.classList.add("is-open");
  cartOverlay.classList.add("is-open");
  cart.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  cart.classList.remove("is-open");
  cartOverlay.classList.remove("is-open");
  cart.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function openCheckout() {
  checkoutModal.classList.add("is-open");
  checkoutOverlay.classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeCheckout() {
  checkoutModal.classList.remove("is-open");
  checkoutOverlay.classList.remove("is-open");
  document.body.style.overflow = "";
}

$("#cartOpenBtn").addEventListener("click", openCart);
$("#cartCloseBtn").addEventListener("click", closeCart);
$("#cartContinueBtn").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

$$("[data-add-to-cart]").forEach((b) => b.addEventListener("click", () => openCheckout()));
$("#checkoutCloseBtn").addEventListener("click", closeCheckout);
checkoutOverlay.addEventListener("click", closeCheckout);
$("#checkoutStockists").addEventListener("click", closeCheckout);

// pack pills (4-pack / 12-pack toggle)
$$(".pack-pill").forEach((p) =>
  p.addEventListener("click", () => {
    const group = p.parentElement;
    $$(".pack-pill", group).forEach((x) => x.classList.remove("is-active"));
    p.classList.add("is-active");
  })
);

// forms
$("#footerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#footer-email");
  if (!input.value || !input.checkValidity()) {
    $("#footerStatus").textContent = "Digite um endereço de e-mail válido.";
    return;
  }
  $("#footerStatus").textContent = "Obrigado — avisaremos quando houver novidades.";
  input.value = "";
});

$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#checkout-email");
  if (!email.value || !email.checkValidity()) return;
  checkoutModal.innerHTML = `
    <button type="button" class="checkout-close" id="checkoutCloseBtn2" aria-label="Fechar">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5 L19 19 M19 5 L5 19"></path></svg>
    </button>
    <div class="checkout-eyebrow">Loja online</div>
    <h3 class="checkout-title font-display">Você está na lista.</h3>
    <p class="checkout-copy">Vamos avisar ${email.value.trim()} assim que os pedidos estiverem disponíveis para sua região.</p>`;
  $("#checkoutCloseBtn2").addEventListener("click", closeCheckout);
});

// ESC closes overlays
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (checkoutModal.classList.contains("is-open")) closeCheckout();
    else if (cart.classList.contains("is-open")) closeCart();
    else setMenu(false);
  }
});

/* ============================================================
   12. CAFÉ BAZILLI — SCROLL-DRIVEN CAN TURNTABLE
   ============================================================ */
const canTurntable = $("#cold-brew");

if (canTurntable && !canTurntable.hidden) {
  const canFrames = $$("[data-can-frame]", canTurntable);
  const canCopies = $$("[data-can-copy]", canTurntable);
  const canCounter = $("[data-can-counter]", canTurntable);
  const canProgress = $("[data-can-progress]", canTurntable);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let canRaf = 0;
  let activeCanIndex = 0;

  const setActiveCanCopy = (index) => {
    if (index === activeCanIndex) return;
    activeCanIndex = index;
    canCopies.forEach((copy, i) => {
      const active = i === index;
      copy.classList.toggle("is-active", active);
      copy.setAttribute("aria-hidden", String(!active));
    });
    canCounter.textContent = String(index + 1).padStart(2, "0");
  };

  const drawCanTurntable = () => {
    canRaf = 0;
    if (reducedMotion.matches) return;

    const rect = canTurntable.getBoundingClientRect();
    const travel = Math.max(1, canTurntable.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel, 0, 1);
    const position = progress * (canFrames.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(canFrames.length - 1, Math.ceil(position));
    const mix = position - lower;

    canFrames.forEach((frame, index) => {
      let opacity = 0;
      if (index === lower) opacity = 1 - mix;
      if (index === upper) opacity = Math.max(opacity, mix || 1);
      const distance = Math.abs(index - position);
      frame.style.opacity = opacity.toFixed(3);
      frame.style.transform = `translateY(${Math.min(18, distance * 12).toFixed(1)}px) scale(${(1 - Math.min(0.018, distance * 0.012)).toFixed(3)})`;
      frame.classList.toggle("is-active", opacity > 0.01);
      frame.setAttribute("aria-hidden", String(opacity <= 0.01));
    });

    canProgress.style.transform = `scaleX(${progress.toFixed(4)})`;
    setActiveCanCopy(Math.round(position));
  };

  const requestCanDraw = () => {
    if (!canRaf) canRaf = requestAnimationFrame(drawCanTurntable);
  };

  window.addEventListener("scroll", requestCanDraw, { passive: true });
  window.addEventListener("resize", requestCanDraw);
  reducedMotion.addEventListener?.("change", requestCanDraw);
  drawCanTurntable();
}
