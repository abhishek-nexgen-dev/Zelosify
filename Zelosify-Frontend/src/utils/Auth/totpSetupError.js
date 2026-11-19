export function getTOTPSetupError(error) {
  const status = error?.response?.status;
  const responseMessage = error?.response?.data?.message;

  if (status === 401) {
    return "Your sign-in setup session has expired. Return to sign in and enter your credentials again.";
  }
  if (!error?.response) {
    return "We cannot reach the sign-in service. Check that the backend is running and NEXT_PUBLIC_BACKEND_URL points to it, then try again.";
  }
  return (
    responseMessage ||
    (status === 409
      ? "Your authenticator setup changed. Sign in again and try once more."
      : "Could not load your setup QR. Try again.")
  );
}
