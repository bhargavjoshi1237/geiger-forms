import Image from "next/image";
import Link from "next/link";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

export default function Footer() {
  return (
    <div className="bg-zinc-950">
      <footer className="relative z-30 w-full border-t border-zinc-800/50 bg-zinc-950 px-6 pb-8 pt-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 md:col-span-4 lg:col-span-2">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center">
                  <Image src={`${assetPrefix}/logo1.svg`} alt="Logo" width={20} height={20} />
                </div>
                <span className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                  Geiger Studios
                </span>
              </div>
              <p className="max-w-sm text-sm text-zinc-500">
                Built to Manage. Designed to Create.
                <br /> Turn your ideas into something real with a single suite that combines solid
                management tools and easy-to-use creative features.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-zinc-100">Products</h4>
              <ul className="space-y-3">
                <li><Link href="/flow" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">Geiger Flow</Link></li>
                <li><Link href="/notes" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">Geiger Notes</Link></li>
                <li><Link href="/forms" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">Geiger Forms</Link></li>
                <li><Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">Geiger Grey</Link></li>
                <li><Link href="#" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">Geiger Enterprise</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-zinc-100">Resources</h4>
              <ul className="flex flex-col gap-3 text-sm text-zinc-400">
                <li><Link href="/docs" className="transition-colors hover:text-zinc-100">Documentation</Link></li>
                <li><Link href="#" className="transition-colors hover:text-zinc-100">Help Center</Link></li>
                <li><Link href="#" className="transition-colors hover:text-zinc-100">Community</Link></li>
                <li><Link href="#" className="transition-colors hover:text-zinc-100">Contact Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-zinc-100">Company</h4>
              <ul className="flex flex-col gap-3 text-sm text-zinc-400">
                <li><Link href="#" className="transition-colors hover:text-zinc-100">About</Link></li>
                <li><Link href="/blog" className="transition-colors hover:text-zinc-100">Blog</Link></li>
                <li><Link href="#" className="transition-colors hover:text-zinc-100">Careers</Link></li>
                <li><Link href="#" className="transition-colors hover:text-zinc-100">Legal</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-800/50 pt-8 text-sm text-zinc-500 md:flex-row">
            <p>&copy; {new Date().getFullYear()} Geiger Studios. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="transition-colors hover:text-zinc-300">Privacy Policy</Link>
              <Link href="#" className="transition-colors hover:text-zinc-300">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
      <div className="relative z-0 mt-10 flex justify-center bg-zinc-950">
        <h1 className="select-none text-[13vw] font-bold leading-none tracking-tighter text-zinc-100/5 pointer-events-none">
          GEIGER STUDIO
        </h1>
      </div>
    </div>
  );
}
