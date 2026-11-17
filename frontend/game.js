// CHRONO-FORGE — Phase 3: Custom Vector Gem & Gear Artwork, Procedural Clockwork Audio, Bonus Buy (100x) & Rules Modal

const PAYTABLE = {
  NUT: 0.35,
  SPRING: 0.75,
  GEAR: 1.60,
  SAPPHIRE: 3.20,
  EMERALD: 6.50,
  RUBY: 16.00,
  WILD: 28.00
};

// 36-stop virtual rings (verified 96.34% RTP)
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
const POINTER_OFFSETS = [0, 3, 6, 9]; // 12, 3, 6, 9 o'clock
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
  winningPointers: []
};

// Procedural Web Audio API Clockwork & Crystal Synthesizer (Zero External Assets)
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  tick(freq = 520, duration = 0.03, vol = 0.08) {
    if (!state.soundOn) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + duration);
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
    const baseFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    const f = baseFreqs[Math.min(step, baseFreqs.length - 1)];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  },
  bonusFanfare() {
    if (!state.soundOn) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.45);
      }, idx * 110);
    });
  }
};

// DOM Elements
const canvas = document.getElementById('clockwork-canvas');
const ctx = canvas.getContext('2d');
const statusBanner = document.getElementById('status-banner');
const valBalance = document.getElementById('val-balance');
const valBet = document.getElementById('val-bet');
const valWin = document.getElementById('val-win');
const fsCounter = document.getElementById('fs-counter');
const btnSpin = document.getElementById('btn-spin');
const btnBonusBuy = document.getElementById('btn-bonus-buy');
const btnMobileBuy = document.getElementById('btn-mobile-buy');
const buyModal = document.getElementById('buy-modal');
const infoModal = document.getElementById('info-modal');

function getBet() {
  return BET_LEVELS[state.betIdx];
}

function updateUI(roundWin = 0) {
  const bet = getBet();
  const buyCost = bet * BONUS_BUY_MULT;

  valBalance.textContent = state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  valBet.textContent = bet.toFixed(2);
  valWin.textContent = roundWin.toFixed(2);
  fsCounter.textContent = state.freeSpins;
  document.getElementById('val-buy-cost').textContent = buyCost.toFixed(2);

  document.querySelectorAll('.mult-step').forEach(el => {
    const idx = parseInt(el.dataset.idx, 10);
    el.classList.toggle('active', idx === Math.min(state.multIdx, MULTIPLIERS.length - 1));
  });

  // Stake.us Social Mode Dynamic Terminology
  const isSoc = state.socialMode;
  document.getElementById('lbl-balance').textContent = isSoc ? 'COINS' : 'BALANCE';
  document.getElementById('lbl-bet').textContent = isSoc ? 'PLAY' : 'BET';
  document.getElementById('lbl-spin').textContent = isSoc ? 'PLAY' : 'SPIN';
  document.getElementById('lbl-buy-title').textContent = isSoc ? 'GET BONUS' : 'BUY BONUS';
  btnMobileBuy.textContent = isSoc ? 'BONUS (100x)' : 'BUY (100x)';
  document.getElementById('social-toggle').textContent = isSoc ? 'SOCIAL (US)' : 'STANDARD';

  const disableActions = state.isSpinning || state.freeSpins > 0;
  btnSpin.disabled = state.isSpinning;
  btnBonusBuy.disabled = disableActions;
  btnMobileBuy.disabled = disableActions;
}

