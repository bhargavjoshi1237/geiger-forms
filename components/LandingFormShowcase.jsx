import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import FormPlayground from "@/components/FormPlayground";

const showcaseBackgroundImages = [
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-00a586c62c8782e65c0a.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/internal-brand-023-3291bb4c.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-0ec1f3ba625f482c9dc3.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-85923e7fafe00c9c0d1f.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-8e2e88cff7f33224ddd7.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-0a66efa21dd4b7e6c526.jpg",
  "https://200rfrtp5x71tlmk.public.blob.vercel-storage.com/geiger-dash/cursor-assets/asset-cc24ca462279ca23250c.jpg",
];

function getRandomBackground() {
  return showcaseBackgroundImages[Math.floor(Math.random() * showcaseBackgroundImages.length)];
}

export default function LandingFormShowcase({ ctaHref, ctaLabel }) {
  const bg = getRandomBackground();

  return (
    <section
      className="rounded-2xl border border-zinc-800 bg-cover bg-center p-3 sm:rounded-3xl sm:p-6 md:p-8 xl:p-10"
      style={{ backgroundImage: `url('${bg}')` }}
    >
      <div className="flex flex-col gap-6 sm:gap-10">
        <div className="space-y-5">
          <div className="mx-auto mb-4 mt-4 flex w-[92%] flex-col items-start gap-4 sm:mb-6 sm:mt-6 sm:w-[90%]">
            <h3 className="text-3xl font-semibold leading-tight text-white">
              Build in real time with the full Geiger Forms interface.
            </h3>

            <p className="max-w-sm text-zinc-300">
              This playground shows the form builder, filler preview, response
              summary, and publishing controls together. No save and no load,
              just pure exploration.
            </p>

            <Link
              href={ctaHref}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-100 px-5 font-medium text-zinc-950 transition-colors hover:bg-white"
            >
              {ctaLabel || "Checkout Forms"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative rounded-2xl border border-zinc-700/80 bg-[#191919]/70 p-2 shadow-2xl backdrop-blur-md sm:p-3">
          <div className="h-[430px] overflow-hidden rounded-xl border border-zinc-800 bg-[#161616] sm:h-[460px] lg:h-[600px]">
            <Suspense fallback={null}>
              <FormPlayground />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
