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
