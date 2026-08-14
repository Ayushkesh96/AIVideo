/**
 * AIVIDEO CINEMA AUDIO SYNTHESIZER
 * Pure Web Audio API Generative Cinematic Soundscapes (Zero 3rd-Party APIs)
 * Generates Sub-bass pulses, cinematic risers, ambient pads, and cybernetic Foley
 */

class CinemaAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCinematicSoundscape(sceneType = 0, duration = 6) {
    this.init();
    if (!this.ctx) return null;

    const now = this.ctx.currentTime;

    // 1. Deep Sub-Bass Drone
    const oscSub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    oscSub.type = 'sine';
    
    // Frequency based on archetype
    let rootFreq = 55.0; // A1 (Cyber)
    if (sceneType === 1) rootFreq = 43.65; // F1 (Ocean)
    if (sceneType === 2) rootFreq = 65.41; // C2 (Space)
    if (sceneType === 3) rootFreq = 48.99; // G1 (Fantasy)

    oscSub.frequency.setValueAtTime(rootFreq, now);
    oscSub.frequency.exponentialRampToValueAtTime(rootFreq * 0.75, now + duration);

    subGain.gain.setValueAtTime(0.01, now);
    subGain.gain.linearRampToValueAtTime(0.4, now + 1.0);
    subGain.gain.linearRampToValueAtTime(0.01, now + duration);

    oscSub.connect(subGain);
    subGain.connect(this.masterGain);
    oscSub.start(now);
    oscSub.stop(now + duration);

    // 2. Harmonic Ambient Pad
    const oscPad = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();

    oscPad.type = 'sawtooth';
    oscPad.frequency.setValueAtTime(rootFreq * 2.0, now);
    oscPad.frequency.linearRampToValueAtTime(rootFreq * 2.25, now + duration);

    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(400, now);
    padFilter.frequency.exponentialRampToValueAtTime(1400, now + duration * 0.7);

    padGain.gain.setValueAtTime(0.01, now);
    padGain.gain.linearRampToValueAtTime(0.2, now + 1.5);
    padGain.gain.linearRampToValueAtTime(0.01, now + duration);

    oscPad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.masterGain);
    oscPad.start(now);
    oscPad.stop(now + duration);

    // 3. Noise Shimmer / Foley Wind
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(sceneType === 1 ? 600 : 1200, now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.15, now + duration * 0.5);
    noiseGain.gain.linearRampToValueAtTime(0.01, now + duration);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    whiteNoise.start(now);
    whiteNoise.stop(now + duration);

    // Return Audio Destination Stream for video muxing
    const dest = this.ctx.createMediaStreamDestination();
    this.masterGain.connect(dest);
    return dest.stream;
  }
}

window.CinemaAudioEngine = CinemaAudioEngine;
