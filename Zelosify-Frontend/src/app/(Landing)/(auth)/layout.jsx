"use client";
import { motion } from "framer-motion";
import { memo } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LandingNavbar from "@/components/LandingPage/navbar/LandingNavbar";

const AuthLayout = memo(({ children }) => {
  const pathname = usePathname();
  const isSignupPage = pathname === "/register";

  return (
    <div className="dark min-h-screen bg-[#07090c] pt-[4.5rem] text-white transition-colors duration-200 dark:bg-black">
      <LandingNavbar />
      <main className="flex min-h-[calc(100vh-4.5rem)] w-full items-center justify-center px-3 py-5 sm:px-6 sm:py-7">
        <div className="grid min-h-[80vh] w-[92vw] max-w-[1440px] grid-cols-1 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080a0d] shadow-[0_35px_120px_-40px_rgba(0,0,0,0.95)] lg:min-h-[80vh] lg:w-[80vw] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <aside className="relative h-56 w-full overflow-hidden bg-[#101317] lg:h-full lg:min-h-[80vh]">
            <Image
              src={
                isSignupPage
                  ? "/assets/auth/signup-career-hero.png"
                  : "/assets/auth/login-career-hero.png"
              }
              alt="A professional exploring career opportunities"
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover object-[67%_center] opacity-80"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/10"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 lg:p-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> Zelosify talent platform
              </span>
              <h2 className="mt-4 max-w-xl text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-5xl">
                {isSignupPage
                  ? "A better next step starts here."
                  : "Your next opportunity is closer than you think."}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/70 sm:text-base">
                {isSignupPage
                  ? "Create your candidate profile, explore open roles, and follow your applications from one place."
                  : "Sign in to continue your search, review application updates, and pick up where you left off."}
              </p>
              <div className="mt-6 hidden flex-wrap gap-2 lg:flex">
                {(isSignupPage
                  ? ["One profile", "Relevant roles", "Clear progress"]
                  : ["Your saved profile", "Application updates", "Secure access"]
                ).map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/75 backdrop-blur"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </aside>
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative flex h-full w-full min-w-0 items-center justify-center overflow-visible bg-[#080a0d] px-4 py-8 sm:px-8 lg:px-10"
          >
            <div
              className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-lime-500/[0.08] blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-48 -left-36 h-96 w-96 rounded-full bg-lime-500/[0.05] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative z-10 w-full">{children}</div>
          </motion.section>
        </div>
      </main>
    </div>
  );
});

AuthLayout.displayName = "AuthLayout";

export default AuthLayout;
