import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { runScenario } from "./runner.mjs";
import { LlmPlanner } from "./planner.mjs";
import { OpenAIPlanner } from "./openai-planner.mjs";
import { escapeHTML } from "./report.mjs";
import { startFixture } from "../fixtures/server.mjs";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      target: { type: "string" },
      scenario: { type: "string" },
      out: { type: "string", default: "artifacts" },
      planner: { type: "string", default: "scripted" },
      mobile: { type: "boolean", default: false },
      "allow-model-network": { type: "boolean", default: false },
    },
  });
  const command = positionals[0] || "demo";
  if (positionals.length > 1 || !["demo", "run"].includes(command))
    throw Error(
      "Usage: npm run qa -- --target http://127.0.0.1:PORT --scenario scenarios/cart.json [--mobile]",
    );
  if (!["scripted", "placeholder", "openai"].includes(values.planner))
    throw Error("Planner must be scripted, placeholder or openai");
  if (values.planner === "placeholder") await new LlmPlanner().next();
  if (command === "demo" && values.planner !== "scripted")
    throw Error("Demo uses scripted scenarios only");
  if (command === "run") {
    if (!values.target || !values.scenario)
      throw Error("run requires --target and --scenario");
    const content = await readFile(values.scenario, "utf8");
    if (content.length > 65536) throw Error("Scenario is too large");
    const scenario = JSON.parse(content);
    const planner =
      values.planner === "openai"
        ? new OpenAIPlanner({
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL,
            goal: scenario.goal,
            allowNetwork: values["allow-model-network"],
          })
        : undefined;
    const result = await runScenario({
      target: values.target,
      scenario,
      output: values.out,
      planner,
      ...(planner ? { plannerTimeout: 15000, deadlineMs: 60000 } : {}),
      viewport: values.mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 800 },
    });
    console.log(
      JSON.stringify(
        {
          status: result.report.status,
          report: path.join(result.directory, "report.html"),
        },
        null,
        2,
      ),
    );
    process.exitCode =
      result.report.status === "passed"
        ? 0
        : result.report.status === "failed"
          ? 1
          : 2;
    return;
  }
  const fixture = await startFixture();
  try {
    const cart = JSON.parse(
      await readFile(
        new URL("../scenarios/cart.json", import.meta.url),
        "utf8",
      ),
    );
    await mkdir(values.out, { recursive: true });
    const suite = await mkdtemp(path.join(path.resolve(values.out), "demo-"));
    const cases = [
      {
        scenario: cart,
        expected: "passed",
        viewport: { width: 1280, height: 800 },
      },
      {
        scenario: {
          ...cart,
          name: "Cart quantity regression",
          path: "/broken-cart",
        },
        expected: "failed",
        viewport: { width: 1280, height: 800 },
      },
      {
        scenario: {
          name: "Mobile overflow",
          goal: "The page fits a 390px viewport.",
          path: "/broken-layout",
          steps: [],
          checks: [{ type: "layout" }],
        },
        expected: "failed",
        viewport: { width: 390, height: 844 },
      },
      {
        scenario: {
          name: "Browser console regression",
          goal: "The cart is present without console errors.",
          path: "/broken-console",
          steps: [],
          checks: [{ type: "visible", target: { testId: "cart" } }],
        },
        expected: "failed",
        viewport: { width: 1280, height: 800 },
      },
    ];
    const results = [];
    for (const item of cases) {
      const result = await runScenario({
        target: fixture.origin,
        scenario: item.scenario,
        viewport: item.viewport,
        output: suite,
      });
      results.push({
        name: item.scenario.name,
        status: result.report.status,
        expected: item.expected,
        report: path
          .relative(suite, path.join(result.directory, "report.html"))
          .split(path.sep)
          .join("/"),
      });
    }
    const matched = results.every(
      (result) => result.status === result.expected,
    );
    await writeFile(
      path.join(suite, "summary.json"),
      JSON.stringify({ planner: "scripted", matched, results }, null, 2),
    );
    await writeFile(
      path.join(suite, "index.html"),
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Web QA Agent · Demo</title><style>body{font:17px/1.6 system-ui;background:#f4f6f9;color:#18283b;max-width:900px;margin:60px auto;padding:24px}article{background:white;padding:22px;border:1px solid #dbe2ea;border-radius:10px;margin:16px 0}a{color:#175cd3}small{color:#526276}</style><h1>Web QA Agent</h1><p>Four real browser runs against a disposable synthetic app.</p><p><strong>LLM: placeholder.</strong> Scenarios are scripted; verdicts come from independent checks and browser events.</p>${results.map((r) => `<article><a href="${escapeHTML(r.report)}">${escapeHTML(r.name)}</a><p>Observed: <strong>${escapeHTML(r.status)}</strong> · Fixture expectation: ${escapeHTML(r.expected)}</p></article>`).join("")}<small>A correctly detected fixture bug is still a failed QA run. Demo exit 0 means expected outcomes matched, not that all scenarios passed.</small></html>`,
    );
    console.log(
      JSON.stringify(
        { matched, index: path.join(suite, "index.html"), results },
        null,
        2,
      ),
    );
    process.exitCode = matched ? 0 : 2;
  } finally {
    await fixture.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 2;
});