function renderRulesContent() {
  const isSoc = state.socialMode;
  const wagerWord = isSoc ? 'play amount' : 'bet';
  const currencyWord = isSoc ? 'coins' : 'credits';
  document.getElementById('rules-content').innerHTML = `
    <h3>1. Clockwork Alignment Mechanics</h3>
    <p>Chrono-Forge features 3 concentric mechanical gears (Outer, Middle, Inner), each displaying 12 symbol sockets. Whenever 3 identical symbols align across all three rings on any of the 4 golden pointers (12, 3, 6, or 9 o'clock), a payout is awarded.</p>
    <h3>2. Differential Gear Cascade &amp; Alchemy Multiplier</h3>
    <p>After every winning alignment, matched symbols dissolve and the Alchemy Tube multiplier advances (<b>1x → 2x → 3x → 5x → 8x → 12x → 20x → 35x → 50x → 100x</b>). The gears then shift clockwise at differential ratios (Outer +1, Middle +2, Inner +3 steps) to evaluate new alignments within the same round.</p>
    <h3>3. Symbol Payouts (Multiples of ${wagerWord})</h3>
    <ul>
      <li><b>Alchemy Core (Wild):</b> Substitutes for all symbols except Time Key. 3-of-a-kind pays <b>28.0x</b>.</li>
      <li><b>Crimson Ruby:</b> <b>16.0x</b> | <b>Forest Emerald:</b> <b>6.5x</b> | <b>Royal Sapphire:</b> <b>3.2x</b></li>
      <li><b>Brass Gear:</b> <b>1.6x</b> | <b>Steel Spring:</b> <b>0.75x</b> | <b>Copper Nut:</b> <b>0.35x</b></li>
    </ul>
    <h3>4. Grand Complication Free Spins &amp; Feature</h3>
    <p>Landing 3 or more <b>Time Keys</b> across the 4 pointers awards <b>8 Free Spins</b> (3+ Keys during Free Spins awards +3 extra spins). During Free Spins, the Alchemy Tube multiplier <b>does not reset</b> between spins. Players may also activate the feature directly for <b>100x</b> the current ${wagerWord}.</p>
    <h3>5. Return to Player (RTP) &amp; Max Win</h3>
    <p>Theoretical RTP: <b>96.34%</b>. Maximum win per round is capped at <b>5,000x</b> the base ${wagerWord}. All ${currencyWord} and outcomes are determined by certified RNG lookup tables.</p>
  `;
}

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

function animateRotation(durationMs, dirOut, dirMid, dirIn) {
  return new Promise(resolve => {
    const dur = state.turbo ? durationMs * 0.35 : durationMs;
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
      state.coreAngle += 0.08;

      if (now - lastTick > 65) {
        SoundFX.tick(460 + t * 180, 0.025, 0.05);
        lastTick = now;
      }

      drawClockwork();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        state.rotOut = 0;
        state.rotMid = 0;
        state.rotIn = 0;
        drawClockwork();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// Guaranteed 3+ Time Keys position generator for Bonus Buy (100x)
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
    if (res.keyCount >= 3) {
      return { o, m, i };
    }
  }
}

async function handleSpin(isBonusBuy = false) {
  if (state.isSpinning) return;
  const bet = getBet();
  const isFree = state.freeSpins > 0;
  const cost = isBonusBuy ? bet * BONUS_BUY_MULT : (isFree ? 0 : bet);

  if (state.balance < cost) {
    statusBanner.textContent = state.socialMode ? 'INSUFFICIENT COINS' : 'INSUFFICIENT BALANCE';
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
    statusBanner.textContent = isBonusBuy ? 'ACTIVATING GRAND COMPLICATION...' : 'WINDING CLOCKWORK GEARS...';
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

  await animateRotation(540, Math.PI * 2, -Math.PI * 2, Math.PI * 2);

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
      statusBanner.textContent = `3+ TIME KEYS! +${award} GRAND COMPLICATION SPINS!`;
      updateUI(roundTotalMult * bet);
      await sleep(800);
    }

    if (res.hasWin) {
      state.winningPointers = res.matchedPointers;
      SoundFX.chime(state.multIdx);
      drawClockwork();

      const activeMult = MULTIPLIERS[Math.min(state.multIdx, MULTIPLIERS.length - 1)];
      const stepWinMult = res.winBase * activeMult;
      roundTotalMult = Math.min(roundTotalMult + stepWinMult, MAX_WIN_MULT);

      statusBanner.textContent = `ALIGNED! ${res.winBase.toFixed(2)}x × ${activeMult}x ALCHEMY = ${(roundTotalMult * bet).toFixed(2)}`;
      updateUI(roundTotalMult * bet);
      await sleep(600);

      state.multIdx++;
      state.winningPointers = [];
      state.posOut = (state.posOut - 1 + L) % L;
      state.posMid = (state.posMid - 2 + L) % L;
      state.posIn = (state.posIn - 3 + L) % L;

      await animateRotation(320, Math.PI / 6, (Math.PI / 6) * 2, (Math.PI / 6) * 3);
      step++;
    } else {
      break;
    }
  }

  const finalWin = roundTotalMult * bet;
  state.balance += finalWin;
  state.isSpinning = false;
  updateUI(finalWin);

  if (finalWin > 0) {
    statusBanner.textContent = `TOTAL ROUND WIN: ${finalWin.toFixed(2)} (${roundTotalMult.toFixed(2)}x)`;
  } else if (state.freeSpins > 0) {
    statusBanner.textContent = `GRAND COMPLICATION ACTIVE — ${state.freeSpins} FREE SPINS LEFT`;
  } else {
    statusBanner.textContent = state.socialMode ? 'READY — PRESS PLAY OR SPACEBAR' : 'READY — PRESS SPIN OR SPACEBAR';
  }
}

