// CHRONO-FORGE — Pragmatic-Inspired Grand Clockwork Edition
// Features: Roman Numeral Dial, Floating Gold Sparks, Gem-Inlaid Pointers, Big Win Celebration,
// Autoplay (10/20/50/70/100/500 + Hold Spacebar), Visual Icon Paytable & Detailed Rules Guide

const PAYTABLE = {
  NUT: 0.35,
  SPRING: 0.75,
  GEAR: 1.60,
  SAPPHIRE: 3.20,
  EMERALD: 6.50,
  RUBY: 16.00,
  WILD: 28.00
};

const SYMBOL_INFO = [
  { key: 'WILD',     name: 'Alchemy Core (WILD)', pay: '28.0x', desc: 'Substitutes for any gem or gear. 3 aligned cores pay 28.0x!' },
  { key: 'RUBY',     name: 'Crimson Ruby',        pay: '16.0x', desc: 'Highest paying royal gemstone on 3-ring alignment.' },
  { key: 'EMERALD',  name: 'Forest Emerald',      pay: '6.5x',  desc: 'High-value alchemical emerald.' },
  { key: 'SAPPHIRE', name: 'Royal Sapphire',      pay: '3.2x',  desc: 'Medium-high celestial sapphire.' },
  { key: 'GEAR',     name: 'Brass Cogwheel',      pay: '1.6x',  desc: 'Precision clockwork gear.' },
  { key: 'SPRING',   name: 'Steel Mainspring',    pay: '0.75x', desc: 'Tempered watchmaker spring.' },
  { key: 'NUT',      name: 'Copper Hex Nut',      pay: '0.35x', desc: 'Base mechanical fastener.' },
  { key: 'KEY',      name: 'Golden Time Key (SCATTER)', pay: 'BONUS', desc: 'Land 3 or more Keys anywhere on the 4 pointers to unlock 8 Free Spins!' }
];

// 36-stop virtual rings (96.34% RTP)
const RING_OUTER = [
  'NUT', 'SPRING', 'GEAR', 'NUT', 'SAPPHIRE', 'SPRING',
  'NUT', 'GEAR', 'EMERALD', 'NUT', 'SPRING', 'WILD',
  'NUT', 'GEAR', 'SPRING', 'SAPPHIRE', 'NUT', 'RUBY',
  'SPRING', 'NUT', 'GEAR', 'NUT', 'KEY', 'WILD',
  'NUT', 'GEAR', 'SAPPHIRE', 'SPRING', 'NUT', 'EMERALD',
  'GEAR', 'NUT', 'SPRING', 'NUT', 'RUBY', 'KEY'
];

const RING_MIDDLE = [
  'SPRING', 'NUT', 'GEAR', 'NUT', 'SAPPHIRE', 'SPRING',
  'GEAR', 'NUT', 'EMERALD', 'SPRING', 'NUT', 'WILD',
  'GEAR', 'NUT', 'SPRING', 'NUT', 'SAPPHIRE', 'GEAR',
  'NUT', 'SPRING', 'RUBY', 'NUT', 'KEY', 'WILD',
  'SPRING', 'NUT', 'GEAR', 'NUT', 'SAPPHIRE', 'SPRING',
  'NUT', 'EMERALD', 'GEAR', 'NUT', 'RUBY', 'KEY'
];

const RING_INNER = [
  'NUT', 'GEAR', 'SPRING', 'NUT', 'SAPPHIRE', 'GEAR',
  'NUT', 'SPRING', 'EMERALD', 'NUT', 'GEAR', 'WILD',
  'SPRING', 'NUT', 'GEAR', 'NUT', 'SAPPHIRE', 'SPRING',
  'NUT', 'GEAR', 'RUBY', 'SPRING', 'KEY', 'WILD',
  'GEAR', 'NUT', 'SPRING', 'SAPPHIRE', 'NUT', 'EMERALD',
  'SPRING', 'NUT', 'GEAR', 'NUT', 'RUBY', 'KEY'
];

const MULTIPLIERS = [1, 2, 3, 5, 8, 12, 20, 35, 50, 100];
const POINTER_OFFSETS = [0, 3, 6, 9];
const ROMAN_NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const BET_LEVELS = [0.20, 0.50, 1.00, 2.00, 5.00, 10.00, 25.00, 50.00];
const MAX_WIN_MULT = 5000.0;
const BONUS_BUY_MULT = 100;

