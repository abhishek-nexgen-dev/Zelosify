import axiosInstance from "@/utils/Axios/AxiosInstance";

export async function fetchInternalDashboard() {
  const { data } = await axiosInstance.get("/dashboard");
  return data.data;
}
