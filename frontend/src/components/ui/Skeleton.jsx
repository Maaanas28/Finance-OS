import React from 'react';

export function Skeleton({ className = '', variant = 'text' }) {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={`animate-pulse bg-[#151f33] ${variantStyles[variant]} ${className}`}
    />
  );
}
