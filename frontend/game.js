// AETHER DIAL — clockwork dial game client for Stake Engine.
// Outcomes come from the RGS (book events); this file only animates them.

const PAYTABLE = {
  NUT: 0.35,      // Coral Elixir Flask
  SPRING: 0.75,   // Platinum & Amber Hourglass
  GEAR: 1.60,     // Neon Magenta Crystal
  SAPPHIRE: 3.20, // Electric Cyan Diamond
  EMERALD: 6.50,  // Vivid Forest Emerald
  RUBY: 16.00,    // Crimson Heart Ruby
  WILD: 28.00     // Astral Sun Core (WILD)
};

const SYMBOL_INFO = [
  { key: 'WILD',     name: 'Astral Sun (WILD)',     pay: '28.0x', desc: 'Substitutes for any symbol except Golden Key. 3 aligned Suns pay 28.0x!' },
  { key: 'RUBY',     name: 'Crimson Ruby',          pay: '16.0x', desc: 'Fiery red royal gemstone — highest standard symbol payout.' },
  { key: 'EMERALD',  name: 'Neon Emerald',          pay: '6.5x',  desc: 'Vivid green alchemical emerald.' },
  { key: 'SAPPHIRE', name: 'Electric Diamond',      pay: '3.2x',  desc: 'Bright ice-cyan faceted diamond.' },
  { key: 'GEAR',     name: 'Neon Magenta',          pay: '1.6x',  desc: 'Luminous pink-magenta crystal shard.' },
  { key: 'SPRING',   name: 'Amber Hourglass',       pay: '0.75x', desc: 'Platinum frame with glowing golden sands.' },
  { key: 'NUT',      name: 'Coral Elixir',          pay: '0.35x', desc: 'Bright tangerine potion vial.' },
  { key: 'KEY',      name: 'Golden Key (SCATTER)',  pay: 'BONUS', desc: 'Land 3 or more Golden Keys anywhere inside the 4 crystal pointer frames (XII, III, VI, IX) to trigger 8 Free Spins (+5 extra spins if 3+ Keys land again during Free Spins)!' }
];

// 36-stop virtual rings
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

// Symbol descriptions use neutral wording so they are valid in social mode too.
SYMBOL_INFO.forEach(s => {
  const neutral = {
    WILD: 'Substitutes for every symbol except the Golden Key. Three Suns in one frame award 28x.',
    RUBY: 'Highest regular symbol.',
    EMERALD: 'High symbol.',
    SAPPHIRE: 'Middle symbol.',
    GEAR: 'Middle symbol.',
    SPRING: 'Low symbol.',
    NUT: 'Low symbol.',
    KEY: 'Scatter. 3 or more Golden Keys inside the four pointer frames on the first stop of a spin trigger 8 Free Spins. 3 or more during Free Spins add 5 more.'
  };
  s.desc = neutral[s.key];
});

const RING_LEN = RING_OUTER.length;
const SLOT_ANGLE = (Math.PI * 2) / 12;
const RING_GEOM = [
  { strip: RING_OUTER, radius: 230, slotR: 25, teeth: 48, cTop: '#181426', cBot: '#090712', stroke: '#eab308' },
  { strip: RING_MIDDLE, radius: 162, slotR: 23, teeth: 36, cTop: '#141021', cBot: '#07050d', stroke: '#ca8a04' },
  { strip: RING_INNER, radius: 98, slotR: 21, teeth: 24, cTop: '#100d1a', cBot: '#05040a', stroke: '#a16207' }
];
// Display-only cost of the bonus mode; the real debit is done by the RGS.
const BONUS_BUY_MULT = 100;
// RGS bet mode names (index.json uses "base"/"bonus"; the RGS is case-insensitive).
const MODE_BASE = 'BASE';
const MODE_BONUS = 'BONUS';
// Published math (math/publish_files): RTP and highest achievable win per mode.
const MODE_INFO = {
  BASE: { rtp: '96.36%', maxWin: '2,336.95x' },
  BONUS: { rtp: '96.34%', maxWin: '5,000x' }
};

const URL_PARAMS = new URLSearchParams(window.location.search);
const DEBUG = URL_PARAMS.get('debug') === 'true';
function debugLog(...args) {
  if (DEBUG) console.log('[Aether Dial]', ...args);
}
const mod = (n, m) => ((n % m) + m) % m;

// ============================================================================
// TEXT — standard and social (stake.us) wording.
// Social replacements follow docs/reference/social-mode (restricted phrases).
// ============================================================================
const TEXT = {
  std: {
    balance: 'BALANCE', win: 'WIN', bet: 'BET', totalWin: 'TOTAL WIN', spinWord: 'SPIN',
    freeSpins: 'FREE SPINS', multiplier: 'MULTIPLIER',
    buyTitle: 'BUY FREE SPINS', buySub: '3+ GOLDEN KEYS GUARANTEED',
    buyHeading: 'BUY FREE SPINS', buyCostLabel: 'COST', buyConfirm: 'BUY',
    buyText: 'Instantly start 8 Free Spins with 3 or more Golden Keys guaranteed on the first spin. The multiplier never resets during Free Spins.',
    paytableTitle: 'SYMBOL PAYOUTS', scatterTitle: '3+ GOLDEN KEYS', scatterSub: '8 Free Spins, +5 on retrigger',
    autoTitle: 'AUTOPLAY', autoText: 'Choose the number of spins, then press START.', autoStart: 'START', cancel: 'CANCEL',
    rulesTitle: 'GAME RULES', historyTitle: 'ROUND HISTORY', watchAgain: 'WATCH AGAIN',
    replayRibbon: 'REPLAY', replayTitle: 'ROUND REPLAY', replayMode: 'MODE', replayBaseBet: 'BASE BET',
    replayCostMult: 'COST MULTIPLIER', replayRealCost: 'REAL COST', replayWin: 'WIN',
    replayPlay: 'PLAY REPLAY', replayAgain: 'PLAY AGAIN', replayLoading: 'LOADING REPLAY...',
    history: 'Round history', sound: 'Sound on/off', info: 'Game rules', decrease: 'Decrease bet', increase: 'Increase bet',
    autoplay: 'Autoplay', spin: 'Spin', turbo: 'Turbo', close: 'Close',
    idle: 'MATCH 3 SYMBOLS IN A POINTER FRAME', insufficient: 'INSUFFICIENT BALANCE', modeBase: 'BASE GAME', modeBonus: 'BONUS BUY'
  },
  social: {
    balance: 'BALANCE', win: 'WIN', bet: 'PLAY', totalWin: 'TOTAL WIN', spinWord: 'SPIN',
    freeSpins: 'FREE SPINS', multiplier: 'MULTIPLIER',
    buyTitle: 'GET FREE SPINS', buySub: '3+ GOLDEN KEYS GUARANTEED',
    buyHeading: 'GET FREE SPINS', buyCostLabel: 'PLAY FOR', buyConfirm: 'START',
    buyText: 'Instantly trigger 8 Free Spins with 3 or more Golden Keys guaranteed on the first spin. The multiplier never resets during Free Spins.',
    paytableTitle: 'SYMBOL WINS', scatterTitle: '3+ GOLDEN KEYS', scatterSub: '8 Free Spins, +5 on retrigger',
    autoTitle: 'AUTOPLAY', autoText: 'Choose the number of spins, then press START.', autoStart: 'START', cancel: 'CANCEL',
    rulesTitle: 'GAME RULES', historyTitle: 'ROUND HISTORY', watchAgain: 'WATCH AGAIN',
    replayRibbon: 'REPLAY', replayTitle: 'ROUND REPLAY', replayMode: 'MODE', replayBaseBet: 'BASE PLAY',
    replayCostMult: 'MULTIPLIER', replayRealCost: 'TOTAL PLAY', replayWin: 'WIN',
    replayPlay: 'START REPLAY', replayAgain: 'WATCH AGAIN', replayLoading: 'LOADING REPLAY...',
    history: 'Round history', sound: 'Sound on/off', info: 'Game rules', decrease: 'Decrease play amount', increase: 'Increase play amount',
    autoplay: 'Autoplay', spin: 'Spin', turbo: 'Turbo', close: 'Close',
    idle: 'MATCH 3 SYMBOLS IN A POINTER FRAME', insufficient: 'INSUFFICIENT COINS', modeBase: 'BASE GAME', modeBonus: 'BONUS FEATURE'
  }
};

function t(key) {
  const set = state.socialMode ? TEXT.social : TEXT.std;
  return set[key] !== undefined ? set[key] : TEXT.std[key] || key;
}

function applyTexts() {
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-t-title]').forEach(el => {
    el.title = t(el.dataset.tTitle);
    el.setAttribute('aria-label', t(el.dataset.tTitle));
  });
}

function modeLabel(mode) {
  return String(mode).toUpperCase() === MODE_BONUS ? t('modeBonus') : t('modeBase');
}

const state = {
  // money values are RGS integer units (1,000,000 = 1.00)
  balance: 0,
  currency: 'USD',
  betLevels: [],
  betIdx: 0,
  jurisdiction: {},
  replayMode: false,
  multIdx: 0,
  freeSpins: 0,
  isSpinning: false,
  turbo: false,
  soundOn: true,
  socialMode: false,
  autoRemaining: 0,
  autoPick: 0
};

const sparkColors = ['rgba(255,224,130,', 'rgba(244,114,182,', 'rgba(52,211,153,', 'rgba(56,189,248,'];
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

