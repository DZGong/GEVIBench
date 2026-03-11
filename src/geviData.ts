// GEVI Data Manager
// Provides unified access to GEVI data from modular JSON files
// Modular: each GEVI is in its own JSON file in src/gevis/

import type { GEVI, TreeNode, SpectrumData, VoltageCurveData } from './types';

// Cache
let geviCache: GEVI[] | null = null;
let familyTreeCache: { tree: Record<string, TreeNode>; geviPaths: Record<string, string[]> } | null = null;

// Get all GEVIs from modular files
export async function getAllGEVIs(): Promise<GEVI[]> {
  if (geviCache) return geviCache;

  // Load from modular gevis directory
  const modules = import.meta.glob('./gevis/*.json', { eager: true });
  const gevis: GEVI[] = [];

  for (const path in modules) {
    const gevi = modules[path] as GEVI;
    if (gevi?.id) {
      gevis.push(gevi);
    }
  }

  if (gevis.length > 0) {
    gevis.sort((a, b) => (b.overall || 0) - (a.overall || 0));
    geviCache = gevis;
    return gevis;
  }

  // No GEVIs found - this shouldn't happen if modular files exist
  console.warn('No GEVIs found in src/gevis/ directory');
  return [];
}

// Get single GEVI by ID
export async function getGEVI(id: string): Promise<GEVI | null> {
  const gevis = await getAllGEVIs();
  return gevis.find(g => g.id === id) || null;
}

// Get GEVI IDs list
export function getGEVIIds(): string[] {
  // This could also be loaded from a separate index.json file
  return [];
}

// Get family tree data - tries modular first, falls back to embedded
export async function getFamilyTreeData(): Promise<{ tree: Record<string, TreeNode>; geviPaths: Record<string, string[]> }> {
  if (familyTreeCache) return familyTreeCache;

  try {
    // Try to load from modular data file
    const module = await import('./data/family-tree.json');
    familyTreeCache = module.default || module;
    return familyTreeCache;
  } catch {
    // Fallback to embedded data - import dynamically to avoid circular deps
    const { FAMILY_TREE, GEVI_PATHS } = await import('./FamilyTree');
    familyTreeCache = { tree: FAMILY_TREE as Record<string, TreeNode>, geviPaths: GEVI_PATHS };
    return familyTreeCache;
  }
}

// Get spectrum data for a GEVI
export async function getSpectrumData(geviId: string): Promise<SpectrumData | null> {
  try {
    // Try to load from modular spectrum file
    const module = await import(`./data/spectrum/${geviId}.json`);
    return module.default || module;
  } catch {
    // Fallback to embedded in SpectrumViewer
    return null;
  }
}

// Get voltage curve data for a GEVI
export async function getVoltageCurveData(geviId: string): Promise<VoltageCurveData | null> {
  try {
    // Try to load from modular voltage file
    const module = await import(`./data/voltage/${geviId}.json`);
    return module.default || module;
  } catch {
    // Fallback to embedded in VoltageCurveViewer
    return null;
  }
}

