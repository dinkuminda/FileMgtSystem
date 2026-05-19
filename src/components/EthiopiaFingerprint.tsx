import React from 'react';

export const EthiopiaFingerprint = ({ className = "w-12 h-12", monochrome = false }: { className?: string, monochrome?: boolean }) => {
  const blue = "#1b54ac";
  const green = monochrome ? blue : "#1B7340";
  const yellow = monochrome ? blue : "#F9B115";
  const red = monochrome ? blue : "#D32F2F";
  const darkBlue = "#0D47A1";

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Outer Green Ridges */}
      <path d="M15 35C15 15 35 5 55 5C75 5 95 25 95 45" stroke={green} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M7 45C7 20 25 10 50 10C75 10 90 30 90 50" stroke={green} strokeWidth="4.5" strokeLinecap="round" />
      
      {/* Yellow Ridges */}
      <path d="M12 55C12 35 30 20 50 20C70 20 85 35 85 55" stroke={yellow} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M5 65C5 50 15 30 45 30C75 30 80 55 80 70" stroke={yellow} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M25 85C15 80 10 65 20 50" stroke={yellow} strokeWidth="4.5" strokeLinecap="round" />

      {/* Red Ridges (Inner Core) */}
      <path d="M55 35C65 35 70 50 65 65" stroke={red} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M45 40C55 40 60 55 55 70" stroke={red} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M35 50C40 45 50 45 50 60C50 75 40 80 30 75" stroke={red} strokeWidth="4.5" strokeLinecap="round" />

      {/* Blue "Check" Pattern (Bottom Right) */}
      <path d="M45 75L55 85L85 55" stroke={monochrome ? blue : darkBlue} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 85L55 95L95 60" stroke={monochrome ? blue : darkBlue} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Interleaving Green/Yellow at the bottom */}
      <path d="M65 85C75 80 90 85 95 95" stroke={green} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M55 100L70 95" stroke={yellow} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
};
