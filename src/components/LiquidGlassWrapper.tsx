import React from 'react';

interface LiquidGlassWrapperProps {
  children: React.ReactNode;
  className?: string;
  cornerRadius?: number;
  variant?: 'regular' | 'clear';
  style?: React.CSSProperties;
}

export const LiquidGlassWrapper: React.FC<LiquidGlassWrapperProps> = ({
  children,
  className = '',
  cornerRadius = 16,
  variant = 'regular',
  style = {},
}) => {
  const baseGlassClass = variant === 'clear' 
    ? 'apple-glass-clear' 
    : 'apple-glass';

  return (
    <div
      className={`${baseGlassClass} ${className}`}
      style={{
        borderRadius: `${cornerRadius}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
