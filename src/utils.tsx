import { COLORS } from './constants';
import type { GEVIColor } from './types';

// Get GEVI color based on emission wavelength/tags - kept for backward compatibility
export const getGEVIColor = (gevi: { tags?: string[]; category?: string; name: string }): GEVIColor => {
  const tags = gevi.tags || [];
  const category = gevi.category || '';
  const name = gevi.name.toLowerCase();

  // Chemigenetic/dye indicators - rainbow
  if (category.includes('Chemigenetic') || tags.includes('HaloTag') || tags.includes('Janelia Fluor') || name.includes('voltron') || name.includes('positron')) {
    return { color: 'rainbow', label: 'Dye' };
  }
  // Bioluminescent
  if (category.includes('Bioluminescent') || tags.includes('Bioluminescent') || tags.includes('Luciferase')) {
    return { color: COLORS.yellow, label: 'BL' };
  }
  // Green (500-550nm)
  if (tags.includes('Green') || category.includes('VSD-cpGFP') || category.includes('VSD-single')) {
    return { color: COLORS.green, label: '~510nm' };
  }
  // Yellow (550-580nm)
  if (tags.includes('Yellow') || tags.includes('cpYFP')) {
    return { color: COLORS.yellow, label: '~530nm' };
  }
  // Orange (580-600nm)
  if (tags.includes('Orange')) {
    return { color: COLORS.orange, label: '~590nm' };
  }
  // Red (600-650nm)
  if (tags.includes('Red') || tags.includes('RFP')) {
    return { color: COLORS.red, label: '~610nm' };
  }
  // Far-red (650-700nm)
  if (tags.includes('Far-red') || category.includes('Red FP GEVI')) {
    return { color: COLORS.farRed, label: '~660nm' };
  }
  // NIR (700nm+)
  if (tags.includes('NIR') || tags.includes('Near-infrared')) {
    return { color: COLORS.nir, label: '~700nm' };
  }
  // Opsin-based
  if (category.includes('Opsin') || tags.includes('Archaerhodopsin') || tags.includes('Proteorhodopsin')) {
    return { color: COLORS.farRed, label: '~660nm' };
  }
  // eFRET
  if (category.includes('eFRET')) {
    return { color: COLORS.green, label: '~510nm' };
  }
  // FRET
  if (category.includes('FRET')) {
    return { color: COLORS.green, label: '~510nm' };
  }
  // Ion channel
  if (category.includes('Ion-channel')) {
    return { color: COLORS.green, label: '~510nm' };
  }

  return { color: COLORS.gray, label: 'N/A' };
};

// Render rainbow text
export function RainbowText({ text }: { text: string }) {
  return (
    <span
      style={{
        background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}
