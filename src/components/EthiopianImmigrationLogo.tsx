import React from 'react';

interface EthiopianImmigrationLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function EthiopianImmigrationLogo({ className = '', size = 'md' }: EthiopianImmigrationLogoProps) {
  const isSmall = size === 'sm';

  // Sizing definitions for SVG container
  const iconSize = isSmall ? 'w-5 h-5' : 'w-8 h-8 md:w-9 md:h-9';

  return (
    <div className={`flex items-center gap-2.5 select-none font-sans ${className}`} id="ethiopian-immigration-logo">
      {/* Sleek, sophisticated vector SVG shield with high contrast emblem accents */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg 
          className={`${iconSize} text-[#1b54ac]`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Outer Protection Shield */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {/* Inner Federal Emblem / Golden Star */}
          <path 
            d="M12 6.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" 
            className="fill-amber-400 stroke-amber-400 text-amber-500" 
            strokeWidth="0.5" 
          />
        </svg>
      </div>

      {!isSmall && (
        <div className="flex flex-col text-left leading-tight">
          <span className="text-sm font-black tracking-tight text-slate-900 uppercase">
            Ethiopian Immigration
          </span>
          <span className="text-[9.5px] font-black tracking-widest text-[#1b54ac] uppercase font-mono">
            Citizenship Services
          </span>
        </div>
      )}
    </div>
  );
}