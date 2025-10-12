export type AdminPage =
  | 'dashboard'
  | 'media-library'
  | 'playlists'
  | 'endpoints'
  | 'analytics'
  | 'branding'
  | 'access-control'
  | 'configuration'
  | 'diagnostics'
  | 'audit-trail';

export interface AdminMetrics {
  mediaAssets: number;
  mediaAssetsNew: number;
  publishedPlaylists: number;
  playlistsPending: number;
  activeEndpoints: number;
  endpointsPending: number;
  playbackErrors: number;
  errorDelta: number;
}

export type MediaAssetStatus = 'ready' | 'processing' | 'error';
export type MediaAssetType = 'audio' | 'video';

export interface MediaAsset {
  id: string;
  title: string;
  type: MediaAssetType;
  durationSeconds: number;
  tags: string[];
  status: MediaAssetStatus;
  updatedAt: string;
}

export type PlaylistStatus = 'draft' | 'published' | 'scheduled' | 'needs_media' | 'archived';

export interface AdminPlaylist {
  id: string;
  name: string;
  status: PlaylistStatus;
  updatedAt: string;
  owner: string;
  itemCount: number;
  endpointCount: number;
}

export type EndpointStatus = 'operational' | 'degraded' | 'pending' | 'disabled';

export interface AdminEndpoint {
  id: string;
  name: string;
  target: string;
  status: EndpointStatus;
  lastSync: string;
  latencyMs?: number;
}

export interface AnalyticsMetric {
  id: string;
  label: string;
  value: number;
  delta: number;
  unit?: string;
}

export interface BrandingSettings {
  theme: 'light' | 'dark' | 'custom';
  accentColor: string;
  backgroundColor: string;
  logo?: string;
  fontFamily: string;
  tokenOverrides: number;
}

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'invited' | 'suspended';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastActive: string;
  status: UserStatus;
}

export interface ConfigurationEntry {
  key: string;
  value: string;
  description: string;
  mutable: boolean;
}

export type DiagnosticStatus = 'pass' | 'warn' | 'fail';

export interface DiagnosticCheck {
  id: string;
  name: string;
  status: DiagnosticStatus;
  description: string;
  lastRun: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface AdminData {
  metrics: AdminMetrics;
  mediaLibrary: MediaAsset[];
  playlists: AdminPlaylist[];
  endpoints: AdminEndpoint[];
  analytics: AnalyticsMetric[];
  branding: BrandingSettings;
  users: AdminUser[];
  configuration: ConfigurationEntry[];
  diagnostics: DiagnosticCheck[];
  auditTrail: AuditEvent[];
}
