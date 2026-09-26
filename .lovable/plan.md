# VeriLex — Demo-ready hackathon build

## Goal
Build a polished single-screen legal-AI safety evaluator that clearly demonstrates VeriLex’s differentiator: it audits how responsibly an AI answered, rather than answering the legal question itself.

## Experience
- Create a strong VeriLex identity with an editorial legal-tech look, restrained motion, and responsive desktop/mobile layout.
- Place the core workflow first: legal question, AI answer, optional jurisdiction, three one-click demo cases, and a prominent analysis action.
- Show clear input validation, analysis progress, understandable failure messages, and an honest responsible-use disclaimer.
- Present results as transparent PASS / REVIEW / FAIL checks—never a fake score—with quoted evidence and practical safeguards.
- Feature “Recommended Red-Team Tests” as the memorable hackathon moment, clearly labeled as proposed tests rather than fabricated results.

## Analysis engine
- Add deterministic checks for empty/oversized input, absolute language, missing jurisdiction, short answers, obvious contradictions, uncertainty language, and high-stakes topics.
- Add a server-side Lovable AI analysis using `openai/gpt-6-astra` for nuanced context, unsupported claims, consistency, uncertainty, and red-team test generation.
- Require a strict structured response, merge it conservatively with deterministic findings, and never invent laws, cases, citations, or legal correctness claims.
- Handle malformed responses, unavailable AI, rate limits, and credit/configuration errors safely without exposing private details.

## Deliverables
- Functional single-page VeriLex app at `/` with no login, payments, database records, or chat history.
- Server analysis endpoint/function with validated input and private AI credentials.
- Three built-in demos: overconfident, responsible, and contradictory.
- Updated project documentation plus concise hackathon/demo notes.
- Unique page metadata and a refined global design system.

## Validation
- Verify input errors, all three demos, missing and selected jurisdictions, long-input rejection, loading/results states, and API error behavior.
- Inspect actual desktop and mobile rendering, browser console, network activity, and the latest build status.
- Run a live AI request and inspect its returned analysis before completion.

## Technical details
- Keep the existing TanStack Start architecture and Tailwind v4 setup.
- Use a TanStack server route for `POST /api/analyze` and Zod validation.
- Use a hybrid rule engine plus streamed Lovable AI Gateway Responses call; consume the stream server-side for this structured one-shot analysis.
- Keep all model prompts and `LOVABLE_API_KEY` server-only.
