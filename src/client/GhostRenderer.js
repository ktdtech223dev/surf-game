/**
 * Renders remote players as semi-transparent colored ghost capsules.
 * Each ghost is a simple cylinder body + sphere head.
 */
import * as THREE from 'three';

// One color per player id slot (cycles)
const GHOST_COLORS = [
  0x00cfff, // cyan
  0xff4488, // pink
  0x00ff88, // green
  0xffcc00, // gold
  0xff8800, // orange
  0xaa44ff, // purple
  0xff4444, // red
  0x44ffff, // teal
];

const BODY_HEIGHT  = 52;
const BODY_RADIUS  = 13;
const HEAD_RADIUS  = 14;
const EYE_OFFSET_Y = 68; // head center above feet

export class GhostRenderer {
  constructor(scene) {
    this.scene  = scene;
    this.ghosts = new Map(); // peerId -> THREE.Group
  }

  _makeGhost(id) {
    const color = GHOST_COLORS[id % GHOST_COLORS.length];
    const mat   = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: 0.65,
    });

    const group = new THREE.Group();

    // Body cylinder
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(BODY_RADIUS, BODY_RADIUS, BODY_HEIGHT, 10),
      mat,
    );
    body.position.y = BODY_HEIGHT / 2;
    group.add(body);

    // Head sphere
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS, 10, 7),
      mat,
    );
    head.position.y = EYE_OFFSET_Y;
    group.add(head);

    // Faint direction indicator (look direction chevron)
    const chevronGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-10, 0,  0),
      new THREE.Vector3(  0, 0, 18),
      new THREE.Vector3( 10, 0,  0),
    ]);
    const chevron = new THREE.Line(
      chevronGeo,
      new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true }),
    );
    chevron.position.y = EYE_OFFSET_Y;
    group.add(chevron);

    this.scene.add(group);
    this.ghosts.set(id, group);
    return group;
  }

  /**
   * Update or create ghost for a peer.
   * snap: { x, y, z, yaw, onRamp }
   */
  update(peerId, snap) {
    let group = this.ghosts.get(peerId);
    if (!group) group = this._makeGhost(peerId);

    group.position.set(snap.x, snap.y, snap.z);
    // Rotate the direction chevron to match peer's yaw
    const chevron = group.children[2];
    if (chevron) chevron.rotation.y = snap.yaw ?? 0;
  }

  remove(peerId) {
    const group = this.ghosts.get(peerId);
    if (!group) return;
    this.scene.remove(group);
    group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.ghosts.delete(peerId);
  }

  clear() {
    for (const id of [...this.ghosts.keys()]) this.remove(id);
  }
}
