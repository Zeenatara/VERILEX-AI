import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeLegalAnswer, summarizeChecks, CHECK_KEYS } from "@/lib/verilex";
import type { CheckResult, Checks, RedTeamTest } from "@/lib/verilex";
import type { Json } from "@/integrations/supabase/types";

const MAX_QUESTION_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 8000;
const MAX_JURISDICTION_LENGTH = 100;

type CheckStatus = "PASS" | "REVIEW" | "FAIL";

interface AnalysisResult {
  checks: Checks;
  redTeamTests: RedTeamTest[];
  keyFindings: string[];
  recommendedSafeguards: string[];
  saferResponse: string;
  limitations: string;
  summary: string;
  issueCount: number;
}

interface AnalyzeInput {
  question: string;
  answer: string;
  jurisdiction?: string;
}

function validateInput(data: unknown): AnalyzeInput {
  if (!data || typeof data !== "object") {
    throw new Error("Missing request body.");
  }
  const { question, answer, jurisdiction } = data as Record<string, unknown>;

  if (typeof question !== "string" || !question.trim()) {
    throw new Error("A legal question is required.");
  }
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("An AI-generated answer is required.");
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new Error(`Question must be under ${MAX_QUESTION_LENGTH} characters.`);
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    throw new Error(`Answer must be under ${MAX_ANSWER_LENGTH} characters.`);
  }
  if (jurisdiction !== undefined && typeof jurisdiction !== "string") {
    throw new Error("Jurisdiction must be text.");
  }
  if (typeof jurisdiction === "string" && jurisdiction.length > MAX_JURISDICTION_LENGTH) {
    throw new Error(`Jurisdiction must be under ${MAX_JURISDICTION_LENGTH} characters.`);
  }

  return {
    question: question.trim(),
    answer: answer.trim(),
    jurisdiction:
      typeof jurisdiction === "string" && jurisdiction.trim()
        ? jurisdiction.trim()
        : "Not specified",
  };
}

function isCheckStatus(value: unknown): value is CheckStatus {
  return value === "PASS" || value === "REVIEW" || value === "FAIL";
}

function isValidCheck(value: unknown): value is CheckResult {
  if (!value || typeof value !== "object") return false;
  const check = value as Record<string, unknown>;
  return (
    isCheckStatus(check["status"]) &&
    typeof check["finding"] === "string" &&
    typeof check["evidence"] === "string" &&
    typeof check["recommendation"] === "string"
  );
}

// Validates the raw Gemini JSON against the expected shape. Returns null on
// any malformation so the caller can fall back to the deterministic result
// instead of trusting a partially-formed AI response.
function parseGeminiResult(raw: string): {
  checks: Partial<Checks>;
  redTeamTests: RedTeamTest[];
  keyFindings: string[];
  recommendedSafeguards: string[];
  saferResponse: string;
  limitations: string;
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (!obj["checks"] || typeof obj["checks"] !== "object") return null;

  const rawChecks = obj["checks"] as Record<string, unknown>;
  const checks: Partial<Checks> = {};
  for (const key of CHECK_KEYS) {
    const candidate = rawChecks[key];
    if (isValidCheck(candidate)) {
      checks[key] = candidate;
    }
  }
  if (Object.keys(checks).length === 0) return null;

  const redTeamTests = Array.isArray(obj["redTeamTests"])
    ? obj["redTeamTests"].filter(
        (t): t is RedTeamTest =>
          !!t &&
          typeof t === "object" &&
          typeof (t as Record<string, unknown>)["question"] === "string" &&
          typeof (t as Record<string, unknown>)["reason"] === "string" &&
          typeof (t as Record<string, unknown>)["expectedBehavior"] === "string",
      )
    : [];

  const keyFindings = Array.isArray(obj["keyFindings"])
    ? obj["keyFindings"].filter((x): x is string => typeof x === "string")
    : [];
  const recommendedSafeguards = Array.isArray(obj["recommendedSafeguards"])
    ? obj["recommendedSafeguards"].filter((x): x is string => typeof x === "string")
    : [];
  const saferResponse =
    typeof obj["saferResponse"] === "string" ? (obj["saferResponse"] as string) : "";
  const limitations = typeof obj["limitations"] === "string" ? (obj["limitations"] as string) : "";

  return { checks, redTeamTests, keyFindings, recommendedSafeguards, saferResponse, limitations };
}

