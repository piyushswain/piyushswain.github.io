import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/* ==========================================================================
   Griffin P1 — page behaviour
   Sections: theme, orbit-trail background (Three.js), feature carousel,
   GriffinOS panel, Ember Run mini-game, reserve form.
   ========================================================================== */

const root = document.body;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------------------------------- */
/* Theme                                                                 */
/* -------------------------------------------------------------------- */

const THEME_KEY = "griffin-p1-theme";
const themeToggle = document.getElementById("themeToggle");

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
  themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
  document.dispatchEvent(new CustomEvent("griffin:theme", { detail: { theme } }));
}

applyTheme(localStorage.getItem(THEME_KEY) || systemTheme());

themeToggle.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* -------------------------------------------------------------------- */
/* Three.js claw field — the background is the signature: talons tear   */
/* across the scene in bursts, not a generic ambient particle drift.    */
/* -------------------------------------------------------------------- */

/* three tapered prongs sharing one profile, built once and reused by  */
/* every claw instance (positioned/rotated/scaled per swipe)           */
function buildProngGeometry() {
  const profile = [
    { x: 0, hw: 0.015, c: "#3a1c0e" },
    { x: 0.22, hw: 0.055, c: "#c9410c" },
    { x: 0.52, hw: 0.1, c: "#ff6a1a" },
    { x: 0.84, hw: 0.11, c: "#ffb35c" },
    { x: 1, hw: 0, c: "#ffb35c" },
  ];
  const positions = [];
  const colors = [];
  const col = new THREE.Color();
  profile.forEach((p) => {
    col.set(p.c);
    positions.push(p.x, p.hw, 0, p.x, -p.hw, 0);
    colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
  });
  const index = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    index.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

function easeOutBack(t) {
  const c1 = 1.7, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function makeClaw(scene, geometry, spread) {
  const group = new THREE.Group();
  const prongs = [-1, 0, 1].map((i) => {
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = i * spread;
    mesh.position.z = Math.random() * 0.4;
    group.add(mesh);
    return mesh;
  });
  scene.add(group);

  let state = "idle";
  let t = 0;
  let delay = 1 + Math.random() * 4;
  let length = 6;

  // steep tear, always more than 60° off horizontal — a claw never rakes flat
  function randomSteepAngle() {
    const deg = 60 + Math.random() * 30;
    const rad = (deg * Math.PI) / 180;
    return (Math.random() < 0.5 ? rad : -rad) + (Math.random() < 0.5 ? Math.PI : 0);
  }

  function trigger(originBounds) {
    state = "active";
    t = 0;
    length = 4 + Math.random() * 3.5;
    group.position.set(
      originBounds.ox + (Math.random() - 0.5) * originBounds.x,
      originBounds.oy + (Math.random() - 0.5) * originBounds.y,
      (Math.random() - 0.5) * 4
    );
    group.rotation.z = randomSteepAngle();
    prongs.forEach((m, i) => (m.scale.set(length * (0.86 + i * 0.07), 1, 1)));
  }

  const SNAP = 0.16, HOLD = 0.35, FADE = 0.6;
  const TOTAL = SNAP + HOLD + FADE;

  return {
    update(dt, originBounds) {
      if (state === "idle") {
        t += dt;
        if (t >= delay) trigger(originBounds);
        return;
      }
      t += dt;
      let opacity, growth;
      if (t < SNAP) {
        growth = easeOutBack(t / SNAP);
        opacity = 1;
      } else if (t < SNAP + HOLD) {
        growth = 1;
        opacity = 1;
      } else if (t < TOTAL) {
        growth = 1;
        opacity = 1 - (t - SNAP - HOLD) / FADE;
      } else {
        state = "idle";
        t = 0;
        delay = 2.5 + Math.random() * 5;
        opacity = 0;
        growth = 0;
      }
      prongs.forEach((m) => { m.material.opacity = Math.max(0, opacity) * 0.4; });
      group.scale.set(growth, 1, 1);
    },
  };
}

(function clawField() {
  const canvas = document.getElementById("orbit-field");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 22);

  function repaintBlend() {
    // additive glow reads well over the dark theme's transparent canvas;
    // MultiplyBlending doesn't work here since it multiplies against the
    // canvas's own (transparent) pixels, not the cream page behind it —
    // so light mode needs ordinary alpha blending instead
    const additive = root.dataset.theme !== "light";
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
        obj.material.needsUpdate = true;
      }
    });
  }
  document.addEventListener("griffin:theme", repaintBlend);

  const geometry = buildProngGeometry();
  // one claw per screen sector, so simultaneous tears never land close together
  const sectors = [
    { x: [-16, -5], y: [-9, 9] },
    { x: [5, 16], y: [-9, 9] },
    { x: [-6, 6], y: [-9, -2] },
    { x: [-6, 6], y: [2, 9] },
  ];
  const claws = sectors.map((sector) => ({
    claw: makeClaw(scene, geometry, 0.55 + Math.random() * 0.15),
    bounds: { x: sector.x[1] - sector.x[0], y: sector.y[1] - sector.y[0], ox: (sector.x[0] + sector.x[1]) / 2, oy: (sector.y[0] + sector.y[1]) / 2 },
  }));
  repaintBlend();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    const dt = reduceMotion ? 0 : Math.min(clock.getDelta(), 0.05);

    claws.forEach(({ claw, bounds }) => claw.update(dt, bounds));

    camera.position.x += (pointer.x * 3 - camera.position.x) * 0.02;
    camera.position.y += (-pointer.y * 2 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  frame();
})();

