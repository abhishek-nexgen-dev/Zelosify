import "dotenv/config";
import axios from "axios";
import { performance } from "node:perf_hooks";
import { runRecommendationAgent } from "../services/ai/agentOrchestrator.js";

// Explicit opt-in: calls the configured Groq account with synthetic data only.
if (!process.argv.includes("--live")) throw new Error("Pass --live to run the provider benchmark");
const countArg = process.argv.find((argument) => argument.startsWith("--count="));
const count = Number(countArg?.split("=")[1] || 100);
if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error("count must be 1..100");
const { default: pdf } = await import("node:fs/promises");
const fixture = new URL("../../tests/fixtures/synthetic-resume.pdf", import.meta.url);
const buffer = await pdf.readFile(fixture);
const latencies: number[] = [];
let failures = 0;
for (let index = 0; index < count; index += 1) {
  const started = performance.now();
  try {
    await runRecommendationAgent(buffer, "synthetic-resume.pdf", { experienceMin: 2, experienceMax: 5, requiredSkills: ["javascript", "react"], location: "Remote" });
    latencies.push(performance.now() - started);
  } catch (error) {
    failures += 1;
    console.log(JSON.stringify({ event: "BENCHMARK_PROFILE_FAILED", index, httpStatus: axios.isAxiosError(error) ? error.response?.status ?? null : null, errorCode: axios.isAxiosError(error) ? error.code ?? "PROVIDER_ERROR" : "AGENT_VALIDATION_FAILED" }));
    // Do not repeatedly call an unavailable or misconfigured provider.
    if (index === 0) break;
  }
}
latencies.sort((a, b) => a - b);
const p95 = latencies.length ? latencies[Math.ceil(latencies.length * 0.95) - 1] : null;
console.log(JSON.stringify({ event: "LIVE_BENCHMARK_RESULT", requested: count, completed: latencies.length, failures, p95Ms: p95, maxMs: latencies.at(-1) ?? null, slaVerified: latencies.length === count && failures === 0 && p95 !== null && p95 < 2000 && latencies.every((latency) => latency <= 1500), includes: "PDF parsing and live LLM; excludes storage and database" }));
