/**
 * PETUALANGAN DETEKTIF KOSAKATA
 * Game Edukasi Bahasa Indonesia SMP Kelas IX Semester 1
 * Script Logika Interaktif & Web Audio Engine
 */

import { submitScore, attachReflection, fetchTopScores } from './score-store.js';

// Confetti & Particle FX Engine (Zero External Dependency)
class ParticleEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animating = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x, y, count = 75) {
    if (!this.ctx) return;
    this.resize();
    const colors = ['#f59e0b', '#38bdf8', '#10b981', '#ef4444', '#ec4899', '#8b5cf6', '#facc15', '#ffffff'];
    const originX = x ?? window.innerWidth / 2;
    const originY = y ?? window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        size: 5 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 14,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.018
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.loop();
    }
  }

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity
      p.vx *= 0.98; // Air resistance
      p.rotation += p.rotSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Sound & Procedural Music Engine (Web Audio API)
// Master bus (compressor to stop clipping when notes stack) + a procedural
// reverb send (short generated impulse, no external audio files) make every
// effect below feel fuller and more polished than a single raw oscillator.
class SoundFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.reverb = null;
    this.reverbSend = null;
    this.soundEnabled = true;
    this.musicEnabled = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    // Extra gain applied to one-shot SFX (not BGM) so clicks/correct/combo/etc.
    // punch through clearly on phone speakers. The compressor on the master
    // bus keeps this from clipping even when several sounds stack.
    this.sfxBoost = 1.8;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this._setupBus();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _setupBus() {
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // Threshold lowered and ratio raised versus before so the louder SFX
    // (sfxBoost) get tamed into a punchy, consistent level instead of
    // clipping or distorting on phone speakers.
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-22, ctx.currentTime);
    this.compressor.knee.setValueAtTime(20, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(6, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.22, ctx.currentTime);

    this.masterGain.connect(this.compressor);
    this.compressor.connect(ctx.destination);

    // Short bright synthetic impulse response - gives chimes/fanfare a
    // sparkling tail without loading any external audio asset.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._makeImpulse(1.4, 2.4);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.4;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.masterGain);
  }

  _makeImpulse(duration = 1.4, decay = 2.2) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  // opts: { reverb: bool, filterFreq, filterType, slideTo, boost }
  // boost defaults to true (one-shot SFX); pass boost:false for BGM notes.
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, delay = 0, opts = {}) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (opts.slideTo) {
        osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + duration);
      }

      const effectiveGain = gainVal * (opts.boost === false ? 1 : this.sfxBoost);

      // Fast soft attack instead of an instant jump - removes the faint
      // "tick" artifact and makes every note feel like a gentle pluck.
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(effectiveGain, 0.0005), t + Math.min(0.02, duration * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      let outNode = osc;
      if (opts.filterFreq) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = opts.filterType || 'lowpass';
        filter.frequency.value = opts.filterFreq;
        osc.connect(filter);
        outNode = filter;
      }
      outNode.connect(gain);
      gain.connect(this.masterGain);
      if (opts.reverb && this.reverbSend) {
        gain.connect(this.reverbSend);
      }
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Short filtered noise burst for percussive texture (hi-hat ticks, impact cracks).
  // boost defaults to true (one-shot SFX); pass boost:false for BGM's hi-hat ticks.
  playNoise(duration = 0.08, gainVal = 0.06, delay = 0, filterFreq = 4000, filterType = 'highpass', boost = true) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const effectiveGain = gainVal * (boost ? this.sfxBoost : 1);

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(effectiveGain, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(t);
      src.stop(t + duration + 0.02);
    } catch (e) {}
  }

  click() {
    this.playTone(800, 'triangle', 0.05, 0.08);
    this.playTone(320, 'sine', 0.08, 0.05, 0.01);
  }

  whoosh() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(680, t + 0.12);
      filter.type = 'bandpass';
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
      gain.gain.setValueAtTime(0.05 * this.sfxBoost, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }

  // Sparkly "collect" chime - a little bell instead of a flat beep.
  wordPick(count = 1) {
    const baseFreq = 480 + count * 70;
    this.playTone(baseFreq, 'triangle', 0.1, 0.12);
    this.playTone(baseFreq * 1.5, 'sine', 0.18, 0.09, 0.045, { reverb: true });
    this.playTone(baseFreq * 2, 'sine', 0.24, 0.05, 0.09, { reverb: true });
  }

  correct() {
    this.playTone(523.25, 'triangle', 0.12, 0.12); // C5
    this.playTone(659.25, 'triangle', 0.14, 0.12, 0.07); // E5
    this.playTone(783.99, 'sine', 0.25, 0.15, 0.14, { reverb: true }); // G5
    this.playTone(1046.50, 'sine', 0.4, 0.13, 0.21, { reverb: true }); // C6
  }

  wrong() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.28);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.28);
      gain.gain.setValueAtTime(0.12 * this.sfxBoost, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
      this.playNoise(0.05, 0.03, 0, 300, 'lowpass');
    } catch (e) {}
  }

  combo(streak) {
    const root = 440; // A4
    const scale = [1, 1.2, 1.4, 1.6, 1.8, 2.0];
    const factor = scale[Math.min(streak - 1, scale.length - 1)];
    this.playTone(root * factor, 'sine', 0.12, 0.15);
    this.playTone(root * factor * 1.25, 'triangle', 0.18, 0.14, 0.05);
    this.playTone(root * factor * 1.5, 'sine', 0.28, 0.15, 0.10, { reverb: true });
    if (streak >= 3) {
      this.playTone(root * factor * 2, 'triangle', 0.3, 0.08, 0.14, { reverb: true });
    }
  }

  bossHit() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Punchy kick
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
      gain.gain.setValueAtTime(Math.min(0.45, 0.32 * (this.sfxBoost * 0.75)), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.28);

      // Zap sound + impact crack
      this.playTone(720, 'sawtooth', 0.1, 0.08, 0.02);
      this.playNoise(0.06, 0.07, 0, 2500, 'highpass');
    } catch (e) {}
  }

  levelUnlock() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.playTone(f, 'sine', 0.25, 0.12, i * 0.07, { reverb: i >= notes.length - 2 });
    });
  }

  // Distinct sparkling bell run for badge/achievement moments.
  badgeUnlock() {
    const notes = [659.25, 783.99, 987.77, 1174.66, 1567.98];
    notes.forEach((f, i) => {
      this.playTone(f, 'triangle', 0.3, 0.1, i * 0.06, { reverb: true });
      this.playTone(f * 2, 'sine', 0.35, 0.04, i * 0.06 + 0.02, { reverb: true });
    });
  }

  fanfare() {
    const chords = [
      [523.25, 659.25], // C - E
      [587.33, 698.46], // D - F
      [659.25, 783.99], // E - G
      [783.99, 1046.5]  // G - C
    ];
    chords.forEach((chord, i) => {
      const delay = i * 0.13;
      chord.forEach(f => this.playTone(f, 'triangle', 0.22, 0.12, delay));
    });
    this.playNoise(0.3, 0.05, chords.length * 0.13, 3000, 'highpass');
    setTimeout(() => {
      [1046.5, 1318.51, 1567.98].forEach((f, i) => this.playTone(f, 'sine', 0.7, 0.14, i * 0.03, { reverb: true }));
    }, chords.length * 130);
  }

  // Procedural Background Music Synthesizer (BGM)
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  startMusic() {
    this.musicEnabled = true;
    this.init();
    if (this.bgmTimer) return;

    // Upbeat mysterious detective melody (16-step loop)
    const melody = [
      220, 0, 261.63, 293.66, 329.63, 0, 293.66, 261.63,
      220, 0, 349.23, 329.63, 293.66, 261.63, 246.94, 220
    ];
    const bass = [
      110, 0, 0, 0, 146.83, 0, 0, 0,
      130.81, 0, 0, 0, 164.81, 0, 0, 0
    ];
    // Soft background pad chords that bloom under the bass every 8 steps,
    // adding harmonic depth so the loop feels less like a single thin lead line.
    const pad = [
      [220, 261.63, 329.63], null, null, null, null, null, null, null,
      [196, 246.94, 293.66], null, null, null, null, null, null, null
    ];

    const stepDuration = 220; // ~136 BPM
    this.bgmStep = 0;

    this.bgmTimer = setInterval(() => {
      if (!this.musicEnabled || !this.ctx) return;
      const step = this.bgmStep % 16;
      const mFreq = melody[step];
      const bFreq = bass[step];
      const padChord = pad[step];

      if (mFreq > 0) {
        this.playTone(mFreq, 'triangle', 0.18, 0.032, 0, { reverb: true });
      }
      if (bFreq > 0) {
        this.playTone(bFreq, 'sine', 0.35, 0.045);
      }
      if (padChord) {
        padChord.forEach(f => this.playTone(f, 'sine', 0.9, 0.015, 0, { reverb: true }));
      }
      // Light hi-hat groove on the off-beats
      if (step % 2 === 1) {
        this.playNoise(0.035, 0.012, 0, 7000, 'highpass');
      }
      if (step === 4 || step === 12) {
        this.playTone(900, 'triangle', 0.03, 0.02);
      }

      this.bgmStep++;
    }, stepDuration);
  }

  stopMusic() {
    this.musicEnabled = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

const SFX = new SoundFX();

// Human Voice Narrator (Web Speech API - browser's built-in text-to-speech,
// zero external audio files, works fully offline on most Android/iOS devices
// that ship an Indonesian voice pack). Reads story text and answer feedback
// aloud so the game has a real human(-like) voice, not just synth SFX.
class VoiceOver {
  constructor() {
    this.enabled = true;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.voice = null;
    this.voicesReady = false;
    // Chrome on Android silently garbage-collects a SpeechSynthesisUtterance
    // that nothing keeps a reference to, killing speech mid-sentence - this
    // rarely shows up on desktop (different GC timing) but is a very common
    // cause of "works on my computer, silent on the phone". Keeping the
    // utterance (and a keep-alive watchdog for Chrome's ~15s auto-pause bug)
    // on `this` fixes both.
    this._activeUtterance = null;
    this._keepAliveTimer = null;
    if (this.supported) {
      this._loadVoice();
      window.speechSynthesis.onvoiceschanged = () => this._loadVoice();
    }
  }

  _loadVoice() {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      this.voice =
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('id')) ||
        voices.find((v) => /indonesia/i.test(v.name)) ||
        null;
      this.voicesReady = true;
    } catch (e) {}
  }

  _clearKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }

  speak(text, { rate = 1, pitch = 1.05, interrupt = true, onEnd = null } = {}) {
    if (!this.enabled || !this.supported || !text) {
      if (onEnd) onEnd();
      return;
    }
    try {
      if (interrupt) window.speechSynthesis.cancel();
      this._clearKeepAlive();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'id-ID';
      utter.rate = rate;
      utter.pitch = pitch;
      utter.volume = 0.95;
      if (this.voice) utter.voice = this.voice;

      const finish = () => {
        this._clearKeepAlive();
        if (this._activeUtterance === utter) this._activeUtterance = null;
        if (onEnd) onEnd();
      };
      utter.onend = finish;
      utter.onerror = finish;

      // Keep a strong reference so Chrome/Android can't GC it mid-utterance.
      this._activeUtterance = utter;

      // Android Chrome auto-pauses the speech queue after ~15s of silence
      // detection on long utterances; nudging pause/resume keeps it alive.
      this._keepAliveTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          this._clearKeepAlive();
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 5000);

      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Voice narration error:', e);
      if (onEnd) onEnd();
    }
  }

  stop() {
    this._clearKeepAlive();
    this._activeUtterance = null;
    if (this.supported) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  setEnabled(value) {
    this.enabled = value;
    if (!value) this.stop();
  }
}

