// Simple collision world using plane-based geometry
// Robust collision: sweep point against planes with thickness

import * as Vec3 from './vec3.js';
import { PLAYER_RADIUS } from './constants.js';

export class CollisionWorld {
  constructor() {
    this.planes = [];
    this.killZones = [];
  }

  /**
   * Add a quad collision surface with explicit normal.
   * normalHint: the desired facing direction of this surface.
   */
  addQuadWithNormal(v0, v1, v2, v3, normalHint) {
    const normal = Vec3.normalize(normalHint);

    const minX = Math.min(v0.x, v1.x, v2.x, v3.x);
    const maxX = Math.max(v0.x, v1.x, v2.x, v3.x);
    const minY = Math.min(v0.y, v1.y, v2.y, v3.y);
    const maxY = Math.max(v0.y, v1.y, v2.y, v3.y);
    const minZ = Math.min(v0.z, v1.z, v2.z, v3.z);
    const maxZ = Math.max(v0.z, v1.z, v2.z, v3.z);

    const pad = PLAYER_RADIUS + 20;

    this.planes.push({
      point: Vec3.copy(v0),
      normal,
      vertices: [v0, v1, v2, v3],
      aabb: {
        min: Vec3.create(minX - pad, minY - pad, minZ - pad),
        max: Vec3.create(maxX + pad, maxY + pad, maxZ + pad),
      },
    });
  }

  /**
   * Auto-compute normal from vertex winding
   */
  addQuad(v0, v1, v2, v3) {
    const edge1 = Vec3.sub(v1, v0);
    const edge2 = Vec3.sub(v3, v0);
    // Standard CCW cross product
    const normal = Vec3.normalize(Vec3.cross(edge2, edge1));
    this.addQuadWithNormal(v0, v1, v2, v3, normal);
  }

  addFloor(x, z, width, depth, y = 0) {
    const hw = width / 2;
    const hd = depth / 2;
    const v0 = Vec3.create(x - hw, y, z - hd);
    const v1 = Vec3.create(x + hw, y, z - hd);
    const v2 = Vec3.create(x + hw, y, z + hd);
    const v3 = Vec3.create(x - hw, y, z + hd);
    // Floor always faces up
    this.addQuadWithNormal(v0, v1, v2, v3, Vec3.create(0, 1, 0));
  }

  addKillZone(min, max) {
    this.killZones.push({ min, max });
  }

  /**
   * Trace movement from start to end. Returns collision info.
   */
  traceMove(start, end, velocity) {
    let bestFraction = 1.0;
    let bestNormal = null;

    for (const plane of this.planes) {
      // Quick AABB rejection
      const testMin = Vec3.create(
        Math.min(start.x, end.x), Math.min(start.y, end.y), Math.min(start.z, end.z)
      );
      const testMax = Vec3.create(
        Math.max(start.x, end.x), Math.max(start.y, end.y), Math.max(start.z, end.z)
      );

      if (testMax.x < plane.aabb.min.x || testMin.x > plane.aabb.max.x ||
          testMax.y < plane.aabb.min.y || testMin.y > plane.aabb.max.y ||
          testMax.z < plane.aabb.min.z || testMin.z > plane.aabb.max.z) {
        continue;
      }

      const result = this.tracePlane(start, end, plane);
      if (result !== null && result.fraction < bestFraction) {
        bestFraction = result.fraction;
        bestNormal = plane.normal;
      }
    }

    // Kill zone check
    for (const kz of this.killZones) {
      if (end.x >= kz.min.x && end.x <= kz.max.x &&
          end.y >= kz.min.y && end.y <= kz.max.y &&
          end.z >= kz.min.z && end.z <= kz.max.z) {
        return {
          hit: true,
          position: Vec3.create(0, 50, 0),
          normal: Vec3.create(0, 1, 0),
          fraction: 0,
          killed: true,
        };
      }
    }

    if (bestNormal) {
      const hitPos = Vec3.lerp(start, end, bestFraction);
      const nudged = Vec3.add(hitPos, Vec3.scale(bestNormal, 0.125));
      return { hit: true, position: nudged, normal: bestNormal, fraction: bestFraction };
    }

    return { hit: false, position: Vec3.copy(end) };
  }

  tracePlane(start, end, plane) {
    const { point, normal, vertices } = plane;

    const startDist = Vec3.dot(Vec3.sub(start, point), normal) - PLAYER_RADIUS;
    const endDist = Vec3.dot(Vec3.sub(end, point), normal) - PLAYER_RADIUS;

    // Both on front side
    if (startDist > 0 && endDist > 0) return null;
    // Both well behind
    if (startDist < -PLAYER_RADIUS * 2 && endDist < -PLAYER_RADIUS * 2) return null;
    // Moving away
    if (endDist >= startDist && startDist > 0) return null;
    // Parallel
    if (Math.abs(startDist - endDist) < 0.0001) return null;

    let fraction = startDist / (startDist - endDist);
    fraction = Math.max(0, Math.min(1, fraction));

    const hitPoint = Vec3.lerp(start, end, fraction);

    if (this.pointNearQuad(hitPoint, vertices, PLAYER_RADIUS)) {
      return { fraction };
    }

    return null;
  }

  pointNearQuad(p, verts, tolerance) {
    const [v0, v1, v2, v3] = verts;

    const e0 = Vec3.sub(v1, v0);
    const e1 = Vec3.sub(v3, v0);
    const pp = Vec3.sub(p, v0);

    const d00 = Vec3.dot(e0, e0);
    const d01 = Vec3.dot(e0, e1);
    const d11 = Vec3.dot(e1, e1);
    const dp0 = Vec3.dot(pp, e0);
    const dp1 = Vec3.dot(pp, e1);

    const denom = d00 * d11 - d01 * d01;
    if (Math.abs(denom) < 0.0001) return false;

    const u = (d11 * dp0 - d01 * dp1) / denom;
    const v = (d00 * dp1 - d01 * dp0) / denom;

    const tolU = tolerance / Math.sqrt(d00);
    const tolV = tolerance / Math.sqrt(d11);

    return u >= -tolU && u <= 1 + tolU && v >= -tolV && v <= 1 + tolV;
  }
}
