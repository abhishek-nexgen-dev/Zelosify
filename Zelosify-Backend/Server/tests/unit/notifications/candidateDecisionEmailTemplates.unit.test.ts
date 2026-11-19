import { describe, expect, it } from "vitest";
import { buildCandidateDecisionEmail } from "../../../src/services/notifications/candidateDecisionEmailTemplates.js";

describe("candidate decision email templates", () => {
  it("renders a warm shortlist email with the opening and company", () => {
    const email = buildCandidateDecisionEmail({
      candidateName: "Sam Candidate",
      jobTitle: "Senior Software Engineer",
      companyName: "Bruce Wayne Corp",
      decision: "SHORTLISTED",
    });
    expect(email.subject).toContain("shortlisted");
    expect(email.text).toContain("Senior Software Engineer");
    expect(email.text).toContain("next step");
    expect(email.html).toContain("You’ve been shortlisted");
  });

  it("renders a respectful rejection email and escapes untrusted HTML fields", () => {
    const email = buildCandidateDecisionEmail({
      candidateName: "<Sam>",
      jobTitle: "Engineer <script>alert(1)</script>",
      companyName: "A&B",
      decision: "REJECTED",
    });
    expect(email.subject).toContain("application");
    expect(email.text).toContain("we’ve decided not to move forward");
    expect(email.html).toContain("&lt;Sam&gt;");
    expect(email.html).toContain("A&amp;B");
    expect(email.html).not.toContain("<script>");
  });
});
