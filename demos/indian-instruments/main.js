/* ─────────────────────────────────────────────────────────────
   Swara — four Indian instruments, voiced by the Web Audio API.
   No samples anywhere: the sitar and the tanpura are Karplus–Strong
   strings, the flute, sarangi and shehnai are small synths shaped
   after how each instrument makes its sound, and the drums are
   pitched sines with noise on top.

   Press an instrument to sound it, drag along it to move through
   the swaras, release to stop. Each stage also carries a written
   thirty-second piece in its own raag.
   ───────────────────────────────────────────────────────────── */

(() => {
  'use strict';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const ratio = (semitones) => Math.pow(2, semitones / 12);
  const fmt = (s) => '0:' + String(Math.floor(s)).padStart(2, '0');

  const PIECE_LENGTH = 30;

  /* ── Ragas ───────────────────────────────────────────────────
     All four are sampoorna — seven swaras and the octave — so every
     instrument can reach Sa Re Ga Ma Pa Dha Ni Sa'.               */

  const RAGA = {
    bhairavi: [0, 1, 3, 5, 7, 8, 10, 12],   // all komal: the melancholy one
    yaman:    [0, 2, 4, 6, 7, 9, 11, 12],   // tivra Ma: serene, unhurried
    bhairav:  [0, 1, 4, 5, 7, 8, 11, 12],   // komal re and dha: ascetic
    bilawal:  [0, 2, 4, 5, 7, 9, 11, 12]    // the plain major scale: festive
  };

  /* Komal and tivra are marked the way they are on the page — a line under
     the komal swaras, a stroke over tivra Ma — rather than with the Vedic
     combining accents, which most Devanagari fonts have no glyph for.
     "_" marks komal, "^" marks tivra.                                     */
  const SWARA = {
    bhairavi: ['सा', 'रे_', 'ग_', 'म', 'प', 'ध_', 'नि_', 'सां'],
    yaman:    ['सा', 'रे', 'ग', 'म^', 'प', 'ध', 'नि', 'सां'],
    bhairav:  ['सा', 'रे_', 'ग', 'म', 'प', 'ध_', 'नि', 'सां'],
    bilawal:  ['सा', 'रे', 'ग', 'म', 'प', 'ध', 'नि', 'सां']
  };

  const INSTRUMENTS = {
    sitar: {
      kind: 'pluck', raga: 'bhairavi', tonic: 138.59,          // C#3
      region: { x0: 86, x1: 1060, y0: 100, y1: 244 },
      stringY: [118, 134, 150, 166, 182, 198, 214, 230]        // top string is Sa'
    },
    bansuri: {
      kind: 'wind', raga: 'yaman', tonic: 293.66,              // D4
      region: { x0: 46, x1: 1010, y0: 104, y1: 236 },
      stops: [76, 200, 320, 440, 560, 680, 800, 960]
    },
    sarangi: {
      kind: 'bow', raga: 'bhairav', tonic: 220,                // A3
      region: { x0: 110, x1: 1000, y0: 62, y1: 286 },
      span: [150, 944]
    },
    shehnai: {
      kind: 'wind', raga: 'bilawal', tonic: 440,               // A4
      region: { x0: 310, x1: 1030, y0: 108, y1: 232 },
      stops: [350, 428, 520, 612, 704, 796, 888, 980]
    }
  };

  // degree 0 is Sa, 7 is the upper Sa; below zero and above seven keep going
  function degreeFreq(def, deg) {
    const scale = RAGA[def.raga];
    const oct = Math.floor(deg / 7);
    return def.tonic * Math.pow(2, oct) * ratio(scale[deg - oct * 7]);
  }

  /* ── Audio engine ────────────────────────────────────────── */

  const Engine = {
    ctx: null, out: null, send: null, noise: null, ready: false,

    start() {
      if (this.ctx) { this.ctx.resume(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = this.ctx = new Ctx();

      const out = this.out = ctx.createGain();
      out.gain.value = 0.7;

      const verb = ctx.createConvolver();
      verb.buffer = impulse(ctx, 2.4, 2.6);
      const send = this.send = ctx.createGain();
      send.gain.value = 0.28;
      const wet = ctx.createGain();
      wet.gain.value = 0.9;
      send.connect(verb).connect(wet).connect(out);

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -9;
      limiter.knee.value = 6;
      limiter.ratio.value = 9;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.2;
      out.connect(limiter).connect(ctx.destination);

      this.noise = noiseBuffer(ctx, 2);
      this.ready = true;
    },

    // dry to the room, a taste to the hall
    bus(level) {
      const g = this.ctx.createGain();
      if (level !== undefined) g.gain.value = level;
      g.connect(this.out);
      g.connect(this.send);
      return g;
    }
  };

  function impulse(ctx, seconds, decay) {
    const sr = ctx.sampleRate;
    const n = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (t < 0.002 ? t / 0.002 : 1);
      }
    }
    return buf;
  }

  function noiseBuffer(ctx, seconds) {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(sr * seconds), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noiseSource(loop) {
    const s = Engine.ctx.createBufferSource();
    s.buffer = Engine.noise;
    s.loop = !!loop;
    return s;
  }

  /* ── Plucked strings: Karplus–Strong, with a buzzing bridge ── */

  const pluckCache = new Map();

  function pluckBuffer(freq, opts) {
    const key = freq.toFixed(2) + '|' + opts.tag;
    if (pluckCache.has(key)) return pluckCache.get(key);

    const ctx = Engine.ctx;
    const sr = ctx.sampleRate;
    const n = Math.floor(sr * opts.dur);
    const buf = ctx.createBuffer(1, n, sr);
    const out = buf.getChannelData(0);
    const line = new Float32Array(n);
    const D = Math.max(2, Math.round(sr / freq));

    for (let i = 0; i < D && i < n; i++) {
      line[i] = (Math.random() * 2 - 1) * (1 - 0.35 * (i / D));
    }

    const damp = opts.damp;
    const buzz = opts.buzz;
    const norm = buzz ? Math.tanh(buzz) : 1;
    let prev = 0;

    for (let i = D; i < n; i++) {
      const avg = 0.5 * (line[i - D] + line[i - D + 1]);
      const s = damp * (0.82 * avg + 0.18 * prev);
      prev = avg;
      line[i] = s;
      // jawari: the string grazes a shallow curved bridge on every swing
      out[i] = buzz ? Math.tanh(s * buzz) / norm : s;
    }
    for (let i = 0; i < D; i++) out[i] = line[i];

    const fade = Math.floor(sr * 0.25);
    for (let i = n - fade; i < n; i++) out[i] *= (n - i) / fade;

    pluckCache.set(key, buf);
    return buf;
  }

  function pluck(freq, gain, opts, when, dest) {
    const ctx = Engine.ctx;
    const at = when || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = pluckBuffer(freq, opts);
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(dest || Engine.bus());
    src.start(at);
    src.stop(at + opts.dur + 0.1);
    return { src, gain: g };
  }

  /* ── Drums: pitched membrane plus a little noise ───────────── */

  function drum(kind, when, gain, dest) {
    const ctx = Engine.ctx;
    const g = ctx.createGain();
    g.connect(dest);

    const tone = ctx.createOscillator();
    const tg = ctx.createGain();
    tone.type = 'sine';

    if (kind === 'bass') {              // bayan / dholak, with the sliding heel
      tone.frequency.setValueAtTime(148, when);
      tone.frequency.exponentialRampToValueAtTime(56, when + 0.24);
      tg.gain.setValueAtTime(0.0001, when);
      tg.gain.exponentialRampToValueAtTime(gain, when + 0.005);
      tg.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
      tone.start(when); tone.stop(when + 0.6);
    } else if (kind === 'rim') {        // na / tin, the ringing edge stroke
      tone.frequency.setValueAtTime(660, when);
      tone.frequency.exponentialRampToValueAtTime(520, when + 0.12);
      tg.gain.setValueAtTime(0.0001, when);
      tg.gain.exponentialRampToValueAtTime(gain * 0.8, when + 0.003);
      tg.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
      tone.start(when); tone.stop(when + 0.25);
    } else {                            // ke / slap, all hand and no pitch
      tone.frequency.setValueAtTime(300, when);
      tg.gain.setValueAtTime(0.0001, when);
      tg.gain.exponentialRampToValueAtTime(gain * 0.4, when + 0.003);
      tg.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
      tone.start(when); tone.stop(when + 0.12);
    }
    tone.connect(tg).connect(g);

    const n = noiseSource(false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = kind === 'bass' ? 220 : kind === 'rim' ? 2600 : 1500;
    bp.Q.value = kind === 'slap' ? 1.2 : 2.4;
    const ng = ctx.createGain();
    const nAmt = kind === 'bass' ? 0.25 : kind === 'rim' ? 0.4 : 0.7;
    ng.gain.setValueAtTime(gain * nAmt, when);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + (kind === 'bass' ? 0.12 : 0.09));
    n.connect(bp).connect(ng).connect(g);
    n.start(when); n.stop(when + 0.3);
  }

  /* ── Sustained voices ─────────────────────────────────────── */

  function makeVoice(kind, dest) {
    const ctx = Engine.ctx;
    const amp = ctx.createGain();
    amp.gain.value = 0;
    amp.connect(dest || Engine.bus());

    const vib = ctx.createOscillator();
    const vibAmt = ctx.createGain();
    vib.type = 'sine';
    vibAmt.gain.value = 0;
    vib.connect(vibAmt);

    const parts = [];
    let glide = 0.04, baseFreq = 220, colour = null, chiff = null;

    const addOsc = (type, mult, level, detune) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = baseFreq * mult;
      o.detune.value = detune || 0;
      g.gain.value = level;
      vibAmt.connect(o.detune);
      o.connect(g);
      parts.push({ osc: o, mult });
      return g;
    };

    if (kind === 'bansuri') {
      /* A bansuri is very nearly a sine. Almost everything that makes it
         recognisable is the air: the breath band around the tone, the chiff
         at the start of a note, and vibrato that arrives late.            */
      glide = 0.03;
      vib.frequency.value = 5.2;

      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2400;
      tone.Q.value = 0.4;
      addOsc('sine', 1, 0.62).connect(tone);
      addOsc('sine', 2, 0.06).connect(tone);
      addOsc('sine', 3, 0.018).connect(tone);
      tone.connect(amp);

      const air = noiseSource(true);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 900;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
      const ag = ctx.createGain(); ag.gain.value = 0.03;
      air.connect(hp).connect(bp).connect(ag).connect(amp);
      air.start();

      colour = (freq, press, when) => {
        bp.frequency.setTargetAtTime(freq * 2.4, when, 0.05);
        tone.frequency.setTargetAtTime(freq * 4.5, when, 0.06);
        ag.gain.setTargetAtTime(0.018 + 0.03 * (1 - press), when, 0.08);
      };
      chiff = (when) => {                       // the breath catching the edge
        ag.gain.cancelScheduledValues(when);
        ag.gain.setValueAtTime(0.11, when);
        ag.gain.setTargetAtTime(0.03, when + 0.02, 0.05);
      };

    } else if (kind === 'sarangi') {
      /* Bowed gut through a skin belly. The reason it sounds like singing is
         the formants, so the string runs into a small vowel bank rather than
         a plain filter.                                                   */
      glide = 0.09;
      vib.frequency.value = 5.6;

      const cord = ctx.createGain();
      addOsc('sawtooth', 1, 0.2, -6).connect(cord);
      addOsc('sawtooth', 1, 0.2, 7).connect(cord);
      addOsc('sine', 0.5, 0.07).connect(cord);

      // the bandpasses throw most of the energy away, so the gains here are
      // makeup as much as balance
      const F = [[620, 7, 2.8], [1180, 9, 1.5], [2600, 10, 0.7]].map(([f, q, g]) => {
        const bq = ctx.createBiquadFilter();
        bq.type = 'bandpass'; bq.frequency.value = f; bq.Q.value = q;
        const gg = ctx.createGain(); gg.gain.value = g;
        cord.connect(bq).connect(gg).connect(amp);
        return { bq, gg };
      });
      const body = ctx.createBiquadFilter();
      body.type = 'lowpass'; body.frequency.value = 2400; body.Q.value = 0.7;
      const bodyG = ctx.createGain(); bodyG.gain.value = 0.55;
      cord.connect(body).connect(bodyG).connect(amp);

      const hair = noiseSource(true);
      const hbp = ctx.createBiquadFilter();
      hbp.type = 'bandpass'; hbp.frequency.value = 2200; hbp.Q.value = 1.4;
      const hg = ctx.createGain(); hg.gain.value = 0.03;
      hair.connect(hbp).connect(hg).connect(amp);
      hair.start();

      colour = (freq, press, when) => {
        F[1].bq.frequency.setTargetAtTime(1050 + 420 * press, when, 0.07);
        F[2].gg.gain.setTargetAtTime(0.35 + 0.7 * press, when, 0.07);
        hbp.frequency.setTargetAtTime(freq * 5, when, 0.07);
        hg.gain.setTargetAtTime(0.015 + 0.045 * press, when, 0.07);
      };
      chiff = (when) => {                       // the bite as the bow takes hold
        hg.gain.cancelScheduledValues(when);
        hg.gain.setValueAtTime(0.09, when);
        hg.gain.setTargetAtTime(0.03, when + 0.03, 0.08);
      };

    } else {
      /* Shehnai: a double reed is nearly all upper partials, held in shape
         by two strong formants.                                          */
      glide = 0.03;
      vib.frequency.value = 6.1;

      const pre = ctx.createGain();
      addOsc('sawtooth', 1, 0.17).connect(pre);
      addOsc('square', 1, 0.1, 4).connect(pre);
      addOsc('sawtooth', 2, 0.04, -5).connect(pre);

      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass'; f1.frequency.value = 1150; f1.Q.value = 4;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass'; f2.frequency.value = 2700; f2.Q.value = 6;
      const g1 = ctx.createGain(); g1.gain.value = 2.6;
      const g2 = ctx.createGain(); g2.gain.value = 1.4;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.7;
      const lg = ctx.createGain(); lg.gain.value = 0.6;

      pre.connect(f1).connect(g1).connect(amp);
      pre.connect(f2).connect(g2).connect(amp);
      pre.connect(lp).connect(lg).connect(amp);

      colour = (freq, press, when) => {
        f2.frequency.setTargetAtTime(2300 + 1200 * press, when, 0.06);
        g2.gain.setTargetAtTime(0.8 + 1.4 * press, when, 0.06);
      };
    }

    parts.forEach(p => p.osc.start());
    vib.start();

    let level = 0;

    const api = {
      // freq at an absolute time; `snap` jumps instead of gliding
      note(freq, when, snap) {
        baseFreq = freq;
        const t = when || ctx.currentTime;
        parts.forEach(p => {
          const target = freq * p.mult;
          if (snap) p.osc.frequency.setValueAtTime(target, t);
          else p.osc.frequency.setTargetAtTime(target, t, glide);
        });
        if (colour) colour(freq, api.press, t);
      },
      press: 0.55,
      setPressure(v, when) {
        api.press = clamp(v, 0, 1);
        if (colour) colour(baseFreq, api.press, when || ctx.currentTime);
      },
      gain(v, when, tau) {
        level = v;
        amp.gain.setTargetAtTime(v, when || ctx.currentTime, tau || 0.05);
      },
      // a fresh note: chiff or bow bite, plus vibrato that grows into the tone
      attack(when, depth) {
        const t = when || ctx.currentTime;
        if (chiff) chiff(t);
        vibAmt.gain.cancelScheduledValues(t);
        vibAmt.gain.setValueAtTime(0, t);
        vibAmt.gain.setTargetAtTime(depth === undefined ? 8 : depth, t + 0.18, 0.35);
      },
      get level() { return level; },
      stop() {
        const t = ctx.currentTime;
        amp.gain.cancelScheduledValues(t);
        amp.gain.setTargetAtTime(0, t, 0.05);
        setTimeout(() => {
          try { parts.forEach(p => p.osc.stop()); vib.stop(); } catch (e) { /* already stopped */ }
        }, 400);
      }
    };
    return api;
  }

  /* ── The written pieces ───────────────────────────────────────
     [ start, degree, length ] — degree 0 is Sa, 7 the upper Sa.
     Below zero drops into the octave underneath.                  */

  const PIECES = {
    /* Bhairavi in the three movements a sitar piece is built from: a free
       alap, then the tabla enters for the jor, then the jhala doubles the
       speed with the chikari strings answering between the notes.        */
    sitar: (() => {
      const melody = [], perc = [], chikari = [];

      // 0–7s — alap: no pulse yet, every phrase landing lower than it began
      [[0.0, 7, 1.9], [1.5, 6, 1.3], [2.7, 5, 1.5], [4.1, 4, 1.7], [5.7, 3, 1.3]]
        .forEach(e => melody.push(e));

      // 7–20.4s — jor: sixteen to the cycle, the tabla keeping it
      const B = 0.42;
      const jor = [2, 3, 4, 3, 2, 1, 2, 0, 2, 3, 5, 4, 3, 2, 1, 0,
                   4, 5, 6, 5, 4, 3, 2, 1, 2, 3, 4, 2, 1, 0, 1, 0];
      jor.forEach((deg, i) => melody.push([7 + i * B, deg, B, 0.28]));

      const jorEnd = 7 + jor.length * B;
      const beat = ['bass', 'rim', 'rim', 'rim', 'rim', 'slap', 'bass', 'rim'];
      for (let i = 0; 7 + i * B < jorEnd; i++) {
        const kind = beat[i % 8];
        perc.push([7 + i * B, kind, kind === 'bass' ? 0.22 : 0.12]);
      }

      // 20.6–29.5s — jhala: half the note length, chikari between every stroke
      const J = 0.21;
      const climb = [0, 2, 3, 4, 5, 4, 3, 2, 3, 2, 1, 0, 1, 0];
      let t = jorEnd + 0.2;
      climb.forEach((deg, i) => {
        melody.push([t, deg, J * 1.8, i > 10 ? 0.32 : 0.27]);
        chikari.push(t + J, t + J * 2);
        t += J * 3;
      });
      for (let s = jorEnd + 0.2; s < 29.9; s += J) {
        const i = Math.round((s - jorEnd - 0.2) / J);
        perc.push([s, i % 4 === 0 ? 'bass' : 'rim', i % 4 === 0 ? 0.2 : 0.08]);
      }

      return { melody, perc, chikari, drone: true };
    })(),

    /* Yaman in vilambit — 50 to the minute, two beats to most notes, so
       nothing is in a hurry to resolve. The keherwa underneath is kept well
       below the flute; it marks the laya rather than driving it.          */
    bansuri: (() => {
      const B = 1.2;                                  // 50 bpm
      const phrase = [[-1, 2], [1, 2], [2, 2], [3, 2], [5, 2], [6, 2], [7, 3],
                      [6, 2], [5, 2], [4, 2], [3, 1], [2, 1], [1, 1], [0, 1]];
      const melody = [];
      let b = 0;
      phrase.forEach(([deg, len]) => {
        melody.push([+(b * B).toFixed(3), deg, +(len * B).toFixed(3)]);
        b += len;
      });

      const keherwa = ['bass', 'rim', 'rim', 'rim', 'rim', 'slap', 'bass', 'rim'];
      const perc = [];
      for (let i = 0; i * B < PIECE_LENGTH; i++) {
        const kind = keherwa[i % 8];
        perc.push([+(i * B).toFixed(3), kind,
                   i % 8 === 0 ? 0.15 : kind === 'bass' ? 0.11 : 0.06]);
      }
      return { melody, legato: true, perc, drone: true };
    })(),

    /* Bhairav in madhya laya — 80 to the minute, sixteen beats to the cycle
       of teental, leaning on the komal swaras the raag is known for.      */
    sarangi: (() => {
      const B = 0.75;                                 // 80 bpm
      const phrase = [[0, 3], [1, 3], [2, 2], [3, 3], [4, 4], [5, 3], [4, 2], [3, 2],
                      [2, 3], [1, 3], [0, 3], [4, 2], [5, 2], [2, 2], [1, 1.5], [0, 1.5]];
      const melody = [];
      let b = 0;
      phrase.forEach(([deg, len]) => {
        melody.push([+(b * B).toFixed(3), deg, +(len * B).toFixed(3)]);
        b += len;
      });

      const theka = ['bass', 'rim', 'rim', 'bass', 'bass', 'rim', 'rim', 'bass',
                     'bass', 'slap', 'slap', 'slap', 'slap', 'rim', 'rim', 'bass'];
      const perc = [];
      for (let i = 0; i * B < PIECE_LENGTH; i++) {
        const kind = theka[i % 16];
        perc.push([+(i * B).toFixed(3), kind,
                   i % 16 === 0 ? 0.25 : kind === 'bass' ? 0.16 : 0.09]);
      }
      return { melody, legato: true, perc, drone: true };
    })(),

    /* Bilawal on an eight-beat keherwa at wedding pace. Ten bars of eight at
       0.36s a beat fills the half minute; null holds the note before it.   */
    shehnai: (() => {
      const B = 0.36;
      const bars = [
        [0, 2, 4, 2, 4, 5, 4, 2],
        [0, 1, 2, 3, 4, 5, 6, 7],
        [7, 6, 5, 4, 5, 6, 7, null],
        [7, 5, 4, 2, 0, 2, 4, 5],
        [4, 5, 6, 7, 6, 5, 4, 2],
        [2, 3, 4, 5, 4, 3, 2, 1],
        [0, 2, 4, 5, 7, 5, 4, 2],
        [4, 5, 6, 7, 7, 6, 5, 4],
        [2, 4, 5, 4, 2, 1, 2, 0],
        [0, 2, 4, 7, 4, 2, 1, 0]
      ];
      const melody = [];
      bars.forEach((bar, b) => bar.forEach((deg, i) => {
        if (deg === null) { melody[melody.length - 1][2] += B; return; }
        melody.push([(b * 8 + i) * B, deg, B * 0.92]);
      }));
      const last = melody[melody.length - 1];
      last[2] = PIECE_LENGTH - last[0];        // hold the final Sa to the end

      const pattern = [['bass', 0.24], ['rim', 0.14], ['rim', 0.09], ['rim', 0.14],
                       ['rim', 0.14], ['slap', 0.1], ['bass', 0.2], ['rim', 0.14]];
      const perc = [];
      for (let i = 0; i * B < PIECE_LENGTH; i++) {
        const [kind, g] = pattern[i % 8];
        perc.push([i * B, kind, g]);
      }
      return { melody, perc, drone: true };
    })()
  };

  /* ── Stage: one instrument, its pointer handling and its piece ─ */

  const VB_W = 1200, VB_H = 340;
  const stages = [];

  class Stage {
    constructor(section) {
      this.el = section;
      this.name = section.dataset.instrument;
      this.def = INSTRUMENTS[this.name];
      this.svg = section.querySelector('.instrument');
      this.figure = section.querySelector('[data-figure]');
      this.halo = section.querySelector('[data-halo]');
      this.bow = section.querySelector('[data-bow]');
      this.bodyEl = section.querySelector('[data-body]');
      this.strings = [...section.querySelectorAll('.string')];
      this.holes = [...section.querySelectorAll('.hole')];
      this.progressEl = section.querySelector('[data-progress]');
      this.playBtn = section.querySelector('[data-play]');
      this.timeEl = section.querySelector('[data-time]');
      this.labelEl = section.querySelector('.play-label');

      this.buildRail();

      this.down = false;
      this.voice = null;
      this.degree = -1;
      this.speed = 0;
      this.dir = 0;
      this.last = null;
      this.lastMove = 0;
      this.piece = null;
      this.expr = 0;          // breath, bow weight or reed pressure: -1 to 1
      this.bendSemis = 0;     // the sitar's held meend

      /* No pointer capture: an instrument holds your hand only while your hand
         is on it. Capturing would keep every later click inside this figure,
         and the buttons in the header would stop answering.                 */
      const fig = this.figure;
      fig.addEventListener('pointerdown', (e) => this.onDown(e));
      fig.addEventListener('pointermove', (e) => this.onMove(e));
      fig.addEventListener('pointerleave', () => this.leave());

      this.playBtn.addEventListener('click', () => {
        if (this.piece) this.stopPiece(); else this.playPiece();
      });
    }

    buildRail() {
      const rail = this.el.querySelector('[data-rail]');
      const labels = SWARA[this.def.raga];
      this.railItems = labels.map(label => {
        const mark = label.endsWith('_') ? ' komal' : label.endsWith('^') ? ' tivra' : '';
        const s = document.createElement('span');
        s.className = 'swara' + mark;
        const glyph = document.createElement('i');
        glyph.className = 'glyph';
        glyph.textContent = label.replace(/[_^]$/, '');
        s.appendChild(glyph);
        rail.appendChild(s);
        return s;
      });
    }

    /* — geometry — */

    toLocal(e) {
      const m = this.svg.getScreenCTM();
      if (m) {
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const l = pt.matrixTransform(m.inverse());
        return { x: l.x, y: l.y };
      }
      const r = this.svg.getBoundingClientRect();
      const k = Math.min(r.width / VB_W, r.height / VB_H);
      return {
        x: (e.clientX - r.left - (r.width - VB_W * k) / 2) / k,
        y: (e.clientY - r.top - (r.height - VB_H * k) / 2) / k
      };
    }

    // `slack` forgives a little overshoot while a note is being held
    inside(p, slack) {
      const r = this.def.region;
      const s = slack || 0;
      return p.x > r.x0 - s && p.x < r.x1 + s && p.y > r.y0 - s && p.y < r.y1 + s;
    }

    // how far down the short axis the hand is sitting: 0 at the top, 1 at the foot
    pressure(p) {
      const r = this.def.region;
      return clamp((p.y - r.y0) / (r.y1 - r.y0), 0, 1);
    }

    stopAt(p) {
      if (this.def.kind === 'bow') {
        const [a, b] = this.def.span;
        return clamp(Math.round((p.x - a) / (b - a) * 7), 0, 7);
      }
      const stops = this.def.stops;
      let best = 0, d = Infinity;
      stops.forEach((sx, i) => { const dd = Math.abs(p.x - sx); if (dd < d) { d = dd; best = i; } });
      return best;
    }

    stringAt(p) {
      const ys = this.def.stringY;
      return clamp(Math.round((p.y - ys[0]) / (ys[1] - ys[0])), 0, ys.length - 1);
    }

    /* — pointer ────────────────────────────────────────────────
       Passing over an instrument sounds it, the way a hand brushing
       the strings would. Holding the button takes hold: the swara
       stays under your hand, and pulling across the instrument
       works its expression. Clicking away lets go of everything.  */

    onDown(e) {
      Engine.start();
      hideHint();
      const p = this.toLocal(e);
      // the tilted drawing's box reaches well past the instrument itself, so a
      // press out in that empty space counts as clicking away
      if (!this.inside(p)) { stages.forEach(s => s.reset()); return; }

      this.down = true;
      this.last = { x: p.x, y: p.y, t: performance.now() };
      this.lastMove = performance.now();
      this.anchor = { x: p.x, y: p.y, expr: this.expr };
      this.el.classList.add('sounding');
      this.el.classList.add('held');

      if (this.def.kind === 'pluck') {
        this.heldString = this.stringAt(p);
        this.strike(this.heldString);
      } else {
        this.startVoice();
        this.degree = this.stopAt(p);
        this.voice.note(degreeFreq(this.def, this.degree), 0, true);
        this.voice.attack();
        this.applyExpression();
        this.show(this.degree);
      }
      e.preventDefault();
    }

    onMove(e) {
      const p = this.toLocal(e);
      const now = performance.now();
      if (this.last) {
        const dt = Math.max(8, now - this.last.t);
        const dx = p.x - this.last.x;
        this.speed = this.speed * 0.6 + Math.hypot(dx, p.y - this.last.y) / dt * 1000 * 0.4;
        this.dir = this.dir * 0.7 + clamp(dx / 18, -1, 1) * 0.3;
      }
      this.last = { x: p.x, y: p.y, t: now };
      this.lastMove = now;

      const fr = this.figure.getBoundingClientRect();
      this.halo.style.left = (e.clientX - fr.left) + 'px';
      this.halo.style.top = (e.clientY - fr.top) + 'px';

      if (this.down) {
        // wander off the instrument and it lets go, rather than following you
        if (this.inside(p, 40)) this.hold(p);
        else this.onUp();
        return;
      }
      if (this.inside(p)) this.brush(p);
      else { this.unhover(); this.fade(); }
    }

    // the pointer left the figure altogether
    leave() {
      this.unhover();
      if (this.down) this.onUp();
      this.fade();
    }

    onUp() {
      if (!this.down) return;
      this.down = false;
      this.el.classList.remove('held');
      if (this.def.kind === 'pluck') this.releaseBend();
      // back to a passing touch: the sound follows movement again
    }

    // clicking anywhere off the instrument lets go and puts everything back
    reset() {
      this.down = false;
      this.expr = 0;
      this.bendSemis = 0;
      this.el.classList.remove('held');
      this.strings.forEach((s, i) => {
        if (this.def.kind === 'pluck') {
          const y = this.def.stringY[i];
          s.setAttribute('d', `M86 ${y} L1060 ${y}`);
        }
      });
      if (this.current) this.current.src.playbackRate.setTargetAtTime(1, Engine.ctx.currentTime, 0.1);
      if (this.voice) this.voice.gain(0, 0, 0.06);
      this.degree = -1;
      this.speed = 0;
      this.unhover();
      if (!this.piece) { this.el.classList.remove('sounding'); this.clear(); }
    }

    // levelled by ear against the sitar, not by nominal gain
    peakLevel() {
      if (this.def.kind === 'bow') return 0.46;
      return this.name === 'bansuri' ? 0.4 : 0.5;
    }

    startVoice() {
      if (!this.voice) this.voice = makeVoice(this.name);
      return this.voice;
    }

    // expression runs from -1 (thin, light) to 1 (full, heavy)
    applyExpression(drive) {
      if (!this.voice) return;
      const press = clamp(0.5 + 0.5 * this.expr, 0, 1);
      this.voice.setPressure(press);
      const weight = 0.5 + 0.5 * press;
      const motion = drive === undefined ? 1 : drive;
      this.voice.gain(this.peakLevel() * weight * motion, 0, 0.05);
    }

    /* — a hand passing over — */

    brush(p) {
      const drive = clamp(this.speed / 620, 0, 1);
      if (drive < 0.02) return;
      this.el.classList.add('sounding');
      clearTimeout(this.soundTimer);
      this.soundTimer = setTimeout(() => {
        if (!this.down && !this.piece) this.el.classList.remove('sounding');
      }, 500);

      if (this.def.kind === 'pluck') {
        const i = this.stringAt(p);
        this.strings.forEach((s, n) => s.classList.toggle('ready', n === i));
        if (i !== this.brushed) { this.brushed = i; this.strike(i); }
        return;
      }

      this.startVoice();
      const deg = this.stopAt(p);
      this.holes.forEach((h, n) => h.classList.toggle('ready', n === deg));
      if (deg !== this.degree) {
        this.degree = deg;
        this.voice.note(degreeFreq(this.def, deg));
        this.voice.attack(0, 6);
        this.show(deg);
      }
      this.applyExpression(drive);
      this.moveBow(p);
    }

    // a hand that stops moving stops the sound, unless it is holding on
    fade() {
      this.brushed = -1;
      if (this.down || !this.voice) return;
      this.voice.gain(0, 0, 0.09);
    }

    /* — a hand holding on — */

    hold(p) {
      // pulling across the instrument works its expression, and it stays put
      if (this.def.kind !== 'pluck') {
        this.expr = clamp(this.anchor.expr + (this.anchor.y - p.y) / 130, -1, 1);
      }

      if (this.def.kind === 'pluck') {
        const idx = this.stringAt(p);
        if (idx !== this.heldString) {          // dragged across: strum the next string
          this.heldString = idx;
          this.anchor = { x: p.x, y: p.y, expr: this.expr };
          this.bendSemis = 0;
          this.strike(idx);
        } else {
          // pull along the fret: up to a whole tone above, a semitone below
          this.bendSemis = clamp((p.x - this.anchor.x) / 190, -0.5, 1) * 2;
          this.bend(idx, this.bendSemis, p.x);
        }
        return;
      }

      this.startVoice();
      const deg = this.stopAt(p);
      if (deg !== this.degree) {
        this.degree = deg;
        this.voice.note(degreeFreq(this.def, deg));
        if (this.def.kind === 'wind') this.voice.attack(0, 6);
        this.show(deg);
      }
      // a held bow still answers to how fast it is drawn
      const motion = this.def.kind === 'bow' ? 0.72 + 0.28 * clamp(this.speed / 500, 0, 1) : 1;
      this.applyExpression(motion);
      this.moveBow(p);
    }

    moveBow(p) {
      if (!this.bow) return;
      this.bow.setAttribute('transform',
        `translate(${p.x.toFixed(1)},170) rotate(${(clamp(this.dir, -1, 1) * 9).toFixed(1)})`);
    }

    strike(index) {
      const deg = this.def.stringY.length - 1 - index;    // bottom string is Sa
      const freq = degreeFreq(this.def, deg);
      const g = 0.15 + 0.18 * clamp(this.speed / 700, 0, 1);
      this.current = pluck(freq, g, { dur: 2.8, damp: 0.9965, buzz: 2.6, tag: 'sitar' });
      this.current.src.playbackRate.setValueAtTime(ratio(this.bendSemis), Engine.ctx.currentTime);

      // the tarab strings behind the frets answer on their own
      [deg + 2, deg - 3].forEach((n, i) => {
        if (n < 0 || n > 7) return;
        setTimeout(() => {
          if (!Engine.ready) return;
          pluck(degreeFreq(this.def, n) * 2, 0.05,
                { dur: 2.2, damp: 0.9975, buzz: 1.6, tag: 'tarab' });
        }, 40 + i * 70);
      });

      this.show(deg);
      this.ring(this.strings[index]);
    }

    bend(index, semis, atX) {
      if (this.current) {
        this.current.src.playbackRate.setTargetAtTime(ratio(semis), Engine.ctx.currentTime, 0.05);
      }
      const y = this.def.stringY[index];
      const pull = clamp(semis, -0.5, 2) * 11;            // the string visibly bows
      const cx = clamp(atX, 200, 950);
      this.strings[index].setAttribute('d', `M86 ${y} Q${cx.toFixed(0)} ${(y + pull * 2).toFixed(0)} 1060 ${y}`);
    }

    // letting go of the button leaves the bend where you put it — only a
    // click away from the instrument straightens the string again
    releaseBend() {
      if (this.heldString === undefined || Math.abs(this.bendSemis) > 0.05) return;
      const y = this.def.stringY[this.heldString];
      this.strings[this.heldString].setAttribute('d', `M86 ${y} L1060 ${y}`);
    }

    /* — light — */

    hover(p) {
      if (this.def.kind === 'pluck') {
        const i = this.stringAt(p);
        this.strings.forEach((s, n) => s.classList.toggle('ready', n === i));
      } else {
        const i = this.stopAt(p);
        this.holes.forEach((h, n) => h.classList.toggle('ready', n === i));
      }
    }

    unhover() {
      this.strings.forEach(s => s.classList.remove('ready'));
      this.holes.forEach(h => h.classList.remove('ready'));
    }

    show(deg) {
      const d = clamp(deg, 0, 7);
      if (this.def.kind === 'pluck') {
        const i = this.def.stringY.length - 1 - d;
        this.strings.forEach((s, n) => s.classList.toggle('lit', n === i));
      } else if (this.def.kind === 'bow') {
        this.strings.forEach((s, n) => s.classList.toggle('lit', n === d % 3));
      } else {
        this.holes.forEach((h, n) => h.classList.toggle('lit', n === d));
      }
      this.railItems.forEach((s, n) => s.classList.toggle('on', n === d));
    }

    clear() {
      this.strings.forEach(s => s.classList.remove('lit'));
      this.holes.forEach(h => h.classList.remove('lit'));
      this.railItems.forEach(s => s.classList.remove('on'));
      this.degree = -1;
    }

    ring(el) {
      if (!el) return;
      el.classList.remove('ringing');
      void el.getBoundingClientRect();
      el.classList.add('ringing');
    }

    flash() {
      if (!this.bodyEl) return;
      this.bodyEl.classList.remove('hit');
      void this.bodyEl.getBoundingClientRect();
      this.bodyEl.classList.add('hit');
    }

    /* — the written piece — */

    playPiece() {
      Engine.start();
      hideHint();
      stages.forEach(s => { if (s !== this) s.stopPiece(); });

      const ctx = Engine.ctx;
      const spec = PIECES[this.name];
      const t0 = ctx.currentTime + 0.25;
      const bus = Engine.bus(1);
      const piece = this.piece = { bus, t0, spec, evt: -1, perc: -1, voice: null };

      // tanpura: Pa, Sa, Sa, and the octave below, over and over
      if (spec.drone) {
        const offsets = [7 - 12, 0, 0, -12];
        for (let i = 0; i * 0.92 < PIECE_LENGTH; i++) {
          const semis = offsets[i % 4];
          pluck(this.def.tonic * ratio(semis), 0.055,
                { dur: 4.2, damp: 0.9988, buzz: 1.4, tag: 'tanpura' },
                t0 + i * 0.92, bus);
        }
      }

      if (this.def.kind === 'pluck') {
        spec.melody.forEach(([t, deg, , gain]) => {
          pluck(degreeFreq(this.def, deg), gain || 0.3,
                { dur: 2.8, damp: 0.9965, buzz: 2.6, tag: 'sitar' }, t0 + t, bus);
        });
        (spec.chikari || []).forEach(t => {
          pluck(degreeFreq(this.def, 7) * 2, 0.07,
                { dur: 1.4, damp: 0.9965, buzz: 2.2, tag: 'chikari' }, t0 + t, bus);
        });
      } else {
        const v = piece.voice = makeVoice(this.name, bus);
        const peak = this.peakLevel() * (this.name === 'sarangi' ? 1.25 : 0.95);
        v.setPressure(this.name === 'sarangi' ? 0.6 : 0.55, t0);
        spec.melody.forEach(([t, deg, dur], i) => {
          const at = t0 + t;
          v.note(degreeFreq(this.def, deg), at, i === 0);
          v.attack(at, this.name === 'sarangi' ? 14 : 7);
          v.gain(peak, at, this.name === 'shehnai' ? 0.02 : 0.06);
          const next = spec.melody[i + 1];
          const gap = next ? (t0 + next[0]) - (at + dur) : Infinity;
          if (!spec.legato || gap > 0.25 || !next) {
            v.gain(0, at + dur, this.name === 'shehnai' ? 0.035 : 0.12);
          }
        });
      }

      (spec.perc || []).forEach(([t, kind, g]) => drum(kind, t0 + t, g, bus));

      this.el.classList.add('sounding', 'playing');
      this.playBtn.classList.add('is-playing');
      this.labelEl.textContent = 'Stop';
    }

    stopPiece() {
      if (!this.piece) return;
      const { bus, voice } = this.piece;
      const t = Engine.ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setTargetAtTime(0, t, 0.08);
      if (voice) voice.stop();
      setTimeout(() => bus.disconnect(), 900);
      this.piece = null;

      this.el.classList.remove('playing');
      if (!this.down) { this.el.classList.remove('sounding'); this.clear(); }
      this.playBtn.classList.remove('is-playing');
      this.labelEl.textContent = 'Play the piece';
      this.timeEl.textContent = '0:30';
      this.progressEl.style.transform = 'scaleX(0)';
    }

    tick() {
      // a passing hand that stops moving stops the sound; a holding hand does not
      const now = performance.now();
      if (!this.down && this.voice && now - this.lastMove > 90) {
        this.speed *= 0.6;
        this.brushed = -1;
        if (this.voice.level > 0.0004) this.voice.gain(0, 0, 0.09);
      }

      if (!this.piece) return;
      const p = this.piece;
      const t = Engine.ctx.currentTime - p.t0;
      if (t < 0) return;
      if (t >= PIECE_LENGTH + 1.2) { this.stopPiece(); return; }

      this.progressEl.style.transform = `scaleX(${clamp(t / PIECE_LENGTH, 0, 1)})`;
      this.timeEl.textContent = fmt(clamp(PIECE_LENGTH - t, 0, PIECE_LENGTH));

      const m = p.spec.melody;
      let i = p.evt;
      while (i + 1 < m.length && m[i + 1][0] <= t) i++;
      if (i !== p.evt && i >= 0) {
        p.evt = i;
        const deg = m[i][1];
        if (this.down) { /* leave the light to the hand */ } else this.show(deg);
        if (this.def.kind === 'pluck') {
          this.ring(this.strings[clamp(this.def.stringY.length - 1 - deg, 0, 7)]);
        } else if (this.bow && !this.down) {
          const [a, b] = this.def.span;
          const x = a + (b - a) * (clamp(deg, 0, 7) / 7);
          this.bow.setAttribute('transform', `translate(${x.toFixed(0)},170) rotate(${i % 2 ? 8 : -8})`);
        }
      }

      const perc = p.spec.perc;
      if (perc) {
        let j = p.perc;
        while (j + 1 < perc.length && perc[j + 1][0] <= t) j++;
        if (j !== p.perc) { p.perc = j; this.flash(); }
      }
    }

    silence() {
      this.stopPiece();
      if (this.down) this.onUp();
      if (this.voice) this.voice.gain(0, 0, 0.06);
      this.el.classList.remove('sounding');
      this.clear();
      this.unhover();
    }
  }

  /* ── Wiring ──────────────────────────────────────────────── */

  document.querySelectorAll('.stage').forEach(s => stages.push(new Stage(s)));

  const tickAll = () => stages.forEach(s => s.tick());
  (function frame() { tickAll(); requestAnimationFrame(frame); })();
  setInterval(tickAll, 200);          // rAF stops in a background tab

  const hint = document.getElementById('hint');
  let hintGone = false;
  function hideHint() {
    if (hintGone) return;
    hintGone = true;
    hint.classList.add('gone');
  }

  const gate = document.getElementById('gate');
  document.getElementById('gateButton').addEventListener('click', () => {
    Engine.start();
    gate.classList.add('gone');
    setTimeout(() => { gate.style.display = 'none'; }, 800);
    stages[0].el.focus({ preventScroll: true });
  });

  // a release anywhere counts, including outside the window
  ['pointerup', 'pointercancel', 'blur'].forEach(type =>
    window.addEventListener(type, () => stages.forEach(s => s.onUp())));

  // clicking off the instruments lets go of every held note and bend
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.figure, .play, .index a, .gate')) return;
    stages.forEach(s => s.reset());
  });

  const reel = document.getElementById('reel');
  const links = [...document.querySelectorAll('.index a')];
  links.forEach((a, i) => a.addEventListener('click', (e) => {
    e.preventDefault();
    stages[i].el.scrollIntoView({ behavior: 'smooth' });
  }));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const i = stages.findIndex(s => s.el === entry.target);
      if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
        links.forEach((a, n) => a.classList.toggle('current', n === i));
      } else if (!entry.isIntersecting) {
        stages[i].silence();
      }
    });
  }, { root: reel, threshold: [0, 0.55] });
  stages.forEach(s => io.observe(s.el));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stages.forEach(s => s.silence());
  });
})();
