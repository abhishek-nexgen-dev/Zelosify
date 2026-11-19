"use client";

import { useRouter } from "next/navigation";

export default function HomeErrorPage() {
  const router = useRouter();
  return (
    <>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] p-4 text-slate-100">
        {}
        <div className="w-full max-w-md mb-8">
          <svg
            className="w-full h-auto"
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M200 50 L350 200 L50 200 Z" fill="url(#gradient)" className="animate-pulse" />
            <rect
              x="150"
              y="100"
              width="100"
              height="150"
              rx="10"
              className="stroke-lime-400"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="200" cy="80" r="20" className="fill-lime-300" />
            <path
              d="M180 140 L220 140 M180 160 L220 160 M180 180 L220 180"
              stroke="currentColor"
              className="stroke-lime-200"
              strokeWidth="2"
            />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4d7c0f" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {}
        <div className="z-10 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Oops! Page Not Found.</h1>

          <p className="mx-auto max-w-md text-slate-300">
            The page you are looking for is not available or has been moved. Try a different page or
            go to homepage with the button below.
          </p>

          <button
            onClick={() => router.push("/")}
            className="inline-flex min-h-11 items-center rounded-lg bg-lime-300 px-8 py-3 font-semibold text-black transition-colors duration-200 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
          >
            Go To Home
          </button>
        </div>

        {}
        <div className="pointer-events-none absolute left-0 top-0 h-1/2 w-full bg-gradient-to-b from-lime-900/10 to-transparent" />
        <div className="absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-2 w-2 animate-pulse rounded-full bg-lime-300/40" />
          <div className="absolute right-1/3 top-1/3 h-3 w-3 animate-pulse rounded-full bg-lime-200/30" />
          <div className="absolute bottom-1/4 right-1/4 h-2 w-2 rounded-full bg-lime-400/30" />
        </div>
      </div>
    </>
  );
}
