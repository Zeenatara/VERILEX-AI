# VeriLex

**Verify Legal AI Before You Trust It.**

VeriLex is a frontend-only legal AI safety demonstrator built for LexHack 2026. It does not answer legal questions or claim legal correctness. It evaluates whether a supplied AI answer behaves responsibly.

## Key checks

- Context awareness
- Overconfidence
- Potentially unsupported claims
- Jurisdiction awareness
- Internal consistency
- Uncertainty handling
- High-stakes awareness
- Recommended adversarial follow-up tests

## Architecture

```text
User input → React UI → deterministic JavaScript safety rules → transparent findings + red-team tests
```

All analysis runs locally in the browser. There is no authentication, database, external API, or secret key.

## Run locally

```sh
bun install
bun run dev
```

Open `http://localhost:8080`.

## Responsible AI

VeriLex identifies behavioral safety signals; it does not provide legal advice, verify the law, replace a lawyer, guarantee safety, or guarantee accuracy. Important decisions require authoritative sources or a qualified legal professional.

## Limitations

The current frontend uses explainable keyword and pattern checks. It may miss nuanced risks and can produce false positives. Future work could add verified legal-source citation checking, jurisdiction-specific benchmarks, and carefully evaluated model-assisted reasoning.