// ============================================================================
// 8-CHANNEL MP3 AUDIO ENGINE (frontend/sounds/*.mp3)
// ============================================================================
const SoundFX = {
  ctx: null,
  mp3Ready: {},
  tracks: {},
  soundNames: ['spin', 'stop', 'win', 'scatter', 'retrigger', 'buybonus', 'bigwin', 'maxwin'],

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();

    if (Object.keys(this.tracks).length === 0) {
      this.soundNames.forEach(name => {
        const audio = new Audio(`sounds/${name}.mp3`);
        audio.preload = 'auto';
        audio.addEventListener('canplaythrough', () => { this.mp3Ready[name] = true; }, { once: true });
        this.tracks[name] = audio;
      });
    }
  },

  play(name, pitchRate = 1.0, volume = 0.85) {
    if (!state.soundOn) return;
    this.init();

    if (this.mp3Ready[name] && this.tracks[name]) {
      try {
        const clone = this.tracks[name].cloneNode();
        clone.volume = Math.min(Math.max(volume, 0), 1);
        clone.playbackRate = pitchRate;
        clone.play().catch(() => {});
        return;
      } catch (e) {}
    }

    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    const fallbackFreqs = {
      spin: 170,
      stop: 110,
      win: 440 * pitchRate,
      scatter: 587.33,
      retrigger: 659.25,
      buybonus: 523.25,
      bigwin: 783.99,
      maxwin: 1046.50
    };

    osc.frequency.setValueAtTime(fallbackFreqs[name] || 300, now);
    if (name === 'spin' || name === 'stop') {
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.06);
    } else {
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    }
  },

  // Rising tone for the tension moment (two Golden Keys landed).
  riser(durationMs) {
    if (!state.soundOn) return;
    this.init();
    if (!this.ctx) return;
    const dur = Math.max(0.3, durationMs / 1000);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + dur);
    lfo.frequency.setValueAtTime(7, now);
    lfoGain.gain.setValueAtTime(14, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.15);
    gain.gain.setValueAtTime(0.07, now + dur - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + dur + 0.05);
    lfo.stop(now + dur + 0.05);
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
const spinIcon = document.getElementById('spin-icon');
const btnAutoplay = document.getElementById('btn-autoplay');
const autoBadge = document.getElementById('auto-count-badge');
const btnTurbo = document.getElementById('btn-turbo');
const btnBetUp = document.getElementById('btn-bet-up');
const btnBetDown = document.getElementById('btn-bet-down');
const btnBonusBuy = document.getElementById('btn-bonus-buy');
const autoplayModal = document.getElementById('autoplay-modal');
const btnAutoStart = document.getElementById('btn-auto-start');
const buyModal = document.getElementById('buy-modal');
const infoModal = document.getElementById('info-modal');
const bigWinBanner = document.getElementById('big-win-banner');
const gameWrapper = document.getElementById('game-wrapper');

function getBet() {
  return state.betLevels[state.betIdx] || 0;
}

function money(units) {
  return window.StakeRGS.formatMoney(units, state.currency);
}

function setStatus(text) {
  statusBanner.textContent = text;
}

function isAutoActive() {
  return state.autoRemaining > 0;
}

function stopAllAutoplay() {
  state.autoRemaining = 0;
  updateUI();
}

function anyModalOpen() {
  return [autoplayModal, buyModal, infoModal, document.getElementById('replay-modal')]
    .some(m => !m.classList.contains('hidden'));
}

function updateUI() {
  const bet = getBet();
  const j = state.jurisdiction || {};
  valBalance.textContent = money(state.balance);
  valBet.textContent = money(bet);
  fsCounter.textContent = state.freeSpins;
  document.getElementById('val-buy-cost').textContent = money(bet * BONUS_BUY_MULT);

  gameWrapper.classList.toggle('in-free-spins', state.freeSpins > 0);

  document.querySelectorAll('.mult-step').forEach(el => {
    const idx = parseInt(el.dataset.idx, 10);
    el.classList.toggle('active', idx === Math.min(state.multIdx, MULTIPLIERS.length - 1));
  });

  btnAutoplay.classList.toggle('running', isAutoActive());
  autoBadge.textContent = isAutoActive() ? String(state.autoRemaining) : '';
  autoBadge.classList.toggle('hidden', !isAutoActive());
  btnTurbo.classList.toggle('active-toggle', state.turbo);
  spinIcon.innerHTML = `<use href="${isAutoActive() ? '#ico-stop' : '#ico-spin'}"/>`;
  btnSpin.classList.toggle('busy', state.isSpinning && !isAutoActive());

  const locked = state.isSpinning || isAutoActive() || state.replayMode;
  btnBonusBuy.disabled = locked || state.freeSpins > 0 || j.disabledBuyFeature === true;
  btnBonusBuy.classList.toggle('hidden', j.disabledBuyFeature === true || state.replayMode);
  btnAutoplay.classList.toggle('hidden', j.disabledAutoplay === true);
  btnTurbo.classList.toggle('hidden', j.disabledTurbo === true);
  btnBetDown.disabled = locked || state.betIdx <= 0;
  btnBetUp.disabled = locked || state.betIdx >= state.betLevels.length - 1;
  gameWrapper.classList.toggle('replay-mode', state.replayMode);
}

// Smooth win counter in the control bar.
let displayedWin = 0;
let winTweenToken = 0;
function setWinInstant(units) {
  winTweenToken++;
  displayedWin = units;
  valWin.textContent = money(units);
}
function animateWinTo(units, ms = 650) {
  const from = displayedWin;
  const token = ++winTweenToken;
  const dur = Math.max(250, state.turbo ? ms * 0.5 : ms);
  const start = performance.now();
  valWin.classList.add('counting');
  return new Promise(resolve => {
    function frame(now) {
      if (token !== winTweenToken) return resolve();
      const k = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - k, 3);
      displayedWin = Math.round(from + (units - from) * e);
      valWin.textContent = money(displayedWin);
      if (k < 1) requestAnimationFrame(frame);
      else { valWin.classList.remove('counting'); resolve(); }
    }
    requestAnimationFrame(frame);
  });
}

