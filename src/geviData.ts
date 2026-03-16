// GEVI Data Manager
// Provides unified access to GEVI data from modular JSON files in src/gevis/

import type { GEVI } from './types';

// Cache for loaded GEVIs
let geviCache: GEVI[] | null = null;

// Load all GEVIs from modular files (synchronous, uses eager import)
export function getAllGEVIs(): GEVI[] {
  if (geviCache) return geviCache;

  const modules = import.meta.glob('./gevis/*.json', { eager: true });
  const gevis: GEVI[] = [];

  for (const path in modules) {
    const gevi = modules[path] as GEVI;
    if (gevi?.id) {
      gevis.push(gevi);
    }
  }

  geviCache = gevis;
  return gevis;
}
