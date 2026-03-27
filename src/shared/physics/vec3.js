// Minimal Vector3 math for shared physics (no Three.js dependency)

export function create(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function copy(v) {
  return { x: v.x, y: v.y, z: v.z };
}

export function set(out, x, y, z) {
  out.x = x; out.y = y; out.z = z;
  return out;
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function lengthXZ(v) {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

export function normalize(v) {
  const len = length(v);
  if (len < 0.00001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function normalizeXZ(v) {
  const len = Math.sqrt(v.x * v.x + v.z * v.z);
  if (len < 0.00001) return { x: 0, y: v.y, z: 0 };
  return { x: v.x / len, y: 0, z: v.z / len };
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function lerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function clampLength(v, maxLen) {
  const len = length(v);
  if (len > maxLen) {
    const s = maxLen / len;
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }
  return copy(v);
}

// Project v onto plane defined by normal n
export function projectOnPlane(v, n) {
  const d = dot(v, n);
  return { x: v.x - n.x * d, y: v.y - n.y * d, z: v.z - n.z * d };
}
