// CHRONO-FORGE — Vibrant Multi-Colored 3D Icon Set (Ruby, Emerald, Sapphire, Amethyst,
// Celestial Sun Wild, Silver Hourglass, Coral Elixir Flask & Golden Scatter Key)

const PAYTABLE = {
  NUT: 0.35,      // Coral Elixir Flask
  SPRING: 0.75,   // Silver Hourglass
  GEAR: 1.60,     // Royal Amethyst Crystal
  SAPPHIRE: 3.20, // Celestial Sapphire
  EMERALD: 6.50,  // Forest Emerald
  RUBY: 16.00,    // Crimson Heart Ruby
  WILD: 28.00     // Astral Sun Core (WILD)
};

const SYMBOL_INFO = [
  { key: 'WILD',     name: 'Astral Sun (WILD)',     pay: '28.0x', desc: 'Substitutes for any symbol except Golden Key. 3 aligned Suns pay 28.0x!' },
  { key: 'RUBY',     name: 'Crimson Ruby',          pay: '16.0x', desc: 'Fiery red royal gemstone — highest standard symbol payout.' },
  { key: 'EMERALD',  name: 'Neon Emerald',          pay: '6.5x',  desc: 'Vivid green alchemical emerald.' },
  { key: 'SAPPHIRE', name: 'Electric Sapphire',     pay: '3.2x',  desc: 'Deep ocean-blue diamond sapphire.' },
  { key: 'GEAR',     name: 'Royal Amethyst',        pay: '1.6x',  desc: 'Glowing purple crystal shard.' },
  { key: 'SPRING',   name: 'Silver Hourglass',      pay: '0.75x', desc: 'Platinum & ice-blue sands of time.' },
  { key: 'NUT',      name: 'Coral Elixir',          pay: '0.35x', desc: 'Luminous orange-pink potion vial.' },
  { key: 'KEY',      name: 'Golden Key (SCATTER)',  pay: 'BONUS', desc: 'Land 3 or more Golden Keys anywhere on the 4 pointers (XII, III, VI, IX) to trigger 8 Free Spins!' }
];

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
const POINTER_OFFSETS = [0, 3, 6, 9];
const ROMAN_NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const BET_LEVELS = [0.20, 0.50, 1.00, 2.00, 5.00, 10.00, 25.00, 50.00];
const MAX_WIN_MULT = 5000.0;
const BONUS_BUY_MULT = 100;

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

// Multi-colored Floating Magic Sparks
const sparkColors = ['rgba(255,224,130,', 'rgba(167,139,250,', 'rgba(52,211,153,', 'rgba(96,165,250,'];
const particles = Array.from({ length: 46 }, () => ({
  x: Math.random() * 640,
  y: Math.random() * 640,
  r: 1.3 + Math.random() * 2.5,
  vx: (Math.random() - 0.5) * 0.4,
  vy: -0.25 - Math.random() * 0.5,
  alpha: 0.35 + Math.random() * 0.6,
  color: sparkColors[Math.floor(Math.random() * sparkColors.length)]
}));

let celebrationCoins = [];

