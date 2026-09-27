// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CircleAlert,
  CircleCheck,
  ChevronDown,
  CircleDot,
  FileSearch,
  FlaskConical,
  Gavel,
  Scale,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

export const checkDetails = {
  contextAwareness: { label: "Context awareness", icon: FileSearch },
  overconfidence: { label: "Overconfidence", icon: TriangleAlert },
  unsupportedClaims: { label: "Unsupported claims", icon: CircleAlert },
  jurisdictionAwareness: { label: "Jurisdiction awareness", icon: Gavel },
  consistency: { label: "Internal consistency", icon: Scale },
  uncertaintyHandling: { label: "Uncertainty handling", icon: CircleDot },
  highStakesAwareness: { label: "High-stakes awareness", icon: ShieldCheck },
};

export function StatusBadge({ status }) {
  const Icon = status === "PASS" ? CircleCheck : status === "FAIL" ? CircleAlert : TriangleAlert;
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <Icon aria-hidden="true" /> {status}
    </span>
  );
}

export function FindingCard({ name, check, index }) {
  const [open, setOpen] = useState(index < 4 || check.status === "FAIL");
  const detail = checkDetails[name];
  const Icon = detail.icon;
  return (
    <article className={`finding-card finding-${check.status.toLowerCase()}`}>
      <Button
        type="button"
        variant="ghost"
        className="finding-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="finding-title-group">
          <span className="finding-icon">
            <Icon aria-hidden="true" />
          </span>
          <span>
            <span className="finding-kicker">Check {String(index + 1).padStart(2, "0")}</span>
            <strong>{detail.label}</strong>
          </span>
        </span>
        <span className="finding-actions">
          <StatusBadge status={check.status} />
          <ChevronDown className={open ? "rotate" : ""} aria-hidden="true" />
        </span>
      </Button>
      {open && (
        <div className="finding-content">
          <p className="finding-statement">{check.finding}</p>
          <dl>
            <div>
              <dt>Evidence</dt>
              <dd>{check.evidence}</dd>
            </div>
            <div>
              <dt>Safeguard</dt>
              <dd>{check.recommendation}</dd>
            </div>
          </dl>
        </div>
      )}
    </article>
  );
}

// Full results panel: findings + red-team tests + (when present) the AI's
// key findings, recommended safeguards, safer response, and limitations.
// Used both right after a fresh run and when reopening a saved analysis.
export function AnalysisResultView({ result, actions }) {
  return (
    <>
      <div className="results-toolbar">
        <div className="legend">
          <span>
            <i className="dot pass"></i>Pass
          </span>
          <span>
            <i className="dot review"></i>Review
          </span>
          <span>
            <i className="dot fail"></i>Fail
          </span>
        </div>
        {actions}
      </div>
      <div className="findings-list">
        {Object.entries(result.checks).map(([name, check], index) => (
          <FindingCard key={name} name={name} check={check} index={index} />
        ))}
      </div>

      {(result.keyFindings?.length > 0 || result.recommendedSafeguards?.length > 0) && (
        <div className="key-findings-section">
          {result.keyFindings?.length > 0 && (
            <div className="key-findings-block">
              <h3>Key findings</h3>
              <ul>
                {result.keyFindings.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result.recommendedSafeguards?.length > 0 && (
            <div className="key-findings-block">
              <h3>Recommended safeguards</h3>
              <ul>
                {result.recommendedSafeguards.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result.saferResponse && (
        <div className="safer-response-section">
          <span className="safer-response-label">
            <ShieldCheck aria-hidden="true" /> Safer Response
          </span>
          <p>{result.saferResponse}</p>
          <p className="safer-response-caveat">
            This is a rewritten, safety-oriented draft — not a determination of legal correctness.
          </p>
        </div>
      )}

      <div className="red-team-section">
        <div className="red-team-heading">
          <span className="red-team-mark">
            <FlaskConical />
          </span>
          <div>
            <p className="section-number">03 / ADVERSARIAL TESTING</p>
            <h2>Recommended Red-Team Tests</h2>
            <p>
              Questions to test whether the original AI stays responsible when circumstances change.
            </p>
          </div>
        </div>
        <div className="test-grid">
          {result.redTeamTests.map((test, index) => (
            <article className="test-card" key={test.question}>
              <span className="test-number">TEST {String(index + 1).padStart(2, "0")}</span>
              <h3>{test.question}</h3>
              <div>
                <span>Why it matters</span>
                <p>{test.reason}</p>
              </div>
              <div>
                <span>Expected safe behavior</span>
                <p>{test.expectedBehavior}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="test-disclaimer">
          <CircleAlert /> These are recommended tests, not test results. VeriLex has not queried the
          original AI with them.
        </p>
      </div>

      {result.limitations && (
        <p className="limitations-note">
          <strong>Limitations:</strong> {result.limitations}
        </p>
      )}
    </>
  );
}
