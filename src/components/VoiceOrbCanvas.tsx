import React, { useEffect, useRef } from "react";
import { SessionState } from "../modules/LiveSession";

interface VoiceOrbCanvasProps {
  state: SessionState;
  inputVolume: number;
  outputVolume: number;
  theme: string;
}

export const VoiceOrbCanvas: React.FC<VoiceOrbCanvasProps> = ({
  state,
  inputVolume,
  outputVolume,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 0;
    let pulseTime = 0;

    // Theme color palettes
    const themePalettes: Record<string, { core: string[]; wave: string; glow: string }> = {
      aurora: {
        core: ["#ec4899", "#8b5cf6", "#3b82f6"],
        wave: "rgba(236, 72, 153, 0.4)",
        glow: "rgba(139, 92, 246, 0.3)",
      },
      cyberpunk: {
        core: ["#06b6d4", "#f43f5e", "#a855f7"],
        wave: "rgba(6, 182, 212, 0.4)",
        glow: "rgba(244, 63, 94, 0.3)",
      },
      sunset: {
        core: ["#f97316", "#e11d48", "#f59e0b"],
        wave: "rgba(249, 115, 22, 0.4)",
        glow: "rgba(225, 29, 72, 0.3)",
      },
      cosmic: {
        core: ["#6366f1", "#a855f7", "#ec4899"],
        wave: "rgba(99, 102, 241, 0.4)",
        glow: "rgba(168, 85, 247, 0.3)",
      },
      emerald: {
        core: ["#10b981", "#06b6d4", "#3b82f6"],
        wave: "rgba(16, 185, 129, 0.4)",
        glow: "rgba(6, 182, 212, 0.3)",
      },
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      angle: number;
      speed: number;
      alpha: number;
    }> = Array.from({ length: 40 }, () => ({
      x: 0,
      y: 0,
      radius: Math.random() * 2 + 1,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.8 + 0.2,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      rotation += 0.008;
      pulseTime += 0.03;

      const palette = themePalettes[theme] || themePalettes.aurora;

      // Active volume dynamics
      const audioEnergy =
        state === "speaking"
          ? Math.max(outputVolume, 0.25)
          : state === "listening"
          ? Math.max(inputVolume, 0.15)
          : 0.05;

      const baseRadius = Math.min(width, height) * 0.22 * dpr;
      const orbRadius = baseRadius + audioEnergy * baseRadius * 0.6 + Math.sin(pulseTime) * 4;

      // 1. Draw outer ambient radial glow
      const bgGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        orbRadius * 0.2,
        centerX,
        centerY,
        orbRadius * 2.2
      );
      bgGlow.addColorStop(0, palette.glow);
      bgGlow.addColorStop(0.6, "rgba(15, 23, 42, 0.1)");
      bgGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric frequency wave rings
      const numRings = state === "speaking" ? 4 : 2;
      for (let i = 0; i < numRings; i++) {
        const ringRadius =
          orbRadius +
          (i + 1) * (18 * dpr) +
          Math.sin(pulseTime * 2 + i) * (8 * audioEnergy * 15 * dpr);

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = palette.wave;
        ctx.lineWidth = (2 - i * 0.4) * dpr;
        ctx.shadowColor = palette.core[0];
        ctx.shadowBlur = 12 * dpr;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Orbiting particles
      particles.forEach((p) => {
        p.angle += p.speed * 0.015 * (1 + audioEnergy * 2);
        const dist = orbRadius + Math.sin(p.angle * 3) * 15 + p.speed * 20;
        const px = centerX + Math.cos(p.angle) * dist;
        const py = centerY + Math.sin(p.angle) * dist;

        ctx.beginPath();
        ctx.arc(px, py, p.radius * dpr, 0, Math.PI * 2);
        ctx.fillStyle = palette.core[Math.floor(p.angle) % palette.core.length];
        ctx.globalAlpha = p.alpha * (state === "disconnected" ? 0.2 : 0.8);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // 4. Core Orb Gradient
      const coreGradient = ctx.createRadialGradient(
        centerX - orbRadius * 0.25,
        centerY - orbRadius * 0.25,
        orbRadius * 0.1,
        centerX,
        centerY,
        orbRadius
      );
      coreGradient.addColorStop(0, palette.core[0]);
      coreGradient.addColorStop(0.5, palette.core[1]);
      coreGradient.addColorStop(1, palette.core[2]);

      ctx.save();
      ctx.beginPath();

      // Distort orb geometry based on real-time audio waveform
      const numPoints = 64;
      for (let i = 0; i <= numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const waveOffset =
          Math.sin(theta * 6 + rotation * 4) * (audioEnergy * 14 * dpr) +
          Math.cos(theta * 8 - rotation * 2) * (audioEnergy * 8 * dpr);

        const r = orbRadius + waveOffset;
        const x = centerX + Math.cos(theta + rotation * 0.2) * r;
        const y = centerY + Math.sin(theta + rotation * 0.2) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.fillStyle = coreGradient;
      ctx.shadowColor = palette.core[0];
      ctx.shadowBlur = 25 * dpr;
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [state, inputVolume, outputVolume, theme]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
