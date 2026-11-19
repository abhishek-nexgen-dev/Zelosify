import { z } from "zod";




export const createJobSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Job title must be at least 3 characters").max(200, "Job title is too long"),
    description: z
      .string()
      .trim()
      .min(200, "Job description must be at least 200 characters")
      .max(700, "Job description must be no more than 700 characters"),
    location: z.string().default("Remote"),
    contractType: z.string().default("Full-Time"),
    experienceMin: z.coerce.number().int().min(0, "Minimum experience must be 0 or more").max(50),
    experienceMax: z.coerce.number().int().min(0).max(50).nullable().optional(),
    requiredSkills: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
    hiringManagerId: z.string().trim().min(1).nullable().optional(),
    recruiterId: z.string().trim().min(1).nullable().optional(),
    status: z.enum(["OPEN", "CLOSED", "ON_HOLD"]).default("OPEN"),
  }).refine((data) => {
    if (data.experienceMax !== undefined && data.experienceMax !== null) {
      return data.experienceMax >= data.experienceMin;
    }
    return true;
  }, {
    message: "Maximum experience cannot be less than minimum experience",
    path: ["experienceMax"],
  }),
});




export const updateJobSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Job ID is required"),
  }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z
      .string()
      .trim()
      .min(200, "Job description must be at least 200 characters")
      .max(700, "Job description must be no more than 700 characters")
      .optional(),
    location: z.string().optional(),
    contractType: z.string().optional(),
    experienceMin: z.coerce.number().int().min(0).max(50).optional(),
    experienceMax: z.coerce.number().int().min(0).max(50).nullable().optional(),
    requiredSkills: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    hiringManagerId: z.string().trim().min(1).nullable().optional(),
    recruiterId: z.string().trim().min(1).nullable().optional(),
    status: z.enum(["OPEN", "CLOSED", "ON_HOLD"]).optional(),
  }),
});




export const queryJobsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["OPEN", "CLOSED", "ON_HOLD"]).optional().default("OPEN"),
  }),
});

export const jobCandidatesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["SUBMITTED", "SHORTLISTED", "REJECTED"]).optional(),
  }),
});

export type CreateJobInput = z.infer<typeof createJobSchema>["body"];
export type UpdateJobInput = z.infer<typeof updateJobSchema>["body"];
export type QueryJobsInput = z.infer<typeof queryJobsSchema>["query"];
