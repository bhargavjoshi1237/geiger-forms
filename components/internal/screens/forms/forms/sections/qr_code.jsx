"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { OUTLINE_BTN } from "./kit";

// PNG data URL for `text` (black on white so it scans in print and on screen).
export function useQrDataUrl(text, size = 320) {
  const [state, setState] = useState({ text: null, url: null });
  useEffect(() => {
    if (!text) return undefined;
    let alive = true;
    QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => alive && setState({ text, url }))
      .catch(() => alive && setState({ text, url: null }));
    return () => {
      alive = false;
    };
  }, [text, size]);
  return state.text === text ? state.url : null;
}

export function QrCode({ text, size = 144, fileName = "form-qr.png", download = true, className }) {
  const url = useQrDataUrl(text, 512);
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="grid place-items-center rounded-lg border border-border bg-white p-2" style={{ width: size + 16, height: size + 16 }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="QR code for the public form link" width={size} height={size} />
        ) : (
          <div className="animate-pulse rounded bg-surface-hover" style={{ width: size, height: size }} />
        )}
      </div>
      {download ? (
        <Button asChild={Boolean(url)} type="button" variant="outline" size="sm" disabled={!url} className={OUTLINE_BTN}>
          {url ? (
            <a href={url} download={fileName}>
              <Download className="h-3.5 w-3.5" /> Download PNG
            </a>
          ) : (
            <span>
              <Download className="h-3.5 w-3.5" /> Download PNG
            </span>
          )}
        </Button>
      ) : null}
    </div>
  );
}
