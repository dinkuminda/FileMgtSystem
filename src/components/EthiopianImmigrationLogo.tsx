import React from 'react';

interface EthiopianImmigrationLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function EthiopianImmigrationLogo({ className = '', size = 'md' }: EthiopianImmigrationLogoProps) {
  const isSmall = size === 'sm';

  // Scale fingerprint graphic based on size
  const iconSizeClass = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14 md:w-16 md:h-16',
    xl: 'w-18 h-18 md:w-24 md:h-24',
  }[size];

  // Scale the typography based on size
  const icsTextSize = {
    sm: 'text-lg',
    md: 'text-2xl md:text-3xl',
    lg: 'text-3xl md:text-4xl',
    xl: 'text-4xl md:text-5xl',
  }[size];

  const labelTextClass = {
    sm: 'hidden',
    md: 'text-[9.5px] leading-tight font-sans',
    lg: 'text-[11px] leading-tight font-sans',
    xl: 'text-[13px] leading-tight font-sans',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none font-sans ${className}`} id="ethiopian-immigration-logo">
      {/* Precision Vector Trademark Fingerprint and Checkmark */}
      <div className={`${iconSizeClass} shrink-0`} id="logo-emblem-svg">
        <svg 
          viewBox="0 0 180 160" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* GREEN LAYER (Outer/Top-Left Waves) */}
          <path 
            d="M 40 50 C 35 25, 60 10, 95 10 C 120 10, 140 22, 145 35" 
            stroke="#1F8E3C" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
          <path 
            d="M 25 70 C 20 40, 50 24, 95 24 C 130 24, 155 42, 158 60" 
            stroke="#1F8E3C" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
          <path 
            d="M 12 90 C 8 75, 12 55, 28 40" 
            stroke="#1F8E3C" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
          <path 
            d="M 140 52 C 132 45, 118 40, 100 40 C 82 40, 72 46, 68 54 C 64 62, 68 70, 78 72 C 86 74, 96 70, 100 66" 
            stroke="#1F8E3C" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />

          {/* YELLOW/ORANGE STRIPES (Mid Waves) */}
          <path 
            d="M 38 88 C 30 65, 52 38, 95 38 C 125 38, 142 50, 146 72" 
            stroke="#FAB415" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
          <path 
            d="M 24 105 C 18 95, 18 80, 26 70" 
            stroke="#FAB415" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
          <path 
            d="M 48 116 C 58 126, 68 134, 80 144" 
            stroke="#FAB415" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />

          {/* RED LAYER (Core/Inner-Left Loop) */}
          <path 
            d="M 52 104 C 45 90, 48 68, 80 54 C 105 44, 118 58, 114 74 C 110 90, 94 102, 70 120 C 60 128, 54 135, 48 142" 
            stroke="#D32F2F" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
          <path 
            d="M 38 122 C 32 114, 34 102, 38 92" 
            stroke="#D32F2F" 
            strokeWidth="8" 
            strokeLinecap="round" 
          />

          {/* BLUE LAYER (Fitted Checkmark + Right Nested Wave Guards) */}
          {/* Main Logo Checkmark */}
          <path 
            d="M 76 108 L 94 126 L 140 76" 
            stroke="#104BB3" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Nested Waves for the blue segment */}
          <path 
            d="M 88 124 L 102 138 L 152 86" 
            stroke="#104BB3" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 100 138 L 110 148 L 164 96" 
            stroke="#1F8E3C" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 64 96 L 76 108 L 116 66" 
            stroke="#104BB3" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 54 84 L 64 94 L 96 60" 
            stroke="#104BB3" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>

      {/* ICS LOGO MARK AND TITLES */}
      {!isSmall && (
        <div className="flex items-center gap-2.5 md:gap-3 text-left">
          {/* Bold Brand Initials */}
          <span className={`${icsTextSize} font-black tracking-tight text-[#104BB3]`}>
            ICS
          </span>
          
          {/* Vertical Separator exactly mirroring clean layout styles */}
          <div className="h-8 md:h-10 w-0.5 bg-slate-300 self-center shrink-0" />

          {/* Stacked Bilingual Text Details */}
          <div className={`flex flex-col ${labelTextClass} font-bold text-[#104BB3] select-none uppercase tracking-wide`}>
            <span className="font-sans font-black text-slate-800 tracking-tight leading-none mb-0.5 whitespace-nowrap">
              የኢሚግሬሽንና የዜግነት አገልግሎት
            </span>
            <span className="font-sans font-black text-[#104BB3] tracking-wider leading-none text-[8px] md:text-[9.5px]">
              IMMIGRATION AND CITIZENSHIP SERVICES
            </span>
          </div>
        </div>
      )}
    </div>
  );
}