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
// Reuse the opening can: product information shares its sticky stage.
const productPanel = $("#product");

productPanel.classList.add("product-in-hero");
productPanel.querySelectorAll("[data-reveal], [data-reveal-line]").forEach(el => el.classList.add("in-view"));
document.querySelectorAll('a[href="#product"]').forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    const top = heroScroll.getBoundingClientRect().top + window.scrollY + (heroScroll.offsetHeight - hero.offsetHeight) * 0.75;
    window.scrollTo({ top: top,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  });
});
let heroPointerX = window.innerWidth * 0.67;
let heroPointerY = window.innerHeight * 0.47;
let heroLensBaseRadius = clamp(Math.min(window.innerWidth, window.innerHeight) * 0.30, 160, 320);
let heroScrollProgress = 0;

const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

function updateHeroScrollTransition() {
  if (!heroScroll) return;
  const trackRect = heroScroll.getBoundingClientRect();
  const distance = Math.max(1, trackRect.height - hero.offsetHeight);
  heroScrollProgress = clamp(-trackRect.top / distance, 0, 1);
  const expand = smoothstep(0.16, 0.40, heroScrollProgress);
  const heroRect = hero.getBoundingClientRect();
  heroLensBaseRadius = clamp(Math.min(heroRect.width, heroRect.height) * 0.30, 160, 320);
  const centerX = heroRect.width / 2;
  const centerY = heroRect.height / 2;
  const lensX = lerp(heroPointerX - heroRect.left, centerX, expand);
  const lensY = lerp(heroPointerY - heroRect.top, centerY, expand);
  const coverRadius = Math.hypot(heroRect.width, heroRect.height) * 0.62;

  hero.style.setProperty("--lens-x", `${lensX}px`);
  hero.style.setProperty("--lens-y", `${lensY}px`);
  hero.style.setProperty("--lens-radius", `${lerp(heroLensBaseRadius, coverRadius, expand)}px`);
  hero.style.setProperty("--hero-scroll-progress", heroScrollProgress.toFixed(4));
  const infoVisible = heroScrollProgress > 0.50;
  hero.classList.toggle("is-product-info", infoVisible);
  productPanel.inert = !infoVisible;
  productPanel.setAttribute("aria-hidden", String(!infoVisible));
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

/* page progress + tactile micro-interactions */
const pageProgressBar = $("#pageProgressBar");
let progressTicking = false;

function updatePageProgress() {
  const distance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = clamp(window.scrollY / distance, 0, 1);
  pageProgressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
  progressTicking = false;
}

window.addEventListener("scroll", () => {
  if (!progressTicking) {
    progressTicking = true;
    requestAnimationFrame(updatePageProgress);
  }
}, { passive: true });
updatePageProgress();

const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const magneticTargets = $$(".nav-shop, .can-turntable-cta, .shop-buy, .checkout-form button, .footer-form button");

magneticTargets.forEach((target) => {
  target.classList.add("magnetic", "pressable");

  if (isFinePointer() && !reducedMotionPreference.matches) {
    target.addEventListener("pointermove", (event) => {
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.22;
      target.style.setProperty("--magnetic-x", `${x.toFixed(1)}px`);
      target.style.setProperty("--magnetic-y", `${y.toFixed(1)}px`);
      target.classList.add("is-magnetic");
    });
    target.addEventListener("pointerleave", () => {
      target.classList.remove("is-magnetic");
      target.style.setProperty("--magnetic-x", "0px");
      target.style.setProperty("--magnetic-y", "0px");
    });
  }

  target.addEventListener("pointerdown", (event) => {
    if (reducedMotionPreference.matches) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "press-ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    target.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });
});

if (isFinePointer() && !reducedMotionPreference.matches) {
  $$(".product-formula-visual, .can-turntable-visual").forEach((surface) => {
    surface.addEventListener("pointermove", (event) => {
      const rect = surface.getBoundingClientRect();
      const nx = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) - 0.5;
      const ny = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1) - 0.5;
      surface.style.setProperty("--tilt-x", `${(-ny * 3.6).toFixed(2)}deg`);
      surface.style.setProperty("--tilt-y", `${(nx * 4.8).toFixed(2)}deg`);
      surface.classList.add("is-tilting");
    });
    surface.addEventListener("pointerleave", () => {
      surface.classList.remove("is-tilting");
      surface.style.setProperty("--tilt-x", "0deg");
      surface.style.setProperty("--tilt-y", "0deg");
    });
  });
}

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

/* ============================================================
   6. FLAVORS STAGE
   ============================================================ */
const FLAVOR_COLORS = ["176,101,63", "217,160,91", "140,91,95", "111,143,80", "207,174,60", "180,110,71", "45,117,78"];
const coffeeCount = $$(".flavor-pane").length;
let currentFlavor = 0;

function setFlavor(i) {
  if (i === currentFlavor) return;
  currentFlavor = i;

  $$(".flavor-pane").forEach((p, idx) => p.classList.toggle("is-active", idx === i));
  $$(".flavor-tint").forEach((t, idx) => t.classList.toggle("is-active", idx === i));
  $$(".flavor-numeral").forEach((n, idx) => n.classList.toggle("is-active", idx === i));
  $$(".flavor-bloom").forEach((b, idx) => b.classList.toggle("is-active", idx === i));
  $$(".flavor-product-photo").forEach((photo, idx) => { photo.classList.toggle("is-active", idx === i); photo.setAttribute("aria-hidden", String(idx !== i)); });
  $(".flavor-counter").textContent = `${i + 1} / ${coffeeCount}`;
  flavorField.setColor(FLAVOR_COLORS[i]);
  $$(".flavor-page").forEach((b, idx) => b.classList.toggle("is-active", idx === i));
}

$$(".flavor-page").forEach((btn) => btn.addEventListener("click", () => setFlavor(Number(btn.dataset.flavorBtn))));

// arrows: keyboard on pagination
$$(".flavor-page").forEach((btn) =>
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") goCoffee(clamp(currentFlavor + 1, 0, coffeeCount - 1));
    if (e.key === "ArrowLeft") goCoffee(clamp(currentFlavor - 1, 0, coffeeCount - 1));
  })
);

