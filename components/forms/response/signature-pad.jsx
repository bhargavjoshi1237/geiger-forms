"use client";

import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@geiger/ui/button";

// Minimal pointer-driven signature canvas; reports a PNG data URL (or "" when cleared).
export function SignaturePad({ onChange, height = 140 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "black";
  }, [height]);

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) onChange?.(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange?.("");
  };

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        style={{ height }}
        className="w-full touch-none rounded-md border border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        aria-label="Signature pad"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-tertiary">Sign with your mouse, pen or finger</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-text-secondary" onClick={clear}>
          <Eraser className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>
    </div>
  );
}
