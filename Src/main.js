import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { FilmShader } from 'three/addons/shaders/FilmShader.js';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const ROSTER = [
  { id:'azure', name:'AZURE', tagline:'Balanced', color:0x00eaff, css:'#00eaff',
    stats:{ hp:100, speed:6.0, jumpSpeed:9.0, meleeDamage:12, rangedDamage:8,
            attackCooldown:0.45, rangedCooldown:0.9, ultDamage:30 } },
  { id:'crimson', name:'CRIMSON', tagline:'Heavy Hitter', color:0xff2b6b, css:'#ff2b6b',
    stats:{ hp:130, speed:4.5, jumpSpeed:8.0, meleeDamage:18, rangedDamage:11,
            attackCooldown:0.65, rangedCooldown:1.2, ultDamage:40 } },
  { id:'volt', name:'VOLT', tagline:'Speedster', color:0xffe066, css:'#ffe066',
    stats:{ hp:80, speed:7.8, jumpSpeed:11.0, meleeDamage:8, rangedDamage:6,
            attackCooldown:0.30, rangedCooldown:0.6, ultDamage:22 } },
];

const CHAPTERS = [
  { id:1, title:'CHAPTER 1', subtitle:'ROOKIE CIRCUIT', opponentIdx:0, opponentName:'AZURE MK-I',
    difficulty:'easy', statMod:{hp:0.8,damage:0.85,speed:0.92},
    intro:[
      {who:'COMMANDER VEX',color:'#7df9ff',text:"Welcome to the Mech Arena, rookie. Time to see what you're made of."},
      {who:'COMMANDER VEX',color:'#7df9ff',text:"First opponent: AZURE MK-I. A training frame. Don't embarrass us."},
      {who:'YOU',color:'#ffe066',text:"Piece of cake."}
    ],
    outro:[{who:'COMMANDER VEX',color:'#7df9ff',text:"Not bad, kid. Maybe you belong here after all."}] },
  { id:2, title:'CHAPTER 2', subtitle:'STREET BRAWLER', opponentIdx:1, opponentName:'CRIMSON',
    difficulty:'easy', statMod:{hp:0.95,damage:0.95,speed:1.0},
    intro:[
      {who:'COMMANDER VEX',color:'#7df9ff',text:"Next up: CRIMSON. Ex-demolition mech. Hits like a freight train."},
      {who:'CRIMSON',color:'#ff2b6b',text:"Fresh meat. Let's see how long you last."}
    ],
    outro:[
      {who:'CRIMSON',color:'#ff2b6b',text:"Heh... not bad, kid."},
      {who:'COMMANDER VEX',color:'#7df9ff',text:"Two wins. The crowd is watching now."}
    ] },
  { id:3, title:'CHAPTER 3', subtitle:'VELOCITY', opponentIdx:2, opponentName:'VOLT',
    difficulty:'medium', statMod:{hp:1.0,damage:1.0,speed:1.0},
    intro:[
      {who:'VOLT',color:'#ffe066',text:"Too slow, too slow! You can't touch what you can't see!"},
      {who:'COMMANDER VEX',color:'#7df9ff',text:"VOLT is the fastest chassis in the league. Track him carefully."}
    ],
    outro:[
      {who:'VOLT',color:'#ffe066',text:"Impossible... how did you..."},
      {who:'COMMANDER VEX',color:'#7df9ff',text:"You're climbing faster than I expected."}
    ] },
  { id:4, title:'CHAPTER 4', subtitle:'ELITE GUARD', opponentIdx:0, opponentName:'AZURE PRIME',
    difficulty:'hard', statMod:{hp:1.2,damage:1.3,speed:1.1},
    intro:[
      {who:'COMMANDER VEX',color:'#7df9ff',text:"This is AZURE PRIME. My personal frame. My best pilot."},
      {who:'AZURE PRIME',color:'#00eaff',text:"You fight well. But you lack discipline."}
    ],
    outro:[
      {who:'AZURE PRIME',color:'#00eaff',text:"...You have surpassed me."},
      {who:'COMMANDER VEX',color:'#7df9ff',text:"One more fight. Then you face... him."}
    ] },
  { id:5, title:'FINAL CHAPTER', subtitle:'SHADOW', opponentIdx:1, opponentName:'SHADOW',
    difficulty:'hard', statMod:{hp:1.5,damage:1.6,speed:1.25}, isBoss:true,
    intro:[
      {who:'???',color:'#a050ff',text:"So you made it. Impressive."},
      {who:'SHADOW',color:'#a050ff',text:"I am what you could become. Let us see who is stronger."},
      {who:'COMMANDER VEX',color:'#7df9ff',text:"Be careful. SHADOW has never lost a match."}
    ],
    outro:[
      {who:'SHADOW',color:'#a050ff',text:"...You are the champion now."},
      {who:'COMMANDER VEX',color:'#7df9ff',text:"You did it. You are the MECH DUEL CHAMPION."},
      {who:'YOU',color:'#ffe066',text:"I know."}
    ] },
];

const COMBO_CHALLENGES = [
  { id:'c1', name:'BASIC PUNCH',     seq:['punch'],                        hint:'Land a single punch' },
  { id:'c2', name:'DOUBLE TAP',      seq:['punch','punch'],                hint:'Punch twice in a row' },
  { id:'c3', name:'LASER TAG',       seq:['ranged'],                       hint:'Land a laser shot' },
  { id:'c4', name:'LAUNCH + PUNCH',  seq:['launcher','punch'],             hint:'Launcher then juggle' },
  { id:'c5', name:'AIR JUGGLE 3x',   seq:['launcher','punch','punch','punch'], hint:'Launcher + 3 air punches' },
  { id:'c6', name:'OVERDRIVE',       seq:['ult'],                          hint:'Land ultimate hit' },
];

const SAVE_KEY = 'mechduel_story_progress';
const ARENA_MIN = -12, ARENA_MAX = 12;

/* ═══════════════════════════════════════════════════════════════
   AUDIO MANAGER
   ═══════════════════════════════════════════════════════════════ */
class AudioManager {
  constructor() { this.ctx = null; this.master = null; this.enabled = true; this.bgmTimer = null; this.bgmStep = 0; }
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    } catch(e) { this.enabled = false; }
  }
  _now() { return this.ctx.currentTime; }
  _tone({freq=220,type='sine',dur=0.15,vol=0.5,freqEnd=null,delay=0}) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this._now() + delay;
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(0.01, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0); gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master); osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  _noise({dur=0.15,vol=0.5,filterFreq=1200,delay=0}) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this._now() + delay;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass';
    filter.frequency.value = filterFreq; filter.Q.value = 0.7;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0); gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master); src.start(t0); src.stop(t0 + dur + 0.05);
  }
  punch() { this._tone({freq:180,freqEnd:90,type:'square',dur:0.08,vol:0.25}); this._noise({dur:0.06,vol:0.35,filterFreq:800}); }
  hit() { this._noise({dur:0.14,vol:0.6,filterFreq:1400}); this._tone({freq:120,freqEnd:60,type:'triangle',dur:0.14,vol:0.4}); this._tone({freq:400,freqEnd:200,type:'sine',dur:0.1,vol:0.2,delay:0.01}); }
  block() { this._tone({freq:900,freqEnd:1400,type:'triangle',dur:0.08,vol:0.25}); this._noise({dur:0.06,vol:0.25,filterFreq:3000}); }
  laser() { this._tone({freq:900,freqEnd:180,type:'sawtooth',dur:0.22,vol:0.3}); this._tone({freq:1600,freqEnd:400,type:'square',dur:0.2,vol:0.15,delay:0.01}); }
  whoosh() { this._noise({dur:0.18,vol:0.22,filterFreq:500}); }
  ko() { this._tone({freq:200,freqEnd:40,type:'sawtooth',dur:0.9,vol:0.6}); this._noise({dur:0.7,vol:0.7,filterFreq:500}); this._tone({freq:80,freqEnd:30,type:'sine',dur:1.1,vol:0.5,delay:0.05}); }
  emp() { this._tone({freq:120,freqEnd:2400,type:'sawtooth',dur:0.8,vol:0.4}); this._tone({freq:1800,freqEnd:60,type:'square',dur:0.6,vol:0.6,delay:0.8}); this._noise({dur:0.9,vol:0.8,filterFreq:900,delay:0.8}); this._tone({freq:60,freqEnd:25,type:'sine',dur:1.4,vol:0.7,delay:0.8}); }
  ultReady() { this._tone({freq:660,type:'sine',dur:0.14,vol:0.3}); this._tone({freq:880,type:'sine',dur:0.16,vol:0.3,delay:0.12}); }
  roundStart() { this._tone({freq:440,type:'sine',dur:0.18,vol:0.35}); this._tone({freq:660,type:'sine',dur:0.22,vol:0.35,delay:0.16}); }
  fight() { this._tone({freq:880,freqEnd:1320,type:'square',dur:0.3,vol:0.4}); }
  startBGM() {
    if (!this.ctx || this.bgmTimer) return;
    const bass = [55,55,82.41,73.42,65.41,65.41,98.00,73.42];
    const arp  = [440,523.25,659.25,523.25,440,523.25,659.25,783.99];
    this.bgmTimer = setInterval(() => {
      if (!this.ctx || !this.enabled) return;
      const i = this.bgmStep;
      this._tone({freq:bass[i%bass.length],type:'triangle',dur:0.42,vol:0.13});
      if (i % 2 === 0) this._tone({freq:arp[i%arp.length],type:'sine',dur:0.18,vol:0.05});
      if (i % 4 === 2) this._noise({dur:0.04,vol:0.055,filterFreq:5000});
      if (i % 4 === 0) this._tone({freq:120,freqEnd:40,type:'sine',dur:0.14,vol:0.26});
      this.bgmStep++;
    }, 230);
  }
  stopBGM() { if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; } }
}

/* ═══════════════════════════════════════════════════════════════
   TIME MANAGER (hit-stop + slow-mo)
   ═══════════════════════════════════════════════════════════════ */
class TimeManager {
  constructor() { this.scale = 1; this.hitStopTimer = 0; this.slowMoTimer = 0; this.slowMoScale = 1; }
  hitStop(dur=0.08) { this.hitStopTimer = Math.max(this.hitStopTimer, dur); }
  slowMo(scale=0.3, dur=0.6) { this.slowMoScale = scale; this.slowMoTimer = Math.max(this.slowMoTimer, dur); }
  tick(rawDt) {
    if (this.hitStopTimer > 0) { this.hitStopTimer -= rawDt; this.scale = 0.001; return rawDt * this.scale; }
    if (this.slowMoTimer > 0) { this.slowMoTimer -= rawDt; this.scale = this.slowMoScale; return rawDt * this.scale; }
    this.scale = 1; return rawDt;
  }
}

/* ═══════════════════════════════════════════════════════════════
   INPUT MANAGER
   ═══════════════════════════════════════════════════════════════ */
