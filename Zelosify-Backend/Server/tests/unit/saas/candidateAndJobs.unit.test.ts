import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCandidateSchema, assignRecruiterSchema } from "../../../src/validations/authValidation.js";
import { createJobSchema, updateJobSchema } from "../../../src/validations/jobValidation.js";
import { applyJobSchema, updateResumeSchema, candidateDecisionSchema } from "../../../src/validations/candidateValidation.js";
import { authorizeRole } from "../../../src/middlewares/auth/authorizeMiddleware.js";
import { isValidRole } from "../../../src/utils/RBAC/isValidRole.js";
import type { Response, NextFunction } from "express";

describe("SaaS Workflow: Zod Validations, Roles & RBAC", () => {
  const createMockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  describe("Role Schema Constraints", () => {
    it("validates all supported database and route roles", () => {
      expect(isValidRole("ADMIN")).toBe(true);
      expect(isValidRole("RECRUITER")).toBe(true);
      expect(isValidRole("HIRING_MANAGER")).toBe(true);
      expect(isValidRole("CANDIDATE")).toBe(true);
      expect(isValidRole("IT_VENDOR")).toBe(true);
      expect(isValidRole("BUSINESS_USER")).toBe(false);
      expect(isValidRole("RANDOM_ROLE")).toBe(false);
    });

    it("allows ADMIN universal access across any protected endpoint", async () => {
      const req: any = {
        headers: {},
        cookies: {},
        user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-demo" },
      };
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      const candidateGuard = authorizeRole("CANDIDATE");
      await candidateGuard(req, res, next);
      expect(next).toHaveBeenCalled();

      const recruiterGuard = authorizeRole("RECRUITER");
      await recruiterGuard(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it("allows RECRUITER access to recruiter endpoints but blocks CANDIDATE", async () => {
      const recruiterReq: any = {
        headers: {},
        cookies: {},
        user: { id: "recruiter-1", role: "RECRUITER", tenantId: "tenant-demo" },
      };
      const candidateReq: any = {
        headers: {},
        cookies: {},
        user: { id: "candidate-1", role: "CANDIDATE", tenantId: "tenant-demo" },
      };
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      const recruiterGuard = authorizeRole("RECRUITER", "HIRING_MANAGER");
      await recruiterGuard(recruiterReq, res, next);
      expect(next).toHaveBeenCalled();

      await recruiterGuard(candidateReq, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Access Denied"),
        })
      );
    });

    it("allows CANDIDATE access to candidate application endpoints", async () => {
      const candidateReq: any = {
        headers: {},
        cookies: {},
        user: { id: "candidate-1", role: "CANDIDATE", tenantId: "tenant-demo" },
      };
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      const candidateGuard = authorizeRole("CANDIDATE");
      await candidateGuard(candidateReq, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("allows an IT_VENDOR account through vendor route authorization", async () => {
      const vendorReq: any = {
        headers: {},
        cookies: {},
        user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-demo" },
      };
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      await authorizeRole("IT_VENDOR")(vendorReq, res, next);
      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe("Zod Validation Schemas", () => {
    it("validates candidate registration input successfully", async () => {
      const validCandidate = {
        body: {
          username: "john_doe",
          email: "john@example.com",
          password: "SecurePassword123!",
          firstName: "John",
          lastName: "Doe",
        },
      };
      const parsed = await registerCandidateSchema.parseAsync(validCandidate);
      expect(parsed.body.email).toBe("john@example.com");
      expect(parsed.body).not.toHaveProperty("role");
      expect(parsed.body).not.toHaveProperty("tenantId");
    });

    it("strips public registration attempts to choose a privileged role or tenant", async () => {
      const base = {
        username: "john_doe",
        email: "john@example.com",
        password: "SecurePassword123!",
      };
      const role = await registerCandidateSchema.parseAsync({ body: { ...base, role: "ADMIN" } });
      const tenant = await registerCandidateSchema.parseAsync({ body: { ...base, tenantId: "another-tenant" } });
      expect(role.body).not.toHaveProperty("role");
      expect(tenant.body).not.toHaveProperty("tenantId");
    });

    it("rejects candidate registration with invalid email or short password", async () => {
      const invalidCandidate = {
        body: {
          username: "john_doe",
          email: "not-an-email",
          password: "123",
        },
      };
      await expect(registerCandidateSchema.parseAsync(invalidCandidate)).rejects.toThrow();
    });

    it("validates recruiter assignment by admin", async () => {
      const recruiterData = {
        body: {
          username: "alice_recruiter",
          email: "alice@zelosify.dev",
        password: "OneTime-Recruiter-Password-42",
          firstName: "Alice",
          lastName: "Smith",
          department: "Talent Acquisition",
        },
      };
      const parsed = await assignRecruiterSchema.parseAsync(recruiterData);
      expect(parsed.body.username).toBe("alice_recruiter");
      expect(parsed.body.password).toBe("OneTime-Recruiter-Password-42");
      expect(parsed.body.role).toBe("RECRUITER");
      const managerParsed = await assignRecruiterSchema.parseAsync({ body: { ...recruiterData.body, role: "HIRING_MANAGER" } });
      expect(managerParsed.body.role).toBe("HIRING_MANAGER");
      await expect(assignRecruiterSchema.parseAsync({ body: { ...recruiterData.body, role: "ADMIN" } })).rejects.toThrow();
      await expect(assignRecruiterSchema.parseAsync({ body: { ...recruiterData.body, password: "short" } })).rejects.toThrow();
      await expect(assignRecruiterSchema.parseAsync({ body: { ...recruiterData.body, password: "eleven-char" } })).rejects.toThrow();
      await expect(assignRecruiterSchema.parseAsync({
        body: {
          username: recruiterData.body.username,
          email: recruiterData.body.email,
          firstName: recruiterData.body.firstName,
          lastName: recruiterData.body.lastName,
        },
      })).rejects.toThrow();
    });

    it("validates job opening creation schema", async () => {
      const validJob = {
        body: {
          title: "Senior Full Stack Engineer",
          description: "We are looking for a senior full stack engineer to build reliable web products used by customers every day. You will develop accessible React interfaces, design maintainable TypeScript services, collaborate with product and design, review code, and improve testing and observability. Experience delivering cloud hosted applications and working across the full software development lifecycle is required.",
          location: "Remote",
          contractType: "Full-Time",
          experienceMin: 5,
          experienceMax: 8,
          requiredSkills: ["React", "TypeScript"],
          status: "OPEN" as const,
        },
      };
      const parsed = await createJobSchema.parseAsync(validJob);
      expect(parsed.body.title).toBe("Senior Full Stack Engineer");
      expect(parsed.body.experienceMin).toBe(5);
      expect(parsed.body.requiredSkills).toEqual(["React", "TypeScript"]);
    });

    it("rejects job opening with invalid experience range (negative or experienceMin > experienceMax)", async () => {
      const invalidExperience = {
        body: {
          title: "Junior Developer",
          experienceMin: -1,
        },
      };
      await expect(createJobSchema.parseAsync(invalidExperience)).rejects.toThrow();

      const invalidRange = {
        body: {
          title: "Senior Developer",
          experienceMin: 10,
          experienceMax: 5,
        },
      };
      await expect(createJobSchema.parseAsync(invalidRange)).rejects.toThrow();
    });

    it("accepts an empty multipart text body and rejects client-supplied keys or identity", async () => {
      const parsed = await applyJobSchema.parseAsync({ params: { id: "job-123" }, body: {} });
      expect(parsed.body).toEqual({});
      await expect(applyJobSchema.parseAsync({
        params: { id: "job-123" },
        body: { candidateId: "someone-else" },
      })).rejects.toThrow();
      await expect(applyJobSchema.parseAsync({
        params: { id: "job-123" },
        body: { s3Key: "candidate-resumes/tenant-1/candidate-1/resume.pdf" },
      })).rejects.toThrow();
    });

    it("rejects job application with unsupported resume file extension", async () => {
      const invalidResume = {
        params: { id: "job-123" },
        body: {
          s3Key: "candidate-resumes/tenant-1/candidate-1/malicious.exe",
        },
      };
      await expect(applyJobSchema.parseAsync(invalidResume)).rejects.toThrow();
    });

    it("accepts file-based resume replacement without a client storage key", async () => {
      const parsed = await updateResumeSchema.parseAsync({ params: { id: "42" }, body: {} });
      expect(parsed.body).toEqual({});
      await expect(updateResumeSchema.parseAsync({
        params: { id: "42" },
        body: { s3Key: "candidate-resumes/tenant-1/candidate-1/resume_v2.pdf" },
      })).rejects.toThrow();
      expect(parsed.params.id).toBe("42");
    });

    it("accepts an empty request body for multipart resume replacement", async () => {
      const parsed = await updateResumeSchema.parseAsync({ params: { id: "42" }, body: {} });
      expect(parsed.body).toEqual({});
    });

    it("validates recruiter decision schema with optional notes", async () => {
      const decisionData = {
        params: { id: "42" },
        body: {
          notes: "Strong candidate with relevant experience in Next.js and Prisma.",
        },
      };
      const parsed = await candidateDecisionSchema.parseAsync(decisionData);
      expect(parsed.body?.notes).toBeDefined();
      expect(parsed.params.id).toBe("42");
    });
  });
});