// Game State
const state = {
  balance: 1000.00,
  betIdx: 2,
  posOut: 0,
  posMid: 4,
  posIn: 8,
  rotOut: 0,
  rotMid: 0,
  rotIn: 0,
  coreAngle: 0,
  multIdx: 0,
  freeSpins: 0,
  isSpinning: false,
  turbo: false,
  soundOn: true,
  socialMode: false,
  winningPointers: [],
  autoRemaining: 0,
  spaceHoldAuto: false
};

// Floating Gold Dust Particles for Pragmatic-style atmosphere
const particles = Array.from({ length: 38 }, () => ({
  x: Math.random() * 620,
  y: Math.random() * 620,
  r: 1 + Math.random() * 2.2,
  vx: (Math.random() - 0.5) * 0.35,
  vy: -0.2 - Math.random() * 0.45,
  alpha: 0.25 + Math.random() * 0.65
}));

// Procedural Web Audio Synthesizer
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tick(freq = 540, duration = 0.028, vol = 0.07) {
    if (!state.soundOn) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  chime(step = 0) {
    if (!state.soundOn) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    const f = notes[Math.min(step, notes.length - 1)];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  },
  bonusFanfare() {
    if (!state.soundOn) return;
    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
      }, idx * 100);
    });
  }
};

// DOM References
const canvas = document.getElementById('clockwork-canvas');
const ctx = canvas.getContext('2d');
const statusBanner = document.getElementById('status-banner');
const valBalance = document.getElementById('val-balance');
const valBet = document.getElementById('val-bet');
const valWin = document.getElementById('val-win');
const fsCounter = document.getElementById('fs-counter');
const btnSpin = document.getElementById('btn-spin');
const btnAutoplay = document.getElementById('btn-autoplay');
const autoLbl = document.getElementById('auto-lbl');
const autoBadge = document.getElementById('auto-count-badge');
const btnBonusBuy = document.getElementById('btn-bonus-buy');
const autoplayModal = document.getElementById('autoplay-modal');
const buyModal = document.getElementById('buy-modal');
const infoModal = document.getElementById('info-modal');
const bigWinBanner = document.getElementById('big-win-banner');

function getBet() {
  return BET_LEVELS[state.betIdx];
}

function isAutoActive() {
  return state.autoRemaining > 0 || state.spaceHoldAuto;
}

function stopAllAutoplay() {
  state.autoRemaining = 0;
  state.spaceHoldAuto = false;
  updateUI();
}

function updateUI(roundWin = null) {
  const bet = getBet();
  valBalance.textContent = state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  valBet.textContent = bet.toFixed(2);
  if (roundWin !== null) valWin.textContent = roundWin.toFixed(2);
  fsCounter.textContent = state.freeSpins;
  document.getElementById('val-buy-cost').textContent = (bet * BONUS_BUY_MULT).toFixed(2);

  document.querySelectorAll('.mult-step').forEach(el => {
    const idx = parseInt(el.dataset.idx, 10);
    el.classList.toggle('active', idx === Math.min(state.multIdx, MULTIPLIERS.length - 1));
  });

  // Stake.us Social Terminology
  const isSoc = state.socialMode;
  document.getElementById('lbl-balance').textContent = isSoc ? 'COINS' : 'CREDIT';
  document.getElementById('lbl-bet').textContent = isSoc ? 'PLAY' : 'BET';
  document.getElementById('lbl-buy-title').textContent = isSoc ? 'GET FREE SPINS' : 'BUY FREE SPINS';
  document.getElementById('social-toggle').textContent = isSoc ? 'SOCIAL (US)' : 'STANDARD';

  // Autoplay Button State
  if (isAutoActive()) {
    btnAutoplay.classList.add('running');
    autoLbl.textContent = 'STOP AUTO';
    autoBadge.textContent = state.spaceHoldAuto ? 'SPACE HOLD' : `${state.autoRemaining} LEFT`;
  } else {
    btnAutoplay.classList.remove('running');
    autoLbl.textContent = 'AUTOPLAY';
    autoBadge.textContent = '';
  }

  btnBonusBuy.disabled = state.isSpinning || state.freeSpins > 0 || isAutoActive();
}