/* -------------------------------------------------------------------- */
/* Library — one set of game icons, reused in the marquee panel and the  */
/* GriffinOS Universal Library screen.                                   */
/* -------------------------------------------------------------------- */

const GLYPHS = {
  flame: '<path d="M24 6c4 8-6 10-6 18a6 6 0 0 0 12 0c0-4-3-5-3-9 4 2 6 6 6 11a9 9 0 0 1-18 0c0-10 9-12 9-20z"/>',
  claw: '<path d="M14 8l4 32"/><path d="M24 6l3 34"/><path d="M34 8l-4 32"/>',
  chevron: '<path d="M8 34l14-20 6 8 12-16"/><path d="M30 8h10v10"/>',
  moon: '<path d="M30 8a16 16 0 1 0 10 26A13 13 0 0 1 30 8z"/>',
  stack: '<rect x="12" y="10" width="24" height="8" rx="2"/><rect x="12" y="20" width="24" height="8" rx="2"/><rect x="12" y="30" width="24" height="8" rx="2"/>',
  anvil: '<path d="M9 30h11l4-6h9l4 6v4H9z"/><rect x="20" y="34" width="8" height="8"/>',
  portal: '<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="6"/>',
  bolt: '<path d="M26 6 12 26h10l-4 16 18-22H26z"/>',
  shield: '<path d="M24 6l14 6v10c0 10-6 16-14 20-8-4-14-10-14-20V12z"/>',
  wing: '<path d="M6 30c8-2 14-10 18-22 4 12 10 20 18 22-8 4-14 2-18-6-4 8-10 10-18 6z"/>',
  ball: '<circle cx="24" cy="24" r="15"/><path d="M24 14l7 5-3 8h-8l-3-8z"/><path d="M24 14V9M17 19l-6-2M31 19l6-2M19 27l-3 6M29 27l3 6"/>',
  hoop: '<circle cx="24" cy="24" r="15"/><path d="M11 24h26M15 13c4 5 4 17 0 22M33 13c-4 5-4 17 0 22"/>',
  skyline: '<path d="M6 40V22h6V14h6v10h4V10h6v14h4V18h6v8h6v14z"/>',
  pillar: '<path d="M10 10h28M14 10v26M20 10v26M28 10v26M34 10v26M8 40h32"/>',
};

const GRADIENTS = [
  ["#ff6a1a", "#c9410c"],
  ["#ffb35c", "#ff6a1a"],
  ["#c9410c", "#7a3517"],
  ["#ff8a49", "#c9410c"],
  ["#ffcf94", "#ff8a49"],
];

