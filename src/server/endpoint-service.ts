import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { EndpointStatus } from '../admin/types.js';

export class EndpointValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EndpointValidationError';
  }
}

export class EndpointNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EndpointNotFoundError';
  }
}

export interface EndpointRecord {
  id: string;
  name: string;
  slug: string;
  playlistId: string | null;
  status: EndpointStatus;
  lastSync: string | null;
  latencyMs: number | null;
  createdAt: string;
  updatedAt: string;
}

interface EndpointStoreState {
  endpoints: EndpointRecord[];
}

const ENDPOINT_STORE_PATH = path.resolve(
  process.env.ENDPOINT_STORE_PATH ?? path.join('data', 'endpoints.json')
);

let cachedState: EndpointStoreState | null = null;

const ensureStoreDirectory = () => {
  const directory = path.dirname(ENDPOINT_STORE_PATH);
  fs.mkdirSync(directory, { recursive: true });
};

const loadState = (): EndpointStoreState => {
  if (cachedState) {
    return cachedState;
  }

  ensureStoreDirectory();

  if (!fs.existsSync(ENDPOINT_STORE_PATH)) {
    cachedState = { endpoints: [] };
    return cachedState;
  }

  try {
    const raw = fs.readFileSync(ENDPOINT_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EndpointStoreState>;
    const endpoints = Array.isArray(parsed.endpoints) ? parsed.endpoints : [];
    cachedState = { endpoints };
    return cachedState;
  } catch (error) {
    cachedState = { endpoints: [] };
    return cachedState;
  }
};

const saveState = (state: EndpointStoreState) => {
  ensureStoreDirectory();
  fs.writeFileSync(ENDPOINT_STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
  cachedState = state;
};

const generateSlug = (existingSlugs: Set<string>): string => {
  let candidate = '';

  do {
    candidate = Math.floor(100_000_000 + Math.random() * 900_000_000).toString();
  } while (existingSlugs.has(candidate));

  return candidate;
};

const now = () => new Date().toISOString();

export const listEndpoints = (): EndpointRecord[] => {
  const state = loadState();
  return state.endpoints.map((endpoint) => ({ ...endpoint }));
};

export const getEndpointById = (endpointId: string): EndpointRecord | null => {
  const state = loadState();
  const endpoint = state.endpoints.find((entry) => entry.id === endpointId);
  return endpoint ? { ...endpoint } : null;
};

export interface CreateEndpointInput {
  name: string;
  playlistId: string | null;
}

export const createEndpoint = (input: CreateEndpointInput): EndpointRecord => {
  const name = input.name.trim();

  if (!name) {
    throw new EndpointValidationError('Endpoint name is required.');
  }

  const state = loadState();
  const slug = generateSlug(new Set(state.endpoints.map((endpoint) => endpoint.slug)));
  const timestamp = now();
  const endpoint: EndpointRecord = {
    id: randomUUID(),
    name,
    slug,
    playlistId: input.playlistId ?? null,
    status: 'pending',
    lastSync: null,
    latencyMs: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  state.endpoints = [...state.endpoints, endpoint];
  saveState(state);

  return { ...endpoint };
};

export interface UpdateEndpointInput {
  name?: string;
  playlistId?: string | null;
  status?: EndpointStatus;
}

export const updateEndpoint = (endpointId: string, updates: UpdateEndpointInput): EndpointRecord => {
  const state = loadState();
  const endpoint = state.endpoints.find((entry) => entry.id === endpointId);

  if (!endpoint) {
    throw new EndpointNotFoundError('Endpoint not found.');
  }

  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) {
      throw new EndpointValidationError('Endpoint name is required.');
    }

    endpoint.name = name;
  }

  if (updates.playlistId !== undefined) {
    endpoint.playlistId = updates.playlistId;
  }

  if (updates.status !== undefined) {
    endpoint.status = updates.status;
    if (updates.status === 'operational') {
      endpoint.lastSync = now();
    }
  }

  endpoint.updatedAt = now();
  saveState(state);

  return { ...endpoint };
};

export const deleteEndpoint = (endpointId: string) => {
  const state = loadState();
  const countBefore = state.endpoints.length;
  state.endpoints = state.endpoints.filter((entry) => entry.id !== endpointId);

  if (state.endpoints.length === countBefore) {
    throw new EndpointNotFoundError('Endpoint not found.');
  }

  saveState(state);
};

export const findEndpointBySlug = (slug: string): EndpointRecord | null => {
  const state = loadState();
  const endpoint = state.endpoints.find((entry) => entry.slug === slug);
  return endpoint ? { ...endpoint } : null;
};

export const resetEndpointStore = () => {
  cachedState = null;
  if (fs.existsSync(ENDPOINT_STORE_PATH)) {
    fs.rmSync(ENDPOINT_STORE_PATH, { force: true });
  }
};

export const endpointStorePath = ENDPOINT_STORE_PATH;
