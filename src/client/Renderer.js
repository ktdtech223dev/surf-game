// Three.js renderer — Krunker-style low-poly aesthetic with surf polish

import * as THREE from 'three';

const BASE_FOV       = 90;
const MAX_FOV_BONUS  = 22;   // +22° at full speed
const FOV_SPEED_SCALE = 1500;
const FOV_SMOOTH     = 0.08;

export class Renderer {
  constructor() {
    this.scene    = new THREE.Scene();
    this.camera   = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 1, 14000);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0d0d1a);
    this.renderer.shadowMap.enabled = false;

    document.body.prepend(this.renderer.domElement);

    // ── Lighting ──────────────────────────────────────────────
    this.scene.add(new THREE.AmbientLight(0x8899cc, 0.75));

    const sun = new THREE.DirectionalLight(0xffeedd, 1.1);
    sun.position.set(300, 800, 200);
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x4466ff, 0.35);
    rim.position.set(-200, 100, -500);
    this.scene.add(rim);

    // ── Fog ───────────────────────────────────────────────────
    this.scene.fog = new THREE.Fog(0x0d0d1a, 4000, 10000);

    // ── Sky ───────────────────────────────────────────────────
    this._addSkybox();
    this._addStars();

    this.velocityArrow = null;
    this._baseFov      = BASE_FOV;
    this._targetFov    = BASE_FOV;

    window.addEventListener('resize', () => this._onResize());
  }

  /** Change base FOV (from settings) */
  setFOV(fov) {
    this._baseFov   = Math.max(60, Math.min(130, fov));
    this._targetFov = this._baseFov;
  }

  _addSkybox() {
    const skyGeo = new THREE.SphereGeometry(11000, 16, 8);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          float t = clamp((normalize(vPos).y + 0.25) / 1.25, 0.0, 1.0);
          vec3 horizon = vec3(0.04, 0.04, 0.14);
          vec3 zenith  = vec3(0.01, 0.01, 0.07);
          gl_FragColor = vec4(mix(horizon, zenith, t), 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));
  }

  _addStars() {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random points on upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.5; // upper half only
      const r     = 9500 + Math.random() * 1000;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaabbdd, size: 8, sizeAttenuation: true });
    this.scene.add(new THREE.Points(geo, mat));
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  addBox(x, y, z, w, h, d, color) {
    const geo  = new THREE.BoxGeometry(w, h, d);
    const mat  = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const edges = new THREE.EdgesGeometry(geo);
    const line  = new THREE.LineSegments(edges,
      new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.2, transparent: true }));
    mesh.add(line);
    return mesh;
  }

  /**
   * Update camera position, look direction, FOV and roll tilt.
   * roll (radians): positive = lean right, negative = lean left
   */
  updateCamera(position, yaw, pitch, speed = 0, roll = 0) {
    const eyeH = 56;
    this.camera.position.set(position.x, position.y + eyeH, position.z);

    const lookX = -Math.sin(yaw) * Math.cos(pitch);
    const lookY =  Math.sin(pitch);
    const lookZ = -Math.cos(yaw) * Math.cos(pitch);

    // Camera roll: tilt the up-vector sideways along the horizontal right axis
    const hLen  = Math.sqrt(lookX * lookX + lookZ * lookZ);
    const rightX = hLen > 0.001 ? -lookZ / hLen : -1;
    const rightZ = hLen > 0.001 ?  lookX / hLen :  0;
    this.camera.up.set(
      Math.sin(roll) * rightX,
      Math.cos(roll),
      Math.sin(roll) * rightZ,
    );

    this.camera.lookAt(
      position.x + lookX * 100,
      position.y + eyeH + lookY * 100,
      position.z + lookZ * 100,
    );

    // Dynamic FOV scales with horizontal speed
    const fovBonus   = MAX_FOV_BONUS * Math.min(1, speed / FOV_SPEED_SCALE);
    this._targetFov  = this._baseFov + fovBonus;
    this.camera.fov += (this._targetFov - this.camera.fov) * FOV_SMOOTH;
    this.camera.updateProjectionMatrix();
  }

  updateVelocityArrow(position, velocity) {
    if (this.velocityArrow) {
      this.scene.remove(this.velocityArrow);
      this.velocityArrow = null;
    }

    const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    if (speed < 10) return;

    const dir    = new THREE.Vector3(velocity.x, 0, velocity.z).normalize();
    const origin = new THREE.Vector3(position.x, position.y + 12, position.z);
    const len    = Math.min(speed / 4, 260);
    const color  = speed > 320 ? 0x00cfff : 0x00ff88;

    this.velocityArrow = new THREE.ArrowHelper(dir, origin, len, color, 18, 10);
    this.scene.add(this.velocityArrow);
  }

  /**
   * Update the speed vignette overlay opacity (0..1).
   */
  setVignetteIntensity(t) {
    const el = document.getElementById('speed-vignette');
    if (el) el.style.opacity = t.toFixed(3);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
