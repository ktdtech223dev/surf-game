/**
 * RadioSystem — In-game web radio
 * Streams public radio stations via HTML5 Audio.
 * Controllable from the Pause Menu.
 */

export const STATIONS = [
  {
    id:    'off',
    name:  'Off',
    genre: '',
    url:   null,
  },
  {
    id:    'lofi',
    name:  'Lofi Beats',
    genre: 'LOFI HIP-HOP',
    url:   'https://streams.ilovemusic.de/iloveradio17.mp3',
  },
  {
    id:    'groovesalad',
    name:  'Groove Salad',
    genre: 'AMBIENT / DOWNTEMPO',
    url:   'https://ice1.somafm.com/groovesalad-128-mp3',
  },
  {
    id:    'drone',
    name:  'Drone Zone',
    genre: 'SPACE AMBIENT',
    url:   'https://ice1.somafm.com/dronezone-128-mp3',
  },
  {
    id:    'beatblender',
    name:  'Beat Blender',
    genre: 'DEEP HOUSE / ELECTRONICA',
    url:   'https://ice1.somafm.com/beatblender-128-mp3',
  },
  {
    id:    'lush',
    name:  'Lush',
    genre: 'INDIE / CHILLOUT',
    url:   'https://ice1.somafm.com/lush-128-mp3',
  },
  {
    id:    'spacestation',
    name:  'Space Station',
    genre: 'SPACE ELECTRONICA',
    url:   'https://ice2.somafm.com/spacestation-128-mp3',
  },
  {
    id:    'suburbs',
    name:  'Suburbs of Goa',
    genre: 'PSYTRANCE / GLOBAL BEATS',
    url:   'https://ice1.somafm.com/suburbsofgoa-128-mp3',
  },
];

const STATION_BY_ID = Object.fromEntries(STATIONS.map(s => [s.id, s]));

export class RadioSystem {
  constructor() {
    this._audio      = null;
    this._stationId  = 'off';
    this._volume     = 0.35;
    this._loading    = false;
    this._onUpdate   = null; // callback when state changes
  }

  get stationId()  { return this._stationId; }
  get volume()     { return this._volume; }
  get isPlaying()  { return !!this._audio && !this._audio.paused; }
  get isLoading()  { return this._loading; }
  get station()    { return STATION_BY_ID[this._stationId] ?? STATIONS[0]; }

