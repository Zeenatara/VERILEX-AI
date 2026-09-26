# VeriLex — Hackathon Notes

## The problem
People increasingly rely on AI-generated legal information. Risk is not limited to hallucination: an answer can ignore jurisdiction, hide uncertainty, contradict itself, or sound dangerously certain.

## The solution
VeriLex audits the behavior of an AI-generated legal answer. Seven transparent checks expose potential weaknesses, quote relevant evidence, recommend safeguards, and generate adversarial questions for further testing.

## What makes it different
VeriLex is not another legal chatbot. It does not answer the legal question; it asks whether the AI was responsible when answering it.

## Target users
Students, legal-tech teams, AI evaluators, responsible-AI researchers, and anyone reviewing an AI-generated legal response.

## Technical approach
A deterministic JavaScript rule engine checks absolute language, missing jurisdiction, short or definitive answers, uncertainty signals, obvious contradictions, legal-claim signals, and high-stakes topics. The interface turns each signal into an inspectable PASS, REVIEW, or FAIL finding.

## 90-second demo
1. Select “Overconfident.”
2. Run the analysis.
3. Show the failed context, certainty, and jurisdiction checks.
4. Expand a finding to show quoted evidence and a safeguard.
5. Scroll to Recommended Red-Team Tests.
6. Explain: “VeriLex doesn't answer the legal question. It checks whether the AI was responsible when answering it.”
7. Repeat with “Responsible” to show that cautious language changes the result.

## Responsible AI
No fake accuracy score, invented law, fake citations, or claim of legal correctness. Red-team questions are explicitly labeled as recommendations, not fabricated test outcomes.

## Limitations and future scope
The demonstrator uses pattern-based checks and needs broader evaluation. Future work: verified legal-source checking, jurisdiction-specific benchmarks, multi-model comparison, regression datasets, and human review workflows.
