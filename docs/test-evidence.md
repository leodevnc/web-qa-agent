# Test evidence

## Recorded local run

Validated on 2026-10-15 using Linux Node.js 22.23.2, Playwright 1.63.0, and its installed Chromium headless shell.

Command: `npm test` (with this WSL host's existing isolated browser-library path supplied through `LD_LIBRARY_PATH`).

Result: **47 tests passed, 0 failed, 0 skipped**.

| Group               | Count | Evidence covered                                                                                                                                |
| ------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser integration |    23 | Working/broken cart, overflow, console and HTTP errors, blocked requests, timeouts, context isolation, safe report rendering, mock proposals    |
| Adapter contract    |    14 | Opt-in and placeholder rejection, request schema, response validation, refusal, size bounds, sanitized errors, abort propagation, history bound |
| Unit                |    10 | Origin and action policy, scenario checks, budgets, cloning, scripted planner, placeholder, HTML escaping                                       |

The browser tests run real local Chromium against an in-process synthetic HTTP server. External-request tests use a second loopback trap server and check that prohibited requests did not arrive. They do not contact real external targets.

The adapter tests inject a fake fetch implementation. They make **zero real model requests** and do not validate live API compatibility or model quality.

## Demonstration

`npm run demo` produced four matching expected outcomes: one passed run and three failed runs. A demo success means fixture outcomes matched. It does not reinterpret known failures as passed QA checks.

The cart regression report shows expected `Cart: 2 items` and observed `Cart: 1 items`. The mobile report measures overflow at a 390px viewport. The console case records an intentional synthetic error.

Raw run directories are excluded from Git because arbitrary runs can contain sensitive data. The committed `report.png` is a screenshot of the synthetic cart-regression report, not a mockup.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm test
npm run demo
```

Ensure the host has the required Chromium libraries. The current host reuses an existing isolated dependency directory instead of changing system packages; that path is environment-specific and is not embedded in project scripts.

## Not established

- Live model success rate, robustness to prompt injection, token usage or cost.
- Hostile-site containment or comprehensive browser network isolation.
- Accessibility compliance, visual regression fidelity, security or load-testing coverage.
- Windows/macOS execution and hosted CI. No hosted CI result is claimed.
- Correctness outside the configured scenarios and bounded observation window.
