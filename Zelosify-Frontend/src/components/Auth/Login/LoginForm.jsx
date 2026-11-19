import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export default function LoginForm({
  handleChange,
  handleSubmit,
  loginStage,
  isLoading,
  error,
  setupQr,
  onGenerateSetupQr,
  onOpenSetupQr,
  onReturnToCurrentCode,
  showPassword,
  setShowPassword,
  setLoginStage,
}) {
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {loginStage === "credentials" ? (
        <>
          <div>
            <label
              htmlFor="usernameOrEmail"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              Username or Email
            </label>
            <input
              name="usernameOrEmail"
              id="usernameOrEmail"
              autoComplete="username"
              onChange={handleChange}
              required
              placeholder="you@example.com or username"
              aria-label="Username or Email"
              aria-invalid={error.usernameOrEmail ? "true" : "false"}
              className={`min-h-12 w-full rounded-xl border bg-[#080a0d] px-4 text-sm text-white shadow-inner shadow-black/20 transition placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-lime-400/10 ${
                error.usernameOrEmail
                  ? "border-rose-400/80 focus:border-rose-300"
                  : "border-white/10 focus:border-lime-300/70"
              }`}
            />
            {error.usernameOrEmail && (
              <p className="mt-1 text-sm text-red-600">{error.usernameOrEmail}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              Password
            </label>
            <div className="relative">
              <input
                name="password"
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                onChange={handleChange}
                required
                placeholder="Enter your password"
                aria-label="Password"
                aria-invalid={error.password ? "true" : "false"}
                className={`min-h-12 w-full rounded-xl border bg-[#080a0d] px-4 pr-12 text-sm text-white shadow-inner shadow-black/20 transition placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-lime-400/10 ${
                  error.password
                    ? "border-rose-400/80 focus:border-rose-300"
                    : "border-white/10 focus:border-lime-300/70"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-lime-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex="0"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {error.password && <p className="mt-1.5 text-sm text-rose-300">{error.password}</p>}
          </div>
        </>
      ) : loginStage === "setup" ? (
        <div>
          <p className="text-sm font-semibold text-white">
            {setupQr.replacement ? "Replace your authenticator" : "Set up your authenticator"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {setupQr.replacement
              ? "Scan this new QR code, then confirm it with a six-digit code. Your current authenticator will keep working until the new one is confirmed."
              : "Scan this QR code in your authenticator app, then enter its current six-digit code."}
          </p>
          {setupQr.image ? (
            <img
              src={setupQr.image}
              alt="Authenticator setup QR code"
              className="mx-auto my-5 h-48 w-48 rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-2"
            />
          ) : (
            <div
              className="mx-auto my-5 flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-[#0b0b0b] p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#0b0b0b] dark:text-slate-400"
              role="status"
            >
              {setupQr.loading
                ? "Generating your QR code…"
                : setupQr.error || "Your QR code is not loaded yet."}
              {!setupQr.loading && (
                <button
                  type="button"
                  onClick={onGenerateSetupQr}
                  className="font-semibold text-lime-300 hover:text-lime-200 dark:text-lime-300"
                >
                  Generate QR
                </button>
              )}
            </div>
          )}
          <label htmlFor="login-totp" className="mb-1.5 block text-sm font-medium text-slate-200">
            {setupQr.replacement ? "New authenticator code" : "2FA Code"}
          </label>
          <input
            name="totp"
            id="login-totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            onChange={handleChange}
            required
            placeholder={
              setupQr.replacement ? "Enter the new 6-digit code" : "Enter your 6-digit code"
            }
            aria-label={setupQr.replacement ? "New authenticator code" : "2FA Code"}
            aria-invalid={error.totp ? "true" : "false"}
            className={`min-h-12 w-full rounded-xl border bg-[#080a0d] px-4 text-sm text-white shadow-inner shadow-black/20 transition placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-lime-400/10 ${
              error.totp
                ? "border-rose-400/80 focus:border-rose-300"
                : "border-white/10 focus:border-lime-300/70"
            }`}
          />
          {error.totp && <p className="mt-1.5 text-sm text-rose-300">{error.totp}</p>}
          {setupQr.replacement && (
            <button
              type="button"
              onClick={onReturnToCurrentCode}
              className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-lime-300 transition hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300"
            >
              Use my current authenticator instead
            </button>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="login-totp" className="mb-1.5 block text-sm font-medium text-slate-200">
            2FA Code
          </label>
          <input
            name="totp"
            id="login-totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            onChange={handleChange}
            required
            placeholder="Enter your 6-digit code"
            aria-label="2FA Code"
            aria-invalid={error.totp ? "true" : "false"}
            className={`min-h-12 w-full rounded-xl border bg-[#080a0d] px-4 text-sm text-white shadow-inner shadow-black/20 transition placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-lime-400/10 ${
              error.totp
                ? "border-rose-400/80 focus:border-rose-300"
                : "border-white/10 focus:border-lime-300/70"
            }`}
          />
          {error.totp && <p className="mt-1.5 text-sm text-rose-300">{error.totp}</p>}
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Enter the latest 6-digit code from your authenticator app. If you lost access to it,
            choose replacement setup below. Your old code remains active until you confirm the new
            one.
          </p>
          <button
            type="button"
            onClick={onOpenSetupQr}
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-left text-sm font-semibold text-lime-300 transition hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300"
          >
            Lost access to your authenticator? Set up a replacement
          </button>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={isLoading}
        aria-label={
          isLoading
            ? "Loading"
            : loginStage === "credentials"
              ? "Continue to 2FA"
              : loginStage === "setup" && setupQr.replacement
                ? "Replace authenticator"
                : "Complete sign in"
        }
        className="min-h-12 w-full rounded-xl bg-lime-300 px-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {isLoading
          ? "Loading..."
          : loginStage === "credentials"
            ? "Continue"
            : loginStage === "setup" && setupQr.replacement
              ? "Verify and replace"
              : "Sign In"}
      </motion.button>

      {loginStage !== "credentials" && (
        <button
          type="button"
          onClick={() => {
            setLoginStage("credentials");
          }}
          className="mt-2 min-h-10 w-full text-sm font-medium text-slate-400 transition hover:text-lime-200"
          aria-label="Back to login form"
          tabIndex="0"
        >
          Back to Login
        </button>
      )}
    </form>
  );
}
