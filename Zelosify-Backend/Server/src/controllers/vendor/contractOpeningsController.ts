import type { Request, Response } from "express";
import prisma from "../../config/prisma/prisma.js";
import { createStorageService } from "../../services/storage/storageFactory.js";
import { triggerAsyncRecommendation } from "../../services/ai/recommendationService.js";
import { randomUUID } from "node:crypto";
import { sanitizeFilename } from "../../helpers/vendorRequestValidation.js";
import { getSignedUrlExpirySeconds } from "../../services/storage/storageService.js";
import { ENV } from "../../config/env.js";
import { hasPermission } from "../../utils/RBAC/permissions.js";

function parsePositiveInteger(value: unknown, fallback: number, maximum: number): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value);
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return Math.min(parsed, maximum);
}

function logVendorControllerError(event: string, error: unknown): void {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
  console.error(JSON.stringify({
    level: "error",
    event,
    ...(code && /^[A-Z][A-Z0-9_]{1,30}$/.test(code) ? { errorCode: code } : {}),
  }));
}

function safeUploadMessage(error: unknown, fallback: string, allowedMessages: string[]): string {
  const message = error instanceof Error ? error.message : "";
  return allowedMessages.includes(message) ? message : fallback;
}






export async function getVendorOpenings(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const defaultPageLimit = ENV.DEFAULT_PAGE_LIMIT;
    const maxPageLimit = ENV.MAX_PAGE_LIMIT;
    const page = parsePositiveInteger(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = parsePositiveInteger(req.query.limit, defaultPageLimit, maxPageLimit);
    if (page === null || limit === null) {
      return res.status(400).json({ success: false, message: "page and limit must be positive whole numbers." });
    }
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({ success: false, message: "page is outside the supported range." });
    }

    const query = String(req.query.query || "").trim();
    const location = String(req.query.location || "").trim();
    const contractType = String(req.query.contractType || "").trim();
    if (query.length > 100 || location.length > 100 || contractType.length > 80) {
      return res.status(400).json({ success: false, message: "Search filters exceed the supported length." });
    }

    const where: any = {
      tenantId,
      status: "OPEN",
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (contractType) {
      where.contractType = { equals: contractType, mode: "insensitive" };
    }

    const [total, openings] = await Promise.all([
      prisma.opening.count({ where }),
      prisma.opening.findMany({
        where,
        skip,
        take: limit,
        orderBy: { postedDate: "desc" },
        include: {
          tenant: { select: { companyName: true } },
        },
      }),
    ]);


    const managerIds = [...new Set(openings.map((o) => o.hiringManagerId).filter((id): id is string => Boolean(id)))];
    const managers = managerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: managerIds }, tenantId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const managerMap = new Map(managers.map((m) => [m.id, `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email]));

    const formattedOpenings = openings.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      location: o.location,
      contractType: o.contractType,
      experienceMin: o.experienceMin,
      experienceMax: o.experienceMax,
      postedDate: o.postedDate,
      expectedCompletionDate: o.expectedCompletionDate,
      actionDate: o.actionDate,
      status: o.status,
      companyName:
        o.tenant?.companyName ||
        ENV.DEFAULT_TENANT_NAME ||
        "Bruce Wayne Corp",
      hiringManagerName: o.hiringManagerId
        ? managerMap.get(o.hiringManagerId) || ENV.DEFAULT_HIRING_MANAGER_NAME || "Hiring Team"
        : null,
    }));

    return res.json({
      success: true,
      data: formattedOpenings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    logVendorControllerError("VENDOR_OPENINGS_LIST_FAILED", error);
    return res.status(500).json({ success: false, message: "Failed to fetch openings." });
  }
}


export async function getVendorOpeningDetail(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    const vendorId = req.user?.id;
    const id = String(req.params.id);

    if (!tenantId || !vendorId) {
      return res.status(403).json({ message: "Authentication and tenant context required" });
    }

    const opening = await prisma.opening.findFirst({
      where: { id, tenantId },
      include: {
        tenant: { select: { companyName: true } },
      },
    });

    if (!opening) {
      return res.status(404).json({ message: "Opening not found" });
    }


    const canViewProfiles = hasPermission(req.user, "VENDOR_PROFILES_VIEW");
    const [manager, vendorProfiles] = await Promise.all([
      opening.hiringManagerId
        ? prisma.user.findFirst({
            where: { id: opening.hiringManagerId, tenantId, role: "HIRING_MANAGER" },
            select: { firstName: true, lastName: true, email: true },
          })
        : Promise.resolve(null),
      canViewProfiles ? prisma.hiringProfile.findMany({
        where: {
          openingId: id,
          uploadedBy: vendorId,
          isDeleted: false,
        },
        select: {
          id: true,
          s3Key: true,
          uploadedBy: true,
          submittedAt: true,
          status: true,
        },
        orderBy: { submittedAt: "desc" },
      }) : Promise.resolve([]),
    ]);
    const hiringManagerName = manager
      ? `${manager.firstName || ""} ${manager.lastName || ""}`.trim() || manager.email
      : opening.hiringManagerId
        ? ENV.DEFAULT_HIRING_MANAGER_NAME || "Hiring Team"
        : null;


    const profilesCount = vendorProfiles.length;

    const formattedProfiles = vendorProfiles.map((p) => {
      const fileName = p.s3Key.split("/").pop() || `profile_${p.id}`;
      return {
        id: p.id,
        fileName,
        s3Key: p.s3Key,
        submittedAt: p.submittedAt,
        status: p.status,
      };
    });

    return res.json({
      success: true,
      data: {
        id: opening.id,
        title: opening.title,
        description: opening.description,
        location: opening.location,
        contractType: opening.contractType,
        experienceMin: opening.experienceMin,
        experienceMax: opening.experienceMax,
        postedDate: opening.postedDate,
        expectedCompletionDate: opening.expectedCompletionDate,
        actionDate: opening.actionDate,
        status: opening.status,
        companyName:
          opening.tenant?.companyName ||
          ENV.DEFAULT_TENANT_NAME ||
          "Bruce Wayne Corp",
        hiringManagerName,
        profilesCount,
        profiles: formattedProfiles,
      },
    });
  } catch (error: any) {
    logVendorControllerError("VENDOR_OPENING_DETAIL_FAILED", error);
    return res.status(500).json({ success: false, message: "Failed to fetch opening details." });
  }
}


export async function presignVendorProfileUpload(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    const vendorId = req.user?.id;
    const openingId = String(req.params.id);
    const { files } = req.body;

    if (!tenantId || !vendorId) {
      return res.status(403).json({ message: "Authentication and tenant context required" });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "Files array is required" });
    }


    const opening = await prisma.opening.findFirst({
      where: { id: openingId, tenantId },
    });
    if (!opening) {
      return res.status(404).json({ message: "Opening not found or access denied" });
    }
    if (opening.status !== "OPEN") return res.status(400).json({ message: "This opening is not accepting submissions." });

    if (files.length > 20) return res.status(400).json({ message: "Upload up to 20 resumes at a time." });
    const storage = createStorageService();
    const uploads = await Promise.all(files.map(async (file: any) => {
      const filename = sanitizeFilename(typeof file === "string" ? file : file.name || file.filename || "");
      const contentType = typeof file === "string" ? "" : String(file.contentType || file.type || "");
      const allowedTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };
      const extension = filename?.slice(filename.lastIndexOf(".")).toLowerCase();
      if (!filename || !extension || allowedTypes[extension] !== contentType || !Number.isFinite(file.size) || file.size < 1 || file.size > 10 * 1024 * 1024) {
        throw new Error("Each upload must be a PDF or PPTX file no larger than 10 MB.");
      }
      const key = `${tenantId}/${openingId}/${vendorId}/${randomUUID()}-${filename}`;
      return {
        filename,
        key,
        contentType,
        uploadUrl: await storage.getUploadURL(key, contentType),
        expiresInSeconds: getSignedUrlExpirySeconds(),
      };
    }));

    return res.json({
      success: true,
      data: uploads,
    });
  } catch (error: any) {
    logVendorControllerError("VENDOR_UPLOAD_PRESIGN_FAILED", error);
    return res.status(400).json({ success: false, message: safeUploadMessage(
      error,
      "Unable to prepare upload links. Check the file and try again.",
      ["Each upload must be a PDF or PPTX file no larger than 10 MB."],
    ) });
  }
}


export async function submitVendorProfiles(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    const vendorId = req.user?.id;
    const openingId = String(req.params.id);
    const { profiles } = req.body;

    if (!tenantId || !vendorId) {
      return res.status(403).json({ message: "Authentication and tenant context required" });
    }

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0 || profiles.length > 20) {
      return res.status(400).json({ message: "Profiles array is required" });
    }


    const opening = await prisma.opening.findFirst({
      where: { id: openingId, tenantId },
    });
    if (!opening) {
      return res.status(404).json({ message: "Opening not found or access denied" });
    }
    if (opening.status !== "OPEN") return res.status(400).json({ message: "This opening is not accepting submissions." });


    const storage = createStorageService();
    const keys = await Promise.all(profiles.map(async (item: any) => {
        const s3Key = typeof item === "string" ? item : item.s3Key || item.key;
        if (typeof s3Key !== "string" || !s3Key.startsWith(`${tenantId}/${openingId}/${vendorId}/`) || s3Key.includes("..") || s3Key.includes("\\")) {
          throw new Error("Unauthorized object key scope.");
        }
        const metadata = await storage.getObjectMetadata(s3Key);
        const extension = s3Key.slice(s3Key.lastIndexOf(".")).toLowerCase();
        const expectedType = extension === ".pdf" ? "application/pdf" : extension === ".pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : null;
        if (!expectedType || metadata.contentType !== expectedType || metadata.size < 1 || metadata.size > 10 * 1024 * 1024) {
          throw new Error("Uploaded resume could not be verified as a supported PDF or PPTX file.");
        }
        const stream = await storage.getObjectStream(s3Key);
        let validSignature = false;
        try {
          for await (const chunk of stream) {
            const header = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            validSignature = extension === ".pdf"
              ? header.length >= 5 && header.subarray(0, 5).toString("ascii") === "%PDF-"
              : header.length >= 4 && header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
            break;
          }
        } finally {
          stream.destroy();
        }
        if (!validSignature) throw new Error("Uploaded resume content does not match the selected file type.");
        return s3Key;
    }));
    if (new Set(keys).size !== keys.length) return res.status(400).json({ message: "A resume can only be submitted once per upload batch." });

    const createdProfiles = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const s3Key of keys) {
        const profile = await tx.hiringProfile.create({
          data: {
            openingId,
            s3Key,
            uploadedBy: vendorId,
            status: "SUBMITTED",
            isDeleted: false,
          },
        });
        records.push(profile);
      }
      return records;
    });


    for (const record of createdProfiles) {
      triggerAsyncRecommendation(record.id);
    }

    return res.status(201).json({
      success: true,
      message: `${createdProfiles.length} profile(s) submitted successfully. AI evaluation started.`,
      data: createdProfiles.map((p) => ({
        id: p.id,
        s3Key: p.s3Key,
        submittedAt: p.submittedAt,
        status: p.status,
      })),
    });
  } catch (error: any) {
    logVendorControllerError("VENDOR_PROFILE_SUBMISSION_FAILED", error);
    return res.status(400).json({ success: false, message: safeUploadMessage(
      error,
      "Profile submission failed. Verify the files and opening, then try again.",
      [
        "Unauthorized object key scope.",
        "Uploaded resume could not be verified as a supported PDF or PPTX file.",
        "Uploaded resume content does not match the selected file type.",
        "A resume can only be submitted once per upload batch.",
      ],
    ) });
  }
}


export async function previewVendorProfile(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    const vendorId = req.user?.id;
    const profileId = parseInt(String(req.params.id), 10);

    if (!tenantId || !vendorId || isNaN(profileId)) {
      return res.status(400).json({ message: "Valid profile ID and authentication required" });
    }

    const profile = await prisma.hiringProfile.findUnique({
          where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.isDeleted || profile.uploadedBy !== vendorId || profile.opening.tenantId !== tenantId) {
      return res.status(404).json({ message: "Profile not found or access denied" });
    }

    const storage = createStorageService();
    const previewUrl = await storage.getObjectURL(profile.s3Key);

    return res.json({
      success: true,
      url: previewUrl,
    });
  } catch (error: any) {
    logVendorControllerError("VENDOR_PROFILE_PREVIEW_FAILED", error);
    return res.status(500).json({ success: false, message: "Failed to generate preview URL." });
  }
}


export async function softDeleteVendorProfile(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    const vendorId = req.user?.id;
    const profileId = parseInt(String(req.params.id), 10);

    if (!tenantId || !vendorId || isNaN(profileId)) {
      return res.status(400).json({ message: "Valid profile ID and authentication required" });
    }

    const profile = await prisma.hiringProfile.findUnique({
      where: { id: profileId },
      include: { opening: true },
    });

    if (!profile || profile.uploadedBy !== vendorId || profile.opening.tenantId !== tenantId) {
      return res.status(404).json({ message: "Profile not found or access denied" });
    }


    await prisma.hiringProfile.update({
      where: { id: profileId },
      data: { isDeleted: true },
    });

    return res.json({
      success: true,
      message: "Profile soft-deleted successfully",
    });
  } catch (error: any) {
    logVendorControllerError("VENDOR_PROFILE_DELETE_FAILED", error);
    return res.status(500).json({ success: false, message: "Failed to delete profile." });
  }
}