// ============================================================================
// SYMBOL RENDERER
// ============================================================================
function draw3DFacetedJewel(c, r, cTop, cMid, cDeep, cRim, sides = 8) {
  c.save();
  c.shadowColor = cMid;
  c.shadowBlur = 12;

  c.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * Math.PI * 2) / sides - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();

  const grad = c.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.05, 0, 0, r * 1.08);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.26, cTop);
  grad.addColorStop(0.66, cMid);
  grad.addColorStop(1, cDeep);
  c.fillStyle = grad;
  c.fill();

  c.shadowBlur = 0;
  c.lineWidth = 2;
  c.strokeStyle = cRim;
  c.stroke();

  const innerR = r * 0.52;
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 1;
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
  c.fillStyle = 'rgba(255,255,255,0.38)';
  c.fill();

  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(-r * 0.28, -r * 0.3, r * 0.14, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawSymbolIcon(c, type, r) {
  c.save();
  switch (type) {
    case 'WILD': {
      c.shadowColor = '#00f5d4';
      c.shadowBlur = 16;
      const spikes = 8;
      c.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const rad = i % 2 === 0 ? r * 0.98 : r * 0.45;
        const a = (i * Math.PI) / spikes;
        const x = Math.cos(a) * rad;
        const y = Math.sin(a) * rad;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      const sGrad = c.createRadialGradient(0, 0, 1, 0, 0, r);
      sGrad.addColorStop(0, '#ffffff');
      sGrad.addColorStop(0.55, '#5eead4');
      sGrad.addColorStop(1, '#0891b2');
      c.fillStyle = sGrad;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = 1.8;
      c.strokeStyle = '#ffffff';
      c.stroke();

      c.beginPath();
      c.arc(0, 0, r * 0.26, 0, Math.PI * 2);
      c.fillStyle = '#ffffff';
      c.fill();
      break;
    }
    case 'RUBY':
      draw3DFacetedJewel(c, r * 0.92, '#ffb3c1', '#ff1e56', '#7f0926', '#ffe5ec', 8);
      break;
    case 'EMERALD':
      draw3DFacetedJewel(c, r * 0.9, '#a7f3d0', '#00e676', '#044726', '#d1fae5', 6);
      break;
    case 'SAPPHIRE':
      draw3DFacetedJewel(c, r * 0.95, '#e0f2fe', '#00d4ff', '#0369a1', '#ffffff', 4);
      break;
    case 'GEAR':
      draw3DFacetedJewel(c, r * 0.95, '#fbcfe8', '#f43f8e', '#701a45', '#fdf2f8', 5);
      break;
    case 'SPRING': {
      c.shadowColor = '#fbbf24';
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(-r * 0.56, -r * 0.68);
      c.lineTo(r * 0.56, -r * 0.68);
      c.lineTo(0, 0);
      c.lineTo(r * 0.56, r * 0.68);
      c.lineTo(-r * 0.56, r * 0.68);
      c.lineTo(0, 0);
      c.closePath();
      const glassGrad = c.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
      glassGrad.addColorStop(0, '#f8fafc');
      glassGrad.addColorStop(0.5, '#ffffff');
      glassGrad.addColorStop(1, '#cbd5e1');
      c.fillStyle = glassGrad;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = 1.8;
      c.strokeStyle = '#ffffff';
      c.stroke();

      c.beginPath();
      c.moveTo(-r * 0.38, r * 0.62);
      c.lineTo(r * 0.38, r * 0.62);
      c.lineTo(0, r * 0.18);
      c.closePath();
      c.fillStyle = '#f59e0b';
      c.fill();

      c.fillStyle = '#f1f5f9';
      c.fillRect(-r * 0.66, -r * 0.82, r * 1.32, r * 0.17);
      c.fillRect(-r * 0.66, r * 0.65, r * 1.32, r * 0.17);
      break;
    }
    case 'NUT':
    default: {
      c.shadowColor = '#fb923c';
      c.shadowBlur = 10;
      const flaskGrad = c.createRadialGradient(-r * 0.25, -r * 0.05, 2, 0, r * 0.16, r * 0.72);
      flaskGrad.addColorStop(0, '#ffffff');
      flaskGrad.addColorStop(0.35, '#fdba74');
      flaskGrad.addColorStop(0.75, '#f97316');
      flaskGrad.addColorStop(1, '#9a3412');
      c.beginPath();
      c.arc(0, r * 0.16, r * 0.67, 0, Math.PI * 2);
      c.fillStyle = flaskGrad;
      c.fill();
      c.shadowBlur = 0;
      c.lineWidth = 1.8;
      c.strokeStyle = '#ffedd5';
      c.stroke();

      c.fillStyle = '#f8fafc';
      c.fillRect(-r * 0.2, -r * 0.64, r * 0.4, r * 0.24);
      c.fillStyle = '#eab308';
      c.fillRect(-r * 0.16, -r * 0.82, r * 0.32, r * 0.2);

      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(-r * 0.24, r * 0.02, r * 0.14, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'KEY': {
      c.shadowColor = '#fde047';
      c.shadowBlur = 15;
      const kGrad = c.createLinearGradient(-r, -r, r, r);
      kGrad.addColorStop(0, '#ffffff');
      kGrad.addColorStop(0.4, '#fde047');
      kGrad.addColorStop(1, '#b45309');
      c.fillStyle = kGrad;
      c.strokeStyle = '#fef9c3';
      c.lineWidth = 1.5;

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
      c.fillRect(r * 0.09, r * 0.34, r * 0.3, r * 0.15);
      c.fillRect(r * 0.09, r * 0.56, r * 0.34, r * 0.15);
      break;
    }
  }
  c.restore();
}

// ============================================================================
// PAYTABLE PANEL & RULES
// ============================================================================
function payLabel(key) {
  return key === 'KEY' ? 'SCATTER' : `${PAYTABLE[key]}x`;
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
    payBold.textContent = payLabel(sym.key);

    row.appendChild(miniCanvas);
    row.appendChild(nameSpan);
    row.appendChild(payBold);
    listEl.appendChild(row);
  });

  document.querySelectorAll('canvas.mini-sym').forEach(mc => {
    const mCtx = mc.getContext('2d');
    mCtx.setTransform(1, 0, 0, 1, 0, 0);
    mCtx.clearRect(0, 0, mc.width, mc.height);
    mCtx.translate(mc.width / 2, mc.height / 2);
    drawSymbolIcon(mCtx, mc.dataset.sym, 12);
  });
}

function renderRulesModal() {
  const soc = state.socialMode;
  const w = (std, social) => (soc ? social : std);
  const year = new Date().getFullYear();
  const bonusCost = money(getBet() * BONUS_BUY_MULT);

  let symCardsHtml = '<div class="rules-sym-grid">';
  SYMBOL_INFO.forEach(s => {
    symCardsHtml += `
      <div class="rules-sym-item">
        <canvas class="modal-sym-icon" data-sym="${s.key}" width="38" height="38"></canvas>
        <div>
          <strong>${s.name} — ${payLabel(s.key)}</strong><br/>
          <span>${s.desc}</span>
        </div>
      </div>`;
  });
  symCardsHtml += '</div>';

  const multList = MULTIPLIERS.map(m => `${m}x`).join(' → ');

  document.getElementById('rules-content').innerHTML = `
    <h3>HOW TO WIN</h3>
    <p>The dial has three rings (outer, middle, inner) and four pointer frames at <b>XII, III, VI and IX</b>.
    A frame wins when the three symbols inside it match. The Astral Sun (Wild) substitutes for every symbol except the Golden Key;
    a frame with only Suns awards 28x. A frame that contains a Golden Key does not form a symbol win.
    Wins of all frames are added together and multiplied by the current multiplier.
    Symbol values below are multiples of the ${w('bet', 'play amount')}.</p>

    <h3>CHAIN WINS AND MULTIPLIER</h3>
    <p>After every win, the winning symbols burst, the multiplier climbs one level and the rings turn clockwise
    (outer ring 1 step, middle ring 2 steps, inner ring 3 steps). If the new position wins again, the chain continues.
    Multiplier levels: ${multList}. In the base game the multiplier starts at 1x on every spin.</p>

    <h3>FREE SPINS</h3>
    <p>3 or more Golden Keys inside the four pointer frames when the rings stop award <b>8 Free Spins</b>.
    3 or more Golden Keys on a Free Spin award <b>5 more Free Spins</b>.
    During Free Spins the multiplier is not reset between spins.</p>

    <h3>${w('BUY FREE SPINS', 'GET FREE SPINS')}</h3>
    <p>${w(
      `Free Spins can be bought for 100x the bet (currently ${bonusCost}). The first spin is guaranteed to land 3 or more Golden Keys and starts 8 Free Spins.`,
      `Free Spins can be instantly triggered for 100x the play amount (currently ${bonusCost}). The first spin is guaranteed to land 3 or more Golden Keys and starts 8 Free Spins.`
    )}</p>

    <h3>SYMBOLS</h3>
    ${symCardsHtml}

    <h3>RTP AND MAXIMUM WIN</h3>
    <table class="rules-table">
      <tr><th>Mode</th><th>${w('Cost', 'Play amount')}</th><th>RTP</th><th>Max win</th></tr>
      <tr><td>${t('modeBase')}</td><td>1x</td><td>${MODE_INFO.BASE.rtp}</td><td>${MODE_INFO.BASE.maxWin}</td></tr>
      <tr><td>${w('Buy Free Spins', 'Get Free Spins')}</td><td>100x</td><td>${MODE_INFO.BONUS.rtp}</td><td>${MODE_INFO.BONUS.maxWin}</td></tr>
    </table>
    <p>Total win in one round is capped at 5,000x the ${w('bet', 'play amount')}.</p>

    <h3>CONTROLS</h3>
    <ul class="rules-ui">
      <li><svg><use href="#ico-spin"/></svg><span><b>Spin</b> — starts a round. The spacebar does the same. Pressing it while the rings turn stops them faster.</span></li>
      <li><svg><use href="#ico-minus"/></svg><svg><use href="#ico-plus"/></svg><span><b>${w('Bet', 'Play amount')}</b> — choose the ${w('bet', 'play amount')} per spin.</span></li>
      <li><svg><use href="#ico-auto"/></svg><span><b>Autoplay</b> — choose a number of spins and confirm with START. Press Spin to stop.</span></li>
      <li><svg><use href="#ico-turbo"/></svg><span><b>Turbo</b> — faster animations.</span></li>
      <li><svg><use href="#ico-history"/></svg><span><b>Round history</b> — watch your recent rounds again.</span></li>
      <li><svg><use href="#ico-sound-on"/></svg><span><b>Sound</b> — turn sound on or off.</span></li>
    </ul>

    <h3>DISCLAIMER</h3>
    <p class="rules-disclaimer">Malfunction voids all wins and plays. A consistent internet connection is required.
    In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays.
    The game display is not representative of any physical device and is for illustrative purposes only.
    Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser.
    TM and &copy; ${year} Stake Engine.</p>
  `;

  document.querySelectorAll('canvas.modal-sym-icon').forEach(mc => {
    const mCtx = mc.getContext('2d');
    mCtx.translate(19, 19);
    drawSymbolIcon(mCtx, mc.dataset.sym, 16);
  });
}

// ============================================================================
// BOARD HELPERS
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
  const keyPositions = [];
  const ringRadii = [230, 162, 98];

  for (const p of POINTER_OFFSETS) {
    const a = sOut[p];
    const b = sMid[p];
    const c = sIn[p];

    [a, b, c].forEach((sym, ringIdx) => {
      if (sym === 'KEY') {
        keyCount++;
        const angle = -Math.PI / 2 + (p * Math.PI * 2) / 12;
        keyPositions.push({
          x: 320 + Math.cos(angle) * ringRadii[ringIdx],
          y: 320 + Math.sin(angle) * ringRadii[ringIdx]
        });
      }
    });

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

  return { winBase, hasWin: matchedPointers.length > 0, keyCount, matchedPointers, keyPositions };
}

function boardAt(positions) {
  return evaluatePointers(
    getVisibleRing(RING_OUTER, positions[0]),
    getVisibleRing(RING_MIDDLE, positions[1]),
    getVisibleRing(RING_INNER, positions[2])
  );
}

// Golden Keys in the pointer frames of the given rings (used for the
// "two keys landed, waiting for the inner ring" tension moment).
function keysInFrames(positions, ringIdxs) {
  let n = 0;
  ringIdxs.forEach(r => {
    const vis = getVisibleRing(RING_GEOM[r].strip, positions[r]);
    POINTER_OFFSETS.forEach(p => { if (vis[p] === 'KEY') n++; });
  });
  return n;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, state.turbo ? ms * 0.4 : ms));
}

