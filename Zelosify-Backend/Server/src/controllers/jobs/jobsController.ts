import { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma/prisma.js";
import { getOpeningScope } from "../../utils/RBAC/openingScope.js";
import { hasPermission } from "../../utils/RBAC/permissions.js";

export async function listJobAssignees(req: Request, res: Response): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({ success: false, message: "A tenant-scoped recruiting account is required." });
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: { tenantId, role: { in: ["RECRUITER", "HIRING_MANAGER"] } },
      select: { id: true, username: true, email: true, firstName: true, lastName: true, role: true, department: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    });
    res.json({
      success: true,
      data: {
        recruiters: users.filter((user) => user.role === "RECRUITER"),
        hiringManagers: users.filter((user) => user.role === "HIRING_MANAGER" && (
          req.user?.role !== "HIRING_MANAGER" || user.id === req.user.id
        )),
      },
    });
  } catch (error) {
    console.error("[JobsController] Error listing job assignees:", error);
    res.status(500).json({ success: false, message: "Failed to load job assignees." });
  }
}

async function isTenantUserWithRole(id: string, tenantId: string, role: "RECRUITER" | "HIRING_MANAGER"): Promise<boolean> {
  const user = await prisma.user.findFirst({ where: { id, tenantId, role }, select: { id: true } });
  return Boolean(user);
}





export async function listJobs(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "10"), 10)));
    const skip = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const location = req.query.location ? String(req.query.location).trim() : undefined;
    const where: any = {
      status: "OPEN",
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }

    const [total, jobs] = await Promise.all([
      prisma.opening.count({ where }),
      prisma.opening.findMany({
        where,
        skip,
        take: limit,
        orderBy: { postedDate: "desc" },
        include: {
          tenant: { select: { companyName: true } },
          _count: { select: { hiringProfiles: true } },
        },
      }),
    ]);

    const formatted = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location || "Remote",
      contractType: job.contractType || "Full-Time",
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      requiredSkills: job.requiredSkills,
      status: job.status,
      postedDate: job.postedDate,
      companyName: job.tenant?.companyName || "Bruce Wayne Corp",
      applicantsCount: job._count.hiringProfiles,
    }));

    res.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[JobsController] Error listing jobs:", error);
    res.status(500).json({ success: false, message: "Failed to list jobs" });
  }
}

