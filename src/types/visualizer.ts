import presetsJson from '../../public/assets/data/visualizer-presets.json' assert { type: 'json' };

export type VisualizerRendererType = 'bars' | 'waveform' | 'radial' | 'grid' | 'dots';

export interface VisualizerPresetOption {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly description: string;
  readonly type: VisualizerRendererType;
  readonly options: Record<string, unknown>;
}

const normalizePreset = (entry: unknown): VisualizerPresetOption | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const { id, label, group, description, type, options } = candidate;

  if (
    typeof id !== 'string' ||
    typeof label !== 'string' ||
    typeof group !== 'string' ||
    typeof description !== 'string' ||
    typeof type !== 'string'
  ) {
    return null;
  }

  if (!['bars', 'waveform', 'radial', 'grid', 'dots'].includes(type)) {
    return null;
  }

  const presetOptions = options && typeof options === 'object' ? (options as Record<string, unknown>) : {};

  return {
    id,
    label,
    group,
    description,
    type: type as VisualizerRendererType,
    options: { ...presetOptions }
  };
};

const extractedPresets = Array.isArray(presetsJson)
  ? (presetsJson.map((entry) => normalizePreset(entry)).filter(Boolean) as VisualizerPresetOption[])
  : [];

export const VISUALIZER_PRESETS: readonly VisualizerPresetOption[] = extractedPresets;

export type VisualizerPresetId = (typeof VISUALIZER_PRESETS)[number]['id'];

export const VISUALIZER_RANDOM_MODE = 'random' as const;

export type EndpointVisualizerMode = VisualizerPresetId | typeof VISUALIZER_RANDOM_MODE;

export const DEFAULT_VISUALIZER_PRESET_ID: VisualizerPresetId =
  (VISUALIZER_PRESETS[0]?.id as VisualizerPresetId) ?? 'bars-classic';

export const DEFAULT_VISUALIZER_MODE: EndpointVisualizerMode = DEFAULT_VISUALIZER_PRESET_ID;

export const DEFAULT_VISUALIZER_RANDOMIZE_INTERVAL_SECONDS = 30;

export interface VisualizerPaletteOverrides {
  readonly primary?: string;
  readonly secondary?: string;
  readonly accent?: string;
  readonly background?: string;
}

export type VisualizerIntensity = 'calm' | 'balanced' | 'dynamic';

export interface EndpointVisualizerOverrides {
  readonly palette?: VisualizerPaletteOverrides;
  readonly intensity?: VisualizerIntensity;
}

export interface EndpointVisualizerSettings {
  readonly mode: EndpointVisualizerMode;
  readonly randomizeIntervalSeconds: number;
  readonly overrides?: EndpointVisualizerOverrides;
}

export const visualizerPresetIds: readonly VisualizerPresetId[] = VISUALIZER_PRESETS.map((preset) => preset.id);

export const isVisualizerPresetId = (value: unknown): value is VisualizerPresetId => {
  if (typeof value !== 'string') {
    return false;
  }

  return visualizerPresetIds.includes(value as VisualizerPresetId);
};

export const isVisualizerMode = (value: unknown): value is EndpointVisualizerMode => {
  if (value === VISUALIZER_RANDOM_MODE) {
    return true;
  }

  return isVisualizerPresetId(value);
};

const clampInterval = (value: unknown): number => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_VISUALIZER_RANDOMIZE_INTERVAL_SECONDS;
  }

  const rounded = Math.round(numeric);
  const minimum = 10;
  const maximum = 600;

  if (rounded < minimum) {
    return minimum;
  }

  if (rounded > maximum) {
    return maximum;
  }

  return rounded;
};

const sanitizePaletteOverrides = (value: unknown): VisualizerPaletteOverrides | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const input = value as Record<string, unknown>;
  const palette: VisualizerPaletteOverrides = {};

  if (typeof input.primary === 'string') {
    palette.primary = input.primary.trim();
  }

  if (typeof input.secondary === 'string') {
    palette.secondary = input.secondary.trim();
  }

  if (typeof input.accent === 'string') {
    palette.accent = input.accent.trim();
  }

  if (typeof input.background === 'string') {
    palette.background = input.background.trim();
  }

  return Object.keys(palette).length > 0 ? palette : undefined;
};

const sanitizeOverrides = (value: unknown): EndpointVisualizerOverrides | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const input = value as Record<string, unknown>;
  const overrides: EndpointVisualizerOverrides = {};

  const palette = sanitizePaletteOverrides(input.palette);
  if (palette) {
    overrides.palette = palette;
  }

  if (typeof input.intensity === 'string' && ['calm', 'balanced', 'dynamic'].includes(input.intensity)) {
    overrides.intensity = input.intensity as VisualizerIntensity;
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
};

export const normalizeVisualizerMode = (value: unknown): EndpointVisualizerMode => {
  if (value === VISUALIZER_RANDOM_MODE) {
    return VISUALIZER_RANDOM_MODE;
  }

  if (typeof value === 'string' && isVisualizerPresetId(value)) {
    return value;
  }

  return DEFAULT_VISUALIZER_MODE;
};

export const normalizeVisualizerSettings = (value: unknown): EndpointVisualizerSettings => {
  if (!value || typeof value !== 'object') {
    return {
      mode: DEFAULT_VISUALIZER_MODE,
      randomizeIntervalSeconds: DEFAULT_VISUALIZER_RANDOMIZE_INTERVAL_SECONDS
    };
  }

  const input = value as Record<string, unknown>;
  const mode = normalizeVisualizerMode(input.mode);
  const randomizeIntervalSeconds = clampInterval(input.randomizeIntervalSeconds);
  const overrides = sanitizeOverrides(input.overrides);

  return {
    mode,
    randomizeIntervalSeconds,
    ...(overrides ? { overrides } : {})
  };
};

export const DEFAULT_VISUALIZER_SETTINGS: EndpointVisualizerSettings = {
  mode: DEFAULT_VISUALIZER_MODE,
  randomizeIntervalSeconds: DEFAULT_VISUALIZER_RANDOMIZE_INTERVAL_SECONDS
};

export interface VisualizerModeOption {
  readonly value: EndpointVisualizerMode;
  readonly label: string;
  readonly group: string;
  readonly description: string;
}

export const visualizerModeOptions: readonly VisualizerModeOption[] = [
  {
    value: VISUALIZER_RANDOM_MODE,
    label: 'Random rotation',
    group: 'Rotation',
    description: 'Rotate through visualizers every 30 seconds.'
  },
  ...VISUALIZER_PRESETS.map((preset) => ({
    value: preset.id as EndpointVisualizerMode,
    label: preset.label,
    group: preset.group,
    description: preset.description
  }))
];
