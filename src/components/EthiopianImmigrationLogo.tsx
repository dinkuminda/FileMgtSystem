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
    lg: 'h-11 md:h-14',
    xl: 'h-14 md:h-20',
  }[size];

  return (
    <div 
      className={`flex items-center justify-center w-full max-w-full shrink select-none ${className}`} 
      id="ethiopian-immigration-logo"
    >
      <img 
        src="/assets/images/ics-logo.png" // Replace with your actual public asset path or import variable
        alt="Immigration and Citizenship Services Logo"
        className={`${logoHeightClass} w-auto max-w-full object-contain`} 
      />
    </div>
  );
}


     