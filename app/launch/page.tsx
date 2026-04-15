import Image from 'next/image';
import { LaunchRedirect } from './LaunchRedirect';

// Statically generated at build time, served from Vercel's edge CDN.
// Renders in ~100-200ms on cold boot — replaces the 3s blank white screen
// that the dynamic /dashboard page causes on iOS PWA cold starts.
export const dynamic = 'force-static';

export default function LaunchPage() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0A0A0B]">
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/icons/icon-512x512.png"
          alt="Gritful"
          width={120}
          height={120}
          priority
          className="rounded-3xl"
        />
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Gritful
        </h1>
        <div className="mt-4 h-1 w-16 animate-pulse rounded-full bg-emerald-500/60" />
      </div>
      <LaunchRedirect />
    </div>
  );
}
