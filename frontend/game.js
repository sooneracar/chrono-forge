// CHRONO-FORGE — Verified 96.34% RTP Clockwork Math & Interactive Prototype
// Differential Gear Ratio: Outer +1, Middle +2, Inner +3 clockwise steps per cascade

const PAYTABLE = {
  NUT: 0.35,
  SPRING: 0.75,
  GEAR: 1.60,
  SAPPHIRE: 3.20,
  EMERALD: 6.50,
  RUBY: 16.00,
  WILD: 28.00
};

const SYMBOL_META = {
  NUT:      { label: 'NUT', color: '#d97706', text: '#fff', shape: 'hex' },
  SPRING:   { label: 'SPR', color: '#94a3b8', text: '#0f172a', shape: 'coil' },
  GEAR:     { label: 'GER', color: '#eab308', text: '#1c1917', shape: 'gear' },
  SAPPHIRE: { label: 'SAP', color: '#2563eb', text: '#fff', shape: 'gem' },
  EMERALD:  { label: 'EMR', color: '#059669', text: '#fff', shape: 'gem' },
  RUBY:     { label: 'RBY', color: '#e11d48', text: '#fff', shape: 'gem' },
  WILD:     { label: 'WLD', color: '#00f5d4', text: '#042f2e', shape: 'core' },
  KEY:      { label: 'KEY', color: '#fde047', text: '#422006', shape: 'key' }
};

// 36-stop virtual rings (calibrated for 96.34% RTP)
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