const GAMES = [
  { name: "Ember Run", glyph: "flame" },
  { name: "Talon Trials", glyph: "claw" },
  { name: "Canyon Drift", glyph: "chevron" },
  { name: "Nightglass", glyph: "moon" },
  { name: "Aerie Stack", glyph: "stack" },
  { name: "Skyforge", glyph: "anvil" },
  { name: "Riftwalker", glyph: "portal" },
  { name: "Voltbound", glyph: "bolt" },
  { name: "Emberkeep", glyph: "shield" },
  { name: "Glasswing", glyph: "wing" },
  { name: "Pitch Kings", glyph: "ball" },
  { name: "Hardcourt", glyph: "hoop" },
  { name: "Freeport", glyph: "skyline" },
  { name: "Old Kingdom", glyph: "pillar" },
].map((g, i) => ({ ...g, gradient: GRADIENTS[i % GRADIENTS.length] }));

function gameIconArt(game) {
  const art = document.createElement("div");
  art.className = "game-icon-art";
  art.style.background = `linear-gradient(150deg, ${game.gradient[0]}, ${game.gradient[1]})`;
  art.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${GLYPHS[game.glyph]}</svg>`;
  return art;
}

function gameIconTile(game) {
  const tile = document.createElement("div");
  tile.className = "game-icon";
  tile.appendChild(gameIconArt(game));
  const name = document.createElement("span");
  name.className = "game-icon-name";
  name.textContent = game.name;
  tile.appendChild(name);

  // hovering a tile pauses only its own row
  tile.addEventListener("mouseenter", () => {
    tile.closest(".icon-track")?.classList.add("is-paused");
  });
  tile.addEventListener("mouseleave", () => {
    tile.closest(".icon-track")?.classList.remove("is-paused");
  });

  return tile;
}

// repeat the row's set enough times that the track is always wider than
// any reasonable viewport — a short set duplicated just once leaves a gap
// of dead space once the panel is wider than that one copy
function buildLibraryRow(trackEl, games) {
  if (!trackEl) return;
  const REPEATS = 6;
  for (let i = 0; i < REPEATS; i++) {
    games.forEach((g) => trackEl.appendChild(gameIconTile(g)));
  }
}

(function libraryPanel() {
  const rowA = document.getElementById("libraryRowA");
  const rowB = document.getElementById("libraryRowB");
  const rowC = document.getElementById("libraryRowC");
  const grid = document.getElementById("osLibGrid");
  if (!rowA) return;

  buildLibraryRow(rowA, GAMES.slice(0, 4));
  buildLibraryRow(rowB, [...GAMES.slice(4, 8)].reverse());
  buildLibraryRow(rowC, GAMES.slice(8, 12));

  if (grid) GAMES.slice(0, 8).forEach((g) => grid.appendChild(gameIconArt(g)));
})();

/* -------------------------------------------------------------------- */
/* Feature carousel                                                      */
/* -------------------------------------------------------------------- */

(function carousel() {
  const track = document.getElementById("carTrack");
  const prev = document.getElementById("carPrev");
  const next = document.getElementById("carNext");
  const dotsWrap = document.getElementById("carDots");
  if (!track) return;

  const cards = Array.from(track.children);
  cards.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.setAttribute("role", "tab");
    dot.addEventListener("click", () => cards[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" }));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function step(dir) {
    const cardWidth = cards[0].getBoundingClientRect().width + 20;
    track.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  }
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = cards.indexOf(entry.target);
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          dots.forEach((d) => d.classList.remove("active"));
          dots[idx]?.classList.add("active");
        }
      });
    },
    { root: track, threshold: [0.6] }
  );
  cards.forEach((c) => observer.observe(c));

  // pointer-drag scrolling for desktop mice
  let isDown = false, startX = 0, startScroll = 0;
  track.addEventListener("pointerdown", (e) => {
    isDown = true;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    track.scrollLeft = startScroll - (e.clientX - startX);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((evt) =>
    track.addEventListener(evt, () => (isDown = false))
  );
})();

/* -------------------------------------------------------------------- */
/* GriffinOS panel                                                       */
/* -------------------------------------------------------------------- */

(function griffinOS() {
  const buttons = Array.from(document.querySelectorAll(".os-feature"));
  const views = Array.from(document.querySelectorAll(".os-view"));
  if (!buttons.length) return;

  function setScreen(name) {
    buttons.forEach((b) => {
      const active = b.dataset.screen === name;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    views.forEach((v) => v.classList.toggle("is-active", v.dataset.view === name));
  }

  buttons.forEach((b) => b.addEventListener("click", () => setScreen(b.dataset.screen)));
  setScreen("home");

  // performance mode mini-interaction
  const perfButtons = Array.from(document.querySelectorAll(".os-perf-mode"));
  const fill = document.getElementById("osPerfFill");
  const fps = document.getElementById("osPerfFps");
  const MODES = { silent: { pct: 35, fps: 45 }, balanced: { pct: 65, fps: 60 }, unleashed: { pct: 100, fps: 120 } };
  perfButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      perfButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = MODES[btn.dataset.mode];
      fill.style.width = mode.pct + "%";
      fps.textContent = mode.fps;
    });
  });
  fill.style.width = MODES.balanced.pct + "%";
})();

/* -------------------------------------------------------------------- */
/* Device screen — a looping showcase reel, not a live game.             */
/* Each entry is a choreographed animation (no input, no win/lose) that  */
/* resets clean every time it comes back around.                        */
/* -------------------------------------------------------------------- */

function backdrop(ctx, W, H) {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#1a0f06");
  grd.addColorStop(1, "#060402");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function clawStroke(ctx, x0, y0, x1, y1, width, alpha) {
  if (alpha <= 0) return;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const profile = [
    { t: 0, w: width * 0.12 },
    { t: 0.22, w: width * 0.55 },
    { t: 0.55, w: width },
    { t: 0.86, w: width * 0.4 },
    { t: 1, w: 0 },
  ];
  ctx.beginPath();
  profile.forEach((p, i) => {
    const px = x0 + dx * p.t + (nx * p.w) / 2;
    const py = y0 + dy * p.t + (ny * p.w) / 2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  for (let i = profile.length - 1; i >= 0; i--) {
    const p = profile[i];
    const px = x0 + dx * p.t - (nx * p.w) / 2;
    const py = y0 + dy * p.t - (ny * p.w) / 2;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(255,106,26,${alpha})`;
  ctx.fill();
}

