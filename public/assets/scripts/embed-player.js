const root = document.getElementById('player-root');
const PLAYER_VARIANTS = ['large', 'medium', 'small', 'background'];

const VISUALIZER_PRESET_SOURCE = new URL('../data/visualizer-presets.json', import.meta.url).href;
let VISUALIZER_PRESETS = [];
let VISUALIZER_PRESET_MAP = new Map();
let VISUALIZER_PRESET_IDS = [];
const VISUALIZER_RANDOM_MODE = 'random';
let DEFAULT_VISUALIZER_PRESET_ID = 'bars-classic';
const DEFAULT_VISUALIZER_INTERVAL_SECONDS = 30;

const applyVisualizerPresetState = (presets) => {
  VISUALIZER_PRESETS = presets;
  VISUALIZER_PRESET_MAP = new Map(VISUALIZER_PRESETS.map((preset) => [preset.id, preset]));
  VISUALIZER_PRESET_IDS = VISUALIZER_PRESETS.map((preset) => preset.id);
  DEFAULT_VISUALIZER_PRESET_ID = VISUALIZER_PRESET_IDS[0] ?? 'bars-classic';
};

applyVisualizerPresetState([]);

const loadVisualizerPresets = async () => {
  try {
    const response = await fetch(VISUALIZER_PRESET_SOURCE, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return;
    }

    const presets = data.filter((preset) => preset && typeof preset.id === 'string');
    applyVisualizerPresetState(presets);
  } catch (error) {
    console.warn('Failed to load visualizer presets. Falling back to defaults.', error);
  }
};

const visualizerPresetsReady = loadVisualizerPresets();
const AudioContextClass = window.AudioContext || window.webkitAudioContext || null;

const clamp = (value, min, max) => {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
};

const clampInterval = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_VISUALIZER_INTERVAL_SECONDS;
  }

  return clamp(Math.round(numeric), 10, 600);
};

const sanitizePaletteOverrides = (value) => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const overrides = {};

  if (typeof value.primary === 'string' && value.primary.trim()) {
    overrides.primary = value.primary.trim();
  }

  if (typeof value.secondary === 'string' && value.secondary.trim()) {
    overrides.secondary = value.secondary.trim();
  }

  if (typeof value.accent === 'string' && value.accent.trim()) {
    overrides.accent = value.accent.trim();
  }

  if (typeof value.background === 'string' && value.background.trim()) {
    overrides.background = value.background.trim();
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
};

const sanitizeOverrides = (value) => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const overrides = {};
  const palette = sanitizePaletteOverrides(value.palette);
  if (palette) {
    overrides.palette = palette;
  }

  if (typeof value.intensity === 'string' && ['calm', 'balanced', 'dynamic'].includes(value.intensity)) {
    overrides.intensity = value.intensity;
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
};

const normalizeVisualizerMode = (value) => {
  if (value === VISUALIZER_RANDOM_MODE) {
    return VISUALIZER_RANDOM_MODE;
  }

  if (typeof value === 'string' && VISUALIZER_PRESET_MAP.has(value)) {
    return value;
  }

  return DEFAULT_VISUALIZER_PRESET_ID;
};

const normalizeVisualizerSettings = (value) => {
  if (!value || typeof value !== 'object') {
    return {
      mode: DEFAULT_VISUALIZER_PRESET_ID,
      randomizeIntervalSeconds: DEFAULT_VISUALIZER_INTERVAL_SECONDS
    };
  }

  const mode = normalizeVisualizerMode(value.mode);
  const randomizeIntervalSeconds = clampInterval(value.randomizeIntervalSeconds);
  const overrides = sanitizeOverrides(value.overrides);

  return overrides
    ? { mode, randomizeIntervalSeconds, overrides }
    : { mode, randomizeIntervalSeconds };
};

const resolveIntensityFactor = (overrides) => {
  if (!overrides || overrides.intensity === 'balanced' || !overrides.intensity) {
    return 1;
  }

  if (overrides.intensity === 'calm') {
    return 0.75;
  }

  if (overrides.intensity === 'dynamic') {
    return 1.35;
  }

  return 1;
};

const resolvePalette = (options, overrides) => {
  const basePalette =
    options && Array.isArray(options.palette) && options.palette.length > 0
      ? [...options.palette]
      : ['#38bdf8', '#818cf8', '#c084fc'];

  if (overrides && overrides.palette) {
    if (overrides.palette.primary) {
      basePalette[0] = overrides.palette.primary;
    }

    if (overrides.palette.secondary) {
      if (basePalette.length > 1) {
        basePalette[1] = overrides.palette.secondary;
      } else {
        basePalette.push(overrides.palette.secondary);
      }
    }

    if (overrides.palette.accent) {
      if (basePalette.length > 2) {
        basePalette[2] = overrides.palette.accent;
      } else {
        basePalette.push(overrides.palette.accent);
      }
    }
  }

  const background =
    overrides && overrides.palette && overrides.palette.background
      ? overrides.palette.background
      : options?.backgroundColor ?? null;

  return { colors: basePalette, background };
};

