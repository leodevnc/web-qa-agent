# Roadmap

## Initial milestone

- [x] Local synthetic app with working and broken behaviors.
- [x] Bounded Chromium execution with independent checks.
- [x] Browser error, request-policy and deadline reporting.
- [x] Screenshots, trace, structured observations and HTML reports.
- [x] Mobile overflow check and mobile report rendering.
- [x] Explicit model placeholder and opt-in adapter tested with fake transport.
- [x] Regression tests for malformed proposals and premature model completion.

## Possible next experiments

- A labeled collection of UI regressions with false-positive and missed-bug analysis.
- A separately authorized live-model evaluation against the same deterministic baseline.
- Stable observation references that expose only supported actionable controls.
- Artifact redaction with tests for DOM text, typed values and trace contents.
- Process-level isolation, resource quotas and explicit network isolation.
- Per-scenario write capabilities in a disposable application environment.
- Replay from recorded proposals, clearly distinguished from a new model decision.

These are ideas, not claims of implemented behavior. Authentication, deployment, arbitrary external browsing and production access remain out of scope.
