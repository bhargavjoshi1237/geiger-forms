"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, Keyboard, Loader2, PenLine } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { cn } from "@/lib/utils";
import { fieldIds } from "./field-shell";
import { uploadToForm } from "./upload";

const PAD_HEIGHT = 170;
const INK = "#111111";

function dataUrlToBlob(dataUrl) {
  const [head, body] = String(dataUrl).split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] || "image/png";
  const bin = atob(body || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Renders a typed name as a cursive PNG data URL.
function typedSignature(name, width) {
  const canvas = document.createElement("canvas");
  const ratio = 2;
  canvas.width = width * ratio;
  canvas.height = PAD_HEIGHT * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  let size = 44;
  const family = getComputedStyle(document.body).getPropertyValue("--font-playfair") || "serif";
  do {
    ctx.font = `italic ${size}px ${family}, "Brush Script MT", cursive`;
    size -= 2;
  } while (ctx.measureText(name).width > width - 40 && size > 16);
  ctx.fillText(name, 20, PAD_HEIGHT / 2);
  return canvas.toDataURL("image/png");
}

// Signature pad (pointer events) with a typed fallback. Answer: PNG data URL, then { path, signedAt } once uploaded.
export function SignatureField({ field, value, onChange, disabled, aria, slug, tr }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const timer = useRef(null);
  const seq = useRef(0);
  const [mode, setMode] = useState("draw");
  const [typed, setTyped] = useState("");
  const [uploading, setUploading] = useState(false);
  const [hasInk, setHasInk] = useState(() => typeof value === "string" && value.startsWith("data:"));
  const ids = fieldIds(field);
  const locked = disabled || field.readOnly;
  const onFile = value && typeof value === "object" && value.path;

  // Size the canvas once for the device pixel ratio and paint any existing data-URL value.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ratio = window.devicePixelRatio || 1;
    const width = wrap.clientWidth;
    canvas.width = width * ratio;
    canvas.height = PAD_HEIGHT * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${PAD_HEIGHT}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    if (typeof value === "string" && value.startsWith("data:")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, PAD_HEIGHT);
      img.src = value;
    }
    // Only on mount / mode switch: repainting on every value change would wipe live strokes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (dataUrl) => {
    onChange(dataUrl);
    if (!slug) return;
    clearTimeout(timer.current);
    const mine = (seq.current += 1);
    timer.current = setTimeout(async () => {
      setUploading(true);
      const result = await uploadToForm(slug, field.id, dataUrlToBlob(dataUrl), { name: "signature.png" });
      if (mine !== seq.current) return;
      setUploading(false);
      if (result.file) onChange({ path: result.file.path, signedAt: new Date().toISOString() });
    }, 800);
  };

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    if (locked) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  };

  const onPointerMove = (e) => {
    if (!drawing.current) return;
    const p = point(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = e.pressure && e.pointerType === "pen" ? 1.2 + e.pressure * 2.4 : 2.2;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setHasInk(true);
    commit(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    seq.current += 1;
    clearTimeout(timer.current);
    setUploading(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setTyped("");
    onChange(undefined);
  };

  const applyTyped = (name) => {
    setTyped(name);
    if (!name.trim()) {
      onChange(undefined);
      return;
    }
    const width = wrapRef.current?.clientWidth || 480;
    commit(typedSignature(name.trim(), width));
  };

  return (
    <div className="grid gap-2" {...aria}>
      <div ref={wrapRef} className="relative">
        {mode === "draw" ? (
          <div className={cn("relative overflow-hidden rounded-lg border border-border-strong bg-white", locked && "opacity-70")}>
            <canvas
              ref={canvasRef}
              id={ids.control}
              role="img"
              aria-label={tr("signHere")}
              className={cn("block touch-none", !locked && "cursor-crosshair")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-zinc-300" />
            {!hasInk && !onFile && (
              <span className="pointer-events-none absolute bottom-3 left-6 flex items-center gap-1.5 text-xs text-zinc-400">
                <PenLine className="size-3.5" /> {tr("signHere")}
              </span>
            )}
            {onFile && !hasInk && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
                <Check className="size-4" /> {field.label || "Signed"}
              </span>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            <Input
              id={ids.control}
              value={typed}
              disabled={locked}
              placeholder={tr("typeYourName")}
              autoComplete="name"
              onChange={(e) => applyTyped(e.target.value)}
              className="bg-surface-card"
            />
            <div className="flex h-24 items-center overflow-hidden rounded-lg border border-border-strong bg-white px-5">
              <span className="truncate text-4xl italic text-zinc-900" style={{ fontFamily: "var(--font-playfair), cursive" }}>
                {typed || " "}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-text-tertiary" aria-live="polite">
          {uploading && (
            <>
              <Loader2 className="size-3.5 animate-spin" /> {tr("uploading")}
            </>
          )}
          {!uploading && onFile && (
            <>
              <Check className="size-3.5 text-emerald-500" /> {tr("saved")}
            </>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={locked}
            onClick={() => {
              clear();
              setMode((m) => (m === "draw" ? "type" : "draw"));
            }}
          >
            {mode === "draw" ? <Keyboard /> : <PenLine />}
            {mode === "draw" ? tr("typeSignature") : tr("drawSignature")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={locked} onClick={clear}>
            <Eraser />
            {tr("clear")}
          </Button>
        </div>
      </div>
    </div>
  );
}
