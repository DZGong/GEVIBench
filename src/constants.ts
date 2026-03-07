// Application Constants

import type { SortField } from './types';

// Filter defaults
export const DEFAULT_CATEGORY = 'All';
export const DEFAULT_YEAR = 'All';
export const DEFAULT_SORT: SortField = 'overall';

// Comparison
export const MAX_COMPARE_ITEMS = 5;

// Animation
export const TRANSITION_DURATION = 'transition-opacity';

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
    bg: 'bg-white',
    bgSecondary: 'bg-gray-50',
    bgTertiary: 'bg-gray-50',
    bgHover: 'bg-gray-50',
    border: 'border-gray-200',
    borderLight: 'border-gray-300',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textTertiary: 'text-gray-600',
    textMuted: 'text-gray-400',
    accent: 'text-blue-900',
    accentBg: 'bg-blue-900',
    accentBorder: 'border-blue-500',
    success: 'text-green-600',
    error: 'text-red-600',
  },
} as const;

// Metrics configuration
export const METRICS = [
  { key: 'brightness', name: 'Brightness', icon: '☀️' },
  { key: 'speed', name: 'Speed', icon: '⚡' },
  { key: 'snr', name: 'SNR', icon: '📊' },
  { key: 'dynamicRange', name: 'Range', icon: '📈' },
  { key: 'photostability', name: 'Stable', icon: '🛡️' },
  { key: 'paperCount', name: 'Papers', icon: '📄' },
] as const;

// Sort options
export const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'brightness', label: 'Brightness' },
  { value: 'speed', label: 'Speed' },
  { value: 'snr', label: 'SNR' },
  { value: 'dynamicRange', label: 'Range' },
  { value: 'photostability', label: 'Stable' },
  { value: 'paperCount', label: 'Papers' },
  { value: 'year', label: 'Year' },
];
