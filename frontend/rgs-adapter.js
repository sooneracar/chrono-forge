// AETHER DIAL — Stake Engine RGS API & Mandatory Replay Adapter
// Supports live Stake RGS endpoints (/wallet/authenticate, /wallet/play, /wallet/end-round)
// and seamlessly falls back to Local Demo Mode when opened standalone.

(function () {
  const params = new URLSearchParams(window.location.search);

  const StakeRGS = {
    sessionID: params.get('sessionID') || null,
    rgsUrl: params.get('rgs_url') || null,
    lang: params.get('lang') || 'en',
    currency: params.get('currency') || 'USD',
    isSocial: params.get('social') === 'true' || params.get('mode') === 'social',
    isReplay: params.get('replay') === 'true',
    replayPayload: params.get('data') || null,
    isLiveRGS: false,

    async init() {
      this.isLiveRGS = Boolean(this.sessionID && this.rgsUrl);

      if (!this.isLiveRGS) {
        console.info('[Aether Dial RGS] Running in Local Demo Mode.');
        return {
          mode: 'DEMO',
          balance: 1000.00,
          social: this.isSocial,
          replay: this.isReplay
        };
      }

      try {
        const res = await fetch(`${this.rgsUrl}/wallet/authenticate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionID: this.sessionID })
        });
        if (!res.ok) throw new Error(`Auth HTTP ${res.status}`);
        const data = await res.json();

        const normalizedBalance = typeof data.balance === 'number'
          ? (data.balance > 10000 ? data.balance / 1000000 : data.balance)
          : 1000.00;

        return {
          mode: 'LIVE_RGS',
          balance: normalizedBalance,
          currency: data.currency || this.currency,
          social: this.isSocial,
          replay: this.isReplay
        };
      } catch (err) {
        console.warn('[Aether Dial RGS] Auth fallback to Demo:', err);
        this.isLiveRGS = false;
        return { mode: 'DEMO', balance: 1000.00, social: this.isSocial, replay: this.isReplay };
      }
    },

    async requestPlay(betAmount, mode = 'BASE') {
      if (!this.isLiveRGS) return null;

      const amountUnits = Math.round(betAmount * 1000000);
      const res = await fetch(`${this.rgsUrl}/wallet/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionID: this.sessionID,
          amount: amountUnits,
          mode: mode
        })
      });
      if (!res.ok) throw new Error(`Play HTTP ${res.status}`);
      return await res.json();
    },

    async endRound() {
      if (!this.isLiveRGS) return;
      try {
        await fetch(`${this.rgsUrl}/wallet/end-round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionID: this.sessionID })
        });
      } catch (err) {
        console.warn('[Aether Dial RGS] end-round warning:', err);
      }
    },

    parseReplayData() {
      if (!this.isReplay || !this.replayPayload) return null;
      try {
        return JSON.parse(atob(this.replayPayload));
      } catch (e) {
        return null;
      }
    }
  };

  window.StakeRGS = StakeRGS;
})();
