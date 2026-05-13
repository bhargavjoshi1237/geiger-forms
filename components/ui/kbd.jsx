import { cn } from "@/lib/utils";

function Kbd({ className, ...props }) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-sans text-xs font-medium select-none",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }) {
  return <kbd className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

export { Kbd, KbdGroup };