export async function listManagedJobs(req: Request, res: Response): Promise<void> {
  const scope = getOpeningScope(req.user);
  if (!scope) {
    res.status(403).json({ success: false, message: "A tenant-scoped recruiting account is required." });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = ["OPEN", "CLOSED", "ON_HOLD"].includes(String(req.query.status))
    ? String(req.query.status)
    : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const canViewCandidates = hasPermission(req.user, "CANDIDATES_VIEW");
  const where: Prisma.OpeningWhereInput = {
    ...scope,
    ...(status ? { status: status as "OPEN" | "CLOSED" | "ON_HOLD" } : {}),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  try {
    const [total, jobs] = await Promise.all([
      prisma.opening.count({ where }),
      prisma.opening.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { postedDate: "desc" },
        include: { _count: { select: { hiringProfiles: { where: { isDeleted: false } } } } },
      }),
    ]);
    res.json({
      success: true,
      data: jobs.map((job) => {
        const { _count, ...opening } = job;
        return { ...opening, ...(canViewCandidates && _count ? { applicantsCount: _count.hiringProfiles } : {}) };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[JobsController] Error listing managed jobs:", error);
    res.status(500).json({ success: false, message: "Failed to list managed jobs" });
  }
}

export async function getManagedJob(req: Request, res: Response): Promise<void> {
  const scope = getOpeningScope(req.user);
  if (!scope) {
    res.status(403).json({ success: false, message: "A tenant-scoped recruiting account is required." });
    return;
  }
  try {
    const job = await prisma.opening.findFirst({
      where: { id: String(req.params.id), ...scope },
      include: { tenant: { select: { companyName: true } } },
    });
    if (!job) {
      res.status(404).json({ success: false, message: "Job opening not found." });
      return;
    }

    const assigneeIds = [job.hiringManagerId, job.recruiterId].filter((id): id is string => Boolean(id));
    const assignees = assigneeIds.length
      ? await prisma.user.findMany({
          where: {
            id: { in: assigneeIds },
            tenantId: job.tenantId,
            role: { in: ["HIRING_MANAGER", "RECRUITER"] },
          },
          select: { id: true, username: true, firstName: true, lastName: true, email: true, role: true },
        })
      : [];
    const hiringManagerRecord = assignees.find((person) => person.id === job.hiringManagerId && person.role === "HIRING_MANAGER");
    const recruiterRecord = assignees.find((person) => person.id === job.recruiterId && person.role === "RECRUITER");
    const publicAssignee = (person: (typeof assignees)[number] | undefined) => {
      if (!person) return null;
      const { role: _role, ...details } = person;
      return details;
    };

    const { hiringManagerId: _hiringManagerId, recruiterId: _recruiterId, ...jobData } = job;
    res.json({ success: true, data: { ...jobData, hiringManager: publicAssignee(hiringManagerRecord || undefined), recruiter: publicAssignee(recruiterRecord || undefined) } });
  } catch (error) {
    console.error("[JobsController] Error fetching managed job:", error);
    res.status(500).json({ success: false, message: "Failed to fetch job opening" });
  }
}




export async function getJobById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const job = await prisma.opening.findFirst({
      where: { id, status: "OPEN" },
      include: {
        tenant: { select: { companyName: true } },
        _count: { select: { hiringProfiles: true } },
      },
    });

    if (!job) {
      res.status(404).json({ success: false, message: "Job opening not found." });
      return;
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location || "Remote",
        contractType: job.contractType || "Full-Time",
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        requiredSkills: job.requiredSkills,
        status: job.status,
        postedDate: job.postedDate,
        companyName: job.tenant?.companyName || "Bruce Wayne Corp",
        applicantsCount: job._count.hiringProfiles,
      },
    });
  } catch (error: any) {
    console.error("[JobsController] Error fetching job:", error);
    res.status(500).json({ success: false, message: "Failed to fetch job" });
  }
}