// ============================================================================
// DIAL VIEW — what a canvas shows. Ring positions are continuous: symbol
// strip[j] sits at angle -90deg + (j - pos) * 30deg, so a ring can be drawn
// anywhere between two stops. The main stage and the history viewer each
// own one view.
// ============================================================================
function createView() {
  return {
    pos: [0, 4, 8],
    vel: [0, 0, 0],
    vanish: [new Map(), new Map(), new Map()],
    pulse: [new Set(), new Set(), new Set()],
    sparks: [],
    winningPointers: [],
    scatterCoords: [],
    scatterPulse: 0,
    freeSpins: 0,
    coreAngle: 0,
    tension: 0,
    hurry: false,
    aborted: false,
    spinning: false
  };
}

const mainView = createView();

function slotXY(r, angle) {
  const g = RING_GEOM[r];
  return { x: 320 + Math.cos(angle) * g.radius, y: 320 + Math.sin(angle) * g.radius };
}

function stripIndexAngle(view, r, idx) {
  // angle of strip index idx for the ring's current (integer) position
  const k = mod(idx - Math.round(view.pos[r]), RING_LEN);
  return -Math.PI / 2 + k * SLOT_ANGLE;
}

function spawnBurst(view, x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4;
    view.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, r: 1.5 + Math.random() * 2.5, color });
  }
}

const SYMBOL_GLOW = {
  WILD: 'rgba(94,234,212,', RUBY: 'rgba(255,30,86,', EMERALD: 'rgba(0,230,118,', SAPPHIRE: 'rgba(0,212,255,',
  GEAR: 'rgba(244,63,142,', SPRING: 'rgba(251,191,36,', NUT: 'rgba(249,115,22,', KEY: 'rgba(253,224,71,'
};

function drawRing(c, view, r, now) {
  const g = RING_GEOM[r];
  const p = view.pos[r];
  const base = Math.floor(p);
  const f = p - base;
  const speed = Math.abs(view.vel[r]); // slots per ms
  const blur = Math.min(1, speed / 0.03);

  c.save();
  c.translate(320, 320);

  // gear body turns with the ring
  c.save();
  c.rotate(-p * SLOT_ANGLE);
  drawGearTeeth(c, g.radius + g.slotR + 2, g.teeth, 6, g.stroke);
  const trackGrad = c.createLinearGradient(0, -g.radius, 0, g.radius);
  trackGrad.addColorStop(0, g.cTop);
  trackGrad.addColorStop(1, g.cBot);
  c.beginPath();
  c.arc(0, 0, g.radius + g.slotR + 2, 0, Math.PI * 2);
  c.fillStyle = trackGrad;
  c.fill();
  c.lineWidth = 2.2;
  c.strokeStyle = g.stroke;
  c.stroke();
  c.restore();

  // 12 sockets
  for (let k = 0; k < 12; k++) {
    const ang = -Math.PI / 2 + (k - f) * SLOT_ANGLE;
    const sx = Math.cos(ang) * g.radius;
    const sy = Math.sin(ang) * g.radius;
    const atPointer = f < 0.02 && POINTER_OFFSETS.includes(k);
    c.beginPath();
    c.arc(sx, sy, g.slotR, 0, Math.PI * 2);
    c.fillStyle = '#040308';
    c.fill();
    c.lineWidth = atPointer ? 2.4 : 1.5;
    c.strokeStyle = atPointer ? 'rgba(255, 255, 255, 0.85)' : '#64748b';
    c.stroke();
  }

  // symbols; the seam between XI and XII cross-fades the entering symbol
  for (let k = 0; k <= 12; k++) {
    let alpha = 1;
    if (k === 0) alpha = 1 - f;
    else if (k === 12) alpha = f;
    if (alpha <= 0.01) continue;
    const idx = mod(base + k, RING_LEN);
    const sym = g.strip[idx];
    let scale = view.vanish[r].has(idx) ? view.vanish[r].get(idx) : 1;
    if (scale <= 0.02) continue;
    if (view.pulse[r].has(idx)) scale *= 1.08 + Math.sin(now / 90) * 0.06;

    const ang = -Math.PI / 2 + (k - f) * SLOT_ANGLE;
    const sx = Math.cos(ang) * g.radius;
    const sy = Math.sin(ang) * g.radius;

    c.save();
    c.translate(sx, sy);
    c.globalAlpha = alpha * Math.min(1, scale) * (1 - blur * 0.45);
    if (view.pulse[r].has(idx)) {
      const glow = c.createRadialGradient(0, 0, 2, 0, 0, g.slotR * 1.25);
      glow.addColorStop(0, `${SYMBOL_GLOW[sym] || 'rgba(255,255,255,'}0.75)`);
      glow.addColorStop(1, `${SYMBOL_GLOW[sym] || 'rgba(255,255,255,'}0)`);
      c.fillStyle = glow;
      c.beginPath();
      c.arc(0, 0, g.slotR * 1.25, 0, Math.PI * 2);
      c.fill();
    }
    c.scale(scale, scale);
    drawSymbolIcon(c, sym, g.slotR * 0.9);
    c.restore();

    // motion trail while spinning fast
    if (blur > 0.15) {
      const dir = Math.sign(view.vel[r]) || 1;
      for (let s = 1; s <= 2; s++) {
        const ta = ang + dir * s * 0.09 * blur;
        c.save();
        c.translate(Math.cos(ta) * g.radius, Math.sin(ta) * g.radius);
        c.globalAlpha = alpha * 0.18 * blur / s;
        drawSymbolIcon(c, sym, g.slotR * 0.9);
        c.restore();
      }
    }
  }
  c.restore();
}

