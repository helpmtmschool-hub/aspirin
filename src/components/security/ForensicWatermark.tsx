import React, { useEffect, useRef } from 'react';
import { useAppUser } from '../auth/AuthProvider';

export const ForensicWatermark: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAppUser();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let x = Math.random() * (window.innerWidth - 300);
    let y = Math.random() * (window.innerHeight - 100);
    let targetX = x;
    let targetY = y;
    let lastHopTime = Date.now();

    const resize = () => {
      if (canvas) {
        canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      // Hop to a new coordinate every 10 seconds
      if (now - lastHopTime > 10_000) {
        lastHopTime = now;
        targetX = Math.max(50, Math.random() * (canvas.width - 250));
        targetY = Math.max(50, Math.random() * (canvas.height - 80));
      }

      // Smooth lerp movement
      x += (targetX - x) * 0.05;
      y += (targetY - y) * 0.05;

      const userName = user?.fullName || 'Dr. Aspirant';
      const userEmail = user?.primaryEmailAddress?.emailAddress || 'studygroup@aspirinlms.org';
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

      ctx.save();
      ctx.globalAlpha = 0.18; // Subtle semi-transparent watermark
      ctx.font = '11px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;

      ctx.fillText(`• ${userName}`, x, y);
      ctx.fillText(`• ${userEmail}`, x, y + 14);
      ctx.fillText(`• ${timestamp} • UTC`, x, y + 28);

      ctx.restore();
      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, [user]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 pointer-events-none select-none w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