const Narrator = new VoiceOver();

// Game Application Engine
const GameApp = {
  state: {
    player: {
      name: 'Detektif',
      class: 'IX-A',
      group: '',
      charId: 'reader',
      charName: 'Detektif Pembaca',
      charIcon: '🔎',
      charImg: 'assets/char_reader.jpg'
    },
    xp: 0,
    streak: 0,
    unlockedLevels: [1],
    badges: [],
    level1Collected: [],
    level2Index: 0,
    level2Score: 0,
    level2Questions: [],
    level3Pool: [],
    level3SelectedWord: null,
    level3Sorted: { umum: [], khusus: [], konotatif: [] },
    level4SelectedWords: [],
    level5Index: 0,
    level5Score: 0,
    level5Questions: [],
    cloudScoreDocId: null
  },
  particles: null,

  // Level 2 Questions Bank
  level2Data: [
    {
      word: "menjelajah",
      context: "Rian memberanikan diri untuk <strong>menjelajah</strong> ke dalam ruangan perpustakaan kuno tersebut.",
      question: "Berdasarkan konteks kalimat di atas, apa makna kata <em>menjelajah</em>?",
      options: [
        { text: "Mengunjungi dan menyelidiki tempat baru untuk mencari tahu", isCorrect: true },
        { text: "Berlari kencang keluar ruangan karena ketakutan", isCorrect: false },
        { text: "Membersihkan debu di seluruh ruangan dengan sapu", isCorrect: false }
      ],
      explanation: "Rian memasuki ruangan tua yang belum pernah ia datangi dengan rasa penasaran untuk menyelidiki isinya."
    },
    {
      word: "sunyi",
      context: "Suasana di dalam begitu <strong>sunyi</strong>, hanya terdengar derit langkah kakinya di atas lantai kayu tua.",
      question: "Petunjuk 'hanya terdengar derit langkah kakinya' membuktikan bahwa kata <em>sunyi</em> bermakna...",
      options: [
        { text: "Gelap gulita tanpa lentera", isCorrect: false },
        { text: "Hening, senyap, dan tidak ada suara bising", isCorrect: true },
        { text: "Ramai dipenuhi celoteh siswa", isCorrect: false }
      ],
      explanation: "Frasa 'hanya terdengar derit langkah kakinya' menjadi petunjuk konteks langsung bahwa keadaan sangat hening."
    },
    {
      word: "antusias",
      context: "Dengan rasa <strong>antusias</strong> yang membara di dalam dada, Rian mulai menelusuri rak sastra klasik.",
      question: "Frasa 'membara di dalam dada' mengindikasikan bahwa kata <em>antusias</em> bermakna...",
      options: [
        { text: "Semangat tinggi dan gairah minat yang besar", isCorrect: true },
        { text: "Rasa cemas dan ketakutan mendalam", isCorrect: false },
        { text: "Kebingungan menentukan arah jalan", isCorrect: false }
      ],
      explanation: "Kata 'membara' mendeskripsikan gairah ketertarikan dan energi positif untuk menjelajah."
    },
    {
      word: "menelusuri",
      context: "Rian mulai <strong>menelusuri</strong> lorong demi lorong rak sastra klasik satu demi satu.",
      question: "Berdasarkan kalimat di atas, makna kata <em>menelusuri</em> adalah...",
      options: [
        { text: "Berjalan mengikuti alur atau jejak rak secara saksama", isCorrect: true },
        { text: "Memanjat rak buku hingga ke langit-langit", isCorrect: false },
        { text: "Membakar lorong perpustakaan yang berdebu", isCorrect: false }
      ],
      explanation: "Menelusuri berarti bergerak menyusuri lorong atau lintasan secara berurutan dan teratur."
    },
    {
      word: "terpukau",
      context: "Ia <strong>terpukau</strong> menatap keindahan ilustrasi di halaman pembukanya...",
      question: "Makna kata <em>terpukau</em> berdasarkan kalimat di atas adalah...",
      options: [
        { text: "Mengantuk dan ingin beristirahat", isCorrect: false },
        { text: "Sangat kagum dan terpesona sehingga perhatiannya terpusat", isCorrect: true },
        { text: "Kecewa terhadap kualitas gambar kuno", isCorrect: false }
      ],
      explanation: "Kata 'terpukau' berakar dari rasa takjub atau terpesona yang mendalam akan suatu keindahan."
    }
  ],

  // Level 3 Data (Categorizing into 3 Gates)
  level3Data: [
    { word: "HEWAN", gate: "umum", reason: "Kata umum (hipernim) yang mencakup berbagai jenis satwa." },
    { word: "BURUNG", gate: "umum", reason: "Kata umum untuk kelompok unggas (membawahi elang, merpati, pipit)." },
    { word: "ELANG", gate: "khusus", reason: "Kata khusus (hiponim) jenis burung pemangsa tertentu." },
    { word: "KENDARAAN", gate: "umum", reason: "Kata umum yang membawahi sepeda, motor, mobil, kereta." },
    { word: "SEPEDA", gate: "khusus", reason: "Kata khusus jenis alat transportasi roda dua." },
    { word: "BUAH TANGAN", gate: "konotatif", reason: "Makna konotatif/kiasan yang berarti oleh-oleh, bukan buah berwujud tangan." },
    { word: "BUNGA", gate: "umum", reason: "Kata umum untuk aneka flora berbunga (mawar, anggrek, melati)." },
    { word: "MAWAR", gate: "khusus", reason: "Kata khusus untuk spesies bunga berduri dan beraroma harum." }
  ],

  // Level 5 Data (10 Master Detective Challenges)
  level5Data: [
    {
      tag: "1. Mengidentifikasi Kosakata Cerita",
      q: "Kalimat: 'Rian merasakan <strong>atmosfer</strong> magis saat menginjakkan kaki di ruang arsip tua perpustakaan.' Kata <em>atmosfer</em> bermakna...",
      options: [
        { text: "Lapisan udara yang menyelubungi planet bumi", isCorrect: false },
        { text: "Suasana atau nuansa keadaan di lingkungan sekitar", isCorrect: true },
        { text: "Derajat suhu panas pada musim kemarau", isCorrect: false }
      ],
      exp: "Dalam teks cerita, atmosfer digunakan secara metaforis untuk mendeskripsikan 'suasana/hawa keadaan'."
    },
    {
      tag: "2. Menentukan Makna Berdasarkan Konteks",
      q: "Kalimat: 'Detektif itu menatap jejak debu dengan <strong>saksama</strong> tanpa melewatkan satu detail pun.' Kata <em>saksama</em> bermakna...",
      options: [
        { text: "Teliti, cermat, dan penuh konsentrasi", isCorrect: true },
        { text: "Tergesa-gesa karena diburu waktu", isCorrect: false },
        { text: "Santai tanpa memedulikan hasil", isCorrect: false }
      ],
      exp: "Frasa 'tanpa melewatkan satu detail pun' mempertegas makna saksama yaitu sangat teliti."
    },
    {
      tag: "3. Membedakan Makna Denotatif",
      q: "Manakah kalimat berikut yang menggunakan kata bermakna <strong>denotatif</strong> (makna lugas/sebenarnya)?",
      options: [
        { text: "Perkara perselisihan tanah itu akhirnya dibawa ke meja hijau.", isCorrect: false },
        { text: "Tukang kayu mengecat meja belajar adik dengan cat hijau.", isCorrect: true },
        { text: "Pejabat itu terjerat kasus uang pelicin proyek jembatan.", isCorrect: false }
      ],
      exp: "'Meja belajar berwarna cat hijau' adalah makna denotatif (benda meja fisik yang berwarna hijau)."
    },
    {
      tag: "4. Membedakan Makna Konotatif",
      q: "Dalam kalimat: 'Rian dikenal sebagai <strong>kutu buku</strong> yang tak pernah absen mengunjungi perpustakaan sekolah.' Ungkapan <em>kutu buku</em> bermakna...",
      options: [
        { text: "Hama serangga kecil pemakan lembaran kertas buku", isCorrect: false },
        { text: "Orang yang sangat gemar dan tekun membaca buku", isCorrect: true },
        { text: "Buku pelajaran yang sudah rusak dan dimakan rayap", isCorrect: false }
      ],
      exp: "Kutu buku merupakan idiom/makna konotatif positif untuk orang yang gemar membaca."
    },
    {
      tag: "5. Menentukan Kata Umum (Hipernim)",
      q: "Di antara pilihan kata berikut, manakah yang merupakan <strong>kata umum</strong> yang mencakup kata-kata lainnya?",
      options: [
        { text: "Melihat", isCorrect: true },
        { text: "Melirik", isCorrect: false },
        { text: "Mengintip", isCorrect: false }
      ],
      exp: "Melirik dan mengintip adalah variasi cara khusus dari perbuatan umum 'melihat'."
    },
    {
      tag: "6. Menentukan Kata Khusus (Hiponim)",
      q: "Manakah kata di bawah ini yang merupakan <strong>kata khusus</strong> dari kata umum <em>keindahan rasa</em> atau <em>warna</em>?",
      options: [
        { text: "Benda", isCorrect: false },
        { text: "Jingga", isCorrect: true },
        { text: "Pakaian", isCorrect: false }
      ],
      exp: "Jingga adalah kata khusus untuk ragam pigmen warna tertentu."
    },
    {
      tag: "7. Penggunaan Kosakata dalam Kalimat",
      q: "Pilihlah kalimat yang menggunakan kata <em>antusias</em> secara tepat sesuai kaidah kebahasaan:",
      options: [
        { text: "Para siswa SMP menyambut lomba resensi buku dengan sangat antusias.", isCorrect: true },
        { text: "Hujan gerimis berlangsung sangat antusias sepanjang sore.", isCorrect: false },
        { text: "Sepeda tua itu terlihat antusias bersandar di tembok.", isCorrect: false }
      ],
      exp: "Kata 'antusias' hanya tepat disematkan pada manusia atau makhluk yang memiliki emosi semangat."
    },
    {
      tag: "8. Makna Kata dalam Teks Cerita",
      q: "Kalimat: 'Aroma wangi kertas tua membangkitkan <strong>dahaganya</strong> akan ilmu pengetahuan.' Kata <em>dahaga</em> dalam konteks ini bermakna...",
      options: [
        { text: "Rasa haus yang memerlukan segelas air minum", isCorrect: false },
        { text: "Keinginan dan kerinduan yang sangat kuat untuk belajar", isCorrect: true },
        { text: "Keringat dingin karena ketakutan di ruang gelap", isCorrect: false }
      ],
      exp: "'Dahaga akan ilmu' mengibaratkan rasa haus fisik menjadi hasrat mendalam untuk meraih wawasan."
    },
    {
      tag: "9. Menjelaskan Alasan Pemilihan Kata",
      q: "Kalimat: 'Rian <strong>menelusuri</strong> lorong rak buku dengan hati-hati.' Mengapa kata <em>menelusuri</em> lebih tepat dibanding kata <em>berlari</em>?",
      options: [
        { text: "Karena Rian takut terlambat masuk kelas berikutnya", isCorrect: false },
        { text: "Karena Rian sedang mencari dan mengamati isi buku secara runtut di lorong", isCorrect: true },
        { text: "Karena lantai perpustakaan sangat licin dan basah", isCorrect: false }
      ],
      exp: "Menelusuri menggambarkan tindakan eksplorasi yang cermat, runtut, dan penuh pengamatan."
    },
    {
      tag: "10. Menyimpulkan Makna Cerita Secara Utuh",
      q: "Aktivitas <em>'Mengeksplorasi Kosakata dalam Teks Cerita'</em> mengajarkan kita untuk menjadi pembaca yang...",
      options: [
        { text: "Pasif dan hanya membaca ringkasan cerita orang lain", isCorrect: false },
        { text: "Kritis, teliti mengamati konteks kalimat, dan memperkaya kosa kata ciptaan sendiri", isCorrect: true },
        { text: "Menghafal kamus tanpa memahami makna cerita", isCorrect: false }
      ],
      exp: "Eksplorasi kosakata melatih daya nalar kritis dan kreativitas bahasa siswa secara utuh!"
    }
  ],

  init() {
    this.particles = new ParticleEngine('fx-canvas');
    this.bindGlobalEvents();
    this.updateUI();
    this.updateHeaderAvatar();
    this.setCompanion("Selamat datang! Masukkan namamu dan pilih mitra avatar detektif untuk memulai petualangan.");
  },

  updateHeaderAvatar() {
    const avatarHeader = document.getElementById('header-avatar-icon');
    if (avatarHeader) {
      if (this.state.player.charImg) {
        avatarHeader.innerHTML = `<img src="${this.state.player.charImg}" alt="${this.state.player.charName}">`;
      } else {
        avatarHeader.textContent = this.state.player.charIcon || '🔎';
      }
    }
  },

  // Fisher-Yates shuffle - returns a new array, never mutates the source.
  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // Builds a randomized copy of a question bank: question order shuffled,
  // and each question's answer options shuffled too (so the correct answer
  // isn't always in the same position - important since the source data
  // always lists the correct option first).
  buildShuffledQuestions(sourceData) {
    return this.shuffleArray(sourceData).map((q) => ({
      ...q,
      options: this.shuffleArray(q.options)
    }));
  },

  // Custom Popup / Modal Helper (replaces native alert()/confirm()).
  // opts: { icon, eyebrow, title, message, xp, variant, confirmText, cancelText, onConfirm, onCancel }
  showModal(opts = {}) {
    const {
      icon = '✨',
      eyebrow = '',
      title = '',
      message = '',
      xp = null,
      variant = 'default',
      confirmText = 'OK',
      cancelText = null,
      onConfirm = null,
      onCancel = null
    } = opts;

    SFX.whoosh();

    const overlay = document.getElementById('app-modal-overlay');
    const card = document.getElementById('app-modal-card');
    const eyebrowEl = document.getElementById('app-modal-eyebrow');
    const xpPill = document.getElementById('app-modal-xp-pill');
    const confirmBtn = document.getElementById('app-modal-btn-confirm');
    const cancelBtn = document.getElementById('app-modal-btn-cancel');

    document.getElementById('app-modal-icon').textContent = icon;
    document.getElementById('app-modal-title').textContent = title;
    document.getElementById('app-modal-message').textContent = message;

    if (eyebrow) {
      eyebrowEl.textContent = eyebrow;
      eyebrowEl.classList.remove('hidden');
    } else {
      eyebrowEl.classList.add('hidden');
    }

    if (xp !== null) {
      xpPill.textContent = `⭐ +${xp} XP`;
      xpPill.classList.remove('hidden');
    } else {
      xpPill.classList.add('hidden');
    }

    card.className = `app-modal-card variant-${variant}`;

    confirmBtn.textContent = confirmText;
    confirmBtn.onclick = () => {
      SFX.click();
      this.closeModal();
      if (onConfirm) onConfirm();
    };

    if (cancelText) {
      cancelBtn.textContent = cancelText;
      cancelBtn.classList.remove('hidden');
      cancelBtn.onclick = () => {
        SFX.click();
        this.closeModal();
        if (onCancel) onCancel();
      };
    } else {
      cancelBtn.classList.add('hidden');
      cancelBtn.onclick = null;
    }

    overlay.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('app-modal-overlay').classList.add('hidden');
  },

  // Interactive Companion Dialogue Helper
  setCompanion(text) {
    const el = document.getElementById('detective-companion');
    if (!el) return;
    el.classList.remove('hidden');
    const avatarEl = document.getElementById('companion-avatar-icon');
    const nameEl = document.getElementById('companion-name-label');
    const dialogueEl = document.getElementById('companion-dialogue');
    if (avatarEl) {
      if (this.state.player.charImg) {
        avatarEl.innerHTML = `<img src="${this.state.player.charImg}" alt="${this.state.player.charName}">`;
      } else {
        avatarEl.textContent = this.state.player.charIcon || '🔎';
      }
    }
    if (nameEl) nameEl.textContent = `${this.state.player.charName || 'Detektif'}:`;
    if (dialogueEl) dialogueEl.textContent = text;
  },

  // Floating XP Animation Helper
  showFloatingXP(amount, text = '') {
    const container = document.getElementById('floating-xp-container');
    if (!container) return;
    const pill = document.createElement('div');
    pill.className = 'floating-xp-pill';
    pill.innerHTML = `+${amount} XP ⭐ ${text ? `<span style="font-size:0.8rem;opacity:0.9;">${text}</span>` : ''}`;
    const x = window.innerWidth / 2 + (Math.random() - 0.5) * 80;
    const y = 130 + Math.random() * 40;
    pill.style.left = `${x}px`;
    pill.style.top = `${y}px`;
    container.appendChild(pill);
    setTimeout(() => pill.remove(), 1200);
  },

  // Combo / Streak Tracker
  triggerCombo(bonusXP = 5) {
    const banner = document.getElementById('combo-banner');
    if (!banner) return;
    banner.classList.remove('hidden');
    const textEl = document.getElementById('combo-text');
    const bonusEl = document.getElementById('combo-bonus');
    if (textEl) textEl.textContent = `COMBO ${this.state.streak}x! 🔥`;
    if (bonusEl) bonusEl.textContent = `+${bonusXP} XP Bonus`;
    
    banner.style.animation = 'none';
    banner.offsetHeight; // reflow
    banner.style.animation = 'comboPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    this.addXP(bonusXP);
    this.showFloatingXP(bonusXP, `Combo ${this.state.streak}x! 🔥`);
    SFX.combo(this.state.streak);
  },

  resetCombo() {
    this.state.streak = 0;
    const banner = document.getElementById('combo-banner');
    if (banner) banner.classList.add('hidden');
  },

  // Screen Shake FX
  screenShake() {
    const container = document.getElementById('game-container');
    if (container) {
      container.classList.remove('screen-shake');
      container.offsetHeight;
      container.classList.add('screen-shake');
      setTimeout(() => container.classList.remove('screen-shake'), 450);
    }
  },

  // Haptic feedback for mobile phones
  haptic(ms = 30) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  },

  // Boss Attack Visual FX
  damageBoss() {
    SFX.bossHit();
    this.screenShake();
    this.haptic(50);

    const bossAvatar = document.querySelector('.boss-avatar-box');
    if (bossAvatar) {
      bossAvatar.classList.remove('boss-hit-effect');
      bossAvatar.offsetHeight;
      bossAvatar.classList.add('boss-hit-effect');
      setTimeout(() => bossAvatar.classList.remove('boss-hit-effect'), 550);
    }

    const bossCard = document.querySelector('.boss-card');
    if (bossCard) {
      const dmg = document.createElement('div');
      dmg.className = 'boss-dmg-number';
      dmg.textContent = '💥 -10 HP!';
      bossCard.appendChild(dmg);
      setTimeout(() => dmg.remove(), 800);
    }
  },

  // Switch Scene Helper with Audio & Companion Guidance
  showScene(sceneId) {
    Narrator.stop();
    document.querySelectorAll('.game-scene').forEach(el => {
      el.classList.remove('active-scene');
      el.classList.add('hidden-scene');
    });
    const target = document.getElementById(sceneId);
    if (target) {
      target.classList.remove('hidden-scene');
      target.classList.add('active-scene');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Header visibility
    const header = document.getElementById('game-header');
    if (sceneId === 'view-cover') {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }

    // Contextual companion guidance per scene
    const hints = {
      'view-profile': 'Pilihlah avatar detektif yang paling mencerminkan karakter belajarmu!',
      'view-rules': 'Pelajari 7 aturan investigasi dan kumpulkan XP sebanyak mungkin!',
      'view-map': 'Peta petualangan siap dijelajahi! Masuki lokasi yang sudah terbuka.',
      'view-level1': 'Cermati teks arsip perpustakaan ini. Sentuh 5 kosakata kunci yang tersembunyi!',
      'view-level2': 'Gunakan kata-kata di sekitar kata target untuk menyimpulkan arti tersiratnya.',
      'view-level3': 'Pilah tiap kata ke gerbang yang tepat: Kata Umum, Kata Khusus, atau Makna Konotatif!',
      'view-level4': 'Rangkai kalimat logis (S-P-O-K) menggunakan kosakata pilihanmu!',
      'view-level5': 'Benteng Boss Final! Taklukkan 10 tantangan penalaran untuk gelar Master Detektif!',
      'view-result': 'Luar biasa! Seluruh misi investigasi telah kamu tuntaskan dengan gemilang!',
      'view-reflection': 'Renungkan kembali kosakata baru dan strategi belajarmu hari ini.',
      'view-leaderboard': 'Inilah jajaran detektif terbaik sekolah dengan perolehan XP tertinggi!'
    };
    if (hints[sceneId]) {
      this.setCompanion(hints[sceneId]);
    }
  },

  bindGlobalEvents() {
    // Nav buttons
    document.getElementById('btn-nav-home').addEventListener('click', () => {
      SFX.click();
      SFX.whoosh();
      this.showScene('view-cover');
    });

    document.getElementById('btn-nav-map').addEventListener('click', () => {
      SFX.click();
      SFX.whoosh();
      this.showScene('view-map');
    });

    document.getElementById('btn-nav-leaderboard').addEventListener('click', () => {
      SFX.click();
      SFX.whoosh();
      this.showScene('view-leaderboard');
      this.renderLeaderboard();
    });

    document.getElementById('btn-lb-back-map').addEventListener('click', () => {
      SFX.click();
      SFX.whoosh();
      this.showScene('view-map');
    });

    document.getElementById('btn-lb-refresh').addEventListener('click', () => {
      SFX.click();
      this.renderLeaderboard();
    });

    document.getElementById('lb-class-filter').addEventListener('change', () => {
      this.renderLeaderboardList();
    });

    // Sound toggle (SFX + human voice narrator share this single switch to
    // keep the mobile header compact - see style.css header overflow notes)
    document.getElementById('btn-sound-toggle').addEventListener('click', (e) => {
      SFX.soundEnabled = !SFX.soundEnabled;
      Narrator.setEnabled(SFX.soundEnabled);
      e.currentTarget.textContent = SFX.soundEnabled ? '🔊' : '🔇';
      e.currentTarget.title = SFX.soundEnabled ? 'Matikan Suara & Narator' : 'Nyalakan Suara & Narator';
      if (SFX.soundEnabled) SFX.click();
    });

    // Music toggle (BGM)
    const musicBtn = document.getElementById('btn-music-toggle');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        const active = SFX.toggleMusic();
        musicBtn.classList.toggle('active-music', active);
        musicBtn.textContent = active ? '🎶' : '🎵';
        musicBtn.title = active ? 'Matikan Musik' : 'Putar Musik Petualangan';
      });
    }

    // Scene 1: Cover -> Profile (Auto-starts ambient BGM smoothly)
    document.getElementById('btn-start-game').addEventListener('click', () => {
      SFX.click();
      SFX.whoosh();
      if (!SFX.musicEnabled) {
        SFX.startMusic();
        if (musicBtn) {
          musicBtn.classList.add('active-music');
          musicBtn.textContent = '🎶';
        }
      }
      this.showScene('view-profile');
    });

    // Character Options Selection
    document.querySelectorAll('.char-option').forEach(el => {
      el.addEventListener('click', (e) => {
        SFX.click();
        this.haptic(20);
        document.querySelectorAll('.char-option').forEach(c => c.classList.remove('selected'));
        const target = e.currentTarget;
        target.classList.add('selected');
        this.state.player.charId = target.dataset.char;
        this.state.player.charName = target.dataset.charName;
        this.state.player.charIcon = target.dataset.icon;
        this.state.player.charImg = target.dataset.img || 'assets/char_reader.jpg';
        this.updateHeaderAvatar();
        this.setCompanion(`Pilihan cerdas! Bersama ${this.state.player.charName}, kita siap menaklukkan tantangan!`);
      });
    });

    // Scene 2: Profile Save -> Rules
    document.getElementById('btn-save-profile').addEventListener('click', () => {
      const nameInput = document.getElementById('input-player-name').value.trim();
      const classInput = document.getElementById('input-player-class').value.trim();
      const groupInput = document.getElementById('input-player-group').value.trim();

      if (!nameInput) {
        SFX.wrong();
        this.screenShake();
        this.showModal({
          icon: '🕵️',
          title: 'Nama Detektif Diperlukan',
          message: 'Mohon masukkan nama detektifmu terlebih dahulu sebelum melanjutkan penyelidikan.',
          variant: 'warn',
          confirmText: 'Mengerti',
          onConfirm: () => document.getElementById('input-player-name').focus()
        });
        return;
      }

      if (!classInput) {
        SFX.wrong();
        this.screenShake();
        this.showModal({
          icon: '🏫',
          title: 'Kelas Diperlukan',
          message: 'Mohon isi kelasmu (contoh: IX-A) terlebih dahulu sebelum melanjutkan penyelidikan.',
          variant: 'warn',
          confirmText: 'Mengerti',
          onConfirm: () => document.getElementById('input-player-class').focus()
        });
        return;
      }

      this.state.player.name = nameInput;
      this.state.player.class = classInput;
      this.state.player.group = groupInput;

      document.getElementById('header-player-name').textContent = this.state.player.name;
      this.updateHeaderAvatar();

      SFX.click();
      SFX.whoosh();
      this.showScene('view-rules');
    });

    // Scene 3: Rules -> Map
    document.getElementById('btn-open-map').addEventListener('click', () => {
      SFX.click();
      SFX.whoosh();
      this.updateMapUI();
      this.showScene('view-map');
    });

    // Level 1: Word Hunt
    document.querySelectorAll('.clickable-word').forEach(el => {
      el.addEventListener('click', (e) => {
        const word = e.currentTarget.dataset.word;
        this.handleLevel1WordClick(word, e.currentTarget);
      });
    });

    document.getElementById('btn-submit-l1').addEventListener('click', () => {
      this.completeLevel1();
    });

    // Level 1: "Listen to the story" - human voice narration of the reading text
    const narrateBtn = document.getElementById('btn-l1-narrate');
    if (narrateBtn) {
      narrateBtn.addEventListener('click', () => {
        SFX.click();
        if (!Narrator.supported) {
          this.showModal({
            icon: '🔇',
            title: 'Narator Tidak Tersedia',
            message: 'Maaf, perangkat atau peramban ini belum mendukung fitur narator suara.',
            variant: 'info',
            confirmText: 'Oke'
          });
          return;
        }
        const storyText = document.getElementById('l1-story-text').innerText;
        const resetBtn = () => {
          narrateBtn.classList.remove('narrating');
          narrateBtn.textContent = '🔊 Dengarkan Cerita';
        };
        narrateBtn.classList.add('narrating');
        narrateBtn.textContent = '🔈 Sedang Membacakan...';
        Narrator.speak(storyText, { rate: 0.95, onEnd: resetBtn });
      });
    }

    // Level 2: Next button
    document.getElementById('btn-l2-next').addEventListener('click', () => {
      this.advanceLevel2();
    });

    // Level 4: Word selection chips
    document.querySelectorAll('#l4-word-pickers .chip-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleLevel4WordPick(e.currentTarget);
      });
    });

    document.getElementById('btn-submit-l4').addEventListener('click', () => {
      this.completeLevel4();
    });

    // Level 5: Boss next button
    document.getElementById('btn-boss-next').addEventListener('click', () => {
      this.advanceLevel5();
    });

    // Results & Reflection
    document.getElementById('btn-go-reflection').addEventListener('click', () => {
      SFX.click();
      SFX.whoosh();
      this.showScene('view-reflection');
    });

    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.showModal({
        icon: '🔄',
        title: 'Mulai Petualangan Baru?',
        message: 'Seluruh XP, lencana, dan progres pada sesi ini akan direset dari awal.',
        variant: 'confirm',
        confirmText: 'Ya, Mulai Baru',
        cancelText: 'Batal',
        onConfirm: () => location.reload()
      });
    });

    document.getElementById('btn-save-reflection').addEventListener('click', () => {
      SFX.fanfare();
      if (this.particles) this.particles.burst();
      if (this.state.cloudScoreDocId) {
        attachReflection(this.state.cloudScoreDocId, {
          q1: document.getElementById('ref-q1').value,
          q2: document.getElementById('ref-q2').value,
          favoriteLevel: document.querySelector('input[name="ref-favorite"]:checked')?.value,
          sentiment: document.querySelector('input[name="ref-sentiment"]:checked')?.value
        });
      }
      this.showModal({
        icon: '🎉',
        eyebrow: 'Refleksi Tersimpan',
        title: 'Kerja Bagus, Detektif!',
        message: 'Selamat, kamu telah menyelesaikan seluruh petualangan detektif kosakata!',
        variant: 'reward',
        confirmText: 'Lihat Sertifikat ➔',
        onConfirm: () => this.showScene('view-result')
      });
    });
  },

  addXP(amount) {
    this.state.xp += amount;
    this.updateUI();
  },

  updateUI() {
    // Header XP
    document.getElementById('header-xp-value').textContent = this.state.xp;

    // Rank title calculation
    let rank = 'Penjelajah Pemula';
    if (this.state.xp >= 200) rank = '👑 MASTER DETEKTIF KOSAKATA';
    else if (this.state.xp >= 150) rank = '💎 Detektif Ahli';
    else if (this.state.xp >= 100) rank = '🥇 Detektif Kosakata';
    else if (this.state.xp >= 50) rank = '🥈 Pemburu Kosakata';

    document.getElementById('map-rank-title').textContent = rank;
    
    // Map XP Progress
    const percent = Math.min(100, Math.round((this.state.xp / 250) * 100));
    document.getElementById('map-xp-progress-bar').style.width = percent + '%';
    document.getElementById('map-progress-text').textContent = `${this.state.xp} / 250 XP Menuju Master`;
  },

  updateMapUI() {
    this.updateUI();
    for (let i = 1; i <= 5; i++) {
      const card = document.getElementById(`level-card-${i}`);
      const btn = card.querySelector('.btn-enter-level');
      if (this.state.unlockedLevels.includes(i)) {
        card.classList.remove('locked');
        card.classList.add('unlocked');
        btn.disabled = false;
        btn.textContent = 'MASUK ➔';
      } else {
        card.classList.add('locked');
        card.classList.remove('unlocked');
        btn.disabled = true;
        btn.textContent = 'TERKUNCI 🔒';
      }
    }
  },

  startLevel(lvlNum) {
    SFX.click();
    if (lvlNum === 1) {
      this.showScene('view-level1');
    } else if (lvlNum === 2) {
      this.initLevel2();
      this.showScene('view-level2');
    } else if (lvlNum === 3) {
      this.initLevel3();
      this.showScene('view-level3');
    } else if (lvlNum === 4) {
      this.initLevel4();
      this.showScene('view-level4');
    } else if (lvlNum === 5) {
      this.initLevel5();
      this.showScene('view-level5');
    }
  },

  // ================= LEVEL 1 LOGIC =================
  handleLevel1WordClick(word, element) {
    if (!this.state.level1Collected.includes(word)) {
      this.state.level1Collected.push(word);
      element.classList.add('collected');
      
      SFX.wordPick(this.state.level1Collected.length);
      this.showFloatingXP(10);
      this.haptic(25);
      if (this.particles) {
        this.particles.burst(window.innerWidth / 2, 280, 25);
      }

      // Update notebook chips
      const chipsBox = document.getElementById('l1-word-chips');
      if (this.state.level1Collected.length === 1) {
        chipsBox.innerHTML = '';
      }
      const chip = document.createElement('div');
      chip.className = 'word-chip';
      chip.textContent = `🔍 ${word}`;
      chipsBox.appendChild(chip);

      document.getElementById('l1-collected-count').textContent = this.state.level1Collected.length;
      document.getElementById('l1-xp-counter').textContent = `+${this.state.level1Collected.length * 10} XP`;

      this.setCompanion(`Bagus! Kata "${word}" berhasil kamu temukan dan dicatat di Buku Detektif.`);

      if (this.state.level1Collected.length >= 5) {
        document.getElementById('btn-submit-l1').disabled = false;
        this.setCompanion("Semua 5 kosakata terkumpul! Klik tombol di bawah untuk klaim XP dan buka Level 2!");
      }
    }
  },

  completeLevel1() {
    this.addXP(50 + 20); // 50 word xp + 20 level completion
    this.state.unlockedLevels.push(2);
    this.state.badges.push('badge-1');
    SFX.levelUnlock();
    setTimeout(() => SFX.badgeUnlock(), 260);
    if (this.particles) {
      this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, 80);
    }
    this.setCompanion("Selamat! Kamu berhasil meraih Lencana 🔎 Mata Elang Kata!");
    this.showModal({
      icon: '🔎',
      eyebrow: 'Level 1 Tuntas',
      title: 'Lencana Mata Elang Kata!',
      message: 'Kamu berhasil menemukan seluruh kosakata kunci dalam cerita.',
      xp: 70,
      variant: 'reward',
      confirmText: 'Lanjut ke Peta ➔',
      onConfirm: () => {
        this.updateMapUI();
        this.showScene('view-map');
      }
    });
  },

  // ================= LEVEL 2 LOGIC =================
  initLevel2() {
    this.state.level2Index = 0;
    this.state.level2Score = 0;
    this.state.level2Questions = this.buildShuffledQuestions(this.level2Data);
    this.resetCombo();
    this.renderLevel2Question();
  },

  renderLevel2Question() {
    const data = this.state.level2Questions[this.state.level2Index];
    document.getElementById('l2-step-indicator').textContent = `Tantangan ${this.state.level2Index + 1} / 5`;
    document.getElementById('l2-context-sentence').innerHTML = `"${data.context}"`;
    document.getElementById('l2-question-title').innerHTML = data.question;

    const optContainer = document.getElementById('l2-options-container');
    optContainer.innerHTML = '';

    const feedbackBox = document.getElementById('l2-feedback-box');
    feedbackBox.classList.add('hidden');

    const prefixes = ['A', 'B', 'C'];
    data.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="opt-prefix">${prefixes[idx]}</span> <span>${opt.text}</span>`;
      btn.addEventListener('click', () => {
        this.handleLevel2Answer(opt, btn);
      });
      optContainer.appendChild(btn);
    });
  },

  handleLevel2Answer(opt, selectedBtn) {
    const feedbackBox = document.getElementById('l2-feedback-box');
    const feedbackTitle = document.getElementById('l2-feedback-title');
    const feedbackText = document.getElementById('l2-feedback-text');
    const feedbackIcon = document.getElementById('l2-feedback-icon');
    const nextBtn = document.getElementById('btn-l2-next');

    // Disable all options
    document.querySelectorAll('#l2-options-container .option-btn').forEach(b => b.disabled = true);

    if (opt.isCorrect) {
      selectedBtn.classList.add('correct');
      feedbackBox.classList.remove('hidden', 'error-style');
      feedbackIcon.textContent = '🎉';
      feedbackTitle.textContent = 'HEBAT! Detektif Berhasil!';
      feedbackText.textContent = this.state.level2Questions[this.state.level2Index].explanation;
      nextBtn.textContent = (this.state.level2Index === 4) ? 'KLAIM XP & BUKA LEVEL 3 ➔' : 'TANTANGAN BERIKUTNYA ➔';
      Narrator.speak(feedbackText.textContent);

      this.state.level2Score += 10;
      this.state.streak++;
      this.haptic(30);

      if (this.state.streak >= 2) {
        this.triggerCombo(5);
      } else {
        SFX.correct();
        this.showFloatingXP(10);
      }

      if (this.particles) {
        this.particles.burst(window.innerWidth / 2, 320, 35);
      }
      this.setCompanion("Analisis jitu! Kamu berhasil memanfaatkan petunjuk kata di sekitarnya.");
    } else {
      selectedBtn.classList.add('incorrect');
      feedbackBox.classList.remove('hidden');
      feedbackBox.classList.add('error-style');
      feedbackIcon.textContent = '🔍';
      feedbackTitle.textContent = 'BELUM TEPAT! Coba cermati lagi.';
      feedbackText.textContent = 'Baca kembali kata-kata di sekitar kata target. Kamu dapat mencoba lagi!';
      nextBtn.textContent = 'COBA LAGI 🔄';
      Narrator.speak(feedbackText.textContent);

      this.resetCombo();
      SFX.wrong();
      this.screenShake();
      this.haptic(50);
      this.setCompanion("Tenang, jangan patah semangat! Baca kembali kalimatnya secara perlahan.");
    }
  },

  advanceLevel2() {
    const nextBtn = document.getElementById('btn-l2-next');
    if (nextBtn.textContent.includes('COBA LAGI')) {
      // Retry same question
      this.renderLevel2Question();
    } else {
      this.state.level2Index++;
      if (this.state.level2Index < this.state.level2Questions.length) {
        this.renderLevel2Question();
      } else {
        // Level 2 completed
        this.addXP(20); // Level bonus
        this.state.unlockedLevels.push(3);
        this.state.badges.push('badge-2');
        SFX.levelUnlock();
        setTimeout(() => SFX.badgeUnlock(), 260);
        if (this.particles) {
          this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, 80);
        }
        this.setCompanion("Luar biasa! Labirin Makna berhasil kamu lalui, lencana Pemburu Makna diraih!");
        this.showModal({
          icon: '📖',
          eyebrow: 'Level 2 Tuntas',
          title: 'Lencana Pemburu Makna!',
          message: 'Kamu berhasil memecahkan seluruh petunjuk konteks kalimat.',
          xp: 20,
          variant: 'reward',
          confirmText: 'Lanjut ke Peta ➔',
          onConfirm: () => {
            this.updateMapUI();
            this.showScene('view-map');
          }
        });
      }
    }
  },

  // ================= LEVEL 3 LOGIC (GATES) =================
  initLevel3() {
    this.state.level3Pool = this.shuffleArray(this.level3Data);
    this.state.level3SelectedWord = null;
    this.state.level3Sorted = { umum: [], khusus: [], konotatif: [] };
    
    document.getElementById('gate-list-umum').innerHTML = '';
    document.getElementById('gate-list-khusus').innerHTML = '';
    document.getElementById('gate-list-konotatif').innerHTML = '';
    document.getElementById('l3-feedback').classList.add('hidden');
    
    this.renderLevel3Pool();

    document.getElementById('btn-submit-l3').onclick = () => {
      this.completeLevel3();
    };
  },

  renderLevel3Pool() {
    const poolEl = document.getElementById('l3-cards-pool');
    poolEl.innerHTML = '';
    document.getElementById('l3-remaining-count').textContent = this.state.level3Pool.length;

    this.state.level3Pool.forEach(item => {
      const card = document.createElement('button');
      card.className = 'word-sort-card';
      if (this.state.level3SelectedWord && this.state.level3SelectedWord.word === item.word) {
        card.classList.add('active-selected');
      }
      card.textContent = item.word;
      card.addEventListener('click', () => {
        SFX.click();
        this.state.level3SelectedWord = item;
        this.renderLevel3Pool();
      });
      poolEl.appendChild(card);
    });
  },

  handleGateSelect(gateType) {
    if (!this.state.level3SelectedWord) {
      SFX.click();
      this.showModal({
        icon: '🃏',
        title: 'Pilih Kartu Dulu',
        message: 'Sentuh salah satu kartu kata di atas terlebih dahulu sebelum memilih gerbang.',
        variant: 'warn',
        confirmText: 'Mengerti'
      });
      return;
    }

    const item = this.state.level3SelectedWord;
    if (item.gate === gateType) {
      // Correct placement
      SFX.correct();
      this.showFloatingXP(5);
      this.haptic(25);
      this.state.level3Sorted[gateType].push(item);
      this.state.level3Pool = this.state.level3Pool.filter(w => w.word !== item.word);
      this.state.level3SelectedWord = null;

      // Add tag to gate
      const gateList = document.getElementById(`gate-list-${gateType}`);
      const tag = document.createElement('span');
      tag.className = 'sorted-word-tag';
      tag.textContent = `✓ ${item.word}`;
      gateList.appendChild(tag);

      this.addXP(5);
      this.renderLevel3Pool();
      this.setCompanion(`Benar sekali! Kata "${item.word}" terbukti masuk ke Gerbang ${gateType.toUpperCase()}!`);

      if (this.state.level3Pool.length === 0) {
        // All sorted!
        SFX.levelUnlock();
        if (this.particles) {
          this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, 80);
        }
        const fb = document.getElementById('l3-feedback');
        fb.classList.remove('hidden');
        document.getElementById('l3-feedback-text').textContent = 'Hebat! Semua kata berhasil ditempatkan pada gerbang yang tepat sesuai kategori semantiknya!';
        this.setCompanion("Pekerjaan sempurna! Seluruh gerbang kosakata telah terbuka.");
      }
    } else {
      SFX.wrong();
      this.screenShake();
      this.haptic(50);
      this.showModal({
        icon: '🔍',
        title: 'Belum Tepat',
        message: `Kata "${item.word}" bukan termasuk dalam Gerbang ${gateType.toUpperCase()}. Coba pelajari cakupan maknanya kembali.`,
        variant: 'warn',
        confirmText: 'Coba Lagi'
      });
    }
  },

  completeLevel3() {
    this.addXP(20); // Level bonus
    this.state.unlockedLevels.push(4);
    this.state.badges.push('badge-3');
    SFX.levelUnlock();
    setTimeout(() => SFX.badgeUnlock(), 260);
    if (this.particles) {
      this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, 80);
    }
    this.showModal({
      icon: '🧠',
      eyebrow: 'Level 3 Tuntas',
      title: 'Lencana Ahli Konteks!',
      message: 'Kamu berhasil memilah seluruh kata ke gerbang yang tepat.',
      xp: 20,
      variant: 'reward',
      confirmText: 'Lanjut ke Peta ➔',
      onConfirm: () => {
        this.updateMapUI();
        this.showScene('view-map');
      }
    });
  },

  // ================= LEVEL 4 LOGIC (BENGKEL KALIMAT) =================
  initLevel4() {
    this.state.level4SelectedWords = [];
    document.querySelectorAll('#l4-word-pickers .chip-select-btn').forEach(btn => btn.classList.remove('picked'));
    this.renderLevel4Inputs();
  },

  handleLevel4WordPick(btn) {
    SFX.click();
    this.haptic(20);
    const word = btn.dataset.word;
    if (this.state.level4SelectedWords.includes(word)) {
      this.state.level4SelectedWords = this.state.level4SelectedWords.filter(w => w !== word);
      btn.classList.remove('picked');
    } else {
      if (this.state.level4SelectedWords.length >= 3) {
        this.showModal({
          icon: '✋',
          title: 'Maksimal 3 Kata',
          message: 'Kamu hanya boleh memilih 3 kata untuk Bengkel Kalimat. Batalkan satu pilihan dulu untuk mengganti.',
          variant: 'warn',
          confirmText: 'Mengerti'
        });
        return;
      }
      this.state.level4SelectedWords.push(word);
      btn.classList.add('picked');
    }

    this.renderLevel4Inputs();
  },

  renderLevel4Inputs() {
    const container = document.getElementById('l4-sentence-inputs');
    const submitBtn = document.getElementById('btn-submit-l4');

    if (this.state.level4SelectedWords.length < 3) {
      container.innerHTML = `<div class="workshop-hint">💡 <em>Pilihlah ${3 - this.state.level4SelectedWords.length} kata lagi di atas untuk membuka lembar penulisan kalimat.</em></div>`;
      submitBtn.disabled = true;
      return;
    }

    container.innerHTML = '';
    this.state.level4SelectedWords.forEach((word, idx) => {
      const row = document.createElement('div');
      row.className = 'sentence-item-row';
      row.innerHTML = `
        <div class="sentence-word-header">Kalimat ${idx + 1}: Menggunakan Kata "<strong>${word}</strong>"</div>
        <textarea class="sentence-textarea" id="l4-input-${idx}" placeholder="Tuliskan kalimat logis menggunakan kata '${word}' di sini (minimal 5 kata)..."></textarea>
      `;
      container.appendChild(row);
    });

    submitBtn.disabled = false;
    this.setCompanion("Susun kalimat orisinal yang logis dengan pola S-P-O-K ya!");
  },

  completeLevel4() {
    // Validate inputs
    let allValid = true;
    this.state.level4SelectedWords.forEach((word, idx) => {
      const val = document.getElementById(`l4-input-${idx}`).value.trim();
      if (val.split(/\s+/).length < 4) {
        allValid = false;
      }
    });

    if (!allValid) {
      SFX.wrong();
      this.screenShake();
      this.showModal({
        icon: '✍️',
        title: 'Kalimat Belum Lengkap',
        message: 'Mohon buat kalimat yang lengkap (minimal 4-5 kata) untuk setiap kata yang dipilih.',
        variant: 'warn',
        confirmText: 'Perbaiki Kalimat'
      });
      return;
    }

    this.addXP(40); // 30 kalimat + 10 level bonus
    this.state.unlockedLevels.push(5);
    this.state.badges.push('badge-4');
    SFX.levelUnlock();
    setTimeout(() => SFX.badgeUnlock(), 260);
    if (this.particles) {
      this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, 90);
    }
    this.setCompanion("Kalimatmu sangat kreatif! Benteng Boss Final kini telah dibuka!");
    this.showModal({
      icon: '✍️',
      eyebrow: 'Level 4 Tuntas',
      title: 'Lencana Perakit Kalimat!',
      message: 'Dewan Detektif meloloskan kalimatmu. Benteng Boss Final kini terbuka!',
      xp: 40,
      variant: 'reward',
      confirmText: '⚔️ Hadapi Boss Final ➔',
      onConfirm: () => {
        this.updateMapUI();
        this.showScene('view-map');
      }
    });
  },

  // ================= LEVEL 5 LOGIC (BOSS FINAL) =================
  initLevel5() {
    this.state.level5Index = 0;
    this.state.level5Score = 0;
    this.state.level5Questions = this.buildShuffledQuestions(this.level5Data);
    this.resetCombo();
    this.renderLevel5Question();
  },

  renderLevel5Question() {
    const data = this.state.level5Questions[this.state.level5Index];
    document.getElementById('boss-progress-pill').textContent = `Soal ${this.state.level5Index + 1} / 10`;
    document.getElementById('boss-competency-tag').textContent = data.tag;
    document.getElementById('boss-question-text').innerHTML = data.q;

    // HP Bar
    const hpPercent = Math.max(0, Math.round(((10 - this.state.level5Index) / 10) * 100));
    document.getElementById('boss-hp-fill').style.width = hpPercent + '%';
    document.getElementById('boss-hp-label').textContent = `${hpPercent}% Boss HP`;

    const optContainer = document.getElementById('boss-options-wrapper');
    optContainer.innerHTML = '';

    const feedbackBox = document.getElementById('boss-feedback-box');
    feedbackBox.classList.add('hidden');

    const prefixes = ['A', 'B', 'C'];
    data.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="opt-prefix">${prefixes[idx]}</span> <span>${opt.text}</span>`;
      btn.addEventListener('click', () => {
        this.handleLevel5Answer(opt, btn);
      });
      optContainer.appendChild(btn);
    });
  },

  handleLevel5Answer(opt, selectedBtn) {
    const feedbackBox = document.getElementById('boss-feedback-box');
    const feedbackTitle = document.getElementById('boss-feedback-title');
    const feedbackText = document.getElementById('boss-feedback-text');
    const nextBtn = document.getElementById('btn-boss-next');

    document.querySelectorAll('#boss-options-wrapper .option-btn').forEach(b => b.disabled = true);

    if (opt.isCorrect) {
      selectedBtn.classList.add('correct');
      feedbackBox.classList.remove('hidden', 'error-style');
      feedbackTitle.textContent = '🏆 SERANGAN TEPAT SASARAN!';
      feedbackText.textContent = this.state.level5Questions[this.state.level5Index].exp;
      Narrator.speak(feedbackText.textContent);

      this.state.level5Score += 10;
      this.state.streak++;
      this.damageBoss();

      if (this.state.streak >= 2) {
        this.triggerCombo(5);
      } else {
        this.showFloatingXP(10, 'Serangan Kritis!');
      }

      if (this.particles) {
        this.particles.burst(window.innerWidth / 2, 220, 45);
      }
      this.setCompanion("SERANGAN TELAK! Pertahanan Boss melemah, teruskan!");
    } else {
      selectedBtn.classList.add('incorrect');
      feedbackBox.classList.remove('hidden');
      feedbackBox.classList.add('error-style');
      feedbackTitle.textContent = '🛡️ SERANGAN TERTANGKIS!';
      feedbackText.textContent = `Jawaban tepat: ${this.state.level5Questions[this.state.level5Index].exp}`;
      Narrator.speak(feedbackText.textContent);

      this.resetCombo();
      SFX.wrong();
      this.screenShake();
      this.haptic(50);
      this.setCompanion("Waspada! Seranganmu tertangkis, pelajari pembahasannya!");
    }

    nextBtn.textContent = (this.state.level5Index === 9) ? '👑 KLAIM KEMENANGAN AKHIR ➔' : 'TANTANGAN BERIKUTNYA ➔';
  },

  advanceLevel5() {
    this.state.level5Index++;
    if (this.state.level5Index < this.state.level5Questions.length) {
      this.renderLevel5Question();
    } else {
      // Boss defeated!
      this.addXP(50); // Boss bonus
      this.state.badges.push('badge-5');
      SFX.fanfare();
      if (this.particles) {
        this.particles.burst(window.innerWidth / 2, window.innerHeight / 2, 120);
      }
      this.setCompanion("VICTORY MUTLAK! Gelar Master Detektif resmi kamu raih!");
      this.showFinalResults();
    }
  },

  showFinalResults() {
    this.showScene('view-result');
    if (this.particles) {
      this.particles.burst(window.innerWidth / 2, 250, 100);
    }
    const certAvatar = document.getElementById('cert-avatar');
    if (certAvatar) {
      if (this.state.player.charImg) {
        certAvatar.innerHTML = `<img src="${this.state.player.charImg}" alt="${this.state.player.charName}">`;
      } else {
        certAvatar.textContent = this.state.player.charIcon || '🔎';
      }
    }
    document.getElementById('cert-player-name').textContent = this.state.player.name;
    document.getElementById('cert-class-group').textContent = `Kelas ${this.state.player.class} ${this.state.player.group ? '• ' + this.state.player.group : ''}`;
    document.getElementById('cert-total-xp').textContent = `${this.state.xp} XP`;

    let finalRank = 'MASTER DETEKTIF KOSAKATA';
    if (this.state.xp < 150) finalRank = 'DETEKTIF KOSAKATA';
    document.getElementById('cert-rank-title').textContent = finalRank;

    // Badges active
    ['badge-1', 'badge-2', 'badge-3', 'badge-4', 'badge-5'].forEach(bId => {
      const el = document.getElementById(bId);
      if (el) el.classList.add('unlocked');
    });

    Narrator.speak(`Selamat, ${this.state.player.name}! Kamu berhasil menyelesaikan seluruh investigasi dengan gelar ${finalRank}, dan meraih ${this.state.xp} XP.`);
    this.submitScoreToCloud(finalRank);
  },

  async submitScoreToCloud(rankTitle) {
    const docId = await submitScore({
      name: this.state.player.name,
      class: this.state.player.class,
      group: this.state.player.group,
      charId: this.state.player.charId,
      charName: this.state.player.charName,
      charIcon: this.state.player.charIcon,
      charImg: this.state.player.charImg,
      xp: this.state.xp,
      rankTitle,
      badges: this.state.badges,
      level1Collected: this.state.level1Collected,
      level2Score: this.state.level2Score,
      level5Score: this.state.level5Score
    });
    this.state.cloudScoreDocId = docId;
  },

  async renderLeaderboard() {
    const statusEl = document.getElementById('lb-status-message');
    const listEl = document.getElementById('lb-list');
    statusEl.classList.remove('hidden');
    statusEl.textContent = 'Memuat papan peringkat...';
    listEl.innerHTML = '';

    const scores = await fetchTopScores(20);
    this._leaderboardData = scores;

    if (scores.length === 0) {
      statusEl.textContent = 'Belum ada skor tersimpan di perangkat ini. Skor akan muncul di sini setelah ada yang menyelesaikan petualangan.';
      return;
    }

    statusEl.classList.add('hidden');

    // Populate class filter options
    const filterEl = document.getElementById('lb-class-filter');
    const currentFilter = filterEl.value;
    const classes = [...new Set(scores.map(s => s.class).filter(Boolean))].sort();
    filterEl.innerHTML = '<option value="">Semua Kelas</option>' +
      classes.map(c => `<option value="${c}">${c}</option>`).join('');
    filterEl.value = classes.includes(currentFilter) ? currentFilter : '';

    this.renderLeaderboardList();
  },

  renderLeaderboardList() {
    const listEl = document.getElementById('lb-list');
    const filterEl = document.getElementById('lb-class-filter');
    const filterClass = filterEl.value;
    const scores = (this._leaderboardData || [])
      .filter(s => !filterClass || s.class === filterClass);

    listEl.innerHTML = scores.map(s => `
      <li class="leaderboard-item">
        <span class="lb-rank-num">#${scores.indexOf(s) + 1}</span>
        <span class="lb-avatar">${s.charImg ? `<img src="${s.charImg}" alt="avatar" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;border:1px solid #38bdf8;">` : (s.charIcon || '🔎')}</span>
        <span class="lb-name">${s.name || 'Detektif'}</span>
        <span class="lb-class">${s.class || '-'}</span>
        <span class="lb-title">${s.rankTitle || ''}</span>
        <span class="lb-xp">${s.xp || 0} XP</span>
      </li>
    `).join('');

    if (scores.length === 0) {
      listEl.innerHTML = '<li class="leaderboard-empty">Tidak ada data untuk kelas ini.</li>';
    }
  }
};

// Expose GameApp globally so inline onclick="GameApp...." handlers in index.html
// (map level buttons, Level 3 gate buttons) can reach it — app.js runs as an ES
// module, so top-level declarations are NOT attached to window by default.
window.GameApp = GameApp;

// Initialize game on window load
window.addEventListener('DOMContentLoaded', () => {
  GameApp.init();
});