function makeBootLoop(W, H) {
  const cx = W / 2, cy = H / 2 - 18;

  return {
    label: "GriffinOS",
    reset() {},
    update() {},
    draw(ctx, _W, _H, t) {
      backdrop(ctx, W, H);

      // the mark tears itself into place — the boot moment doubles as the
      // logo reveal, not a generic spinner
      const clawGrow = Math.min(1, t / 0.36);
      const clawEase = 1 - Math.pow(1 - clawGrow, 3);
      [-11, 0, 11].forEach((offsetX, i) => {
        const len = 30 * (0.85 + i * 0.15);
        const sx = cx + offsetX - 4, sy = cy - len / 2;
        const ex = cx + offsetX + 4, ey = cy + len / 2;
        clawStroke(ctx, sx, sy, sx + (ex - sx) * clawEase, sy + (ey - sy) * clawEase, 6, clawEase);
      });

      const wordIn = Math.max(0, Math.min(1, (t - 0.45) / 0.5));
      ctx.globalAlpha = wordIn;
      ctx.fillStyle = "#f5efe6";
      ctx.font = "600 20px 'Unbounded', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GRIFFINOS", cx, cy + 46);
      ctx.globalAlpha = 1;

      const barW = 140;
      const barX = cx - barW / 2;
      const barY = cy + 68;
      ctx.strokeStyle = "rgba(255,106,26,0.3)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX + barW, barY);
      ctx.stroke();

      const fillPhase = Math.max(0, Math.min(1, (t - 1) / 3.2));
      ctx.strokeStyle = "#ff6a1a";
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX + barW * fillPhase, barY);
      ctx.stroke();
    },
  };
}

