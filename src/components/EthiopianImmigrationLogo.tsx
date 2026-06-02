import React from 'react';
// @ts-ignore
import logoImg from '../assets/images/ics-logo-horizontal.png';

interface EthiopianImmigrationLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function EthiopianImmigrationLogo({ className = '', size = 'md' }: EthiopianImmigrationLogoProps) {
  const sizeClasses = {
    sm: 'h-7 w-auto max-w-[120px]',
    md: 'h-10 w-auto max-w-[200px]',
    lg: 'h-11 w-auto max-w-[240px]',
    xl: 'h-14 w-auto max-w-[300px]',
  };

  const finalClass = className || sizeClasses[size];

  return (
    <div className="flex items-center justify-center select-none" id="ethiopian-immigration-logo-container">
      <img 
        src={logoImg}
        className={`${finalClass} select-none flex-shrink-0 object-contain`} 
        alt="Ethiopian Immigration and Citizenship Services"
        referrerPolicy="no-referrer"
        id="ethiopian-immigration-logo"
      />
    </div>
  );
}