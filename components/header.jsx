import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, FileText, LayoutGrid } from "lucide-react";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

export function Header() {
  const products = [
    { icon: LayoutGrid, label: "Flow", description: "Plan and track work.", href: "/flow" },
    { icon: FileText, label: "Notes", description: "Write and collaborate.", href: "/notes" },
    { icon: ClipboardList, label: "Forms", description: "Collect responses.", href: "/forms" },
    { icon: BarChart3, label: "Grey", description: "AI workspace tools.", href: "#" },
  ];

  const resources = [
    { label: "Documentation", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Blog", href: "/blog" },
    { label: "GitHub Repository", href: "#" },
    { label: "Self Host Geiger", href: "#" },
  ];

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

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <div className="group">
            <button className="flex items-center gap-1 py-6 transition-colors hover:text-foreground">
              Features
            </button>

            <div className="invisible absolute left-1/2 top-full w-[640px] -translate-x-1/2 translate-y-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="rounded-xl border border-border bg-surface-subtle p-4 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground0">Products</p>
                    <div className="space-y-1">
                      {products.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            href={item.href}
                            key={item.label}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-foreground">{item.label}</p>
                              <p className="text-xs text-foreground0">{item.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground0">Resources</p>
                    <div className="space-y-1">
                      {resources.map((item) => (
                        <Link
                          href={item.href}
                          key={item.label}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                        >
                          {item.label}
                          <ArrowRight className="h-3.5 w-3.5 text-foreground0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Link href="/pricing" className="py-6 transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/forms"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Open Forms
          </Link>
        </div>
      </div>
    </header>
  );
}
