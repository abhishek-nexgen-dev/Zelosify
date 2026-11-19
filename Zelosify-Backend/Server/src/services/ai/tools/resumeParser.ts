import { ExtractedFeatures, validateExtractedFeatures } from "../schemas.js";
import { normalizeSkill } from "./matchingEngine.js";
import { Worker } from "node:worker_threads";
import { inflateRawSync } from "node:zlib";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { Document } from "@langchain/core/documents";

const execFileAsync = promisify(execFile);
export const MAX_RESUME_PAGES = 2;
export const MAX_RESUME_TEXT_CHARACTERS = 12_000;

export interface ResumeInspection {
  pageCount: number | null;
  characterCount: number;
}

interface ExtractedResumeDocument extends ResumeInspection {
  text: string;
}




export function sanitizeResumeText(rawText: string): string {
  if (!rawText) return "";


  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
    /system\s*:\s*/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /you\s+are\s+now\s+a/gi,
    /override\s+(all\s+)?rules/gi,
    /score\s*[:=]\s*1\.?0*/gi,
    /recommend\s+this\s+candidate/gi,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  ];

  let sanitized = rawText;
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[FILTERED_INSTRUCTION]");
  }


  if (sanitized.length > 20000) {
    sanitized = sanitized.substring(0, 20000);
  }

  return sanitized;
}

