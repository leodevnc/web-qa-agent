# Architecture decisions

## 001: Keep planning separate from the test oracle

**Decision:** planners propose click/fill/done; user-authored host assertions and captured errors determine the result.

**Reason:** a planner that misunderstands a task should not also certify its own answer. The mocked-model test demonstrates that an immediate done proposal still fails the expected cart count.

**Tradeoff:** a user must write meaningful checks. Incorrect or weak checks can still permit an incorrect application to pass. This is an execution and evidence system, not automatic requirement discovery.

## 002: Start with loopback and read-oriented traffic

**Decision:** exact loopback origin, GET/HEAD only, no redirects or WebSockets.

**Reason:** exercising a browser can create side effects. An isolated fixture makes the initial behavior reproducible without external systems.

**Tradeoff:** many real apps need POST, authentication, assets from other origins, or WebSockets. They are intentionally unsupported. Future support needs explicit capabilities and disposable environments, not a blanket allow switch. GET itself is not guaranteed side-effect-free.

## 003: Use semantic locators and bounded proposals

**Decision:** exact role/name or test ID, no generated JavaScript or CSS selectors.

**Reason:** these keep actions small enough to inspect and reject. The accessibility snapshot gives the planner an interpretable view of the page.

**Tradeoff:** inaccessible controls, hidden test IDs and ambiguous labels are hard to target. There is no visual grounding or coordinate-click fallback.

## 004: Keep a deterministic baseline and unconfigured live model

**Decision:** ship scripted fixture scenarios, a fail-fast placeholder, and a separately enabled Responses adapter. Test the adapter using fake transport only.

**Reason:** browser behavior, evidence capture and check semantics should be testable without credentials, provider availability or model variance.

**Tradeoff:** these tests say nothing about real-model task success, prompt-injection resistance, cost or latency. Those need a separately authorized evaluation.

## 005: Report uncertainty instead of hiding it

**Decision:** blocked and incomplete are distinct from passed/failed. Preserve steps, screenshots, trace and actual check values.

**Reason:** infrastructure failures, policy restrictions and application regressions need different follow-up actions.

**Tradeoff:** richer artifacts contain more page data. Reports are not safe to publish automatically.

## References

- [Playwright network interception](https://playwright.dev/docs/network)
- [Playwright context WebSocket routing](https://playwright.dev/docs/api/class-browsercontext#browser-context-route-web-socket)
- [Playwright tracing](https://playwright.dev/docs/api/class-tracing)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
