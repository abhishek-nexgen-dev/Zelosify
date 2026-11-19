import Link from "next/link";

export default function GoogleLoginCallback() {
  return (
    <main className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-semibold">Google sign-in is not configured</h1>
      <p className="mt-2 text-sm text-slate-300">
        Use your Zelosify username and password to sign in.
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