const applyBackground = (ctx, width, height, options, overrides, fallbackAlpha = 0.08) => {
  const palette = resolvePalette(options, overrides);

  if (palette.background) {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
  } else if (typeof options?.backgroundAlpha === 'number') {
    const alpha = clamp(options.backgroundAlpha, 0, 1);
    if (alpha > 0) {
      ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  } else if (fallbackAlpha > 0) {
    ctx.fillStyle = `rgba(15, 23, 42, ${fallbackAlpha})`;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  return palette;
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
};

const createBarRenderer = () => {
  return (frame) => {
    const { ctx, width, height, frequencyData, delta, runtime, preset, settings } = frame;
    const options = preset.options ?? {};
    const barCount = Math.max(8, Math.floor(options.barCount ?? 64));

    if (!runtime.levels || runtime.levels.length !== barCount) {
      runtime.levels = new Array(barCount).fill(0);
    }

    if (!runtime.peaks || runtime.peaks.length !== barCount) {
      runtime.peaks = new Array(barCount).fill(0);
    }

    const palette = applyBackground(ctx, width, height, options, settings.overrides, 0.06);

    ctx.save();
    const smoothing = clamp(typeof options.smoothing === 'number' ? options.smoothing : 0.68, 0, 0.99);
    const decay = clamp(typeof options.decay === 'number' ? options.decay : 0, 0, 1);
    const spacing = clamp(typeof options.barSpacing === 'number' ? options.barSpacing : 0.3, 0, 0.9);
    const mirror = Boolean(options.mirror);
    const rounding = Math.max(0, options.rounding ?? 0);
    const maxHeightRatio = clamp(typeof options.maxHeightRatio === 'number' ? options.maxHeightRatio : 0.92, 0.1, 1);
    const glow = Math.max(0, options.glow ?? 0);
    const intensity = resolveIntensityFactor(settings.overrides);
    const gradientKey = `${width}x${height}-${palette.colors.join('-')}`;

    if (runtime.gradientKey !== gradientKey) {
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      const colors = palette.colors.length > 0 ? palette.colors : ['#38bdf8', '#818cf8'];
      colors.forEach((color, index) => {
        const stop = colors.length === 1 ? 0 : index / (colors.length - 1);
        gradient.addColorStop(stop, color);
      });
      runtime.gradient = gradient;
      runtime.gradientKey = gradientKey;
    }

    ctx.fillStyle = runtime.gradient || palette.colors[0] || '#38bdf8';
    ctx.shadowColor = palette.colors[palette.colors.length - 1] || '#38bdf8';
    ctx.shadowBlur = glow;

    const barWidth = width / barCount;
    const innerWidth = barWidth * (1 - spacing);
    const baseline = mirror ? height / 2 : height;
    const heightScale = (mirror ? height / 2 : height) * maxHeightRatio;
    const fftStep = Math.max(1, Math.floor(frequencyData.length / barCount));

    for (let index = 0; index < barCount; index += 1) {
      const dataIndex = Math.min(frequencyData.length - 1, index * fftStep);
      const magnitude = frequencyData[dataIndex] / 255;
      runtime.levels[index] = runtime.levels[index] * smoothing + magnitude * (1 - smoothing);

      if (decay > 0) {
        if (runtime.levels[index] > runtime.peaks[index]) {
          runtime.peaks[index] = runtime.levels[index];
        } else {
          runtime.peaks[index] = Math.max(0, runtime.peaks[index] - decay * delta);
        }
      } else {
        runtime.peaks[index] = runtime.levels[index];
      }

      const amplitude = Math.pow(runtime.peaks[index] * intensity, 1.15);
      const barHeight = clamp(amplitude, 0, 1) * heightScale;
      const x = index * barWidth + (barWidth - innerWidth) / 2;
      const topY = baseline - barHeight;

      drawRoundedRect(ctx, x, topY, innerWidth, barHeight, rounding);

      if (mirror) {
        drawRoundedRect(ctx, x, baseline, innerWidth, barHeight, rounding);
      }
    }

    ctx.restore();
  };
};

const createWaveformRenderer = () => {
  return (frame) => {
    const { ctx, width, height, waveformData, runtime, preset, settings } = frame;
    const options = preset.options ?? {};
    const palette = applyBackground(ctx, width, height, options, settings.overrides, options.trailAlpha ?? 0.12);

    ctx.save();
    const lineWidth = Math.max(1, options.lineWidth ?? 2);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    const gradientKey = `${width}-${palette.colors.join('-')}-${lineWidth}`;

    if (runtime.strokeKey !== gradientKey) {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      const colors = palette.colors.length > 0 ? palette.colors : ['#38bdf8', '#818cf8'];
      colors.forEach((color, index) => {
        const stop = colors.length === 1 ? 0 : index / (colors.length - 1);
        gradient.addColorStop(stop, color);
      });
      runtime.stroke = gradient;
      runtime.strokeKey = gradientKey;
    }

    ctx.strokeStyle = runtime.stroke || palette.colors[0] || '#38bdf8';
    const amplify = clamp(typeof options.amplify === 'number' ? options.amplify : 1.35, 0.2, 3);
    const intensity = resolveIntensityFactor(settings.overrides);
    const mirror = Boolean(options.mirror);
    const mid = height / 2;
    const sampleStep = waveformData.length / width;

    ctx.beginPath();
    for (let x = 0; x < width; x += 1) {
      const index = Math.floor(x * sampleStep);
      const value = waveformData[index] / 128 - 1;
      const offset = value * amplify * intensity * (mirror ? mid * 0.8 : mid * 0.9);
      const y = mid - offset;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    if (mirror) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 1) {
        const index = Math.floor(x * sampleStep);
        const value = waveformData[index] / 128 - 1;
        const offset = value * amplify * intensity * mid * 0.8;
        const y = mid + offset;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    if (typeof options.fillBelow === 'string') {
      ctx.fillStyle = options.fillBelow;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      for (let x = 0; x < width; x += 1) {
        const index = Math.floor(x * sampleStep);
        const value = waveformData[index] / 128 - 1;
        const offset = value * amplify * intensity * mid;
        const y = mid - offset;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, mid);
      ctx.closePath();
      ctx.fill();
    }

    if (options.sparkle) {
      const colors = palette.colors.length > 0 ? palette.colors : ['#ffffff'];
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 24; i += 1) {
        const x = Math.random() * width;
        const index = Math.floor(x * sampleStep);
        const value = waveformData[index] / 128 - 1;
        const offset = value * amplify * intensity * mid * 0.9;
        const y = mid - offset;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };
};

const createRadialRenderer = () => {
  return (frame) => {
    const { ctx, width, height, frequencyData, runtime, preset, settings, delta } = frame;
    const options = preset.options ?? {};
    const palette = applyBackground(ctx, width, height, options, settings.overrides, 0.08);

    ctx.save();
    const barCount = Math.max(24, Math.floor(options.barCount ?? 96));
    if (!runtime.levels || runtime.levels.length !== barCount) {
      runtime.levels = new Array(barCount).fill(0);
    }

    runtime.rotation = (runtime.rotation ?? 0) + clamp(typeof options.rotateSpeed === 'number' ? options.rotateSpeed : 0.1, -2, 2) * delta;
    const smoothing = clamp(typeof options.smoothing === 'number' ? options.smoothing : 0.68, 0, 0.99);
    const intensity = resolveIntensityFactor(settings.overrides);
    const baseRadius = Math.min(width, height) / 2;
    const innerRatio = clamp(typeof options.innerRadiusRatio === 'number' ? options.innerRadiusRatio : 0.3, 0.05, 0.9);
    const outerRatio = clamp(
      typeof options.outerRadiusRatio === 'number' ? options.outerRadiusRatio : 0.95,
      innerRatio + 0.05,
      1.4
    );
    const innerRadius = baseRadius * innerRatio;
    const outerRadius = baseRadius * outerRatio;
    const angleStep = (Math.PI * 2) / barCount;
    const colors = palette.colors.length > 0 ? palette.colors : ['#38bdf8', '#818cf8', '#c084fc'];
    const fftStep = Math.max(1, Math.floor(frequencyData.length / barCount));

    ctx.translate(width / 2, height / 2);
    ctx.rotate(runtime.rotation ?? 0);

    for (let index = 0; index < barCount; index += 1) {
      const dataIndex = Math.min(frequencyData.length - 1, index * fftStep);
      const magnitude = frequencyData[dataIndex] / 255;
      runtime.levels[index] = runtime.levels[index] * smoothing + magnitude * (1 - smoothing);
      const amplitude = Math.pow(runtime.levels[index] * intensity, 1.1);
      const radius = innerRadius + (outerRadius - innerRadius) * amplitude;
      const angle = angleStep * index;
      const color = colors[index % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, (outerRadius - innerRadius) * 0.015);
      ctx.beginPath();
      ctx.moveTo(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle));
      ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      ctx.stroke();

      if (options.useDots) {
        ctx.fillStyle = color;
        ctx.globalAlpha = clamp(0.3 + amplitude * 0.7, 0.3, 1);
        ctx.beginPath();
        ctx.arc(radius * Math.cos(angle), radius * Math.sin(angle), 2 + amplitude * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  };
};

const createGridRenderer = () => {
  return (frame) => {
    const { ctx, width, height, frequencyData, runtime, preset, settings } = frame;
    const options = preset.options ?? {};
    const palette = applyBackground(ctx, width, height, options, settings.overrides, options.backgroundAlpha ?? 0.08);
    const columns = Math.max(6, Math.floor(options.columns ?? 16));
    const rows = Math.max(4, Math.floor(options.rows ?? 12));
    const total = columns * rows;

    if (!runtime.cells || runtime.cells.length !== total) {
      runtime.cells = new Array(total).fill(0);
    }

    const smoothing = clamp(typeof options.smoothing === 'number' ? options.smoothing : 0.7, 0, 0.99);
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    const colors = palette.colors.length > 0 ? palette.colors : ['#38bdf8', '#818cf8', '#c084fc'];
    const dataStep = Math.max(1, Math.floor(frequencyData.length / total));

    ctx.save();
    for (let index = 0; index < total; index += 1) {
      const dataIndex = Math.min(frequencyData.length - 1, index * dataStep);
      const magnitude = frequencyData[dataIndex] / 255;
      runtime.cells[index] = runtime.cells[index] * smoothing + magnitude * (1 - smoothing);
      const energy = runtime.cells[index];
      const col = index % columns;
      const row = Math.floor(index / columns);
      const color = colors[(col + row) % colors.length];
      ctx.fillStyle = color;

      let modifier = 1;
      switch (options.pulse) {
        case 'vertical':
          modifier = 0.6 + (col / columns) * 0.4;
          break;
        case 'diagonal':
          modifier = 0.6 + ((col + row) / (columns + rows)) * 0.4;
          break;
        case 'swirl':
          modifier = 0.6 + (Math.sin((col + row) * 0.35 + frame.time * 0.8) + 1) / 5;
          break;
        case 'radial': {
          const dx = col - columns / 2;
          const dy = row - rows / 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          modifier = 0.5 + (1 - distance / (Math.max(columns, rows) / 2)) * 0.5;
          break;
        }
        default:
          modifier = 1;
      }

      const alpha = clamp(0.25 + energy * modifier * 0.75, 0.2, 0.95);
      ctx.globalAlpha = alpha;
      const widthScale = clamp(0.6 + energy * modifier * 0.4, 0.6, 1);
      const heightScale = clamp(0.6 + energy * modifier * 0.4, 0.6, 1);
      const x = col * cellWidth + (cellWidth * (1 - widthScale)) / 2;
      const y = row * cellHeight + (cellHeight * (1 - heightScale)) / 2;
      ctx.fillRect(x, y, cellWidth * widthScale, cellHeight * heightScale);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };
};

const createDotsRenderer = () => {
  return (frame) => {
    const { ctx, width, height, frequencyData, runtime, preset, settings, delta } = frame;
    const options = preset.options ?? {};
    const palette = applyBackground(ctx, width, height, options, settings.overrides, options.trailAlpha ?? 0.16);
    const dotCount = Math.max(24, Math.floor(options.dotCount ?? 120));

    if (!runtime.particles || runtime.particles.length !== dotCount) {
      runtime.particles = Array.from({ length: dotCount }, (_, index) => ({
        angle: (index / dotCount) * Math.PI * 2,
        speed: (Math.random() * 0.6 + 0.2) * (options.rotationSpeed ?? 0.1),
        colorIndex: index % (palette.colors.length || 1)
      }));
    }

    const baseRadius = (Math.min(width, height) / 2) * clamp(typeof options.orbitRadiusRatio === 'number' ? options.orbitRadiusRatio : 0.5, 0.2, 1.1);
    const colors = palette.colors.length > 0 ? palette.colors : ['#38bdf8', '#818cf8', '#a855f7'];
    const dataStep = Math.max(1, Math.floor(frequencyData.length / dotCount));
    const lift = Boolean(options.lift);

    ctx.save();
    ctx.globalAlpha = 1;
    for (let index = 0; index < dotCount; index += 1) {
      const particle = runtime.particles[index];
      const dataIndex = Math.min(frequencyData.length - 1, index * dataStep);
      const magnitude = frequencyData[dataIndex] / 255;
      particle.angle += (options.rotationSpeed ?? 0.1) * delta + particle.speed * delta;
      const radius = baseRadius * (0.6 + magnitude * 0.8);
      const x = width / 2 + Math.cos(particle.angle) * radius;
      const yScale = lift ? 0.5 + magnitude * 0.5 : 1;
      const y = height / 2 + Math.sin(particle.angle) * radius * yScale;
      const size = 1.4 + magnitude * 4.5;
      ctx.fillStyle = colors[particle.colorIndex % colors.length];
      ctx.globalAlpha = clamp(0.25 + magnitude * 0.75, 0.25, 1);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };
};

const createRenderer = (preset) => {
  switch (preset.type) {
    case 'bars':
      return createBarRenderer();
    case 'waveform':
      return createWaveformRenderer();
    case 'radial':
      return createRadialRenderer();
    case 'grid':
      return createGridRenderer();
    case 'dots':
      return createDotsRenderer();
    default:
      return () => {};
  }
};

const createRuntimeState = (preset) => {
  switch (preset.type) {
    case 'bars': {
      const count = Math.max(8, Math.floor(preset.options?.barCount ?? 64));
      return { levels: new Array(count).fill(0), peaks: new Array(count).fill(0) };
    }
    case 'radial': {
      const count = Math.max(24, Math.floor(preset.options?.barCount ?? 96));
      return { levels: new Array(count).fill(0), rotation: 0 };
    }
    case 'grid': {
      const columns = Math.max(6, Math.floor(preset.options?.columns ?? 16));
      const rows = Math.max(4, Math.floor(preset.options?.rows ?? 12));
      return { cells: new Array(columns * rows).fill(0) };
    }
    case 'dots': {
      const count = Math.max(24, Math.floor(preset.options?.dotCount ?? 120));
      return { particles: new Array(count).fill(null) };
    }
    default:
      return {};
  }
};

class VisualizerManager {
  constructor(stage, audio, settings) {
    this.stage = stage;
    this.audio = audio;
    this.settings = normalizeVisualizerSettings(settings);
    this.canvas = null;
    this.ctx = null;
    this.statusEl = null;
    this.resizeObserver = null;
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.frequencyData = null;
    this.waveformData = null;
    this.animationId = 0;
    this.randomTimerId = 0;
    this.lastTimestamp = performance.now();
    this.currentPresetId = null;
    this.currentPreset = null;
    this.renderer = null;
    this.runtimeState = {};

    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);

    this.initializeStage();

    this.audio.addEventListener('play', this.handlePlay);
    this.audio.addEventListener('pause', this.handlePause);
    this.audio.addEventListener('ended', this.handlePause);
    this.applySettings(this.settings);
  }

  initializeStage() {
    this.stage.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'visualizer-canvas';
    this.statusEl = document.createElement('span');
    this.statusEl.className = 'visualizer-status';
    this.statusEl.textContent = 'Press play to start the visualizer.';
    this.stage.append(this.canvas, this.statusEl);
    this.stage.dataset.state = 'ready';

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    if (!this.ctx) {
      this.setErrorState('Visualizer unavailable. Unable to initialize drawing context.');
      return;
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.stage);
    this.handleResize();
  }

  setStatus(state, message) {
    this.stage.dataset.state = state;
    if (this.statusEl) {
      if (message) {
        this.statusEl.textContent = message;
        this.statusEl.hidden = false;
      } else {
        this.statusEl.textContent = '';
        this.statusEl.hidden = true;
      }
    }
  }

  setErrorState(message) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      this.statusEl.hidden = false;
    }
    this.stage.dataset.state = 'error';
  }

  handleResize() {
    if (!this.canvas) {
      return;
    }

    const rect = this.stage.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * ratio));
    const height = Math.max(1, Math.floor(rect.height * ratio));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  ensureAudioGraph() {
    if (!AudioContextClass || !this.ctx) {
      return false;
    }

    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContextClass();
      } catch (error) {
        this.setErrorState('Visualizer unavailable. Audio context could not be created.');
        return false;
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      this.analyser.smoothingTimeConstant = 0.68;
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformData = new Uint8Array(this.analyser.fftSize);
      if (this.currentPreset) {
        this.configureAnalyser(this.currentPreset.options);
      }
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return Boolean(this.analyser);
  }

  configureAnalyser(options) {
    if (!this.analyser) {
      return;
    }

    this.analyser.smoothingTimeConstant = clamp(typeof options?.smoothing === 'number' ? options.smoothing : 0.68, 0, 0.99);
  }

  applySettings(settings) {
    this.settings = normalizeVisualizerSettings(settings);

    if (!VISUALIZER_PRESETS.length) {
      this.setErrorState('Visualizer presets not available.');
      return;
    }

    window.clearInterval(this.randomTimerId);
    this.randomTimerId = 0;

    if (this.settings.mode === VISUALIZER_RANDOM_MODE) {
      this.startRandomRotation(true);
    } else {
      this.setPreset(this.settings.mode);
    }
  }

  setPreset(presetId) {
    const preset = VISUALIZER_PRESET_MAP.get(presetId);
    if (!preset || !this.ctx) {
      return;
    }

    this.currentPresetId = presetId;
    this.currentPreset = preset;
    this.renderer = createRenderer(preset);
    this.runtimeState = createRuntimeState(preset);
    this.stage.dataset.visualizer = preset.id;

    if (this.analyser) {
      this.configureAnalyser(preset.options);
    }

    if (this.statusEl && this.stage.dataset.state !== 'active') {
      this.statusEl.textContent = `${preset.label} ready. Press play to start.`;
      this.statusEl.hidden = false;
      this.stage.dataset.state = 'ready';
    }
  }

  pickRandomPreset(excludeId) {
    if (!VISUALIZER_PRESETS.length) {
      return DEFAULT_VISUALIZER_PRESET_ID;
    }

    const available = excludeId
      ? VISUALIZER_PRESETS.filter((preset) => preset.id !== excludeId)
      : VISUALIZER_PRESETS;

    if (available.length === 0) {
      return excludeId ?? DEFAULT_VISUALIZER_PRESET_ID;
    }

    const index = Math.floor(Math.random() * available.length);
    return available[index].id;
  }

  startRandomRotation(initial) {
    const rotate = () => {
      const next = this.pickRandomPreset(this.currentPresetId);
      this.setPreset(next);
    };

    if (initial || !this.currentPresetId) {
      rotate();
    }

    this.randomTimerId = window.setInterval(rotate, this.settings.randomizeIntervalSeconds * 1000);
  }

  startAnimation() {
    if (this.animationId) {
      return;
    }

    const loop = (timestamp) => {
      this.renderFrame(timestamp);
      this.animationId = window.requestAnimationFrame(loop);
    };

    this.animationId = window.requestAnimationFrame(loop);
  }

  stopAnimation() {
    if (this.animationId) {
      window.cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  renderFrame(timestamp) {
    if (!this.analyser || !this.ctx || !this.renderer || !this.canvas) {
      return;
    }

    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.waveformData);

    if (this.canvas.width === 0 || this.canvas.height === 0) {
      return;
    }

    this.renderer({
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
      frequencyData: this.frequencyData,
      waveformData: this.waveformData,
      delta: Number.isFinite(delta) ? delta : 0.016,
      time: timestamp / 1000,
      runtime: this.runtimeState,
      preset: this.currentPreset,
      settings: this.settings
    });
  }

  handlePlay() {
    if (!this.ensureAudioGraph()) {
      return;
    }

    if (this.statusEl) {
      this.statusEl.hidden = true;
    }

    this.setStatus('active', '');
    this.startAnimation();
  }

  handlePause() {
    this.stopAnimation();
    if (this.audio.paused || this.audio.ended) {
      this.setStatus('paused', this.audio.ended ? 'Playback finished.' : 'Playback paused.');
    } else {
      this.setStatus('ready', 'Press play to start the visualizer.');
    }
  }
}

const normalizeVariant = (value) => {
  if (typeof value === 'string' && PLAYER_VARIANTS.includes(value)) {
    return value;
  }

  return 'medium';
};

const applyPlayerVariant = (variant) => {
  if (!root) {
    return;
  }

  root.dataset.playerVariant = variant;
  if (document.body) {
    document.body.dataset.playerVariant = variant;
  }
};

const setSubtitle = (text) => {
  const subtitle = root?.querySelector('.player-subtitle');
  if (subtitle) {
    subtitle.textContent = text;
  }
};

const removePlaybackSection = () => {
  if (!root) {
    return;
  }

  const playbackSection = root.querySelector('.player-playback');
  if (playbackSection) {
    playbackSection.remove();
  }
};

const ensureStatusSection = () => {
  if (!root) {
    return null;
  }

  removePlaybackSection();

  let statusSection = root.querySelector('.player-status');
  if (!statusSection) {
    statusSection = document.createElement('section');
    statusSection.className = 'player-status';
    root.appendChild(statusSection);
  }

  return statusSection;
};

const renderStatus = (title, message) => {
  applyPlayerVariant('medium');

  const ambient = root?.querySelector('.background-audio');
  if (ambient) {
    ambient.remove();
  }

  const statusSection = ensureStatusSection();
  if (!statusSection) {
    return;
  }

  statusSection.innerHTML = `
    <p>
      <strong>${title}</strong>
      ${message}
    </p>
  `;
};

const renderBackgroundPlayback = (payload) => {
  if (!root) {
    return;
  }

  applyPlayerVariant('background');

  const statusSection = root.querySelector('.player-status');
  if (statusSection) {
    statusSection.remove();
  }

  removePlaybackSection();

  let audio = root.querySelector('.background-audio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.className = 'background-audio';
    audio.controls = false;
    audio.preload = 'auto';
    audio.autoplay = true;
    audio.setAttribute('aria-hidden', 'true');
    root.appendChild(audio);
  }

  const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];

  if (tracks.length === 0) {
    audio.removeAttribute('src');
    return;
  }

  let currentIndex = 0;

  const setTrack = (index) => {
    currentIndex = index;
    const track = tracks[currentIndex];
    audio.src = track.src;
    audio.dataset.trackId = track.id;
    audio.dataset.trackIndex = String(currentIndex);
  };

  audio.onended = () => {
    if (tracks.length === 0) {
      return;
    }

    const nextIndex = (currentIndex + 1) % tracks.length;
    setTrack(nextIndex);
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  setTrack(0);

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      console.warn('Background playback requires user interaction before audio can start.');
    });
  }
};

const renderStandardPlayback = (payload, variant) => {
  if (!root) {
    return;
  }

  applyPlayerVariant(variant);

  const statusSection = root.querySelector('.player-status');
  if (statusSection) {
    statusSection.remove();
  }

  removePlaybackSection();

  const ambient = root.querySelector('.background-audio');
  if (ambient) {
    ambient.remove();
  }

  const playbackSection = document.createElement('section');
  playbackSection.className = 'player-playback';
  playbackSection.dataset.variant = variant;

  const nowPlaying = document.createElement('div');
  nowPlaying.className = 'now-playing';

  const nowPlayingHeading = document.createElement('strong');
  nowPlayingHeading.textContent = 'Now playing';

  const nowPlayingTrack = document.createElement('p');
  nowPlayingTrack.className = 'now-playing-track';

  nowPlaying.append(nowPlayingHeading, nowPlayingTrack);

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'none';
  audio.className = 'player-audio';

  if (variant === 'small') {
    audio.controlsList = 'nodownload noplaybackrate';
  }

  const feedback = document.createElement('p');
  feedback.className = 'playback-feedback';
  feedback.textContent = variant === 'small' ? 'Press play to start.' : 'Press play to start the stream.';
  feedback.hidden = true;

  const list = document.createElement('ol');
  list.className = 'track-list';

  const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
  let currentIndex = 0;
  let visualizationContainer = null;
  let artworkImage = null;
  let visualizationStage = null;
  let artworkFadeTimeoutId = 0;

  const updateActiveTrack = () => {
    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
      item.classList.toggle('active', index === currentIndex);
    });
  };

  const formatTrackLabel = (track) => {
    return track.artist ? `${track.title} — ${track.artist}` : track.title;
  };

  const clearArtworkFade = () => {
    if (artworkFadeTimeoutId) {
      window.clearTimeout(artworkFadeTimeoutId);
      artworkFadeTimeoutId = 0;
    }
  };

  const updateVisualizationArtwork = (track) => {
    if (!visualizationContainer || !visualizationStage) {
      return;
    }

    clearArtworkFade();

    const hasArtwork = typeof track.artworkUrl === 'string' && track.artworkUrl.length > 0;

    if (!hasArtwork) {
      if (artworkImage) {
        artworkImage.removeAttribute('src');
        artworkImage.alt = '';
      }

      visualizationContainer.classList.remove('has-artwork', 'show-artwork', 'artwork-faded');
      return;
    }

    visualizationContainer.classList.add('has-artwork');
    visualizationContainer.classList.remove('artwork-faded');

    if (artworkImage) {
      artworkImage.src = track.artworkUrl;
      artworkImage.alt = track.title ? `Cover art for ${track.title}` : 'Cover art';
    }

    requestAnimationFrame(() => {
      visualizationContainer.classList.add('show-artwork');
      artworkFadeTimeoutId = window.setTimeout(() => {
        visualizationContainer.classList.add('artwork-faded');
      }, 5000);
    });
  };

  const setTrack = (index) => {
    currentIndex = index;
    const track = tracks[currentIndex];
    audio.src = track.src;
    audio.setAttribute('data-track-id', track.id);
    audio.setAttribute('data-track-index', String(currentIndex));
    nowPlayingTrack.textContent = formatTrackLabel(track);
    updateActiveTrack();
    updateVisualizationArtwork(track);
  };

  const tryPlay = () => {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        feedback.hidden = false;
        feedback.dataset.persistent = 'false';
      });
    }
  };

  audio.addEventListener('play', () => {
    if (feedback.dataset.persistent === 'true') {
      return;
    }

    feedback.hidden = true;
  });

  audio.addEventListener('ended', () => {
    if (currentIndex < tracks.length - 1) {
      setTrack(currentIndex + 1);
      tryPlay();
    }
  });

  tracks.forEach((track, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = formatTrackLabel(track);
    button.addEventListener('click', () => {
      setTrack(index);
      tryPlay();
    });
    item.appendChild(button);
    list.appendChild(item);
  });

  if (variant === 'large') {
    const playlistColumn = document.createElement('div');
    playlistColumn.className = 'player-large-playlist';
    playlistColumn.appendChild(list);

    visualizationContainer = document.createElement('div');
    visualizationContainer.className = 'player-visualization';

    const artworkWrapper = document.createElement('div');
    artworkWrapper.className = 'player-artwork';

    artworkImage = document.createElement('img');
    artworkImage.alt = '';
    artworkImage.decoding = 'async';
    artworkImage.loading = 'eager';
    artworkWrapper.appendChild(artworkImage);

    visualizationStage = document.createElement('div');
    visualizationStage.className = 'player-visualization-stage';
    visualizationStage.dataset.state = 'loading';
    visualizationStage.innerHTML = '<span class="visualizer-status">Initializing visualizer…</span>';

    visualizationContainer.append(artworkWrapper, visualizationStage);

    const visualizerSettings = normalizeVisualizerSettings(payload?.endpoint?.visualizer);

    const initializeVisualizer = () => {
      if (!VISUALIZER_PRESETS.length) {
        visualizationStage.dataset.state = 'error';
        visualizationStage.innerHTML =
          '<span class="visualizer-status">Visualizer presets unavailable.</span>';
        return;
      }

      if (!AudioContextClass) {
        visualizationStage.dataset.state = 'unsupported';
        visualizationStage.innerHTML =
          '<span class="visualizer-status">Visualizer requires Web Audio support.</span>';
        return;
      }

      // eslint-disable-next-line no-new
      new VisualizerManager(visualizationStage, audio, visualizerSettings);
    };

    if (VISUALIZER_PRESETS.length) {
      initializeVisualizer();
    } else {
      visualizationStage.dataset.state = 'loading';
      visualizationStage.innerHTML =
        '<span class="visualizer-status">Loading visualizer presets…</span>';

      visualizerPresetsReady
        .catch(() => {})
        .finally(() => {
          initializeVisualizer();
        });
    }

    const transport = document.createElement('div');
    transport.className = 'player-transport';
    transport.append(nowPlaying, audio, feedback);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'player-large-right';
    rightColumn.append(visualizationContainer, transport);

    playbackSection.append(playlistColumn, rightColumn);
  } else {
    playbackSection.append(nowPlaying, audio, feedback, list);
  }

  root.appendChild(playbackSection);

  setTrack(0);
  tryPlay();
};