// ============================================================================
// HIGH-DETAIL GEMSTONE & CLOCKWORK RENDERER
// ============================================================================
function drawGemFacet(c, r, cMain, cLight, cDark, sides = 6) {
  c.save();
  // Outer glow
  c.shadowColor = cMain;
  c.shadowBlur = 10;

  c.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();

  const grad = c.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, cLight);
  grad.addColorStop(0.65, cMain);
  grad.addColorStop(1, cDark);
  c.fillStyle = grad;
  c.fill();

  c.shadowBlur = 0;
  c.lineWidth = 1.6;
  c.strokeStyle = cLight;
  c.stroke();

  // Inner Crown Table
  c.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    const x = Math.cos(a) * (r * 0.5);
    const y = Math.sin(a) * (r * 0.5);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = 'rgba(255,255,255,0.32)';
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 0.8;
  c.stroke();
  c.restore();
}

function drawSymbolIcon(c, type, r) {
  c.save();
  switch (type) {
    case 'RUBY':
      drawGemFacet(c, r * 0.9, '#e11d48', '#fda4af', '#881337', 8);
      break;
    case 'EMERALD':
      drawGemFacet(c, r * 0.88, '#059669', '#6ee7b7', '#064e3b', 6);
      break;
    case 'SAPPHIRE':
      drawGemFacet(c, r * 0.9, '#2563eb', '#93c5fd', '#1e3a8a', 4);
      break;
    case 'WILD': {
      c.shadowColor = '#00f5d4';
      c.shadowBlur = 14;
      const glow = c.createRadialGradient(0, 0, 1, 0, 0, r * 0.95);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.4, '#2dd4bf');
      glow.addColorStop(0.85, '#0d9488');
      glow.addColorStop(1, '#115e59');
      c.beginPath();
      c.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      c.fillStyle = glow;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = 2;
      c.strokeStyle = '#ccfbf1';
      c.stroke();

      c.strokeStyle = '#042f2e';
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(0, 0, r * 0.68, r * 0.24, Math.PI / 4, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(0, 0, r * 0.68, r * 0.24, -Math.PI / 4, 0, Math.PI * 2);
      c.stroke();
      break;
    }
    case 'KEY': {
      c.shadowColor = '#fde047';
      c.shadowBlur = 12;
      const kGrad = c.createLinearGradient(-r, -r, r, r);
      kGrad.addColorStop(0, '#fef9c3');
      kGrad.addColorStop(0.5, '#facc15');
      kGrad.addColorStop(1, '#a16207');
      c.fillStyle = kGrad;
      c.strokeStyle = '#422006';
      c.lineWidth = 1.5;

      c.beginPath();
      c.arc(0, -r * 0.35, r * 0.36, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      c.beginPath();
      c.arc(0, -r * 0.35, r * 0.14, 0, Math.PI * 2);
      c.fillStyle = '#140c05';
      c.fill();

      c.fillStyle = kGrad;
      c.fillRect(-r * 0.1, -r * 0.04, r * 0.2, r * 0.76);
      c.fillRect(r * 0.08, r * 0.34, r * 0.26, r * 0.13);
      c.fillRect(r * 0.08, r * 0.56, r * 0.3, r * 0.13);
      break;
    }
    case 'GEAR': {
      const teeth = 8;
      c.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const rad = i % 2 === 0 ? r * 0.88 : r * 0.62;
        const a = (i * Math.PI) / teeth;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      const gGrad = c.createLinearGradient(-r, -r, r, r);
      gGrad.addColorStop(0, '#fef08a');
      gGrad.addColorStop(0.5, '#eab308');
      gGrad.addColorStop(1, '#854d0e');
      c.fillStyle = gGrad;
      c.fill();
      c.lineWidth = 1.4;
      c.strokeStyle = '#422006';
      c.stroke();
      c.beginPath();
      c.arc(0, 0, r * 0.26, 0, Math.PI * 2);
      c.fillStyle = '#120b05';
      c.fill();
      break;
    }
    case 'SPRING': {
      c.strokeStyle = '#e2e8f0';
      c.lineWidth = 2.8;
      c.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.ellipse(0, i * (r * 0.23), r * 0.52, r * 0.13, -0.18, 0, Math.PI * 2);
        c.stroke();
      }
      break;
    }
    case 'NUT':
    default: {
      drawGemFacet(c, r * 0.82, '#d97706', '#fcd34d', '#78350f', 6);
      c.beginPath();
      c.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      c.fillStyle = '#120b05';
      c.fill();
      break;
    }
  }
  c.restore();
}