class InputManager {
  constructor(touch=null) {
    this.keys = {}; this.pressedThisFrame = {}; this.touch = touch;
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.pressedThisFrame[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Slash','Period','Comma','Backspace'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }
  consumePress(code) { if (this.pressedThisFrame[code]) { this.pressedThisFrame[code] = false; return true; } return false; }
  endFrame() { this.pressedThisFrame = {}; if (this.touch) this.touch.endFrame(); }
  getP1() {
    const kb = {
      left:!!this.keys['KeyA'], right:!!this.keys['KeyD'], jump:!!this.keys['KeyW'],
      block:!!this.keys['KeyS'], attack:!!this.keys['KeyF'], ranged:!!this.keys['KeyG'],
      ult:!!this.keys['KeyH'], launcher:!!this.keys['KeyR'],
    };
    if (this.touch && this.touch.enabled) {
      const t = this.touch.readInput();
      if (t) return {
        left:kb.left||t.left, right:kb.right||t.right, jump:kb.jump||t.jump,
        block:kb.block||t.block, attack:kb.attack||t.attack, ranged:kb.ranged||t.ranged,
        ult:kb.ult||t.ult, launcher:kb.launcher||t.launcher,
      };
    }
    return kb;
  }
  getP2() {
    return {
      left:!!this.keys['ArrowLeft'], right:!!this.keys['ArrowRight'], jump:!!this.keys['ArrowUp'],
      block:!!this.keys['ArrowDown'], attack:!!this.keys['Slash']||!!this.keys['Numpad1'],
      ranged:!!this.keys['Period']||!!this.keys['Numpad2'], ult:!!this.keys['Comma']||!!this.keys['Numpad3'],
      launcher:!!this.keys['KeyM']||!!this.keys['Numpad0'],
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   TOUCH MANAGER
   ═══════════════════════════════════════════════════════════════ */
class TouchManager {
  constructor() {
    this.active = false; this.enabled = false;
    this.stickActive = false; this.stickId = null;
    this.stickBase = { x:0, y:0 }; this.stickPos = { x:0, y:0 };
    this.deadzone = 0.28;
    this.btnState = { punch:false, laser:false, block:false, jump:false, launch:false, ult:false };
    this.btnPulse = { punch:false, laser:false, block:false, jump:false, launch:false, ult:false };
    this._buildDOM(); this._wireEvents();
  }
  _buildDOM() {
    this.root = document.createElement('div');
    this.root.id = 'touch-ui'; this.root.className = 'touch-ui hidden';
    this.stickZone = document.createElement('div'); this.stickZone.className = 'stick-zone';
    this.stickBaseEl = document.createElement('div'); this.stickBaseEl.className = 'stick-base';
    this.stickKnobEl = document.createElement('div'); this.stickKnobEl.className = 'stick-knob';
    this.stickBaseEl.appendChild(this.stickKnobEl); this.stickZone.appendChild(this.stickBaseEl);
    this.root.appendChild(this.stickZone);
    this.btns = document.createElement('div'); this.btns.className = 'touch-buttons';
    const defs = [
      { key:'ult', label:'ULT', cls:'big ult' }, { key:'punch', label:'👊', cls:'big punch' },
      { key:'launch', label:'⬆', cls:'launch' }, { key:'laser', label:'✦', cls:'laser' },
      { key:'jump', label:'⇧', cls:'jump' }, { key:'block', label:'🛡', cls:'block' },
    ];
    for (const d of defs) {
      const b = document.createElement('button');
      b.className = `touch-btn ${d.cls}`; b.dataset.key = d.key; b.textContent = d.label;
      b.addEventListener('pointerdown', (e) => this._btnDown(e, d.key));
      b.addEventListener('pointerup', (e) => this._btnUp(e, d.key));
      b.addEventListener('pointercancel', (e) => this._btnUp(e, d.key));
      b.addEventListener('pointerleave', (e) => this._btnUp(e, d.key));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      this.btns.appendChild(b);
    }
    this.root.appendChild(this.btns);
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.id = 'touch-toggle'; this.toggleBtn.textContent = '🎮';
    this.toggleBtn.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.toggleBtn);
    document.body.appendChild(this.root);
  }
  _wireEvents() {
    this.stickZone.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.stickActive = true; this.stickId = e.pointerId;
      const rect = this.stickZone.getBoundingClientRect();
      this.stickBase.x = e.clientX; this.stickBase.y = e.clientY;
      this.stickBaseEl.style.left = (e.clientX - rect.left) + 'px';
      this.stickBaseEl.style.top  = (e.clientY - rect.top)  + 'px';
      this.stickBaseEl.style.opacity = 1;
      this._updateKnob(0, 0);
      this.stickZone.setPointerCapture(e.pointerId);
    });
    this.stickZone.addEventListener('pointermove', (e) => {
      if (!this.stickActive || e.pointerId !== this.stickId) return;
      const dx = e.clientX - this.stickBase.x, dy = e.clientY - this.stickBase.y;
      const max = 55, dist = Math.min(max, Math.hypot(dx, dy));
      const ang = Math.atan2(dy, dx);
      this._updateKnob(Math.cos(ang) * dist, Math.sin(ang) * dist);
    });
    const endStick = (e) => {
      if (e.pointerId !== this.stickId) return;
      this.stickActive = false; this.stickId = null;
      this.stickBaseEl.style.opacity = 0; this._updateKnob(0, 0);
    };
    this.stickZone.addEventListener('pointerup', endStick);
    this.stickZone.addEventListener('pointercancel', endStick);
    document.addEventListener('touchmove', (e) => {
      if (this.enabled && e.target.closest('#touch-ui')) e.preventDefault();
    }, { passive:false });
  }
  _updateKnob(nx, ny) {
    this.stickKnobEl.style.transform = `translate(-50%, -50%) translate(${nx}px, ${ny}px)`;
    const max = 55; this.stickPos.x = nx / max; this.stickPos.y = ny / max;
  }
  _btnDown(e, key) {
    e.preventDefault(); if (!this.enabled) return;
    if (!this.btnState[key]) this.btnPulse[key] = true;
    this.btnState[key] = true;
    const el = this.btns.querySelector(`[data-key="${key}"]`);
    if (el) el.classList.add('pressed');
  }
  _btnUp(e, key) {
    if (!this.enabled) return;
    this.btnState[key] = false;
    const el = this.btns.querySelector(`[data-key="${key}"]`);
    if (el) el.classList.remove('pressed');
  }
  endFrame() { for (const k of Object.keys(this.btnPulse)) this.btnPulse[k] = false; }
  readInput() {
    if (!this.enabled || !this.active) return null;
    const dz = this.deadzone, x = this.stickPos.x, y = this.stickPos.y;
    return {
      left: x < -dz, right: x > dz, jump: y < -dz,
      block: this.btnState.block, attack: this.btnPulse.punch, ranged: this.btnPulse.laser,
      ult: this.btnPulse.ult, launcher: this.btnPulse.launch,
    };
  }
  setUltReady(ready) {
    const el = this.btns.querySelector('[data-key="ult"]');
    if (el) el.classList.toggle('ready', ready);
  }
  show() { this.enabled = true; this.active = true; this.root.classList.remove('hidden'); this.toggleBtn.classList.add('on'); }
  hide() { this.enabled = false; this.root.classList.add('hidden'); this.toggleBtn.classList.remove('on'); }
  toggle() { this.enabled ? this.hide() : this.show(); }
  autoDetect() {
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const small = window.innerWidth < 900;
    if (isTouch || small) this.show();
  }
}

/* ═══════════════════════════════════════════════════════════════
   VFX MANAGER
   ═══════════════════════════════════════════════════════════════ */
class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.activeSparks = []; this.activeRings = []; this.activeFlashes = [];
    this.activeTrails = []; this.activeWallHits = []; this.activeAirImpacts = [];
    this.activeEmpRings = []; this.activePlasmas = [];
    this.screenFlashEl = null;
  }
  spawnSpark(position, color=0xffe066, count=26, speed=7) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3] = position.x; positions[i*3+1] = position.y; positions[i*3+2] = position.z;
      const dir = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize();
      const s = speed * (0.5 + Math.random() * 0.8);
      velocities[i*3] = dir.x*s; velocities[i*3+1] = dir.y*s + 2; velocities[i*3+2] = dir.z*s;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color, size:0.18, transparent:true, opacity:1,
      blending:THREE.AdditiveBlending, depthWrite:false,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.activeSparks.push({ points, velocities, positions, life:0.5, maxLife:0.5 });
  }
  spawnShockwave(position, color=0xffffff, maxRadius=2.2) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.32, 40),
      new THREE.MeshBasicMaterial({
        color, transparent:true, opacity:0.95, side:THREE.DoubleSide,
        blending:THREE.AdditiveBlending, depthWrite:false,
      })
    );
    ring.position.copy(position); this.scene.add(ring);
    this.activeRings.push({ ring, life:0.35, maxLife:0.35, maxRadius });
  }
  spawnFlash(position, color=0xffffff, intensity=40) {
    const light = new THREE.PointLight(color, intensity, 8, 2);
    light.position.copy(position); this.scene.add(light);
    this.activeFlashes.push({ light, life:0.12, maxLife:0.12 });
  }
  spawnHitImpact(position, color=0xffe066) {
    this.spawnSpark(position, color, 30, 8);
    this.spawnShockwave(position, color, 2.4);
    this.spawnFlash(position, color, 45);
  }
  spawnTrailDot(position, color) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false })
    );
    dot.position.copy(position); this.scene.add(dot);
    this.activeTrails.push({ mesh:dot, life:0.28, maxLife:0.28 });
  }
  spawnAirImpact(position, color=0xff88ff) {
    this.spawnSpark(position, color, 22, 10);
    this.spawnShockwave(position, color, 1.4);
    this.spawnFlash(position, color, 30);
  }
  spawnWallBounce(position, color=0xffffff) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.65, 40),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:1, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false })
    );
    ring.position.copy(position); ring.rotation.y = Math.PI / 2;
    this.scene.add(ring);
    this.activeWallHits.push({ mesh:ring, life:0.5, maxLife:0.5, maxRadius:4.0 });
    this.spawnSpark(position, color, 40, 12);
    this.spawnFlash(position, color, 60);
  }
  spawnLaunchColumn(position, color=0xffffff) {
    const geo = new THREE.CylinderGeometry(0.5, 0.7, 4, 20, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false });
    const cyl = new THREE.Mesh(geo, mat);
    cyl.position.copy(position); cyl.position.y += 2;
    this.scene.add(cyl);
    this.activeAirImpacts.push({ mesh:cyl, life:0.45, maxLife:0.45, type:'column' });
    this.spawnSpark(position, color, 36, 9);
  }
  spawnAirTrail(position, color) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false })
    );
    dot.position.copy(position); this.scene.add(dot);
    this.activeTrails.push({ mesh:dot, life:0.45, maxLife:0.45 });
  }
  spawnEmpBlast(position, color=0xffe066) {
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.75, 64),
        new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.9, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false })
      );
      ring.position.copy(position); ring.position.y = 0.05;
      ring.rotation.x = -Math.PI / 2; this.scene.add(ring);
      this.activeEmpRings.push({ ring, life:1.0 + i*0.15, maxLife:1.0 + i*0.15, maxRadius:8 + i*2, delay:i*0.08 });
    }
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.5, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, wireframe:true, depthWrite:false })
    );
    dome.position.copy(position); this.scene.add(dome);
    this.activePlasmas.push({ mesh:dome, life:0.9, maxLife:0.9, maxRadius:6 });
    for (let i = 0; i < 4; i++) {
      this.spawnSpark(new THREE.Vector3(position.x, position.y + Math.random()*1.5, 0), color, 40, 14);
    }
    this.spawnFlash(position, color, 200);
  }
  flashScreen(color='#ffffff', durationMs=300) {
    if (!this.screenFlashEl) return;
    this.screenFlashEl.style.transition = 'none';
    this.screenFlashEl.style.background = color;
    this.screenFlashEl.style.opacity = '0.95';
    requestAnimationFrame(() => {
      this.screenFlashEl.style.transition = `opacity ${durationMs}ms ease-out`;
      this.screenFlashEl.style.opacity = '0';
    });
  }
  update(dt) {
    // Sparks
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const s = this.activeSparks[i]; s.life -= dt;
      const { positions, velocities } = s;
      for (let j = 0; j < positions.length; j += 3) {
        positions[j] += velocities[j]*dt; positions[j+1] += velocities[j+1]*dt; positions[j+2] += velocities[j+2]*dt;
        velocities[j+1] -= 18*dt; velocities[j] *= 0.94; velocities[j+2] *= 0.94;
      }
      s.points.geometry.attributes.position.needsUpdate = true;
      s.points.material.opacity = Math.max(0, s.life / s.maxLife);
      if (s.life <= 0) {
        this.scene.remove(s.points); s.points.geometry.dispose(); s.points.material.dispose();
        this.activeSparks.splice(i, 1);
      }
    }
    // Rings
    for (let i = this.activeRings.length - 1; i >= 0; i--) {
      const r = this.activeRings[i]; r.life -= dt;
      const t = 1 - r.life / r.maxLife; const scale = 0.3 + t * r.maxRadius;
      r.ring.scale.set(scale, scale, scale);
      r.ring.material.opacity = Math.max(0, 1 - t);
      if (r.life <= 0) {
        this.scene.remove(r.ring); r.ring.geometry.dispose(); r.ring.material.dispose();
        this.activeRings.splice(i, 1);
      }
    }
    // Flashes
    for (let i = this.activeFlashes.length - 1; i >= 0; i--) {
      const f = this.activeFlashes[i]; f.life -= dt;
      f.light.intensity *= (f.life / f.maxLife);
      if (f.life <= 0) { this.scene.remove(f.light); this.activeFlashes.splice(i, 1); }
    }
    // Trails
    for (let i = this.activeTrails.length - 1; i >= 0; i--) {
      const t = this.activeTrails[i]; t.life -= dt;
      const k = t.life / t.maxLife;
      t.mesh.material.opacity = 0.85 * k; t.mesh.scale.setScalar(0.6 + k * 0.9);
      if (t.life <= 0) {
        this.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
        this.activeTrails.splice(i, 1);
      }
    }
    // Wall hits
    for (let i = this.activeWallHits.length - 1; i >= 0; i--) {
      const w = this.activeWallHits[i]; w.life -= dt;
      const t = 1 - w.life / w.maxLife; const s = 0.4 + t * w.maxRadius;
      w.mesh.scale.set(s, s, s); w.mesh.material.opacity = Math.max(0, 1 - t);
      if (w.life <= 0) {
        this.scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose();
        this.activeWallHits.splice(i, 1);
      }
    }
    // Air impacts
    for (let i = this.activeAirImpacts.length - 1; i >= 0; i--) {
      const a = this.activeAirImpacts[i]; a.life -= dt;
      const t = 1 - a.life / a.maxLife;
      if (a.type === 'column') { a.mesh.scale.set(1 + t * 1.5, 1, 1 + t * 1.5); a.mesh.material.opacity = Math.max(0, 0.85 * (1 - t)); }
      if (a.life <= 0) {
        this.scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose();
        this.activeAirImpacts.splice(i, 1);
      }
    }
    // EMP rings
    for (let i = this.activeEmpRings.length - 1; i >= 0; i--) {
      const e = this.activeEmpRings[i];
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.life -= dt;
      const t = 1 - e.life / e.maxLife; const s = 0.5 + t * e.maxRadius;
      e.ring.scale.set(s, s, s); e.ring.material.opacity = Math.max(0, 0.9 * (1 - t));
      if (e.life <= 0) {
        this.scene.remove(e.ring); e.ring.geometry.dispose(); e.ring.material.dispose();
        this.activeEmpRings.splice(i, 1);
      }
    }
    // Plasma domes
    for (let i = this.activePlasmas.length - 1; i >= 0; i--) {
      const p = this.activePlasmas[i]; p.life -= dt;
      const t = 1 - p.life / p.maxLife; const s = 0.5 + t * p.maxRadius;
      p.mesh.scale.set(s, s, s); p.mesh.material.opacity = Math.max(0, 0.5 * (1 - t));
      if (p.life <= 0) {
        this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
        this.activePlasmas.splice(i, 1);
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   PROJECTILE (LASER)
   ═══════════════════════════════════════════════════════════════ */
class Projectile {
  constructor(scene, startPos, direction, color, opts={}) {
    this.scene = scene;
    this.speed = opts.speed ?? 24; this.damage = opts.damage ?? 8;
    this.life = opts.life ?? 2.0; this.owner = opts.owner ?? null;
    this.color = color; this.dead = false;
    this.dir = direction.clone().normalize();
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:1, blending:THREE.AdditiveBlending })
    );
    this.head.position.copy(startPos);
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.55, blending:THREE.AdditiveBlending, depthWrite:false })
    );
    this.head.add(this.glow);
    this.light = new THREE.PointLight(color, 18, 6, 2);
    this.head.add(this.light);
    scene.add(this.head);
    this.position = this.head.position;
    this.trailTimer = 0;
  }
  update(dt, vfx) {
    if (this.dead) return;
    this.life -= dt;
    if (this.life <= 0) { this.destroy(vfx); return; }
    this.position.x += this.dir.x * this.speed * dt;
    this.position.y += this.dir.y * this.speed * dt;
    const k = Math.min(1, this.life / 0.4);
    this.head.material.opacity = k;
    this.glow.material.opacity = 0.55 * k;
    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && vfx) {
      this.trailTimer = 0.02;
      vfx.spawnTrailDot(this.position.clone(), this.color);
    }
  }
  destroy(vfx) {
    if (this.dead) return;
    this.dead = true;
    if (vfx) {
      vfx.spawnHitImpact(this.position.clone(), this.color);
      vfx.spawnShockwave(this.position.clone(), this.color, 3.0);
    }
    this.scene.remove(this.head);
    this.head.material.dispose(); this.head.geometry.dispose();
    this.glow.material.dispose(); this.glow.geometry.dispose();
  }
}