function drawTension(c, view, now) {
  if (view.tension <= 0) return;
  const pulse = 0.55 + 0.45 * Math.sin(now / 110);
  c.save();
  c.translate(320, 320);
  c.globalAlpha = view.tension;
  c.lineWidth = 6;
  c.shadowColor = '#fde047';
  c.shadowBlur = 30 * pulse;
  c.strokeStyle = `rgba(253, 224, 71, ${0.35 + 0.5 * pulse})`;
  c.beginPath();
  c.arc(0, 0, RING_GEOM[2].radius, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

function updateAndDrawSparks(c, view) {
  for (let i = view.sparks.length - 1; i >= 0; i--) {
    const s = view.sparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.94;
    s.vy *= 0.94;
    s.life -= 0.03;
    if (s.life <= 0) { view.sparks.splice(i, 1); continue; }
    c.fillStyle = `${s.color}${s.life.toFixed(3)})`;
    c.beginPath();
    c.arc(s.x, s.y, s.r * s.life + 0.5, 0, Math.PI * 2);
    c.fill();
  }
}

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

function drawClockworkDialScene(targetCtx, w, h, snap) {
  const cx = 320;
  const cy = 320;
  const scale = w / 640;
  const now = performance.now();

  targetCtx.clearRect(0, 0, w, h);
  targetCtx.save();
  targetCtx.scale(scale, scale);

  // 1. Ambient Sunburst
  targetCtx.save();
  targetCtx.translate(cx, cy);
  targetCtx.rotate(snap.coreAngle * 0.12);
  for (let i = 0; i < 12; i++) {
    targetCtx.rotate(Math.PI / 6);
    const rayGrad = targetCtx.createLinearGradient(0, 0, 315, 0);
    rayGrad.addColorStop(0, snap.freeSpins > 0 ? 'rgba(24, 255, 130, 0.22)' : 'rgba(255, 220, 110, 0.2)');
    rayGrad.addColorStop(0.6, 'rgba(139, 92, 246, 0.08)');
    rayGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
    targetCtx.fillStyle = rayGrad;
    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);
    targetCtx.lineTo(315, -22);
    targetCtx.lineTo(315, 22);
    targetCtx.closePath();
    targetCtx.fill();
  }
  targetCtx.restore();

  // 2. Roman Numeral Outer Bezel
  targetCtx.save();
  const bezelGrad = targetCtx.createRadialGradient(cx - 40, cy - 40, 220, cx, cy, 308);
  bezelGrad.addColorStop(0, '#3b2410');
  bezelGrad.addColorStop(0.55, '#d99b32');
  bezelGrad.addColorStop(0.84, '#fff2b2');
  bezelGrad.addColorStop(1, '#452806');
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, 306, 0, Math.PI * 2);
  targetCtx.fillStyle = bezelGrad;
  targetCtx.fill();

  targetCtx.beginPath();
  targetCtx.arc(cx, cy, 274, 0, Math.PI * 2);
  targetCtx.fillStyle = '#090712';
  targetCtx.fill();
  targetCtx.lineWidth = 2.5;
  targetCtx.strokeStyle = snap.freeSpins > 0 ? '#18ff82' : '#ffe89e';
  targetCtx.stroke();

  targetCtx.fillStyle = '#1c1004';
  targetCtx.font = '900 15px Georgia, serif';
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';
  for (let k = 0; k < 12; k++) {
    const angle = -Math.PI / 2 + (k * Math.PI * 2) / 12;
    const rx = cx + Math.cos(angle) * 290;
    const ry = cy + Math.sin(angle) * 290;
    targetCtx.fillText(ROMAN_NUMERALS[k], rx, ry);
  }
  targetCtx.restore();


  // 3. Rings
  for (let r = 0; r < 3; r++) drawRing(targetCtx, snap, r, now);
  drawTension(targetCtx, snap, now);

  // 4. Transparent Crystal 4-Pointer Frames
  POINTER_OFFSETS.forEach(p => {
    const angle = -Math.PI / 2 + (p * Math.PI * 2) / 12;
    const isHit = (snap.winningPointers || []).includes(p);

    targetCtx.save();
    targetCtx.translate(cx, cy);
    targetCtx.rotate(angle);

    targetCtx.shadowColor = isHit ? '#18ff82' : 'rgba(255, 255, 255, 0.65)';
    targetCtx.shadowBlur = isHit ? 22 : 10;

    if (isHit) {
      targetCtx.fillStyle = 'rgba(24, 255, 130, 0.22)';
      targetCtx.beginPath();
      targetCtx.roundRect(54, -29, 212, 58, 12);
      targetCtx.fill();
    }

    targetCtx.beginPath();
    targetCtx.roundRect(54, -29, 212, 58, 12);
    targetCtx.lineWidth = isHit ? 3.5 : 2.2;
    targetCtx.strokeStyle = isHit ? '#18ff82' : 'rgba(255, 255, 255, 0.85)';
    targetCtx.stroke();
    targetCtx.shadowBlur = 0;

    targetCtx.fillStyle = isHit ? '#18ff82' : '#ffffff';
    [[61, -22], [259, -22], [61, 22], [259, 22]].forEach(([rx, ry]) => {
      targetCtx.beginPath();
      targetCtx.arc(rx, ry, 2.3, 0, Math.PI * 2);
      targetCtx.fill();
    });

    targetCtx.beginPath();
    targetCtx.moveTo(256, 0);
    targetCtx.lineTo(302, -16);
    targetCtx.lineTo(292, 0);
    targetCtx.lineTo(302, 16);
    targetCtx.closePath();
    targetCtx.fillStyle = isHit ? '#18ff82' : '#fde047';
    targetCtx.fill();
    targetCtx.lineWidth = 2;
    targetCtx.strokeStyle = '#3b2406';
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.arc(284, 0, 5, 0, Math.PI * 2);
    targetCtx.fillStyle = '#ff1e56';
    targetCtx.fill();

    targetCtx.restore();
  });

  // 5. Scatter Key Laser Beams
  if (snap.scatterCoords && snap.scatterCoords.length > 0) {
    const pulseR = 32 + Math.sin(snap.scatterPulse || 0) * 8;
    snap.scatterCoords.forEach(pt => {
      targetCtx.save();
      const beamGrad = targetCtx.createLinearGradient(pt.x, pt.y, cx, cy);
      beamGrad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
      beamGrad.addColorStop(1, 'rgba(24, 255, 130, 0.95)');
      targetCtx.strokeStyle = beamGrad;
      targetCtx.lineWidth = 5;
      targetCtx.shadowColor = '#fde047';
      targetCtx.shadowBlur = 18;
      targetCtx.beginPath();
      targetCtx.moveTo(pt.x, pt.y);
      targetCtx.lineTo(cx, cy);
      targetCtx.stroke();

      targetCtx.beginPath();
      targetCtx.arc(pt.x, pt.y, pulseR, 0, Math.PI * 2);
      targetCtx.lineWidth = 3.5;
      targetCtx.strokeStyle = '#ffffff';
      targetCtx.stroke();
      targetCtx.restore();
    });
  }

  // 6. Center Tourbillon Core
  targetCtx.save();
  targetCtx.translate(cx, cy);
  targetCtx.beginPath();
  targetCtx.arc(0, 0, 50, 0, Math.PI * 2);
  targetCtx.fillStyle = '#090712';
  targetCtx.fill();
  targetCtx.lineWidth = 4;
  targetCtx.strokeStyle = snap.freeSpins > 0 ? '#18ff82' : '#fde047';
  targetCtx.stroke();

  targetCtx.rotate(snap.coreAngle);
  targetCtx.strokeStyle = snap.freeSpins > 0 ? '#18ff82' : '#eab308';
  targetCtx.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) {
    targetCtx.rotate(Math.PI / 4);
    targetCtx.strokeRect(-24, -24, 48, 48);
  }
  targetCtx.beginPath();
  targetCtx.arc(0, 0, 12, 0, Math.PI * 2);
  targetCtx.fillStyle = '#18ff82';
  targetCtx.shadowColor = '#18ff82';
  targetCtx.shadowBlur = 15;
  targetCtx.fill();
  targetCtx.restore();


  updateAndDrawSparks(targetCtx, snap);
  targetCtx.restore();
}

// ============================================================================
// RING ANIMATIONS
// ============================================================================
function turboScale() {
  return state.turbo ? 0.45 : 1;
}

