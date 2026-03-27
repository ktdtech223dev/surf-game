// Debug HUD — speed graph, strafe efficiency, tick timing, surf state, run timer

export class DebugOverlay {
  constructor() {
    this.hudEl       = document.getElementById('debug-hud');
    this.speedCanvas = document.getElementById('speed-graph');
    this.tickCanvas  = document.getElementById('tick-graph');
    this.speedCtx    = this.speedCanvas.getContext('2d');
    this.tickCtx     = this.tickCanvas.getContext('2d');

    this.fps        = 0;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.peakSpeed  = 0;
  }

  /**
   * @param {object} state     - player state
   * @param {object} input     - current input sample
   * @param {object} [extra]   - { playerCount, connected, runTime, bestTime }
   */
  update(state, input, extra = {}) {
    this._updateFPS();
    this._updateHUD(state, input, extra);
    this._drawSpeedGraph(state.speedHistory);
    this._drawTickGraph(state.tickTimes);
  }

  _updateFPS() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round(this.frameCount / ((now - this.lastFpsTime) / 1000));
      this.frameCount  = 0;
      this.lastFpsTime = now;
    }
  }

  _updateHUD(state, input, extra) {
    const hSpeed    = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
    const totSpeed  = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2 + state.velocity.z ** 2);
    if (hSpeed > this.peakSpeed) this.peakSpeed = hSpeed;

    // State label
    let stateLabel, stateColor;
    if (state.onGround) {
      stateLabel = 'GROUND'; stateColor = '#888';
    } else if (state.onRamp) {
      stateLabel = '⬡ SURF'; stateColor = '#00cfff';
    } else {
      stateLabel = 'AIR'; stateColor = '#ff8800';
    }

    // Section indicator — uses sectionZBounds from active map if available
    const z = state.position.z;
    let section = '';
    const szBounds = extra.sectionZBounds;
    if (szBounds && szBounds.length) {
      const entry = szBounds.find(b => z < b.maxZ) ?? szBounds[szBounds.length - 1];
      section = `<span style="color:${entry.color ?? '#445'};font-size:10px"> ${entry.label}</span>`;
    } else {
      if      (z < 350)   section = '<span style="color:#445;font-size:10px"> SPAWN</span>';
      else if (z < 2150)  section = '<span style="color:#3366cc;font-size:10px"> S1</span>';
      else if (z < 2550)  section = '<span style="color:#445;font-size:10px"> PAD1</span>';
      else if (z < 3750)  section = '<span style="color:#00cc88;font-size:10px"> S2</span>';
      else if (z < 4150)  section = '<span style="color:#445;font-size:10px"> PAD2</span>';
      else if (z < 5650)  section = '<span style="color:#aa44ff;font-size:10px"> S3</span>';
      else                section = '<span style="color:#ffcc00;font-size:10px"> FINISH</span>';
    }

    // Speed gain rate (last 32 ticks ≈ 0.25 s)
    const hist = state.speedHistory;
    let gainStr = '';
    if (hist.length >= 32 && !state.onGround) {
      const rate = (hist[hist.length - 1] - hist[hist.length - 32]) * 128 / 32;
      if (Math.abs(rate) > 8) {
        const sign  = rate > 0 ? '+' : '';
        const gcol  = rate > 0 ? '#00ff88' : '#ff4444';
        gainStr = ` <span style="font-size:11px;color:${gcol}">${sign}${rate.toFixed(0)}/s</span>`;
      }
    }

    const speedColor = _speedColor(hSpeed);

    // Run timer
    let timerStr = '';
    if (extra.runTime != null) {
      const t   = extra.runTime;
      const ms  = Math.floor((t % 1) * 1000);
      const sec = Math.floor(t % 60);
      const min = Math.floor(t / 60);
      const pad = (n, w = 2) => String(n).padStart(w, '0');
      const timeStr = `${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
      const bestStr = extra.bestTime != null
        ? ` <span style="color:#556">best ${_fmtTime(extra.bestTime)}</span>`
        : '';
      timerStr = `
        <div style="margin-top:6px;font-size:16px;font-weight:bold;color:#ffcc00">
          ${timeStr}${bestStr}
        </div>`;
    }

    // HP display
    const hp    = extra.hp ?? 100;
    const hpCol = hp > 50 ? '#0f0' : hp > 25 ? '#fa0' : '#f44';
    const ping  = extra.ping ?? 0;

    // Player count / connection
    const count = extra.playerCount ?? 1;
    const connDot = extra.connected
      ? `<span style="color:#0f0">●</span> <span style="color:#334;font-size:10px">${ping}ms</span>`
      : '<span style="color:#333">●</span>';

    // Update badge in top-right
    const badge = document.getElementById('player-badge');
    if (badge) badge.innerHTML = `${connDot} ${count} online`;

    this.hudEl.innerHTML = `
      <div style="font-size:10px;color:#444">FPS: ${this.fps}</div>
      <div style="margin-top:4px">
        <span style="color:${stateColor};font-weight:bold">${stateLabel}</span>${section}${gainStr}
      </div>
      <div style="margin-top:5px;font-size:24px;font-weight:bold;color:${speedColor}">
        ${hSpeed.toFixed(0)}<span style="font-size:12px;color:#666"> u/s</span>
      </div>
      <div style="color:#555;font-size:11px">
        total ${totSpeed.toFixed(0)} &nbsp;|&nbsp; peak ${this.peakSpeed.toFixed(0)}
      </div>
      <div style="color:#445;font-size:10px;margin-top:2px">
        vel (${state.velocity.x.toFixed(1)}, ${state.velocity.y.toFixed(1)}, ${state.velocity.z.toFixed(1)})
      </div>
      <div style="color:#445;font-size:10px">
        pos (${state.position.x.toFixed(0)}, ${state.position.y.toFixed(0)}, ${state.position.z.toFixed(0)})
      </div>
      <div style="margin-top:8px">
        <span style="color:#667;font-size:11px">STRAFE </span>
        <span style="color:${_strafeColor(state.strafeEfficiency)};font-weight:bold">
          ${(state.strafeEfficiency * 100).toFixed(0)}%
        </span>
        ${state.strafeEfficiency > 0.8 ? '<span style="color:#0f0;font-size:10px"> SYNC</span>' : ''}
      </div>
      ${timerStr}
      <div style="color:#222;font-size:10px;margin-top:10px">
        WASD · Space · Mouse
      </div>
    `;
  }

  _drawSpeedGraph(history) {
    const ctx = this.speedCtx;
    const w = this.speedCanvas.width;
    const h = this.speedCanvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, w, h);
    if (history.length < 2) return;

    const maxS = Math.max(800, ...history) * 1.1;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const y = h - h * f;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = '9px monospace';
      ctx.fillText(`${Math.round(maxS * f)}`, 2, y - 2);
    });

    // 320 reference line
    const refY = h - (320 / maxS) * h;
    ctx.strokeStyle = 'rgba(255,200,0,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, refY); ctx.lineTo(w, refY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,200,0,0.45)';
    ctx.font = '9px monospace';
    ctx.fillText('320', w - 26, refY - 2);

    // Speed line
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const x = (i / (history.length - 1)) * w;
      const y = h - (history[i] / maxS) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = _speedColor(history[history.length - 1]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px monospace';
    ctx.fillText('SPEED', 2, 12);
  }

  _drawTickGraph(tickTimes) {
    const ctx = this.tickCtx;
    const w = this.tickCanvas.width;
    const h = this.tickCanvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, w, h);
    if (tickTimes.length < 2) return;

    const targetMs = 7.8125;
    const maxTime  = Math.max(targetMs * 2, ...tickTimes);
    const targetY  = h - (targetMs / maxTime) * h;

    ctx.strokeStyle = 'rgba(255,255,0,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(w, targetY); ctx.stroke();

    const bw = w / tickTimes.length;
    for (let i = 0; i < tickTimes.length; i++) {
      const bh = (tickTimes[i] / maxTime) * h;
      ctx.fillStyle = tickTimes[i] > targetMs ? '#c33' : '#070';
      ctx.fillRect(i * bw, h - bh, Math.max(1, bw - 1), bh);
    }

    const avg = tickTimes.reduce((a, b) => a + b, 0) / tickTimes.length;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px monospace';
    ctx.fillText('TICK', 2, 12);
    ctx.fillText(`${avg.toFixed(3)}ms`, 2, 24);
  }
}

function _speedColor(speed) {
  if (speed < 100) return '#555';
  if (speed < 320) return '#ffcc00';
  if (speed < 600) return '#00ff88';
  return '#00cfff';
}

function _strafeColor(e) {
  if (e > 0.8) return '#0f0';
  if (e > 0.5) return '#ff0';
  if (e > 0.2) return '#f80';
  return '#555';
}

function _fmtTime(t) {
  const ms  = Math.floor((t % 1) * 1000);
  const sec = Math.floor(t % 60);
  const min = Math.floor(t / 60);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
}