/* ═══════════════════════════════════════════════════════════════
   ROBOT
   ═══════════════════════════════════════════════════════════════ */
class Robot {
  constructor(scene, x, facing, color, stats=null) {
    this.scene = scene; this.facing = facing;
    this.stats = stats || { hp:100, speed:6.0, jumpSpeed:9.0, meleeDamage:12, rangedDamage:8, attackCooldown:0.45, rangedCooldown:0.9, ultDamage:30 };
    this.speed = this.stats.speed; this.jumpSpeed = this.stats.jumpSpeed;
    this.gravity = 22.0; this.velocityY = 0; this.grounded = true;
    this.hp = this.stats.hp; this.maxHP = this.stats.hp;
    this.alive = true; this.koTimer = 0;
    this.attackTimer = 0; this.attackDuration = 0.32;
    this.attackCooldown = 0; this.attackCooldownMax = this.stats.attackCooldown;
    this.attackHasHit = false;
    this.rangedCooldown = 0; this.rangedCooldownMax = this.stats.rangedCooldown;
    this.launcherTimer = 0; this.launcherDuration = 0.42;
    this.launcherCooldown = 0; this.launcherCooldownMax = 1.3; this.launcherHasHit = false;
    this.launchState = 'none'; this.launchTimer = 0; this.launchVX = 0; this.launchVY = 0;
    this.juggleCount = 0; this.recoveryInvuln = 0; this.wallBounced = false;
    this.onWallBounce = false; this.onLanding = false;
    this.hitstun = 0; this.blocking = false;
    this.energy = 0; this.maxEnergy = 100; this.energyRegenPerSec = 6;
    this.energyGainOnHit = 12; this.energyGainOnTake = 8;
    this.ultActive = false; this.ultTimer = 0; this.ultDuration = 1.6;
    this.ultHasFired = false; this.ultCooldown = 0;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, 0);
    this.accentColor = color;
    this._buildBody(color);
    scene.add(this.group);
  }
  _buildBody(color) {
    const accent = new THREE.MeshStandardMaterial({ color:0x111820, emissive:color, emissiveIntensity:1.2, metalness:0.9, roughness:0.3 });
    const bodyMat = new THREE.MeshStandardMaterial({ color:0x2a3442, metalness:0.85, roughness:0.35 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.8), bodyMat);
    torso.position.y = 1.7; torso.castShadow = true; this.group.add(torso); this.torso = torso;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), accent.clone());
    core.position.set(0, 1.85, 0.42); this.group.add(core); this.core = core;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), bodyMat);
    head.position.y = 2.75; head.castShadow = true; this.group.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.05), accent.clone());
    visor.position.set(0, 2.8, 0.36); this.group.add(visor); this.visor = visor;
    const armGeo = new THREE.BoxGeometry(0.35, 1.1, 0.35);
    const la = new THREE.Mesh(armGeo, bodyMat); la.position.set(-0.85, 1.7, 0); la.castShadow = true;
    this.group.add(la); this.leftArm = la; this.leftArmBaseY = la.position.y;
    const ra = new THREE.Mesh(armGeo, bodyMat); ra.position.set(0.85, 1.7, 0); ra.castShadow = true;
    this.group.add(ra); this.rightArm = ra; this.rightArmBaseY = ra.position.y;
    const legGeo = new THREE.BoxGeometry(0.45, 1.1, 0.5);
    const ll = new THREE.Mesh(legGeo, bodyMat); ll.position.set(-0.35, 0.55, 0); ll.castShadow = true; this.group.add(ll);
    const rl = new THREE.Mesh(legGeo, bodyMat); rl.position.set(0.35, 0.55, 0); rl.castShadow = true; this.group.add(rl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.4, side:THREE.DoubleSide, depthWrite:false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
    this.group.add(ring); this.groundRing = ring;
    const shield = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 20),
      new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0, wireframe:true, depthWrite:false }));
    shield.position.y = 1.5; this.group.add(shield); this.shield = shield;
  }
  tryAttack() {
    if (this.attackCooldown > 0 || this.attackTimer > 0 || this.hitstun > 0 || !this.alive) return false;
    if (this.launchState !== 'none' || this.launcherTimer > 0) return false;
    this.attackTimer = this.attackDuration; this.attackCooldown = this.attackCooldownMax; this.attackHasHit = false;
    return true;
  }
  tryLauncher() {
    if (this.launcherCooldown > 0 || this.launcherTimer > 0 || this.attackTimer > 0) return false;
    if (this.hitstun > 0 || !this.alive || this.launchState !== 'none' || !this.grounded) return false;
    this.launcherTimer = this.launcherDuration; this.launcherCooldown = this.launcherCooldownMax; this.launcherHasHit = false;
    return true;
  }
  canFireRanged() {
    return this.alive && this.rangedCooldown <= 0 && this.hitstun <= 0 && this.attackTimer <= 0
      && this.launchState === 'none' && this.launcherTimer <= 0;
  }
  startRangedCooldown() { this.rangedCooldown = this.rangedCooldownMax; this.group.position.x -= this.facing * 0.15; }
  getActiveHitbox() {
    if (!this.alive) return null;
    const t = 1 - this.attackTimer / this.attackDuration;
    if (t < 0.25 || t > 0.65) return null;
    return { center:new THREE.Vector3(this.group.position.x + this.facing * 1.5, this.group.position.y + 1.7, 0), radius:0.9, kind:'melee' };
  }
  getLauncherHitbox() {
    if (!this.alive || this.launcherTimer <= 0) return null;
    const t = 1 - this.launcherTimer / this.launcherDuration;
    if (t < 0.3 || t > 0.6) return null;
    return { center:new THREE.Vector3(this.group.position.x + this.facing * 1.1, this.group.position.y + 2.3, 0), radius:1.15, kind:'launcher' };
  }
  applyLaunch(dir, damage) {
    const wasBlocking = this.blocking;
    const dmg = wasBlocking ? damage * 0.15 : damage;
    this.hp = Math.max(0, this.hp - dmg);
    this.blocking = false; this.hitstun = 1.6; this.grounded = false;
    this.launchState = 'launched'; this.launchTimer = 1.7;
    this.launchVX = dir * 7.5; this.launchVY = 11.5;
    this.juggleCount = 0; this.wallBounced = false;
    this.visor.material.emissiveIntensity = 8.0;
    setTimeout(() => { if (this.visor) this.visor.material.emissiveIntensity = 1.2; }, 150);
    return { blocked:wasBlocking, damage:dmg, launched:true };
  }
  takeAirHit(damage, dir) {
    if (this.launchState !== 'launched') return null;
    const scale = Math.max(0.35, 1 - this.juggleCount * 0.18);
    const dmg = damage * 0.55 * scale;
    this.hp = Math.max(0, this.hp - dmg);
    this.juggleCount++;
    this.launchVY = Math.max(this.launchVY, 4.5 + Math.random() * 1.5);
    this.launchVX += dir * 1.8;
    this.launchTimer = Math.max(this.launchTimer, 0.9);
    this.visor.material.emissiveIntensity = 6.0;
    setTimeout(() => { if (this.visor) this.visor.material.emissiveIntensity = 1.2; }, 80);
    return { blocked:false, damage:dmg, juggle:true, juggleCount:this.juggleCount };
  }
  takeHit(damage, knockDir, hitstunTime=0.35) {
    if (!this.alive) return { blocked:false, damage:0 };
    if (this.launchState === 'launched') {
      const r = this.takeAirHit(damage, knockDir);
      if (r) return r;
    }
    const wasBlocking = this.blocking;
    const finalDamage = wasBlocking ? damage * 0.2 : damage;
    this.hp = Math.max(0, this.hp - finalDamage);
    this.hitstun = wasBlocking ? hitstunTime * 0.4 : hitstunTime;
    this.group.position.x += knockDir * (wasBlocking ? 0.3 : 0.9);
    this.energy = Math.min(this.maxEnergy, this.energy + this.energyGainOnTake);
    this.visor.material.emissiveIntensity = 6.0;
    setTimeout(() => { if (this.visor) this.visor.material.emissiveIntensity = 1.2; }, 90);
    return { blocked:wasBlocking, damage:finalDamage };
  }
  ko() { this.alive = false; this.koTimer = 0; this.hp = 0; this.launchState = 'none'; }
  reset(x, facing) {
    this.hp = this.maxHP; this.alive = true; this.koTimer = 0;
    this.hitstun = 0; this.attackTimer = 0; this.attackCooldown = 0; this.rangedCooldown = 0;
    this.launcherTimer = 0; this.launcherCooldown = 0;
    this.launchState = 'none'; this.launchTimer = 0; this.launchVX = 0; this.launchVY = 0;
    this.juggleCount = 0; this.wallBounced = false; this.velocityY = 0; this.grounded = true;
    this.facing = facing; this.energy = 0;
    this.ultActive = false; this.ultTimer = 0; this.ultHasFired = false; this.ultCooldown = 0;
    this.group.position.set(x, 0, 0);
    this.group.rotation.set(0, facing > 0 ? 0 : Math.PI, 0);
    this.visor.material.emissiveIntensity = 1.2; this.core.material.emissiveIntensity = 1.2;
    this.groundRing.material.opacity = 0.4; this.shield.material.opacity = 0;
  }
  tryUltimate() {
    if (!this.alive || this.ultCooldown > 0 || this.energy < this.maxEnergy) return false;
    if (this.attackTimer > 0 || this.hitstun > 0 || this.launchState !== 'none') return false;
    this.ultActive = true; this.ultTimer = this.ultDuration; this.ultHasFired = false;
    this.energy = 0; this.ultCooldown = 3.0;
    return true;
  }
  getUltBlast() {
    if (!this.ultActive || this.ultHasFired) return null;
    const t = 1 - this.ultTimer / this.ultDuration;
    if (t < 0.5) return null;
    this.ultHasFired = true;
    return { center:new THREE.Vector3(this.group.position.x, this.group.position.y + 1.5, 0), radius:5.5, damage:this.stats.ultDamage };
  }
  update(dt, input, arenaMin, arenaMax) {
    if (!this.alive) {
      this.koTimer += dt;
      const t = Math.min(1, this.koTimer * 2.0);
      this.group.rotation.y = this.facing > 0 ? 0 : Math.PI;
      this.group.rotation.z = t * (Math.PI / 2);
      this.visor.material.emissiveIntensity = Math.max(0, 1.2 * (1 - t));
      this.core.material.emissiveIntensity = Math.max(0.1, 1.2 * (1 - t));
      this.groundRing.material.opacity = Math.max(0, 0.4 * (1 - t));
      return;
    }
    if (this.launchState === 'launched') {
      this.launchTimer -= dt;
      this.group.position.x += this.launchVX * dt;
      this.group.position.y += this.launchVY * dt;
      this.launchVY -= this.gravity * dt;
      this.launchVX *= 0.992;
      this.onWallBounce = false;
      if (!this.wallBounced) {
        if (this.group.position.x <= arenaMin) {
          this.group.position.x = arenaMin;
          this.launchVX = Math.abs(this.launchVX) * 0.75 + 2.0;
          this.wallBounced = true; this.onWallBounce = true;
          this.launchVY = Math.max(this.launchVY, 6);
          this.launchTimer = Math.max(this.launchTimer, 1.1);
        } else if (this.group.position.x >= arenaMax) {
          this.group.position.x = arenaMax;
          this.launchVX = -(Math.abs(this.launchVX) * 0.75 + 2.0);
          this.wallBounced = true; this.onWallBounce = true;
          this.launchVY = Math.max(this.launchVY, 6);
          this.launchTimer = Math.max(this.launchTimer, 1.1);
        }
      }
      if (this.group.position.y <= 0 && this.launchVY < 0) {
        this.group.position.y = 0; this.launchVY = 0; this.launchVX = 0;
        this.launchState = 'recovering'; this.launchTimer = 0.55;
        this.recoveryInvuln = 0.4; this.onLanding = true;
      }
      this.group.rotation.z = Math.sin(performance.now() * 0.015) * 0.5;
      this.group.rotation.y = this.facing > 0 ? 0 : Math.PI;
      this.core.material.emissiveIntensity = 2.0 + Math.sin(performance.now() * 0.01) * 0.6;
      return;
    }
    if (this.launchState === 'recovering') {
      this.launchTimer -= dt;
      if (this.recoveryInvuln > 0) this.recoveryInvuln -= dt;
      this.group.rotation.z *= 0.85;
      if (this.launchTimer <= 0) { this.launchState = 'none'; this.group.rotation.z = 0; }
      this.core.material.emissiveIntensity = 1.2;
      return;
    }
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.rangedCooldown > 0) this.rangedCooldown -= dt;
    if (this.launcherTimer > 0) this.launcherTimer -= dt;
    if (this.launcherCooldown > 0) this.launcherCooldown -= dt;
    if (this.hitstun > 0) this.hitstun -= dt;
    if (this.ultCooldown > 0) this.ultCooldown -= dt;
    if (!this.ultActive && this.alive) this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenPerSec * dt);
    if (this.ultActive) {
      this.ultTimer -= dt;
      const t = 1 - this.ultTimer / this.ultDuration;
      const hover = Math.sin(Math.min(1, t) * Math.PI) * 0.6;
      this.group.position.y = Math.max(this.group.position.y, hover);
      const bright = 1.2 + Math.sin(performance.now() * 0.02) * 0.8;
      this.visor.material.emissiveIntensity = bright * 3.5;
      this.core.material.emissiveIntensity = bright * 3.5;
      if (this.ultTimer <= 0) {
        this.ultActive = false;
        this.visor.material.emissiveIntensity = 1.2;
        this.core.material.emissiveIntensity = 1.2;
      }
      return;
    }
    this.blocking = !!input.block && this.hitstun <= 0 && this.grounded;
    let moveDir = 0;
    const canMove = this.hitstun <= 0 && this.attackTimer <= 0 && this.launcherTimer <= 0 && !this.blocking;
    if (canMove) {
      if (input.left) moveDir -= 1;
      if (input.right) moveDir += 1;
    }
    this.group.position.x += moveDir * this.speed * dt;
    this.group.position.x = Math.max(arenaMin, Math.min(arenaMax, this.group.position.x));
    if (input.jump && this.grounded && this.hitstun <= 0) { this.velocityY = this.jumpSpeed; this.grounded = false; }
    this.velocityY -= this.gravity * dt;
    this.group.position.y += this.velocityY * dt;
    if (this.group.position.y <= 0) { this.group.position.y = 0; this.velocityY = 0; this.grounded = true; }
    this.group.rotation.y = this.facing > 0 ? 0 : Math.PI;
    this.group.rotation.z = 0;
    const ta = this.attackTimer > 0 ? 1 - this.attackTimer / this.attackDuration : 0;
    const thrust = ta > 0 ? Math.sin(Math.min(1, ta * 1.6) * Math.PI) * 0.9 : 0;
    this.rightArm.position.z = thrust; this.rightArm.position.y = this.rightArmBaseY;
    this.torso.rotation.x = thrust * 0.35;
    const tl = this.launcherTimer > 0 ? 1 - this.launcherTimer / this.launcherDuration : 0;
    if (tl > 0) {
      const swing = Math.sin(Math.min(1, tl * 1.8) * Math.PI);
      this.rightArm.position.y = this.rightArmBaseY + swing * 1.5;
      this.rightArm.rotation.z = -swing * 1.4;
      this.torso.rotation.x = -swing * 0.4;
      this.group.position.y = Math.max(this.group.position.y, swing * 0.4);
    } else { this.rightArm.rotation.z = 0; }
    this.shield.material.opacity += ((this.blocking ? 0.35 : 0) - this.shield.material.opacity) * Math.min(1, dt * 12);
    const now = performance.now() * 0.003;
    this.core.material.emissiveIntensity = 1.0 + Math.sin(now * 2) * 0.4;
    this.groundRing.rotation.z += dt * 0.8;
    this.groundRing.material.opacity = 0.3 + Math.sin(now * 3) * 0.1;
  }
  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   AI BOT
   ═══════════════════════════════════════════════════════════════ */