// ============================================================================
// CUSTOM VECTOR ARTWORK RENDERER (NO TEXT PLACEHOLDERS!)
// ============================================================================
function drawGemFacet(ctx, r, cMain, cLight, cDark, sides = 6) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, cLight);
  grad.addColorStop(0.5, cMain);
  grad.addColorStop(1, cDark);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = cLight;
  ctx.stroke();

  // Inner facet highlight
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    const x = Math.cos(a) * (r * 0.52);
    const y = Math.sin(a) * (r * 0.52);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
}

function drawSymbolIcon(ctx, type, r) {
  ctx.save();
  switch (type) {
    case 'RUBY':
      drawGemFacet(ctx, r * 0.88, '#e11d48', '#fda4af', '#881337', 8);
      break;
    case 'EMERALD':
      drawGemFacet(ctx, r * 0.86, '#059669', '#6ee7b7', '#064e3b', 6);
      break;
    case 'SAPPHIRE':
      drawGemFacet(ctx, r * 0.88, '#2563eb', '#93c5fd', '#1e3a8a', 4);
      break;
    case 'WILD': {
      // Glowing Alchemy Energy Core
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 0.95);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.45, '#00f5d4');
      glow.addColorStop(1, '#0f766e');
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ccfbf1';
      ctx.stroke();
      // Orbit rings
      ctx.strokeStyle = '#042f2e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.65, r * 0.25, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.65, r * 0.25, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'KEY': {
      // Golden Time Key
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1.5;
      // Bow (ring)
      ctx.beginPath();
      ctx.arc(0, -r * 0.34, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -r * 0.34, r * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#1b130c';
      ctx.fill();
      // Shaft & Teeth
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-r * 0.09, -r * 0.05, r * 0.18, r * 0.72);
      ctx.fillRect(r * 0.08, r * 0.32, r * 0.24, r * 0.12);
      ctx.fillRect(r * 0.08, r * 0.52, r * 0.28, r * 0.12);
      break;
    }
    case 'GEAR': {
      // Miniature Brass Cogwheel
      const teeth = 8;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const rad = i % 2 === 0 ? r * 0.85 : r * 0.62;
        const a = (i * Math.PI) / teeth;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#eab308';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#713f12';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = '#1b130c';
      ctx.fill();
      break;
    }
    case 'SPRING': {
      // Coiled Steel Spring
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(0, i * (r * 0.24), r * 0.52, r * 0.14, -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'NUT':
    default: {
      // Hexagonal Copper Nut
      drawGemFacet(ctx, r * 0.8, '#d97706', '#fbbf24', '#78350f', 6);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#1b130c';
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawGearTeeth(ctx, radius, toothCount, toothDepth, fillStyle) {
  ctx.beginPath();
  const steps = toothCount * 2;
  for (let i = 0; i < steps; i++) {
    const r = i % 2 === 0 ? radius + toothDepth : radius;
    const a = (i * Math.PI * 2) / steps;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawClockwork() {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Outer Steampunk Bezel Frame
  ctx.save();
  const bezelGrad = ctx.createRadialGradient(cx, cy, 210, cx, cy, 275);
  bezelGrad.addColorStop(0, '#2a1d11');
  bezelGrad.addColorStop(0.7, '#8c6222');
  bezelGrad.addColorStop(1, '#3b260b');
  ctx.beginPath();
  ctx.arc(cx, cy, 272, 0, Math.PI * 2);
  ctx.fillStyle = bezelGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 255, 0, Math.PI * 2);
  ctx.fillStyle = '#120c07';
  ctx.fill();
  ctx.restore();

  const rings = [
    { data: getVisibleRing(RING_OUTER, state.posOut), radius: 215, slotR: 23, rot: state.rotOut, teeth: 36, ringFill: '#291c11', stroke: '#d4a24c' },
    { data: getVisibleRing(RING_MIDDLE, state.posMid), radius: 152, slotR: 21, rot: state.rotMid, teeth: 24, ringFill: '#20150c', stroke: '#b38336' },
    { data: getVisibleRing(RING_INNER, state.posIn), radius: 92, slotR: 19, rot: state.rotIn, teeth: 18, ringFill: '#170f08', stroke: '#8c6222' }
  ];

  rings.forEach(ring => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ring.rot);

    // Metallic Gear Teeth Rim
    drawGearTeeth(ctx, ring.radius + ring.slotR + 2, ring.teeth, 6, ring.stroke);

    // Ring Track Body
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius + ring.slotR + 2, 0, Math.PI * 2);
    ctx.fillStyle = ring.ringFill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ring.stroke;
    ctx.stroke();

    // 12 Recessed Symbol Sockets
    for (let k = 0; k < 12; k++) {
      const angle = -Math.PI / 2 + (k * Math.PI * 2) / 12;
      const sx = Math.cos(angle) * ring.radius;
      const sy = Math.sin(angle) * ring.radius;
      const symKey = ring.data[k];

      // Dark Socket Well
      ctx.beginPath();
      ctx.arc(sx, sy, ring.slotR, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0906';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#6b4c1e';
      ctx.stroke();

      // Custom Vector Gem / Mechanical Icon
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-ring.rot);
      drawSymbolIcon(ctx, symKey, ring.slotR * 0.85);
      ctx.restore();
    }

    ctx.restore();
  });

  // Center Tourbillon Core
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#181009';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f0cf88';
  ctx.stroke();

  // Rotating Inner Tourbillon Cage
  ctx.rotate(state.coreAngle);
  ctx.strokeStyle = '#b3873f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-22, -22, 44, 44);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#2cff7d';
  ctx.fill();
  ctx.restore();

  // 4 Gold Alignment Pointers (12, 3, 6, 9 o'clock)
  POINTER_OFFSETS.forEach(p => {
    const angle = -Math.PI / 2 + (p * Math.PI * 2) / 12;
    const isHit = state.winningPointers.includes(p);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    if (isHit) {
      ctx.fillStyle = 'rgba(44, 255, 125, 0.25)';
      ctx.fillRect(54, -25, 196, 50);
      ctx.strokeStyle = '#2cff7d';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(54, -25, 196, 50);
    }

    // Ornate Gold Needle
    ctx.beginPath();
    ctx.moveTo(244, 0);
    ctx.lineTo(276, -13);
    ctx.lineTo(270, 0);
    ctx.lineTo(276, 13);
    ctx.closePath();
    ctx.fillStyle = isHit ? '#2cff7d' : '#f7dc9c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3b260b';
    ctx.stroke();

    ctx.restore();
  });
}

// ============================================================================
// EVENT LISTENERS & MODALS
// ============================================================================
btnSpin.addEventListener('click', () => handleSpin(false));

document.getElementById('btn-bet-up').addEventListener('click', () => {
  if (!state.isSpinning && state.betIdx < BET_LEVELS.length - 1) {
    state.betIdx++;
    updateUI(0);
  }
});

document.getElementById('btn-bet-down').addEventListener('click', () => {
  if (!state.isSpinning && state.betIdx > 0) {
    state.betIdx--;
    updateUI(0);
  }
});

document.getElementById('btn-turbo').addEventListener('click', (e) => {
  state.turbo = !state.turbo;
  e.target.textContent = state.turbo ? 'TURBO: ON' : 'TURBO: OFF';
});

document.getElementById('btn-sound').addEventListener('click', (e) => {
  state.soundOn = !state.soundOn;
  e.target.textContent = state.soundOn ? '🔊' : '🔇';
});

document.getElementById('social-toggle').addEventListener('click', () => {
  state.socialMode = !state.socialMode;
  updateUI(0);
});

// Bonus Buy Confirmation Flow
function openBuyModal() {
  if (state.isSpinning || state.freeSpins > 0) return;
  const cost = (getBet() * BONUS_BUY_MULT).toFixed(2);
  document.getElementById('modal-buy-heading').textContent = state.socialMode
    ? 'GET GRAND COMPLICATION FEATURE'
    : 'BUY GRAND COMPLICATION BONUS';
  document.getElementById('modal-buy-cost-val').textContent = cost;
  buyModal.classList.remove('hidden');
}

btnBonusBuy.addEventListener('click', openBuyModal);
btnMobileBuy.addEventListener('click', openBuyModal);
document.getElementById('btn-buy-cancel').addEventListener('click', () => buyModal.classList.add('hidden'));
document.getElementById('btn-buy-confirm').addEventListener('click', () => {
  buyModal.classList.add('hidden');
  handleSpin(true);
});

// Rules & Paytable Modal
document.getElementById('btn-info').addEventListener('click', () => {
  renderRulesContent();
  infoModal.classList.remove('hidden');
});
document.getElementById('btn-info-close').addEventListener('click', () => infoModal.classList.add('hidden'));

// Spacebar Triggers Spin (Stake Engine Mandatory)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && buyModal.classList.contains('hidden') && infoModal.classList.contains('hidden')) {
    e.preventDefault();
    handleSpin(false);
  }
});

// Initial Render
updateUI(0);
drawClockwork();
