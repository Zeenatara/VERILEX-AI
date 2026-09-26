import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Copy,
  FileSearch,
  FlaskConical,
  Gavel,
  LoaderCircle,
  RotateCcw,
  Scale,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeLegalAnswer, demoExamples } from "@/lib/verilex";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VeriLex — Verify Legal AI Before You Trust It" },
      { name: "description", content: "A transparent safety audit for AI-generated legal answers, built for LexHack 2026." },
      { property: "og:title", content: "VeriLex — Legal AI Safety Auditor" },
      { property: "og:description", content: "Red-team AI-generated legal answers for unsafe certainty, missing context, contradictions, and jurisdiction gaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VeriLexApp,
});

const checkDetails = {
  contextAwareness: { label: "Context awareness", icon: FileSearch },
  overconfidence: { label: "Overconfidence", icon: TriangleAlert },
  unsupportedClaims: { label: "Unsupported claims", icon: CircleAlert },
  jurisdictionAwareness: { label: "Jurisdiction awareness", icon: Gavel },
  consistency: { label: "Internal consistency", icon: Scale },
  uncertaintyHandling: { label: "Uncertainty handling", icon: CircleDot },
  highStakesAwareness: { label: "High-stakes awareness", icon: ShieldCheck },
};

function StatusBadge({ status }) {
  const Icon = status === "PASS" ? CircleCheck : status === "FAIL" ? CircleAlert : TriangleAlert;
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <Icon aria-hidden="true" /> {status}
    </span>
  );
}

function FindingCard({ name, check, index }) {
  const [open, setOpen] = useState(index < 4 || check.status === "FAIL");
  const detail = checkDetails[name];
  const Icon = detail.icon;
  return (
    <article className={`finding-card finding-${check.status.toLowerCase()}`}>
      <Button type="button" variant="ghost" className="finding-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="finding-title-group">
          <span className="finding-icon"><Icon aria-hidden="true" /></span>
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
            <div><dt>Evidence</dt><dd>{check.evidence}</dd></div>
            <div><dt>Safeguard</dt><dd>{check.recommendation}</dd></div>
          </dl>
        </div>
      )}
    </article>
  );
}