/** Reduce duplicate layout noise and bound provider input while preserving the document's start and end. */
export function optimizeResumeText(rawText: string): string {
  const lines = sanitizeResumeText(rawText)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const uniqueLines = lines.filter((line) => {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  const compact = uniqueLines.join("\n");
  const limit = MAX_RESUME_TEXT_CHARACTERS;
  if (compact.length <= limit) return compact;

  const headLength = Math.floor(limit * 0.8);
  const tailLength = limit - headLength - 32;
  return `${compact.slice(0, headLength)}\n[RESUME CONTENT TRIMMED]\n${compact.slice(-tailLength)}`;
}




export function extractFeaturesFromText(rawText: string): ExtractedFeatures {
  const sanitized = sanitizeResumeText(rawText);
  const textLower = sanitized.toLowerCase();


  let experienceYears = 0;

  const expMatch =
    sanitized.match(/(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+experience)?/i) ||
    sanitized.match(/(?:experience\s*[:\-]?\s*)(\d{1,2})\+?\s*(?:years?|yrs?)/i);

  if (expMatch && expMatch[1]) {
    experienceYears = parseInt(expMatch[1], 10);
  } else {

    const yearMatches = [...sanitized.matchAll(/(20\d{2})\s*[-–—to]\s*(20\d{2}|present)/gi)];
    if (yearMatches.length > 0) {
      let totalYears = 0;
      const currentYear = new Date().getFullYear();
      for (const m of yearMatches) {
        const start = parseInt(m[1], 10);
        const end = m[2].toLowerCase() === "present" ? currentYear : parseInt(m[2], 10);
        if (end >= start && end <= currentYear + 1) {
          totalYears += end - start;
        }
      }
      experienceYears = Math.min(totalYears, 35);
    }
  }


  const knownSkillCatalog = [
    "javascript",
    "typescript",
    "python",
    "java",
    "c++",
    "c#",
    "go",
    "golang",
    "rust",
    "ruby",
    "php",
    "html",
    "css",
    "react",
    "react.js",
    "angular",
    "vue",
    "next.js",
    "node.js",
    "express",
    "nest.js",
    "fastapi",
    "django",
    "spring",
    "spring boot",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "prisma",
    "graphql",
    "rest",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "ci/cd",
    "git",
    "linux",
    "tailwind",
    "terraform",
    "microservices",
    "sql",
    "nosql",
    "agile",
    "scrum",
    "tdd",
    "jest",
    "vitest",
    "cypress",
  ];

  const foundSkillsSet = new Set<string>();
  for (const skill of knownSkillCatalog) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:\\b|[^a-zA-Z0-9])${escaped}(?:\\b|[^a-zA-Z0-9])`, "i");
    if (regex.test(textLower)) {
      foundSkillsSet.add(skill);
    }
  }

  const skills = Array.from(foundSkillsSet);
  const normalizedSkills = skills.map(normalizeSkill);


  let location = "Unknown";
  const commonCities = [
    "new york",
    "san francisco",
    "london",
    "austin",
    "seattle",
    "toronto",
    "berlin",
    "bangalore",
    "mumbai",
    "singapore",
    "chicago",
    "boston",
    "los angeles",
    "delhi",
    "remote",
  ];

  for (const city of commonCities) {
    if (textLower.includes(city)) {
      location = city
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      break;
    }
  }


  const education: string[] = [];
  if (textLower.includes("bachelor") || textLower.includes("b.tech") || textLower.includes("b.s.") || textLower.includes("bsc")) {
    education.push("Bachelor's Degree");
  }
  if (textLower.includes("master") || textLower.includes("m.tech") || textLower.includes("m.s.") || textLower.includes("msc")) {
    education.push("Master's Degree");
  }
  if (textLower.includes("ph.d") || textLower.includes("phd") || textLower.includes("doctorate")) {
    education.push("Doctorate");
  }


  const keywords = skills.slice(0, 10);

  const features: ExtractedFeatures = {
    experienceYears,
    skills,
    normalizedSkills,
    location,
    education,
    keywords,
  };

  const valid = validateExtractedFeatures(features);
  if (!valid) {
    throw new Error(
      `Extracted features validation failed: ${JSON.stringify(validateExtractedFeatures.errors)}`
    );
  }

  return features;
}




export async function extractRawTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  return (await extractResumeDocument(buffer, filename)).text;
}

export async function inspectResumeBuffer(buffer: Buffer, filename: string): Promise<ResumeInspection> {
  const { pageCount, text } = await extractResumeDocument(buffer, filename);
  return { pageCount, characterCount: text.length };
}

async function extractResumeDocument(buffer: Buffer, filename: string): Promise<ExtractedResumeDocument> {
  const extension = filename.toLowerCase().split(".").pop();
  if (buffer.length > 10 * 1024 * 1024) throw new Error("Resume exceeds 10 MB");
  if (extension === "pptx") {
    const text = extractPptxText(buffer);
    return { text, pageCount: null, characterCount: text.length };
  }
  if (extension === "docx") {
    const text = extractDocxText(buffer);
    return { text, pageCount: getDocxPageCount(buffer), characterCount: text.length };
  }
  if (extension === "doc") {
    const { text, pageCount } = await extractDocTextWithPageCount(buffer);
    return { text, pageCount, characterCount: text.length };
  }
  if (extension !== "pdf") throw new Error("Resume must be a PDF, DOC, or DOCX file");

  if (buffer.length > 10 * 1024 * 1024 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Invalid or oversized PDF resume");
  }
  // Untrusted PDF parsing runs outside the web event loop with a memory cap and hard timeout.
  return new Promise<ExtractedResumeDocument>((resolve, reject) => {
    let settled = false;
    const worker = new Worker(`
      const { parentPort, workerData } = require("node:worker_threads");
      const pdf = require("pdf-extraction");
      const ab = workerData.buffer.slice(workerData.byteOffset, workerData.byteOffset + workerData.byteLength);
      Promise.resolve(pdf(ab)).then((result) => {
        const text = typeof result.text === "string" ? result.text.slice(0, ${MAX_RESUME_TEXT_CHARACTERS + 1}) : "";
        parentPort.postMessage({ text, pageCount: Number(result.numpages) || null });
      }).catch(() => process.exit(1));
    `, { eval: true, workerData: buffer, resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 } });
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        void worker.terminate();
        reject(new Error("PDF parsing timed out"));
      }
    }, 5000);
    worker.once("message", (result: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (typeof result === "object" && result !== null && "text" in result && typeof result.text === "string" && result.text.trim().length >= 20) {
        const pageCount = "pageCount" in result && typeof result.pageCount === "number" ? result.pageCount : null;
        resolve({ text: result.text, pageCount, characterCount: result.text.length });
      } else reject(new Error("PDF has insufficient readable text"));
    });
    worker.once("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error("PDF parsing failed"));
    });
    worker.once("exit", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error("PDF parsing failed"));
    });
  });
}

/**
 * LangChain document adapter for resume bytes. Parsing remains bounded by the
 * existing PDF worker, archive limits, and DOC subprocess timeout before text
 * is handed to the LLM pipeline.
 */
export class ResumeBufferDocumentLoader extends BaseDocumentLoader {
  constructor(private readonly buffer: Buffer, private readonly filename: string) {
    super();
  }

  async load(): Promise<Document[]> {
    const extracted = await extractResumeDocument(this.buffer, this.filename);
    if (extracted.characterCount > MAX_RESUME_TEXT_CHARACTERS) throw new Error("Resume contains over 12,000 characters");
    if (extracted.pageCount !== null && extracted.pageCount > MAX_RESUME_PAGES) throw new Error("Resume has more than 2 pages");
    const pageContent = sanitizeResumeText(extracted.text);
    if (pageContent.trim().length < 20) throw new Error("Resume has insufficient readable text");
    return [new Document({
      pageContent,
      metadata: {
        source: "resume-upload",
        filename: this.filename.replace(/[\\/\0-\x1f]/g, "_").slice(0, 255),
        fileType: this.filename.toLowerCase().split(".").pop() || "unknown",
      },
    })];
  }
}

function extractPptxText(buffer: Buffer): string {
  const signature = 0x06054b50;
  const searchStart = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("Resume is not a valid PowerPoint presentation.");

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  if (buffer.length > 10 * 1024 * 1024 || entryCount > 1024) throw new Error("PowerPoint archive exceeds supported limits");
  let cursor = buffer.readUInt32LE(endOffset + 16);
  const texts: string[] = [];
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("PowerPoint archive directory is invalid.");
    }
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    if (cursor + 46 + nameLength + extraLength + commentLength > buffer.length) throw new Error("Invalid archive directory bounds");
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;

    if (!/^ppt\/slides\/slide\d+\.xml$/i.test(name)) continue;
    if (uncompressedSize > 2 * 1024 * 1024 || totalUncompressed + uncompressedSize > 10 * 1024 * 1024) {
      throw new Error("PowerPoint resume expands beyond the supported size.");
    }
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("PowerPoint slide entry is invalid.");
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > buffer.length || compressedSize > 10 * 1024 * 1024) throw new Error("Invalid slide bounds");
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const xml = method === 0
      ? compressed
      : method === 8
        ? inflateRawSync(compressed, { maxOutputLength: 2 * 1024 * 1024 })
        : null;
    if (!xml || xml.length !== uncompressedSize) throw new Error("PowerPoint slide compression is unsupported or invalid.");
    totalUncompressed += xml.length;
    const xmlText = xml.toString("utf8");
    for (const match of xmlText.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi)) {
      texts.push(match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"));
    }
    if (texts.reduce((total, value) => total + value.length, 0) > 20000) throw new Error("PowerPoint text exceeds supported length");
  }

  const text = texts.join(" ").replace(/\s+/g, " ").trim();
  if (text.length < 20) throw new Error("No readable text was found in the PowerPoint resume.");
  return text;
}




export async function parsePdfResume(buffer: Buffer): Promise<ExtractedFeatures> {
  const text = await extractRawTextFromBuffer(buffer, "resume.pdf");
  return extractFeaturesFromText(text);
}




export async function parseWordResume(buffer: Buffer, filename = "resume.docx"): Promise<ExtractedFeatures> {
  const text = await extractRawTextFromBuffer(buffer, filename);
  return extractFeaturesFromText(text);
}

function extractDocxText(buffer: Buffer): string {
  const xml = extractZipEntry(buffer, "word/document.xml");
  if (!xml) throw new Error("DOCX document content is missing or invalid.");
  const text = xml.toString("utf8").replace(/<w:tab\b[^>]*\/>/gi, " ").replace(/<w:br\b[^>]*\/>/gi, "\n")
    .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi, "$1")
    .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code))).replace(/\s+/g, " ").trim();
  if (text.length < 20) throw new Error("DOCX has insufficient readable text");
  return text.slice(0, MAX_RESUME_TEXT_CHARACTERS + 1);
}

function getDocxPageCount(buffer: Buffer): number | null {
  const appProperties = extractZipEntry(buffer, "docProps/app.xml")?.toString("utf8") ?? "";
  const savedPageCount = Number(appProperties.match(/<Pages>(\d+)<\/Pages>/i)?.[1]);
  const documentXml = extractZipEntry(buffer, "word/document.xml")?.toString("utf8") ?? "";
  const explicitBreaks = [...documentXml.matchAll(/<w:lastRenderedPageBreak\b[^>]*\/?\s*>|<w:br\b[^>]*w:type=["']page["'][^>]*\/?\s*>/gi)].length;
  const breakPageCount = explicitBreaks > 0 ? explicitBreaks + 1 : null;
  if (Number.isSafeInteger(savedPageCount) && savedPageCount > 0) {
    return Math.max(savedPageCount, breakPageCount ?? 1);
  }
  return breakPageCount;
}

async function extractDocTextWithPageCount(buffer: Buffer): Promise<{ text: string; pageCount: number | null }> {
  if (buffer.length < 8 || buffer[0] !== 0xd0 || buffer[1] !== 0xcf || buffer[2] !== 0x11 || buffer[3] !== 0xe0) {
    throw new Error("Invalid legacy DOC file");
  }
  const directory = await mkdtemp(join(tmpdir(), "zelosify-resume-"));
  const filePath = join(directory, "resume.doc");
  try {
    await writeFile(filePath, buffer, { mode: 0o600, flag: "wx" });
    const { stdout } = await execFileAsync("catdoc", ["-w", filePath], {
      timeout: 5000, maxBuffer: 128 * 1024, windowsHide: true,
    });
    const pageBreaks = [...stdout.matchAll(/\f/g)].length;
    const pageCount = pageBreaks > 0 ? pageBreaks + 1 : null;
    const text = stdout.replace(/\f/g, " ").slice(0, MAX_RESUME_TEXT_CHARACTERS + 1).replace(/\s+/g, " ").trim();
    if (text.length < 20) throw new Error("DOC has insufficient readable text");
    return { text, pageCount };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error("Legacy DOC parsing is unavailable on this server (catdoc is required)");
    }
    throw new Error("DOC parsing failed or timed out");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function extractZipEntry(buffer: Buffer, expectedName: string): Buffer | null {
  const searchStart = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (offset >= 0 && buffer.readUInt32LE(offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error("Invalid DOCX archive");
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  if (entryCount > 1024) throw new Error("DOCX archive contains too many entries");
  let cursor = buffer.readUInt32LE(endOffset + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid DOCX archive directory");
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    if (cursor + 46 + nameLength + extraLength + commentLength > buffer.length) throw new Error("Invalid DOCX directory bounds");
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    cursor += 46 + nameLength + extraLength + commentLength;
    if (name !== expectedName) continue;
    if (uncompressedSize > 4 * 1024 * 1024 || compressedSize > buffer.length || localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("DOCX document content exceeds supported limits");
    }
    const dataOffset = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    if (dataOffset + compressedSize > buffer.length) throw new Error("Invalid DOCX document bounds");
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const result = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed, { maxOutputLength: 4 * 1024 * 1024 }) : null;
    if (!result || result.length !== uncompressedSize) throw new Error("Unsupported DOCX compression");
    return result;
  }
  return null;
}