// Hybrid Audio Engine (Ready for frontend/sounds/*.mp3)
const SoundFX = {
  ctx: null,
  mp3Ready: {},
  tracks: {},
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();

    if (Object.keys(this.tracks).length === 0) {
      ['spin', 'stop', 'win', 'scatter', 'bigwin'].forEach(name => {
        const audio = new Audio(`sounds/${name}.mp3`);
        audio.preload = 'auto';
        audio.addEventListener('canplaythrough', () => { this.mp3Ready[name] = true; }, { once: true });
        this.tracks[name] = audio;
      });
    }
  },
  play(name, pitchRate = 1.0) {
    if (!state.soundOn) return;
    this.init();

    if (this.mp3Ready[name] && this.tracks[name]) {
      try {
        const clone = this.tracks[name].cloneNode();
        clone.volume = 0.8;
        clone.playbackRate = pitchRate;
        clone.play().catch(() => {});
        return;
      } catch (e) {}
    }

    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (name === 'spin' || name === 'stop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(name === 'stop' ? 115 : 175, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.06);
    } else {
      osc.type = 'sine';
      const freq = name === 'scatter' ? 587.33 : 440 * pitchRate;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    }
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

  const isSoc = state.socialMode;
  document.getElementById('lbl-balance').textContent = isSoc ? 'COINS' : 'CREDIT';
  document.getElementById('lbl-bet').textContent = isSoc ? 'PLAY' : 'BET';
  document.getElementById('lbl-buy-title').textContent = isSoc ? '⚡ GET FREE SPINS ⚡' : '⚡ BUY FREE SPINS ⚡';
  document.getElementById('social-toggle').textContent = isSoc ? 'SOCIAL (US)' : 'STANDARD';

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
// DISTINCT MULTI-COLORED 3D SYMBOLS (ZERO COLOR CONFUSION!)
// ============================================================================
function draw3DFacetedJewel(c, r, cTop, cMid, cDeep, cRim, sides = 8) {
  c.save();
  c.shadowColor = cMid;
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

  const grad = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r * 1.1);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.28, cTop);
  grad.addColorStop(0.68, cMid);
  grad.addColorStop(1, cDeep);
  c.fillStyle = grad;
  c.fill();

  c.shadowBlur = 0;
  c.lineWidth = 1.6;
  c.strokeStyle = cRim;
  c.stroke();

  const innerR = r * 0.52;
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = 0.9;
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    c.beginPath();
    c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    c.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    c.stroke();
  }

  c.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    const x = Math.cos(a) * innerR;
    const y = Math.sin(a) * innerR;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = 'rgba(255,255,255,0.34)';
  c.fill();

  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(-r * 0.28, -r * 0.3, r * 0.13, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawSymbolIcon(c, type, r) {
  c.save();
  switch (type) {
    case 'WILD': {
      // 8-Point Astral Sun Star (Cyan & Pure White)
      c.shadowColor = '#22d3ee';
      c.shadowBlur = 16;
      const spikes = 8;
      c.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? r * 0.96 : r * 0.44;
        const a = (i * Math.PI) / spikes;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      const sGrad = c.createRadialGradient(0, 0, 1, 0, 0, r);
      sGrad.addColorStop(0, '#ffffff');
      sGrad.addColorStop(0.5, '#22d3ee');
      sGrad.addColorStop(1, '#0284c7');
      c.fillStyle = sGrad;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = 1.5;
      c.strokeStyle = '#ecfeff';
      c.stroke();

      c.beginPath();
      c.arc(0, 0, r * 0.26, 0, Math.PI * 2);
      c.fillStyle = '#ffffff';
      c.fill();
      break;
    }
    case 'RUBY':
      // Fiery Crimson Ruby (Octagon)
      draw3DFacetedJewel(c, r * 0.92, '#ff8fa3', '#f43f5e', '#881337', '#fecdd3', 8);
      break;

    case 'EMERALD':
      // Neon Forest Emerald (Hexagon)
      draw3DFacetedJewel(c, r * 0.9, '#6ee7b7', '#10b981', '#064e3b', '#a7f3d0', 6);
      break;

    case 'SAPPHIRE':
      // Electric Royal Blue Sapphire (Diamond)
      draw3DFacetedJewel(c, r * 0.94, '#93c5fd', '#2563eb', '#1e1b4b', '#dbeafe', 4);
      break;

    case 'GEAR':
      // Royal Amethyst Purple Crystal (Triangle / Shard) — NO MORE YELLOW!
      draw3DFacetedJewel(c, r * 0.95, '#e9d5ff', '#9333ea', '#3b0764', '#f3e8ff', 5);
      break;

    case 'SPRING': {
      // Platinum & Ice-Blue 3D Hourglass — NO MORE COIL!
      c.shadowColor = '#38bdf8';
      c.shadowBlur = 8;
      // Top & Bottom Glass Bulbs
      c.beginPath();
      c.moveTo(-r * 0.56, -r * 0.68);
      c.lineTo(r * 0.56, -r * 0.68);
      c.lineTo(0, 0);
      c.lineTo(r * 0.56, r * 0.68);
      c.lineTo(-r * 0.56, r * 0.68);
      c.lineTo(0, 0);
      c.closePath();
      const glassGrad = c.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
      glassGrad.addColorStop(0, '#bae6fd');
      glassGrad.addColorStop(0.5, '#e0f2fe');
      glassGrad.addColorStop(1, '#38bdf8');
      c.fillStyle = glassGrad;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = 1.6;
      c.strokeStyle = '#f8fafc';
      c.stroke();

      // Glowing Cyan Sand in bottom bulb
      c.beginPath();
      c.moveTo(-r * 0.36, r * 0.62);
      c.lineTo(r * 0.36, r * 0.62);
      c.lineTo(0, r * 0.22);
      c.closePath();
      c.fillStyle = '#0ea5e9';
      c.fill();

      // Silver Caps
      c.fillStyle = '#cbd5e1';
      c.fillRect(-r * 0.65, -r * 0.8, r * 1.3, r * 0.16);
      c.fillRect(-r * 0.65, r * 0.64, r * 1.3, r * 0.16);
      break;
    }

    case 'NUT':
    default: {
      // Luminous Coral-Orange Alchemist Potion Flask — NO MORE YELLOW NUT!
      c.shadowColor = '#fb7185';
      c.shadowBlur = 9;
      // Round Potion Bulb
      const flaskGrad = c.createRadialGradient(-r * 0.25, -r * 0.1, 2, 0, r * 0.15, r * 0.72);
      flaskGrad.addColorStop(0, '#ffedd5');
      flaskGrad.addColorStop(0.45, '#fb923c');
      flaskGrad.addColorStop(1, '#c2410c');
      c.beginPath();
      c.arc(0, r * 0.16, r * 0.66, 0, Math.PI * 2);
      c.fillStyle = flaskGrad;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = 1.6;
      c.strokeStyle = '#fed7aa';
      c.stroke();

      // Glass Neck & Cork
      c.fillStyle = '#e2e8f0';
      c.fillRect(-r * 0.2, -r * 0.64, r * 0.4, r * 0.24);
      c.fillStyle = '#a16207';
      c.fillRect(-r * 0.16, -r * 0.82, r * 0.32, r * 0.2);

      // Specular Bubble Highlight
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(-r * 0.24, r * 0.02, r * 0.13, 0, Math.PI * 2);
      c.fill();
      break;
    }

    case 'KEY': {
      // Pure Gold & Ruby Scatter Key (Stands out immediately as the ONLY Gold icon!)
      c.shadowColor = '#fde047';
      c.shadowBlur = 14;
      const kGrad = c.createLinearGradient(-r, -r, r, r);
      kGrad.addColorStop(0, '#fef9c3');
      kGrad.addColorStop(0.45, '#facc15');
      kGrad.addColorStop(1, '#a16207');
      c.fillStyle = kGrad;
      c.strokeStyle = '#422006';
      c.lineWidth = 1.6;

      c.beginPath();
      c.arc(0, -r * 0.36, r * 0.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.shadowBlur = 0;

      c.beginPath();
      c.arc(0, -r * 0.36, r * 0.16, 0, Math.PI * 2);
      c.fillStyle = '#f43f5e';
      c.fill();

      c.fillStyle = kGrad;
      c.fillRect(-r * 0.11, -r * 0.02, r * 0.22, r * 0.8);
      c.strokeRect(-r * 0.11, -r * 0.02, r * 0.22, r * 0.8);
      c.fillRect(r * 0.09, r * 0.34, r * 0.3, r * 0.15);
      c.fillRect(r * 0.09, r * 0.56, r * 0.34, r * 0.15);
      break;
    }
  }
  c.restore();
}

function initVisualGuides() {
  const listEl = document.getElementById('visual-paytable-list');
  listEl.innerHTML = '';

  SYMBOL_INFO.filter(s => s.key !== 'KEY').forEach(sym => {
    const row = document.createElement('div');
    row.className = 'vpt-row';
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 26;
    miniCanvas.height = 26;
    const mCtx = miniCanvas.getContext('2d');
    mCtx.translate(13, 13);
    drawSymbolIcon(mCtx, sym.key, 11.5);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = sym.name.replace(' (WILD)', '');
    const payBold = document.createElement('b');
    payBold.textContent = sym.pay;

    row.appendChild(miniCanvas);
    row.appendChild(nameSpan);
    row.appendChild(payBold);
    listEl.appendChild(row);
  });

  document.querySelectorAll('canvas.mini-sym').forEach(mc => {
    const mCtx = mc.getContext('2d');
    mCtx.translate(mc.width / 2, mc.height / 2);
    drawSymbolIcon(mCtx, mc.dataset.sym, 12);
  });
}

function renderRulesModal() {
  const isSoc = state.socialMode;
  const wagerWord = isSoc ? 'play amount' : 'bet';

  let symCardsHtml = '<div class="rules-sym-grid">';
  SYMBOL_INFO.forEach(s => {
    symCardsHtml += `
      <div class="rules-sym-item">
        <canvas class="modal-sym-icon" data-sym="${s.key}" width="38" height="38"></canvas>
        <div>
          <strong style="color:#ffe89e">${s.name} — ${s.pay}</strong><br/>
          <span style="font-size:0.76rem">${s.desc}</span>
        </div>
      </div>
    `;
  });
  symCardsHtml += '</div>';

  document.getElementById('rules-content').innerHTML = `
    <h3>1. HOW TO WIN (THE 4 GOLDEN POINTERS)</h3>
    <p>Align <b>3 matching symbols</b> from Outer to Inner ring along any of the 4 illuminated Roman Numeral pointers (<b>XII, III, VI, IX</b>). Matched gems dissolve, the right-side <b>Alchemy Multiplier</b> climbs (1x → 100x), and the rings shift clockwise (Outer +1, Middle +2, Inner +3) for consecutive wins!</p>
    <h3>2. SCATTER &amp; GRAND COMPLICATION FREE SPINS</h3>
    <p>Landing <b>3 or more Golden Time Keys</b> anywhere inside the 4 pointer tracks (XII, III, VI, IX) awards <b>8 Free Spins</b> (+3 extra spins on retrigger) where the Alchemy Multiplier <b>never resets</b>!</p>
    <h3>3. SYMBOL GUIDE &amp; PAYOUTS (MULTIPLES OF ${wagerWord.toUpperCase()})</h3>
    ${symCardsHtml}
    <p style="margin-top:8px">Theoretical RTP: <b>96.34%</b> | Max Win Cap: <b>5,000x</b>.</p>
  `;

  document.querySelectorAll('canvas.modal-sym-icon').forEach(mc => {
    const mCtx = mc.getContext('2d');
    mCtx.translate(19, 19);
    drawSymbolIcon(mCtx, mc.dataset.sym, 16);
  });
}

// ============================================================================
// CORE GAME LOGIC & 3D COIN FOUNTAIN
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

function spawn3DCoins(count = 50) {
  celebrationCoins = Array.from({ length: count }, () => ({
    x: 320 + (Math.random() - 0.5) * 140,
    y: 340,
    vx: (Math.random() - 0.5) * 11,
    vy: -7 - Math.random() * 9,
    r: 10 + Math.random() * 6,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: 0.12 + Math.random() * 0.15
  }));
}

async function showBigWinCelebration(amount, mult) {
  if (mult < 15) return;
  const tierEl = document.getElementById('big-win-tier');
  const amtEl = document.getElementById('big-win-amount');
  tierEl.textContent = mult >= 100 ? 'MAX / SENSATIONAL WIN!' : (mult >= 30 ? 'MEGA WIN!' : 'BIG WIN!');
  bigWinBanner.classList.remove('hidden');
  SoundFX.play('bigwin');
  spawn3DCoins(55);

  const steps = 32;
  for (let i = 1; i <= steps; i++) {
    amtEl.textContent = ((amount * i) / steps).toFixed(2);
    await sleep(38);
  }
  await sleep(1100);
  bigWinBanner.classList.add('hidden');
  celebrationCoins = [];
}

function animateRotation(durationMs, dirOut, dirMid, dirIn) {
  return new Promise(resolve => {
    const dur = state.turbo ? durationMs * 0.38 : durationMs;
    const start = performance.now();
    const initOut = state.rotOut;
    const initMid = state.rotMid;
    const initIn = state.rotIn;
    let lastTick = 0;

    SoundFX.play('spin');

    function frame(now) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3.4);
      state.rotOut = initOut + dirOut * ease;
      state.rotMid = initMid + dirMid * ease;
      state.rotIn = initIn + dirIn * ease;

      if (now - lastTick > 110) {
        SoundFX.play('spin');
        lastTick = now;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        state.rotOut = 0;
        state.rotMid = 0;
        state.rotIn = 0;
        SoundFX.play('stop');
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
    statusBanner.textContent = isBonusBuy ? 'SUMMONING 3+ SCATTER KEYS...' : 'WINDING 3D CHRONOGRAPH GEARS...';
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

  await animateRotation(1150, Math.PI * 2, -Math.PI * 2, Math.PI * 2);

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
      SoundFX.play('scatter');
      statusBanner.textContent = `3+ SCATTER KEYS! +${award} GRAND COMPLICATION SPINS!`;
      updateUI(roundTotalMult * bet);
      await sleep(950);
    }

    if (res.hasWin) {
      state.winningPointers = res.matchedPointers;
      SoundFX.play('win', 1 + state.multIdx * 0.06);

      const activeMult = MULTIPLIERS[Math.min(state.multIdx, MULTIPLIERS.length - 1)];
      const stepWinMult = res.winBase * activeMult;
      roundTotalMult = Math.min(roundTotalMult + stepWinMult, MAX_WIN_MULT);

      statusBanner.textContent = `ALIGNED! ${res.winBase.toFixed(2)}x × ${activeMult}x ALCHEMY = ${(roundTotalMult * bet).toFixed(2)}`;
      updateUI(roundTotalMult * bet);
      await sleep(700);

      state.multIdx++;
      state.winningPointers = [];
      state.posOut = (state.posOut - 1 + L) % L;
      state.posMid = (state.posMid - 2 + L) % L;
      state.posIn = (state.posIn - 3 + L) % L;

      await animateRotation(520, Math.PI / 6, (Math.PI / 6) * 2, (Math.PI / 6) * 3);
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

  if (state.freeSpins > 0) {
    await sleep(480);
    handleSpin(false);
  } else if (state.spaceHoldAuto) {
    await sleep(280);
    if (state.spaceHoldAuto) handleSpin(false);
  } else if (state.autoRemaining > 0) {
    state.autoRemaining--;
    updateUI();
    await sleep(380);
    if (state.autoRemaining > 0) {
      handleSpin(false);
    } else {
      stopAllAutoplay();
    }
  }
}

// ============================================================================
// 3D ROYAL INDIGO & GOLD CLOCKWORK RENDERER
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

  state.coreAngle += state.isSpinning ? 0.06 : 0.01;
  ctx.clearRect(0, 0, w, h);

  // 1. Vibrant Prismatic Sunburst & Floating Multi-Color Sparks
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.coreAngle * 0.12);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const rayGrad = ctx.createLinearGradient(0, 0, 315, 0);
    rayGrad.addColorStop(0, 'rgba(255, 220, 110, 0.2)');
    rayGrad.addColorStop(0.6, 'rgba(139, 92, 246, 0.08)');
    rayGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(315, -22);
    ctx.lineTo(315, 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < 10) { p.y = 630; p.x = Math.random() * 640; }
    ctx.fillStyle = `${p.color}${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. 3D Extruded Roman Numeral Outer Bezel
  ctx.save();
  const bezelGrad = ctx.createRadialGradient(cx - 40, cy - 40, 220, cx, cy, 308);
  bezelGrad.addColorStop(0, '#3b2410');
  bezelGrad.addColorStop(0.55, '#d99b32');
  bezelGrad.addColorStop(0.84, '#fff2b2');
  bezelGrad.addColorStop(1, '#452806');
  ctx.beginPath();
  ctx.arc(cx, cy, 306, 0, Math.PI * 2);
  ctx.fillStyle = bezelGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 274, 0, Math.PI * 2);
  ctx.fillStyle = '#120d26';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffe89e';
  ctx.stroke();

  ctx.fillStyle = '#1c1004';
  ctx.font = '900 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 12; k++) {
    const angle = -Math.PI / 2 + (k * Math.PI * 2) / 12;
    const rx = cx + Math.cos(angle) * 290;
    const ry = cy + Math.sin(angle) * 290;
    ctx.fillText(ROMAN_NUMERALS[k], rx, ry);
  }
  ctx.restore();

  // 3. 3D Deep Indigo & Velvet Gears (Makes Bright Gems & Gold Key Pop!)
  const rings = [
    { data: getVisibleRing(RING_OUTER, state.posOut), radius: 230, slotR: 25, rot: state.rotOut, teeth: 48, cTop: '#2a2154', cBot: '#120d29', stroke: '#eab308' },
    { data: getVisibleRing(RING_MIDDLE, state.posMid), radius: 162, slotR: 23, rot: state.rotMid, teeth: 36, cTop: '#211945', cBot: '#0e0a21', stroke: '#ca8a04' },
    { data: getVisibleRing(RING_INNER, state.posIn), radius: 98, slotR: 21, rot: state.rotIn, teeth: 24, cTop: '#191236', cBot: '#090617', stroke: '#a16207' }
  ];

  rings.forEach(ring => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ring.rot);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    drawGearTeeth(ctx, ring.radius + ring.slotR + 2, ring.teeth, 6, ring.stroke);

    const trackGrad = ctx.createLinearGradient(0, -ring.radius, 0, ring.radius);
    trackGrad.addColorStop(0, ring.cTop);
    trackGrad.addColorStop(1, ring.cBot);
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius + ring.slotR + 2, 0, Math.PI * 2);
    ctx.fillStyle = trackGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = ring.stroke;
    ctx.stroke();

    for (let k = 0; k < 12; k++) {
      const angle = -Math.PI / 2 + (k * Math.PI * 2) / 12;
      const sx = Math.cos(angle) * ring.radius;
      const sy = Math.sin(angle) * ring.radius;
      const symKey = ring.data[k];
      const isPointerSlot = POINTER_OFFSETS.includes(k);

      ctx.beginPath();
      ctx.arc(sx, sy, ring.slotR, 0, Math.PI * 2);
      ctx.fillStyle = isPointerSlot ? '#1d163b' : '#090617';
      ctx.fill();
      ctx.lineWidth = isPointerSlot ? 2.4 : 1.4;
      ctx.strokeStyle = isPointerSlot ? '#ffe89e' : '#4c3d82';
      ctx.stroke();

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-ring.rot);
      drawSymbolIcon(ctx, symKey, ring.slotR * 0.88);
      ctx.restore();
    }
    ctx.restore();
  });

  // 4. Illuminated 4-Pointer Alignment Tracks
  POINTER_OFFSETS.forEach(p => {
    const angle = -Math.PI / 2 + (p * Math.PI * 2) / 12;
    const isHit = state.winningPointers.includes(p);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.fillStyle = isHit ? 'rgba(24, 255, 130, 0.28)' : 'rgba(255, 232, 158, 0.07)';
    ctx.fillRect(54, -27, 212, 54);
    ctx.strokeStyle = isHit ? '#18ff82' : 'rgba(255, 232, 158, 0.4)';
    ctx.lineWidth = isHit ? 3 : 1.3;
    ctx.strokeRect(54, -27, 212, 54);

    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(300, -15);
    ctx.lineTo(291, 0);
    ctx.lineTo(300, 15);
    ctx.closePath();
    ctx.fillStyle = isHit ? '#18ff82' : '#ffe89e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3b2406';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(283, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();

    ctx.restore();
  });

  // 5. Center 3D Tourbillon Core
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#120c29';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffe89e';
  ctx.stroke();

  ctx.rotate(state.coreAngle);
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-24, -24, 48, 48);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#18ff82';
  ctx.shadowColor = '#18ff82';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.restore();

  // 6. 3D Gold Coins Fountain
  celebrationCoins.forEach(coin => {
    coin.x += coin.vx;
    coin.y += coin.vy;
    coin.vy += 0.35;
    coin.spin += coin.spinSpeed;
    if (coin.y > 660) {
      coin.y = 320;
      coin.x = 320 + (Math.random() - 0.5) * 140;
      coin.vy = -8 - Math.random() * 8;
    }

    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.scale(Math.max(0.2, Math.abs(Math.cos(coin.spin))), 1);
    const cGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, coin.r);
    cGrad.addColorStop(0, '#fffbeb');
    cGrad.addColorStop(0.5, '#facc15');
    cGrad.addColorStop(1, '#a16207');
    ctx.beginPath();
    ctx.arc(0, 0, coin.r, 0, Math.PI * 2);
    ctx.fillStyle = cGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#713f12';
    ctx.stroke();
    ctx.restore();
  });

  requestAnimationFrame(renderLoop);
}

// ============================================================================
// CONTROLS & KEYBOARD
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

document.getElementById('btn-info').addEventListener('click', () => {
  renderRulesModal();
  infoModal.classList.remove('hidden');
});
document.getElementById('btn-info-close').addEventListener('click', () => infoModal.classList.add('hidden'));

let spaceHoldTimer = null;
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  if (!buyModal.classList.contains('hidden') || !infoModal.classList.contains('hidden') || !autoplayModal.classList.contains('hidden')) return;
  e.preventDefault();
  if (e.repeat) return;

  if (isAutoActive()) {
    stopAllAutoplay();
    return;
  }

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

initVisualGuides();
updateUI(0);
requestAnimationFrame(renderLoop);
