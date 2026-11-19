const STORAGE_KEY_OPENINGS = "zelosify_dummy_openings";
const STORAGE_KEY_PROFILES = "zelosify_dummy_profiles";

export const DEFAULT_OPENINGS = [
  {
    id: "op-1",
    title: "Senior Full Stack Cloud Engineer",
    companyName: "CloudScale Innovations",
    department: "Cloud Engineering",
    location: "Remote, US",
    contractType: "Contract (6 months)",
    status: "OPEN",
    experienceMin: 5,
    experienceMax: 8,
    postedDate: "2026-11-10T09:00:00.000Z",
    createdAt: "2026-11-10T09:00:00.000Z",
    hiringManagerName: "Sarah Jenkins",
    description:
      "Design, implement, and maintain resilient microservices on AWS and Kubernetes. Build frontend applications with React and Next.js while collaborating with cross-functional product teams.",
    requiredSkills: ["React", "Node.js", "TypeScript", "AWS", "Kubernetes", "PostgreSQL"],
    openingsCount: 3,
  },
  {
    id: "op-2",
    title: "Staff Frontend Developer (React / Next.js)",
    companyName: "Nexus Digital Platforms",
    department: "Product Experience",
    location: "San Francisco, CA (Hybrid)",
    contractType: "Contract to Hire",
    status: "OPEN",
    experienceMin: 6,
    experienceMax: 10,
    postedDate: "2026-11-08T14:30:00.000Z",
    createdAt: "2026-11-08T14:30:00.000Z",
    hiringManagerName: "David Kim",
    description:
      "Drive frontend architecture for high-traffic enterprise web applications. Focus on Core Web Vitals, accessibility, design systems, and state management using Redux Toolkit.",
    requiredSkills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Redux", "GraphQL"],
    openingsCount: 2,
  },
  {
    id: "op-3",
    title: "DevOps & Infrastructure Automation Engineer",
    companyName: "Apex FinTech Systems",
    department: "Platform Operations",
    location: "New York, NY",
    contractType: "Contract (12 months)",
    status: "OPEN",
    experienceMin: 4,
    experienceMax: 7,
    postedDate: "2026-11-05T11:15:00.000Z",
    createdAt: "2026-11-05T11:15:00.000Z",
    hiringManagerName: "Elena Rostova",
    description:
      "Architect CI/CD automation pipelines, maintain multi-region infrastructure as code using Terraform, and ensure 99.99% availability of financial transaction services.",
    requiredSkills: ["Terraform", "Docker", "Kubernetes", "AWS", "GitHub Actions", "Prometheus"],
    openingsCount: 1,
  },
  {
    id: "op-4",
    title: "AI / ML Solutions Architect",
    companyName: "Cognitive Vanguard Labs",
    department: "Applied AI",
    location: "Remote",
    contractType: "Contract (3 months)",
    status: "OPEN",
    experienceMin: 7,
    experienceMax: 12,
    postedDate: "2026-11-02T16:45:00.000Z",
    createdAt: "2026-11-02T16:45:00.000Z",
    hiringManagerName: "Marcus Vance",
    description:
      "Evaluate and integrate state-of-the-art LLM architectures, RAG pipelines, and agentic workflows into automated enterprise decision engines.",
    requiredSkills: ["Python", "PyTorch", "LangChain", "Vector DBs", "OpenAI", "AWS Bedrock"],
    openingsCount: 2,
  },
  {
    id: "op-5",
    title: "Senior QA Automation Engineer",
    companyName: "Vertex Logistics Tech",
    department: "Quality Engineering",
    location: "Austin, TX (Hybrid)",
    contractType: "Contract (6 months)",
    status: "OPEN",
    experienceMin: 4,
    experienceMax: 6,
    postedDate: "2026-10-28T08:00:00.000Z",
    createdAt: "2026-10-28T08:00:00.000Z",
    hiringManagerName: "David Kim",
    description:
      "Develop comprehensive automated end-to-end and regression test suites using Playwright and Cypress for supply-chain logistics software.",
    requiredSkills: ["Playwright", "Cypress", "JavaScript", "TypeScript", "CI/CD", "Jest"],
    openingsCount: 1,
  },
  {
    id: "op-6",
    title: "Lead Data Engineer (Spark / Snowflake)",
    companyName: "Pinnacle Data Group",
    department: "Data Engineering",
    location: "Chicago, IL",
    contractType: "Contract (9 months)",
    status: "OPEN",
    experienceMin: 5,
    experienceMax: 9,
    postedDate: "2026-10-20T10:00:00.000Z",
    createdAt: "2026-10-20T10:00:00.000Z",
    hiringManagerName: "Sarah Jenkins",
    description:
      "Construct scalable data lakehouse solutions, orchestrate ETL workflows with Apache Airflow and dbt, and optimize high-throughput analytics queries.",
    requiredSkills: ["Python", "Apache Spark", "Snowflake", "SQL", "dbt", "Airflow"],
    openingsCount: 2,
  },
];