  setStation(id) {
    if (id === this._stationId) return;
    this._stationId = id;
    this._stop();
    const station = STATION_BY_ID[id];
    if (station?.url) this._play(station.url);
    this._notify();
  }

  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this._audio) this._audio.volume = this._volume;
    this._notify();
  }

  toggle() {
    if (this._stationId === 'off') {
      this.setStation('lofi');
    } else if (this.isPlaying) {
      this._audio.pause();
      this._notify();
    } else if (this._audio) {
      this._audio.play().catch(() => {});
      this._notify();
    }
  }

  nextStation() {
    const idx  = STATIONS.findIndex(s => s.id === this._stationId);
    const next = STATIONS[(idx + 1) % STATIONS.length];
    this.setStation(next.id);
  }

  prevStation() {
    const idx  = STATIONS.findIndex(s => s.id === this._stationId);
    const prev = STATIONS[(idx - 1 + STATIONS.length) % STATIONS.length];
    this.setStation(prev.id);
  }

  onChange(fn) { this._onUpdate = fn; }

  // ── Internal ─────────────────────────────────────────────────────────────

  _play(url) {
    const audio    = new Audio(url);
    audio.volume   = this._volume;
    audio.preload  = 'none';
    this._audio    = audio;
    this._loading  = true;

    audio.addEventListener('canplay',  () => { this._loading = false; this._notify(); });
    audio.addEventListener('playing',  () => { this._loading = false; this._notify(); });
    audio.addEventListener('error',    () => { this._loading = false; this._notify(); });
    audio.addEventListener('waiting',  () => { this._loading = true;  this._notify(); });

    audio.play().catch(() => { this._loading = false; this._notify(); });
  }

  _stop() {
    if (this._audio) {
      this._audio.pause();
      this._audio.src = '';
      this._audio = null;
    }
    this._loading = false;
  }

  _notify() {
    this._onUpdate?.();
  }

  // ── Pause menu panel ──────────────────────────────────────────────────────

  /** Render a radio panel into the given DOM container */
  renderPanel(container) {
    if (!container) return;

    const stationRow = (s) => {
      const active = s.id === this._stationId;
      return `
        <div data-station="${s.id}" class="radio-station-row" style="
          display:flex; align-items:center; gap:12px;
          padding:10px 14px; margin-bottom:3px;
          border-radius:6px; cursor:${s.url ? 'pointer' : 'default'};
          background:${active ? 'rgba(0,207,255,0.1)' : 'transparent'};
          border:1px solid ${active ? 'rgba(0,207,255,0.3)' : 'transparent'};
          transition:all 0.12s;
        "
          ${s.url ? `
            onmouseover="this.style.background='rgba(255,255,255,0.05)'"
            onmouseout="this.style.background='${active ? 'rgba(0,207,255,0.1)' : 'transparent'}'"
          ` : ''}
        >
          <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;
            background:${active && this.isPlaying ? '#0f0' : active ? '#00cfff' : s.url ? '#222' : '#111'};
            ${active && this.isPlaying ? 'box-shadow:0 0 6px #0f0' : ''}
          "></div>
          <div style="flex:1">
            <div style="font-size:12px;color:${active ? '#00cfff' : s.url ? '#ccc' : '#333'};font-weight:${active ? 'bold' : 'normal'}">${s.name}</div>
            ${s.genre ? `<div style="font-size:9px;color:#2a2a4a;letter-spacing:2px">${s.genre}</div>` : ''}
          </div>
          ${active && this._loading ? '<div style="font-size:9px;color:#555;letter-spacing:1px">BUFFERING…</div>' : ''}
          ${active && this.isPlaying ? '<div style="font-size:9px;color:#0f0;letter-spacing:1px">LIVE</div>' : ''}
        </div>
      `;
    };

    container.innerHTML = `
      <div>
        <div style="font-size:10px;letter-spacing:4px;color:#2a2a4a;margin-bottom:18px">RADIO</div>

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          <button id="radio-prev" style="${_btnCss()}">◀◀</button>
          <button id="radio-toggle" style="${_btnCss(true)}">${this.isPlaying ? '⏸ PAUSE' : this._stationId === 'off' ? '▶ PLAY' : '▶ RESUME'}</button>
          <button id="radio-next" style="${_btnCss()}">▶▶</button>
          <div style="flex:1"></div>
          <span style="font-size:9px;color:#2a2a4a;letter-spacing:2px">VOL</span>
          <input id="radio-vol" type="range" min="0" max="1" step="0.01"
            value="${this._volume}" style="width:80px;accent-color:#00cfff;cursor:pointer;">
        </div>

        <div style="max-height:340px;overflow-y:auto">
          ${STATIONS.map(stationRow).join('')}
        </div>

        <div style="margin-top:14px;font-size:9px;color:#1a1a2a;letter-spacing:1px;border-top:1px solid #111;padding-top:10px">
          Streams via SomaFM &amp; iLoveRadio — free public radio
        </div>
      </div>
    `;

    // Wire events
    document.getElementById('radio-toggle')?.addEventListener('click', () => {
      this.toggle();
      this.renderPanel(container);
    });
    document.getElementById('radio-prev')?.addEventListener('click', () => {
      this.prevStation();
      this.renderPanel(container);
    });
    document.getElementById('radio-next')?.addEventListener('click', () => {
      this.nextStation();
      this.renderPanel(container);
    });
    document.getElementById('radio-vol')?.addEventListener('input', (e) => {
      this.setVolume(parseFloat(e.target.value));
    });

    container.querySelectorAll('.radio-station-row[data-station]').forEach(row => {
      const sid = row.dataset.station;
      const st  = STATION_BY_ID[sid];
      if (!st?.url) return;
      row.addEventListener('click', () => {
        this.setStation(sid);
        this.renderPanel(container);
      });
    });
  }
}

function _btnCss(primary = false) {
  return `
    padding:7px 14px; border-radius:5px; cursor:pointer; font-family:monospace; font-size:11px;
    background:${primary ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.04)'};
    border:1px solid ${primary ? 'rgba(0,207,255,0.3)' : '#1a1a2e'};
    color:${primary ? '#00cfff' : '#666'};
    transition:all 0.12s;
  `;
}
