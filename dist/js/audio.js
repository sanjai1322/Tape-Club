import * as THREE from 'three';
import { CASSETTE_THEMES } from './themes.js';
import { PLAYLISTS } from './playlists.js';
import {isPlayable} from './playlist-store.js';
import {YouTubePlayer} from './youtube-player.js';
export class AudioEngine extends EventTarget {
  constructor(store) {
    super();
    this.ctx=null; this.analyser=null; this.gainNode=null; this.sourceNode=null;
    this.audioEl=new Audio(); this.audioEl.preload='auto'; this.audioEl.crossOrigin='anonymous';
    this.freqData=new Uint8Array(32); this.volume=.7; this.trackUrls=new Map();
    this.store=store;this.playlists=store?.playlists||structuredClone(PLAYLISTS); this.indices={}; this.theme=null; this.generation=0; this.urls=new Set();
    this.youtube=new YouTubePlayer();this.sourceType='audio';
    for(const type of ['waiting','playing','pause','error','ended']){
      this.audioEl.addEventListener(type,()=>{if(this.sourceType!=='youtube')this.dispatchEvent(new Event(type));});
      this.youtube.addEventListener(type,()=>{if(this.sourceType==='youtube')this.dispatchEvent(new Event(type));});
    }
  }
  get media(){return this.sourceType==='youtube'?this.youtube:this.audioEl;}
  async ensureContext() {
    if(!this.ctx) {
      this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.analyser=this.ctx.createAnalyser(); this.analyser.fftSize=64; this.analyser.smoothingTimeConstant=.72;
      this.gainNode=this.ctx.createGain(); this.gainNode.gain.value=this.volume;
      this.sourceNode=this.ctx.createMediaElementSource(this.audioEl);
      this.sourceNode.connect(this.gainNode); this.gainNode.connect(this.analyser); this.analyser.connect(this.ctx.destination);
    }
    if(this.ctx.state==='suspended') await this.ctx.resume();
  }
  get list() { return this.playlists[this.theme]||[]; }
  get index() { return this.indices[this.theme]||0; }
  get track() { return this.list[this.index]; }
  async load(theme,index=this.indices[theme]||0) {
    this.pause(); this.theme=theme; this.indices[theme]=index; const token=++this.generation;
    const track=this.track; if(!isPlayable(track)) throw Error('Choose a playable track.');
    this.sourceType=track.sourceType;this.freqData.fill(0);
    if(track.sourceType==='youtube'){this.audioEl.removeAttribute('src');this.audioEl.load();return await this.youtube.load(track);}
    this.youtube.clear();
    const url=track.generated?this.getOrGenerateThemeWavUrl(track.generated):track.src;
    this.audioEl.src=url; this.audioEl.load();
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(Error('Audio took too long to load. Try another file.')),12000);
      const ready=()=>finish(); const fail=()=>finish(Error('This audio cannot be played. Try an MP3, WAV, or supported M4A file.'));
      const finish=(err)=>{clearTimeout(timer);this.audioEl.removeEventListener('loadedmetadata',ready);this.audioEl.removeEventListener('error',fail);err?reject(err):resolve();};
      this.audioEl.addEventListener('loadedmetadata',ready,{once:true});this.audioEl.addEventListener('error',fail,{once:true});
    });
    return token===this.generation;
  }
  async play() { if(this.sourceType==='youtube')return this.youtube.play(this.track);await this.ensureContext(); await this.audioEl.play(); }
  clear(theme){this.pause();this.youtube.clear();this.sourceType='audio';this.theme=theme;this.indices[theme]=-1;this.audioEl.removeAttribute('src');this.audioEl.load();}
  pause() { this.audioEl.pause();this.youtube.pause(); }
  seekNormalized(p) { const media=this.media;if(Number.isFinite(media.duration))media.currentTime=THREE.MathUtils.clamp(p,0,1)*media.duration; }
  getNormalizedProgress() { const media=this.media;return Number.isFinite(media.duration)&&media.duration>0?media.currentTime/media.duration:0; }
  setVolume(v) { this.volume=THREE.MathUtils.clamp(v,0,1);this.youtube.setVolume(this.volume); if(this.ctx)this.gainNode.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.02); }
  getLevelSegments(count=10,playing=false) {
    if(!playing||!this.analyser||this.sourceType==='youtube'){this.freqData.fill(0);return Array(count).fill(0);}
    this.analyser.getByteFrequencyData(this.freqData);
    return Array.from({length:count},(_,i)=>this.freqData[i+1]/255);
  }
  async addFiles(theme,files) {
    const added=[]; const errors=[];const start=this.playlists[theme].length;
    for(const file of files) {
      if(file.size>150*1024*1024){errors.push(`${file.name}: exceeds 150 MB`);continue;}
      if(!(file.type.startsWith('audio/')||/\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(file.name))){errors.push(`${file.name}: unsupported file`);continue;}
      const url=URL.createObjectURL(file); const probe=new Audio(); probe.preload='metadata'; probe.src=url;
      try {
        await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('timeout')),8000);probe.onloadedmetadata=()=>{clearTimeout(t);Number.isFinite(probe.duration)&&probe.duration>0?resolve():reject(Error('invalid'));};probe.onerror=()=>{clearTimeout(t);reject(Error('decode'));};});
        const data={title:file.name.replace(/\.[^.]+$/,''),artist:'Your local audio',src:url,sourceType:'local',attribution:'Your local audio · stored only in this browser',duration:probe.duration,local:true};
        const track=this.store?this.store.addTrackToCassette(theme,this.store.language(theme),data):data;
        if(this.store)await this.store.saveFile(track.id,file);else this.playlists[theme].push(track);
        this.urls.add(url);added.push(track);
      }catch{URL.revokeObjectURL(url);errors.push(`${file.name}: cannot decode audio`);}
      finally{probe.removeAttribute('src');probe.load();}
    }
    return {added:added.length,start,errors};
  }
  dispose() {this.pause();this.youtube.dispose();this.audioEl.removeAttribute('src');this.audioEl.load();[...this.urls,...this.trackUrls.values()].forEach(u=>URL.revokeObjectURL(u));this.ctx?.close();}
      getOrGenerateThemeWavUrl(themeKey = 'cosmic') {
        if (this.trackUrls.has(themeKey)) return this.trackUrls.get(themeKey);

        const theme = CASSETTE_THEMES[themeKey.split(':')[0]] || CASSETTE_THEMES.cosmic;
        const sampleRate = 22050;
        const durationSeconds = 32;
        const numSamples = sampleRate * durationSeconds;
        const numChannels = 2;
        const buffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
        const view = new DataView(buffer);

        function writeStr(offset, str) {
          for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
          }
        }

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * numChannels * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, numSamples * numChannels * 2, true);

        const notes = themeKey.includes(':') ? [...theme.notes.slice(3), ...theme.notes.slice(0,3)].map(n=>n*.75) : theme.notes;
        const stepDur = 60 / theme.bpm / 2;

        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          const stepIndex = Math.floor(t / stepDur);
          const stepTime = t - stepIndex * stepDur;
          const freq = notes[stepIndex % notes.length];
          const bassFreq = notes[Math.floor(stepIndex / 4) % 4] * 0.5;

          const env = Math.exp(-stepTime * 5.2);
          const padEnv = 0.55 + 0.45 * Math.sin(t * 1.5);

          // Arp lead + warm analog bass + stereo chorus + subtle tape noise
          const arpL = Math.sin(2 * Math.PI * freq * t + Math.sin(2 * Math.PI * freq * 2 * t) * 0.35) * env * 0.28;
          const arpR = Math.sin(2 * Math.PI * (freq * 1.003) * t + 0.4) * env * 0.28;

          const bass = Math.tanh(Math.sin(2 * Math.PI * bassFreq * t) * 2.2) * 0.24;
          const padL = Math.sin(2 * Math.PI * (freq * 0.5) * t) * padEnv * 0.14;
          const padR = Math.cos(2 * Math.PI * (freq * 0.502) * t) * padEnv * 0.14;

          // Kick pulse on quarter beats
          const beatTime = t % (stepDur * 2);
          const kickFreq = 52 + 110 * Math.exp(-beatTime * 28);
          const kick = Math.sin(2 * Math.PI * kickFreq * beatTime) * Math.exp(-beatTime * 10) * 0.26;

          const tapeHiss = (Math.random() - 0.5) * 0.012;

          const sampleL = Math.max(-0.98, Math.min(0.98, arpL + bass + padL + kick + tapeHiss));
          const sampleR = Math.max(-0.98, Math.min(0.98, arpR + bass + padR + kick + tapeHiss));

          view.setInt16(offset, sampleL * 32767, true);
          view.setInt16(offset + 2, sampleR * 32767, true);
          offset += 4;
        }

        const blob = new Blob([buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        this.trackUrls.set(themeKey, url);
        return url;
      }

      playMechanicalClick(pitch = 180, duration = 0.045) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + duration);
        g.gain.setValueAtTime(0.18 * this.volume, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      }


}
