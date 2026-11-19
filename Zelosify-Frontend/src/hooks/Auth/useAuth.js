import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import {
  checkAuthStatus,
  closeSignoutConfirmation,
  loginWithCredentials,
  openSignoutConfirmation,
  setUser,
  signOut,
  verifyTOTP,
} from "@/redux/features/Auth/authSlice";

const useAuth = () => {
  const { user, loading, error, showSignoutConfirmation } = useSelector((state) => state.auth);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = useCallback(() => !pathname || !pathname.includes("/user"), [pathname]);

  const handleCheckAuthStatus = useCallback(
    ({ suppressErrors = false, forceCheck = false } = {}) => {
      const authOptions = {
        isAuthPage: isAuthPage() && !forceCheck,
        pathname,
      };
      const request = dispatch(checkAuthStatus(authOptions));

      if (suppressErrors) {
        request.unwrap().catch((authError) => {
          if (
            typeof authError === "string" &&
            authError.includes("No authentication tokens found")
          ) {
            return;
          }
          console.error("Auth check error:", authError);
        });
      }
      return request;
    },
    [dispatch, isAuthPage, pathname]
  );

  useEffect(() => {
    if (!user && !isAuthPage()) {
      handleCheckAuthStatus();
    }
  }, [handleCheckAuthStatus, isAuthPage, user]);

  const handleLogin = async (credentials) => dispatch(loginWithCredentials(credentials)).unwrap();

  const handleVerifyTOTP = async (data) => dispatch(verifyTOTP(data)).unwrap();

  const handleLogout = async ({ skipConfirmationClose = false } = {}) => {
    setIsSigningOut(true);
    try {
      const result = await dispatch(signOut()).unwrap();
      if (!skipConfirmationClose) dispatch(closeSignoutConfirmation());
      router.push("/login");
      return result;
    } catch (logoutError) {
      if (!skipConfirmationClose) dispatch(closeSignoutConfirmation());
      throw logoutError;
    } finally {
      setIsSigningOut(false);
    }
  };

  const getDisplayName = () => {
    if (!user) return "";
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "User";
  };

  const getUserHandle = () => (user?.username ? `@${user.username}` : "");
  const getTenantId = () => user?.tenant?.tenantId || "";

  return {
    user,
    loading,
    error,
    showSignoutConfirmation,
    isSigningOut,
    handleCheckAuthStatus,
    handleLogin,
    handleVerifyTOTP,
    handleLogout,
    handleOpenSignoutConfirmation: () => dispatch(openSignoutConfirmation()),
    handleCloseSignoutConfirmation: () => dispatch(closeSignoutConfirmation()),
    getDisplayName,
    getUserHandle,
    getTenantId,
    updateUserData: (userData) => dispatch(setUser(userData)),
    isAuthenticated: () => Boolean(user),
  };
};

export default useAuth;