class AIBot {
  constructor(robot, opponent, difficulty='medium') {
    this.robot = robot; this.opponent = opponent;
    this.setDifficulty(difficulty);
    this.decisionTimer = 0; this.currentAction = 'idle'; this.actionTimer = 0; this.hasPulsed = false;
    this.keys = { left:false, right:false, jump:false, block:false, attack:false, ranged:false, ult:false, launcher:false };
  }
  setDifficulty(d) {
    this.difficulty = d;
    const CFG = {
      easy:   { reactTime:0.42, attackRange:2.3, aggro:0.35, blockChance:0.15, rangedChance:0.10, ultChance:0.30, jumpChance:0.005 },
      medium: { reactTime:0.24, attackRange:2.6, aggro:0.60, blockChance:0.35, rangedChance:0.22, ultChance:0.60, jumpChance:0.012 },
      hard:   { reactTime:0.11, attackRange:2.9, aggro:0.85, blockChance:0.60, rangedChance:0.32, ultChance:0.90, jumpChance:0.020 },
    };
    this.cfg = CFG[d] || CFG.medium;
  }
  update(dt) {
    if (!this.robot.alive || !this.opponent.alive) { this._releaseAll(); return this._snapshot(); }
    this.decisionTimer -= dt; this.actionTimer -= dt;
    const dx = this.opponent.group.position.x - this.robot.group.position.x;
    const dist = Math.abs(dx);
    const oppAttacking = this.opponent.attackTimer > 0 || this.opponent.launcherTimer > 0;
    if (oppAttacking && dist < 3.2 && this.currentAction !== 'block' && Math.random() < this.cfg.blockChance * 0.5) {
      this._setAction('block', 0.25 + Math.random() * 0.2);
    }
    if (this.decisionTimer <= 0) {
      this._decide(dist, dx, oppAttacking);
      this.decisionTimer = this.cfg.reactTime * (0.65 + Math.random() * 0.7);
    }
    if (this.actionTimer <= 0 && this.currentAction !== 'idle') this._setAction('idle', 0.05);
    this._executeAction(dist);
    return this._snapshot();
  }
  _setAction(name, dur) { this.currentAction = name; this.actionTimer = dur; this.hasPulsed = false; }
  _decide(dist, dx, oppAttacking) {
    if (this.robot.energy >= this.robot.maxEnergy && dist < 5.5 && Math.random() < this.cfg.ultChance) { this._setAction('ult', 0.15); return; }
    if (dist < this.cfg.attackRange) {
      if (this.robot.grounded && Math.random() < this.cfg.jumpChance * 4) { this._setAction('jumpIn', 0.55); return; }
      if (Math.random() < this.cfg.aggro) this._setAction('attack', 0.22 + Math.random() * 0.25);
      else this._setAction(Math.random() < 0.5 ? 'retreat' : 'block', 0.25 + Math.random() * 0.25);
      return;
    }
    if (dist > 3.5 && dist < 9.5 && Math.random() < this.cfg.rangedChance) { this._setAction('ranged', 0.15); return; }
    this._setAction('approach', 0.35 + Math.random() * 0.35);
  }
  _executeAction(dist) {
    this._releaseAll();
    switch (this.currentAction) {
      case 'approach': {
        const dx = this.opponent.group.position.x - this.robot.group.position.x;
        if (dx > 0.6) this.keys.right = true; else if (dx < -0.6) this.keys.left = true;
        if (Math.random() < this.cfg.jumpChance) this.keys.jump = true;
        break;
      }
      case 'retreat': {
        const dx = this.opponent.group.position.x - this.robot.group.position.x;
        if (dx > 0) this.keys.left = true; else this.keys.right = true;
        break;
      }
      case 'block': this.keys.block = true; break;
      case 'attack': if (!this.hasPulsed) { this.keys.attack = true; this.hasPulsed = true; } break;
      case 'jumpIn': {
        const dx = this.opponent.group.position.x - this.robot.group.position.x;
        if (this.robot.grounded) this.keys.jump = true;
        if (dx > 0.6) this.keys.right = true; else if (dx < -0.6) this.keys.left = true;
        if (!this.robot.grounded && !this.hasPulsed) { this.keys.attack = true; this.hasPulsed = true; }
        break;
      }
      case 'ranged': if (!this.hasPulsed) { this.keys.ranged = true; this.hasPulsed = true; } break;
      case 'ult': if (!this.hasPulsed) { this.keys.ult = true; this.hasPulsed = true; } break;
    }
  }
  _releaseAll() {
    this.keys.left = this.keys.right = this.keys.jump = this.keys.block =
    this.keys.attack = this.keys.ranged = this.keys.ult = this.keys.launcher = false;
  }
  _snapshot() { return { ...this.keys }; }
}

/* ═══════════════════════════════════════════════════════════════
   HUD
   ═══════════════════════════════════════════════════════════════ */
class HUD {
  constructor() {
    this.p1hp = document.getElementById('p1hp'); this.p2hp = document.getElementById('p2hp');
    this.p1en = document.getElementById('p1energy'); this.p2en = document.getElementById('p2energy');
    this.p1enBar = document.getElementById('p1energy-bar'); this.p2enBar = document.getElementById('p2energy-bar');
    this.p1combo = document.getElementById('p1combo'); this.p2combo = document.getElementById('p2combo');
    this.p1comboNum = this.p1combo.querySelector('.num'); this.p2comboNum = this.p2combo.querySelector('.num');
    this.roundNum = document.getElementById('roundNum');
    this.p1wins = document.getElementById('p1wins'); this.p2wins = document.getElementById('p2wins');
    this.bigText = document.getElementById('big-text');
    this.aiMode = document.getElementById('aiMode'); this.aiDiff = document.getElementById('aiDiff');
    this.p1name = document.getElementById('p1name'); this.p2name = document.getElementById('p2name');
  }
  setHP(p1, p2) { this.p1hp.style.width = Math.max(0, p1) + '%'; this.p2hp.style.width = Math.max(0, p2) + '%'; }
  setEnergy(p1pct, p2pct) {
    this.p1en.style.width = Math.max(0, p1pct) + '%'; this.p2en.style.width = Math.max(0, p2pct) + '%';
    this.p1enBar.classList.toggle('full', p1pct >= 99.9);
    this.p2enBar.classList.toggle('full', p2pct >= 99.9);
  }
  setCombo(side, count) {
    const el = side === 'p1' ? this.p1combo : this.p2combo;
    const numEl = side === 'p1' ? this.p1comboNum : this.p2comboNum;
    if (count >= 2) { numEl.textContent = count; el.classList.add('show'); }
    else el.classList.remove('show');
  }
  setRound(n) { this.roundNum.textContent = n; }
  setWins(p1, p2) {
    this.p1wins.textContent = '●'.repeat(p1) + '○'.repeat(Math.max(0, 2 - p1));
    this.p2wins.textContent = '○'.repeat(Math.max(0, 2 - p2)) + '●'.repeat(p2);
  }
  setAIMode(isAI, diff) {
    this.aiMode.textContent = isAI ? 'AI' : 'HUMAN';
    this.aiDiff.textContent = diff.toUpperCase();
  }
  setBigText(t) {
    if (this.bigText.textContent === t) return;
    this.bigText.textContent = t;
    this.bigText.classList.remove('show'); void this.bigText.offsetWidth;
    if (t) this.bigText.classList.add('show');
  }
}

/* ═══════════════════════════════════════════════════════════════
   MENU MANAGER
   ═══════════════════════════════════════════════════════════════ */
