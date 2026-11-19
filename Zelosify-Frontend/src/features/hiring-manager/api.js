import axiosInstance from "@/utils/Axios/AxiosInstance";

export async function fetchManagerOpenings({ page = 1, limit = 10 } = {}) {
  const { data } = await axiosInstance.get("/jobs/managed", {
    params: { page, limit },
  });
  return data;
}

export async function fetchManagerOpeningById(id) {
  const { data } = await axiosInstance.get(`/jobs/managed/${encodeURIComponent(id)}`);
  return data.data;
}

export async function fetchManagerOpeningProfiles(openingId, { page = 1, limit = 20 } = {}) {
  const { data } = await axiosInstance.get(`/jobs/${encodeURIComponent(openingId)}/candidates`, {
    params: { page, limit },
  });
  return {
    ...data,
    data: (data.candidates || []).map((candidate) => ({
      id: candidate.applicationId,
      openingId,
      fileName: candidate.resume?.fileName,
      previewUrl: candidate.resume?.previewUrl,
      uploadDate: candidate.submittedAt,
      submittedAt: candidate.submittedAt,
      status: candidate.status,
      candidate: candidate.candidate,
      recommendationStatus: candidate.aiScreening?.status,
      recommendationScore:
        candidate.aiScreening?.score == null ? null : candidate.aiScreening.score / 100,
      recommendationConfidence:
        candidate.aiScreening?.confidence == null ? null : candidate.aiScreening.confidence / 100,
      recommendationReason: candidate.aiScreening?.reason,
      recommendationLatencyMs: candidate.aiScreening?.latencyMs,
      recommendationLabel: candidate.aiScreening?.band,
      atsScore: candidate.aiScreening?.atsScore,
      atsBreakdown: candidate.aiScreening?.atsBreakdown,
      resumeAnalysis: candidate.aiScreening?.resumeAnalysis,
    })),
    opening: data.job,
  };
}

async function decideProfile(profileId, action) {
  const { data } = await axiosInstance.post(
    `/candidates/${encodeURIComponent(profileId)}/${action}`
  );
  return data;
}

export async function shortlistProfile(profileId) {
  return decideProfile(profileId, "shortlist");
}

export async function rejectProfile(profileId) {
  return decideProfile(profileId, "reject");
}
