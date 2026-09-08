import React from 'react';
import logoImg from '../../assets/logo.png';

export function LogoIcon({ className = 'w-8 h-8', useImage = false }) {
  if (useImage) {
    return (
      <img
        src={logoImg}
        alt="Finance OS Logo"
        className={`object-contain rounded-md border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)] ${className}`}
      />
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer Hexagonal Shield SVG with Cyan-Emerald Gradient */}
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
        <defs>
          <linearGradient id="finOsLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="finOsGlowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Hexagon Border */}
        <polygon
          points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
          fill="url(#finOsGlowGrad)"
          stroke="url(#finOsLogoGrad)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Chart Bars inside */}
        <rect x="24" y="52" width="6" height="20" rx="1.5" fill="url(#finOsLogoGrad)" opacity="0.6" />
        <rect x="34" y="42" width="6" height="30" rx="1.5" fill="url(#finOsLogoGrad)" opacity="0.8" />
        <rect x="44" y="32" width="6" height="40" rx="1.5" fill="url(#finOsLogoGrad)" opacity="1.0" />

        {/* Dynamic Growth Trend Arrow + Circuit Node */}
        <path
          d="M 22 66 L 36 50 L 48 58 L 76 26"
          stroke="#38bdf8"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points="78,22 84,32 70,30" fill="#38bdf8" />

        {/* Glowing Node Dot */}
        <circle cx="48" cy="58" r="4" fill="#67e8f9" className="animate-pulse" />
        <circle cx="48" cy="58" r="7" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
      </svg>
    </div>
  );
}
