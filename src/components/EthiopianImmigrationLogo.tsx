import React from 'react';
// @ts-ignore
import logoImg from '../assets/images/ics-logo-horizontal.png';

interface EthiopianImmigrationLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function EthiopianImmigrationLogo({ className = '', size = 'md' }: EthiopianImmigrationLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-auto max-w-[100px]',
    md: 'h-8 w-auto max-w-[180px]',
    lg: 'h-10 w-auto max-w-[220px]',
    xl: 'h-12 w-auto max-w-[260px]',
  };

  const finalClass = className || sizeClasses[size];

  return (
    <img 
      src={logoImg}
      className={`${finalClass} select-none flex-shrink-0 object-contain`} 
      alt="Ethiopian Immigration and Citizenship Services"
      referrerPolicy="no-referrer"
      id="ethiopian-immigration-logo"
    />
  );
}