import {
  DEFAULT_VISUALIZER_SETTINGS,
  normalizeVisualizerSettings,
  VISUALIZER_PRESETS,
  VISUALIZER_RANDOM_MODE,
  type EndpointVisualizerMode,
  type EndpointVisualizerSettings,
  type VisualizerModeOption
} from './visualizer.js';

export type EndpointPlayerVariant = 'large' | 'medium' | 'small' | 'background';

export const endpointPlayerVariants: readonly EndpointPlayerVariant[] = [
  'large',
  'medium',
  'small',
  'background'
] as const;

export const DEFAULT_ENDPOINT_PLAYER_VARIANT: EndpointPlayerVariant = 'medium';

export const isEndpointPlayerVariant = (value: unknown): value is EndpointPlayerVariant => {
  if (typeof value !== 'string') {
    return false;
  }

  return (endpointPlayerVariants as readonly string[]).includes(value);
};

export type { EndpointVisualizerSettings, EndpointVisualizerMode, VisualizerModeOption } from './visualizer.js';
export { visualizerModeOptions } from './visualizer.js';

export const DEFAULT_ENDPOINT_VISUALIZER_SETTINGS = DEFAULT_VISUALIZER_SETTINGS;

export const AVAILABLE_ENDPOINT_VISUALIZER_PRESETS = VISUALIZER_PRESETS;

export const RANDOM_ENDPOINT_VISUALIZER_MODE = VISUALIZER_RANDOM_MODE;

export const normalizeEndpointVisualizerSettings = normalizeVisualizerSettings;