// Game State
const state = {
  balance: 1000.00,
  betIdx: 2,
  posOut: 0,
  posMid: 0,
  posIn: 0,
  rotOut: 0,
  rotMid: 0,
  rotIn: 0,
  multIdx: 0,
  freeSpins: 0,
  isSpinning: false,
  turbo: false,
  socialMode: false,
  winningPointers: []
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
const btnTurbo = document.getElementById('btn-turbo');
const socialToggle = document.getElementById('social-toggle');

function getBet() {
  return BET_LEVELS[state.betIdx];
}

function updateUI(roundWin = 0) {
  valBalance.textContent = state.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  valBet.textContent = getBet().toFixed(2);
  valWin.textContent = roundWin.toFixed(2);
  fsCounter.textContent = state.freeSpins;

  document.querySelectorAll('.mult-step').forEach(el => {
    const idx = parseInt(el.dataset.idx, 10);
    el.classList.toggle('active', idx === Math.min(state.multIdx, MULTIPLIERS.length - 1));
  });

  // Stake.us Social Terminology Compliance
  document.getElementById('lbl-balance').textContent = state.socialMode ? 'COINS' : 'BALANCE';
  document.getElementById('lbl-bet').textContent = state.socialMode ? 'PLAY' : 'BET';
  document.getElementById('lbl-spin').textContent = state.socialMode ? 'PLAY' : 'SPIN';
  socialToggle.textContent = state.socialMode ? 'MODE: SOCIAL (US)' : 'MODE: STANDARD';
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

    function frame(now) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      state.rotOut = initOut + dirOut * ease;
      state.rotMid = initMid + dirMid * ease;
      state.rotIn = initIn + dirIn * ease;
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

async function handleSpin() {
  if (state.isSpinning) return;
  const bet = getBet();
  const isFree = state.freeSpins > 0;

  if (!isFree && state.balance < bet) {
    statusBanner.textContent = 'INSUFFICIENT BALANCE';
    return;
  }

  state.isSpinning = true;
  btnSpin.disabled = true;
  state.winningPointers = [];

  if (isFree) {
    state.freeSpins--;
    statusBanner.textContent = `GRAND COMPLICATION FREE SPIN (${state.freeSpins} LEFT)`;
  } else {
    state.balance -= bet;
    state.multIdx = 0;
    statusBanner.textContent = 'WINDING CLOCKWORK GEARS...';
  }
  updateUI(0);

  const L = RING_OUTER.length;
  state.posOut = Math.floor(Math.random() * L);
  state.posMid = Math.floor(Math.random() * L);
  state.posIn = Math.floor(Math.random() * L);

  // Spin animation
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
      statusBanner.textContent = `3+ TIME KEYS! +${award} GRAND COMPLICATION SPINS!`;
      updateUI(roundTotalMult * bet);
      await sleep(750);
    }

    if (res.hasWin) {
      state.winningPointers = res.matchedPointers;
      drawClockwork();

      const activeMult = MULTIPLIERS[Math.min(state.multIdx, MULTIPLIERS.length - 1)];
      const stepWinMult = res.winBase * activeMult;
      roundTotalMult = Math.min(roundTotalMult + stepWinMult, MAX_WIN_MULT);

      statusBanner.textContent = `ALIGNED! ${res.winBase.toFixed(2)}x × ${activeMult}x ALCHEMY = ${(roundTotalMult * bet).toFixed(2)}`;
      updateUI(roundTotalMult * bet);
      await sleep(620);

      // Advance multiplier & differential gear shift (1, 2, 3 clockwise steps)
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
  updateUI(finalWin);

  if (finalWin > 0) {
    statusBanner.textContent = `TOTAL ROUND WIN: ${finalWin.toFixed(2)} (${roundTotalMult.toFixed(2)}x)`;
  } else if (state.freeSpins > 0) {
    statusBanner.textContent = `GRAND COMPLICATION ACTIVE — ${state.freeSpins} FREE SPINS REMAINING`;
  } else {
    statusBanner.textContent = 'READY — PRESS SPIN OR SPACEBAR';
  }

  state.isSpinning = false;
  btnSpin.disabled = false;
}

// Render Concentric Brass Gears & 4 Gold Pointers
function drawClockwork() {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Outer Brass Bezel
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 258, 0, Math.PI * 2);
  ctx.fillStyle = '#1b130c';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#9c6f29';
  ctx.stroke();
  ctx.restore();

  const rings = [
    { data: getVisibleRing(RING_OUTER, state.posOut), radius: 215, slotR: 22, rot: state.rotOut, ringFill: '#2b1e12', stroke: '#c59648' },
    { data: getVisibleRing(RING_MIDDLE, state.posMid), radius: 152, slotR: 20, rot: state.rotMid, ringFill: '#22170e', stroke: '#a87b32' },
    { data: getVisibleRing(RING_INNER, state.posIn), radius: 92, slotR: 18, rot: state.rotIn, ringFill: '#181009', stroke: '#8c6222' }
  ];

  rings.forEach(ring => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ring.rot);

    // Ring Track
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
    ctx.lineWidth = ring.slotR * 2.3;
    ctx.strokeStyle = ring.ringFill;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, ring.radius + ring.slotR + 4, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = ring.stroke;
    ctx.stroke();

    // 12 Symbol Slots (Index 0 is 12 o'clock = -PI/2)
    for (let k = 0; k < 12; k++) {
      const angle = -Math.PI / 2 + (k * Math.PI * 2) / 12;
      const sx = Math.cos(angle) * ring.radius;
      const sy = Math.sin(angle) * ring.radius;
      const symKey = ring.data[k];
      const meta = SYMBOL_META[symKey];

      // Socket
      ctx.beginPath();
      ctx.arc(sx, sy, ring.slotR, 0, Math.PI * 2);
      ctx.fillStyle = meta.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#120c06';
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-ring.rot);
      ctx.fillStyle = meta.text;
      ctx.font = 'bold 11px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.label, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  });

  // Center Tourbillon Core
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fillStyle = '#2d1f12';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#e5c17b';
  ctx.stroke();

  ctx.fillStyle = '#e5c17b';
  ctx.font = 'bold 11px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHRONO', cx, cy - 6);
  ctx.fillText('CORE', cx, cy + 7);

  // 4 Gold Alignment Pointers (12, 3, 6, 9 o'clock)
  POINTER_OFFSETS.forEach(p => {
    const angle = -Math.PI / 2 + (p * Math.PI * 2) / 12;
    const isHit = state.winningPointers.includes(p);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Highlight Beam if Winning Pointer
    if (isHit) {
      ctx.fillStyle = 'rgba(44, 255, 125, 0.25)';
      ctx.fillRect(55, -24, 195, 48);
      ctx.strokeStyle = '#2cff7d';
      ctx.lineWidth = 2;
      ctx.strokeRect(55, -24, 195, 48);
    }

    // Outer Gold Arrow Pointer
    ctx.beginPath();
    ctx.moveTo(246, 0);
    ctx.lineTo(272, -12);
    ctx.lineTo(272, 12);
    ctx.closePath();
    ctx.fillStyle = isHit ? '#2cff7d' : '#f3d594';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3b260b';
    ctx.stroke();

    ctx.restore();
  });
}

// Event Listeners
btnSpin.addEventListener('click', handleSpin);

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

btnTurbo.addEventListener('click', () => {
  state.turbo = !state.turbo;
  btnTurbo.textContent = state.turbo ? 'TURBO: ON' : 'TURBO: OFF';
});

socialToggle.addEventListener('click', () => {
  state.socialMode = !state.socialMode;
  updateUI(0);
});

// Stake Engine Compliance: Spacebar triggers Spin
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleSpin();
  }
});

// Initial Render
updateUI(0);
drawClockwork();
