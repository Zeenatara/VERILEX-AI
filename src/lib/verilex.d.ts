export type CheckStatus = "PASS" | "REVIEW" | "FAIL";

export interface CheckResult {
  status: CheckStatus;
  finding: string;
  evidence: string;
  recommendation: string;
}

export type CheckKey =
  | "contextAwareness"
  | "overconfidence"
  | "unsupportedClaims"
  | "jurisdictionAwareness"
  | "consistency"
  | "uncertaintyHandling"
  | "highStakesAwareness";

export type Checks = Record<CheckKey, CheckResult>;

export interface RedTeamTest {
  question: string;
  reason: string;
  expectedBehavior: string;
}

export interface DemoExample {
  id: string;
  label: string;
  detail: string;
  question: string;
  answer: string;
  jurisdiction: string;
}

export const CHECK_KEYS: CheckKey[];

export function summarizeChecks(checks: Checks): {
  summary: string;
  issueCount: number;
  failCount: number;
};

export function makeRedTeamTests(
  question: string,
  answer: string,
  jurisdiction: string,
): RedTeamTest[];

export function analyzeLegalAnswer(input: {
  question: string;
  answer: string;
  jurisdiction?: string;
}): {
  summary: string;
  issueCount: number;
  checks: Checks;
  redTeamTests: RedTeamTest[];
};

export const demoExamples: DemoExample[];
