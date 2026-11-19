import axios from "axios";
import axiosInstance from "@/utils/Axios/AxiosInstance";

export async function fetchVendorOpenings(params = {}) {
  const query = { ...params };
  delete query.force;
  const { data } = await axiosInstance.get("/vendor/openings", { params: query });
  return data;
}

export async function fetchVendorOpeningById(id) {
  const { data } = await axiosInstance.get(`/vendor/openings/${encodeURIComponent(id)}`);
  return data.data;
}

export async function presignVendorProfileUpload(openingId, files) {
  const { data } = await axiosInstance.post(
    `/vendor/openings/${encodeURIComponent(openingId)}/profiles/presign`,
    {
      files: files.map((file) => ({ name: file.name, contentType: file.type, size: file.size })),
    }
  );
  return data.data ?? [];
}

export async function submitVendorProfiles(openingId, profiles) {
  const { data } = await axiosInstance.post(
    `/vendor/openings/${encodeURIComponent(openingId)}/profiles/upload`,
    { profiles }
  );
  return data;
}

export async function previewVendorProfile(profileId) {
  const { data } = await axiosInstance.get(
    `/vendor/profiles/${encodeURIComponent(profileId)}/preview`
  );
  return data;
}

export async function softDeleteVendorProfile(profileId) {
  const { data } = await axiosInstance.delete(`/vendor/profiles/${encodeURIComponent(profileId)}`);
  return data;
}

export async function uploadVendorFiles(openingId, files, onProgress) {
  const signedUploads = await presignVendorProfileUpload(openingId, files);
  if (signedUploads.length !== files.length)
    throw new Error("The storage service did not authorize every selected file.");

  for (let index = 0; index < signedUploads.length; index += 1) {
    const signed = signedUploads[index];
    const file = files[index];
    onProgress?.(file.name, "uploading");
    try {
      await axios.put(signed.uploadUrl, file, {
        headers: { "Content-Type": signed.contentType },
        withCredentials: false,
        onUploadProgress: (event) => {
          if (event.total)
            onProgress?.(file.name, `uploading ${Math.round((event.loaded / event.total) * 100)}%`);
        },
      });
    } catch {
      onProgress?.(file.name, "failed");
      throw new Error(
        `Upload failed for ${file.name}. Previously uploaded files have not been submitted. Retry the batch.`
      );
    }
    onProgress?.(file.name, "uploaded");
  }

  return submitVendorProfiles(
    openingId,
    signedUploads.map(({ key }) => ({ s3Key: key }))
  );
}