class MenuManager {
  constructor(callbacks) {
    this.cb = callbacks;
    this.menu = document.getElementById('menu-overlay');
    this.char = document.getElementById('char-overlay');
    this.pause = document.getElementById('pause-overlay');
    this.howto = document.getElementById('howto-overlay');
    this.grid = document.getElementById('char-grid');
    this.p1Label = document.getElementById('p1choice');
    this.p2Label = document.getElementById('p2choice');
    this.fightBtn = document.getElementById('btnFight');
    this.p1Choice = 0; this.p2Choice = 1;
    this.confirmPhase = 'p1';
    this._buildCards(); this._wireButtons();
    this._updateChoices();
  }
  _buildCards() {
    this.grid.innerHTML = '';
    this.cards = ROSTER.map((r, i) => {
      const card = document.createElement('div');
      card.className = 'char-card'; card.dataset.index = i;
      card.style.setProperty('--accent', r.css);
      card.innerHTML = `
        <div class="char-orb" style="background:radial-gradient(circle at 30% 30%, ${r.css}, #05060a 70%);"></div>
        <div class="char-name">${r.name}</div>
        <div class="char-tag">${r.tagline}</div>
        <div class="char-stats"><div>HP <b>${r.stats.hp}</b></div><div>SPD <b>${r.stats.speed.toFixed(1)}</b></div><div>DMG <b>${r.stats.meleeDamage}</b></div></div>
        <div class="char-p1badge">P1</div><div class="char-p2badge">P2</div>`;
      card.addEventListener('click', () => this._onCardClick(i));
      this.grid.appendChild(card);
      return card;
    });
  }
  _onCardClick(i) {
    if (this.confirmPhase === 'p1') {
      this.p1Choice = i; this.confirmPhase = 'p2';
      if (this.p2Choice === i) this.p2Choice = (i + 1) % ROSTER.length;
    } else {
      this.p2Choice = i;
      if (this.p2Choice === this.p1Choice) this.p2Choice = (i + 1) % ROSTER.length;
      this.confirmPhase = 'p1';
    }
    this._updateChoices();
  }
  _updateChoices() {
    this.cards.forEach((c, i) => {
      c.classList.toggle('p1', i === this.p1Choice);
      c.classList.toggle('p2', i === this.p2Choice);
      c.classList.toggle('cursor', this.confirmPhase === 'p1' ? i === this.p1Choice : i === this.p2Choice);
    });
    this.p1Label.textContent = ROSTER[this.p1Choice].name;
    this.p1Label.style.color = ROSTER[this.p1Choice].css;
    this.p2Label.textContent = ROSTER[this.p2Choice].name;
    this.p2Label.style.color = ROSTER[this.p2Choice].css;
    this.fightBtn.disabled = this.p1Choice === this.p2Choice;
  }
  _wireButtons() {
    document.getElementById('btnPlay').onclick = () => this.showCharSelect();
    document.getElementById('btnHowTo').onclick = () => this.showHowTo();
    document.getElementById('btnHowToClose').onclick = () => this.hideHowTo();
    document.getElementById('btnStory').onclick = () => { this.hideAll(); this.cb.onStory(); };
    document.getElementById('btnTraining').onclick = () => { this.hideAll(); this.cb.onTraining(); };
    document.getElementById('btnFight').onclick = () => {
      if (this.p1Choice === this.p2Choice) return;
      this.hideAll(); this.cb.onFight(this.p1Choice, this.p2Choice);
    };
    document.getElementById('btnResume').onclick = () => { this.hidePause(); this.cb.onResume(); };
    document.getElementById('btnRestart').onclick = () => { this.hidePause(); this.cb.onRestart(); };
    document.getElementById('btnQuit').onclick = () => { this.hidePause(); this.cb.onQuit(); };
  }
  handleKeyboard(input) {
    if (!this.char.classList.contains('hidden')) {
      if (input.consumePress('KeyA')) { this.confirmPhase='p1'; this.p1Choice = (this.p1Choice - 1 + ROSTER.length) % ROSTER.length; this._updateChoices(); }
      if (input.consumePress('KeyD')) { this.confirmPhase='p1'; this.p1Choice = (this.p1Choice + 1) % ROSTER.length; this._updateChoices(); }
      if (input.consumePress('KeyF')) { this.confirmPhase = 'p2'; this._updateChoices(); }
      if (input.consumePress('ArrowLeft'))  { this.confirmPhase='p2'; this.p2Choice = (this.p2Choice - 1 + ROSTER.length) % ROSTER.length; this._updateChoices(); }
      if (input.consumePress('ArrowRight')) { this.confirmPhase='p2'; this.p2Choice = (this.p2Choice + 1) % ROSTER.length; this._updateChoices(); }
      if (input.consumePress('Period')) { this.confirmPhase = 'p1'; this._updateChoices(); }
      if (input.consumePress('Enter') || input.consumePress('Space')) {
        if (this.p1Choice !== this.p2Choice) { this.hideAll(); this.cb.onFight(this.p1Choice, this.p2Choice); }
      }
      if (input.consumePress('Escape')) this.showMenu();
    } else if (!this.menu.classList.contains('hidden')) {
      if (input.consumePress('Enter') || input.consumePress('Space')) this.showCharSelect();
      if (input.consumePress('KeyS')) { this.hideAll(); this.cb.onStory(); }
      if (input.consumePress('KeyP')) { this.hideAll(); this.cb.onTraining(); }
    }
  }
  showMenu() { this.menu.classList.remove('hidden'); this.char.classList.add('hidden'); this.pause.classList.add('hidden'); this.howto.classList.add('hidden'); }
  showCharSelect() { this.menu.classList.add('hidden'); this.char.classList.remove('hidden'); this.pause.classList.add('hidden'); this.howto.classList.add('hidden'); this._updateChoices(); }
  showPause() { this.pause.classList.remove('hidden'); }
  hidePause() { this.pause.classList.add('hidden'); }
  showHowTo() { this.howto.classList.remove('hidden'); }
  hideHowTo() { this.howto.classList.add('hidden'); }
  hideAll() { this.menu.classList.add('hidden'); this.char.classList.add('hidden'); this.pause.classList.add('hidden'); this.howto.classList.add('hidden'); }
}

/* ═══════════════════════════════════════════════════════════════
   STORY MANAGER
   ═══════════════════════════════════════════════════════════════ */
class StoryManager {
  constructor(callbacks) {
    this.cb = callbacks;
    this.progress = this._load();
    this.chapterIndex = 0; this.currentLine = 0;
    this._typing = false; this._advanceResolve = null; this._typeTimer = null;
    this.overlay = document.getElementById('story-overlay');
    this.dialogue = document.getElementById('story-dialogue');
    this.speaker = document.getElementById('story-speaker');
    this.text = document.getElementById('story-text');
    this.chapterEl = document.getElementById('story-chapter-info');
    this.titleEl = document.getElementById('story-title');
    this.subtitleEl = document.getElementById('story-subtitle');
    this.continueHint = document.getElementById('story-continue');
    this.resultOverlay = document.getElementById('story-result');
    this.resultTitle = document.getElementById('story-result-title');
    this.resultSub = document.getElementById('story-result-sub');
    this.resultBtn = document.getElementById('story-result-btn');
    this.abandonBtn = document.getElementById('story-abandon-btn');
    this._wireInputs();
  }
  _load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return 0;
      const n = parseInt(raw, 10); return isNaN(n) ? 0 : Math.max(0, Math.min(n, CHAPTERS.length - 1));
    } catch { return 0; }
  }
  _save() { try { localStorage.setItem(SAVE_KEY, String(this.progress)); } catch {} }
  _wireInputs() {
    this.overlay.addEventListener('click', () => this._advance());
    window.addEventListener('keydown', (e) => {
      if (this.overlay.classList.contains('hidden')) return;
      if (['Space','Enter','Escape'].includes(e.code)) { e.preventDefault(); this._advance(); }
    });
  }
  get chapter() { return CHAPTERS[this.chapterIndex]; }
  begin() { this.chapterIndex = this.progress; this._runChapterIntro(); }
  _showOverlay() { this.overlay.classList.remove('hidden'); this.dialogue.classList.remove('hidden'); }
  _hideOverlay() { this.overlay.classList.add('hidden'); }
  async _runChapterIntro() {
    const c = this.chapter;
    this.titleEl.textContent = c.title; this.subtitleEl.textContent = c.subtitle;
    this.chapterEl.textContent = `CHAPTER ${c.id} / ${CHAPTERS.length}`;
    await this._showDialogue(c.intro);
    this._hideOverlay();
    this.cb.onStartFight({
      opponentIdx:c.opponentIdx, difficulty:c.difficulty, statMod:c.statMod,
      opponentName:c.opponentName, isBoss:!!c.isBoss,
    });
  }
  async onMatchEnd(p1Wins, p2Wins) {
    const playerWon = p1Wins > p2Wins;
    if (playerWon) {
      const c = this.chapter;
      this.titleEl.textContent = 'VICTORY'; this.subtitleEl.textContent = c.subtitle;
      this.chapterEl.textContent = `CHAPTER ${c.id} / ${CHAPTERS.length}`;
      await this._showDialogue(c.outro);
      this._hideOverlay();
      if (this.chapterIndex < CHAPTERS.length - 1) {
        this.progress = this.chapterIndex + 1; this._save();
        this.chapterIndex = this.progress;
        this._runChapterIntro();
      } else {
        this.progress = 0; this._save();
        this._showResult('CHAMPION!', 'You conquered the Mech Arena', 'MAIN MENU', () => {
          this._hideOverlay(); this.cb.onQuit();
        });
      }
    } else {
      this._showResult('DEFEAT', 'You have fallen. Try again?', 'RETRY', () => {
        this._hideOverlay(); this._runChapterIntro();
      });
    }
  }
  _showResult(title, sub, btnLabel, onBtn) {
    this.resultOverlay.classList.remove('hidden');
    this.resultTitle.textContent = title; this.resultSub.textContent = sub;
    this.resultBtn.textContent = btnLabel;
    const cleanup = () => {
      this.resultBtn.onclick = null; this.abandonBtn.onclick = null;
      this.resultOverlay.classList.add('hidden');
    };
    this.resultBtn.onclick = () => { cleanup(); onBtn(); };
    this.abandonBtn.onclick = () => { cleanup(); this._hideOverlay(); this.cb.onQuit(); };
  }
  async _showDialogue(lines) {
    this._showOverlay();
    for (const line of lines) { await this._typeLine(line); await this._waitForAdvance(); }
  }
  _typeLine(line) {
    return new Promise((resolve) => {
      this.speaker.textContent = line.who;
      this.speaker.style.color = line.color || '#00eaff';
      this.speaker.style.textShadow = `0 0 12px ${line.color || '#00eaff'}`;
      this.text.textContent = ''; this.continueHint.style.opacity = '0';
      this._typing = true;
      const full = line.text; let i = 0;
      const tick = () => {
        if (!this._typing) { this.text.textContent = full; this.continueHint.style.opacity = '1'; resolve(); return; }
        if (i >= full.length) {
          this._typing = false; this.continueHint.style.opacity = '1'; resolve(); return;
        }
        this.text.textContent += full[i++];
        this._typeTimer = setTimeout(tick, 24);
      };
      tick();
    });
  }
  _waitForAdvance() { return new Promise((resolve) => { this._advanceResolve = resolve; }); }
  _advance() {
    if (this._typing) { this._typing = false; clearTimeout(this._typeTimer); return; }
    if (this._advanceResolve) { const r = this._advanceResolve; this._advanceResolve = null; r(); }
  }
  isActive() { return !this.overlay.classList.contains('hidden') || !this.resultOverlay.classList.contains('hidden'); }
}

/* ═══════════════════════════════════════════════════════════════
   TRAINING MODE
   ═══════════════════════════════════════════════════════════════ */