// Populate Left Panel Visual Icons & Rules Modal
function initVisualGuides() {
  const listEl = document.getElementById('visual-paytable-list');
  listEl.innerHTML = '';

  SYMBOL_INFO.filter(s => s.key !== 'KEY').forEach(sym => {
    const row = document.createElement('div');
    row.className = 'vpt-row';
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 24;
    miniCanvas.height = 24;
    const mCtx = miniCanvas.getContext('2d');
    mCtx.translate(12, 12);
    drawSymbolIcon(mCtx, sym.key, 11);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = sym.name.replace(' (WILD)', '');
    const payBold = document.createElement('b');
    payBold.textContent = sym.pay;

    row.appendChild(miniCanvas);
    row.appendChild(nameSpan);
    row.appendChild(payBold);
    listEl.appendChild(row);
  });

  // Render Scatter Key mini icon in left panel
  document.querySelectorAll('canvas.mini-sym').forEach(mc => {
    const mCtx = mc.getContext('2d');
    mCtx.translate(mc.width / 2, mc.height / 2);
    drawSymbolIcon(mCtx, mc.dataset.sym, 11);
  });
}

function renderRulesModal() {
  const isSoc = state.socialMode;
  const wagerWord = isSoc ? 'play amount' : 'bet';

  let symCardsHtml = '<div class="rules-sym-grid">';
  SYMBOL_INFO.forEach(s => {
    symCardsHtml += `
      <div class="rules-sym-item">
        <canvas class="modal-sym-icon" data-sym="${s.key}" width="34" height="34"></canvas>
        <div>
          <strong style="color:#ffe28a">${s.name} — ${s.pay}</strong><br/>
          <span style="font-size:0.75rem">${s.desc}</span>
        </div>
      </div>
    `;
  });
  symCardsHtml += '</div>';

  document.getElementById('rules-content').innerHTML = `
    <h3>HOW TO WIN (4 GOLDEN POINTERS)</h3>
    <p>Align <b>3 matching symbols</b> across the Outer, Middle, and Inner gears on any of the 4 Roman Numeral pointers (<b>XII, III, VI, IX</b>). Every winning alignment dissolves the matched gems, advances the right-side <b>Alchemy Multiplier</b> (1x up to 100x), and shifts the gears clockwise (Outer +1, Middle +2, Inner +3) for consecutive cascade wins!</p>
    <h3>SYMBOL GUIDE &amp; PAYTABLE (MULTIPLES OF ${wagerWord.toUpperCase()})</h3>
    ${symCardsHtml}
    <h3>SCATTER &amp; GRAND COMPLICATION FREE SPINS</h3>
    <p>Landing <b>3 or more Golden Time Keys</b> anywhere across the 4 pointers awards <b>8 Free Spins</b> (+3 extra spins on retrigger). During Free Spins, the Alchemy Multiplier <b>never resets</b> between spins. Theoretical RTP: <b>96.34%</b> | Max Win: <b>5,000x</b>.</p>
  `;

  document.querySelectorAll('canvas.modal-sym-icon').forEach(mc => {
    const mCtx = mc.getContext('2d');
    mCtx.translate(17, 17);
    drawSymbolIcon(mCtx, mc.dataset.sym, 15);
  });
}

// ============================================================================
// CORE GAME LOGIC & BIG WIN CELEBRATION
// ============================================================================
function getVisibleRing(ringArray, startPos) {
  const L = ringArray.length;
  const visible = [];
  for (let k = 0; k < 12; k++) {
    visible.push(ringArray[(startPos + k) % L]);
  }
  return visible;
}

