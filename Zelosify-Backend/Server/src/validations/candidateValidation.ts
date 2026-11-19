import { z } from "zod";




export const applyJobSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Job ID is required"),
  }),
  body: z.object({}).strict(),
});

export const updateResumeSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Application ID is required"),
  }),
  body: z.object({}).strict(),
});




export const candidateDecisionSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Application ID is required"),
  }),
  body: z.object({
    notes: z.string().max(1000).optional(),
  }).optional(),
});

export type ApplyJobInput = z.infer<typeof applyJobSchema>["body"];
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>["body"];
export type CandidateDecisionInput = z.infer<typeof candidateDecisionSchema>["body"];
