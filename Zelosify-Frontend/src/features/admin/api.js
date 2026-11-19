import axiosInstance from "@/utils/Axios/AxiosInstance";

export async function listRecruiters(params = {}) {
  const { data } = await axiosInstance.get("/admin/recruiters", { params });
  return data;
}

export async function createTeamMember(payload) {
  const { data } = await axiosInstance.post("/admin/recruiters", payload);
  return data.data;
}

export const createRecruiter = createTeamMember;

export async function updateTeamMemberPermissions(id, permissions) {
  const { data } = await axiosInstance.patch(
    `/admin/recruiters/${encodeURIComponent(id)}/permissions`,
    { permissions }
  );
  return data.data;
}

export async function listPermissionTargets(params = {}) {
  const { data } = await axiosInstance.get("/admin/team/permission-targets", { params });
  return data;
}

export async function grantTeamMemberPermission(id, permission) {
  const { data } = await axiosInstance.post(`/admin/team/${encodeURIComponent(id)}/permissions`, {
    permission,
  });
  return data.data;
}

export async function revokeTeamMemberPermission(id, permission) {
  const { data } = await axiosInstance.delete(
    `/admin/team/${encodeURIComponent(id)}/permissions/${encodeURIComponent(permission)}`
  );
  return data.data;
}

export async function deleteTeamMember(id) {
  const { data } = await axiosInstance.delete(`/admin/recruiters/${encodeURIComponent(id)}`);
  return data.data;
}
