import React from 'react';
import logoImg from './logo.png';

interface Props {
  size?: number;
  showText?: boolean;
  textColor?: 'white' | 'dark';
}

export default function AppLogo({ size = 60, showText = false, textColor = 'dark' }: Props) {
  const textFill = textColor === 'white' ? '#ffffff' : '#0f1b0a';
  const subFill  = textColor === 'white' ? 'rgba(255,255,255,0.75)' : '#7c3aed';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <img
        src={logoImg}
        alt="Ndiggël App"
        width={size}
        height={size}
        style={{ objectFit: 'contain', display: 'block' }}
      />
      {showText && (
        <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
            fontSize: Math.round(size * 0.24),
            fontWeight: 800,
            color: textFill,
            letterSpacing: '2px',
          }}>
            NDIGGËL
          </div>
          <div style={{
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
            fontSize: Math.round(size * 0.18),
            fontWeight: 600,
            color: subFill,
            letterSpacing: '4px',
          }}>
            APP
          </div>
        </div>
      )}
    </div>
  );
}
