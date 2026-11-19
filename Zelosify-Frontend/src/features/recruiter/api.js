import axiosInstance from "@/utils/Axios/AxiosInstance";

export async function getManagedJobs(params = {}) {
  const { data } = await axiosInstance.get("/jobs/managed", { params });
  return data;
}

export async function getManagedJob(id) {
  const { data } = await axiosInstance.get(`/jobs/managed/${encodeURIComponent(id)}`);
  return data.data;
}

export async function getJobAssignees() {
  const { data } = await axiosInstance.get("/jobs/assignees");
  return data.data;
}

export async function createJob(payload) {
  const { data } = await axiosInstance.post("/jobs", payload);
  return data.data;
}

export async function updateJob(id, payload) {
  const { data } = await axiosInstance.put(`/jobs/${encodeURIComponent(id)}`, payload);
  return data.data;
}

export async function closeJob(id) {
  const { data } = await axiosInstance.delete(`/jobs/${encodeURIComponent(id)}`);
  return data.data;
}

export async function getJobApplicants(id, params = {}) {
  const { data } = await axiosInstance.get(`/jobs/${encodeURIComponent(id)}/candidates`, {
    params,
  });
  return data;
}

export async function getCandidateApplicationScore(id) {
  const { data } = await axiosInstance.get(`/candidates/${encodeURIComponent(id)}/score`);
  return data.data;
}

export async function decideApplicant(id, decision) {
  const { data } = await axiosInstance.post(`/candidates/${encodeURIComponent(id)}/${decision}`);
  return data.data;
}