function VeriLexApp() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Not specified");
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef(null);

  const loadExample = (example) => {
    setQuestion(example.question);
    setAnswer(example.answer);
    setJurisdiction(example.jurisdiction);
    setErrors({});
    setResult(null);
  };

  const reset = () => {
    setQuestion("");
    setAnswer("");
    setJurisdiction("Not specified");
    setErrors({});
    setResult(null);
  };

  const runAnalysis = () => {
    const nextErrors = {};
    if (!question.trim()) nextErrors.question = "Please enter a legal question.";
    if (!answer.trim()) nextErrors.answer = "Please paste an AI-generated answer.";
    if (question.length > 2000) nextErrors.question = "Keep the question under 2,000 characters.";
    if (answer.length > 8000) nextErrors.answer = "Keep the answer under 8,000 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setAnalyzing(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(analyzeLegalAnswer({ question, answer, jurisdiction }));
      setAnalyzing(false);
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }, 850);
  };

  const copyReport = async () => {
    if (!result) return;
    const report = Object.entries(result.checks).map(([key, check]) => `${checkDetails[key].label}: ${check.status}\n${check.finding}`).join("\n\n");
    await navigator.clipboard.writeText(`VeriLex Analysis\n${result.issueCount} potential safety issues detected\n\n${report}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="VeriLex home"><span className="brand-mark"><Scale /></span><span>VERI<span>LEX</span></span></a>
        <div className="event-mark"><span></span> Built for LexHack 2026</div>
      </header>

      <section className="intro" id="top">
        <div className="intro-copy">
          <p className="eyebrow">Legal AI safety, made inspectable</p>
          <h1>Verify legal AI<br />before you <em>trust it.</em></h1>
          <p className="intro-lede">VeriLex red-teams AI-generated legal answers for context gaps, unsafe certainty, unsupported claims, contradictions, and overlooked risk.</p>
          <div className="boundary-note"><ShieldCheck /><span><strong>Behavior, not legal correctness.</strong> VeriLex audits how responsibly an AI answered—it does not answer the legal question.</span></div>
        </div>
        <aside className="method-strip" aria-label="Analysis method">
          <span>How it works</span>
          <ol><li><b>01</b> Paste an AI answer</li><li><b>02</b> Run seven safety checks</li><li><b>03</b> Generate red-team tests</li></ol>
        </aside>
      </section>

      <section className="workspace" aria-label="VeriLex analysis workspace">
        <div className="workspace-heading">
          <div><p className="section-number">01 / INPUT</p><h2>Test an AI-generated legal answer</h2></div>
          {(question || answer) && <Button type="button" variant="ghost" className="reset-button" onClick={reset}><RotateCcw /> Clear</Button>}
        </div>

        <div className="demo-row">
          <span>Try a demo</span>
          {demoExamples.map((example, index) => (
            <Button key={example.id} type="button" variant="outline" className="demo-button" onClick={() => loadExample(example)}>
              <span className="demo-index">0{index + 1}</span><span><strong>{example.label}</strong><small>{example.detail}</small></span><ArrowRight />
            </Button>
          ))}
        </div>

        <div className="form-grid">
          <div className="field-block">
            <label htmlFor="legal-question"><span>Legal question</span><small>{question.length} / 2,000</small></label>
            <Textarea id="legal-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Enter the legal question that was asked…" className={errors.question ? "field-error" : ""} maxLength={2050} />
            {errors.question && <p className="error-message"><CircleAlert />{errors.question}</p>}
          </div>
          <div className="field-block jurisdiction-field">
            <label htmlFor="jurisdiction"><span>Jurisdiction</span><small>Optional</small></label>
            <select id="jurisdiction" value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)}>
              <option>Not specified</option><option>India</option><option>United States</option><option>United Kingdom</option><option>European Union</option><option>Other</option>
            </select>
          </div>
          <div className="field-block answer-field">
            <label htmlFor="ai-answer"><span>AI-generated answer</span><small>{answer.length} / 8,000</small></label>
            <Textarea id="ai-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Paste the AI-generated legal answer you want to audit…" className={errors.answer ? "field-error" : ""} maxLength={8050} />
            {errors.answer && <p className="error-message"><CircleAlert />{errors.answer}</p>}
          </div>
        </div>
        <div className="submit-row">
          <p><span>7</span> transparent checks · No fake accuracy score</p>
          <Button type="button" size="lg" className="analyze-button" onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <><LoaderCircle className="spin" /> Running safety checks…</> : <><FlaskConical /> Run VeriLex Analysis <ArrowRight /></>}
          </Button>
        </div>
      </section>

      {result && (
        <section className="results" ref={resultsRef} aria-live="polite">
          <div className="results-header">
            <div><p className="section-number">02 / SAFETY FINDINGS</p><h2>VeriLex Analysis</h2><p>{result.summary}</p></div>
            <div className="issue-counter"><strong>{result.issueCount}</strong><span>potential safety<br />{result.issueCount === 1 ? "issue" : "issues"} detected</span></div>
          </div>
          <div className="results-toolbar">
            <div className="legend"><span><i className="dot pass"></i>Pass</span><span><i className="dot review"></i>Review</span><span><i className="dot fail"></i>Fail</span></div>
            <Button type="button" variant="outline" onClick={copyReport}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy report"}</Button>
          </div>
          <div className="findings-list">
            {Object.entries(result.checks).map(([name, check], index) => <FindingCard key={name} name={name} check={check} index={index} />)}
          </div>

          <div className="red-team-section">
            <div className="red-team-heading"><span className="red-team-mark"><FlaskConical /></span><div><p className="section-number">03 / ADVERSARIAL TESTING</p><h2>Recommended Red-Team Tests</h2><p>Questions to test whether the original AI stays responsible when circumstances change.</p></div></div>
            <div className="test-grid">
              {result.redTeamTests.map((test, index) => (
                <article className="test-card" key={test.question}>
                  <span className="test-number">TEST {String(index + 1).padStart(2, "0")}</span>
                  <h3>{test.question}</h3>
                  <div><span>Why it matters</span><p>{test.reason}</p></div>
                  <div><span>Expected safe behavior</span><p>{test.expectedBehavior}</p></div>
                </article>
              ))}
            </div>
            <p className="test-disclaimer"><CircleAlert /> These are recommended tests, not test results. VeriLex has not queried the original AI with them.</p>
          </div>
        </section>
      )}

      <footer>
        <div className="footer-brand"><Scale /><span>VERILEX</span></div>
        <p>VeriLex provides an AI safety analysis of legal-information responses. It does not provide legal advice or determine whether a legal answer is legally correct. Important decisions should be verified with authoritative sources or a qualified legal professional.</p>
        <span>Responsible AI · LexHack 2026</span>
      </footer>
    </main>
  );
}
