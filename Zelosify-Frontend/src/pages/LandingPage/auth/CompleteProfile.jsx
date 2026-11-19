import Link from "next/link";

export default function CompleteProfile() {
  return (
    <main className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-semibold">Profile completion is unavailable</h1>
      <p className="mt-2 text-sm text-slate-300">
        This sign-in flow is not configured. Use your Zelosify username and password to continue.
      </p>
      <Link
        className="mt-5 inline-flex rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
        href="/login"
      >
        Continue to sign in
      </Link>
    </main>
  );
}