function makeTetrisLoop(W, H) {
  const cols = 8;
  const cellSize = W / cols;
  const rows = Math.floor(H / cellSize);
  const palette = ["#ff6a1a", "#ff8a49", "#c9410c", "#ffb35c"];
  let grid, fall, dropTimer, flash;

  function newPiece() {
    const col = Math.floor(Math.random() * cols);
    return { col, row: -1, color: palette[Math.floor(Math.random() * palette.length)] };
  }

  // the piece only ever tracks its own column's stack height, so it can
  // never land floating above a gap or overlap a neighboring column
  function landingRow(col) {
    let r = rows - 1;
    while (r >= 0 && grid[r][col]) r--;
    return r;
  }

  function reset() {
    grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    fall = newPiece();
    dropTimer = 0;
    flash = 0;
  }
  reset();

  function lock() {
    const r = landingRow(fall.col);
    if (r < 1) {
      flash = 0.4;
      return reset();
    }
    grid[r][fall.col] = fall.color;

    for (let row = 0; row < rows; row++) {
      if (grid[row].every(Boolean)) {
        flash = 0.25;
        grid.splice(row, 1);
        grid.unshift(Array(cols).fill(null));
      }
    }
    fall = newPiece();
  }

  return {
    label: "Aerie Stack",
    reset,
    update(dt) {
      dropTimer += dt;
      const dropEvery = 0.09;
      if (dropTimer >= dropEvery) {
        dropTimer = 0;
        const target = landingRow(fall.col);
        if (fall.row >= target) lock();
        else fall.row += 1;
      }
      if (flash > 0) flash = Math.max(0, flash - dt);
    },
    draw(ctx) {
      backdrop(ctx, W, H);
      const pad = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!grid[r][c]) continue;
          ctx.fillStyle = grid[r][c];
          ctx.fillRect(c * cellSize + pad, r * cellSize + pad, cellSize - pad * 2, cellSize - pad * 2);
        }
      }
      if (fall.row >= 0) {
        ctx.fillStyle = fall.color;
        ctx.fillRect(fall.col * cellSize + pad, fall.row * cellSize + pad, cellSize - pad * 2, cellSize - pad * 2);
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,227,189,${flash})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}

function startShowcase(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const label = document.getElementById("deviceNowPlaying");
  const reel = [makeBootLoop(W, H), makeTetrisLoop(W, H)];
  const SEGMENT = 5;
  let index = 0;
  let segmentT = 0;
  let localT = 0;
  let last = performance.now();

  reel[0].reset();
  if (label) label.textContent = reel[0].label;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = reduceMotion ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;

    segmentT += dt;
    localT += dt;
    if (segmentT >= SEGMENT) {
      segmentT = 0;
      localT = 0;
      index = (index + 1) % reel.length;
      reel[index].reset();
      if (label) label.textContent = reel[index].label;
    }

    reel[index].update(dt, localT);
    reel[index].draw(ctx, W, H, localT);
  }
  requestAnimationFrame(frame);
}

startShowcase(document.getElementById("gameCanvas"));

/* -------------------------------------------------------------------- */
/* Reserve form                                                          */
/* -------------------------------------------------------------------- */

(function reserve() {
  const form = document.getElementById("reserveForm");
  const nameError = document.getElementById("rNameError");
  const emailError = document.getElementById("rEmailError");
  const pass = document.getElementById("boardingPass");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const nameValid = name.length > 0;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    nameError.textContent = nameValid ? "" : "Tell us who's flying.";
    emailError.textContent = emailValid ? "" : "Enter a valid email address.";
    if (!nameValid) {
      form.name.focus();
      return;
    }
    if (!emailValid) {
      form.email.focus();
      return;
    }

    const seq = Number(sessionStorage.getItem("griffin-manifest") || 182) + 1;
    sessionStorage.setItem("griffin-manifest", String(seq));

    document.getElementById("bpName").textContent = name;
    document.getElementById("bpNumber").textContent = "#" + String(seq).padStart(5, "0");
    document.getElementById("bpRegion").textContent = form.region.value;
    document.getElementById("bpClass").textContent = form.beta.checked ? "Early Access · Beta" : "Early Access";

    form.hidden = true;
    pass.hidden = false;
    pass.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("bpReset").addEventListener("click", () => {
    form.reset();
    nameError.textContent = "";
    emailError.textContent = "";
    pass.hidden = true;
    form.hidden = false;
  });
})();