// Calls Gemini server-side. Returns null (never throws to the caller) on any
// failure — missing key, network error, timeout, or malformed JSON — so the
// deterministic rule engine can always serve as a safe fallback.
async function runGeminiAnalysis(question: string, answer: string, jurisdiction: string) {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    console.error(
      "[analyze] GEMINI_API_KEY is not configured; falling back to rule-only analysis.",
    );
    return null;
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const { SYSTEM_INSTRUCTION, RESPONSE_SCHEMA, buildUserPrompt } =
      await import("./gemini-prompt");

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env["GEMINI_MODEL"] || "gemini-3.8-flash";

    // Google's models occasionally return 503 (overloaded) or 429 (rate limit).
    // Those are temporary, so retry a couple of times before giving up and
    // letting the deterministic rule engine serve the result.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: buildUserPrompt(question, answer, jurisdiction),
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.2,
            abortSignal: controller.signal,
          },
        });
        const text = response.text;
        if (!text || !text.trim()) {
          console.error("[analyze] Gemini returned an empty response.");
          return null;
        }
        const parsed = parseGeminiResult(text);
        if (!parsed) {
          console.error("[analyze] Gemini returned malformed JSON; discarding.");
        }
        return parsed;
      } catch (error) {
        const status = (error as { status?: number } | null)?.status;
        const retryable = status === 503 || status === 429 || status === 500;
        if (retryable && attempt < maxAttempts) {
          console.warn(
            `[analyze] Gemini temporarily unavailable (status ${status}); retry ${attempt}/${maxAttempts - 1}.`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    return null;
  } catch (error) {
    console.error("[analyze] Gemini call failed:", error);
    return null;
  }
}

// Merges the deterministic rule engine's checks with Gemini's. Gemini's
// richer finding/evidence/recommendation text wins per check, but a
// deterministic FAIL can never be silently overridden to PASS by the model —
// it is downgraded to REVIEW at worst, and the deterministic evidence is
// preserved in that case.
function mergeChecks(ruleChecks: Checks, aiChecks: Partial<Checks> | undefined): Checks {
  const merged = {} as Checks;
  for (const key of CHECK_KEYS) {
    const rule = ruleChecks[key];
    const ai = aiChecks?.[key];
    if (!ai) {
      merged[key] = rule;
      continue;
    }
    if (rule.status === "FAIL" && ai.status === "PASS") {
      merged[key] = {
        status: "REVIEW",
        finding: ai.finding,
        evidence: `${ai.evidence} (Deterministic check also flagged: ${rule.finding})`,
        recommendation: ai.recommendation,
      };
      continue;
    }
    merged[key] = ai;
  }
  return merged;
}

export const analyzeLegalAnswerServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => validateInput(data))
  .handler(
    async ({ data, context }): Promise<AnalysisResult & { id: string; createdAt: string }> => {
      const { question, answer, jurisdiction } = data;
      const jurisdictionValue = jurisdiction ?? "Not specified";

      // 1. Deterministic rule-based pass — always runs, never depends on the AI.
      const ruleResult = analyzeLegalAnswer({ question, answer, jurisdiction: jurisdictionValue });

      // 2. Gemini red-team pass — best-effort; never trusted blindly (see mergeChecks).
      const aiResult = await runGeminiAnalysis(question, answer, jurisdictionValue);

      const checks = mergeChecks(ruleResult.checks as Checks, aiResult?.checks);
      const { summary, issueCount } = summarizeChecks(checks);

      const redTeamTests =
        aiResult && aiResult.redTeamTests.length > 0
          ? aiResult.redTeamTests.slice(0, 4)
          : (ruleResult.redTeamTests as RedTeamTest[]);

      const keyFindings =
        aiResult && aiResult.keyFindings.length > 0
          ? aiResult.keyFindings
          : Object.entries(checks)
              .filter(([, check]) => check.status !== "PASS")
              .map(([, check]) => check.finding);

      const recommendedSafeguards =
        aiResult && aiResult.recommendedSafeguards.length > 0
          ? aiResult.recommendedSafeguards
          : Object.values(checks)
              .filter((check) => check.status !== "PASS")
              .map((check) => check.recommendation);

      const saferResponse =
        aiResult && aiResult.saferResponse.trim()
          ? aiResult.saferResponse
          : "This may depend on your jurisdiction and the specific facts of your situation. Review the relevant agreement or statute, and verify the position with an authoritative source or a qualified legal professional before relying on it.";

      const limitations = aiResult
        ? aiResult.limitations ||
          "This analysis is based only on the supplied question, answer, and jurisdiction. It does not verify legal correctness."
        : "The AI red-team pass was unavailable for this analysis, so these findings reflect deterministic pattern checks only. They may miss nuanced risks and can produce false positives.";

      const result: AnalysisResult = {
        checks,
        redTeamTests,
        keyFindings,
        recommendedSafeguards,
        saferResponse,
        limitations,
        summary,
        issueCount,
      };

      // 3. Persist. context.supabase is scoped to the caller's JWT (from
      // requireSupabaseAuth), so RLS enforces user_id = auth.uid() independently
      // of the value we set here — the client can never write another user's row.
      const { data: inserted, error } = await context.supabase
        .from("analyses")
        .insert({
          user_id: context.userId,
          question,
          answer,
          jurisdiction: jurisdictionValue,
          summary,
          result: result as unknown as Json,
        })
        .select("id, created_at")
        .single();

      if (error || !inserted) {
        console.error("[analyze] Failed to save analysis:", error);
        throw new Error(
          "Analysis completed, but saving it to your history failed. Please try again.",
        );
      }

      return { ...result, id: inserted.id as string, createdAt: inserted.created_at as string };
    },
  );
