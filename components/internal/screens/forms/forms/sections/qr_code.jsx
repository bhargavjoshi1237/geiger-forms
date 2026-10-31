"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrCodeIcon, X } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { Skeleton } from "@geiger/ui/skeleton";
import { LoadingArea } from "@geiger/ui/screen-kit";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@geiger/ui/dialog";
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
          <Skeleton className="rounded bg-surface-hover" style={{ width: size, height: size }} />
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

const VIEWER_ICON_BTN = "rounded-full text-white/80 hover:bg-white/10 hover:text-white";

// Full-screen stage for the QR; the dark backdrop stays in both themes, like a photo viewer.
function QrViewerStage({ text, fileName, onClose }) {
  const url = useQrDataUrl(text, 1024);
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-5">
        <div className="min-w-0">
          <DialogTitle className="text-sm font-medium text-white/90">QR code</DialogTitle>
          <DialogDescription className="truncate text-xs text-white/50">{text}</DialogDescription>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {url ? (
            <Button asChild variant="ghost" size="icon-lg" className={VIEWER_ICON_BTN}>
              <a href={url} download={fileName} aria-label="Download PNG" title="Download PNG">
                <Download className="size-5" />
              </a>
            </Button>
          ) : null}
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-lg" aria-label="Close" title="Close" className={VIEWER_ICON_BTN}>
              <X className="size-5" />
            </Button>
          </DialogClose>
        </div>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="QR code for the public form link"
            className="aspect-square max-h-full max-w-full rounded-lg bg-white p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-300"
          />
        ) : (
          <LoadingArea size={56} label="Generating QR code" />
        )}
      </div>
    </>
  );
}

// Icon button that opens the QR in the full-screen viewer.
export function QrViewerButton({ text, fileName = "form-qr.png", className }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="View QR code"
        title="View QR code"
        onClick={() => setOpen(true)}
        className={cn(OUTLINE_BTN, className)}
      >
        <QrCodeIcon className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-black/90 p-0 text-white shadow-none"
        >
          <QrViewerStage text={text} fileName={fileName} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