export async function createJob(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { title, description, location, contractType, experienceMin, experienceMax, requiredSkills, status, hiringManagerId, recruiterId } = req.body;

    if (!user || !["ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(user.role)) {
      res.status(403).json({ success: false, message: "This account cannot create job openings." });
      return;
    }

    const tenantId = user?.tenantId;
    if (!tenantId || !user?.id) {
      res.status(403).json({ success: false, message: "A tenant-scoped account is required." });
      return;
    }

    const assignedHiringManagerId = user.role === "HIRING_MANAGER" ? user.id : hiringManagerId || null;
    if (user.role === "RECRUITER" && hiringManagerId) {
      res.status(403).json({ success: false, message: "Only admins can assign a hiring manager." });
      return;
    }
    if (user.role === "HIRING_MANAGER" && hiringManagerId && hiringManagerId !== user.id) {
      res.status(403).json({ success: false, message: "Hiring managers can only assign their own openings to themselves." });
      return;
    }
    if (user.role === "RECRUITER" && recruiterId && recruiterId !== user.id) {
      res.status(403).json({ success: false, message: "Recruiters cannot assign openings to another recruiter." });
      return;
    }
    if (hiringManagerId && !(await isTenantUserWithRole(hiringManagerId, tenantId, "HIRING_MANAGER"))) {
      res.status(400).json({ success: false, message: "Selected hiring manager is not part of this tenant." });
      return;
    }
    if (recruiterId && !(await isTenantUserWithRole(recruiterId, tenantId, "RECRUITER"))) {
      res.status(400).json({ success: false, message: "Selected recruiter is not part of this tenant." });
      return;
    }

    const job = await prisma.opening.create({
      data: {
        title,
        description: description || null,
        location: location || "Remote",
        contractType: contractType || "Full-Time",
        experienceMin: parseInt(String(experienceMin), 10),
        experienceMax: experienceMax !== undefined && experienceMax !== null ? parseInt(String(experienceMax), 10) : null,
        requiredSkills: Array.from(new Map<string, string>((requiredSkills || []).map((skill: string) => [skill.trim().toLowerCase(), skill.trim()])).values()),
        status: status || "OPEN",
        hiringManagerId: assignedHiringManagerId,
        recruiterId: recruiterId || (user.role === "RECRUITER" ? user.id : null),
        tenantId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Job opening created successfully.",
      data: job,
    });
  } catch (error: any) {
    console.error("[JobsController] Error creating job:", error);
    res.status(500).json({ success: false, message: "Failed to create job" });
  }
}




export async function updateJob(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const scope = getOpeningScope(req.user);
    if (!scope) {
      res.status(403).json({ success: false, message: "A tenant-scoped recruiting account is required." });
      return;
    }
    const existing = await prisma.opening.findFirst({ where: { id, ...scope } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Job opening not found." });
      return;
    }

    const { title, description, location, contractType, experienceMin, experienceMax, requiredSkills, status, hiringManagerId, recruiterId } = req.body;
    const hasHiringManagerAssignment = Object.prototype.hasOwnProperty.call(req.body, "hiringManagerId");
    const hasRecruiterAssignment = Object.prototype.hasOwnProperty.call(req.body, "recruiterId");
    if (req.user?.role === "RECRUITER" && (hasHiringManagerAssignment || hasRecruiterAssignment)) {
      res.status(403).json({ success: false, message: "Recruiters cannot change opening team assignments." });
      return;
    }
    if (req.user?.role === "HIRING_MANAGER" && hasHiringManagerAssignment) {
      res.status(403).json({ success: false, message: "Hiring managers can assign recruiters but cannot reassign the hiring manager." });
      return;
    }
    if (hasHiringManagerAssignment && hiringManagerId && hiringManagerId === existing.hiringManagerId) {
      res.status(409).json({ success: false, message: "This hiring manager is already assigned to this opening." });
      return;
    }
    if (hasRecruiterAssignment && recruiterId && recruiterId === existing.recruiterId) {
      res.status(409).json({ success: false, message: "This recruiter is already assigned to this opening." });
      return;
    }

    const min = experienceMin === undefined ? existing.experienceMin : Number(experienceMin);
    const max = experienceMax === undefined ? existing.experienceMax : experienceMax === null ? null : Number(experienceMax);
    if (max !== null && max < min) {
      res.status(400).json({ success: false, message: "Maximum experience cannot be less than minimum experience." });
      return;
    }

    if (hiringManagerId && !(await isTenantUserWithRole(hiringManagerId, existing.tenantId, "HIRING_MANAGER"))) {
      res.status(400).json({ success: false, message: "Selected hiring manager is not part of this tenant." });
      return;
    }
    if (recruiterId && !(await isTenantUserWithRole(recruiterId, existing.tenantId, "RECRUITER"))) {
      res.status(400).json({ success: false, message: "Selected recruiter is not part of this tenant." });
      return;
    }


    const updated = await prisma.opening.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(contractType !== undefined && { contractType }),
        ...(experienceMin !== undefined && { experienceMin: parseInt(String(experienceMin), 10) }),
        ...(experienceMax !== undefined && {
          experienceMax: experienceMax !== null ? parseInt(String(experienceMax), 10) : null,
        }),
        ...(requiredSkills !== undefined && {
          requiredSkills: Array.from(new Map<string, string>(requiredSkills.map((skill: string) => [skill.trim().toLowerCase(), skill.trim()])).values()),
        }),
        ...(status !== undefined && { status }),
        ...(hiringManagerId !== undefined && { hiringManagerId }),
        ...(recruiterId !== undefined && { recruiterId }),
      },
    });

    res.json({
      success: true,
      message: "Job opening updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    console.error("[JobsController] Error updating job:", error);
    res.status(500).json({ success: false, message: "Failed to update job" });
  }
}




export async function deleteJob(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const scope = getOpeningScope(req.user);
    if (!scope) {
      res.status(403).json({ success: false, message: "A tenant-scoped recruiting account is required." });
      return;
    }
    const existing = await prisma.opening.findFirst({ where: { id, ...scope } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Job opening not found." });
      return;
    }


    const closed = await prisma.opening.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    res.json({
      success: true,
      message: "Job opening closed successfully.",
      data: closed,
    });
  } catch (error: any) {
    console.error("[JobsController] Error deleting job:", error);
    res.status(500).json({ success: false, message: "Failed to close job" });
  }
}
