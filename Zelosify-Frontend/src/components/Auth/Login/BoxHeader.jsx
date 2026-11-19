import { ShieldCheck } from "lucide-react";

export default function BoxHeader() {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between gap-3">
        <img
          src="/assets/logos/main-logo.png"
          alt="Zelosify"
          width={128}
          height={40}
          className="h-8 w-auto object-contain"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200/85">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Secure sign in
        </span>
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
        Welcome back
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Sign in to continue your job search and keep your application activity close at hand.
      </p>
    </div>
  );
}
