// AETHER DIAL — Stake Engine RGS adapter
//
// Everything the game shows (outcome, win, balance) comes from the RGS.
// The frontend never decides an outcome; it only plays back the book events
// that /wallet/play returns in `round.state`.
//
// References (Stake Engine docs, math-sdk/docs/rgs_docs/RGS.md and
// web-sdk packages/rgs-requests + components-shared/Authenticate.svelte):
//   URL params (play):   sessionID, rgs_url, lang, device, (currency), social
//   URL params (replay): replay=true, rgs_url, game, version, mode, event, amount
//   POST /wallet/authenticate {sessionID, language} -> {balance:{amount,currency}, config, round}
//   POST /wallet/play         {sessionID, amount, mode, currency} -> {balance, round}
//   POST /wallet/end-round    {sessionID} -> {balance}
//   POST /bet/event           {sessionID, event} -> {event}
//   GET  /bet/replay/{game}/{version}/{mode}/{event} -> round data with `state`
//   rgs_url is a host name; requests go to https://{rgs_url}{path}
//   Money: integers, 1,000,000 = 1.00 currency unit.
//   Book payoutMultiplier: integer, 100 = 1.00x base bet.

(function () {
  const API_AMOUNT_MULTIPLIER = 1000000;
  const BOOK_PAYOUT_MULTIPLIER = 100;

  const params = new URLSearchParams(window.location.search);
  // Nothing is written to the console unless ?debug=true (approval requirement).
  const debug = (...args) => { if (params.get('debug') === 'true') console.log('[Aether Dial RGS]', ...args); };

  // ---------------------------------------------------------------------------
  // Currency display (from RGS.md "Supported Currencies")
  // ---------------------------------------------------------------------------
  const CURRENCY_META = {
    USD: { symbol: '$', decimals: 2 },
    CAD: { symbol: 'CA$', decimals: 2 },
    JPY: { symbol: '¥', decimals: 0 },
    EUR: { symbol: '€', decimals: 2 },
    RUB: { symbol: '₽', decimals: 2 },
    CNY: { symbol: 'CN¥', decimals: 2 },
    PHP: { symbol: '₱', decimals: 2 },
    INR: { symbol: '₹', decimals: 2 },
    IDR: { symbol: 'Rp', decimals: 0 },
    KRW: { symbol: '₩', decimals: 0 },
    BRL: { symbol: 'R$', decimals: 2 },
    MXN: { symbol: 'MX$', decimals: 2 },
    DKK: { symbol: 'KR', decimals: 2, symbolAfter: true },
    PLN: { symbol: 'zł', decimals: 2, symbolAfter: true },
    VND: { symbol: '₫', decimals: 0, symbolAfter: true },
    TRY: { symbol: '₺', decimals: 2 },
    CLP: { symbol: 'CLP', decimals: 0, symbolAfter: true },
    ARS: { symbol: 'ARS', decimals: 2, symbolAfter: true },
    PEN: { symbol: 'S/', decimals: 2, symbolAfter: true },
    XGC: { symbol: 'GC', decimals: 2 },
    XSC: { symbol: 'SC', decimals: 2 }
  };

  function formatMoney(units, currency, withSymbol = true) {
    const meta = CURRENCY_META[currency] || { symbol: currency || '', decimals: 2, symbolAfter: true };
    const value = (Number(units) || 0) / API_AMOUNT_MULTIPLIER;
    const num = value.toLocaleString('en-US', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals
    });
    if (!withSymbol || !meta.symbol) return num;
    return meta.symbolAfter ? `${num} ${meta.symbol}` : `${meta.symbol}${num}`;
  }

  // ---------------------------------------------------------------------------
  // Book normalizer
  // Turns `round.state` (the book's events list) into the structure the
  // renderer plays: spins -> cascades. Wins are taken from the book, never
  // recomputed. Positions are what the book says the rings stop on.
  // ---------------------------------------------------------------------------
  const pick = (obj, keys) => {
    for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    return undefined;
  };

  function extractPositions(ev) {
    const p = pick(ev, ['positions', 'stops', 'reelPositions', 'ringPositions']);
    if (Array.isArray(p) && p.length === 3) return p.map(Number);
    if (ev && ev.posOut !== undefined) return [ev.posOut, ev.posMid, ev.posIn].map(Number);
    return null;
  }

  // Snap the event-win unit (x bet, x100, or currency units) so the event
  // wins add up to the round payout reported by the RGS.
  function detectWinScale(rawSum, payoutMult) {
    if (!(rawSum > 0) || !(payoutMult > 0)) return 1;
    const ratio = payoutMult / rawSum;
    const candidates = [1, 1 / BOOK_PAYOUT_MULTIPLIER, 1 / API_AMOUNT_MULTIPLIER];
    let best = 1;
    let bestErr = Infinity;
    candidates.forEach(c => {
      const err = Math.abs(Math.log(ratio / c));
      if (err < bestErr) { bestErr = err; best = c; }
    });
    return best;
  }

  /**
   * @param {object} round RGS round ({state, amount, payout, payoutMultiplier, mode, event, active})
   * @returns {{mode:string, amount:number, payoutUnits:number, payoutMult:number,
   *            resumeFromEvent:number, active:boolean,
   *            spins:Array<{eventIndex:number,isFree:boolean,freeSpinsAwarded:number,
   *            freeSpinsRemaining:number|null,cascades:Array}>}}
   */
  function normalizeRound(round) {
    const events = Array.isArray(round.state) ? round.state : (round.state && round.state.events) || [];
    const amount = Number(round.amount) || 0;

    // payout: prefer explicit currency payout from the RGS
    let payoutMult = 0;
    let payoutUnits = 0;
    if (round.payout !== undefined && round.payout !== null) {
      payoutUnits = Number(round.payout);
      payoutMult = amount > 0 ? payoutUnits / amount : Number(round.payoutMultiplier) || 0;
    } else if (round.payoutMultiplier !== undefined) {
      payoutMult = Number(round.payoutMultiplier);
      payoutUnits = Math.round(payoutMult * amount);
    }

    const spins = [];
    let current = null;
    let rawWinSum = 0;

    events.forEach((ev, idx) => {
      if (!ev || typeof ev !== 'object') return;
      const positions = extractPositions(ev);
      const spinNo = pick(ev, ['spin', 'spinIndex', 'spinNumber']);
      const awarded = Number(pick(ev, ['freeSpinsAwarded', 'fsAwarded', 'awardedFreeSpins']) || 0);
      const remaining = pick(ev, ['freeSpinsRemaining', 'fsRemaining', 'freeSpinsLeft']);

      const startsNewSpin = !current ||
        (spinNo !== undefined && spinNo !== current.spinNo) ||
        (spinNo === undefined && positions && pick(ev, ['cascade', 'step', 'tumble']) === 1) ||
        ev.type === 'reveal' || ev.type === 'spin';

      if (startsNewSpin && (positions || ev.type === 'reveal' || ev.type === 'spin')) {
        current = {
          spinNo: spinNo !== undefined ? spinNo : spins.length + 1,
          eventIndex: idx,
          isFree: spins.length > 0,
          freeSpinsAwarded: 0,
          freeSpinsRemaining: null,
          cascades: []
        };
        spins.push(current);
      }
      if (!current) return;

      if (positions) {
        const rawWin = Number(pick(ev, ['winMult', 'stepWin', 'win', 'winAmount']) || 0);
        rawWinSum += rawWin;
        current.cascades.push({
          eventIndex: idx,
          positions,
          multiplier: Number(pick(ev, ['multiplier', 'mult', 'globalMult']) || 0) || null,
          rawWin,
          matchedPointers: pick(ev, ['matchedPointers', 'winningPointers', 'pointers']) || null
        });
      }
      if (awarded > 0) current.freeSpinsAwarded += awarded;
      if (remaining !== undefined) current.freeSpinsRemaining = Number(remaining);
    });

    if (spins.length === 0 || spins.every(s => s.cascades.length === 0)) {
      debug('Unrecognised book format. First events:', events.slice(0, 3));
      throw new Error('UNKNOWN_BOOK_FORMAT');
    }

    const scale = detectWinScale(rawWinSum, payoutMult);
    spins.forEach(s => s.cascades.forEach(c => { c.winMult = c.rawWin * scale; }));

    const eventSum = rawWinSum * scale;
    if (payoutMult > 0 && Math.abs(eventSum - payoutMult) > 0.011 * Math.max(1, payoutMult)) {
      debug('Event wins do not add up to the RGS payout', { eventSum, payoutMult });
    }

    return {
      mode: round.mode || 'BASE',
      amount,
      payoutUnits,
      payoutMult,
      active: round.active === true,
      resumeFromEvent: Number(round.event) || 0,
      spins
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP helper
  // ---------------------------------------------------------------------------
  function rgsBase(url) {
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url.replace(/\/+$/, '') : `https://${url.replace(/\/+$/, '')}`;
  }

  async function rgsFetch(base, path, method = 'POST', body = undefined) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || (data && data.error)) {
      const code = (data && (data.error || data.code)) || `HTTP_${res.status}`;
      const err = new Error(code);
      err.code = code;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ---------------------------------------------------------------------------
  // Live RGS
  // ---------------------------------------------------------------------------
  const LiveRGS = {
    base: null,
    sessionID: null,
    currency: 'USD',
    async authenticate() {
      return rgsFetch(this.base, '/wallet/authenticate', 'POST', {
        sessionID: this.sessionID,
        language: StakeRGS.lang
      });
    },
    async play(amount, mode) {
      return rgsFetch(this.base, '/wallet/play', 'POST', {
        sessionID: this.sessionID,
        amount,
        mode,
        currency: this.currency
      });
    },
    async endRound() {
      return rgsFetch(this.base, '/wallet/end-round', 'POST', { sessionID: this.sessionID });
    },
    async event(eventIndex) {
      return rgsFetch(this.base, '/bet/event', 'POST', {
        sessionID: this.sessionID,
        event: `${eventIndex}`
      });
    },
    async replay(game, version, mode, event) {
      const path = `/bet/replay/${encodeURIComponent(game)}/${encodeURIComponent(version)}/${encodeURIComponent(mode)}/${encodeURIComponent(event)}`;
      return rgsFetch(this.base, path, 'GET');
    }
  };

  // ---------------------------------------------------------------------------
  // Local demo RGS — same request/response contract as the live RGS.
  // Outcomes are drawn from real book files exported from the math package
  // (frontend/demo/*.json, built by math/tools/build_demo_books.py).
  // ---------------------------------------------------------------------------
  const DEMO_BET_LEVELS = [
    100000, 200000, 400000, 600000, 800000, 1000000, 1200000, 1400000, 1600000, 1800000,
    2000000, 3000000, 4000000, 5000000, 6000000, 8000000, 10000000, 15000000, 20000000,
    25000000, 50000000, 75000000, 100000000
  ];

  const LocalRGS = {
    balance: 10000 * API_AMOUNT_MULTIPLIER,
    currency: 'USD',
    manifest: null,
    books: {},
    activeRound: null,
    nextRoundID: 1,

    async load() {
      if (this.manifest) return;
      const res = await fetch('demo/manifest.json', { cache: 'no-store' });
      if (!res.ok) throw Object.assign(new Error('DEMO_BOOKS_MISSING'), { code: 'DEMO_BOOKS_MISSING' });
      this.manifest = await res.json();
    },
    async modeBooks(modeName) {
      const key = modeName.toLowerCase();
      if (this.books[key]) return this.books[key];
      const entry = this.manifest.modes.find(m => m.name.toLowerCase() === key);
      if (!entry) throw Object.assign(new Error('ERR_VAL'), { code: 'ERR_VAL' });
      const res = await fetch(`demo/${entry.file}`);
      if (!res.ok) throw Object.assign(new Error('DEMO_BOOKS_MISSING'), { code: 'DEMO_BOOKS_MISSING' });
      this.books[key] = { cost: Number(entry.cost), list: await res.json() };
      return this.books[key];
    },
    async authenticate() {
      await this.load();
      return {
        balance: { amount: this.balance, currency: this.currency },
        config: {
          minBet: DEMO_BET_LEVELS[0],
          maxBet: DEMO_BET_LEVELS[DEMO_BET_LEVELS.length - 1],
          stepBet: 100000,
          defaultBetLevel: 1000000,
          betLevels: DEMO_BET_LEVELS.slice(),
          // demo only offers the modes whose books were exported
          jurisdiction: {
            socialCasino: false,
            disabledBuyFeature: !this.manifest.modes.some(m => m.name.toLowerCase() === 'bonus')
          }
        },
        round: this.activeRound
      };
    },
    async play(amount, mode) {
      await this.load();
      if (this.activeRound && this.activeRound.active) throw Object.assign(new Error('ERR_BE'), { code: 'ERR_BE' });
      const { cost, list } = await this.modeBooks(mode);
      const debit = Math.round(amount * cost);
      if (debit > this.balance) throw Object.assign(new Error('ERR_IPB'), { code: 'ERR_IPB' });
      this.balance -= debit;

      // Books were sampled by lookup-table weight when exported -> uniform pick.
      const rnd = new Uint32Array(1);
      crypto.getRandomValues(rnd);
      const book = list[rnd[0] % list.length];
      const payoutMultiplier = Number(book.payoutMultiplier) / BOOK_PAYOUT_MULTIPLIER;
      const payout = Math.round(payoutMultiplier * amount);

      this.activeRound = {
        roundID: this.nextRoundID++,
        bookID: book.id,
        amount,
        payout,
        payoutMultiplier,
        active: payout > 0,
        mode,
        event: null,
        state: book.events
      };
      return { balance: { amount: this.balance, currency: this.currency }, round: this.activeRound };
    },
    async endRound() {
      if (this.activeRound && this.activeRound.active) {
        this.balance += this.activeRound.payout;
        this.activeRound.active = false;
      }
      return { balance: { amount: this.balance, currency: this.currency } };
    },
    async event(eventIndex) {
      if (this.activeRound) this.activeRound.event = `${eventIndex}`;
      return { event: `${eventIndex}` };
    },
    async replay() {
      throw Object.assign(new Error('REPLAY_NEEDS_RGS'), { code: 'REPLAY_NEEDS_RGS' });
    }
  };

  // ---------------------------------------------------------------------------
  // Public facade used by game.js
  // ---------------------------------------------------------------------------
  const StakeRGS = {
    API_AMOUNT_MULTIPLIER,
    BOOK_PAYOUT_MULTIPLIER,
    formatMoney,
    normalizeRound,

    sessionID: params.get('sessionID'),
    rgsUrl: params.get('rgs_url'),
    lang: params.get('lang') || 'en',
    device: params.get('device') || null,
    isSocialParam: params.get('social') === 'true',
    isReplay: params.get('replay') === 'true',
    replayParams: {
      game: params.get('game') || '',
      version: params.get('version') || '',
      mode: params.get('mode') || '',
      event: params.get('event') || '',
      amount: Number(params.get('amount')) || 0
    },

    isLiveRGS: false,
    backend: LocalRGS,
    currency: params.get('currency') || 'USD',

    async init() {
      this.isLiveRGS = Boolean(this.rgsUrl && (this.sessionID || this.isReplay));
      if (this.isLiveRGS) {
        LiveRGS.base = rgsBase(this.rgsUrl);
        LiveRGS.sessionID = this.sessionID;
        this.backend = LiveRGS;
      } else {
        debug('No sessionID/rgs_url — running local demo RGS.');
      }
    },

    async authenticate() {
      const data = await this.backend.authenticate();
      if (data && data.balance && data.balance.currency) {
        this.currency = data.balance.currency;
        LiveRGS.currency = this.currency;
      }
      return data;
    },
    play(amount, mode) { return this.backend.play(amount, mode); },
    endRound() { return this.backend.endRound(); },
    sendEvent(eventIndex) { return this.backend.event(eventIndex); },
    fetchReplay() {
      const p = this.replayParams;
      return this.backend.replay(p.game, p.version, p.mode, p.event);
    }
  };

  window.StakeRGS = StakeRGS;
})();
