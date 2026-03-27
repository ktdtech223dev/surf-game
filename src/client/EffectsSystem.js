/**
 * EffectsSystem — All visual polish effects
 * - Screen shake (camera offset, spring-back)
 * - Hit flash (red overlay pulse)
 * - Kill flash (cyan overlay)
 * - Landing stomp (squish)
 * - Speed lines (canvas radial overlay)
 * - Floating combat text (+XP, KILL, etc.)
 * - Impact sparks (Three.js particle pool)
 * - Muzzle flash (point light burst)
 * - Edge glow on near-miss bullets
 * - Checkpoint ripple
 */
import * as THREE from 'three';

// ── Floating text pool ────────────────────────────────────────────────────────
const _floatPool = [];
function _getFloatEl() {
  for (const el of _floatPool) if (!el.parentNode) return el;
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; pointer-events:none; font-family:monospace; font-weight:900;
    z-index:7000; white-space:nowrap; text-shadow:0 2px 8px rgba(0,0,0,0.8);
    will-change:transform,opacity;
  `;
  document.body.appendChild(el);
  _floatPool.push(el);
  return el;
}

export class EffectsSystem {
  /**
   * @param {THREE.Camera} camera
   * @param {THREE.Scene}  scene
   */
  constructor(camera, scene) {
    this._camera = camera;
    this._scene  = scene;

    // Screen shake
    this._shakeX    = 0; this._shakeY    = 0;
    this._shakeVX   = 0; this._shakeVY   = 0;
    this._shakeDecay = 0.78;

    // Speed lines
    this._speedCanvas = null;
    this._speedCtx    = null;
    this._speedIntensity = 0;
    this._targetSpeedIntensity = 0;
    this._buildSpeedLines();

    // Overlays
    this._hitFlashEl  = this._buildOverlay('hit-flash-overlay',  'rgba(255,30,30,0)');
    this._killFlashEl = this._buildOverlay('kill-flash-overlay',  'rgba(0,207,255,0)');
    this._stompEl     = this._buildOverlay('stomp-overlay',       'rgba(255,255,255,0)');

    // Particle pool (Three.js meshes)
    this._particlePool = [];
    this._activeParticles = [];
    this._buildParticlePool(80);

    // Muzzle flash light
    this._muzzleLight = new THREE.PointLight(0xffaa33, 0, 60);
    this._muzzleLight.userData.permanent = true;
    scene.add(this._muzzleLight);

    // Floaters active list
    this._floaters = [];

    // Checkpoint ring geometry
    this._checkRings = [];
  }

  // ── Screen shake ───────────────────────────────────────────────────────────

  shake(intensity = 1.0, duration = 0.15) {
    const mag = intensity * 0.08;
    this._shakeVX += (Math.random() - 0.5) * mag * 2;
    this._shakeVY += (Math.random() - 0.5) * mag * 2;
  }

  // ── Hit flash (red) ────────────────────────────────────────────────────────

  hitFlash(intensity = 1.0) {
    this._pulse(this._hitFlashEl, `rgba(220,30,30,${0.35 * intensity})`, 80, 400);
    this.shake(intensity * 0.8);
  }

  // ── Kill flash (cyan) ──────────────────────────────────────────────────────

  killFlash() {
    this._pulse(this._killFlashEl, 'rgba(0,207,255,0.22)', 60, 300);
    this.shake(0.5);
    this.floatText('KILL', { color: '#00cfff', size: 22, duration: 1.0 });
  }

  // ── Landing stomp ──────────────────────────────────────────────────────────

  landStomp(speed = 300) {
    const s = Math.min(1, speed / 800);
    if (s < 0.15) return;
    this._pulse(this._stompEl, `rgba(255,255,255,${0.12 * s})`, 30, 200);
    this.shake(s * 1.2, 0.1);
  }

  // ── Speed lines intensity (0–1) ────────────────────────────────────────────

  setSpeed(hSpeed) {
    this._targetSpeedIntensity = Math.max(0, Math.min(1, (hSpeed - 500) / 1200));
  }

  // ── Floating combat text ───────────────────────────────────────────────────

  floatText(text, {
    color = '#ffffff',
    size  = 16,
    x     = null,   // null = center-ish
    y     = null,
    duration = 1.2,
  } = {}) {
    const el = _getFloatEl();
    const cx = x ?? (window.innerWidth  * (0.48 + (Math.random() - 0.5) * 0.08));
    const cy = y ?? (window.innerHeight * (0.38 + (Math.random() - 0.5) * 0.06));
    el.style.fontSize = `${size}px`;
    el.style.color    = color;
    el.style.left     = `${cx}px`;
    el.style.top      = `${cy}px`;
    el.style.opacity  = '1';
    el.style.transform = 'translateY(0)';
    el.style.transition = 'none';
    el.textContent = text;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `transform ${duration}s ease-out, opacity ${duration * 0.6}s ${duration * 0.4}s ease-in`;
        el.style.transform  = `translateY(-${40 + size}px)`;
        el.style.opacity    = '0';
      });
    });

    setTimeout(() => { if (el.parentNode) document.body.removeChild(el); }, duration * 1000 + 100);
    this._floaters.push({ el, expires: performance.now() + duration * 1000 });
  }

  // XP gain float
  floatXP(amount, x = null, y = null) {
    this.floatText(`+${amount} XP`, { color: '#00cfff', size: 15, x, y, duration: 1.4 });
  }

  // ── Impact sparks (Three.js) ───────────────────────────────────────────────

  spawnSparks(worldPos, color = 0xffaa33, count = 8) {
    const col = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      if (!p) break;
      p.mesh.position.copy(worldPos);
      p.mesh.material.color.copy(col);
      p.vx = (Math.random() - 0.5) * 60;
      p.vy = Math.random() * 40 + 10;
      p.vz = (Math.random() - 0.5) * 60;
      p.life = 0.35 + Math.random() * 0.25;
      p.maxLife = p.life;
      p.mesh.scale.setScalar(0.8 + Math.random() * 1.2);
      p.mesh.visible = true;
      this._activeParticles.push(p);
    }
  }

  // Blood/hit sparks at victim position
  spawnBlood(worldPos) {
    this.spawnSparks(worldPos, 0xff2222, 6);
  }

  // ── Muzzle flash ───────────────────────────────────────────────────────────

  muzzleFlash(worldPos) {
    this._muzzleLight.position.copy(worldPos);
    this._muzzleLight.intensity = 3.5;
    setTimeout(() => { this._muzzleLight.intensity = 0; }, 55);
  }

  // ── Checkpoint ring ────────────────────────────────────────────────────────

  checkpointRing(worldPos, color = 0x00cfff) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(12, 0.8, 6, 24),
      new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 })
    );
    ring.position.copy(worldPos);
    ring.rotation.x = Math.PI / 2;
    this._scene.add(ring);
    this._checkRings.push({ mesh: ring, life: 0.8, maxLife: 0.8 });
  }

  // ── Main tick ──────────────────────────────────────────────────────────────

  tick(dt, cameraOffset) {
    // Spring decay shake
    this._shakeVX *= this._shakeDecay;
    this._shakeVY *= this._shakeDecay;
    this._shakeX  += this._shakeVX;
    this._shakeY  += this._shakeVY;
    this._shakeX  *= 0.6;
    this._shakeY  *= 0.6;
    if (cameraOffset) {
      cameraOffset.x += this._shakeX;
      cameraOffset.y += this._shakeY;
    }

    // Speed lines
    this._speedIntensity += (this._targetSpeedIntensity - this._speedIntensity) * 0.08;
    this._drawSpeedLines(this._speedIntensity);

    // Particles
    for (let i = this._activeParticles.length - 1; i >= 0; i--) {
      const p = this._activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this._activeParticles.splice(i, 1);
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 120 * dt; // gravity
      const frac = p.life / p.maxLife;
      p.mesh.material.opacity = frac;
      p.mesh.scale.setScalar(frac * 1.5);
    }

    // Checkpoint rings
    for (let i = this._checkRings.length - 1; i >= 0; i--) {
      const r = this._checkRings[i];
      r.life -= dt;
      if (r.life <= 0) { this._scene.remove(r.mesh); r.mesh.geometry.dispose(); this._checkRings.splice(i, 1); continue; }
      const frac = r.life / r.maxLife;
      r.mesh.material.opacity = frac * 0.9;
      r.mesh.scale.setScalar(1 + (1 - frac) * 2.5);
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  _buildOverlay(id, color) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText = `
        position:fixed; inset:0; pointer-events:none; z-index:6500;
        background:${color}; transition:background 0.06s;
      `;
      document.body.appendChild(el);
    }
    return el;
  }

  _pulse(el, color, onMs, offMs) {
    el.style.transition = 'none';
    el.style.background = color;
    setTimeout(() => {
      el.style.transition = `background ${offMs}ms ease-out`;
      el.style.background = color.replace(/,[^,]+\)$/, ',0)');
    }, onMs);
  }

  _buildSpeedLines() {
    const canvas = document.createElement('canvas');
    canvas.id = 'speed-lines-canvas';
    canvas.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:200;
      width:100%; height:100%; opacity:1;
    `;
    document.body.appendChild(canvas);
    this._speedCanvas = canvas;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    this._speedCtx = canvas.getContext('2d');
  }

  _drawSpeedLines(intensity) {
    const ctx = this._speedCtx;
    const w   = this._speedCanvas.width;
    const h   = this._speedCanvas.height;
    ctx.clearRect(0, 0, w, h);
    if (intensity < 0.02) return;

    const cx   = w / 2;
    const cy   = h / 2;
    const numLines = Math.floor(24 + intensity * 40);
    const maxLen   = Math.sqrt(cx * cx + cy * cy) * 0.85;
    const minLen   = maxLen * (0.2 + intensity * 0.4);
    const alpha    = intensity * 0.55;

    ctx.strokeStyle = `rgba(160, 220, 255, ${alpha})`;
    ctx.lineWidth   = 0.8 + intensity * 1.2;

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const len   = minLen + Math.random() * (maxLen - minLen) * 0.6;
      const near  = 8 + intensity * 40;
      const cos   = Math.cos(angle);
      const sin   = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cx + cos * near, cy + sin * near);
      ctx.lineTo(cx + cos * (near + len), cy + sin * (near + len));
      ctx.stroke();
    }
  }

  _buildParticlePool(size) {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    for (let i = 0; i < size; i++) {
      const mat  = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this._scene.add(mesh);
      this._particlePool.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 });
    }
  }

  _getParticle() {
    for (const p of this._particlePool) {
      if (!p.mesh.visible) return p;
    }
    return null;
  }
}
