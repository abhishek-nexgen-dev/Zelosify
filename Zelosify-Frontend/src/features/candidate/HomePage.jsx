import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  FileCheck2,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import LandingNavbar from "@/components/LandingPage/navbar/LandingNavbar";

const journeys = [
  {
    icon: Search,
    label: "For candidates",
    title: "Find a role that feels right.",
    description:
      "Explore open positions, apply with your resume, and keep track of your progress from one account.",
    href: "/jobs",
    action: "Explore open jobs",
  },
  {
    icon: UsersRound,
    label: "For hiring teams",
    title: "Bring every hiring step together.",
    description:
      "Coordinate openings, share candidate context, and keep decisions moving with your team.",
    href: "/login",
    action: "Open your workspace",
  },
];

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Discover",
    description: "Search current openings and focus on roles that fit your goals.",
  },
  {
    number: "02",
    icon: FileCheck2,
    title: "Apply",
    description: "Share your resume through a straightforward application flow.",
  },
  {
    number: "03",
    icon: ClipboardCheck,
    title: "Stay in the loop",
    description: "Return to your dashboard to see your application activity and updates.",
  },
];

const perspectives = [
  {
    name: "Anika Rao",
    role: "Product Designer",
    image: "/assets/testimonials/anika-rao.svg",
    description: "A candidate can keep job searches, applications, and updates together.",
  },
  {
    name: "Marcus Bennett",
    role: "Talent Acquisition Partner",
    image: "/assets/testimonials/marcus-bennett.svg",
    description: "Recruiters can organize openings and collaborate with their hiring team.",
  },
  {
    name: "Priya Nair",
    role: "Engineering Manager",
    image: "/assets/testimonials/priya-nair.svg",
    description: "Hiring managers can review candidates and follow decisions for their openings.",
  },
];

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-300/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-lime-200">
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

