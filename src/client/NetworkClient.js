/**
 * Lightweight WebSocket client for multiplayer snapshots.
 * Gracefully degrades — if no server is available (dev mode), silently no-ops.
 */
export class NetworkClient {
  constructor() {
    this.id = null;
    this.ws = null;
    this.connected = false;
    this.playerCount = 1;

    /** Map<peerId, latestSnap> */
    this.peers = new Map();

    /** Callbacks */
    this.onPeerUpdate = null; // (id, snap) -> void
    this.onPeerLeave  = null; // (id)       -> void
    this.onConnect    = null; // ()         -> void
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
      this.ws = new WebSocket(`${proto}//${location.host}`);
    } catch {
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      if (this.onConnect) this.onConnect();
    };

    this.ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      switch (msg.type) {
        case 'welcome':
          this.id = msg.id;
          this.playerCount = msg.count;
          // Populate existing players
          for (const p of (msg.existing || [])) {
            this.peers.set(p.id, p);
            if (this.onPeerUpdate) this.onPeerUpdate(p.id, p);
          }
          break;

        case 'join':
          this.playerCount++;
          break;

        case 'snap': {
          const snap = {
            x: msg.x, y: msg.y, z: msg.z,
            vx: msg.vx, vy: msg.vy, vz: msg.vz,
            yaw: msg.yaw, onRamp: msg.onRamp,
          };
          this.peers.set(msg.id, snap);
          if (this.onPeerUpdate) this.onPeerUpdate(msg.id, snap);
          break;
        }

        case 'leave':
          this.peers.delete(msg.id);
          this.playerCount = Math.max(1, this.playerCount - 1);
          if (this.onPeerLeave) this.onPeerLeave(msg.id);
          break;
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
    };

    this.ws.onerror = () => {
      // Silent — dev mode has no WS server
    };
  }

  /**
   * Send a position/velocity snapshot to the server (throttled by caller).
   */
  sendSnapshot(position, velocity, yaw, onRamp) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'snap',
      x:  position.x | 0,
      y:  position.y | 0,
      z:  position.z | 0,
      vx: velocity.x | 0,
      vy: velocity.y | 0,
      vz: velocity.z | 0,
      yaw,
      onRamp: onRamp ? 1 : 0,
    }));
  }
}
