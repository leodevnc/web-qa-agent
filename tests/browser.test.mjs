import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { runScenario } from "../src/runner.mjs";
import { startFixture } from "../fixtures/server.mjs";
import { LlmPlanner } from "../src/planner.mjs";
import { OpenAIPlanner } from "../src/openai-planner.mjs";

let fixture, output, trap, trapOrigin;
let hits = 0;
before(async () => {
  trap = http.createServer((req, res) => {
    hits++;
    res.end("not reached");
  });
  await new Promise((resolve) => trap.listen(0, "127.0.0.1", resolve));
  trapOrigin = "http://127.0.0.1:" + trap.address().port;
  fixture = await startFixture({ trapURL: trapOrigin });
  output = await mkdtemp(path.join(os.tmpdir(), "web-qa-tests-"));
});
after(async () => {
  await fixture.close();
  await new Promise((resolve) => {
    trap.close(resolve);
    trap.closeAllConnections();
  });
});
function simple(url = "/healthy") {
  return {
    name: "Fixture",
    goal: "Cart is visible",
    path: url,
    steps: [],
    checks: [{ type: "visible", target: { testId: "cart" } }],
  };
}
async function run(scenario, options = {}) {
  return runScenario({
    target: fixture.origin,
    scenario,
    output,
    actionTimeout: 500,
    ...options,
  });
}
const cart = JSON.parse(
  await readFile(new URL("../scenarios/cart.json", import.meta.url), "utf8"),
);

test("healthy cart passes and produces complete evidence", async () => {
  const { directory, report } = await run(cart);
  assert.equal(report.status, "passed", JSON.stringify(report.findings));
  assert.equal(report.checks.length, 2);
  for (const file of [
    "report.html",
    "report.json",
    "events.json",
    "observations.json",
    "final.png",
    "step-1.png",
    "step-2.png",
    "trace.zip",
  ])
    assert.ok((await stat(path.join(directory, file))).size > 0, file);
  const html = await readFile(path.join(directory, "report.html"), "utf8");
  assert.match(html, /Scripted actions; no model called/);
  assert.equal(
    JSON.parse(await readFile(path.join(directory, "observations.json")))
      .length,
    4,
  );
});
test("cart regression fails with actual and expected evidence", async () => {
  const { report } = await run({ ...cart, path: "/broken-cart" });
  assert.equal(report.status, "failed");
  assert.equal(report.checks[0].actual, "Cart: 1 items");
  assert.equal(report.checks[0].contract.expected, "Cart: 2 items");
});
test("mobile overflow is detected", async () => {
  const { report } = await run(
    { ...simple("/broken-layout"), checks: [{ type: "layout" }] },
    { viewport: { width: 390, height: 844 } },
  );
  assert.equal(report.status, "failed");
  assert.ok(report.checks[0].actual.scrollWidth > 390);
});
test("console error prevents a false pass", async () => {
  const { report } = await run(simple("/broken-console"));
  assert.equal(report.status, "failed");
  assert.ok(report.findings.some((f) => f.kind === "console"));
});
test("invalid check locator is rejected before browser execution", async () => {
  await assert.rejects(
    run({
      ...simple("/broken-api"),
      checks: [
        {
          type: "text",
          target: { role: "status", name: "" },
          expected: "Ready",
        },
      ],
    }),
    /Invalid text field/,
  );
});
test("HTTP error recorded against a visible cart", async () => {
  const { report } = await run(simple("/broken-api"));
  assert.equal(report.status, "failed");
  assert.ok(report.findings.some((f) => f.kind === "http"));
});
test("cross-origin fetch never reaches the local trap server", async () => {
  const before = hits;
  const { report } = await run(simple("/escape"));
  assert.equal(report.status, "blocked");
  assert.equal(hits, before);
});
test("redirect is blocked before following its location", async () => {
  const before = hits;
  const { report } = await run(simple("/redirect"));
  assert.equal(report.status, "blocked");
  assert.equal(hits, before);
});
test("POST never reaches the application handler", async () => {
  const before = fixture.requests.filter((r) => r.method === "POST").length;
  const { report } = await run(simple("/write"));
  assert.equal(report.status, "blocked");
  assert.equal(
    fixture.requests.filter((r) => r.method === "POST").length,
    before,
  );
});
test("WebSocket is blocked", async () => {
  const before = hits;
  const { report } = await run(simple("/socket"));
  assert.equal(report.status, "blocked");
  assert.equal(hits, before);
});
test("popup is blocked and its external request is denied", async () => {
  const before = hits;
  const { report } = await run({
    ...simple("/popup"),
    steps: [{ type: "click", target: { role: "button", name: "Add to cart" } }],
  });
  assert.equal(report.status, "blocked");
  assert.equal(hits, before);
});
test("untrusted page text cannot change scripted actions or oracle", async () => {
  const { report } = await run({ ...cart, path: "/injection" });
  assert.equal(report.status, "passed");
  assert.deepEqual(
    report.steps.map((s) => s.action),
    cart.steps,
  );
  assert.equal(report.checks[0].actual, "Cart: 2 items");
});
test("invalid planner output is blocked instead of evaluated", async () => {
  const { report } = await run(simple(), {
    planner: {
      name: "test",
      next: async () => ({ type: "evaluate", script: "process.exit()" }),
    },
  });
  assert.equal(report.status, "blocked");
});
test("repeating planner exhausts budget without claiming pass", async () => {
  const { report } = await run(simple(), {
    maxActions: 2,
    planner: {
      name: "test",
      next: async () => ({
        type: "click",
        target: { role: "button", name: "Add to cart" },
      }),
    },
  });
  assert.equal(report.status, "incomplete");
  assert.equal(report.steps.length, 2);
});
test("never-returning planner times out and closes the browser", async () => {
  const { report } = await run(simple(), {
    planner: { name: "test", next: () => new Promise(() => {}) },
  });
  assert.equal(report.status, "incomplete");
  assert.ok(report.elapsedMs < 10000);
});
test("placeholder produces incomplete evidence and no silent scripted run", async () => {
  const { report } = await run(simple(), { planner: new LlmPlanner() });
  assert.equal(report.status, "incomplete");
  assert.match(report.findings[0].message, /LLM_NOT_CONFIGURED/);
  assert.equal(report.steps.length, 0);
});
test("fresh contexts do not inherit cart state", async () => {
  await run(cart);
  const { report } = await run({
    ...simple(),
    checks: [
      { type: "text", target: { testId: "cart" }, expected: "Cart: 0 items" },
    ],
  });
  assert.equal(report.status, "passed");
});