// Generic frame tween; resolves early when the view is aborted.
function tween(ms, onFrame, view = mainView) {
  return new Promise(resolve => {
    if (view.aborted) return resolve();
    const start = performance.now();
    function frame(now) {
      if (view.aborted) return resolve();
      const k = ms <= 0 ? 1 : Math.min((now - start) / ms, 1);
      onFrame(k);
      if (k < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

const easeInOutCubic = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeInCubic = k => k * k * k;
const easeOutBack = k => { const c1 = 1.6; const c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

// Spin profile: short acceleration, long deceleration, small overshoot on landing.
const SPIN_ACCEL = 0.1;
const SPIN_AREA = SPIN_ACCEL / 2 + (1 - SPIN_ACCEL) / 3;
function spinProgress(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < SPIN_ACCEL) return (u * u) / (2 * SPIN_ACCEL) / SPIN_AREA;
  const d = (u - SPIN_ACCEL) / (1 - SPIN_ACCEL);
  return (SPIN_ACCEL / 2 + ((1 - SPIN_ACCEL) / 3) * (1 - Math.pow(1 - d, 3))) / SPIN_AREA;
}
function landingBounce(u) {
  return u > 0.86 && u < 1 ? Math.sin(Math.PI * (u - 0.86) / 0.14) * 0.22 : 0;
}

/**
 * Spin the three rings from where they are to the RGS positions.
 * Rings stop one after another (outer, middle, inner). If the outer and
 * middle rings already show 2+ Golden Keys in the frames, the inner ring
 * keeps turning longer (tension).
 */
function spinRings(view, targets, { onLand } = {}) {
  const ts = turboScale();
  const dirs = [-1, 1, -1];
  const stopAt = [900 * ts, 1250 * ts, 1600 * ts];
  const tension = keysInFrames(targets, [0, 1]) >= 2;
  if (tension) stopAt[2] = stopAt[1] + Math.max(1500, 2400 * ts);

  const plans = targets.map((T, r) => {
    const p0 = mod(Math.round(view.pos[r]), RING_LEN);
    view.pos[r] = p0;
    const dir = dirs[r];
    const d = dir < 0 ? mod(p0 - T, RING_LEN) : mod(T - p0, RING_LEN);
    const minSlots = (stopAt[r] / 1000) * 22 + 12;
    let total = d;
    while (total < minSlots) total += RING_LEN;
    return { p0, dir, total, T };
  });

  view.spinning = true;
  view.hurry = false;
  SoundFX.play('spin', state.turbo ? 1.25 : 1.0, 0.7);

  return new Promise(resolve => {
    const landed = [false, false, false];
    let last = performance.now();
    let elapsed = 0;
    let tensionStarted = false;

    function frame(now) {
      if (view.aborted) {
        plans.forEach((pl, r) => { view.pos[r] = pl.T; view.vel[r] = 0; });
        view.tension = 0;
        view.spinning = false;
        return resolve();
      }
      const dt = Math.min(now - last, 50);
      last = now;
      elapsed += view.hurry ? dt * 5 : dt;

      let done = true;
      plans.forEach((pl, r) => {
        if (landed[r]) return;
        const u = Math.min(elapsed / stopAt[r], 1);
        const prev = view.pos[r];
        view.pos[r] = pl.p0 + pl.dir * (pl.total * spinProgress(u) + landingBounce(u));
        view.vel[r] = (view.pos[r] - prev) / Math.max(dt, 1);
        if (u >= 1) {
          landed[r] = true;
          view.pos[r] = pl.T;
          view.vel[r] = 0;
          SoundFX.play('stop', 0.9 + r * 0.1, 0.75);
          if (onLand) onLand(r);
        } else {
          done = false;
        }
      });

      if (tension && landed[1] && !landed[2]) {
        if (!tensionStarted) {
          tensionStarted = true;
          SoundFX.riser((stopAt[2] - elapsed) / (view.hurry ? 5 : 1));
        }
        view.tension = Math.min(1, view.tension + dt / 250);
      } else if (landed[2]) {
        view.tension = Math.max(0, view.tension - dt / 200);
      }

      if (!done) requestAnimationFrame(frame);
      else {
        view.spinning = false;
        view.tension = 0;
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// Winning symbols in the matched frames light up, then burst and disappear.
async function burstWinningSymbols(view, positions, pointers) {
  const hits = [];
  pointers.forEach(p => {
    for (let r = 0; r < 3; r++) {
      const idx = mod(positions[r] + p, RING_LEN);
      hits.push({ r, idx, sym: RING_GEOM[r].strip[idx] });
      view.vanish[r].set(idx, 1);
    }
  });
  hits.forEach(h => view.pulse[h.r].delete(h.idx));
  hits.forEach(h => {
    const { x, y } = slotXY(h.r, stripIndexAngle(view, h.r, h.idx));
    spawnBurst(view, x, y, SYMBOL_GLOW[h.sym] || 'rgba(255,255,255,', 16);
  });
  await tween(Math.max(200, 380 * turboScale()), k => {
    const s = 1 - easeInCubic(k);
    hits.forEach(h => view.vanish[h.r].set(h.idx, k < 0.25 ? 1 + k * 0.6 : s));
  }, view);
}

// Rings turn to the next cascade position (outer 1, middle 2, inner 3 steps clockwise).
async function shiftRings(view, targets) {
  const p0 = view.pos.map(p => mod(Math.round(p), RING_LEN));
  const deltas = targets.map((T, r) => mod(p0[r] - T, RING_LEN));
  SoundFX.play('spin', 1.4, 0.45);
  await tween(Math.max(260, 560 * turboScale()), k => {
    const e = easeOutBack(Math.min(1, k));
    for (let r = 0; r < 3; r++) view.pos[r] = p0[r] - deltas[r] * e;
  }, view);
  for (let r = 0; r < 3; r++) { view.pos[r] = targets[r]; view.vel[r] = 0; }
}

// Empty sockets fill again.
async function refillSockets(view) {
  const entries = [];
  view.vanish.forEach((m, r) => m.forEach((_, idx) => entries.push({ r, idx })));
  if (!entries.length) return;
  await tween(Math.max(150, 280 * turboScale()), k => {
    const s = easeOutBack(k);
    entries.forEach(e => view.vanish[e.r].set(e.idx, s));
  }, view);
  view.vanish.forEach(m => m.clear());
}

function clearHighlights(view) {
  view.pulse.forEach(s => s.clear());
  view.winningPointers = [];
  view.scatterCoords = [];
}

function highlightPointers(view, positions, pointers) {
  pointers.forEach(p => {
    for (let r = 0; r < 3; r++) view.pulse[r].add(mod(positions[r] + p, RING_LEN));
  });
  view.winningPointers = pointers.slice();
}

// ============================================================================
// CELEBRATIONS
// ============================================================================
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

async function showScatter3DCelebration(keyCoords, spinsAwarded, isRetrigger) {
  mainView.scatterCoords = keyCoords;
  SoundFX.play(isRetrigger ? 'retrigger' : 'scatter', 1.0, 0.95);
  spawn3DCoins(35);

  document.getElementById('big-win-tier').textContent = isRetrigger ? 'RETRIGGER!' : 'FREE SPINS!';
  document.getElementById('big-win-amount').textContent = `+${spinsAwarded}`;
  bigWinBanner.classList.remove('hidden');
  await sleep(1700);
  bigWinBanner.classList.add('hidden');
  mainView.scatterCoords = [];
  celebrationCoins = [];
}

async function showBigWinCelebration(amountUnits, mult, isBonusRound) {
  const tierEl = document.getElementById('big-win-tier');
  const amtEl = document.getElementById('big-win-amount');
  let tier = null;
  if (mult >= 100) tier = 'EPIC WIN!';
  else if (mult >= 30) tier = 'MEGA WIN!';
  else if (mult >= 15) tier = 'BIG WIN!';
  else if (isBonusRound && amountUnits > 0) tier = 'FREE SPINS WIN';
  if (!tier) return;

  tierEl.textContent = tier;
  amtEl.textContent = money(0);
  bigWinBanner.classList.remove('hidden');
  if (mult >= 15) {
    SoundFX.play(mult >= 100 ? 'maxwin' : 'bigwin', 1.0, 0.95);
    spawn3DCoins(mult >= 100 ? 75 : 50);
  } else {
    SoundFX.play('win', 1.1, 0.9);
  }

  const dur = Math.max(900, (mult >= 15 ? 2600 : 1400) * turboScale());
  const start = performance.now();
  await new Promise(resolve => {
    function frame(now) {
      const k = Math.min((now - start) / dur, 1);
      amtEl.textContent = money(Math.round(amountUnits * (1 - Math.pow(1 - k, 2.4))));
      if (k < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  await sleep(1100);
  bigWinBanner.classList.add('hidden');
  celebrationCoins = [];
}

// ============================================================================
// RGS ROUND PLAYBACK
// The outcome of a round is decided by the RGS (/wallet/play -> round.state,
// i.e. the book events). The client only animates what the book contains.
// ============================================================================
const RGS_ERROR_TEXT = {
  ERR_IPB: 'insufficient',
  ERR_IS: 'SESSION EXPIRED — PLEASE RELOAD',
  ERR_ATE: 'SESSION EXPIRED — PLEASE RELOAD',
  ERR_GLE: 'LIMIT REACHED',
  ERR_LOC: 'NOT AVAILABLE IN YOUR LOCATION',
  ERR_VAL: 'INVALID REQUEST',
  ERR_BE: 'A ROUND IS ALREADY ACTIVE — PLEASE RELOAD',
  ERR_MAINTENANCE: 'GAME UNDER MAINTENANCE',
  NOT_FOUND: 'REPLAY NOT FOUND',
  DEMO_BOOKS_MISSING: 'DEMO DATA MISSING',
  UNKNOWN_BOOK_FORMAT: 'UNEXPECTED ROUND DATA'
};

function errorText(err) {
  const code = (err && (err.code || err.message)) || 'ERR_GEN';
  const txt = RGS_ERROR_TEXT[code];
  if (txt === 'insufficient') return t('insufficient');
  return txt || 'CONNECTION ERROR — PLEASE TRY AGAIN';
}

function showRgsError(err) {
  debugLog('RGS error', err);
  setStatus(errorText(err));
  stopAllAutoplay();
}

function multIdxFor(multiplier, fallbackIdx) {
  const i = MULTIPLIERS.indexOf(multiplier);
  return i >= 0 ? i : fallbackIdx;
}

/**
 * Plays a normalized round on a view. `hooks` connect it to a screen:
 * freeSpins(n), multiplier(idx), status(text), scatter(spin, keyPositions),
 * win(runningUnits, stepUnits, mult), spinDone(nextSpin).
 */
async function playRound(view, round, hooks, fromEvent = 0) {
  const amount = round.amount;
  let runningMult = 0;
  let freeSpins = 0;
  let multIdx = 0;
  hooks.freeSpins(0);
  hooks.multiplier(0);

  for (let s = 0; s < round.spins.length; s++) {
    if (view.aborted) return;
    const spin = round.spins[s];
    const next = round.spins[s + 1];

    // Resume: spins fully before the stored event index were already shown.
    if (next && next.eventIndex <= fromEvent) {
      spin.cascades.forEach(c => {
        runningMult += c.winMult;
        if (c.multiplier) multIdx = multIdxFor(c.multiplier, multIdx);
      });
      if (spin.freeSpinsRemaining !== null) freeSpins = spin.freeSpinsRemaining;
      hooks.freeSpins(freeSpins);
      hooks.multiplier(multIdx);
      hooks.win(Math.round(runningMult * amount), 0, 0, true);
      continue;
    }

    clearHighlights(view);
    if (spin.isFree) {
      freeSpins = Math.max(0, freeSpins - 1);
      hooks.freeSpins(freeSpins);
      hooks.status(`FREE SPINS — ${freeSpins} LEFT`);
    } else {
      multIdx = 0;
      hooks.multiplier(0);
    }

    await spinRings(view, spin.cascades[0].positions);

    for (let c = 0; c < spin.cascades.length; c++) {
      if (view.aborted) return;
      const cas = spin.cascades[c];
      if (c > 0) {
        await shiftRings(view, cas.positions);
        await refillSockets(view);
      }

      const res = boardAt(cas.positions);
      if ((cas.winMult > 0) !== res.hasWin) {
        debugLog('Ring strips disagree with the book at event', cas.eventIndex, cas, res);
      }
      if (cas.multiplier) {
        multIdx = multIdxFor(cas.multiplier, multIdx);
        hooks.multiplier(multIdx);
      }
      const activeMult = cas.multiplier || MULTIPLIERS[Math.min(multIdx, MULTIPLIERS.length - 1)];

      if (c === 0 && spin.freeSpinsAwarded > 0) {
        freeSpins = spin.freeSpinsRemaining !== null ? spin.freeSpinsRemaining : freeSpins + spin.freeSpinsAwarded;
        hooks.freeSpins(freeSpins);
        await hooks.scatter(spin, res.keyPositions);
      }

      if (cas.winMult > 0) {
        const pointers = cas.matchedPointers || res.matchedPointers;
        highlightPointers(view, cas.positions, pointers);
        runningMult += cas.winMult;
        await hooks.win(Math.round(runningMult * amount), Math.round(cas.winMult * amount), activeMult, false);
        if (!cas.multiplier) multIdx++;
        if (spin.cascades[c + 1]) {
          await burstWinningSymbols(view, cas.positions, pointers);
          view.winningPointers = [];
          const nm = spin.cascades[c + 1].multiplier;
          hooks.multiplier(nm ? multIdxFor(nm, multIdx) : multIdx);
        }
      }
    }

    if (spin.freeSpinsRemaining !== null) freeSpins = spin.freeSpinsRemaining;
    hooks.freeSpins(freeSpins);
    if (next) {
      hooks.spinDone(next);
      await sleep(500);
    }
  }
}

const mainHooks = {
  freeSpins(n) { state.freeSpins = n; mainView.freeSpins = n; updateUI(); },
  multiplier(idx) { state.multIdx = idx; updateUI(); },
  status(text) { setStatus(text); },
  async scatter(spin, keyPositions) {
    setStatus(spin.isFree ? `+${spin.freeSpinsAwarded} FREE SPINS` : `${spin.freeSpinsAwarded} FREE SPINS`);
    await showScatter3DCelebration(keyPositions, spin.freeSpinsAwarded, spin.isFree);
  },
  async win(runningUnits, stepUnits, mult, instant) {
    if (instant) { setWinInstant(runningUnits); return; }
    SoundFX.play('win', 1 + state.multIdx * 0.05, 0.85);
    setStatus(mult > 1 ? `WIN ${money(stepUnits)}  (x${mult})` : `WIN ${money(stepUnits)}`);
    await animateWinTo(runningUnits);
    await sleep(450);
  },
  spinDone(next) {
    // Tell the RGS how far the round got, so a disconnect resumes here.
    if (StakeRGS.isLiveRGS && !state.replayMode) {
      StakeRGS.sendEvent(next.eventIndex).catch(e => debugLog('bet/event failed', e));
    }
  }
};

// Runs a full RGS round on the main stage: animation, end-round (only when
// there is a win), balance from the RGS, history entry.
async function runRound(round, { fromEvent = 0, label = 'BASE' } = {}) {
  const isBonusRound = round.spins.length > 1;
  const live = !state.replayMode;
  const startedAt = performance.now();
  let endRoundPromise = null;

  // Single-spin wins are settled right away (balance shown after the animation);
  // bonus rounds are settled at the end so they can be resumed.
  if (live && round.payoutUnits > 0 && !isBonusRound) {
    endRoundPromise = StakeRGS.endRound().catch(err => ({ error: err }));
  }

  setWinInstant(0);
  mainView.aborted = false;
  await playRound(mainView, round, mainHooks, fromEvent);

  // The RGS payout is the authority for the displayed win.
  await animateWinTo(round.payoutUnits, 300);
  await showBigWinCelebration(round.payoutUnits, round.payoutMult, isBonusRound);

  const minDur = Number((state.jurisdiction || {}).minimumRoundDuration) || 0;
  const left = minDur - (performance.now() - startedAt);
  if (left > 0) await new Promise(r => setTimeout(r, left));

  if (live && round.payoutUnits > 0) {
    const res = endRoundPromise ? await endRoundPromise : await StakeRGS.endRound().catch(err => ({ error: err }));
    if (res && res.balance) state.balance = Number(res.balance.amount);
    else showRgsError(res && res.error);
  }

  state.freeSpins = 0;
  mainView.freeSpins = 0;
  setStatus(round.payoutUnits > 0 ? `TOTAL WIN ${money(round.payoutUnits)}` : t('idle'));
  updateUI();

  if (live) recordRound(round, label);
}

async function handleSpin(isBonusBuy = false) {
  if (state.isSpinning || state.replayMode) return;
  const bet = getBet();
  const mode = isBonusBuy ? MODE_BONUS : MODE_BASE;
  const cost = isBonusBuy ? bet * BONUS_BUY_MULT : bet;

  if (!bet) return;
  if (state.balance < cost) {
    setStatus(t('insufficient'));
    stopAllAutoplay();
    return;
  }

  state.isSpinning = true;
  clearHighlights(mainView);
  state.multIdx = 0;
  if (isBonusBuy) SoundFX.play('buybonus', 1.0, 0.9);
  setStatus('');
  updateUI();

  let data;
  try {
    data = await StakeRGS.play(bet, mode);
  } catch (err) {
    showRgsError(err);
    state.isSpinning = false;
    updateUI();
    return;
  }

  if (data.balance) state.balance = Number(data.balance.amount);
  updateUI();

  let round;
  try {
    round = StakeRGS.normalizeRound({ amount: bet, mode, ...data.round });
  } catch (err) {
    showRgsError(err);
    // Never leave a paid round unsettled, even if it cannot be drawn.
    if (data.round && Number(data.round.payout || data.round.payoutMultiplier) > 0) {
      const res = await StakeRGS.endRound().catch(e => ({ error: e }));
      if (res && res.balance) state.balance = Number(res.balance.amount);
    }
    state.isSpinning = false;
    updateUI();
    return;
  }

  await runRound(round, { label: isBonusBuy ? 'BONUS' : 'BASE' });
  state.isSpinning = false;
  updateUI();
  continueAutoplay();
}

async function continueAutoplay() {
  if (state.autoRemaining <= 0) return;
  state.autoRemaining--;
  updateUI();
  if (state.autoRemaining <= 0) { stopAllAutoplay(); return; }
  await sleep(350);
  if (state.autoRemaining > 0 && !state.isSpinning) handleSpin(false);
}

// ============================================================================
// RENDER LOOP
// ============================================================================
function renderLoop() {
  mainView.coreAngle += mainView.spinning ? 0.06 : 0.01;
  mainView.scatterPulse += 0.14;

  drawClockworkDialScene(ctx, canvas.width, canvas.height, mainView);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < 10) { p.y = 630; p.x = Math.random() * 640; }
    ctx.fillStyle = `${p.color}${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

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
function onSpinPressed() {
  if (state.replayMode) return;
  if (isAutoActive()) { stopAllAutoplay(); return; }
  if (state.isSpinning) {
    // quick stop
    if (mainView.spinning && !(state.jurisdiction || {}).disabledSlamstop) mainView.hurry = true;
    return;
  }
  handleSpin(false);
}

btnSpin.addEventListener('click', onSpinPressed);

btnBetUp.addEventListener('click', () => {
  if (!state.isSpinning && !state.replayMode && state.betIdx < state.betLevels.length - 1) {
    state.betIdx++;
    updateUI();
  }
});

btnBetDown.addEventListener('click', () => {
  if (!state.isSpinning && !state.replayMode && state.betIdx > 0) {
    state.betIdx--;
    updateUI();
  }
});

btnTurbo.addEventListener('click', () => {
  state.turbo = !state.turbo;
  updateUI();
});

document.getElementById('btn-sound').addEventListener('click', (e) => {
  state.soundOn = !state.soundOn;
  e.currentTarget.querySelector('svg').innerHTML = `<use href="${state.soundOn ? '#ico-sound-on' : '#ico-sound-off'}"/>`;
});

btnAutoplay.addEventListener('click', () => {
  if (isAutoActive()) {
    stopAllAutoplay();
    return;
  }
  if (!state.isSpinning && !state.replayMode) {
    state.autoPick = 0;
    document.querySelectorAll('.auto-choice').forEach(b => b.classList.remove('selected'));
    btnAutoStart.disabled = true;
    autoplayModal.classList.remove('hidden');
  }
});

document.getElementById('btn-auto-cancel').addEventListener('click', () => autoplayModal.classList.add('hidden'));

document.querySelectorAll('.auto-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    state.autoPick = parseInt(btn.dataset.spins, 10);
    document.querySelectorAll('.auto-choice').forEach(b => b.classList.toggle('selected', b === btn));
    btnAutoStart.disabled = false;
  });
});

// Autoplay only starts after the explicit START confirmation.
btnAutoStart.addEventListener('click', () => {
  if (!state.autoPick) return;
  autoplayModal.classList.add('hidden');
  state.autoRemaining = state.autoPick;
  updateUI();
  handleSpin(false);
});

btnBonusBuy.addEventListener('click', () => {
  if (btnBonusBuy.disabled) return;
  document.getElementById('modal-buy-cost-val').textContent = money(getBet() * BONUS_BUY_MULT);
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

// Spacebar is mapped to the spin button.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  if (state.replayMode || (state.jurisdiction && state.jurisdiction.disabledSpacebar)) return;
  if (anyModalOpen()) return;
  e.preventDefault();
  if (e.repeat) return;
  onSpinPressed();
});

// ============================================================================
// ROUND HISTORY VIEWER
// Re-plays rounds of this session from the stored RGS round data, with the
// same animations as the main stage.
// ============================================================================
const sessionRoundsHistory = [];
let selectedReplayRound = null;
let replayView = null;

const btnReplay = document.getElementById('btn-replay');
const replayModal = document.getElementById('replay-modal');
const replayRoundSelect = document.getElementById('replay-round-select');
const replayCanvas = document.getElementById('replay-canvas');
const repCtx = replayCanvas.getContext('2d');
btnReplay.disabled = true;

function recordRound(round, label) {
  sessionRoundsHistory.unshift({
    roundNumber: sessionRoundsHistory.length + 1,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    mode: label,
    bet: round.amount,
    totalWin: round.payoutUnits,
    round
  });
  if (sessionRoundsHistory.length > 50) sessionRoundsHistory.pop();
  btnReplay.disabled = false;
}

function populateReplayDropdown() {
  replayRoundSelect.innerHTML = '';
  sessionRoundsHistory.forEach((rec, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `#${rec.roundNumber}  ${rec.timestamp}  ${modeLabel(rec.mode)}  ${t('win')} ${money(rec.totalWin)}`;
    replayRoundSelect.appendChild(opt);
  });
}

function replayLoop(view) {
  if (view.aborted || replayModal.classList.contains('hidden')) return;
  view.coreAngle += view.spinning ? 0.06 : 0.01;
  view.scatterPulse += 0.14;
  drawClockworkDialScene(repCtx, replayCanvas.width, replayCanvas.height, view);
  requestAnimationFrame(() => replayLoop(view));
}

async function playHistoryReplay(record) {
  if (!record || !record.round.spins.length) return;
  if (replayView) replayView.aborted = true;
  const view = createView();
  replayView = view;
  selectedReplayRound = record;

  replayModal.classList.remove('hidden');
  const celebBox = document.getElementById('hist-celebration');
  celebBox.classList.add('hidden');
  document.getElementById('rep-mode').textContent = modeLabel(record.mode);
  document.getElementById('rep-bet').textContent = money(record.bet);
  document.getElementById('rep-total-win').textContent = money(0);
  requestAnimationFrame(() => replayLoop(view));

  const total = record.round.spins.length;
  let spinNo = 0;
  const hooks = {
    freeSpins(n) { view.freeSpins = n; document.getElementById('hist-fs').textContent = `${t('freeSpins')}: ${n}`; },
    multiplier(idx) { document.getElementById('hist-mult').textContent = `x${MULTIPLIERS[Math.min(idx, MULTIPLIERS.length - 1)]}`; },
    status(text) { document.getElementById('hist-status').textContent = text; },
    async scatter(spin, keyPositions) {
      view.scatterCoords = keyPositions;
      SoundFX.play(spin.isFree ? 'retrigger' : 'scatter', 1.0, 0.9);
      document.getElementById('hist-celeb-title').textContent = spin.isFree ? 'RETRIGGER!' : 'FREE SPINS!';
      document.getElementById('hist-celeb-val').textContent = `+${spin.freeSpinsAwarded}`;
      celebBox.classList.remove('hidden');
      await tween(1300, () => {}, view);
      celebBox.classList.add('hidden');
      view.scatterCoords = [];
    },
    async win(runningUnits, stepUnits, mult, instant) {
      document.getElementById('rep-total-win').textContent = money(runningUnits);
      if (instant) return;
      SoundFX.play('win', 1.0, 0.8);
      document.getElementById('hist-status').textContent = `${t('win')} ${money(stepUnits)}${mult > 1 ? ` (x${mult})` : ''}`;
      await tween(900, () => {}, view);
    },
    spinDone() {
      spinNo++;
      document.getElementById('hist-step').textContent = `${Math.min(spinNo + 1, total)} / ${total}`;
    }
  };
  document.getElementById('hist-step').textContent = `1 / ${total}`;
  document.getElementById('hist-status').textContent = '';
  await playRound(view, record.round, hooks);
  if (view.aborted) return;
  document.getElementById('rep-total-win').textContent = money(record.totalWin);
  document.getElementById('hist-status').textContent = `${t('totalWin')} ${money(record.totalWin)}`;
}

function closeReplayModal() {
  if (replayView) replayView.aborted = true;
  replayModal.classList.add('hidden');
}

btnReplay.addEventListener('click', () => {
  if (!state.isSpinning && sessionRoundsHistory.length > 0) {
    populateReplayDropdown();
    playHistoryReplay(sessionRoundsHistory[0]);
  }
});

replayRoundSelect.addEventListener('change', (e) => {
  const idx = parseInt(e.target.value, 10);
  if (sessionRoundsHistory[idx]) playHistoryReplay(sessionRoundsHistory[idx]);
});

document.getElementById('btn-replay-restart').addEventListener('click', () => {
  if (selectedReplayRound) playHistoryReplay(selectedReplayRound);
});
document.getElementById('btn-replay-close').addEventListener('click', closeReplayModal);

// ============================================================================
// STAKE ENGINE REPLAY MODE
// ?replay=true&rgs_url=&game=&version=&mode=&event=[&amount=&currency=&social=]
// GET https://{rgs_url}/bet/replay/{game}/{version}/{mode}/{event}
// No authenticated calls are made; betting controls are hidden.
// ============================================================================
let stakeReplayRound = null;
const replayPanel = document.getElementById('replay-panel');

function showReplayPanel({ afterPlay = false, error = null } = {}) {
  const p = StakeRGS.replayParams;
  const round = stakeReplayRound;
  const amount = round ? round.amount : p.amount;
  const costMult = round && round.costMultiplier ? round.costMultiplier : 1;
  document.getElementById('rp-mode').textContent = (p.mode || '-').toUpperCase();
  document.getElementById('rp-base').textContent = money(amount);
  document.getElementById('rp-cost').textContent = `${costMult}x`;
  document.getElementById('rp-real').textContent = money(Math.round(amount * costMult));
  const winRow = document.getElementById('rp-win-row');
  winRow.classList.toggle('hidden', !afterPlay || !round);
  if (round) document.getElementById('rp-win').textContent = money(round.payoutUnits);
  const errEl = document.getElementById('rp-error');
  errEl.classList.toggle('hidden', !error);
  errEl.textContent = error || '';
  const btn = document.getElementById('btn-replay-start');
  btn.classList.toggle('hidden', !round);
  document.getElementById('rp-play-lbl').textContent = afterPlay ? t('replayAgain') : t('replayPlay');
  replayPanel.classList.remove('hidden');
}

async function playStakeReplay() {
  if (!stakeReplayRound || state.isSpinning) return;
  replayPanel.classList.add('hidden');
  state.isSpinning = true;
  updateUI();
  await runRound(stakeReplayRound);
  state.isSpinning = false;
  updateUI();
  showReplayPanel({ afterPlay: true });
}

document.getElementById('btn-replay-start').addEventListener('click', playStakeReplay);

async function bootReplayMode() {
  state.replayMode = true;
  document.getElementById('replay-ribbon').classList.remove('hidden');
  const p = StakeRGS.replayParams;
  state.socialMode = StakeRGS.isSocialParam;
  // Defaults from the replay requirements: 1 USD, or 1 SC in social mode.
  state.currency = URL_PARAMS.get('currency') || (state.socialMode ? 'XSC' : 'USD');
  const amount = p.amount || StakeRGS.API_AMOUNT_MULTIPLIER;
  state.betLevels = [amount];
  state.betIdx = 0;
  applyTexts();
  setStatus(t('replayLoading'));
  updateUI();
  setWinInstant(0);
  try {
    const data = await StakeRGS.fetchReplay();
    const roundData = data && data.round ? data.round : data;
    stakeReplayRound = StakeRGS.normalizeRound({ ...roundData, amount, mode: p.mode, payout: undefined });
    stakeReplayRound.costMultiplier = Number(roundData.costMultiplier) || 1;
    setStatus('');
    showReplayPanel();
  } catch (err) {
    setStatus('');
    showReplayPanel({ error: errorText(err) });
  }
}

// ============================================================================
// SESSION BOOT: authenticate, bet levels from RGS config, resume active round
// ============================================================================
function applyAuthConfig(data) {
  if (data.balance) {
    state.balance = Number(data.balance.amount) || 0;
    state.currency = data.balance.currency || state.currency;
  }
  const cfg = data.config || {};
  state.jurisdiction = cfg.jurisdiction || {};
  let levels = Array.isArray(cfg.betLevels) ? cfg.betLevels.map(Number) : [];
  if (cfg.minBet !== undefined) levels = levels.filter(l => l >= cfg.minBet);
  if (cfg.maxBet !== undefined) levels = levels.filter(l => l <= cfg.maxBet);
  if (cfg.stepBet) levels = levels.filter(l => l % cfg.stepBet === 0);
  if (levels.length === 0 && cfg.minBet) levels = [Number(cfg.minBet)];
  state.betLevels = levels;
  const def = levels.indexOf(Number(cfg.defaultBetLevel));
  state.betIdx = def >= 0 ? def : 0;
  state.socialMode = StakeRGS.isSocialParam || state.jurisdiction.socialCasino === true;
}

async function bootStakeSession() {
  await StakeRGS.init();
  if (StakeRGS.isReplay) {
    await bootReplayMode();
    return;
  }

  let data;
  try {
    data = await StakeRGS.authenticate();
  } catch (err) {
    showRgsError(err);
    return;
  }
  applyAuthConfig(data);
  applyTexts();
  setStatus(t('idle'));
  setWinInstant(0);
  updateUI();

  const r = data.round;
  if (r && Array.isArray(r.state) && r.state.length > 0) {
    let round;
    try {
      round = StakeRGS.normalizeRound(r);
    } catch (err) {
      showRgsError(err);
      return;
    }
    // keep the bet of the last round after a reload
    if (r.amount) {
      const idx = state.betLevels.indexOf(Number(r.amount));
      if (idx >= 0) state.betIdx = idx;
    }
    if (r.active === true) {
      // Unfinished round: play it out from the last recorded event, then settle.
      setStatus('RESUMING YOUR UNFINISHED ROUND');
      state.isSpinning = true;
      updateUI();
      await sleep(700);
      await runRound(round, { fromEvent: round.resumeFromEvent, label: String(r.mode || 'BASE').toUpperCase() });
      state.isSpinning = false;
      updateUI();
    } else {
      // Last finished round: show its final board.
      const lastSpin = round.spins[round.spins.length - 1];
      const lastCas = lastSpin.cascades[lastSpin.cascades.length - 1];
      if (lastCas) mainView.pos = lastCas.positions.slice();
      updateUI();
    }
  }
}

// Mobile touch audio unlock
['touchstart', 'pointerdown'].forEach(evt => {
  window.addEventListener(evt, () => SoundFX.init(), { once: true, passive: true });
});
document.body.dataset.device = StakeRGS.device || '';
state.socialMode = StakeRGS.isSocialParam;
applyTexts();
initVisualGuides();
updateUI();
requestAnimationFrame(renderLoop);
bootStakeSession();