class TrainingMode {
  constructor(hud) {
    this.hud = hud; this.active = false;
    this.showHitboxes = false; this.showFrameData = false;
    this.infiniteHP = true; this.slowMotion = false;
    this.dummyMode = 'stand';
    this.stats = { maxCombo:0, currentCombo:0, totalDamage:0, hitCount:0, lastMoveName:'—', lastStartup:0, lastActive:0, lastRecovery:0 };
    this.currentChallenge = 0; this.challengeSequence = []; this.challengeProgress = 0;
    this.completedChallenges = new Set();
    this._buildDebugHelpers();
    this._buildPanel();
    this._buildChallengePanel();
  }
  _buildDebugHelpers() {
    this.helpers = { p1Hurt:null, p1Hit:null, p2Hurt:null, p2Hit:null };
    this.activeRing = null;
    this.helpersPending = true;
  }
  attachScene(scene) {
    this.scene = scene;
    const mk = (color) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.0),
        new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.2, side:THREE.DoubleSide, depthWrite:false }));
      m.visible = false; scene.add(m); return m;
    };
    const mkHit = (color) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.35, depthWrite:false, wireframe:true }));
      s.visible = false; scene.add(s); return s;
    };
    this.helpers.p1Hurt = mk(0x00eaff); this.helpers.p1Hit = mkHit(0xffe066);
    this.helpers.p2Hurt = mk(0xff2b6b); this.helpers.p2Hit = mkHit(0xff8800);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.75, 40),
      new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.5, side:THREE.DoubleSide, depthWrite:false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false;
    scene.add(ring); this.activeRing = ring;
    this.helpersPending = false;
  }
  _buildPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'training-panel'; this.panel.className = 'training-panel hidden';
    this.panel.innerHTML = `
      <div class="tp-header">TRAINING MODE</div>
      <div class="tp-row"><span class="tp-label">Max Combo</span><span class="tp-val" id="tp-maxcombo">0</span></div>
      <div class="tp-row"><span class="tp-label">Current</span><span class="tp-val" id="tp-curcombo">0</span></div>
      <div class="tp-row"><span class="tp-label">Damage</span><span class="tp-val" id="tp-dmg">0</span></div>
      <div class="tp-row"><span class="tp-label">Hits</span><span class="tp-val" id="tp-hits">0</span></div>
      <hr><div class="tp-header small">FRAME DATA</div>
      <div class="tp-row"><span class="tp-label">Last Move</span><span class="tp-val" id="tp-move">—</span></div>
      <div class="tp-frames">
        <div class="tp-frame-col"><b id="tp-startup">0</b><span>Startup</span></div>
        <div class="tp-frame-col active"><b id="tp-active">0</b><span>Active</span></div>
        <div class="tp-frame-col"><b id="tp-recovery">0</b><span>Recovery</span></div>
      </div>
      <hr><div class="tp-header small">OPTIONS · press key</div>
      <div class="tp-keyrow"><span class="kbd">F1</span><span>Hitboxes</span><span class="state" id="tp-hitbox-state">OFF</span></div>
      <div class="tp-keyrow"><span class="kbd">F2</span><span>Frame Data</span><span class="state" id="tp-frame-state">OFF</span></div>
      <div class="tp-keyrow"><span class="kbd">F3</span><span>Infinite HP</span><span class="state on" id="tp-hp-state">ON</span></div>
      <div class="tp-keyrow"><span class="kbd">F4</span><span>Slow Motion</span><span class="state" id="tp-slow-state">OFF</span></div>
      <div class="tp-keyrow"><span class="kbd">F5</span><span>Dummy AI</span><span class="state" id="tp-dummy-state">STAND</span></div>
      <div class="tp-keyrow"><span class="kbd">R</span><span>Reset Pos</span><span class="state"></span></div>`;
    document.body.appendChild(this.panel);
  }
  _buildChallengePanel() {
    this.challengePanel = document.createElement('div');
    this.challengePanel.id = 'challenge-panel'; this.challengePanel.className = 'challenge-panel hidden';
    this.challengePanel.innerHTML = `
      <div class="cp-header">COMBO CHALLENGES</div>
      <div class="cp-list" id="cp-list"></div>
      <div class="cp-progress">
        <div class="cp-bar"><div class="cp-fill" id="cp-fill"></div></div>
        <div class="cp-info"><span id="cp-name">—</span><span id="cp-hint">—</span></div>
      </div>`;
    document.body.appendChild(this.challengePanel);
    this._renderChallengeList();
  }
  _renderChallengeList() {
    const list = this.challengePanel.querySelector('#cp-list'); list.innerHTML = '';
    COMBO_CHALLENGES.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'cp-item'; row.dataset.idx = i;
      const done = this.completedChallenges.has(c.id);
      row.innerHTML = `<span class="cp-idx">${i + 1}</span><span class="cp-title">${c.name}</span><span class="cp-check">${done ? '✓' : ''}</span>`;
      list.appendChild(row);
    });
    this._updateChallengeHighlight();
  }
  _updateChallengeHighlight() {
    const list = this.challengePanel.querySelectorAll('.cp-item');
    list.forEach((el, i) => {
      el.classList.toggle('active', i === this.currentChallenge);
      el.classList.toggle('done', this.completedChallenges.has(COMBO_CHALLENGES[i].id));
    });
    const c = COMBO_CHALLENGES[this.currentChallenge];
    this.challengePanel.querySelector('#cp-name').textContent = c.name;
    this.challengePanel.querySelector('#cp-hint').textContent = c.hint;
    this.challengePanel.querySelector('#cp-fill').style.width = ((this.challengeProgress / c.seq.length) * 100) + '%';
  }
  enter(p1, p2) {
    this.active = true; this.p1 = p1; this.p2 = p2;
    this.panel.classList.remove('hidden');
    this.challengePanel.classList.remove('hidden');
    this.stats = { maxCombo:0, currentCombo:0, totalDamage:0, hitCount:0, lastMoveName:'—', lastStartup:0, lastActive:0, lastRecovery:0 };
    this.challengeProgress = 0; this.challengeSequence = [];
    this._updateChallengeHighlight(); this._updatePanel();
    this.hud.setBigText('TRAINING');
    setTimeout(() => this.hud.setBigText(''), 1200);
  }
  exit() {
    this.active = false;
    this.panel.classList.add('hidden'); this.challengePanel.classList.add('hidden');
    Object.values(this.helpers).forEach(h => { if (h) h.visible = false; });
    if (this.activeRing) this.activeRing.visible = false;
  }
  handleKeys(input) {
    if (!this.active) return;
    if (input.consumePress('F1')) {
      this.showHitboxes = !this.showHitboxes;
      const el = this.panel.querySelector('#tp-hitbox-state');
      el.textContent = this.showHitboxes ? 'ON' : 'OFF'; el.classList.toggle('on', this.showHitboxes);
    }
    if (input.consumePress('F2')) {
      this.showFrameData = !this.showFrameData;
      const el = this.panel.querySelector('#tp-frame-state');
      el.textContent = this.showFrameData ? 'ON' : 'OFF'; el.classList.toggle('on', this.showFrameData);
    }
    if (input.consumePress('F3')) {
      this.infiniteHP = !this.infiniteHP;
      const el = this.panel.querySelector('#tp-hp-state');
      el.textContent = this.infiniteHP ? 'ON' : 'OFF'; el.classList.toggle('on', this.infiniteHP);
    }
    if (input.consumePress('F4')) {
      this.slowMotion = !this.slowMotion;
      const el = this.panel.querySelector('#tp-slow-state');
      el.textContent = this.slowMotion ? 'ON' : 'OFF'; el.classList.toggle('on', this.slowMotion);
    }
    if (input.consumePress('F5')) {
      const order = ['stand','block','cpu','walk'];
      this.dummyMode = order[(order.indexOf(this.dummyMode) + 1) % order.length];
      this.panel.querySelector('#tp-dummy-state').textContent = this.dummyMode.toUpperCase();
    }
    if (input.consumePress('KeyR')) this._resetPositions();
    if (input.consumePress('Backspace')) { this.currentChallenge = (this.currentChallenge + 1) % COMBO_CHALLENGES.length; this.challengeProgress = 0; this._updateChallengeHighlight(); }
    if (input.consumePress('Slash')) { this.currentChallenge = (this.currentChallenge - 1 + COMBO_CHALLENGES.length) % COMBO_CHALLENGES.length; this.challengeProgress = 0; this._updateChallengeHighlight(); }
  }
  _resetPositions() {
    if (!this.p1 || !this.p2) return;
    this.p1.reset(-5, +1); this.p2.reset(+5, -1);
    this.stats.currentCombo = 0; this.stats.totalDamage = 0; this.stats.hitCount = 0;
    this.challengeProgress = 0; this.challengeSequence = [];
    this.hud.setCombo('p1', 0); this.hud.setCombo('p2', 0);
    this.hud.setBigText('RESET'); setTimeout(() => this.hud.setBigText(''), 500);
  }
  onHit(moveName, frameData, damage, blocked) {
    if (!this.active || blocked) return;
    this.stats.currentCombo++;
    if (this.stats.currentCombo > this.stats.maxCombo) this.stats.maxCombo = this.stats.currentCombo;
    this.stats.totalDamage += damage; this.stats.hitCount++;
    this.stats.lastMoveName = moveName;
    if (frameData) { this.stats.lastStartup = frameData.startup; this.stats.lastActive = frameData.active; this.stats.lastRecovery = frameData.recovery; }
    this._updatePanel();
    this._registerChallengeMove(moveName);
  }
  onComboBreak() { if (!this.active) return; this.stats.currentCombo = 0; this._updatePanel(); }
  _registerChallengeMove(moveName) {
    const c = COMBO_CHALLENGES[this.currentChallenge];
    const expected = c.seq[this.challengeProgress];
    if (moveName === expected) {
      this.challengeProgress++;
      if (this.challengeProgress >= c.seq.length) {
        this.completedChallenges.add(c.id);
        this.hud.setBigText(`✓ ${c.name}`);
        setTimeout(() => this.hud.setBigText(''), 1200);
        this.challengeProgress = 0;
        this._renderChallengeList();
      }
      this._updateChallengeHighlight();
    } else {
      if (moveName === c.seq[0]) this.challengeProgress = 1;
      else this.challengeProgress = 0;
      this._updateChallengeHighlight();
    }
  }
  update(rawDt) {
    if (!this.active || this.helpersPending) return;
    if (this.showHitboxes) this._updateHitboxMeshes();
    else {
      Object.values(this.helpers).forEach(h => { if (h) h.visible = false; });
      if (this.activeRing) this.activeRing.visible = false;
    }
    if (this.showFrameData && this.p1 && this.p2) this._updateFrameRing();
    else if (this.activeRing) this.activeRing.visible = false;
    if (this.infiniteHP) {
      if (this.p1 && this.p1.hp < this.p1.maxHP) this.p1.hp = this.p1.maxHP;
      if (this.p2 && this.p2.hp < this.p2.maxHP) this.p2.hp = this.p2.maxHP;
    }
  }
  _updateHitboxMeshes() {
    const p1 = this.p1, p2 = this.p2; if (!p1 || !p2) return;
    this.helpers.p1Hurt.visible = true;
    this.helpers.p1Hurt.position.set(p1.group.position.x, p1.group.position.y + 1.7, 0);
    this.helpers.p2Hurt.visible = true;
    this.helpers.p2Hurt.position.set(p2.group.position.x, p2.group.position.y + 1.7, 0);
    const h1 = this.helpers.p1Hit, h2 = this.helpers.p2Hit;
    const m1 = p1.getActiveHitbox();
    if (m1) { h1.visible = true; h1.position.copy(m1.center); h1.scale.setScalar(m1.radius); } else h1.visible = false;
    const m2 = p2.getActiveHitbox();
    if (m2) { h2.visible = true; h2.position.copy(m2.center); h2.scale.setScalar(m2.radius); } else h2.visible = false;
  }
  _updateFrameRing() {
    const p1 = this.p1; if (!p1) return;
    const attacking = p1.attackTimer > 0 || p1.launcherTimer > 0;
    if (attacking) {
      const t = p1.attackTimer > 0 ? 1 - (p1.attackTimer / p1.attackDuration) : 1 - (p1.launcherTimer / p1.launcherDuration);
      const active = t > 0.25 && t < 0.65;
      this.activeRing.visible = true;
      this.activeRing.position.set(p1.group.position.x, 0.03, 0);
      this.activeRing.material.color.setHex(active ? 0xffe066 : 0xff2b6b);
      this.activeRing.material.opacity = active ? 0.85 : 0.35;
      this.activeRing.scale.setScalar(1 + Math.sin(performance.now() * 0.02) * 0.08);
    } else this.activeRing.visible = false;
  }
  _updatePanel() {
    this.panel.querySelector('#tp-maxcombo').textContent = this.stats.maxCombo;
    this.panel.querySelector('#tp-curcombo').textContent = this.stats.currentCombo;
    this.panel.querySelector('#tp-dmg').textContent = Math.round(this.stats.totalDamage);
    this.panel.querySelector('#tp-hits').textContent = this.stats.hitCount;
    this.panel.querySelector('#tp-move').textContent = this.stats.lastMoveName;
    this.panel.querySelector('#tp-startup').textContent = this.stats.lastStartup;
    this.panel.querySelector('#tp-active').textContent = this.stats.lastActive;
    this.panel.querySelector('#tp-recovery').textContent = this.stats.lastRecovery;
  }
  getDummyInput() {
    const none = { left:false, right:false, jump:false, block:false, attack:false, ranged:false, ult:false, launcher:false };
    if (!this.p1 || !this.p2) return none;
    switch (this.dummyMode) {
      case 'stand': return none;
      case 'block': return { ...none, block:true };
      case 'walk': {
        const dir = Math.sin(performance.now() * 0.0006) > 0;
        return { ...none, left:!dir, right:dir };
      }
      case 'cpu': {
        const dx = this.p1.group.position.x - this.p2.group.position.x;
        const dist = Math.abs(dx);
        const input = { ...none };
        if (dist > 2) { if (dx < 0) input.left = true; else input.right = true; }
        else if (Math.random() < 0.06) input.attack = true;
        return input;
      }
    }
    return none;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SCENE
   ═══════════════════════════════════════════════════════════════ */
function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 25, 70);

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 5.2, 12.5); camera.lookAt(0, 2, 0);

  const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x223355, 0.8));
  const key = new THREE.DirectionalLight(0xaad4ff, 1.2);
  key.position.set(8, 16, 10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -20; key.shadow.camera.right = 20;
  key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
  scene.add(key);
  const rim1 = new THREE.PointLight(0x00eaff, 30, 30, 2); rim1.position.set(-12, 6, -6); scene.add(rim1);
  const rim2 = new THREE.PointLight(0xff2b6b, 30, 30, 2); rim2.position.set(12, 6, -6); scene.add(rim2);

  // Arena floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 20),
    new THREE.MeshStandardMaterial({ color:0x0a0f18, metalness:0.9, roughness:0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const grid = new THREE.GridHelper(40, 40, 0x00eaff, 0x0a3050);
  grid.material.opacity = 0.35; grid.material.transparent = true; grid.position.y = 0.01; scene.add(grid);

  const lineMat1 = new THREE.LineBasicMaterial({ color:0x00eaff });
  const lineMat2 = new THREE.LineBasicMaterial({ color:0xff2b6b });
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-20, 0.02, 10), new THREE.Vector3(20, 0.02, 10)]), lineMat1));
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-20, 0.02, -10), new THREE.Vector3(20, 0.02, -10)]), lineMat2));

  for (let i = 0; i < 10; i++) {
    const h = 4 + Math.random() * 6;
    const geo = new THREE.BoxGeometry(0.6, h, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      color:0x101820, emissive: i % 2 === 0 ? 0x00324a : 0x4a0018,
      emissiveIntensity:0.8, metalness:0.9, roughness:0.4 });
    const p = new THREE.Mesh(geo, mat);
    const side = i < 5 ? -1 : 1;
    p.position.set(side * (10 + Math.random() * 8), h / 2, -15 - Math.random() * 8);
    scene.add(p);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return { scene, camera, renderer };
}

/* ═══════════════════════════════════════════════════════════════
   POST-PROCESSING
   ═══════════════════════════════════════════════════════════════ */
