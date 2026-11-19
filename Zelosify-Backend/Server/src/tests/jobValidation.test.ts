import { describe, expect, it } from "vitest";
import { createJobSchema, jobCandidatesQuerySchema, updateJobSchema } from "../validations/jobValidation.js";

const validCreateBody = {
  title: "Platform Engineer",
  description: "x".repeat(200),
  experienceMin: 3,
};

describe("job description validation", () => {
  it("requires a description when creating an opening", () => {
    const { description: _description, ...body } = validCreateBody;
    expect(createJobSchema.safeParse({ body }).success).toBe(false);
  });

  it.each([200, 700])("accepts a trimmed description of %i characters", (length) => {
    const result = createJobSchema.safeParse({
      body: { ...validCreateBody, description: ` ${"x".repeat(length)} ` },
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.description).toHaveLength(length);
  });

  it.each([199, 701])("rejects a description of %i characters", (length) => {
    const result = createJobSchema.safeParse({
      body: { ...validCreateBody, description: "x".repeat(length) },
    });

    expect(result.success).toBe(false);
  });

  it("allows a partial update without changing the existing description", () => {
    expect(updateJobSchema.safeParse({ params: { id: "opening-1" }, body: { title: "Updated title" } }).success).toBe(true);
  });

  it("validates a description supplied during a partial update", () => {
    expect(updateJobSchema.safeParse({
      params: { id: "opening-1" },
      body: { description: "x".repeat(199) },
    }).success).toBe(false);
    expect(updateJobSchema.safeParse({
      params: { id: "opening-1" },
      body: { description: "x".repeat(200) },
    }).success).toBe(true);
  });
});

describe("opening assignment validation", () => {
  it("allows admin-created openings without manager or recruiter assignments", () => {
    expect(createJobSchema.safeParse({ body: validCreateBody }).success).toBe(true);
  });

  it("allows explicit null assignments when editing an opening", () => {
    expect(updateJobSchema.safeParse({
      params: { id: "opening-1" },
      body: { hiringManagerId: null, recruiterId: null },
    }).success).toBe(true);
  });
});

describe("job candidate status filter validation", () => {
  it.each(["SUBMITTED", "SHORTLISTED", "REJECTED"])("accepts status %s", (status) => {
    expect(jobCandidatesQuerySchema.safeParse({ query: { page: "1", limit: "20", status } }).success).toBe(true);
  });

  it("rejects unsupported candidate statuses", () => {
    expect(jobCandidatesQuerySchema.safeParse({ query: { status: "PROCESSING" } }).success).toBe(false);
  });
});
