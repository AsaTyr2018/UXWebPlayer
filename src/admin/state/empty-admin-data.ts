import type { AdminData } from '../types.js';

export const createEmptyAdminData = (): AdminData => ({
  metrics: {
    mediaAssets: 0,
    mediaAssetsNew: 0,
    publishedPlaylists: 0,
    playlistsPending: 0,
    activeEndpoints: 0,
    endpointsPending: 0,
    playbackErrors: 0,
    errorDelta: 0
  },
  mediaLibrary: [],
  playlists: [],
  endpoints: [],
  analytics: {
    updatedAt: new Date(0).toISOString(),
    global: [],
    perEndpoint: []
  },
  branding: {
    theme: 'light',
    accentColor: '#2563eb',
    backgroundColor: '#ffffff',
    logo: undefined,
    fontFamily: 'Inter, sans-serif',
    tokenOverrides: 0
  },
  users: [],
  configuration: [],
  diagnostics: [],
  auditTrail: []
});