class PostFX {
  constructor(renderer, scene, camera) {
    const w = window.innerWidth, h = window.innerHeight;
    const size = new THREE.Vector2(w, h);
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(size, 0.9, 0.6, 0.15);
    this.composer.addPass(this.bloom);
    this.afterimage = new AfterimagePass(0.85); this.afterimage.enabled = false;
    this.composer.addPass(this.afterimage);
    this.rgb = new ShaderPass(RGBShiftShader); this.rgb.uniforms.amount.value = 0.0;
    this.composer.addPass(this.rgb);
    this.vignette = new ShaderPass(VignetteShader);
    this.vignette.uniforms.offset.value = 1.1; this.vignette.uniforms.darkness.value = 1.25;
    this.composer.addPass(this.vignette);
    this.film = new ShaderPass(FilmShader);
    this.film.uniforms.nIntensity.value = 0.10; this.film.uniforms.sIntensity.value = 0.14;
    this.film.uniforms.grayscale.value = 0;
    this.composer.addPass(this.film);
    this.rgbPulse = 0; this.grainPulse = 0; this.afterimagePulse = 0;

    // Mobile: disable heavy passes
    if (window.innerWidth < 900 || (('ontouchstart' in window) && window.innerWidth < 1100)) {
      this.afterimage.enabled = false;
      this.film.enabled = false;
      this.bloom.strength = 0.7;
    }

    window.addEventListener('resize', () => {
      const W = window.innerWidth, H = window.innerHeight;
      this.composer.setSize(W, H); this.bloom.resolution.set(W, H);
    });
  }
  pulseHit(strength=0.008, grain=0.30) {
    this.rgbPulse = Math.max(this.rgbPulse, strength);
    this.grainPulse = Math.max(this.grainPulse, grain);
  }
  pulseCinematic() {
    this.rgbPulse = Math.max(this.rgbPulse, 0.022);
    this.grainPulse = Math.max(this.grainPulse, 0.7);
    this.afterimagePulse = 1.0; this.afterimage.enabled = true;
  }
  pulseBloom(amount=0.35) { this.bloom.strength = Math.min(2.2, this.bloom.strength + amount); }
  update(dt) {
    this.rgbPulse *= Math.exp(-dt * 7);
    this.grainPulse *= Math.exp(-dt * 4);
    this.afterimagePulse *= Math.exp(-dt * 2.2);
    this.rgb.uniforms.amount.value = this.rgbPulse;
    this.film.uniforms.nIntensity.value = 0.10 + this.grainPulse * 0.42;
    this.film.uniforms.sIntensity.value = 0.14 + this.grainPulse * 0.35;
    if (this.afterimage.enabled) {
      this.afterimage.uniforms.damp.value = 0.62 + (1 - this.afterimagePulse) * 0.28;
      if (this.afterimagePulse < 0.05) this.afterimage.enabled = false;
    }
    this.bloom.strength += (0.9 - this.bloom.strength) * Math.min(1, dt * 2.5);
    const targetVig = 1.25 + this.afterimagePulse * 0.6;
    this.vignette.uniforms.darkness.value += (targetVig - this.vignette.uniforms.darkness.value) * Math.min(1, dt * 8);
    this.composer.render();
  }
  render() { this.composer.render(); }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN GAME
   ═══════════════════════════════════════════════════════════════ */
const { scene, camera, renderer } = createScene();
const postfx = new PostFX(renderer, scene, camera);
const touch = new TouchManager();
const input = new InputManager(touch);
const hud = new HUD();
const vfx = new VFXManager(scene);
const time = new TimeManager();
const audio = new AudioManager();
const training = new TrainingMode(hud);
training.attachScene(scene);
vfx.screenFlashEl = document.getElementById('screen-flash');

function unlockAudio() {
  audio.init(); audio.startBGM();
  window.removeEventListener('keydown', unlockAudio);
  window.removeEventListener('click', unlockAudio);
}
window.addEventListener('keydown', unlockAudio);
window.addEventListener('click', unlockAudio);

touch.autoDetect();

// Game state
const game = {
  mode:'menu', state:'idle', paused:false,
  round:1, p1Wins:0, p2Wins:0, maxWins:2, stateTimer:2.5,
  p2IsAI:true, aiDifficulty:'medium',
  ultAnnounced:{ p1:false, p2:false },
  storyMode:false, trainingMode:false,
};

let p1 = null, p2 = null, ai = null;
const projectiles = [];
const combos = { p1:{count:0,timer:0}, p2:{count:0,timer:0} };
const currentCharIdx = { p1:0, p2:1 };

let p1PrevAtk=false, p2PrevAtk=false, p1PrevRng=false, p2PrevRng=false,
    p1PrevUlt=false, p2PrevUlt=false, p1PrevLaunch=false, p2PrevLaunch=false;

let shakeTime=0, shakeStrength=0;
function shakeCamera(strength=0.3, t=0.2) { shakeStrength = strength; shakeTime = t; }

// Menu
const menu = new MenuManager({
  onFight: (i1, i2) => { game.storyMode = false; startFight(i1, i2); },
  onResume: () => { game.paused = false; },
  onRestart: () => { game.paused = false; startFight(currentCharIdx.p1, currentCharIdx.p2); },
  onQuit: () => quitToMenu(),
  onStory: () => { story.begin(); },
  onTraining: () => {
    training.attachScene(scene);
    startFight(currentCharIdx.p1, currentCharIdx.p2, { trainingMode:true });
  },
});

// Story
const story = new StoryManager({
  onStartFight: (opts) => {
    const c = ROSTER[opts.opponentIdx];
    const mod = opts.statMod || {};
    const p2Stats = {
      ...c.stats,
      hp: Math.round(c.stats.hp * (mod.hp ?? 1)),
      meleeDamage: Math.round(c.stats.meleeDamage * (mod.damage ?? 1)),
      rangedDamage: Math.round(c.stats.rangedDamage * (mod.damage ?? 1)),
      ultDamage: Math.round(c.stats.ultDamage * (mod.damage ?? 1)),
      speed: c.stats.speed * (mod.speed ?? 1),
    };
    const p2Color = opts.isBoss ? 0xa050ff : c.color;
    game.storyMode = true;
    startFight(currentCharIdx.p1, opts.opponentIdx, {
      p2Stats, p2Color, opponentName:opts.opponentName,
      storyDifficulty:opts.difficulty, isBoss:opts.isBoss,
    });
  },
  onQuit: () => quitToMenu(),
});

function disposeRobots() {
  if (p1) { p1.dispose(); p1 = null; }
  if (p2) { p2.dispose(); p2 = null; }
  projectiles.forEach(pr => pr.destroy(vfx));
  projectiles.length = 0;
}

function startFight(p1Idx, p2Idx, opts = {}) {
  disposeRobots();
  currentCharIdx.p1 = p1Idx; currentCharIdx.p2 = p2Idx;
  const c1 = ROSTER[p1Idx], c2 = ROSTER[p2Idx];
  const p2Stats = opts.p2Stats || c2.stats;
  const p2Color = opts.p2Color != null ? opts.p2Color : c2.color;

  p1 = new Robot(scene, -5, +1, c1.color, c1.stats);
  p2 = new Robot(scene, +5, -1, p2Color, p2Stats);

  hud.p1name.textContent = `P1 · ${c1.name}`;
  hud.p2name.textContent = `P2 · ${opts.opponentName || c2.name}`;
  hud.p1hp.parentElement.parentElement.style.setProperty('--accent', c1.css);
  hud.p2hp.parentElement.parentElement.style.setProperty('--accent', opts.isBoss ? '#a050ff' : c2.css);

  const diff = opts.storyDifficulty || game.aiDifficulty;
  ai = new AIBot(p2, p1, diff);
  hud.setAIMode(true, diff);
  game.p2IsAI = true;

  if (opts.isBoss) story.overlay.classList.add('story-boss');
  else story.overlay.classList.remove('story-boss');

  game.mode = 'playing'; game.state = 'countdown';
  game.round = 1; game.p1Wins = 0; game.p2Wins = 0;
  game.stateTimer = 2.5; game.paused = false;
  game.ultAnnounced.p1 = false; game.ultAnnounced.p2 = false;
  game.trainingMode = !!opts.trainingMode;

  combos.p1 = { count:0, timer:0 }; combos.p2 = { count:0, timer:0 };
  hud.setCombo('p1', 0); hud.setCombo('p2', 0);
  p1PrevAtk=p2PrevAtk=p1PrevRng=p2PrevRng=p1PrevUlt=p2PrevUlt=p1PrevLaunch=p2PrevLaunch=false;

  hud.setWins(0, 0); hud.setRound(1); hud.setBigText('');

  if (game.trainingMode) {
    training.attachScene(scene);
    training.enter(p1, p2);
  } else {
    training.exit();
  }

  audio.roundStart();
}

function quitToMenu() {
  if (training.active) training.exit();
  game.trainingMode = false;
  disposeRobots();
  game.mode = 'menu'; game.paused = false;
  game.storyMode = false;
  story.overlay.classList.remove('story-boss');
  menu.showMenu();
}

function registerHit(key) {
  const c = combos[key];
  c.count += 1; c.timer = 1.15;
  hud.setCombo(key, c.count);
  if (c.count >= 3) shakeCamera(0.15 + c.count * 0.03, 0.12);
  postfx.pulseHit(Math.min(0.018, 0.006 + c.count * 0.002));
}

function tickCombos(dt) {
  for (const k of ['p1','p2']) {
    const c = combos[k];
    if (c.timer > 0) {
      c.timer -= dt;
      if (c.timer <= 0 && c.count > 0) {
        c.count = 0; hud.setCombo(k, 0);
        if (k === 'p1' && game.trainingMode && training.active) training.onComboBreak();
      }
    }
  }
}

function fireProjectile(owner, color) {
  const start = new THREE.Vector3(owner.group.position.x + owner.facing * 1.2, owner.group.position.y + 1.85, 0);
  const dir = new THREE.Vector3(owner.facing, 0, 0);
  projectiles.push(new Projectile(scene, start, dir, color, { speed:24, damage:owner.stats.rangedDamage, life:2.2, owner }));
  vfx.spawnFlash(start, color, 30);
  vfx.spawnSpark(start, color, 14, 5);
  shakeCamera(0.12, 0.1);
  audio.laser();
}

function resolveCombat(attacker, defender, defenderColor, attackerKey) {
  if (!attacker.alive || !defender.alive) return;
  const hb = attacker.getActiveHitbox();
  if (!hb || attacker.attackHasHit) return;
  const dx = Math.abs(defender.group.position.x - hb.center.x);
  const dy = Math.abs((defender.group.position.y + 1.7) - hb.center.y);
  const dz = Math.abs(defender.group.position.z - hb.center.z);
  if (dx < hb.radius && dy < 1.5 && dz < 1.0) {
    attacker.attackHasHit = true;
    const knockDir = defender.group.position.x >= attacker.group.position.x ? 1 : -1;

    if (defender.launchState === 'launched') {
      const airRes = defender.takeAirHit(attacker.stats.meleeDamage, knockDir);
      if (airRes) {
        attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + attacker.energyGainOnHit);
        const impactPos = new THREE.Vector3(defender.group.position.x, defender.group.position.y + 1.5, 0);
        vfx.spawnAirImpact(impactPos, attacker.accentColor);
        shakeCamera(0.22, 0.14); time.hitStop(0.06); audio.hit();
        postfx.pulseHit(0.012, 0.35);
        registerHit(attackerKey);
        if (game.trainingMode && training.active) {
          training.onHit('punch', { startup:8, active:6, recovery:12 }, airRes.damage, false);
        }
        if (airRes.juggleCount >= 3) {
          hud.setBigText(`${airRes.juggleCount}x AIR COMBO!`);
          setTimeout(() => { if (game.state === 'fighting') hud.setBigText(''); }, 700);
        }
      }
      return;
    }

    const result = defender.takeHit(attacker.stats.meleeDamage, knockDir, 0.4);
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + attacker.energyGainOnHit);
    const impactPos = new THREE.Vector3(
      (attacker.group.position.x + defender.group.position.x) * 0.5 + attacker.facing * 0.4, 1.9, 0);

    if (result.blocked) {
      vfx.spawnSpark(impactPos, 0x66ccff, 20, 5);
      vfx.spawnShockwave(impactPos, 0x66ccff, 1.6);
      vfx.spawnFlash(impactPos, 0x66ccff, 25);
      shakeCamera(0.15, 0.12); time.hitStop(0.05); audio.block();
      postfx.pulseHit(0.004, 0.15);
    } else {
      vfx.spawnHitImpact(impactPos, 0xffe066);
      vfx.spawnSpark(impactPos, defenderColor, 18, 6);
      shakeCamera(0.35, 0.22); time.hitStop(0.09); audio.hit();
      postfx.pulseHit(0.012, 0.35);
      registerHit(attackerKey);
      if (game.trainingMode && training.active) {
        training.onHit('punch', { startup:8, active:6, recovery:12 }, result.damage, false);
      }
    }
  }
}

function resolveLauncher(attacker, defender, defenderColor, attackerKey) {
  if (!attacker.alive || !defender.alive) return;
  const hb = attacker.getLauncherHitbox();
  if (!hb || attacker.launcherHasHit) return;
  if (defender.launchState !== 'none') return;
  const dx = Math.abs(defender.group.position.x - hb.center.x);
  const dy = Math.abs((defender.group.position.y + 1.7) - hb.center.y);
  const dz = Math.abs(defender.group.position.z - hb.center.z);
  if (dx < hb.radius && dy < 1.4 && dz < 1.0) {
    attacker.launcherHasHit = true;
    const dir = defender.group.position.x >= attacker.group.position.x ? 1 : -1;
    const result = defender.applyLaunch(dir, attacker.stats.meleeDamage * 1.4);
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 20);
    const impactPos = new THREE.Vector3(defender.group.position.x, defender.group.position.y + 1.9, 0);
    if (result.blocked) {
      vfx.spawnSpark(impactPos, 0x66ccff, 22, 6);
      vfx.spawnShockwave(impactPos, 0x66ccff, 1.8);
      audio.block(); time.hitStop(0.05); shakeCamera(0.2, 0.15);
    } else {
      vfx.spawnLaunchColumn(impactPos, attacker.accentColor);
      vfx.spawnAirImpact(impactPos, 0xffffff);
      shakeCamera(0.55, 0.3); time.hitStop(0.12); time.slowMo(0.55, 0.35); audio.hit();
      postfx.pulseHit(0.020, 0.55); postfx.pulseBloom(0.3);
      registerHit(attackerKey);
      if (game.trainingMode && training.active) {
        training.onHit('launcher', { startup:12, active:5, recovery:18 }, result.damage, false);
      }
      hud.setBigText('LAUNCH!');
      setTimeout(() => { if (game.state === 'fighting') hud.setBigText(''); }, 700);
    }
  }
}

function resolveUltimate(attacker, defender, attackerKey) {
  const blast = attacker.getUltBlast();
  if (!blast) return;
  const color = attacker.accentColor;
  vfx.spawnEmpBlast(blast.center, color);
  vfx.flashScreen('#ffffff', 380);
  shakeCamera(1.4, 0.9);
  time.slowMo(0.25, 0.9);
  audio.emp();
  postfx.pulseCinematic();
  postfx.pulseBloom(0.8);
  if (defender.alive) {
    const dx = defender.group.position.x - blast.center.x;
    const dz = defender.group.position.z - blast.center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < blast.radius) {
      const dir = dx >= 0 ? 1 : -1;
      const res = defender.takeHit(attacker.stats.ultDamage, dir * 1.8, 0.9);
      defender.velocityY = 6; defender.grounded = false;
      vfx.spawnHitImpact(new THREE.Vector3(defender.group.position.x, 1.8, 0), color);
      if (!res.blocked) { shakeCamera(0.8, 0.5); registerHit(attackerKey); }
      if (game.trainingMode && training.active) {
        training.onHit('ult', { startup:30, active:10, recovery:40 }, attacker.stats.ultDamage, false);
      }
    }
  }
}