export const DEFAULT_PROFILES = [
  {
    id: "prof-101",
    openingId: "op-1",
    fileName: "Alexander_Wright_FullStack_Resume.pdf",
    candidateName: "Alexander Wright",
    fileSize: 245000,
    fileType: "application/pdf",
    s3Key: "dummy/op-1/Alexander_Wright_FullStack_Resume.pdf",
    submittedAt: "2026-11-11T10:30:00.000Z",
    createdAt: "2026-11-11T10:30:00.000Z",
    status: "SHORTLISTED",
    recommendationStatus: "COMPLETED",
    recommendationScore: 0.92,
    recommendationConfidence: 0.95,
    recommendationLatencyMs: 1240,
    recommendationReason:
      "Exceptional candidate with 7 years of full-stack cloud experience. Deep expertise across React, Node.js, AWS ECS/EKS, and TypeScript. Matches 6 of 6 required skills with verified enterprise leadership.",
    isDeleted: false,
  },
  {
    id: "prof-102",
    openingId: "op-1",
    fileName: "Maya_Patel_CloudEngineer_Resume.pdf",
    candidateName: "Maya Patel",
    fileSize: 189000,
    fileType: "application/pdf",
    s3Key: "dummy/op-1/Maya_Patel_CloudEngineer_Resume.pdf",
    submittedAt: "2026-11-12T14:15:00.000Z",
    createdAt: "2026-11-12T14:15:00.000Z",
    status: "SUBMITTED",
    recommendationStatus: "COMPLETED",
    recommendationScore: 0.81,
    recommendationConfidence: 0.89,
    recommendationLatencyMs: 1410,
    recommendationReason:
      "Strong match with 5 years experience in React, TypeScript, and AWS serverless architecture. Possesses 5 of 6 required skills with minor gap in deep Kubernetes cluster administration.",
    isDeleted: false,
  },
  {
    id: "prof-103",
    openingId: "op-1",
    fileName: "Jordan_Lee_FrontendDev.pdf",
    candidateName: "Jordan Lee",
    fileSize: 210000,
    fileType: "application/pdf",
    s3Key: "dummy/op-1/Jordan_Lee_FrontendDev.pdf",
    submittedAt: "2026-11-13T09:00:00.000Z",
    createdAt: "2026-11-13T09:00:00.000Z",
    status: "REJECTED",
    recommendationStatus: "COMPLETED",
    recommendationScore: 0.48,
    recommendationConfidence: 0.91,
    recommendationLatencyMs: 1150,
    recommendationReason:
      "Solid frontend skillset (React, TypeScript), but lacks backend Node.js and AWS cloud infrastructure required for this senior full stack position. 3 years total experience is below the 5-year minimum.",
    isDeleted: false,
  },
  {
    id: "prof-104",
    openingId: "op-1",
    fileName: "Emily_Chen_DevOps_Specialist.pdf",
    candidateName: "Emily Chen",
    fileSize: 175000,
    fileType: "application/pdf",
    s3Key: "dummy/op-1/Emily_Chen_DevOps_Specialist.pdf",
    submittedAt: "2026-11-14T16:45:00.000Z",
    createdAt: "2026-11-14T16:45:00.000Z",
    status: "SUBMITTED",
    recommendationStatus: "COMPLETED",
    recommendationScore: 0.68,
    recommendationConfidence: 0.85,
    recommendationLatencyMs: 1380,
    recommendationReason:
      "Borderline match. Extensive AWS and Kubernetes cloud background (6 years), but limited recent hands-on frontend React development experience.",
    isDeleted: false,
  },

  {
    id: "prof-201",
    openingId: "op-2",
    fileName: "Ethan_Ross_Staff_Frontend.pdf",
    candidateName: "Ethan Ross",
    fileSize: 230000,
    fileType: "application/pdf",
    s3Key: "dummy/op-2/Ethan_Ross_Staff_Frontend.pdf",
    submittedAt: "2026-11-09T11:00:00.000Z",
    createdAt: "2026-11-09T11:00:00.000Z",
    status: "SHORTLISTED",
    recommendationStatus: "COMPLETED",
    recommendationScore: 0.95,
    recommendationConfidence: 0.97,
    recommendationLatencyMs: 1190,
    recommendationReason:
      "Ideal match for Staff role. 8 years frontend leadership with Next.js 14/15, Tailwind, Redux Toolkit, and GraphQL. Authored enterprise design system used by 50+ engineers.",
    isDeleted: false,
  },
  {
    id: "prof-202",
    openingId: "op-2",
    fileName: "Priya_Nair_Senior_UI.pdf",
    candidateName: "Priya Nair",
    fileSize: 195000,
    fileType: "application/pdf",
    s3Key: "dummy/op-2/Priya_Nair_Senior_UI.pdf",
    submittedAt: "2026-11-10T15:20:00.000Z",
    createdAt: "2026-11-10T15:20:00.000Z",
    status: "SUBMITTED",
    recommendationStatus: "COMPLETED",
    recommendationScore: 0.78,
    recommendationConfidence: 0.88,
    recommendationLatencyMs: 1280,
    recommendationReason:
      "Strong frontend capabilities with 6 years experience in React, TypeScript, and responsive design. Excellent candidate with minor gap in GraphQL schema federation.",
    isDeleted: false,
  },

  {
    id: "prof-301",
    openingId: "op-3",
    fileName: "Liam_O_Connor_DevOps_Lead.pdf",
    candidateName: "Liam O'Connor",
    fileSize: 260000,
    fileType: "application/pdf",
    s3Key: "dummy/op-3/Liam_O_Connor_DevOps_Lead.pdf",
    submittedAt: "2026-11-07T09:40:00.000Z",
    createdAt: "2026-11-07T09:40:00.000Z",
    status: "SHORTLISTED",
    recommendationStatus: "COMPLETED",
    recommendationScore: 0.91,
    recommendationConfidence: 0.93,
    recommendationLatencyMs: 1350,
    recommendationReason:
      "Certified AWS DevOps Engineer with 6 years experience in Terraform, multi-cluster Kubernetes, and GitHub Actions CI/CD pipelines.",
    isDeleted: false,
  },
];

