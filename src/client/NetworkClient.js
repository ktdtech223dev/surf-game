/**
 * NetworkClient — Phase 2/3
 * Full combat + social WebSocket protocol.
 * Gracefully degrades — no-ops if no server available.
 */
export class NetworkClient {
  constructor() {
    this.id          = null;
    this.ws          = null;
    this.connected   = false;
    this.playerCount = 1;
    this.pingMs      = 0;

    /** Map<peerId, latestSnap> */
    this.peers = new Map();

    // ── Callbacks ──────────────────────────────────────────────────────────
    this.onWelcome     = null; // (id, name) → void
    this.onPeerUpdate  = null; // (id, snap) → void
    this.onPeerLeave   = null; // (id) → void
    this.onConnect     = null; // () → void
    this.onDmg         = null; // (targetId, shooterId, hp) → void  (someone else got hit)
    this.onHurt        = null; // (damage, hp) → void  (local player got hit)
    this.onKill        = null; // ({ killerId, victimId, killerName, victimName }) → void
    this.onRespawn     = null; // (hp) → void
    this.onHitConfirm  = null; // (targetId) → void
    this.onPlayerList  = null; // (list) → void
    this.onChat        = null; // (id, name, text) → void
    this.onMetaUpdate  = null; // (id, name, color) → void
    this.onFinish      = null; // ({ id, name, time }) → void
    this.onLeaderboard = null; // (list) → void

    this._pingInterval    = null;
    this._pingSentAt      = 0;
    this._reconnectTimer  = null;
    this._reconnectDelay  = 2000; // ms
    this._proto           = null;
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this._proto = proto;
    try {
      this.ws = new WebSocket(`${proto}//${location.host}`);
    } catch {
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      // Ping every 2 seconds
      this._pingInterval = setInterval(() => this._sendPing(), 2000);
      if (this.onConnect) this.onConnect();
    };

    this.ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      this._handle(msg);
    };

    this.ws.onclose = () => {
      this.connected = false;
      clearInterval(this._pingInterval);
      this._showReconnecting(true);
      // Auto-reconnect after delay
      this._reconnectTimer = setTimeout(() => this._reconnect(), this._reconnectDelay);
    };

    this.ws.onerror = () => {};
  }

  // ── Inbound ───────────────────────────────────────────────────────────────

  _handle(msg) {
    switch (msg.type) {

      case 'welcome':
        this.id          = msg.id;
        this.playerCount = msg.count;
        if (this.onWelcome) this.onWelcome(msg.id, msg.name);
        for (const p of (msg.existing || [])) {
          this.peers.set(p.id, p);
          if (this.onPeerUpdate) this.onPeerUpdate(p.id, p, msg.t ?? Date.now());
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
        if (this.onPeerUpdate) this.onPeerUpdate(msg.id, snap, msg.t ?? Date.now());
        break;
      }

      case 'leave':
        this.peers.delete(msg.id);
        this.playerCount = Math.max(1, this.playerCount - 1);
        if (this.onPeerLeave) this.onPeerLeave(msg.id);
        break;

      case 'dmg':
        if (this.onDmg) this.onDmg(msg.targetId, msg.shooterId, msg.hp);
        break;

      case 'hurt':
        if (this.onHurt) this.onHurt(msg.damage, msg.hp);
        break;

      case 'kill':
        if (this.onKill) this.onKill({
          killerId:   msg.killerId,
          victimId:   msg.victimId,
          killerName: msg.killerName,
          victimName: msg.victimName,
        });
        break;

      case 'respawn':
        if (this.onRespawn) this.onRespawn(msg.hp);
        break;

      case 'hitConfirm':
        if (this.onHitConfirm) this.onHitConfirm(msg.targetId);
        break;

      case 'players':
        this.playerCount = msg.list.length || 1;
        if (this.onPlayerList) this.onPlayerList(msg.list);
        break;

      // Legacy alias
      case 'playerList':
        this.playerCount = (msg.list || []).length || 1;
        if (this.onPlayerList) this.onPlayerList(msg.list || []);
        break;

      case 'chat':
        if (this.onChat) this.onChat(msg.id, msg.name, msg.text);
        break;

      case 'meta':
        if (this.onMetaUpdate) this.onMetaUpdate(msg.id, msg.name, msg.color);
        break;

      case 'finish':
        if (this.onFinish) this.onFinish({ id: msg.id, name: msg.name, time: msg.time });
        break;

      case 'leaderboard':
        if (this.onLeaderboard) this.onLeaderboard(msg.list || []);
        break;

      case 'pong':
        this.pingMs = Math.round(performance.now() - this._pingSentAt);
        break;
    }
  }

  // ── Outbound ──────────────────────────────────────────────────────────────

  sendSnapshot(position, velocity, yaw, onRamp) {
    this._send({
      type: 'snap',
      x:  position.x | 0,
      y:  position.y | 0,
      z:  position.z | 0,
      vx: velocity.x | 0,
      vy: velocity.y | 0,
      vz: velocity.z | 0,
      yaw,
      onRamp: onRamp ? 1 : 0,
    });
  }

  /**
   * @param {number} ox,oy,oz  — ray origin (world units)
   * @param {number} dx,dy,dz  — normalized ray direction
   */
  sendShoot(ox, oy, oz, dx, dy, dz) {
    this._send({ type: 'shoot', ox, oy, oz, dx, dy, dz });
  }

  sendMeta(name, color) {
    this._send({ type: 'meta', name, color });
  }

  sendFinish(timeSec) {
    this._send({ type: 'finish', time: +timeSec.toFixed(3) });
  }

  sendChat(text) {
    this._send({ type: 'chat', text });
  }

  _sendPing() {
    this._pingSentAt = performance.now();
    this._send({ type: 'ping', t: this._pingSentAt });
  }

  _send(obj) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }

  _reconnect() {
    clearTimeout(this._reconnectTimer);
    if (this.connected) return;
    try {
      this.ws = new WebSocket(`${this._proto}//${location.host}`);
      this.ws.onopen = () => {
        this.connected = true;
        this._showReconnecting(false);
        this._pingInterval = setInterval(() => this._sendPing(), 2000);
        if (this.onConnect) this.onConnect();
      };
      this.ws.onmessage = (e) => {
        let msg; try { msg = JSON.parse(e.data); } catch { return; }
        this._handle(msg);
      };
      this.ws.onclose = () => {
        this.connected = false;
        clearInterval(this._pingInterval);
        this._showReconnecting(true);
        this._reconnectTimer = setTimeout(() => this._reconnect(), this._reconnectDelay);
      };
      this.ws.onerror = () => {};
    } catch { /* no server */ }
  }

  _showReconnecting(show) {
    const el = document.getElementById('reconnect-overlay');
    if (el) el.style.display = show ? 'flex' : 'none';
  }
}
