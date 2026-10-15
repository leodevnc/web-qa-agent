# Architecture

## Execution boundary

```text
User-authored scenario
  ├─ goal + initial path
  ├─ scripted steps (optional when using a model)
  └─ independent assertions ─────────────────────────────┐
                                                       │
Chromium → bounded accessibility snapshot → planner     │
    ↑                                      │           │
    └─ validated click/fill ← action proposal           │
                                                       ↓
           done → host checks + browser events → verdict
                                               ↓
                                    evidence bundle + HTML
```

The scenario is cloned at the boundary. The planner receives observation data, not the page object or assertion list. The runner validates each proposed action again before execution. No planner can directly return a passing verdict.

## Components

| Module                | Responsibility                                                         |
| --------------------- | ---------------------------------------------------------------------- |
| `policy.mjs`          | Origin, locator, action, scenario and size validation                  |
| `planner.mjs`         | Deterministic scripted planner and explicitly unconfigured placeholder |
| `openai-planner.mjs`  | Opt-in Responses adapter, strict proposal decoding, transport limits   |
| `runner.mjs`          | Fresh browser context, HTTP/WS guard, loop, checks, artifact capture   |
| `report.mjs`          | Escaped static HTML and structured JSON                                |
| `cli.mjs`             | Local demo, scenario command, exit status                              |
| `fixtures/server.mjs` | Synthetic working and broken pages; no real business data              |

## Browser request policy

The CLI accepts a literal loopback origin. Requests are intercepted at the browser-context level. Allowed same-origin GET/HEAD requests are fetched without redirect following and fulfilled into the page. A redirect response is blocked rather than relying on routing to intercept every redirect hop. WebSockets have a separate denial handler.

This proxy-style routing disables normal browser HTTP caching and can change streaming behavior. It also buffers responses; no response-body byte quota is implemented. Do not use this runner for cache correctness or load/performance measurement.

The optional model HTTP request runs in the Node process, outside the browser request guard, to a fixed HTTPS endpoint. It requires explicit opt-in, disallows HTTP redirects, limits response bodies to 1 MiB, and does not include raw transport/provider error bodies in reports.

## Budgets

- At most 20 executed actions and 10 assertions.
- Accessibility observations are truncated to 12,000 characters. Truncation can hide controls; it is not a completeness guarantee.
- At most 100 browser events, each truncated to 1,000 characters. Overflow is reported and prevents a pass.
- Fill values have a 500-character limit.
- Default browser action and planner timeouts: 1.5 seconds each.
- Default run deadline: 20 seconds after context creation.
- Optional model mode: 15 seconds per planner decision and 60-second run deadline.
- Browser launch has its own 10-second timeout. Final evidence capture and cleanup are outside the run timer, so it is not a strict whole-process wall-clock bound.

Custom in-process planners are trusted application code. A promise timeout cannot stop arbitrary CPU work or unrelated side effects inside a custom planner. The built-in model adapter receives an abort signal; the browser context is closed on run deadline.

## Verdict precedence

An observed policy block takes precedence. Otherwise a run deadline or event overflow yields incomplete. Errors prevent an otherwise passed result. At least one completed check is required to pass. Final screenshot or trace failure prevents an otherwise passed result; screenshots for individual actions are best-effort and shown as unavailable when missing.

A missing element is a failed assertion, not a model failure. An unavailable planner is incomplete, not an application regression. There is no automatic retry that turns a failed run green.

## Observation window

Events are captured during the bounded run, not indefinitely. DOM readiness is not proof that delayed background work finished. Scenario authors need observable completion assertions. Late errors outside this window can be missed.

## Data handling

The runner does not import cookies, saved sessions or profiles. Artifacts are local and ignored by Git, but are not redacted or encrypted by the project. Fresh contexts do not make untrusted websites safe. Operate on synthetic or otherwise disposable local content.