/* ============================================================
   7. INSIDE — ingredient pills + mobile deck
   ============================================================ */
const beanSection = $(".bean-section");
const beanTabs = $$("[data-bean-tab]");
const beanData = [
  { name: "100% <br>ARÁBICA", sub: "Coffea arabica", description: "Os cafés especiais Bazilli são 100% Arábica. Produção própria e seleção cuidadosa acompanham o grão, da lavoura até a embalagem.", rows: [["Espécie", "Coffea arabica"], ["Seleção", "Cafés especiais"], ["Produção", "Família Bazilli"]], angle: -12 },
  { name: "NOSSA <br>ORIGEM", sub: "Caconde · São Paulo", description: "No Sítio Boa Vista do Engano, na Região Vulcânica, a família Bazilli acompanha o cultivo, a colheita, o processamento e a seleção. Uma história que começou em 1916.", rows: [["Local", "Caconde / SP"], ["Sítio", "Boa Vista do Engano"], ["Tradição", "Desde 1916"]], angle: 14 },
  { name: "TORRA <br>ARTESANAL", sub: "A curadoria de Roberta Bazilli", description: "Roberta Bazilli, produtora, Q-Grader e mestre de torra, acompanha a seleção e a torra. O trabalho valoriza as características de cada café.", rows: [["Torra", "Artesanal"], ["Curadoria", "Roberta Bazilli"], ["Perfil", "Varia conforme o lote"]], angle: -26 },
  { name: "SEU <br>RITUAL", sub: "Da moagem à xícara", description: "Em grãos, moa somente a quantidade que vai preparar e ajuste a moagem ao seu método. O café já moído oferece praticidade para o dia a dia.", rows: [["Em grãos", "Moer na hora"], ["Moído", "Pronto para preparar"], ["Conservação", "Bem fechado, longe do calor"]], angle: 8 }
];
function selectBean(index, focus = false) {
  const data = beanData[index];
  beanTabs.forEach((tab, i) => { tab.setAttribute("aria-selected", String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
  $("#bean-name").innerHTML = data.name;
  $("#bean-subtitle").textContent = data.sub;
  $(".bean-count").textContent = `0${index + 1} / 04`;
  $(".bean-description").textContent = data.description;
  $$(".bean-info dl div").forEach((row, i) => { $("dt",row).textContent = data.rows[i][0]; $("dd",row).textContent = data.rows[i][1]; });
  $("#bean-info").setAttribute("aria-labelledby", `bean-tab-${index}`);
  beanSection.style.setProperty("--bean-angle", `${data.angle}deg`);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    [$(".bean-name"), $(".bean-info")].forEach(el => el.animate([{opacity:0,transform:"translateY(14px)"},{opacity:1,transform:"translateY(0)"}], {duration:500,easing:"ease-out"}));
  }
  if (focus) beanTabs[index].focus();
}
beanTabs.forEach((tab,index) => {
  tab.addEventListener("click",()=>selectBean(index));
  tab.addEventListener("keydown",event=>{
    const next=event.key==="ArrowRight"?(index+1)%4:event.key==="ArrowLeft"?(index+3)%4:event.key==="Home"?0:event.key==="End"?3:null;
    if(next!==null){event.preventDefault();selectBean(next,true);}
  });
});
beanSection.addEventListener("pointermove",event=>{
  if(event.pointerType!=="mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r=beanSection.getBoundingClientRect();
  beanSection.style.setProperty("--bean-yaw",`${((event.clientX-r.left)/r.width-.5)*32}deg`);
  beanSection.style.setProperty("--bean-pitch",`${((event.clientY-r.top)/r.height-.5)*-20}deg`);
});
beanSection.addEventListener("pointerleave",()=>{beanSection.style.setProperty("--bean-yaw","0deg");beanSection.style.setProperty("--bean-pitch","0deg");});
new IntersectionObserver(entries=>{beanSection.classList.toggle("bean-visible",entries[0].isIntersecting);},{threshold:.05}).observe(beanSection);

// Present the coffee collection while scrolling; pagination remains a shortcut.
const coffeeSection = $("#flavors");
const coffeeStage = $(".flavors-stage");
const coffeeMotion = matchMedia("(prefers-reduced-motion: reduce)");
let coffeeFrame = 0;
function drawCoffees() {
  coffeeFrame=0;
  if(coffeeMotion.matches) return;
  const rect=coffeeSection.getBoundingClientRect();
  const travel=Math.max(1,coffeeSection.offsetHeight-coffeeStage.offsetHeight);
  const progress=clamp(-rect.top/travel,0,1);
  if(rect.top<=0 && rect.bottom>=coffeeStage.offsetHeight) setFlavor(Math.min(coffeeCount-1,Math.floor(progress*coffeeCount)));
  coffeeSection.style.setProperty("--coffee-progress",String(progress));
}
function queueCoffees(){if(!coffeeFrame)coffeeFrame=requestAnimationFrame(drawCoffees);}
function configureCoffees(){
  coffeeSection.classList.toggle("coffee-scroll",!coffeeMotion.matches);
  coffeeSection.style.height=coffeeMotion.matches?"":`${coffeeStage.offsetHeight+innerHeight*coffeeCount*.85}px`;
  queueCoffees();
}
function goCoffee(index){
  setFlavor(index);
  if(!coffeeMotion.matches){const top=coffeeSection.getBoundingClientRect().top+scrollY;window.scrollTo({top:top+((index+.35)/coffeeCount)*(coffeeSection.offsetHeight-coffeeStage.offsetHeight),behavior:"smooth"});}
}
$$(".flavor-page").forEach((tab,index)=>tab.addEventListener("click",()=>goCoffee(index)));
window.addEventListener("scroll",queueCoffees,{passive:true});
window.addEventListener("resize",configureCoffees);
coffeeMotion.addEventListener("change",configureCoffees);
configureCoffees();

/* ============================================================
   8. STORY SCROLLER (pinned scroll progress)
   ============================================================ */
const historyRoot = $("#storyScroller");
const historyStage = $(".story-pinned");
const historyScenes = $$(".history-scene");
const historyButtons = $$("[data-history-button]");
const historyReduced = matchMedia("(prefers-reduced-motion: reduce)");
historyRoot.style.height = "auto";
historyScenes.forEach((scene,index)=>{scene.id=`history-${index}`;scene.setAttribute("aria-hidden","false");scene.classList.add("is-active");});
function updateHistory() {
 const rect=historyRoot.getBoundingClientRect();
 const progress=clamp(-rect.top/Math.max(1,rect.height-innerHeight),0,1);
 historyStage.style.setProperty("--history-progress",String(progress));
 let active=0,nearest=Infinity;
 historyScenes.forEach((scene,index)=>{
  const box=scene.getBoundingClientRect();
  const distance=Math.abs(box.top+box.height*.45-innerHeight*.5);
  if(distance<nearest){nearest=distance;active=index;}
  const local=clamp((innerHeight-box.top)/(innerHeight+box.height),0,1);
  scene.style.setProperty("--flow-shift",historyReduced.matches?"0px":`${(local-.5)*-64}px`);
  scene.style.setProperty("--flow-turn",historyReduced.matches?"0deg":`${(local-.5)*8}deg`);
 });
 historyButtons.forEach((button,index)=>button.setAttribute("aria-current",index===active?"step":"false"));
}
historyButtons.forEach((button,index)=>button.addEventListener("click",()=>historyScenes[index].scrollIntoView({behavior:historyReduced.matches?"instant":"smooth",block:"start"})));
let historyPending=false;
window.addEventListener("scroll",()=>{if(!historyPending){historyPending=true;requestAnimationFrame(()=>{historyPending=false;updateHistory();});}},{passive:true});
window.addEventListener("resize",updateHistory);historyReduced.addEventListener("change",updateHistory);updateHistory();

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
      heroLensBaseRadius = clamp(Math.min(hr.width, hr.height) * 0.30, 160, 320);
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
    heroLensBaseRadius = clamp(Math.min(rect.width, rect.height) * 0.30, 160, 320);
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
  let interactiveCanPosition = null;
  let dragStartX = 0;
  let dragStartPosition = 0;
  let isDraggingCan = false;

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

  const renderCanPosition = (position, progress = position / Math.max(1, canFrames.length - 1)) => {
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

  const drawCanTurntable = () => {
    canRaf = 0;
    if (reducedMotion.matches || isDraggingCan) return;

    const rect = canTurntable.getBoundingClientRect();
    const travel = Math.max(1, canTurntable.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel, 0, 1);
    interactiveCanPosition = progress * (canFrames.length - 1);
    renderCanPosition(interactiveCanPosition, progress);
  };

  const canVisual = $(".can-turntable-visual", canTurntable);
  const setInteractivePosition = (position) => {
    interactiveCanPosition = clamp(position, 0, canFrames.length - 1);
    renderCanPosition(interactiveCanPosition);
  };

  canVisual.addEventListener("pointerdown", (event) => {
    if (reducedMotion.matches) return;
    isDraggingCan = true;
    dragStartX = event.clientX;
    dragStartPosition = interactiveCanPosition ?? activeCanIndex;
    canVisual.setPointerCapture?.(event.pointerId);
  });
  canVisual.addEventListener("pointermove", (event) => {
    if (!isDraggingCan) return;
    const sensitivity = Math.max(150, canVisual.clientWidth * 0.55);
    setInteractivePosition(dragStartPosition + (event.clientX - dragStartX) / sensitivity * (canFrames.length - 1));
  });
  const endCanDrag = (event) => {
    if (!isDraggingCan) return;
    isDraggingCan = false;
    setInteractivePosition(Math.round(interactiveCanPosition ?? activeCanIndex));
    canVisual.releasePointerCapture?.(event.pointerId);
  };
  canVisual.addEventListener("pointerup", endCanDrag);
  canVisual.addEventListener("pointercancel", endCanDrag);
  canVisual.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setInteractivePosition(Math.round(interactiveCanPosition ?? activeCanIndex) + direction);
  });

  const requestCanDraw = () => {
    if (!canRaf) canRaf = requestAnimationFrame(drawCanTurntable);
  };

  window.addEventListener("scroll", requestCanDraw, { passive: true });
  window.addEventListener("resize", requestCanDraw);
  reducedMotion.addEventListener?.("change", requestCanDraw);
  drawCanTurntable();
}
