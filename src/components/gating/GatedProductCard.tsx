'use client';

import { ReactNode } from 'react';
import BlurOverlay from './BlurOverlay';

interface GatedProductCardProps {
  children: ReactNode;
  isLocked: boolean;
}

export default function GatedProductCard({ children, isLocked }: GatedProductCardProps) {
  return (
    <div className={`relative ${isLocked ? 'pointer-events-none' : ''}`}>
      {isLocked && (
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40" />
        </div>
      )}
      <div className={isLocked ? 'opacity-50' : ''}>{children}</div>
    </div>
  );
}
