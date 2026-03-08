import React from 'react';

interface BonusBadgeProps {
  type: 'redShift' | 'twoPhoton' | 'positiveGoing';
  size?: 'sm' | 'md' | 'lg';
}

const badgeConfig = {
  redShift: {
    label: 'Red-shifted',
    color: '#ef4444', // red
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3/5 h-3/5">
        <path d="M12 8C10 8 8 9 8 11C8 13 10 14 12 14" strokeLinecap="round" />
        <path d="M12 14V18" strokeLinecap="round" />
        <circle cx="12" cy="11" r="1.5" fill="currentColor" />
      </svg>
    ),
    tooltip: 'Red-shifted for deep tissue imaging (+3 pts)'
  },
  twoPhoton: {
    label: '2-Photon',
    color: '#8b5cf6', // violet
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3/5 h-3/5">
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <circle cx="15" cy="10" r="1.5" fill="currentColor" />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" />
      </svg>
    ),
    tooltip: 'Two-photon verified (+3 pts)'
  },
  positiveGoing: {
    label: 'Positive',
    color: '#22c55e', // green
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3/5 h-3/5">
        <path d="M8 12H16" strokeLinecap="round" />
        <path d="M12 8V16" strokeLinecap="round" />
      </svg>
    ),
    tooltip: 'Positive-going signal (+3 pts)'
  }
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
};

const labelSizeClasses = {
  sm: 'text-[8px]',
  md: 'text-[9px]',
  lg: 'text-xs'
};

export const BonusBadge: React.FC<BonusBadgeProps> = ({ type, size = 'md' }) => {
  const config = badgeConfig[type];

  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} relative flex items-center justify-center transition-transform hover:scale-110`}
        style={{
          filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.2))`
        }}
      >
        {/* Single hexagon background */}
        <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full">
          <path
            d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
            fill={`${config.color}15`}
            stroke={config.color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {/* Icon */}
        <div className="relative z-10" style={{ color: config.color }}>
          {config.icon}
        </div>
      </div>
      <span className={`${labelSizeClasses[size]} font-medium text-gray-600 dark:text-gray-400`}>
        {config.label}
      </span>

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block z-50">
        <div className="px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap">
          {config.tooltip}
        </div>
      </div>
    </div>
  );
};

interface BonusBadgesProps {
  gevi: {
    tags?: string[];
    category?: string;
    dynamicRangeData?: {
      sign?: string;
    };
    researchPapers?: Array<{
      title?: string;
      sample?: string;
    }>;
  };
  size?: 'sm' | 'md' | 'lg';
}

export const BonusBadges: React.FC<BonusBadgesProps> = ({ gevi, size = 'md' }) => {
  const badges: ('redShift' | 'twoPhoton' | 'positiveGoing')[] = [];

  // Check for red-shifted (Far-red tag or similar)
  if (gevi.tags?.some(t =>
    t.toLowerCase().includes('far-red') ||
    t.toLowerCase().includes('red') ||
    t.toLowerCase().includes('nir')
  )) {
    badges.push('redShift');
  }

  // Check for two-photon (Two-photon tag or in research papers)
  if (gevi.tags?.some(t => t.toLowerCase().includes('two-photon'))) {
    badges.push('twoPhoton');
  } else if (gevi.researchPapers?.some(p =>
    p.title?.toLowerCase().includes('two-photon') ||
    p.sample?.toLowerCase().includes('two-photon')
  )) {
    badges.push('twoPhoton');
  }

  // Check for positive-going
  if (gevi.tags?.some(t => t.toLowerCase().includes('positive'))) {
    badges.push('positiveGoing');
  } else if (gevi.dynamicRangeData?.sign === 'positive') {
    badges.push('positiveGoing');
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex items-start gap-2">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 pt-1">
        Bonus:
      </div>
      <div className="flex gap-3">
        {badges.map(badge => (
          <BonusBadge key={badge} type={badge} size={size} />
        ))}
      </div>
    </div>
  );
};

export default BonusBadge;