let inMemoryOpenings = null;
let inMemoryProfiles = null;

function getStoredOpenings() {
  if (typeof window === "undefined") return [...DEFAULT_OPENINGS];
  if (inMemoryOpenings) return inMemoryOpenings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPENINGS);
    if (raw) {
      inMemoryOpenings = JSON.parse(raw);
      return inMemoryOpenings;
    }
  } catch (e) {
    console.warn("Could not read openings from storage, using defaults", e);
  }
  inMemoryOpenings = [...DEFAULT_OPENINGS];
  return inMemoryOpenings;
}

function saveStoredOpenings(openings) {
  inMemoryOpenings = openings;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_OPENINGS, JSON.stringify(openings));
    } catch (e) {
      console.warn("Could not persist openings", e);
    }
  }
}

function getStoredProfiles() {
  if (typeof window === "undefined") return [...DEFAULT_PROFILES];
  if (inMemoryProfiles) return inMemoryProfiles;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) {
      inMemoryProfiles = JSON.parse(raw);
      return inMemoryProfiles;
    }
  } catch (e) {
    console.warn("Could not read profiles from storage, using defaults", e);
  }
  inMemoryProfiles = [...DEFAULT_PROFILES];
  return inMemoryProfiles;
}

function saveStoredProfiles(profiles) {
  inMemoryProfiles = profiles;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.warn("Could not persist profiles", e);
    }
  }
}

export function getMockOpenings({ page = 1, limit = 10 } = {}) {
  const all = getStoredOpenings();
  const start = (page - 1) * limit;
  const paginated = all.slice(start, start + limit);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: paginated,
    openings: paginated,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  };
}

export function getMockOpeningById(id) {
  const all = getStoredOpenings();
  const match = all.find((o) => String(o.id) === String(id));
  return match || all[0] || null;
}

