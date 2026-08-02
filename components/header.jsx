import Image from "next/image";
import Link from "next/link";
import { SuiteMegaMenu } from "@/components/landing/suite-mega-menu";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background md:border-border/50 md:bg-background/85 md:backdrop-blur-md">
      <div className="relative mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image src={`${assetPrefix}/logo1.svg`} alt="Logo" width={20} height={20} />
          </div>
          <span className="truncate bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-sm font-bold tracking-tight text-transparent sm:text-base">
            Geiger Studios
          </span>
        </Link>

        <SuiteMegaMenu />

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/org"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Open Forms
          </Link>
        </div>
      </div>
    </header>
  );
}