function evaluatePointers(sOut, sMid, sIn) {
  let winBase = 0;
  let keyCount = 0;
  const matchedPointers = [];

  for (const p of POINTER_OFFSETS) {
    const a = sOut[p];
    const b = sMid[p];
    const c = sIn[p];

    if (a === 'KEY') keyCount++;
    if (b === 'KEY') keyCount++;
    if (c === 'KEY') keyCount++;

    const syms = [a, b, c];
    if (syms.includes('KEY')) continue;

    const nonWild = syms.filter(s => s !== 'WILD');
    if (nonWild.length === 0) {
      winBase += PAYTABLE.WILD;
      matchedPointers.push(p);
    } else if (new Set(nonWild).size === 1) {
      winBase += PAYTABLE[nonWild[0]];
      matchedPointers.push(p);
    }
  }

  return { winBase, hasWin: matchedPointers.length > 0, keyCount, matchedPointers };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, state.turbo ? ms * 0.35 : ms));
}

async function showBigWinCelebration(amount, mult) {
  if (mult < 15) return;
  const tierEl = document.getElementById('big-win-tier');
  const amtEl = document.getElementById('big-win-amount');
  tierEl.textContent = mult >= 50 ? 'SENSATIONAL WIN!' : (mult >= 25 ? 'MEGA WIN!' : 'BIG WIN!');
  bigWinBanner.classList.remove('hidden');

  const steps = 25;
  for (let i = 1; i <= steps; i++) {
    amtEl.textContent = ((amount * i) / steps).toFixed(2);
    SoundFX.tick(600 + i * 22, 0.02, 0.06);
    await sleep(35);
  }
  await sleep(900);
  bigWinBanner.classList.add('hidden');
}

