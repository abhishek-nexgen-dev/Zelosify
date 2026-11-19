"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import useVendorOpenings from "@/hooks/Dashboard/Vendor/useVendorOpenings";
import PageHeader from "@/components/recruitment/PageHeader";
import StatusBadge from "@/components/recruitment/StatusBadge";
import { ErrorState } from "@/components/recruitment/StateMessage";
import { formatBytes, formatDate, getId } from "@/components/recruitment/format";
import { Button } from "@/components/UI/shadcn/button";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/UI/shadcn/alert-dialog";
import { previewVendorProfile } from "@/features/vendor/api";
import MarkdownContent from "@/components/content/MarkdownContent";
import useAuth from "@/hooks/Auth/useAuth";
import { hasPermission } from "@/features/auth/permissions";

const ACCEPTED_FILES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
};

export default function VendorOpeningDetailPage({ openingId }) {
  const { user } = useAuth();
  const canViewProfiles = hasPermission(user, "VENDOR_PROFILES_VIEW");
  const canSubmitProfiles = hasPermission(user, "VENDOR_PROFILES_SUBMIT");
  const canDeleteProfiles = hasPermission(user, "VENDOR_PROFILES_DELETE");
  const {
    detail,
    profiles,
    detailLoading,
    detailError,
    uploadLoading,
    uploadError,
    fetchDetail,
    submitProfiles,
    deleteProfile,
    clearUploadErr,
  } = useVendorOpenings();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileStatus, setFileStatus] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [previewingId, setPreviewingId] = useState(null);
  const statusRef = useRef({});

  useEffect(() => {
    if (openingId) fetchDetail(openingId, { force: true });
  }, [openingId, fetchDetail]);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected?.length) {
      rejected.forEach((r) => {
        const msg = r.errors?.[0]?.message || "Unsupported file";
        toast.error(`${r.file?.name || "File"}: ${msg}`);
      });
    }
    if (accepted?.length) {
      setSelectedFiles((prev) => {
        const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
        const next = accepted.filter((f) => !existing.has(`${f.name}-${f.size}`));
        return [...prev, ...next].slice(0, 20);
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    multiple: true,
    maxSize: 10 * 1024 * 1024,
    maxFiles: 20,
    disabled: !canSubmitProfiles || uploadLoading || detail?.status !== "OPEN",
  });

  const removeSelected = useCallback((name, size) => {
    setSelectedFiles((prev) => prev.filter((f) => !(f.name === name && f.size === size)));
  }, []);

  const onProgress = useCallback((fileName, status) => {
    statusRef.current = { ...statusRef.current, [fileName]: status };
    setFileStatus({ ...statusRef.current });
  }, []);

  const handleSubmit = async () => {
    if (!selectedFiles.length || !openingId || uploadLoading) return;
    clearUploadErr();
    statusRef.current = {};
    setFileStatus({});
    try {
      await submitProfiles(openingId, selectedFiles, onProgress);
      toast.success("Profiles submitted successfully. AI processing will start automatically.");
      setSelectedFiles([]);
      statusRef.current = {};
      setFileStatus({});
    } catch (e) {
      toast.error(typeof e === "string" ? e : e?.message || "Submission failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteProfile(deleteId);
      toast.success("Profile removed");
      setDeleteId(null);
      fetchDetail(openingId, { force: true });
    } catch (e) {
      toast.error(typeof e === "string" ? e : e?.message || "Failed to remove profile");
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = async (profileId) => {
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    setPreviewingId(profileId);
    try {
      const res = await previewVendorProfile(profileId);
      const url = res?.url || res?.previewUrl || res?.data?.url || res?.data?.previewUrl;
      if (url) {
        if (previewWindow) previewWindow.location.replace(url);
        else toast.error("Your browser blocked the preview tab. Allow pop-ups and try again.");
      } else if (res instanceof Blob) {
        const obj = URL.createObjectURL(res);
        if (previewWindow) {
          previewWindow.location.replace(obj);
          setTimeout(() => URL.revokeObjectURL(obj), 60000);
        } else {
          URL.revokeObjectURL(obj);
          toast.error("Your browser blocked the preview tab. Allow pop-ups and try again.");
        }
      } else {
        previewWindow?.close();
        toast.error("Preview URL not available");
      }
    } catch (e) {
      previewWindow?.close();
      toast.error(e?.response?.data?.message || e?.message || "Unable to preview file");
    } finally {
      setPreviewingId(null);
    }
  };

  const opening = detail;
  const profileRows = useMemo(
    () => (profiles || []).filter((p) => !(p.isDeleted || p.deleted)),
    [profiles]
  );
  const expRange = useMemo(() => {
    if (!opening) return "—";
    const min = opening.experienceMin ?? opening.minExperience;
    const max = opening.experienceMax ?? opening.maxExperience;
    if (min == null && max == null) return "—";
    if (max == null) return `${min}+ years`;
    return `${min}–${max} years`;
  }, [opening]);

  return (
    <div className="recruitment-shell mx-auto w-full max-w-7xl p-4 sm:p-7 lg:p-10">
      <PageHeader
        title={opening?.title || "Opening details"}
        description="Review the opening, upload candidate resumes, and manage your submissions."
        back={
          <Link
            href="/vendor/openings"
            className="text-sm text-lime-300 hover:underline dark:text-lime-400"
          >
            ← Back to openings
          </Link>
        }
      />

      {detailError ? (
        <ErrorState
          title="Unable to load opening"
          message={detailError}
          onRetry={() => fetchDetail(openingId, { force: true })}
        />
      ) : null}

      {detailLoading && !opening ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : null}

      {opening ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]/40 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100">
              Job details
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Location</dt>
                <dd className="font-medium text-slate-100 dark:text-slate-100">
                  {opening.location || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Contract type</dt>
                <dd className="font-medium text-slate-100 dark:text-slate-100">
                  {opening.contractType || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Experience range</dt>
                <dd className="font-medium text-slate-100 dark:text-slate-100">{expRange}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Hiring manager</dt>
                <dd className="font-medium text-slate-100 dark:text-slate-100">
                  {opening.hiringManagerName ||
                    opening.hiringManager?.name ||
                    opening.managerName ||
                    "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Posted date</dt>
                <dd className="font-medium text-slate-100 dark:text-slate-100">
                  {formatDate(opening.postedDate || opening.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="font-medium text-slate-100 dark:text-slate-100">
                  {opening.status || "—"}
                </dd>
              </div>
              {opening.expectedCompletionDate ? (
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Expected completion</dt>
                  <dd className="font-medium text-slate-100 dark:text-slate-100">
                    {formatDate(opening.expectedCompletionDate, { withTime: false })}
                  </dd>
                </div>
              ) : null}
            </dl>
            {opening.description ? (
              <div className="mt-4 border-t border-white/[0.08] pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-100 dark:text-slate-100">
                  Description
                </h3>
                <MarkdownContent className="mt-2">{opening.description}</MarkdownContent>
              </div>
            ) : null}
          </section>

          {canSubmitProfiles ? (
            <section className="rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]/40 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100">
                Upload candidates
              </h2>
              <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">
                Upload one or more PDF or PPTX resumes. Files are securely uploaded and submitted
                for AI evaluation.
              </p>

              <div
                {...getRootProps()}
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 ${
                  isDragActive
                    ? "border-lime-500 bg-[#101318] dark:bg-lime-950/20"
                    : "border-slate-700 hover:border-slate-400 dark:border-slate-700"
                }`}
                aria-label="Upload resume files"
              >
                <input {...getInputProps()} />
                <p className="text-sm font-medium text-slate-100 dark:text-slate-100">
                  Drag & drop PDF/PPTX files here, or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Supported formats: PDF, PPTX (multiple files allowed)
                </p>
              </div>

              {selectedFiles.length > 0 ? (
                <div className="mt-4 space-y-2" role="status" aria-live="polite">
                  <h3 className="text-sm font-semibold text-slate-100 dark:text-slate-100">
                    Selected files
                  </h3>
                  <ul className="divide-y divide-white/[0.08] rounded-lg border border-white/[0.08] dark:divide-slate-800 dark:border-slate-800">
                    {selectedFiles.map((f) => (
                      <li
                        key={`${f.name}-${f.size}`}
                        className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100 dark:text-slate-100">
                            {f.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {f.type || "unknown type"} · {formatBytes(f.size)} ·{" "}
                            {fileStatus[f.name] || "ready"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSelected(f.name, f.size)}
                          disabled={uploadLoading}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={
                        uploadLoading || selectedFiles.length === 0 || opening?.status !== "OPEN"
                      }
                      className="bg-lime-300 hover:bg-lime-200 text-black"
                    >
                      {uploadLoading ? "Submitting..." : "Submit profiles"}
                    </Button>
                    {uploadError ? (
                      <span className="text-sm text-red-600 dark:text-red-400">{uploadError}</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {canViewProfiles ? (
            <section className="rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]/40 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100">
                  My uploaded profiles
                </h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {profileRows.length} file(s)
                </span>
              </div>
              {profileRows.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-700 p-8 text-center dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-100 dark:text-slate-100">
                    No profiles uploaded yet
                  </p>
                  <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">
                    Upload and submit candidate resumes to get started.
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#0b0b0b] text-xs uppercase tracking-wide text-slate-300 dark:bg-[#171717]/60 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-semibold">File</th>
                        <th className="px-4 py-3 font-semibold">Submitted</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.08] dark:divide-slate-800">
                      {profileRows.map((p) => {
                        const id = getId(p);
                        const fileName =
                          p.fileName || p.originalName || p.name || p.s3Key || `Profile #${id}`;
                        return (
                          <tr key={id}>
                            <td
                              className="max-w-[280px] truncate px-4 py-3 font-medium text-slate-100 dark:text-slate-100"
                              title={fileName}
                            >
                              {fileName}
                            </td>
                            <td className="px-4 py-3 text-slate-200 dark:text-slate-300">
                              {formatDate(p.submittedAt || p.createdAt, { withTime: true })}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge label={p.status || "SUBMITTED"} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreview(id)}
                                  disabled={previewingId === id}
                                >
                                  {previewingId === id ? "Opening..." : "Preview"}
                                </Button>
                                {canDeleteProfiles ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
                                    onClick={() => setDeleteId(id)}
                                  >
                                    Delete
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Only your own uploads are shown. AI scores and explanations are visible to the
                hiring manager only.
              </p>
            </section>
          ) : null}
        </div>
      ) : null}

      <AlertDialog
        open={canDeleteProfiles && deleteId != null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the uploaded profile. You won&apos;t be able to use it for this
              opening unless re-uploaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Removing..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
