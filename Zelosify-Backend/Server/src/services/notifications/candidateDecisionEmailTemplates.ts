export type CandidateDecision = "SHORTLISTED" | "REJECTED";

export interface CandidateDecisionEmailInput {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  decision: CandidateDecision;
}

export interface CandidateDecisionEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function buildCandidateDecisionEmail(input: CandidateDecisionEmailInput): CandidateDecisionEmail {
  const candidateName = input.candidateName.trim() || "Candidate";
  const jobTitle = input.jobTitle.trim() || "the role you applied for";
  const companyName = input.companyName.trim() || "our team";
  const accepted = input.decision === "SHORTLISTED";
  const heading = accepted ? "You’ve been shortlisted" : "An update on your application";
  const subject = accepted ? "You’ve been shortlisted for the next step" : "An update about your application";
  const message = accepted
    ? `Thank you for applying for ${jobTitle} at ${companyName}. We’re pleased to let you know that you’ve been shortlisted. Our hiring team will contact you with information about the next step.`
    : `Thank you for taking the time to apply for ${jobTitle} at ${companyName}. After reviewing your application, we’ve decided not to move forward with it for this role. We appreciate your interest and wish you the best in your search.`;
  const safeName = escapeHtml(candidateName);
  const safeTitle = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(companyName);
  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);
  const accent = accepted ? "#147d64" : "#536274";

  return {
    subject,
    text: `Hello ${candidateName},\n\n${message}\n\nRegards,\n${companyName} Talent Team\n\nThis is an automated update about your application for ${jobTitle}.`,
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeHeading}</title></head>
<body style="margin:0;padding:32px 12px;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#172b3a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e3e9ed;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:22px 32px;background:#102a3a;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px;">ZELOSIFY <span style="font-size:12px;font-weight:400;color:#b8d4d9;">TALENT</span></td></tr>
    <tr><td style="padding:36px 32px 18px;"><p style="margin:0 0 12px;color:${accent};font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">APPLICATION UPDATE</p><h1 style="margin:0;font-size:27px;line-height:1.25;color:#172b3a;">${safeHeading}</h1></td></tr>
    <tr><td style="padding:0 32px 10px;font-size:16px;line-height:1.65;"><p style="margin:0 0 16px;">Hello ${safeName},</p><p style="margin:0;">${safeMessage}</p></td></tr>
    <tr><td style="padding:20px 32px 30px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f8f9;border-left:4px solid ${accent};border-radius:8px;"><tr><td style="padding:16px 18px;"><div style="font-size:11px;font-weight:700;color:#687b87;letter-spacing:.8px;text-transform:uppercase;">ROLE</div><div style="margin-top:6px;font-size:15px;font-weight:700;color:#172b3a;">${safeTitle}</div><div style="margin-top:4px;font-size:14px;color:#536774;">${safeCompany}</div></td></tr></table></td></tr>
    <tr><td style="padding:20px 32px;border-top:1px solid #e7ecef;color:#647783;font-size:12px;line-height:1.6;">This is an automated application update from ${safeCompany}. Please contact your recruiting contact if you have questions.</td></tr>
  </table>
</body>
</html>`,
  };
}