function animateRotation(durationMs, dirOut, dirMid, dirIn) {
  return new Promise(resolve => {
    const dur = state.turbo ? durationMs * 0.32 : durationMs;
    const start = performance.now();
    const initOut = state.rotOut;
    const initMid = state.rotMid;
    const initIn = state.rotIn;
    let lastTick = 0;

    function frame(now) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      state.rotOut = initOut + dirOut * ease;
      state.rotMid = initMid + dirMid * ease;
      state.rotIn = initIn + dirIn * ease;

      if (now - lastTick > 60) {
        SoundFX.tick(480 + t * 200, 0.022, 0.05);
        lastTick = now;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        state.rotOut = 0;
        state.rotMid = 0;
        state.rotIn = 0;
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function pickBonusTriggerPositions(L) {
  while (true) {
    const o = Math.floor(Math.random() * L);
    const m = Math.floor(Math.random() * L);
    const i = Math.floor(Math.random() * L);
    const res = evaluatePointers(
      getVisibleRing(RING_OUTER, o),
      getVisibleRing(RING_MIDDLE, m),
      getVisibleRing(RING_INNER, i)
    );
    if (res.keyCount >= 3) return { o, m, i };
  }
}

async function handleSpin(isBonusBuy = false) {
  if (state.isSpinning) return;
  const bet = getBet();
  const isFree = state.freeSpins > 0;
  const cost = isBonusBuy ? bet * BONUS_BUY_MULT : (isFree ? 0 : bet);

  if (state.balance < cost) {
    statusBanner.textContent = state.socialMode ? 'INSUFFICIENT COINS' : 'INSUFFICIENT CREDIT';
    stopAllAutoplay();
    return;
  }

  state.isSpinning = true;
  state.winningPointers = [];

  if (isFree) {
    state.freeSpins--;
    statusBanner.textContent = `GRAND COMPLICATION FREE SPIN (${state.freeSpins} LEFT)`;
  } else {
    state.balance -= cost;
    state.multIdx = 0;
    statusBanner.textContent = isBonusBuy ? 'SUMMONING 3+ TIME KEYS...' : 'WINDING CHRONOGRAPH GEARS...';
  }
  updateUI(0);

  const L = RING_OUTER.length;
  if (isBonusBuy) {
    const pos = pickBonusTriggerPositions(L);
    state.posOut = pos.o;
    state.posMid = pos.m;
    state.posIn = pos.i;
  } else {
    state.posOut = Math.floor(Math.random() * L);
    state.posMid = Math.floor(Math.random() * L);
    state.posIn = Math.floor(Math.random() * L);
  }

  await animateRotation(520, Math.PI * 2, -Math.PI * 2, Math.PI * 2);

  let roundTotalMult = 0;
  let step = 0;

  while (step < 25) {
    const sOut = getVisibleRing(RING_OUTER, state.posOut);
    const sMid = getVisibleRing(RING_MIDDLE, state.posMid);
    const sIn = getVisibleRing(RING_INNER, state.posIn);

    const res = evaluatePointers(sOut, sMid, sIn);

    if (step === 0 && res.keyCount >= 3) {
      const award = isFree ? 3 : 8;
      state.freeSpins += award;
      SoundFX.bonusFanfare();
      statusBanner.textContent = `SCATTER TRIGGERED! +${award} GRAND COMPLICATION SPINS!`;
      updateUI(roundTotalMult * bet);
      await sleep(850);
    }

    if (res.hasWin) {
      state.winningPointers = res.matchedPointers;
      SoundFX.chime(state.multIdx);

      const activeMult = MULTIPLIERS[Math.min(state.multIdx, MULTIPLIERS.length - 1)];
      const stepWinMult = res.winBase * activeMult;
      roundTotalMult = Math.min(roundTotalMult + stepWinMult, MAX_WIN_MULT);

      statusBanner.textContent = `ALIGNED! ${res.winBase.toFixed(2)}x × ${activeMult}x ALCHEMY = ${(roundTotalMult * bet).toFixed(2)}`;
      updateUI(roundTotalMult * bet);
      await sleep(580);

      state.multIdx++;
      state.winningPointers = [];
      state.posOut = (state.posOut - 1 + L) % L;
      state.posMid = (state.posMid - 2 + L) % L;
      state.posIn = (state.posIn - 3 + L) % L;

      await animateRotation(300, Math.PI / 6, (Math.PI / 6) * 2, (Math.PI / 6) * 3);
      step++;
    } else {
      break;
    }
  }

  const finalWin = roundTotalMult * bet;
  state.balance += finalWin;
  updateUI(finalWin);

  if (roundTotalMult >= 15) {
    await showBigWinCelebration(finalWin, roundTotalMult);
  }

  if (finalWin > 0) {
    statusBanner.textContent = `ROUND WIN: ${finalWin.toFixed(2)} (${roundTotalMult.toFixed(2)}x)`;
  } else if (state.freeSpins > 0) {
    statusBanner.textContent = `FREE SPINS ACTIVE — ${state.freeSpins} REMAINING`;
  } else {
    statusBanner.textContent = 'PRESS SPIN OR HOLD SPACEBAR FOR AUTO';
  }

  state.isSpinning = false;
  updateUI();

  // Continue Free Spins or Autoplay Loop
  if (state.freeSpins > 0) {
    await sleep(420);
    handleSpin(false);
  } else if (state.spaceHoldAuto) {
    await sleep(220);
    if (state.spaceHoldAuto) handleSpin(false);
  } else if (state.autoRemaining > 0) {
    state.autoRemaining--;
    updateUI();
    await sleep(320);
    if (state.autoRemaining > 0 || state.isSpinning === false && btnAutoplay.classList.contains('running')) {
      if (state.autoRemaining === 0) stopAllAutoplay();
      else handleSpin(false);
    }
  }
}

// ============================================================================
// CONTINUOUS 60FPS CLOCKWORK & AMBIENT PARTICLE RENDER LOOP
// ============================================================================
function drawGearTeeth(c, radius, toothCount, toothDepth, fillStyle) {
  c.beginPath();
  const steps = toothCount * 2;
  for (let i = 0; i < steps; i++) {
    const r = i % 2 === 0 ? radius + toothDepth : radius;
    const a = (i * Math.PI * 2) / steps;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = fillStyle;
  c.fill();
}

function renderLoop() {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  state.coreAngle += state.isSpinning ? 0.09 : 0.012;
  ctx.clearRect(0, 0, w, h);

  // 1. Ambient Sunburst & Floating Gold Particles
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.coreAngle * 0.15);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const rayGrad = ctx.createLinearGradient(0, 0, 305, 0);
    rayGrad.addColorStop(0, 'rgba(255, 210, 100, 0.12)');
    rayGrad.addColorStop(1, 'rgba(255, 210, 100, 0)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(305, -18);
    ctx.lineTo(305, 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < 10) { p.y = 610; p.x = Math.random() * 620; }
    ctx.fillStyle = `rgba(255, 224, 130, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Ornate Roman Numeral Clock Bezel
  ctx.save();
  const bezelGrad = ctx.createRadialGradient(cx, cy, 230, cx, cy, 298);
  bezelGrad.addColorStop(0, '#2a1a0c');
  bezelGrad.addColorStop(0.55, '#c8963e');
  bezelGrad.addColorStop(0.85, '#ffe28a');
  bezelGrad.addColorStop(1, '#4a2e08');
  ctx.beginPath();
  ctx.arc(cx, cy, 296, 0, Math.PI * 2);
  ctx.fillStyle = bezelGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 266, 0, Math.PI * 2);
  ctx.fillStyle = '#120b06';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffe28a';
  ctx.stroke();

  // Roman Numerals around the bezel
  ctx.fillStyle = '#1c1004';
  ctx.font = '900 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 12; k++) {
    const angle = -Math.PI / 2 + (k * Math.PI * 2) / 12;
    const rx = cx + Math.cos(angle) * 281;
    const ry = cy + Math.sin(angle) * 281;
    ctx.fillText(ROMAN_NUMERALS[k], rx, ry);
  }
  ctx.restore();

  // 3. Concentric Clockwork Rings
  const rings = [
    { data: getVisibleRing(RING_OUTER, state.posOut), radius: 224, slotR: 24, rot: state.rotOut, teeth: 48, ringFill: '#291a0d', stroke: '#e0ae53' },
    { data: getVisibleRing(RING_MIDDLE, state.posMid), radius: 158, slotR: 22, rot: state.rotMid, teeth: 36, ringFill: '#1f1309', stroke: '#bd8b37' },
    { data: getVisibleRing(RING_INNER, state.posIn), radius: 95, slotR: 20, rot: state.rotIn, teeth: 24, ringFill: '#150d06', stroke: '#946822' }
  ];

  rings.forEach(ring => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ring.rot);

    drawGearTeeth(ctx, ring.radius + ring.slotR + 2, ring.teeth, 6, ring.stroke);

    ctx.beginPath();
    ctx.arc(0, 0, ring.radius + ring.slotR + 2, 0, Math.PI * 2);
    ctx.fillStyle = ring.ringFill;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = ring.stroke;
    ctx.stroke();

    for (let k = 0; k < 12; k++) {
      const angle = -Math.PI / 2 + (k * Math.PI * 2) / 12;
      const sx = Math.cos(angle) * ring.radius;
      const sy = Math.sin(angle) * ring.radius;
      const symKey = ring.data[k];
      const isPointerSlot = POINTER_OFFSETS.includes(k);

      // Recessed Jewel Socket
      ctx.beginPath();
      ctx.arc(sx, sy, ring.slotR, 0, Math.PI * 2);
      ctx.fillStyle = isPointerSlot ? '#1b140a' : '#0b0704';
      ctx.fill();
      ctx.lineWidth = isPointerSlot ? 2.2 : 1.5;
      ctx.strokeStyle = isPointerSlot ? '#e0ae53' : '#573b14';
      ctx.stroke();

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-ring.rot);
      drawSymbolIcon(ctx, symKey, ring.slotR * 0.86);
      ctx.restore();
    }
    ctx.restore();
  });

  // 4. Center Tourbillon Escapement Core
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fillStyle = '#140c06';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffe28a';
  ctx.stroke();

  ctx.rotate(state.coreAngle);
  ctx.strokeStyle = '#c8963e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-23, -23, 46, 46);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#10f57a';
  ctx.shadowColor = '#10f57a';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();

  // 5. Ruby-Inlaid Alignment Pointers (XII, III, VI, IX)
  POINTER_OFFSETS.forEach(p => {
    const angle = -Math.PI / 2 + (p * Math.PI * 2) / 12;
    const isHit = state.winningPointers.includes(p);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    if (isHit) {
      ctx.fillStyle = 'rgba(16, 245, 122, 0.28)';
      ctx.fillRect(54, -26, 204, 52);
      ctx.strokeStyle = '#10f57a';
      ctx.lineWidth = 3;
      ctx.strokeRect(54, -26, 204, 52);
    }

    ctx.beginPath();
    ctx.moveTo(250, 0);
    ctx.lineTo(292, -14);
    ctx.lineTo(284, 0);
    ctx.lineTo(292, 14);
    ctx.closePath();
    ctx.fillStyle = isHit ? '#10f57a' : '#ffe28a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3b2406';
    ctx.stroke();

    // Small Ruby Jewel on Pointer
    ctx.beginPath();
    ctx.arc(276, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2a55';
    ctx.fill();

    ctx.restore();
  });

  requestAnimationFrame(renderLoop);
}

// ============================================================================
// CONTROLS & KEYBOARD (INCLUDING HOLD-SPACEBAR AUTOPLAY)
// ============================================================================
btnSpin.addEventListener('click', () => {
  if (isAutoActive()) stopAllAutoplay();
  handleSpin(false);
});

document.getElementById('btn-bet-up').addEventListener('click', () => {
  if (!state.isSpinning && state.betIdx < BET_LEVELS.length - 1) {
    state.betIdx++;
    updateUI();
  }
});

document.getElementById('btn-bet-down').addEventListener('click', () => {
  if (!state.isSpinning && state.betIdx > 0) {
    state.betIdx--;
    updateUI();
  }
});

document.getElementById('btn-turbo').addEventListener('click', (e) => {
  state.turbo = !state.turbo;
  e.target.classList.toggle('active-toggle', state.turbo);
});

document.getElementById('btn-sound').addEventListener('click', (e) => {
  state.soundOn = !state.soundOn;
  e.target.textContent = state.soundOn ? '🔊' : '🔇';
});

document.getElementById('social-toggle').addEventListener('click', () => {
  state.socialMode = !state.socialMode;
  updateUI();
});

// Autoplay Modal & 10/20/50/70/100/500 Selection
btnAutoplay.addEventListener('click', () => {
  if (isAutoActive()) {
    stopAllAutoplay();
    return;
  }
  if (!state.isSpinning && state.freeSpins === 0) {
    autoplayModal.classList.remove('hidden');
  }
});

document.getElementById('btn-auto-cancel').addEventListener('click', () => autoplayModal.classList.add('hidden'));

document.querySelectorAll('.auto-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    const count = parseInt(btn.dataset.spins, 10);
    autoplayModal.classList.add('hidden');
    state.autoRemaining = count;
    updateUI();
    handleSpin(false);
  });
});

// Bonus Buy Flow
btnBonusBuy.addEventListener('click', () => {
  if (state.isSpinning || state.freeSpins > 0 || isAutoActive()) return;
  document.getElementById('modal-buy-heading').textContent = state.socialMode ? 'GET FREE SPINS' : 'BUY FREE SPINS';
  document.getElementById('modal-buy-cost-val').textContent = (getBet() * BONUS_BUY_MULT).toFixed(2);
  buyModal.classList.remove('hidden');
});

document.getElementById('btn-buy-cancel').addEventListener('click', () => buyModal.classList.add('hidden'));
document.getElementById('btn-buy-confirm').addEventListener('click', () => {
  buyModal.classList.add('hidden');
  handleSpin(true);
});

// Info / Rules Guide Modal
document.getElementById('btn-info').addEventListener('click', () => {
  renderRulesModal();
  infoModal.classList.remove('hidden');
});
document.getElementById('btn-info-close').addEventListener('click', () => infoModal.classList.add('hidden'));

// Spacebar Logic: Press once to spin (or stop auto); Hold down to engage continuous Space-Autoplay!
let spaceDownTime = 0;
let spaceHoldTimer = null;

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  if (!buyModal.classList.contains('hidden') || !infoModal.classList.contains('hidden') || !autoplayModal.classList.contains('hidden')) return;
  e.preventDefault();
  if (e.repeat) return;

  // If autoplay is already running, pressing Space stops it immediately
  if (isAutoActive()) {
    stopAllAutoplay();
    return;
  }

  spaceDownTime = performance.now();
  handleSpin(false);

  spaceHoldTimer = setTimeout(() => {
    state.spaceHoldAuto = true;
    updateUI();
    if (!state.isSpinning) handleSpin(false);
  }, 450);
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && spaceHoldTimer) {
    clearTimeout(spaceHoldTimer);
    spaceHoldTimer = null;
  }
});

// Start Everything
initVisualGuides();
updateUI(0);
requestAnimationFrame(renderLoop);
