"use client";

import { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import useAuth from "@/hooks/Auth/useAuth";
import axiosInstance from "@/utils/Axios/AxiosInstance";
import { getDashboardPathForRole } from "@/utils/Auth/authUtils";
import { isExpiredSessionMessage } from "@/utils/Auth/sessionAuth";
import { getTOTPSetupError } from "@/utils/Auth/totpSetupError";
import BoxHeader from "./BoxHeader";
import LoginForm from "./LoginForm";

function routeForUser(user) {
  return getDashboardPathForRole(user?.role);
}

function destinationForUser(user) {
  const fallback = routeForUser(user);
  const allowedRoots =
    {
      CANDIDATE: ["/candidate/", "/jobs/"],
      ADMIN: ["/dashboard", "/admin/", "/recruiter/"],
      RECRUITER: ["/dashboard", "/recruiter/"],
      HIRING_MANAGER: ["/dashboard", "/hiring-manager/"],
      IT_VENDOR: ["/dashboard", "/vendor/"],
    }[user?.role] || [];

  try {
    const requested = new URLSearchParams(window.location.search).get("returnTo");
    if (
      !requested ||
      !requested.startsWith("/") ||
      requested.startsWith("//") ||
      requested.includes("\\")
    ) {
      return fallback;
    }
    const target = new URL(requested, window.location.origin);
    if (target.origin !== window.location.origin) return fallback;
    const allowed = allowedRoots.some((root) => target.pathname.startsWith(root));
    return allowed ? `${target.pathname}${target.search}${target.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export default function LoginLayout() {
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
    totp: "",
  });
  const [error, setError] = useState({});
  const [loginStage, setLoginStage] = useState("credentials");
  const [setupQr, setSetupQr] = useState({
    image: "",
    loading: false,
    error: "",
    replacement: false,
  });

  const { loading: isLoading, error: authError, handleLogin, handleVerifyTOTP } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (
      authError &&
      !authError.includes("No authentication tokens found") &&
      !isExpiredSessionMessage(authError)
    ) {
      if (loginStage === "credentials") {
        setError({ general: authError });
      } else if (loginStage === "totp") {
        setError({ totp: "Invalid 2FA code. Please try again." });
      }
    }
  }, [authError, loginStage]);

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const loadSetupQr = useCallback(async () => {
    setSetupQr({ image: "", loading: true, error: "", replacement: false });
    try {
      const { data } = await axiosInstance.get("/auth/totp/setup/qr");
      if (typeof data?.qrCode !== "string" || !data.qrCode.startsWith("data:image/")) {
        setSetupQr({
          image: "",
          loading: false,
          error: "The setup QR response was invalid. Try again.",
          replacement: false,
        });
        return;
      }
      setSetupQr({
        image: data.qrCode,
        loading: false,
        error: "",
        replacement: data.replacement === true,
      });
    } catch (requestError) {
      setSetupQr({
        image: "",
        loading: false,
        error: getTOTPSetupError(requestError),
        replacement: false,
      });
    }
  }, []);

  const openSetupQr = useCallback(() => {
    setLoginStage("setup");
    setFormData((prev) => ({ ...prev, totp: "" }));
    void loadSetupQr();
  }, [loadSetupQr]);

  const returnToCurrentCode = useCallback(() => {
    setLoginStage("totp");
    setFormData((prev) => ({ ...prev, totp: "" }));
    setError({});
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError({});

      if (loginStage === "credentials") {
        try {
          const resultAction = await handleLogin({
            usernameOrEmail: formData.usernameOrEmail,
            password: formData.password,
          });

          if (resultAction.totpSetupRequired) {
            setLoginStage("setup");
            await loadSetupQr();
          } else if (resultAction.message?.startsWith("Login verified.")) {
            setLoginStage("totp");
          } else if (resultAction.user) {
            const target = destinationForUser(resultAction.user);
            window.location.replace(target);
          }
        } catch (err) {
          const message = typeof err === "string" ? err : err?.message;
          if (isExpiredSessionMessage(message)) {
            setLoginStage("credentials");
            setFormData((prev) => ({ ...prev, totp: "" }));
            setError({});
          } else {
            setError({ general: message || "Login failed" });
          }
        }
      } else if (loginStage === "totp" || loginStage === "setup") {
        try {
          const resultAction = await handleVerifyTOTP({
            totp: formData.totp,
          });

          if (resultAction.user) {
            const target = destinationForUser(resultAction.user);
            window.location.replace(target);
          }
        } catch (err) {
          const message = typeof err === "string" ? err : err?.message;
          if (isExpiredSessionMessage(message)) {
            setLoginStage("credentials");
            setFormData((prev) => ({ ...prev, totp: "" }));
            setError({});
          } else {
            setError({
              totp:
                message ||
                "The verification code was not accepted. Check your authenticator app and try again.",
            });
          }
        }
      }
    },
    [formData, loginStage, handleLogin, handleVerifyTOTP, loadSetupQr]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-md rounded-[1.75rem] border border-white/[0.09] bg-[#0e1116]/95 p-6 shadow-[0_30px_100px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-9"
    >
      <BoxHeader />

      {error.general && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] p-3.5 text-sm leading-5 text-rose-200"
        >
          {error.general}
        </motion.div>
      )}

      <LoginForm
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loginStage={loginStage}
        isLoading={isLoading}
        error={error}
        setupQr={setupQr}
        onGenerateSetupQr={loadSetupQr}
        onOpenSetupQr={openSetupQr}
        onReturnToCurrentCode={returnToCurrentCode}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        setLoginStage={setLoginStage}
      />

      <div className="mt-7 border-t border-white/[0.08] pt-5 text-center">
        <p className="text-sm text-slate-400">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-lime-300 transition hover:text-lime-200"
          >
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