test("missing expected element is a failed check, not a pass", async () => {
  const { report } = await run({
    ...simple(),
    checks: [
      { type: "text", target: { testId: "absent" }, expected: "Required" },
    ],
  });
  assert.equal(report.status, "failed");
  assert.equal(report.checks[0].passed, false);
});
test("run deadline closes the context and returns incomplete", async () => {
  const { report } = await run(simple(), {
    deadlineMs: 100,
    planner: { name: "test", next: () => new Promise(() => {}) },
  });
  assert.equal(report.status, "incomplete");
  assert.ok(report.findings.some((f) => f.kind === "deadline"));
});
test("event truncation is visible and never passes", async () => {
  const { report } = await run(simple("/many-errors"));
  assert.equal(report.status, "incomplete");
  assert.ok(report.droppedEvents > 0);
});
test("report renders untrusted titles as text and fits mobile width", async () => {
  const title = '<img src=x onerror="window.injected=true">';
  const { directory } = await run({ ...simple(), name: title });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.goto(pathToFileURL(path.join(directory, "report.html")).href);
    assert.equal(await page.locator("h1").innerText(), title);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
  } finally {
    await browser.close();
  }
});

function mockPlanner(proposals) {
  return new OpenAIPlanner({
    apiKey: "test-key-not-real",
    model: "test-model",
    goal: cart.goal,
    allowNetwork: true,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(proposals.shift()),
                },
              ],
            },
          ],
        }),
      ),
  });
}
test("mocked model proposals drive the real browser through independent checks", async () => {
  const planner = mockPlanner([
    {
      type: "fill",
      role: "spinbutton",
      name: "Quantity",
      testId: null,
      value: "2",
    },
    {
      type: "click",
      role: "button",
      name: "Add to cart",
      testId: null,
      value: null,
    },
    { type: "done", role: null, name: null, testId: null, value: null },
  ]);
  const { report } = await run({ ...cart, steps: [] }, { planner });
  assert.equal(report.status, "passed");
  assert.equal(report.steps.length, 2);
  assert.equal(report.checks[0].actual, "Cart: 2 items");
});
test("model done is not a passing verdict", async () => {
  const planner = mockPlanner([
    { type: "done", role: null, name: null, testId: null, value: null },
  ]);
  const { report } = await run({ ...cart, steps: [] }, { planner });
  assert.equal(report.status, "failed");
  assert.equal(report.checks[0].actual, "Cart: 0 items");
});
