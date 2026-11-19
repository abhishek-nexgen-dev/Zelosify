import axios from "axios";
import { clearAuthData } from "@/utils/Auth/authUtils";
import { redirectOnUnauthorizedSession } from "@/utils/Auth/sessionAuth";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      redirectOnUnauthorizedSession(error, window.location, clearAuthData);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
