// Application Constants

import type { SortField } from './types';

// Filter defaults
export const DEFAULT_CATEGORY = 'All';
export const DEFAULT_YEAR = 'All';
export const DEFAULT_SORT: SortField = 'overall';

// Comparison
export const MAX_COMPARE_ITEMS = 5;

// Colors
export const COLORS = {
  // Spectrum colors
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  farRed: '#7f1d1d',
  nir: '#9333ea',
  gray: '#6b7280',

  // Theme colors
  dark: {
    bg: 'bg-gray-900',
    bgSecondary: 'bg-gray-800',
    bgTertiary: 'bg-gray-750',
    bgHover: 'bg-gray-700',
    border: 'border-gray-700',
    borderLight: 'border-gray-600',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    textTertiary: 'text-gray-400',
    textMuted: 'text-gray-500',
    accent: 'text-blue-400',
    accentBg: 'bg-blue-900',
    accentBorder: 'border-blue-500',
    success: 'text-green-400',
    error: 'text-red-400',
  },
  light: {
    bg: 'bg-warm-bg',
    bgSecondary: 'bg-warm-surface',
    bgTertiary: 'bg-warm-accent',
    bgHover: 'bg-warm-accent',
    border: 'border-warm-border',
    borderLight: 'border-warm-border',
    text: 'text-warm-text',
    textSecondary: 'text-warm-text',
    textTertiary: 'text-warm-muted',
    textMuted: 'text-warm-muted',
    accent: 'text-warm-text',
    accentBg: 'bg-warm-text',
    accentBorder: 'border-warm-text',
    success: 'text-green-600',
    error: 'text-red-600',
  },
} as const;

// Metrics configuration (used by GEVIDetail)
export const METRICS = [
  { key: 'brightness', name: 'Brightness', icon: 'Sun' },
  { key: 'speed', name: 'Speed', icon: 'Zap' },
  { key: 'snr', name: 'SNR', icon: 'Activity' },
  { key: 'dynamicRange', name: 'Range', icon: 'TrendingUp' },
  { key: 'photostability', name: 'Stable', icon: 'Shield' },
  { key: 'paperCount', name: 'Papers', icon: 'FileText' },
] as const;
