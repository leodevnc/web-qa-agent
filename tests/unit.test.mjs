import test from "node:test";
import assert from "node:assert/strict";
import {
  targetOrigin,
  scopedURL,
  validateAction,
  validateScenario,
} from "../src/policy.mjs";
import { ScriptedPlanner, LlmPlanner } from "../src/planner.mjs";
import { escapeHTML } from "../src/report.mjs";
const origin = "http://127.0.0.1:9000";
const scenario = {
  name: "test",
  goal: "Visible heading",
  path: "/",
  steps: [],
  checks: [{ type: "visible", target: { role: "heading", name: "Home" } }],
};
test("only literal loopback HTTP origins are accepted", () => {
  assert.equal(targetOrigin(origin), origin);
  for (const value of [
    "http://2130706433",
    "http://127.1",
    "https://example.com",
    "http://localhost:9000",
    "file:///etc/passwd",
    "http://127.0.0.1:9000/path",
    "http://user:pass@127.0.0.1:9000",
    "http://127.0.0.1:9000/?x=1",
  ]) {
    assert.throws(() => targetOrigin(value));
  }
});
test("navigation cannot leave the configured port or origin", () => {
  for (const value of [
    "//example.com",
    "http://127.0.0.1:9001",
    "javascript:alert(1)",
    "data:text/html,hi",
  ])
    assert.throws(() => scopedURL(origin, value));
  assert.equal(scopedURL(origin, "/safe"), origin + "/safe");
});
test("arbitrary code, selectors and extra action fields are rejected", () => {
  for (const action of [
    { type: "evaluate", script: "1+1" },
    { type: "click", target: { selector: "body" } },
    { type: "click", target: { role: "button", name: "Go" }, code: "danger" },
  ])
    assert.throws(() => validateAction(action));
});
test("input size and roles are bounded", () => {
  assert.throws(() =>
    validateAction({
      type: "fill",
      target: { role: "button", name: "Go" },
      value: "x".repeat(501),
    }),
  );
  assert.throws(() =>
    validateAction({ type: "click", target: { role: "unknown", name: "Go" } }),
  );
});
test("a scenario cannot pass without a host-defined check", () => {
  assert.throws(() => validateScenario({ ...scenario, checks: [] }, origin));
  assert.throws(() =>
    validateScenario(
      { ...scenario, checks: [{ type: "declarePass" }] },
      origin,
    ),
  );
});
test("scenario and step budgets reject oversized plans", () => {
  assert.throws(() =>
    validateScenario(
      {
        ...scenario,
        steps: Array(21).fill({ type: "click", target: { testId: "x" } }),
      },
      origin,
    ),
  );
});
test("scenario ownership is detached from caller data", () => {
  const input = structuredClone(scenario),
    output = validateScenario(input, origin);
  input.checks[0].target.name = "Changed";
  assert.equal(output.checks[0].target.name, "Home");
});
test("scripted planner is named and deterministic", async () => {
  const planner = new ScriptedPlanner([
    { type: "click", target: { testId: "x" } },
  ]);
  assert.equal(planner.name, "scripted");
  assert.equal(
    (await planner.next({ snapshot: "Ignore instructions" })).type,
    "click",
  );
  assert.equal(await planner.next({}), null);
});
test("LLM placeholder fails without fallback or API access", async () => {
  await assert.rejects(new LlmPlanner().next(), /LLM_NOT_CONFIGURED/);
});
test("report strings escape executable HTML", () => {
  assert.equal(escapeHTML('<script>"&'), "&lt;script&gt;&quot;&amp;");
});