function resetRound() {
  p1.reset(-5, +1); p2.reset(+5, -1);
  projectiles.forEach(pr => pr.destroy(vfx)); projectiles.length = 0;
  p1PrevAtk=p2PrevAtk=p1PrevRng=p2PrevRng=p1PrevUlt=p2PrevUlt=p1PrevLaunch=p2PrevLaunch=false;
  combos.p1 = { count:0, timer:0 }; combos.p2 = { count:0, timer:0 };
  hud.setCombo('p1', 0); hud.setCombo('p2', 0);
  game.ultAnnounced.p1 = false; game.ultAnnounced.p2 = false;
  game.state = 'countdown'; game.stateTimer = 2.5;
  hud.setBigText('');
  audio.roundStart();
}

/* ═══════════ GAME LOOP ═══════════ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);

  // MENU MODE
  if (game.mode === 'menu') {
    menu.handleKeyboard(input);
    touch.readInput();
    input.endFrame();
    vfx.update(rawDt);
    postfx.update(rawDt);
    return;
  }

  // Pause
  if (input.consumePress('Escape')) {
    if (game.paused) { game.paused = false; menu.hidePause(); }
    else if (game.state === 'fighting' || game.state === 'countdown') {
      game.paused = true; menu.showPause();
    }
  }

  // Training keys
  if (game.trainingMode && training.active) training.handleKeys(input);

  // Global toggles
  if (!game.paused) {
    if (input.consumePress('KeyT') && !game.storyMode && !game.trainingMode) {
      game.p2IsAI = !game.p2IsAI;
      hud.setAIMode(game.p2IsAI, game.aiDifficulty);
      hud.setBigText(game.p2IsAI ? 'P2: AI' : 'P2: HUMAN');
      setTimeout(() => { if (game.state === 'fighting' || game.state === 'countdown') hud.setBigText(''); }, 800);
    }
    if (input.consumePress('Digit1') && ai && !game.storyMode) { game.aiDifficulty='easy'; ai.setDifficulty('easy'); hud.setAIMode(game.p2IsAI,'easy'); }
    if (input.consumePress('Digit2') && ai && !game.storyMode) { game.aiDifficulty='medium'; ai.setDifficulty('medium'); hud.setAIMode(game.p2IsAI,'medium'); }
    if (input.consumePress('Digit3') && ai && !game.storyMode) { game.aiDifficulty='hard'; ai.setDifficulty('hard'); hud.setAIMode(game.p2IsAI,'hard'); }
  }

  if (game.paused) {
    input.endFrame(); vfx.update(rawDt); postfx.update(rawDt); return;
  }

  const gameDt = time.tick(rawDt);

  // Inputs
  const in1 = input.getP1();
  let in2;
  if (game.trainingMode && training.active) in2 = training.getDummyInput();
  else if (game.p2IsAI && ai) in2 = ai.update(rawDt);
  else in2 = input.getP2();

  // Attack edges
  if (game.state === 'fighting' && p1 && p2) {
    if (in1.attack && !p1PrevAtk && p1.alive) { p1.tryAttack(); audio.whoosh(); }
    if (in2.attack && !p2PrevAtk && p2.alive) { p2.tryAttack(); audio.whoosh(); }
    if (in1.ranged && !p1PrevRng && p1.canFireRanged()) { p1.startRangedCooldown(); fireProjectile(p1, p1.accentColor); }
    if (in2.ranged && !p2PrevRng && p2.canFireRanged()) { p2.startRangedCooldown(); fireProjectile(p2, p2.accentColor); }
    if (in1.launcher && !p1PrevLaunch && p1.alive) { p1.tryLauncher(); audio.whoosh(); }
    if (in2.launcher && !p2PrevLaunch && p2.alive) { p2.tryLauncher(); audio.whoosh(); }
    if (in1.ult && !p1PrevUlt && p1.energy >= p1.maxEnergy) {
      if (p1.tryUltimate()) { hud.setBigText('P1 OVERDRIVE!'); audio.ultReady(); time.slowMo(0.4, 0.9); }
    }
    if (in2.ult && !p2PrevUlt && p2.energy >= p2.maxEnergy) {
      if (p2.tryUltimate()) { hud.setBigText('P2 OVERDRIVE!'); audio.ultReady(); time.slowMo(0.4, 0.9); }
    }
  }
  p1PrevAtk = in1.attack; p2PrevAtk = in2.attack;
  p1PrevRng = in1.ranged; p2PrevRng = in2.ranged;
  p1PrevUlt = in1.ult; p2PrevUlt = in2.ult;
  p1PrevLaunch = in1.launcher; p2PrevLaunch = in2.launcher;

  // ULT ready pings
  if (p1 && p2) {
    if (p1.energy >= p1.maxEnergy && !game.ultAnnounced.p1 && game.state === 'fighting') {
      game.ultAnnounced.p1 = true;
      hud.setBigText('P1 ULTIMATE READY'); audio.ultReady();
      setTimeout(() => { if (game.state === 'fighting') hud.setBigText(''); }, 900);
    }
    if (p2.energy >= p2.maxEnergy && !game.ultAnnounced.p2 && game.state === 'fighting') {
      game.ultAnnounced.p2 = true;
      hud.setBigText('P2 ULTIMATE READY'); audio.ultReady();
      setTimeout(() => { if (game.state === 'fighting') hud.setBigText(''); }, 900);
    }
  }

  // Robots
  if (p1 && p2) {
    p1.update(gameDt, in1, ARENA_MIN, ARENA_MAX);
    p2.update(gameDt, in2, ARENA_MIN, ARENA_MAX);
    const mid = (p1.group.position.x + p2.group.position.x) * 0.5;
    if (p1.alive) p1.facing = p1.group.position.x < mid ? +1 : -1;
    if (p2.alive) p2.facing = p2.group.position.x < mid ? +1 : -1;

    resolveCombat(p1, p2, p2.accentColor, 'p1');
    resolveCombat(p2, p1, p1.accentColor, 'p2');
    resolveLauncher(p1, p2, p2.accentColor, 'p1');
    resolveLauncher(p2, p1, p1.accentColor, 'p2');
    resolveUltimate(p1, p2, 'p1');
    resolveUltimate(p2, p1, 'p2');

    // Wall bounce + landing
    [p1, p2].forEach((r) => {
      if (r.onWallBounce) {
        r.onWallBounce = false;
        const pos = new THREE.Vector3(r.group.position.x, r.group.position.y + 1.8, 0);
        vfx.spawnWallBounce(pos, r.accentColor);
        vfx.spawnAirImpact(pos, 0xffffff);
        shakeCamera(0.6, 0.35); time.hitStop(0.07); time.slowMo(0.4, 0.25); audio.hit();
        postfx.pulseHit(0.024, 0.6); postfx.pulseBloom(0.4);
        hud.setBigText('WALL BOUNCE!');
        setTimeout(() => { if (game.state === 'fighting') hud.setBigText(''); }, 700);
      }
      if (r.onLanding) {
        r.onLanding = false;
        const pos = new THREE.Vector3(r.group.position.x, 0.05, 0);
        vfx.spawnShockwave(pos, r.accentColor, 2.2);
        vfx.spawnSpark(pos, r.accentColor, 20, 6);
        shakeCamera(0.3, 0.2);
      }
      if (r.launchState === 'launched') {
        vfx.spawnAirTrail(new THREE.Vector3(r.group.position.x + (Math.random() - 0.5) * 0.4, r.group.position.y + 1.5, 0), r.accentColor);
      }
    });
  }

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.update(gameDt, vfx);
    const target = pr.owner === p1 ? p2 : p1;
    const attackerKey = pr.owner === p1 ? 'p1' : 'p2';
    if (target && target.alive && !pr.dead) {
      const dx = Math.abs(target.group.position.x - pr.position.x);
      const dy = Math.abs((target.group.position.y + 1.7) - pr.position.y);
      if (dx < 0.9 && dy < 1.2) {
        const knockDir = target.group.position.x >= pr.owner.group.position.x ? 1 : -1;
        const res = target.takeHit(pr.damage, knockDir * 0.5, 0.3);
        if (res.blocked) {
          vfx.spawnSpark(pr.position.clone(), 0x66ccff, 16, 5);
          vfx.spawnShockwave(pr.position.clone(), 0x66ccff, 1.4);
          time.hitStop(0.04); audio.block();
        } else {
          vfx.spawnHitImpact(pr.position.clone(), pr.color);
          time.hitStop(0.06); shakeCamera(0.25, 0.18); audio.hit();
          postfx.pulseHit(0.010, 0.3);
          registerHit(attackerKey);
          if (game.trainingMode && training.active && attackerKey === 'p1') {
            training.onHit('ranged', { startup:6, active:3, recovery:20 }, pr.damage, false);
          }
        }
        pr.destroy(vfx);
      }
    }
    if (pr.dead) projectiles.splice(i, 1);
  }

  tickCombos(rawDt);

  // Training update
  if (game.trainingMode && training.active) {
    training.update(rawDt);
    if (training.slowMotion && time.scale === 1) time.slowMo(0.35, 0.15);
  }

  // Round state machine
  if (p1 && p2) {
    if (game.state === 'countdown') {
      game.stateTimer -= rawDt;
      const t = 2.5 - game.stateTimer;
      if (t < 1.5) hud.setBigText(`ROUND ${game.round}`);
      else hud.setBigText('FIGHT!');
      if (game.stateTimer <= 0) { game.state = 'fighting'; hud.setBigText(''); audio.fight(); }
    }
    else if (game.state === 'fighting') {
      if (!game.trainingMode && (p1.hp <= 0 || p2.hp <= 0)) {
        if (p1.hp <= 0 && p1.alive) p1.ko();
        if (p2.hp <= 0 && p2.alive) p2.ko();
        const mid = (p1.group.position.x + p2.group.position.x) * 0.5;
        hud.setBigText('K.O.!');
        time.slowMo(0.12, 1.6);
        shakeCamera(1.2, 0.8);
        vfx.spawnShockwave(new THREE.Vector3(mid, 2, 0), 0xffffff, 12);
        vfx.spawnFlash(new THREE.Vector3(mid, 2, 0), 0xffffff, 120);
        vfx.flashScreen('#ffffff', 400);
        audio.ko();
        postfx.pulseCinematic(); postfx.pulseBloom(1.0);
        game.state = 'ko'; game.stateTimer = 2.6;
      }
    }
    else if (game.state === 'ko') {
      game.stateTimer -= rawDt;
      if (game.stateTimer <= 0) {
        if (p1.hp <= 0 && p2.hp > 0) game.p2Wins++;
        else if (p2.hp <= 0 && p1.hp > 0) game.p1Wins++;
        else { game.p1Wins++; game.p2Wins++; }
        const winner = p1.hp <= 0 && p2.hp > 0 ? 'P2 WINS!'
                     : p2.hp <= 0 && p1.hp > 0 ? 'P1 WINS!' : 'DRAW!';
        hud.setBigText(winner);
        hud.setWins(game.p1Wins, game.p2Wins);
        game.state = 'roundend'; game.stateTimer = 2.4;
      }
    }
    else if (game.state === 'roundend') {
      game.stateTimer -= rawDt;
      if (game.stateTimer <= 0) {
        const matchOver = game.p1Wins >= game.maxWins || game.p2Wins >= game.maxWins;
        if (matchOver) {
          const txt = game.p1Wins > game.p2Wins ? 'P1 WINS MATCH!'
                    : game.p2Wins > game.p1Wins ? 'P2 WINS MATCH!' : 'DRAW MATCH!';
          hud.setBigText(txt);
          game.state = 'matchover'; game.stateTimer = 3.2;
        } else {
          game.round++; hud.setRound(game.round); resetRound();
        }
      }
    }
    else if (game.state === 'matchover') {
      game.stateTimer -= rawDt;
      if (game.stateTimer <= 0) {
        if (game.trainingMode) {
          p1.reset(-5, +1); p2.reset(+5, -1);
          game.p1Wins = 0; game.p2Wins = 0; hud.setWins(0, 0);
          game.state = 'fighting'; hud.setBigText('RESET');
          setTimeout(() => hud.setBigText(''), 500);
        } else if (game.storyMode) {
          game.storyMode = false;
          story.onMatchEnd(game.p1Wins, game.p2Wins);
        } else {
          quitToMenu();
        }
      }
    }
  }

  // VFX + camera
  vfx.update(rawDt);
  if (p1 && p2) {
    const mid = (p1.group.position.x + p2.group.position.x) * 0.5;
    const targetX = mid * 0.35;
    camera.position.x += (targetX - camera.position.x) * Math.min(1, rawDt * 3);
    camera.lookAt(mid * 0.2, 2, 0);
    if (shakeTime > 0) {
      shakeTime -= rawDt;
      const s = shakeStrength * (shakeTime / 0.22);
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    hud.setHP((p1.hp / p1.maxHP) * 100, (p2.hp / p2.maxHP) * 100);
    hud.setEnergy((p1.energy / p1.maxEnergy) * 100, (p2.energy / p2.maxEnergy) * 100);
    if (touch.enabled) touch.setUltReady(p1.energy >= p1.maxEnergy);
  }

  input.endFrame();
  postfx.update(rawDt);
}

hud.setWins(0, 0);
hud.setRound(1);
menu.showMenu();
audio.roundStart();
animate();
