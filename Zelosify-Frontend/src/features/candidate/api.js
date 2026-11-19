import axiosInstance from "@/utils/Axios/AxiosInstance";

export async function listJobs(params = {}) {
  const { data } = await axiosInstance.get("/jobs", { params });
  return data;
}

export async function getJob(id) {
  const { data } = await axiosInstance.get(`/jobs/${encodeURIComponent(id)}`);
  return data.data;
}

export async function getApplications(params = {}, options = {}) {
  const { data } = await axiosInstance.get("/candidate/applications", { ...options, params });
  return data;
}

export async function getMyApplicationScore(applicationId) {
  const { data } = await axiosInstance.get(
    `/candidate/applications/${encodeURIComponent(applicationId)}/score`
  );
  return data.data;
}

export async function retryApplicationAnalysis(applicationId) {
  const { data } = await axiosInstance.post(
    `/candidate/applications/${encodeURIComponent(applicationId)}/retry-analysis`
  );
  return data;
}

export async function applyForJob(jobId, file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axiosInstance.post(`/jobs/${encodeURIComponent(jobId)}/apply`, form, {
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data.data;
}

export async function replaceApplicationResume(applicationId, file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axiosInstance.put(
    `/candidate/applications/${encodeURIComponent(applicationId)}/resume`,
    form,
    {
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    }
  );
  return data.data;
}
