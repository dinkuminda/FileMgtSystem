import React from 'react';

interface EthiopianImmigrationLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function EthiopianImmigrationLogo({ className = '', size = 'md' }: EthiopianImmigrationLogoProps) {
  
  // Scale image height classes exactly matching your layout parameters
  const logoHeightClass = {
    sm: 'h-8',
    md: 'h-10 md:h-12',
    lg: 'h-12 md:h-16',
    xl: 'h-16 md:h-24',
  }[size];

  return (
    <div 
      className={`flex items-center text-left shrink-0 select-none ${className}`} 
      id="ethiopian-immigration-logo"
    >
      <img 
        src="/Ics-logo-horizontal.png" // Replace with your actual public asset path or import variable
        alt=""
        className={`${logoHeightClass} w-auto object-contain`} 
      />
    </div>
  );
}


     