export function getMockProfiles(openingId, { page = 1, limit = 50 } = {}) {
  const all = getStoredProfiles().filter((p) => !p.isDeleted);
  const forOpening = openingId ? all.filter((p) => String(p.openingId) === String(openingId)) : all;

  const start = (page - 1) * limit;
  const paginated = forOpening.slice(start, start + limit);
  const total = forOpening.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: paginated,
    profiles: paginated,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  };
}

export function createMockProfiles(openingId, files = []) {
  const all = getStoredProfiles();
  const createdProfiles = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.name || file.fileName || `Candidate_Profile_${Date.now()}_${i + 1}.pdf`;
    const cleanName = name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

    const scores = [0.88, 0.76, 0.93, 0.65, 0.82];
    const score = scores[i % scores.length];
    const confidences = [0.92, 0.87, 0.95, 0.81, 0.9];
    const confidence = confidences[i % confidences.length];

    const newProfile = {
      id: `prof-new-${Date.now()}-${i}`,
      openingId: String(openingId),
      fileName: name,
      candidateName: cleanName,
      fileSize: file.size || file.fileSize || 215000,
      fileType: file.type || file.fileType || "application/pdf",
      s3Key: `dummy/${openingId}/${name}`,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: "SUBMITTED",
      recommendationStatus: "COMPLETED",
      recommendationScore: score,
      recommendationConfidence: confidence,
      recommendationLatencyMs: 1200 + Math.floor(Math.random() * 300),
      recommendationReason: `AI evaluated candidate from uploaded resume '${name}'. Strong alignment with opening requirements and demonstrable relevant technical experience.`,
      isDeleted: false,
    };

    createdProfiles.push(newProfile);
    all.unshift(newProfile);
  }

  saveStoredProfiles(all);
  return {
    success: true,
    message: `${createdProfiles.length} candidate(s) uploaded successfully`,
    count: createdProfiles.length,
    profiles: createdProfiles,
    data: createdProfiles,
  };
}

export function deleteMockProfile(profileId) {
  const all = getStoredProfiles();
  const updated = all.map((p) =>
    String(p.id) === String(profileId) ? { ...p, isDeleted: true } : p
  );
  saveStoredProfiles(updated);
  return { success: true, profileId };
}

export function updateMockProfileStatus(profileId, newStatus) {
  const all = getStoredProfiles();
  let updatedRecord = null;
  const updated = all.map((p) => {
    if (String(p.id) === String(profileId)) {
      updatedRecord = { ...p, status: newStatus };
      return updatedRecord;
    }
    return p;
  });

  saveStoredProfiles(updated);
  return {
    success: true,
    profileId,
    status: newStatus,
    data: updatedRecord,
  };
}

export function getMockPreviewUrl(profileId) {
  const all = getStoredProfiles();
  const profile = all.find((p) => String(p.id) === String(profileId));
  const candidateName = profile?.candidateName || profile?.fileName || "Candidate Resume";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Resume Preview - ${candidateName}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; margin: 0; }
          .container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 48px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
          h1 { margin-top: 0; color: #0f172a; font-size: 28px; }
          .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
          .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
          .section { margin-top: 24px; }
          .section h2 { font-size: 18px; color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; }
          p { line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="badge">Zelosify Mock Document Preview</span>
          <h1>${candidateName}</h1>
          <div class="meta">
            File: ${profile?.fileName || "Resume.pdf"} | Size: ${profile?.fileSize || "215 KB"} | Submitted: ${new Date(profile?.submittedAt || Date.now()).toLocaleDateString()}
          </div>
          <div class="section">
            <h2>Candidate Overview</h2>
            <p>This is a mock interactive preview for ${candidateName}. In production, this view securely renders candidate resumes and attachments from your S3 or private document storage service.</p>
          </div>
          <div class="section">
            <h2>AI Recommendation Summary</h2>
            <p><strong>Status:</strong> ${profile?.status || "SUBMITTED"}</p>
            <p><strong>Match Score:</strong> ${Math.round((profile?.recommendationScore || 0.85) * 100)}%</p>
            <p><strong>Analysis:</strong> ${profile?.recommendationReason || "Strong technical and communicative profile matching opening specifications."}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const previewUrl = URL.createObjectURL(blob);
  return { url: previewUrl, previewUrl };
}
