export const getDashboardPathForRole = (role) => {
  switch (role) {
    case "CANDIDATE":
      return "/candidate/dashboard";
    case "ADMIN":
    case "RECRUITER":
    case "HIRING_MANAGER":
    case "IT_VENDOR":
      return "/dashboard";
    case "BUSINESS_USER":
      return "/business-user/digital-initiative";
    case "VENDOR_MANAGER":
      return "/user";
    default:
      return "/login";
  }
};

export const getUserRole = () => {
  if (typeof window === "undefined") return null;

  const cookies = document.cookie.split(";");
  const roleCookie = cookies.find((cookie) => cookie.trim().startsWith("role="));

  return roleCookie ? roleCookie.split("=")[1].trim() : null;
};

export const getRoleRedirectPath = (role) => {
  switch (role) {
    case "VENDOR_MANAGER":
      return "/user";
    case "BUSINESS_USER":
      return "/business-user/digital-initiative";
    case "IT_VENDOR":
      return "/vendor/payments";
    default:
      return "/login";
  }
};

export const handleRoleBasedRedirect = (role) => {
  const path = getRoleRedirectPath(role);
  window.location.href = path;
};

export const clearAuthData = () => {
  document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  localStorage.removeItem("zelosify_user");
};