const renderPlayback = (payload, variant) => {
  const normalizedVariant = normalizeVariant(variant);

  if (normalizedVariant === 'background') {
    renderBackgroundPlayback(payload);
    return;
  }

  renderStandardPlayback(payload, normalizedVariant);
};

const initialize = async () => {
  if (!root) {
    return;
  }

  const slug = root.dataset.endpointSlug || window.__UX_EMBED_SLUG__;

  if (!slug) {
    renderStatus('Endpoint missing.', 'Unable to determine the requested playlist.');
    return;
  }

  setSubtitle(`Endpoint ${slug}`);
  renderStatus('Loading stream.', 'Fetching playlist metadata.');

  try {
    const response = await fetch(`/api/embed/${encodeURIComponent(slug)}/stream`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    const payload = await response.json();
    const { endpoint, playlist, tracks } = payload;
    const variant = normalizeVariant(endpoint?.playerVariant);

    if (playlist) {
      setSubtitle(`${playlist.name} • ${endpoint.name}`);
    } else {
      setSubtitle(`${endpoint.name}`);
    }

    if (endpoint.status === 'disabled') {
      renderStatus('Endpoint disabled.', 'This endpoint has been deactivated in the admin console.');
      return;
    }

    if (!playlist) {
      renderStatus('Playlist required.', 'Assign a playlist to this endpoint to start playback.');
      return;
    }

    if (endpoint.status === 'pending') {
      renderStatus('Activation pending.', 'Enable this endpoint from the admin console to begin streaming.');
      return;
    }

    if (!Array.isArray(tracks) || tracks.length === 0) {
      renderStatus('No media available.', 'Upload ready tracks to the assigned playlist.');
      return;
    }

    renderPlayback(payload, variant);

    if (endpoint.status === 'degraded') {
      const feedback = root.querySelector('.playback-feedback');
      if (feedback instanceof HTMLElement) {
        feedback.hidden = false;
        feedback.textContent = 'Streaming in degraded mode. Playback issues may occur.';
        feedback.dataset.persistent = 'true';
      } else if (variant === 'background') {
        console.warn('Background playback is running in degraded mode.');
      }
    }
  } catch (error) {
    renderStatus('Playback unavailable.', 'The player could not reach the media service. Please try again later.');
  }
};

void initialize();