function SectionTitle({ eyebrow, title, description, centered = false }) {
  return (
    <div className={`${centered ? "mx-auto text-center" : ""} max-w-2xl`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-[2.8rem]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-7 text-neutral-400 sm:text-base sm:leading-8">
          {description}
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="dark min-h-screen overflow-x-clip bg-[#050505] text-neutral-100 antialiased selection:bg-lime-300 selection:text-black">
      <LandingNavbar />

      <main>
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] bg-[#050505] pb-14 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36">
          <div
            className="pointer-events-none absolute -left-48 top-8 -z-10 h-[34rem] w-[34rem] rounded-full bg-lime-300/[0.035] blur-[120px]"
            aria-hidden="true"
          />

          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-10">
            <div className="relative z-10 max-w-2xl">
              <Eyebrow>A clearer way to find your next step</Eyebrow>
              <h1 className="mt-6 text-[clamp(2.75rem,6.4vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-white">
                Find the work
                <br className="hidden sm:block" />
                that moves you
                <span className="text-lime-300"> forward.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-neutral-400 sm:text-lg sm:leading-8">
                Explore open roles, apply with your resume, and follow your
                progress. Zelosify gives candidates and hiring teams a clear
                place to move each step forward.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/jobs"
                  className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-lime-300 px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
                >
                  Explore open jobs
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.025] px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
                >
                  See how it works
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-neutral-400 sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-300" aria-hidden="true" />
                  Search open roles
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-300" aria-hidden="true" />
                  Track applications
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-3xl lg:ml-auto">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] border border-lime-300/[0.06] sm:-inset-5" aria-hidden="true" />
              <div className="relative aspect-[1.35/1] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111111] shadow-[0_30px_100px_-45px_rgba(0,0,0,0.9)] sm:rounded-3xl">
                <Image
                  src="/assets/images/career-team-hero.png"
                  alt="Three professionals carrying resumes as they arrive at a modern workplace"
                  fill
                  priority
                  sizes="(max-width: 1024px) 94vw, 56vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/10" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8">
                  <div className="flex items-end justify-between gap-4">
                    <div className="max-w-sm">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-200 backdrop-blur-sm sm:text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime-300" aria-hidden="true" />
                        Made for the next step
                      </span>
                      <p className="mt-3 text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
                        The right opportunity can change everything.
                      </p>
                    </div>
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/30 text-lime-200 backdrop-blur-sm sm:flex">
                      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-2 top-5 hidden items-center gap-2.5 rounded-xl border border-white/[0.1] bg-[#101010]/95 px-3.5 py-3 shadow-xl sm:flex lg:-left-7 lg:top-9">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-300/[0.08] text-lime-200">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">One focused workspace</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">For candidates and hiring teams</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-7xl gap-3 px-4 sm:mt-16 sm:grid-cols-3 sm:px-6 lg:px-10">
            {[
              { icon: Search, title: "Explore", text: "Search roles that fit your goals." },
              { icon: FileCheck2, title: "Apply", text: "Share your experience with ease." },
              { icon: ClipboardCheck, title: "Follow through", text: "Return to updates when you need them." },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0b0b0b] p-4 sm:px-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-[#111111] text-lime-200">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-400">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 border-b border-white/[0.06] bg-[#080808] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <SectionTitle
                eyebrow="One platform, two journeys"
                title="One clear place for every next step."
              />
              <p className="max-w-xl text-sm leading-7 text-neutral-400 sm:text-base lg:justify-self-end">
                Whether you are searching for a role or building a team, keep
                important details and next steps easy to find.
              </p>
            </div>

            <div className="mt-9 grid gap-4 lg:mt-12 lg:grid-cols-2">
              {journeys.map(({ icon: Icon, label, title, description, href, action }) => (
                <article
                  key={label}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 transition-colors hover:border-lime-300/20 sm:p-7 lg:p-8"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-lime-300/10 bg-lime-300/[0.06] text-lime-200">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium uppercase tracking-[0.13em] text-neutral-500">{label}</span>
                  </div>
                  <h3 className="mt-7 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-neutral-400 sm:text-base">{description}</p>
                  <Link
                    href={href}
                    className="mt-7 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-lime-200 transition group-hover:gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-200"
                  >
                    {action}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-b border-white/[0.06] bg-[#050505] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <SectionTitle
                eyebrow="How it works"
                title="Keep your next steps simple."
              />
              <p className="max-w-lg text-sm leading-7 text-neutral-400 sm:text-base">
                Start with a role that interests you, then keep your application
                activity in one place.
              </p>
            </div>

            <div className="mt-9 grid gap-3 md:mt-12 md:grid-cols-3">
              {steps.map(({ number, icon: Icon, title, description }) => (
                <article key={number} className="rounded-xl border border-white/[0.07] bg-[#0b0b0b] p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#141414] text-lime-200">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-semibold tracking-[0.16em] text-neutral-500">{number}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 border-b border-white/[0.06] bg-[#080808] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="max-w-2xl">
              <SectionTitle
                eyebrow="People make the process"
                title="Designed around the people behind every hire."
                description="Zelosify gives candidates, recruiters, and hiring managers a clear place to do their part and keep work moving."
              />
            </div>

            <div className="mt-9 grid gap-3 md:grid-cols-3 lg:mt-12 lg:gap-4">
              {perspectives.map(({ name, role, image, description }) => (
                <article key={name} className="rounded-xl border border-white/[0.07] bg-[#0b0b0b] p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Image
                      src={image}
                      alt=""
                      width={52}
                      height={52}
                      className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
                      <p className="mt-1 truncate text-xs text-neutral-400">{role}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-neutral-300">{description}</p>
                  <p className="mt-5 border-t border-white/[0.07] pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Illustrative workflow
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#050505] px-4 py-14 sm:px-6 sm:py-20 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 rounded-2xl border border-lime-300/10 bg-[#0b0b0b] p-6 sm:p-8 md:flex-row md:items-center md:justify-between lg:p-10">
            <div className="max-w-2xl">
              <Eyebrow>Your next step starts here</Eyebrow>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready for your next opportunity?
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400 sm:text-base">
                Browse open roles and find an opportunity that fits your next move.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
            >
              Find open jobs
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] bg-[#050505]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-3">
            <Image src="/assets/logos/main-logo.png" alt="Zelosify" width={144} height={36} className="h-7 w-auto object-contain object-left" />
            <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />
            <p className="hidden text-xs text-neutral-500 sm:block">A clearer path between people and opportunity.</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-neutral-400 sm:text-sm">
            <Link href="/jobs" className="transition hover:text-white">Find jobs</Link>
            <Link href="/#platform" className="transition hover:text-white">Platform</Link>
            <Link href="/#how-it-works" className="transition hover:text-white">How it works</Link>
            <Link href="/login" className="transition hover:text-white">Sign in</Link>
          </nav>
          <p className="text-xs text-neutral-600">© {new Date().getFullYear()} Zelosify</p>
        </div>
      </footer>
    </div>
  );
}
