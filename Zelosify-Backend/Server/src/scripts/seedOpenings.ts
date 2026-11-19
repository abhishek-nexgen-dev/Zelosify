import prisma from "../config/prisma/prisma.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../utils/RBAC/permissions.js";
import { ENV } from "../config/env.js";

export async function seedOpenings() {
  const tenantId = (ENV.DEFAULT_TENANT_ID).trim();
  const companyName = (ENV.DEFAULT_TENANT_NAME || "Bruce Wayne Corp").trim();

  console.log(`🌱 Seeding tenant "${companyName}" (${tenantId}) and openings...`);

  const tenant = await prisma.tenants.upsert({
    where: { tenantId },
    update: { companyName },
    create: {
      tenantId,
      companyName,
    },
  });

  console.log(`✅ Tenant verified: ${tenant.companyName} (${tenant.tenantId})`);


  const hiringManager = await prisma.user.upsert({
    where: { externalId: "hm-bruce-wayne-01" },
    update: { tenantId: tenant.tenantId, permissions: [...DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER] },
    create: {
      id: "hm-user-uuid-001",
      externalId: "hm-bruce-wayne-01",
      username: "lucius_fox",
      email: "lucius.fox@brucewaynecorp.com",
      firstName: "Lucius",
      lastName: "Fox",
      role: "HIRING_MANAGER",
      permissions: [...DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER],
      department: "Applied Sciences & Tech",
      tenantId: tenant.tenantId,
    },
  });

  console.log(`✅ Hiring Manager verified: ${hiringManager.firstName} ${hiringManager.lastName}`);

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: { tenantId: tenant.tenantId, role: "ADMIN", permissions: [...DEFAULT_ROLE_PERMISSIONS.ADMIN] },
    create: {
      id: "admin-user-uuid-001",
      externalId: "admin-user-uuid-001",
      username: "admin",
      email: "admin@zelosify.com",
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      permissions: [...DEFAULT_ROLE_PERMISSIONS.ADMIN],
      department: "Executive & IT",
      tenantId: tenant.tenantId,
      creator: "system",
    },
  });

  console.log(`✅ Default Admin verified: ${adminUser.username} (${adminUser.email})`);


  const openingsData: Array<{
    id: string;
    title: string;
    description: string;
    location: string;
    contractType: string;
    hiringManagerId: string;
    experienceMin: number;
    experienceMax: number | null;
    status: "OPEN" | "ON_HOLD";
    postedDate: Date;
    requiredSkills: string[];
    expectedCompletionDate?: Date | null;
    actionDate?: Date | null;
  }> = [
    {
      id: "op-bwc-001",
      title: "Senior Full Stack Engineer (React / Node.js)",
      description: "Build robust cloud applications for defense and enterprise data tracking. Experience with React, Node.js, TypeScript, PostgreSQL, and AWS is required. You will shape features from design through production, review implementation choices with the team, and improve performance, reliability, and accessibility. We value clear communication, thoughtful testing, and practical experience supporting software after release.",
      location: "New York, NY",
      contractType: "C2C",
      hiringManagerId: hiringManager.id,
      experienceMin: 5,
      experienceMax: 9,
      status: "OPEN" as const,
      postedDate: new Date("2026-10-15T09:00:00Z"),
      requiredSkills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "REST APIs", "Automated Testing"],
    },
    {
      id: "op-bwc-002",
      title: "Frontend Architect (Next.js & Design Systems)",
      description: "Lead UI engineering for high-security executive dashboards. Deep knowledge of Next.js, React 19, Tailwind CSS, TypeScript, and web accessibility. You will establish reusable patterns, guide frontend architecture, and work with designers and backend engineers to deliver responsive, dependable experiences. You should be comfortable mentoring teammates and improving quality through reviews, testing, and performance measurement.",
      location: "Remote",
      contractType: "W2 Contract",
      hiringManagerId: hiringManager.id,
      experienceMin: 7,
      experienceMax: 12,
      status: "OPEN" as const,
      postedDate: new Date("2026-10-18T10:00:00Z"),
      requiredSkills: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Accessibility", "Design Systems", "Web Performance"],
    },
    {
      id: "op-bwc-003",
      title: "Backend Cloud Specialist (Go / Distributed Systems)",
      description: "Architect high-throughput real-time telemetry pipelines. Proficient in Golang, gRPC, Kafka, Docker, Kubernetes, and microservices. This role owns service design, observability, and reliable data delivery across distributed systems. You will partner with product and infrastructure teams, document operational decisions, and investigate production issues while steadily improving throughput and fault tolerance.",
      location: "San Francisco, CA",
      contractType: "C2C",
      hiringManagerId: hiringManager.id,
      experienceMin: 4,
      experienceMax: 8,
      status: "OPEN" as const,
      postedDate: new Date("2026-10-20T11:00:00Z"),
      requiredSkills: ["Go", "gRPC", "Kafka", "Docker", "Kubernetes", "Microservices", "Observability"],
    },
    {
      id: "op-bwc-004",
      title: "DevOps & Platform Reliability Engineer",
      description: "Manage zero-trust multi-cloud infrastructure, CI/CD automation, Kubernetes clusters, and Terraform deployments across AWS and GCP. You will strengthen deployment safety, automate routine operations, and make service health visible through useful metrics and alerts. The team needs an engineer who can troubleshoot incidents, document recovery procedures, and work closely with security and application teams.",
      location: "Remote",
      contractType: "Contract-to-Hire",
      hiringManagerId: hiringManager.id,
      experienceMin: 5,
      experienceMax: null,
      status: "OPEN" as const,
      postedDate: new Date("2026-10-22T08:30:00Z"),
      requiredSkills: ["AWS", "GCP", "Kubernetes", "Terraform", "CI/CD", "Linux", "Incident Response"],
    },
    {
      id: "op-bwc-005",
      title: "Python AI / ML Integration Developer",
      description: "Integrate LLM agents, automated document extractors, and tool-calling models. Skills: Python, FastAPI, PyTorch, LangChain, vector DBs. You will build bounded, observable services that turn model capabilities into dependable product workflows. Work includes validating outputs, protecting sensitive data, evaluating quality, and collaborating with engineers to ship maintainable integrations with clear failure handling.",
      location: "Boston, MA",
      contractType: "C2C",
      hiringManagerId: hiringManager.id,
      experienceMin: 3,
      experienceMax: 7,
      status: "OPEN" as const,
      postedDate: new Date("2026-10-25T14:00:00Z"),
      requiredSkills: ["Python", "FastAPI", "PyTorch", "LangChain", "LLM Integration", "Vector Databases", "Zod or Schema Validation"],
    },
    {
      id: "op-bwc-006",
      title: "Junior QA Automation Engineer",
      description: "Develop automated regression and integration suites with Playwright, Cypress, Jest, and CI workflows for rapid deployment validation. You will turn product requirements into reliable test coverage, identify flaky checks, and help teams reproduce and resolve defects. Strong debugging skills, clear test documentation, and an interest in improving developer feedback cycles are important for this role.",
      location: "Austin, TX",
      contractType: "W2 Contract",
      hiringManagerId: hiringManager.id,
      experienceMin: 1,
      experienceMax: 3,
      status: "OPEN" as const,
      postedDate: new Date("2026-10-28T09:15:00Z"),
      requiredSkills: ["QA Automation", "Playwright", "Cypress", "Jest", "CI Workflows", "Test Design", "Debugging"],
    },
    {
      id: "op-bwc-007",
      title: "Data Platform Engineer (Snowflake / DBT)",
      description: "Build scalable ETL/ELT pipelines, dimensional data modeling, and automated data quality monitors using Snowflake, DBT, and Python. You will partner with analysts and application teams to make trusted data available for reporting and operations. The work includes documenting sources, improving pipeline reliability, monitoring costs, and resolving data quality issues with clear ownership and repeatable processes.",
      location: "Chicago, IL",
      contractType: "C2C",
      hiringManagerId: hiringManager.id,
      experienceMin: 4,
      experienceMax: 8,
      status: "OPEN" as const,
      postedDate: new Date("2026-10-30T13:00:00Z"),
      requiredSkills: ["Snowflake", "dbt", "Python", "ETL/ELT", "Dimensional Modeling", "Data Quality", "SQL"],
    },
    {
      id: "op-bwc-008",
      title: "Cybersecurity Analyst & Threat Specialist",
      description: "Audit application boundaries, evaluate RBAC configurations, perform vulnerability scans, and implement SOC2 security controls. You will translate findings into practical remediation plans, work with product teams to reduce risk, and help maintain clear security evidence. Candidates should communicate technical issues clearly, prioritize vulnerabilities by impact, and support incident response and continuous control improvements.",
      location: "Washington, DC",
      contractType: "Direct Contract",
      hiringManagerId: hiringManager.id,
      experienceMin: 6,
      experienceMax: 10,
      status: "OPEN" as const,
      postedDate: new Date("2026-11-01T10:45:00Z"),
      requiredSkills: ["Application Security", "RBAC", "Vulnerability Assessment", "SOC 2", "Threat Modeling", "Incident Response", "Security Auditing"],
    },
    {
      id: "op-bwc-009",
      title: "Mobile App Engineer (React Native)",
      description: "Develop cross-platform field surveillance and logistics mobile apps for iOS and Android with offline-first synchronization. You will build accessible interfaces, reliable local data handling, and safe synchronization for users working with intermittent connectivity. The role works closely with product, design, and backend teams and includes automated testing, performance tuning, and support for released applications.",
      location: "Remote",
      contractType: "C2C",
      hiringManagerId: hiringManager.id,
      experienceMin: 3,
      experienceMax: 6,
      status: "OPEN" as const,
      postedDate: new Date("2026-11-03T11:20:00Z"),
      requiredSkills: ["React Native", "TypeScript", "iOS", "Android", "Offline-First Design", "Mobile Testing", "API Integration"],
    },
    {
      id: "op-bwc-010",
      title: "Lead Database Administrator (PostgreSQL & CockroachDB)",
      description: "Lead Bruce Wayne Corp's PostgreSQL and CockroachDB platforms, keeping customer-facing services reliable as transaction volume grows. Design schemas, indexes, and safe migrations; tune query plans and connection pooling; and build tested backup, recovery, replication, and failover procedures. You will improve observability, capacity planning, access controls, and operational runbooks with application, security, and infrastructure teams. Candidates need at least eight years of production database experience, strong SQL and Linux skills, and experience with distributed SQL, cloud monitoring, and incident response. Hybrid in New York with a shared on-call rotation; initial six-month W2 contract.",
      location: "New York, NY",
      contractType: "W2 Contract",
      hiringManagerId: hiringManager.id,
      experienceMin: 8,
      experienceMax: null,
      status: "OPEN" as const,
      postedDate: new Date("2026-11-05T15:30:00Z"),
      requiredSkills: ["PostgreSQL", "CockroachDB", "SQL", "Database Administration", "Query Optimization", "Replication", "Disaster Recovery", "Connection Pooling", "Linux", "Terraform", "Cloud Infrastructure", "Incident Response"],
      expectedCompletionDate: new Date("2027-05-31T17:00:00Z"),
      actionDate: new Date("2026-12-15T17:00:00Z"),
    },
    {
      id: "op-bwc-011",
      title: "Solutions Architect (Microservices & Event-Driven)",
      description: "Design fault-tolerant architectures across multi-region services. Deep experience with Kafka, RabbitMQ, Redis, and REST/GraphQL APIs. You will define integration patterns, document tradeoffs, and help teams build systems that recover predictably from partial failures. This role includes technical reviews, capacity and reliability planning, and collaboration with engineering leaders to evolve platform standards.",
      location: "Seattle, WA",
      contractType: "C2C",
      hiringManagerId: hiringManager.id,
      experienceMin: 10,
      experienceMax: 15,
      status: "OPEN" as const,
      postedDate: new Date("2026-11-07T08:00:00Z"),
      requiredSkills: ["Microservices", "Kafka", "RabbitMQ", "Redis", "REST APIs", "GraphQL", "Fault-Tolerant Design"],
    },
    {
      id: "op-bwc-012",
      title: "UI/UX Product Designer (Design Systems & Prototyping)",
      description: "Create user flows, component libraries, and interactive high-fidelity prototypes for B2B procurement and contract workflows. You will research user needs, make complex tasks easier to understand, and partner with product and engineering to deliver consistent interfaces. The role includes documenting design decisions, testing prototypes with users, and maintaining accessible, reusable design system patterns.",
      location: "Remote",
      contractType: "Part-time Contract",
      hiringManagerId: hiringManager.id,
      experienceMin: 4,
      experienceMax: 7,
      status: "OPEN" as const,
      postedDate: new Date("2026-11-09T12:00:00Z"),
      requiredSkills: ["User Research", "Figma", "Prototyping", "Design Systems", "Accessibility", "Interaction Design", "Usability Testing"],
    },
    {
      id: "op-bwc-013",
      title: "API Integration Engineer (Node.js & OpenAPI)",
      description: "Build, document, and test third-party vendor connectors, OAuth2 flows, and webhook endpoints with strict schema validation. You will design secure integrations, handle retries and provider errors, and create clear operational guidance for support teams. Strong Node.js skills, careful API contract work, and experience writing maintainable automated tests are important to deliver reliable connections.",
      location: "London, UK",
      contractType: "C2C",
      hiringManagerId: hiringManager.id,
      experienceMin: 3,
      experienceMax: 6,
      status: "OPEN" as const,
      postedDate: new Date("2026-11-11T16:00:00Z"),
      requiredSkills: ["Node.js", "OpenAPI", "OAuth 2.0", "Webhooks", "API Security", "Schema Validation", "Automated Testing"],
    },
    {
      id: "op-bwc-014",
      title: "Embedded Systems Engineer (C++ & Hardware Interfaces)",
      description: "Develop device drivers, sensor telemetry modules, and low-latency firmware protocols for specialised aerospace equipment. You will work with hardware and software teams to validate interfaces, diagnose timing and reliability issues, and document test results. This role requires careful implementation, repeatable verification, and a strong focus on safety and dependable behavior in constrained environments.",
      location: "Detroit, MI",
      contractType: "W2 Contract",
      hiringManagerId: hiringManager.id,
      experienceMin: 5,
      experienceMax: 9,
      status: "ON_HOLD" as const,
      postedDate: new Date("2026-11-12T14:15:00Z"),
      requiredSkills: ["C++", "Embedded Linux", "Device Drivers", "Sensor Interfaces", "Firmware Testing", "Real-Time Systems", "Hardware Debugging"],
    },
  ];

  for (const op of openingsData) {
    await prisma.opening.upsert({
      where: { id: op.id },
      update: {
        title: op.title,
        description: op.description,
        location: op.location,
        contractType: op.contractType,
        experienceMin: op.experienceMin,
        experienceMax: op.experienceMax,
        status: op.status,
        requiredSkills: op.requiredSkills,
        expectedCompletionDate: op.expectedCompletionDate ?? null,
        actionDate: op.actionDate ?? null,
      },
      create: {
        id: op.id,
        tenantId: tenant.tenantId,
        title: op.title,
        description: op.description,
        location: op.location,
        contractType: op.contractType,
        hiringManagerId: op.hiringManagerId,
        experienceMin: op.experienceMin,
        experienceMax: op.experienceMax,
        postedDate: op.postedDate,
        status: op.status,
        requiredSkills: op.requiredSkills,
        expectedCompletionDate: op.expectedCompletionDate ?? null,
        actionDate: op.actionDate ?? null,
      },
    });
  }

  console.log(`✅ Successfully seeded ${openingsData.length} diverse contract openings for Bruce Wayne Corp!`);
}


if (process.argv[1]?.includes("seedOpenings")) {
  seedOpenings()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      prisma.$disconnect();
    });
}
